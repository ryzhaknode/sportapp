'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { ExerciseLogRow } from '@/lib/db/workout-sessions'
import { cn } from '@/lib/utils'

interface ExerciseListSheetProps {
  open: boolean
  onClose: () => void
  exercises: ExerciseLogRow[]
  currentIndex: number
  onSelect: (index: number) => void
  onAddExtra: (exerciseLogId: number | string) => void
}

const statusLabel = (ex: ExerciseLogRow): string => {
  if (ex.status === 'done') return 'Виконано'
  if (ex.status === 'skipped') return 'Пропущено'
  const pending = ex.sets.some((s) => s.status === 'pending')
  if (ex.status === 'partial' || pending) return 'В процесі'
  return 'Не почато'
}

export const ExerciseListSheet = ({
  open,
  onClose,
  exercises,
  currentIndex,
  onSelect,
  onAddExtra,
}: ExerciseListSheetProps) => {
  useEffect(() => {
    if (!open) return
    document.body.setAttribute('data-overlay-open', 'true')
    return () => document.body.removeAttribute('data-overlay-open')
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="max-h-[70vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Список вправ</h2>
          <Button type="button" variant="ghost" onClick={onClose}>
            Закрити
          </Button>
        </div>
        <ul className="flex flex-col gap-2">
          {exercises.map((ex, i) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  'touch-target flex w-full flex-col items-start rounded-xl border border-border px-3 py-3 text-left',
                  i === currentIndex && 'border-amber-500/40 bg-amber-500/10',
                  ex.sets.some((s) => s.status === 'pending') &&
                    ex.status !== 'skipped' &&
                    'border-orange-500/30',
                )}
              >
                <span className="font-medium">{ex.exerciseName}</span>
                <span className="text-xs text-muted-foreground">{statusLabel(ex)}</span>
              </button>
              <Button
                type="button"
                variant="ghost"
                className="mt-1 h-10 w-full text-xs"
                onClick={() => onAddExtra(ex.id)}
              >
                + підхід (поза планом)
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
