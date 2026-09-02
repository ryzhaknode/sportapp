'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { saveWorkoutSession } from '@/app/actions/sessions'
import { AnimatedNumber } from '@/components/workout/animated-number'
import { RestTimer } from '@/components/workout/rest-timer'
import { SetRow } from '@/components/workout/set-row'
import { WorkoutSummary } from '@/components/workout/workout-summary'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WorkoutType } from '@/lib/cycle'
import type { ExerciseVariant, WorkoutTemplate } from '@/lib/workouts'
import { calcTotalReps, isAtUpperBound, WORKOUT_COLORS } from '@/lib/workouts'
import { formatDuration } from '@/lib/utils'

interface WorkoutSessionProps {
  date: string
  type: WorkoutType
  variant: ExerciseVariant
  template: WorkoutTemplate
  initialReps: number[]
  previousReps: number[] | null
  previousTotal: number | null
  existingCompleted: boolean
  isDeload?: boolean
  skipRest?: boolean
}

export const WorkoutSession = ({
  date,
  type,
  variant,
  template,
  initialReps,
  previousReps,
  previousTotal,
  existingCompleted,
  isDeload = false,
  skipRest = false,
}: WorkoutSessionProps) => {
  const router = useRouter()
  const [reps, setReps] = useState<number[]>(initialReps)
  const [completedSets, setCompletedSets] = useState<boolean[]>(
    existingCompleted ? initialReps.map(() => true) : initialReps.map(() => false),
  )
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [savedDelta, setSavedDelta] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const totalReps = useMemo(() => calcTotalReps(reps), [reps])
  const activeSetIndex = completedSets.findIndex((c) => !c)
  const allComplete = activeSetIndex === -1
  const liveDelta = previousTotal !== null ? totalReps - previousTotal : null
  const atUpperBound = isAtUpperBound(type, reps)

  const handleSetComplete = useCallback(
    (index: number) => {
      setCompletedSets((prev) => {
        const next = [...prev]
        next[index] = true
        return next
      })

      if (index < template.sets - 1) {
        setShowRestTimer(true)
      }
    },
    [template.sets],
  )

  const handleFinish = async () => {
    setSaving(true)
    try {
      const result = await saveWorkoutSession({
        date,
        type,
        variant,
        reps,
        skipRest,
      })
      setSavedDelta(result.delta)
      setShowSummary(true)
    } finally {
      setSaving(false)
    }
  }

  const handleSummaryDone = () => {
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <motion.div
        layoutId="workout-badge"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center gap-3">
          <Badge className={WORKOUT_COLORS[type]}>
            {type} · {template.label}
          </Badge>
          {isDeload && (
            <Badge variant="outline" className="text-muted-foreground">
              Deload
            </Badge>
          )}
          {skipRest && (
            <Badge variant="outline" className="border-blue-500/30 text-blue-400">
              Skip rest
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold">{template.description}</h1>
        <p className="text-sm text-muted-foreground">
          RIR {isDeload ? '~4' : template.rir} · Відпочинок{' '}
          {formatDuration(isDeload ? 120 : template.restSeconds)} ·{' '}
          {template.sets} підходи · {template.repRange[0]}–{template.repRange[1]} reps
        </p>
      </motion.div>

      {atUpperBound && !existingCompleted && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Ти на верхній межі діапазону. Наступний крок — ускладнити вправу в налаштуваннях,
            а не нескінченно додавати повторення.
          </p>
        </motion.div>
      )}

      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-border bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total reps</span>
          <div className="flex items-baseline gap-2">
            <AnimatedNumber value={totalReps} className="text-3xl font-bold tabular-nums" />
            {liveDelta !== null && liveDelta !== 0 && (
              <span
                className={`text-sm font-medium ${liveDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                aria-live="polite"
              >
                {liveDelta > 0 ? '+' : ''}
                {liveDelta}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {reps.map((repCount, index) => (
          <SetRow
            key={index}
            index={index}
            reps={repCount}
            previousReps={previousReps?.[index]}
            completed={completedSets[index]}
            active={index === activeSetIndex}
            onChange={(value) => {
              setReps((prev) => {
                const next = [...prev]
                next[index] = value
                return next
              })
            }}
            onComplete={() => handleSetComplete(index)}
          />
        ))}
      </div>

      {allComplete && !showSummary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            size="lg"
            className="w-full"
            onClick={handleFinish}
            disabled={saving}
          >
            {saving ? 'Збереження…' : existingCompleted ? 'Оновити запис' : 'Завершити тренування'}
          </Button>
        </motion.div>
      )}

      {showRestTimer && (
        <RestTimer
          key={`rest-${activeSetIndex}`}
          durationSeconds={isDeload ? 120 : template.restSeconds}
          onComplete={() => setShowRestTimer(false)}
          onSkip={() => setShowRestTimer(false)}
        />
      )}

      {showSummary && (
        <WorkoutSummary
          type={type}
          reps={reps}
          totalReps={totalReps}
          delta={savedDelta}
          onDone={handleSummaryDone}
        />
      )}
    </div>
  )
}
