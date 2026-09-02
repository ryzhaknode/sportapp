'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayDetailSheet } from '@/components/calendar/day-detail-sheet'
import { CalendarLegend } from '@/components/calendar/calendar-legend'
import { DAY_STATUS_COLORS } from '@/lib/calendar-status'
import type { CalendarDayData, CalendarMonthData } from '@/lib/calendar-data'
import { buildCalendarMonth } from '@/lib/calendar-build'
import { getStatusAriaLabel } from '@/lib/calendar-build'
import { WEEKDAY_LABELS } from '@/lib/calendar-data'
import { cn } from '@/lib/utils'

interface TrainingCalendarProps {
  initialMonth: CalendarMonthData
  sessionsByDate: Record<string, { totalReps: number; type: string; completedAt: string | null }>
  skippedDates: string[]
  compact?: boolean
}

export const TrainingCalendar = ({
  initialMonth,
  sessionsByDate,
  skippedDates,
  compact = false,
}: TrainingCalendarProps) => {
  const [year, setYear] = useState(initialMonth.year)
  const [month, setMonth] = useState(initialMonth.month)
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null)

  const sessionsMap = useMemo(() => {
    const map = new Map<string, { totalReps: number; type: string; completedAt: string | null }>()
    for (const [date, s] of Object.entries(sessionsByDate)) {
      map.set(date, s)
    }
    return map
  }, [sessionsByDate])

  const skippedSet = useMemo(() => new Set(skippedDates), [skippedDates])

  const monthData = useMemo(
    () =>
      buildCalendarMonth({
        year,
        month,
        startDate: initialMonth.startDate,
        cycleOffset: initialMonth.cycleOffset,
        today: initialMonth.today,
        sessions: sessionsMap,
        skippedSet,
      }),
    [year, month, initialMonth, sessionsMap, skippedSet],
  )

  const handlePrev = () => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const handleNext = () => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  return (
    <>
      <div className={cn('flex flex-col gap-4', compact && 'gap-3')}>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Попередній місяць"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors hover:bg-secondary/80"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="text-sm font-semibold capitalize">{monthData.monthLabel}</h2>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Наступний місяць"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary transition-colors hover:bg-secondary/80"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[10px] font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1"
          >
            {monthData.days.map((day: CalendarDayData) => {
              const isToday = day.date === initialMonth.today
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-label={getStatusAriaLabel(day)}
                  className={cn(
                    'relative flex aspect-square min-h-[44px] flex-col items-center justify-center rounded-xl transition-transform active:scale-95',
                    !day.isCurrentMonth && 'opacity-30',
                    DAY_STATUS_COLORS[day.status],
                    isToday && 'ring-2 ring-foreground ring-offset-2 ring-offset-background',
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      day.status === 'completed' || day.status === 'skipped'
                        ? 'text-white'
                        : day.status === 'pending'
                          ? 'text-amber-400'
                          : 'text-foreground',
                    )}
                  >
                    {day.dayOfMonth}
                  </span>
                  {day.scheduledType !== 'rest' && day.isCurrentMonth && (
                    <span className="absolute bottom-1 text-[8px] font-bold opacity-70">
                      {day.scheduledType}
                    </span>
                  )}
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {!compact && <CalendarLegend />}
      </div>

      {selectedDay && (
        <DayDetailSheet
          day={selectedDay}
          today={initialMonth.today}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}
