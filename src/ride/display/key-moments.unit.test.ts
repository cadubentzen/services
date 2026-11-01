import { KEY_MOMENT_DEFAULTS, KeyMomentDetector } from './key-moments'

const ride = (detector: KeyMomentDetector, until: number, speed = 8) => {
    const shots: Array<[string, number]> = []
    for (let time = 0; time <= until; time++) {
        const moment = detector.update({ time, routeDistance: time * speed })
        if (moment)
            shots.push([moment, time])
    }
    return shots
}

describe('KeyMomentDetector', () => {

    test('takes a picture shortly after the start', () => {
        expect(ride(new KeyMomentDetector(), 100)).toEqual([['start', 60]])
    })

    test('at the highest point of a route that climbs, and just before its end', () => {
        // 0..4000m, climbing 100m up to 2400m, then down again
        const points = Array.from({ length: 41 }, (_, i) => ({ routeDistance: i * 100, elevation: 200 + 100 - Math.abs(i - 24) * 4 }))
        const detector = new KeyMomentDetector({ points, startPos: 0, endPos: 4000 })

        expect(ride(detector, 500)).toEqual([['start', 60], ['summit', 300], ['finish', 494]])
    })

    test('no summit on a flat route', () => {
        const points = Array.from({ length: 41 }, (_, i) => ({ routeDistance: i * 100, elevation: 200 + (i % 2) * 5 }))
        const detector = new KeyMomentDetector({ points, startPos: 0 })
        expect(ride(detector, 600).map(s => s[0])).toEqual(['start'])
    })

    test('a little into each workout step that is harder than the one before', () => {
        // Z1 warmup 3min, Z2 10min, Z1 2min, Z4 5min
        const steps = [
            { start: 0, end: 180, intensity: 55 },
            { start: 180, end: 780, intensity: 75 },
            { start: 780, end: 900, intensity: 55 },
            { start: 900, end: 1200, intensity: 100 },
        ]
        const detector = new KeyMomentDetector({ steps })
        // the finish a little before the end: when the workout ends, the ride's end dialog opens
        expect(ride(detector, 1200)).toEqual([['start', 60], ['effort', 200], ['effort', 920], ['finish', 1190]])
    })

    test('on a route with an end, the finish is the end of the route, not of the workout', () => {
        const steps = [{ start: 0, end: 200, intensity: 50 }]
        const detector = new KeyMomentDetector({ steps, endPos: 4000 })
        expect(ride(detector, 600).map(s => s[0])).toEqual(['start', 'finish'])
        expect(ride(detector, 600)).toEqual([])
    })

    test('after skipping steps, intervals follow the new step times; those already begun are not taken', () => {
        const steps = [{ start: 0, end: 300, intensity: 50 }, { start: 300, end: 600, intensity: 100 }, { start: 600, end: 900, intensity: 50 }, { start: 900, end: 1200, intensity: 100 }]
        const detector = new KeyMomentDetector({ steps })
        const shots: Array<[string, number]> = []
        for (let time = 0; time <= 100; time++) {
            const m = detector.update({ time })
            if (m) shots.push([m, time])
        }
        // at 100s the rider skips forward: the first interval begins now, the second at 400s
        detector.setSteps([{ start: 0, end: 100, intensity: 50 }, { start: 100, end: 400, intensity: 100 }, { start: 400, end: 700, intensity: 50 }, { start: 700, end: 1000, intensity: 100 }], 100)
        for (let time = 101; time <= 1000; time++) {
            const m = detector.update({ time })
            if (m) shots.push([m, time])
        }
        // the first new interval (at 100+20s) falls into the gap after the start picture; the
        // second follows its new time (700+20s instead of 900+20s)
        expect(shots).toEqual([['start', 60], ['effort', 720], ['finish', 990]])
    })

    test('keeps a minimum gap between pictures and skips moments that fall into it', () => {
        const steps = [{ start: 0, intensity: 50 }, { start: 60, intensity: 100 }, { start: 120, intensity: 50 }, { start: 400, intensity: 100 }]
        const detector = new KeyMomentDetector({ steps })
        // the effort at 60+20s is within MIN_GAP of the start picture: skipped, not taken later
        expect(ride(detector, 500)).toEqual([['start', 60], ['effort', 420]])
    })

    test('never more than the maximum - the finish always gets the last one', () => {
        const steps = Array.from({ length: 40 }, (_, i) => ({ start: i * 300, end: (i + 1) * 300, intensity: i % 2 ? 100 : 50 }))
        const detector = new KeyMomentDetector({ steps })
        const shots = ride(detector, 40 * 300)
        expect(shots).toHaveLength(KEY_MOMENT_DEFAULTS.MAX_SHOTS)
        expect(shots.at(-1)?.[0]).toBe('finish')
        expect(detector.getTaken()).toHaveLength(KEY_MOMENT_DEFAULTS.MAX_SHOTS)
    })

    test('ignores updates without a valid time', () => {
        expect(new KeyMomentDetector().update({ time: NaN })).toBeUndefined()
    })
})
