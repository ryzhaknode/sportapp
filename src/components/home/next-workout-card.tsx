import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SessionMode, WorkoutTemplateCode } from '@/lib/db/schema'
import { formatWeight } from '@/lib/progression/weight'
import {
  PROGRESSION_BADGE_CLASS,
  PROGRESSION_LABELS,
  WORKOUT_CODE_COLORS,
  type ProgressionStatus,
  type WeightType,
} from '@/lib/program/types'
import { getModeLabel } from '@/lib/program/week-cycle'
import { cn } from '@/lib/utils'

interface PreviewExercise {
  name: string
  slotId: number
  status: ProgressionStatus
  suggestedWeight: number | null
  hint: string
  weightType?: WeightType
}

interface NextWorkoutCardProps {
  code: WorkoutTemplateCode
  weekNumber: number
  mode: SessionMode
  exercises: PreviewExercise[]
  continueSessionId: number | null
  todayCompletedSessionId: number | null
  isScheduledToday: boolean
}

export const NextWorkoutCard = ({
  code,
  weekNumber,
  mode,
  exercises,
  continueSessionId,
  todayCompletedSessionId,
  isScheduledToday,
}: NextWorkoutCardProps) => {
  const doneToday = todayCompletedSessionId != null && !continueSessionId
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-base', WORKOUT_CODE_COLORS[code])}>
          Тренування {code}
        </Badge>
        <span className="text-sm text-muted-foreground">Тиждень {weekNumber} з 13</span>
        <Badge variant="outline" className="text-xs">
          {getModeLabel(mode)}
        </Badge>
      </div>

      <ul className="flex flex-col gap-2">
        {exercises.map((ex) => (
          <li
            key={ex.slotId}
            className="flex flex-col gap-1 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium leading-snug">{ex.name}</span>
              <Badge
                variant="outline"
                className={cn('shrink-0 text-[10px]', PROGRESSION_BADGE_CLASS[ex.status])}
              >
                {PROGRESSION_LABELS[ex.status]}
              </Badge>
            </div>
            {ex.suggestedWeight != null && ex.weightType && (
              <span className="text-xs text-muted-foreground">
                {formatWeight(ex.suggestedWeight, ex.weightType)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {continueSessionId ? (
        <Link href={`/workout/${continueSessionId}`} className="mt-2 block">
          <Button type="button" className="touch-target h-14 w-full text-base">
            Продовжити тренування
          </Button>
        </Link>
      ) : doneToday ? (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-center text-sm text-muted-foreground">
            Тренування {code} сьогодні вже завершено. Можеш обрати інший тип або переглянути підсумок.
          </p>
          <Link href={`/workout/${todayCompletedSessionId}/summary`} className="block">
            <Button type="button" variant="secondary" className="touch-target h-14 w-full text-base">
              Переглянути підсумок
            </Button>
          </Link>
        </div>
      ) : (
        <span className="touch-target mt-2 flex h-14 w-full items-center justify-center rounded-xl bg-primary text-base font-medium text-primary-foreground">
          Почати тренування
        </span>
      )}
    </section>
  )
}
