import { getCalendarDays } from '@/lib/cycle'
import {
  getDayStatus,
  getScheduledType,
  type DayStatus,
} from '@/lib/calendar-status'
import type { CalendarDayData, CalendarMonthData } from '@/lib/calendar-data'
import { parseLocalDate } from '@/lib/utils'

export interface SessionSummary {
  totalReps: number
  type: string
  completedAt: string | null
}

export const buildCalendarMonth = (input: {
  year: number
  month: number
  startDate: string
  cycleOffset: number
  today: string
  sessions: Map<string, SessionSummary>
  skippedSet: Set<string>
}): CalendarMonthData => {
  const { year, month, startDate, cycleOffset, today, sessions, skippedSet } = input
  const dates = getCalendarDays(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  const days: CalendarDayData[] = dates.map((date) => {
    const session = sessions.get(date)
    const isManuallySkipped = skippedSet.has(date)
    const hasSession = !!session?.completedAt
    const status = getDayStatus({
      date,
      startDate,
      cycleOffset,
      today,
      hasSession,
      isManuallySkipped,
    })
    const scheduledType = getScheduledType(startDate, date, cycleOffset)

    return {
      date,
      dayOfMonth: parseLocalDate(date).getDate(),
      isCurrentMonth: parseLocalDate(date).getMonth() === month,
      status,
      scheduledType,
      totalReps: session?.totalReps,
      workoutType: session?.type,
      isManuallySkipped,
    }
  })

  return { year, month, monthLabel, days, startDate, cycleOffset, today }
}

export const getStatusAriaLabel = (day: CalendarDayData): string => {
  const dateLabel = parseLocalDate(day.date).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  })
  const typeLabel = day.scheduledType !== 'rest' ? `, ${day.scheduledType}` : ''
  return `${dateLabel}${typeLabel}, ${day.status}`
}

export const isStatusPast = (status: DayStatus): boolean =>
  status === 'completed' || status === 'rest' || status === 'skipped'
