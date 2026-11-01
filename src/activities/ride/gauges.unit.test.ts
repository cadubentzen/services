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
})
