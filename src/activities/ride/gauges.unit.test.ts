import { WORKOUT_ZONE_COLORS } from '../../workouts/base/graph/series'
import { getHeartrateGauge, getPowerGauge } from './gauges'

describe('getPowerGauge', () => {
    test('zones and current zone from FTP', () => {
        const g = getPowerGauge(152, 200)
        expect(g.min).toBe(0)
        expect(g.max).toBe(320)
        expect(g.zones).toHaveLength(7)
        expect(g.zones[2]).toEqual({ from: 150, to: 180, name: 'Z3 Tempo', color: WORKOUT_ZONE_COLORS[3] })
        expect(g.zone).toBe(2)
    })
    test('zone boundaries are inclusive', () => {
        expect(getPowerGauge(110, 200).zone).toBe(0)
        expect(getPowerGauge(111, 200).zone).toBe(1)
    })
    test('power above the scale stays in the last zone', () => {
        const g = getPowerGauge(500, 200)
        expect(g.zone).toBe(6)
        expect(g.max).toBe(320)
    })
    test('without FTP the gauge is neutral', () => {
        expect(getPowerGauge(152, undefined)).toEqual({ min: 0, max: 400 })
        expect(getPowerGauge(152, 0)).toEqual({ min: 0, max: 400 })
    })
    test('without power there is no current zone', () => {
        const g = getPowerGauge(undefined, 200)
        expect(g.zones).toHaveLength(7)
        expect(g.zone).toBeUndefined()
    })
    test('passes on the workout target', () => {
        expect(getPowerGauge(152, 200, { min: 180, max: 200 }).target).toEqual({ min: 180, max: 200 })
    })
})

describe('getHeartrateGauge', () => {
    test('zones and current zone from max HR', () => {
        const g = getHeartrateGauge(112, 185)
        expect(g.min).toBe(92.5)
        expect(g.max).toBe(185)
        expect(g.zones.map(z => z.name)).toEqual(['Z1', 'Z2', 'Z3', 'Z4', 'Z5'])
        expect(g.zones[0].from).toBe(92.5)
        expect(g.zones[4].to).toBe(185)
        expect(g.zones[1].color).toBe(WORKOUT_ZONE_COLORS[2])
        expect(g.zone).toBe(1)
    })
    test('zone boundaries are lower-bound inclusive', () => {
        expect(getHeartrateGauge(107, 180).zone).toBe(0)
        expect(getHeartrateGauge(108, 180).zone).toBe(1)
        expect(getHeartrateGauge(162, 180).zone).toBe(4)
        expect(getHeartrateGauge(161, 180).zone).toBe(3)
    })
    test('without max HR the gauge is neutral', () => {
        expect(getHeartrateGauge(112, undefined)).toEqual({ min: 40, max: 200 })
    })

    describe('with a threshold heart rate', () => {
        // zones as intervals.icu shows them for LTHR 180 / max HR 198
        const EXPECTED = [
            { name: 'Z1 Recovery', from: 0, to: 144 },
            { name: 'Z2 Aerobic', from: 145, to: 161 },
            { name: 'Z3 Tempo', from: 162, to: 168 },
            { name: 'Z4 SubThreshold', from: 169, to: 179 },
            { name: 'Z5 SuperThreshold', from: 180, to: 184 },
            { name: 'Z6 Aerobic Capacity', from: 185, to: 189 },
            { name: 'Z7 Anaerobic', from: 190, to: 198 }
        ]

        test('seven zones in % of threshold HR', () => {
            const g = getHeartrateGauge(150, 198, 180)
            expect(g.zones.map(z => z.name)).toEqual(EXPECTED.map(z => z.name))
            expect(g.zones.map(z => z.from).slice(1)).toEqual(EXPECTED.map(z => z.from).slice(1))
            expect(g.zones.map(z => z.to)).toEqual([145, 162, 169, 180, 185, 190, 198])
            expect(g.zones[6].color).toBe(WORKOUT_ZONE_COLORS[7])
            expect(g.max).toBe(198)
            expect(g.min).toBe(g.zones[0].from)
        })
        test('each bpm falls in the zone intervals.icu shows', () => {
            EXPECTED.forEach((z, i) => {
                if (i > 0)
                    expect(getHeartrateGauge(z.from, 198, 180).zone).toBe(i)
                expect(getHeartrateGauge(z.to, 198, 180).zone).toBe(i)
            })
        })
        test('heart rate above max HR stays in the last zone', () => {
            expect(getHeartrateGauge(205, 198, 180).zone).toBe(6)
        })
        test('without max HR the scale ends at 110 % of threshold HR', () => {
            const g = getHeartrateGauge(150, undefined, 180)
            expect(g.zones).toHaveLength(7)
            expect(g.max).toBe(198)
        })
        test('a max HR below the last zone does not cut it off', () => {
            const g = getHeartrateGauge(150, 185, 180)
            expect(g.max).toBe(198)
        })
        test('without heart rate there is no current zone', () => {
            expect(getHeartrateGauge(undefined, 198, 180).zone).toBeUndefined()
        })
    })
})
