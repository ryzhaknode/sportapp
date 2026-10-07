'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  actionAddExtraSet,
  actionCompleteSet,
  actionFinishWorkout,
  actionSkipExercise,
  actionSkipSet,
} from '@/app/actions/workout-session'
import { SetEntryRow } from '@/components/workout/set-entry-row'
import { RestTimerSheet } from '@/components/workout/rest-timer-sheet'
import { ExerciseListSheet } from '@/components/workout/exercise-list-sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SessionDetail } from '@/lib/db/workout-sessions'
import type { SkipReason } from '@/lib/db/schema'
import { SKIP_REASON_LABELS } from '@/lib/db/schema'
import {
  PROGRESSION_BADGE_CLASS,
  PROGRESSION_LABELS,
  type ProgressionStatus,
} from '@/lib/program/types'
import { formatWeight } from '@/lib/progression/weight'
import type { WeightType } from '@/lib/program/types'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useWakeLock } from '@/lib/hooks/use-wake-lock'
import { formatDecimalKg, parseDecimalKg, sanitizeDecimalKgInput } from '@/lib/decimal-kg-input'

interface ActiveWorkoutProps {
  detail: SessionDetail
  timerSound: boolean
  timerVibration: boolean
}

export const ActiveWorkout = ({ detail, timerSound, timerVibration }: ActiveWorkoutProps) => {
  useWakeLock(true)
  const router = useRouter()

  const [exerciseIndex, setExerciseIndex] = useState(() => {
    const firstPending = detail.exercises.findIndex((e) =>
      e.sets.some((s) => s.status === 'pending'),
    )
    return firstPending >= 0 ? firstPending : 0
  })

  const [activeSetId, setActiveSetId] = useState<number | string | null>(() => {
    const ex = detail.exercises[exerciseIndex]
    const pending = ex?.sets.find((s) => s.status === 'pending')
    return pending?.id ?? null
  })

  const [weightInput, setWeightInput] = useState('0')
  const [reps, setReps] = useState<number>(8)
  const [rir, setRir] = useState<number>(2)
  const [saving, setSaving] = useState(false)
  const [showExerciseList, setShowExerciseList] = useState(false)
  const [skipMode, setSkipMode] = useState<'set' | 'exercise' | null>(null)
  const [finishError, setFinishError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)

  const exercise = detail.exercises[exerciseIndex]
  const activeSet = exercise?.sets.find((s) => s.id === activeSetId) ?? null

  const increment = exercise?.slot.increment ?? 2.5

  useEffect(() => {
    const start = new Date(detail.session.startedAt).getTime()
    const tick = () => setElapsedSec(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [detail.session.startedAt])

  useEffect(() => {
    if (!activeSet) return
    const w = activeSet.weight ?? exercise.suggestedWeight ?? 0
    setWeightInput(formatDecimalKg(w))
    const lastDone = [...exercise.sets].reverse().find((s) => s.status === 'done')
    setReps(lastDone?.reps ?? activeSet.reps ?? exercise.repMin)
    setRir(activeSet.rir ?? exercise.rirMin)
  }, [activeSetId, exercise, activeSet])

  const totalSets = useMemo(
    () => detail.exercises.reduce((n, e) => n + e.sets.length, 0),
    [detail.exercises],
  )
  const completedSets = useMemo(
    () =>
      detail.exercises.reduce(
        (n, e) => n + e.sets.filter((s) => s.status === 'done' || s.status === 'skipped').length,
        0,
      ),
    [detail.exercises],
  )

  const progressionStatus = (exercise?.suggestedStatus ?? 'first') as ProgressionStatus

  const currentExerciseDone = exercise?.sets.every((s) => s.status !== 'pending') ?? false
  const nextExerciseIndex = detail.exercises.findIndex(
    (e, i) => i > exerciseIndex && e.sets.some((s) => s.status === 'pending'),
  )
  const hasNextExercise = nextExerciseIndex >= 0
  const allWorkoutDone = completedSets >= totalSets

  const syncActiveSet = useCallback(() => {
    router.refresh()
  }, [router])

  const goToNextExercise = useCallback(() => {
    if (nextExerciseIndex >= 0) {
      setExerciseIndex(nextExerciseIndex)
      const nextEx = detail.exercises[nextExerciseIndex]
      const pending = nextEx?.sets.find((s) => s.status === 'pending')
      setActiveSetId(pending?.id ?? null)
    }
  }, [nextExerciseIndex, detail.exercises])

  const handleCompleteSet = async () => {
    if (!activeSet || typeof activeSet.id !== 'number') return
    const weight = parseDecimalKg(weightInput)
    if (weight == null || weight < 0) return
    setSaving(true)
    try {
      await actionCompleteSet({
        setId: activeSet.id,
        weight,
        reps,
        rir,
      })
      syncActiveSet()
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async (reason: SkipReason) => {
    setSaving(true)
    try {
      if (skipMode === 'exercise' && exercise && typeof exercise.id === 'number') {
        await actionSkipExercise(exercise.id, reason)
      } else if (activeSet && typeof activeSet.id === 'number') {
        await actionSkipSet(activeSet.id, reason)
      }
      setSkipMode(null)
      syncActiveSet()
    } finally {
      setSaving(false)
    }
  }

  const handleFinish = async () => {
    setFinishError(null)
    setSaving(true)
    try {
      const result = await actionFinishWorkout(detail.session.id)
      if (result && !result.ok) {
        setFinishError(`Залишилось ${result.pending} підходів без запису`)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!exercise) {
    return null
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-[calc(11rem+env(safe-area-inset-bottom,0px))] pt-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Тренування {detail.templateCode} · {formatDuration(elapsedSec)}
          </span>
          <span className="text-right leading-tight">
            Вправа {exerciseIndex + 1}/{detail.exercises.length}
            <br />
            {exercise.sets.filter((s) => s.status !== 'pending').length}/{exercise.sets.length} тут ·{' '}
            {completedSets}/{totalSets} загалом
          </span>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-lg font-semibold leading-tight">{exercise.exerciseName}</h1>
          {exercise.suggestedStatus && (
            <Badge
              variant="outline"
              className={cn(PROGRESSION_BADGE_CLASS[progressionStatus])}
            >
              {PROGRESSION_LABELS[progressionStatus]}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {exercise.effectiveSets} × {exercise.repMin}–{exercise.repMax} · запас {exercise.rirMin}
          {exercise.rirMax !== exercise.rirMin ? `–${exercise.rirMax}` : ''} · відпочинок{' '}
          {formatDuration(exercise.restSec)}
        </p>
        {exercise.suggestedWeight != null && exercise.suggestedStatus !== 'first' && (
          <p className="text-sm text-emerald-400/90">
            {exercise.progressionHint}
            {exercise.suggestedWeight != null && (
              <>
                {' '}
                · ціль{' '}
                {formatWeight(exercise.suggestedWeight, exercise.weightType as WeightType)}
              </>
            )}
          </p>
        )}
        {exercise.lastTimeDisplay && (
          <p className="text-sm text-muted-foreground">
            Минулого разу:{' '}
            <span className="text-foreground/80">{exercise.lastTimeDisplay}</span>
          </p>
        )}

        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-1 px-2 text-xs text-muted-foreground">
          <span>#</span>
          <span>Вага</span>
          <span>Reps</span>
          <span>Запас</span>
          <span />
        </div>

        <div className="flex flex-col gap-2">
          {exercise.sets.map((set) => {
            const firstPending = exercise.sets.find((s) => s.status === 'pending')
            const isActive = set.id === (activeSetId ?? firstPending?.id)
            const isLocked =
              set.status === 'pending' &&
              firstPending != null &&
              set.setIndex > firstPending.setIndex

            return (
              <SetEntryRow
                key={set.id}
                set={set}
                isActive={isActive}
                isLocked={isLocked}
                suggestedReps={set.reps == null ? exercise.repMin : null}
                onSelect={() => setActiveSetId(set.id)}
              />
            )
          })}
        </div>

        {currentExerciseDone && !allWorkoutDone && hasNextExercise && (
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Вправу «{exercise.exerciseName}» завершено
            </p>
            <Button
              type="button"
              className="touch-target h-14 w-full text-base"
              onClick={goToNextExercise}
            >
              Наступна: {detail.exercises[nextExerciseIndex]?.exerciseName}
            </Button>
          </div>
        )}

        {activeSet && activeSet.status === 'pending' && (
          <div className="mt-2 flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Вага, кг</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="touch-target flex-1 text-xl"
                  onClick={() => {
                    const current = parseDecimalKg(weightInput) ?? 0
                    setWeightInput(formatDecimalKg(Math.max(0, current - increment)))
                  }}
                  aria-label="Зменшити вагу"
                >
                  −
                </Button>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  enterKeyHint="done"
                  value={weightInput}
                  onChange={(e) => setWeightInput(sanitizeDecimalKgInput(e.target.value))}
                  className="touch-target w-24 rounded-xl border border-border bg-background text-center text-lg tabular-nums"
                  aria-label="Вага, кг"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="touch-target flex-1 text-xl"
                  onClick={() => {
                    const current = parseDecimalKg(weightInput) ?? 0
                    setWeightInput(formatDecimalKg(current + increment))
                  }}
                  aria-label="Збільшити вагу"
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Повтори</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="touch-target flex-1 text-xl"
                  onClick={() => setReps((r) => Math.max(0, r - 1))}
                  aria-label="Зменшити повтори"
                >
                  −
                </Button>
                <span className="w-24 text-center text-lg font-semibold">{reps}</span>
                <Button
                  type="button"
                  variant="secondary"
                  className="touch-target flex-1 text-xl"
                  onClick={() => setReps((r) => r + 1)}
                  aria-label="Збільшити повтори"
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Запас (RIR)</span>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRir(v)}
                    className={cn(
                      'touch-target min-w-12 rounded-xl border px-3 text-sm font-medium',
                      rir === v
                        ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                        : 'border-border bg-secondary',
                    )}
                  >
                    {v === 4 ? '4+' : v}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="touch-target h-14 w-full text-base"
              disabled={saving}
              onClick={handleCompleteSet}
            >
              ✓ Підхід виконано
            </Button>
          </div>
        )}
      </section>

      {finishError && (
        <p className="text-sm text-orange-400" role="alert">
          {finishError}
        </p>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md">
        <div className="px-4 pt-3">
          {allWorkoutDone ? (
            <Button
              type="button"
              className="touch-target h-14 w-full text-base"
              disabled={saving}
              onClick={handleFinish}
            >
              Завершити тренування
            </Button>
          ) : currentExerciseDone && hasNextExercise ? (
            <Button
              type="button"
              className="touch-target h-14 w-full text-base"
              onClick={goToNextExercise}
            >
              Наступна: {detail.exercises[nextExerciseIndex]?.exerciseName}
            </Button>
          ) : (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Залишилось {totalSets - completedSets} підходів у тренуванні
            </p>
          )}
        </div>
        {!allWorkoutDone && (
          <nav className="flex gap-1 border-t border-border/60 px-2 py-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-11 flex-1 px-1 text-xs"
              disabled={exerciseIndex === 0}
              onClick={() => {
                const newIndex = exerciseIndex - 1
                setExerciseIndex(newIndex)
                const ex = detail.exercises[newIndex]
                const pending = ex?.sets.find((s) => s.status === 'pending')
                setActiveSetId(pending?.id ?? ex?.sets[0]?.id ?? null)
              }}
            >
              ‹ Назад
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-11 flex-1 px-1 text-xs"
              onClick={() => setShowExerciseList(true)}
            >
              Список
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-11 flex-1 px-1 text-xs"
              disabled={!hasNextExercise}
              onClick={goToNextExercise}
            >
              Далі ›
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11 min-h-11 flex-1 px-1 text-xs"
              onClick={() => setSkipMode(activeSet?.status === 'pending' ? 'set' : 'exercise')}
            >
              Пропустити
            </Button>
          </nav>
        )}
      </footer>

      {skipMode && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60">
          <div className="w-full rounded-t-2xl border border-border bg-card p-4 pb-8">
            <p className="mb-3 font-medium">Причина пропуску</p>
            <div className="flex flex-col gap-2">
              {(Object.keys(SKIP_REASON_LABELS) as SkipReason[]).map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="secondary"
                  className="touch-target h-12 justify-start"
                  onClick={() => handleSkip(key)}
                >
                  {SKIP_REASON_LABELS[key]}
                </Button>
              ))}
              <Button type="button" variant="ghost" onClick={() => setSkipMode(null)}>
                Скасувати
              </Button>
            </div>
          </div>
        </div>
      )}

      <RestTimerSheet
        sessionId={detail.session.id}
        restTimer={detail.restTimer}
        nextLabel={
          exercise.sets.every((s) => s.status !== 'pending')
            ? detail.exercises[exerciseIndex + 1]?.exerciseName ?? null
            : `${exercise.exerciseName}, підхід ${(activeSet?.setIndex ?? 0) + 2}`
        }
        soundEnabled={timerSound}
        vibrationEnabled={timerVibration}
        onDismiss={() => syncActiveSet()}
      />

      <ExerciseListSheet
        open={showExerciseList}
        onClose={() => setShowExerciseList(false)}
        exercises={detail.exercises}
        currentIndex={exerciseIndex}
        onSelect={(index) => {
          setExerciseIndex(index)
          setShowExerciseList(false)
        }}
        onAddExtra={async (logId) => {
          if (typeof logId !== 'number') return
          await actionAddExtraSet(logId)
          syncActiveSet()
        }}
      />
    </div>
  )
}
