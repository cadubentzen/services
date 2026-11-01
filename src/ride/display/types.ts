/** a moment of a ride worth a screenshot (see KeyMomentDetector) */
export type KeyMoment = 'start' | 'effort' | 'summit' | 'finish'

export type KeyMomentStep = {
    start: number               // seconds since the start of the workout
    end?: number
    /** the step's power target - only used to compare steps, so any unit works */
    intensity?: number
}

export type KeyMomentRoutePoint = { routeDistance: number, elevation?: number }

export type KeyMomentProps = {
    /** points of the route ridden (to find its highest point), if there is a route */
    points?: Array<KeyMomentRoutePoint>
    /** where the ride starts/ends on the route (meters); no end: the route is open-ended (e.g. laps) */
    startPos?: number
    endPos?: number
    /** the workout steps, if a workout is ridden */
    steps?: Array<KeyMomentStep>
}

export type KeyMomentUpdate = {
    time: number                // ride time in seconds
    routeDistance?: number      // position on the route in meters
}
