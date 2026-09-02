export const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'] as const

export interface CalendarDayData {
  date: string
  dayOfMonth: number
  isCurrentMonth: boolean
  status: import('@/lib/calendar-status').DayStatus
  scheduledType: import('@/lib/cycle').WorkoutType | 'rest'
  totalReps?: number
  workoutType?: string
  isManuallySkipped: boolean
}

export interface CalendarMonthData {
  year: number
  month: number
  monthLabel: string
  days: CalendarDayData[]
  startDate: string
  cycleOffset: number
  today: string
}
