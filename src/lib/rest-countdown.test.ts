import { describe, expect, it, vi } from 'vitest'
import { createRestCountdown } from '@/lib/rest-countdown'

const setup = (endMs: number, startMs: number) => {
  const onWarn = vi.fn()
  const onEnd = vi.fn()
  return { countdown: createRestCountdown(endMs, startMs, { onWarn, onEnd }), onWarn, onEnd }
}

describe('createRestCountdown', () => {
  it('fires end feedback once, even if ticks continue past zero', () => {
    const { countdown, onEnd } = setup(90_000, 0)
    expect(countdown.total).toBe(90)
    expect(countdown.tick(89_900)).toBe(1)
    expect(onEnd).not.toHaveBeenCalled()
    expect(countdown.tick(90_000)).toBe(0)
    expect(countdown.tick(90_250)).toBe(0)
    expect(countdown.tick(95_000)).toBe(0)
    expect(onEnd).toHaveBeenCalledTimes(1)
  })

  it('warns once at 10 seconds across several ticks in the same second', () => {
    const { countdown, onWarn } = setup(60_000, 0)
    countdown.tick(50_000)
    countdown.tick(50_250)
    countdown.tick(50_500)
    expect(onWarn).toHaveBeenCalledTimes(1)
  })

  it('never fires for a timer that was already expired at start', () => {
    const { countdown, onEnd, onWarn } = setup(10_000, 30_000)
    expect(countdown.tick(30_000)).toBe(0)
    expect(countdown.tick(30_250)).toBe(0)
    expect(onEnd).not.toHaveBeenCalled()
    expect(onWarn).not.toHaveBeenCalled()
  })
})
