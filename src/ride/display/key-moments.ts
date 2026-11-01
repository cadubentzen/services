/**
 * Decides when a ride reaches a "key moment" worth a screenshot - the way Zwift takes pictures
 * of a ride on its own, so the activity gets a few photos without the rider pressing a key:
 *
 * - `start`:    shortly after the ride started (the rider is rolling, the HUD shows real values)
 * - `effort`:   a little into a workout step that is harder than the step before (an interval)
 * - `summit`:   at the highest point of the route (only on routes that really climb)
 * - `finish`:   just before the end of the route, or - on a ride without a route end - just
 *               before the end of the workout (when it ends, the ride's end dialog opens)
 *
 * Shots keep a minimum distance in time and there is a maximum per ride, so a workout with many
 * short intervals doesn't fill the disk. The finish is always taken (if any shot is left).
 */

import type { KeyMoment, KeyMomentProps, KeyMomentStep, KeyMomentUpdate } from './types'

export const KEY_MOMENT_DEFAULTS = {
    START_AFTER: 60,            // s
    EFFORT_AFTER: 20,           // s into a harder step
    MIN_GAP: 120,               // s between two shots (except the finish)
    MAX_SHOTS: 8,
    MIN_CLIMB: 30,              // m the summit must be above the start to be worth a picture
    FINISH_BEFORE: 50,          // m before the end of the route
    FINISH_BEFORE_TIME: 10,     // s before the end of the workout
}

export class KeyMomentDetector {
    protected readonly summitDistance?: number
    protected readonly finishDistance?: number
    protected effortStarts: number[] = []
    protected workoutEnd?: number

    protected taken: KeyMoment[] = []
    protected lastShotTime?: number
    protected effortsDone = new Set<number>()
    protected summitDone = false
    protected finishDone = false

    constructor(props: KeyMomentProps = {}, protected readonly settings = KEY_MOMENT_DEFAULTS) {
        this.summitDistance = this.findSummit(props)
        this.finishDistance = props.endPos ? props.endPos - settings.FINISH_BEFORE : undefined
        this.setSteps(props.steps)
    }

    /**
     * the workout steps changed (e.g. the rider skipped a step, or a workout was started later):
     * intervals that already began are not taken anymore
     *
     * @param steps the workout's steps (none: no workout)
     * @param time  the current ride time in seconds
     */
    setSteps(steps?: KeyMomentStep[], time = 0): void {
        this.effortStarts = this.findEfforts(steps ?? [])
        this.effortStarts
            .filter(start => start + this.settings.EFFORT_AFTER <= time)
            .forEach(start => this.effortsDone.add(start))
        const last = steps?.at(-1)
        this.workoutEnd = last?.end
    }

    /** the key moment reached with this update, if any (at most one per update) */
    update({ time, routeDistance }: KeyMomentUpdate): KeyMoment | undefined {
        if (!Number.isFinite(time))
            return

        if (!this.finishDone && this.isFinish(time, routeDistance))
            return this.finish(time)

        if (!this.taken.includes('start') && time >= this.settings.START_AFTER)
            return this.take('start', time)

        if (this.summitDistance !== undefined && !this.summitDone && (routeDistance ?? 0) >= this.summitDistance) {
            this.summitDone = true          // a summit passed during a gap is not taken later
            return this.take('summit', time)
        }

        const effort = this.effortStarts.find(start => !this.effortsDone.has(start) && time >= start + this.settings.EFFORT_AFTER)
        if (effort !== undefined) {
            // efforts that were skipped (e.g. during a gap) are not taken later either
            this.effortStarts.filter(s => s <= effort).forEach(s => this.effortsDone.add(s))
            return this.take('effort', time)
        }
    }

    protected isFinish(time: number, routeDistance?: number): boolean {
        if (this.finishDistance !== undefined)
            return (routeDistance ?? 0) >= this.finishDistance
        return this.workoutEnd !== undefined && time >= this.workoutEnd - this.settings.FINISH_BEFORE_TIME
    }

    /** the key moments taken so far */
    getTaken(): KeyMoment[] {
        return [...this.taken]
    }

    protected finish(time: number): KeyMoment | undefined {
        this.finishDone = true
        if (this.taken.length >= this.settings.MAX_SHOTS)
            return
        this.taken.push('finish')
        this.lastShotTime = time
        return 'finish'
    }

    protected take(moment: KeyMoment, time: number): KeyMoment | undefined {
        // keep the last shot for the finish
        if (this.taken.length >= this.settings.MAX_SHOTS - 1)
            return
        if (this.lastShotTime !== undefined && time - this.lastShotTime < this.settings.MIN_GAP)
            return
        this.taken.push(moment)
        this.lastShotTime = time
        return moment
    }

    protected findSummit({ points, startPos = 0, endPos }: KeyMomentProps): number | undefined {
        const ridden = (points ?? []).filter(p =>
            Number.isFinite(p?.elevation) && p.routeDistance >= startPos && (endPos === undefined || p.routeDistance <= endPos))
        if (ridden.length < 2)
            return

        const top = ridden.reduce((max, p) => p.elevation > max.elevation ? p : max, ridden[0])
        const climb = top.elevation - ridden[0].elevation
        // a summit right at the start or the end isn't one (and the end has the finish shot)
        if (climb < this.settings.MIN_CLIMB || top === ridden[0] || top === ridden.at(-1))
            return
        return top.routeDistance
    }

    protected findEfforts(steps: KeyMomentStep[]): number[] {
        const efforts: number[] = []
        steps.forEach((step, i) => {
            const prev = steps[i - 1]?.intensity
            if (i > 0 && step.intensity !== undefined && prev !== undefined && step.intensity > prev)
                efforts.push(step.start)
        })
        return efforts
    }
}
