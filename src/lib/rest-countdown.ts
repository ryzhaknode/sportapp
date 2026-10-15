export interface RestCountdownHandlers {
  onWarn: () => void
  onEnd: () => void
}

export interface RestCountdown {
  total: number
  /** Returns remaining whole seconds; fires each handler at most once. */
  tick: (nowMs: number) => number
}

export const remainingSeconds = (endMs: number, nowMs: number): number =>
  Math.max(0, Math.ceil((endMs - nowMs) / 1000))

/**
 * A timer that had already run out when the countdown was created never fires
 * `onEnd` — e.g. an expired rest timer row still in the DB after a reload.
 */
export const createRestCountdown = (
  endMs: number,
  startMs: number,
  handlers: RestCountdownHandlers,
): RestCountdown => {
  const total = Math.max(1, Math.ceil((endMs - startMs) / 1000))
  let warned = false
  let ended = endMs <= startMs

  return {
    total,
    tick: (nowMs) => {
      const sec = remainingSeconds(endMs, nowMs)
      if (sec === 10 && !warned) {
        warned = true
        handlers.onWarn()
      }
      if (sec === 0 && !ended) {
        ended = true
        handlers.onEnd()
      }
      return sec
    },
  }
}
