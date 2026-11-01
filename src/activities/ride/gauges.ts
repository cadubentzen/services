import { WORKOUT_ZONE_COLORS, getZone } from '../../workouts/base/graph/series'
import { DashboardGauge, DashboardGaugeZone } from './types'

const POWER_ZONE_NAMES = ['Z1 Recovery', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Threshold', 'Z5 VO2max', 'Z6 Anaerobic', 'Z7 Sprint']
// upper bound of each power zone in % of FTP
const POWER_ZONE_LIMITS = [55, 75, 90, 105, 120, 150, 160]
const POWER_GAUGE_MAX_PCT = 160
const POWER_GAUGE_DEFAULT_MAX = 400

const HR_ZONE_NAMES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']
// upper bound of each heart rate zone in % of max HR; the gauge starts at 50 %
const HR_ZONE_LIMITS = [60, 70, 80, 90, 100]
// zones are lower-bound inclusive: Z1 <60, Z2 60-70, Z3 70-80, Z4 80-90, Z5 >=90
const HR_ZONE_SWITCH_PCT = [60, 70, 80, 90]
const HR_GAUGE_MIN_PCT = 50
const HR_GAUGE_DEFAULT_MIN = 40
const HR_GAUGE_DEFAULT_MAX = 200

function buildZones(names: string[], limitsPct: number[], startPct: number, base: number): DashboardGaugeZone[] {
    return names.map((name, i) => ({
        from: base * (i === 0 ? startPct : limitsPct[i - 1]) / 100,
        to: base * limitsPct[i] / 100,
        color: WORKOUT_ZONE_COLORS[i + 1],
        name
    }))
}

/**
 * Builds the gauge data for the Power dashboard item
 *
 * @param power current power in W
 * @param ftp FTP in W; without it the gauge has a neutral scale and no zones
 * @param target workout power target in W
 */
export function getPowerGauge(power: number | undefined, ftp: number | undefined, target?: { min: number, max: number }): DashboardGauge {
    if (!ftp) {
        return { min: 0, max: POWER_GAUGE_DEFAULT_MAX, ...(target ? { target: { ...target } } : {}) }
    }

    const gauge: DashboardGauge = {
        min: 0,
        max: ftp * POWER_GAUGE_MAX_PCT / 100,
        zones: buildZones(POWER_ZONE_NAMES, POWER_ZONE_LIMITS, 0, ftp)
    }
    if (power !== undefined) {
        gauge.zone = getZone(power * 100 / ftp, ftp) - 1
    }
    if (target) {
        gauge.target = { min: target.min, max: target.max }
    }
    return gauge
}

function getHeartrateZone(pct: number): number {
    const idx = HR_ZONE_SWITCH_PCT.findIndex(limit => pct < limit)
    return idx === -1 ? HR_ZONE_SWITCH_PCT.length : idx
}

/**
 * Builds the gauge data for the Heartrate dashboard item
 *
 * @param heartrate current heart rate in bpm
 * @param maxHr maximum heart rate in bpm; without it the gauge has a neutral scale and no zones
 */
export function getHeartrateGauge(heartrate: number | undefined, maxHr: number | undefined): DashboardGauge {
    if (!maxHr) {
        return { min: HR_GAUGE_DEFAULT_MIN, max: HR_GAUGE_DEFAULT_MAX }
    }

    const gauge: DashboardGauge = {
        min: maxHr * HR_GAUGE_MIN_PCT / 100,
        max: maxHr,
        zones: buildZones(HR_ZONE_NAMES, HR_ZONE_LIMITS, HR_GAUGE_MIN_PCT, maxHr)
    }
    if (heartrate !== undefined) {
        gauge.zone = getHeartrateZone(heartrate * 100 / maxHr)
    }
    return gauge
}
