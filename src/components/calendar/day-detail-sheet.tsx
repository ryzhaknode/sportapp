'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { markDaySkippedAction, unmarkDaySkippedAction } from '@/app/actions/calendar'
import { Button } from '@/components/ui/button'
import { DAY_STATUS_LABELS } from '@/lib/calendar-status'
import type { CalendarDayData } from '@/lib/calendar-data'
import { WORKOUT_COLORS } from '@/lib/workouts'
import { Badge } from '@/components/ui/badge'
import { formatDisplayDate } from '@/lib/utils'

interface DayDetailSheetProps {
  day: CalendarDayData | null
  today: string
  onClose: () => void
}

export const DayDetailSheet = ({ day, today, onClose }: DayDetailSheetProps) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  if (!day) return null

  const isRestDay = day.scheduledType === 'rest' && day.status !== 'completed'
  const workoutHref = isRestDay
    ? '/workout?skipRest=1'
    : day.status === 'completed'
      ? '/workout'
      : '/workout'

  const handleMarkSkipped = () => {
    startTransition(async () => {
      await markDaySkippedAction(day.date)
      router.refresh()
      onClose()
    })
  }

  const handleUnmarkSkipped = () => {
    startTransition(async () => {
      await unmarkDaySkippedAction(day.date)
      router.refresh()
      onClose()
    })
  }

  const canMark =
    day.date <= today &&
    day.status !== 'completed' &&
    day.scheduledType !== 'rest' &&
    !day.isManuallySkipped

  const canUnmark = day.isManuallySkipped

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-3xl border border-border bg-card p-6 pb-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="day-detail-title"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p id="day-detail-title" className="text-lg font-semibold capitalize">
                {formatDisplayDate(day.date)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {DAY_STATUS_LABELS[day.status]}
                {day.scheduledType !== 'rest' && ` · Заплановано ${day.scheduledType}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрити"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {day.status === 'completed' && day.totalReps !== undefined && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3">
              {day.workoutType && (
                <Badge className={WORKOUT_COLORS[day.workoutType as 'A' | 'B' | 'C']}>
                  {day.workoutType}
                </Badge>
              )}
              <span className="font-semibold text-emerald-400">{day.totalReps} reps</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(day.status === 'pending' ||
              day.status === 'completed' ||
              (isRestDay && day.status === 'rest')) && (
              <Link
                href={workoutHref}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-sm font-medium text-background hover:opacity-90"
              >
                {day.status === 'completed'
                  ? 'Переглянути запис'
                  : isRestDay
                    ? 'Пропустити відпочинок і тренуватись'
                    : 'Почати тренування'}
              </Link>
            )}

            {canMark && (
              <Button
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={handleMarkSkipped}
                disabled={pending}
              >
                Позначити як пропуск
              </Button>
            )}

            {canUnmark && (
              <Button variant="secondary" className="w-full" onClick={handleUnmarkSkipped} disabled={pending}>
                Зняти позначку пропуску
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
