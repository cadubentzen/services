import { WORKOUT_ZONE_COLORS, getZone } from '../../workouts/base/graph/series'
import { DashboardGauge, DashboardGaugeZone } from './types'

// Coggan's zones, named as intervals.icu names them
const POWER_ZONE_NAMES = ['Z1 Active Recovery', 'Z2 Endurance', 'Z3 Tempo', 'Z4 Threshold', 'Z5 VO2 Max', 'Z6 Anaerobic', 'Z7 Neuromuscular']
// upper bound of each power zone in % of FTP
const POWER_ZONE_LIMITS = [55, 75, 90, 105, 120, 150, 160]
const POWER_GAUGE_MAX_PCT = 160
const POWER_GAUGE_DEFAULT_MAX = 400

const HR_ZONE_NAMES = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']
// upper bound of each heart rate zone in % of max HR; the gauge starts at 50 %
const HR_ZONE_LIMITS = [60, 70, 80, 90, 100]
// zones are lower-bound inclusive: Z1 <60, Z2 60-70, Z3 70-80, Z4 80-90, Z5 >=90
const HR_ZONE_SWITCH_PCT = HR_ZONE_LIMITS.slice(0, -1)
const HR_GAUGE_MIN_PCT = 50
const HR_GAUGE_DEFAULT_MIN = 40
const HR_GAUGE_DEFAULT_MAX = 200

// heart rate zones based on the threshold heart rate (Friel's 7 zones, as intervals.icu shows them)
const THRESHOLD_HR_ZONE_NAMES = ['Z1 Recovery', 'Z2 Aerobic', 'Z3 Tempo', 'Z4 SubThreshold', 'Z5 SuperThreshold', 'Z6 Aerobic Capacity', 'Z7 Anaerobic']
// lower bound of each zone (from Z2 on) in % of the threshold HR
const THRESHOLD_HR_ZONE_STARTS = [81, 90, 94, 100, 103, 106]
const THRESHOLD_HR_GAUGE_MIN_PCT = 55
const THRESHOLD_HR_GAUGE_MAX_PCT = 110

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
 * Builds the heart rate gauge from the threshold heart rate.
 * A zone starts at the whole bpm below its % of the threshold HR (180 bpm: Z2 starts at 145 bpm, 81 % = 145.8)
 */
function getThresholdHeartrateGauge(heartrate: number | undefined, maxHr: number | undefined, thresholdHr: number): DashboardGauge {
    const starts = THRESHOLD_HR_ZONE_STARTS.map(pct => Math.floor(thresholdHr * pct / 100))
    const min = Math.round(thresholdHr * THRESHOLD_HR_GAUGE_MIN_PCT / 100)
    const max = Math.max(maxHr ?? 0, Math.round(thresholdHr * THRESHOLD_HR_GAUGE_MAX_PCT / 100))
    const bounds = [min, ...starts, max]

    const gauge: DashboardGauge = {
        min,
        max,
        zones: THRESHOLD_HR_ZONE_NAMES.map((name, i) => ({ from: bounds[i], to: bounds[i + 1], color: WORKOUT_ZONE_COLORS[i + 1], name }))
    }
    if (heartrate !== undefined) {
        const idx = starts.findIndex(start => heartrate < start)
        gauge.zone = idx === -1 ? starts.length : idx
    }
    return gauge
}

/**
 * Builds the gauge data for the Heartrate dashboard item
 *
 * With a threshold heart rate, there are 7 zones in % of it; otherwise 5 zones in % of the max heart rate
 *
 * @param heartrate current heart rate in bpm
 * @param maxHr maximum heart rate in bpm; without it (and without threshold HR) the gauge has a neutral scale and no zones
 * @param thresholdHr threshold (lactate threshold) heart rate in bpm
 */
export function getHeartrateGauge(heartrate: number | undefined, maxHr: number | undefined, thresholdHr?: number): DashboardGauge {
    if (thresholdHr) {
        return getThresholdHeartrateGauge(heartrate, maxHr, thresholdHr)
    }
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
