'use client'

import { useMemo, useState } from 'react'
import { NextWorkoutCard } from '@/components/home/next-workout-card'
import { StartWorkoutForm } from '@/components/home/start-workout-form'
import { WorkoutCodePicker } from '@/components/home/workout-code-picker'
import type { SessionMode, WorkoutTemplateCode } from '@/lib/db/schema'
import type { ProgressionStatus, WeightType } from '@/lib/program/types'

interface PreviewExercise {
  name: string
  slotId: number
  status: ProgressionStatus
  suggestedWeight: number | null
  hint: string
  weightType?: WeightType
}

interface HomeWorkoutSectionProps {
  scheduledToday: WorkoutTemplateCode | null
  weekNumber: number
  mode: SessionMode
  previews: Record<WorkoutTemplateCode, PreviewExercise[]>
  completedSessionId: Record<WorkoutTemplateCode, number | null>
  continueSessionId: number | null
  continueSessionCode: WorkoutTemplateCode | null
  initialCode?: WorkoutTemplateCode
}

export const HomeWorkoutSection = ({
  scheduledToday,
  weekNumber,
  mode,
  previews,
  completedSessionId,
  continueSessionId,
  continueSessionCode,
  initialCode,
}: HomeWorkoutSectionProps) => {
  const defaultCode =
    continueSessionCode ?? scheduledToday ?? initialCode ?? ('A' as WorkoutTemplateCode)

  const [selected, setSelected] = useState<WorkoutTemplateCode>(defaultCode)

  const effectiveCode = continueSessionCode ?? selected

  const completedToday = useMemo(
    (): Record<WorkoutTemplateCode, boolean> => ({
      A: completedSessionId.A != null,
      B: completedSessionId.B != null,
      C: completedSessionId.C != null,
    }),
    [completedSessionId],
  )

  const exercises = previews[effectiveCode]

  const card = (
    <NextWorkoutCard
      code={effectiveCode}
      weekNumber={weekNumber}
      mode={mode}
      exercises={exercises}
      continueSessionId={continueSessionId}
      todayCompletedSessionId={completedSessionId[effectiveCode]}
      isScheduledToday={scheduledToday === effectiveCode}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      {!continueSessionId && (
        <WorkoutCodePicker
          value={selected}
          onChange={setSelected}
          scheduledToday={scheduledToday}
          completedToday={completedToday}
        />
      )}

      {continueSessionId ? (
        card
      ) : (
        <StartWorkoutForm code={selected}>{card}</StartWorkoutForm>
      )}

      {!continueSessionId && scheduledToday && selected !== scheduledToday && (
        <p className="text-center text-xs text-muted-foreground">
          За розкладом сьогодні — тренування {scheduledToday}. Ти обрав {selected}; прогресія
          рахується окремо для кожного типу.
        </p>
      )}
    </div>
  )
}
