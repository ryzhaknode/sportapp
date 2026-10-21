import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDateInAppTz, formatTimeInAppTz, todayInAppTz } from '@/lib/utils'

describe('formatDateInAppTz', () => {
  it('rolls over to the Kyiv date before UTC midnight (summer, UTC+3)', () => {
    expect(formatDateInAppTz(new Date('2026-10-20T20:59:00Z'))).toBe('2026-10-20')
    expect(formatDateInAppTz(new Date('2026-10-20T21:00:00Z'))).toBe('2026-10-21')
    expect(formatDateInAppTz(new Date('2026-10-20T22:30:00Z'))).toBe('2026-10-21')
  })

  it('handles winter time (UTC+2) across the new year', () => {
    expect(formatDateInAppTz(new Date('2026-12-31T21:59:00Z'))).toBe('2026-12-31')
    expect(formatDateInAppTz(new Date('2026-12-31T22:30:00Z'))).toBe('2027-01-01')
  })
})

describe('todayInAppTz', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the Kyiv calendar day, not the process timezone', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-21T00:30:00Z'))
    expect(todayInAppTz()).toBe('2026-10-21')
    vi.setSystemTime(new Date('2026-10-20T21:30:00Z'))
    expect(todayInAppTz()).toBe('2026-10-21')
  })
})

describe('formatTimeInAppTz', () => {
  it('shows the Kyiv clock time', () => {
    expect(formatTimeInAppTz('2026-10-20T19:05:00.000Z')).toBe('22:05')
    expect(formatTimeInAppTz('2026-12-01T19:05:00.000Z')).toBe('21:05')
  })
})
