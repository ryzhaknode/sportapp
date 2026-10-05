'use client'

import { cn } from '@/lib/utils'
import type { SetLogRow } from '@/lib/db/workout-sessions'

interface SetEntryRowProps {
  set: SetLogRow
  isActive: boolean
  isLocked: boolean
  suggestedReps: number | null
  onSelect: () => void
}

export const SetEntryRow = ({
  set,
  isActive,
  isLocked,
  suggestedReps,
  onSelect,
}: SetEntryRowProps) => {
  const done = set.status === 'done'
  const skipped = set.status === 'skipped'
  const pendingPrefill = !done && !skipped && set.reps != null

  return (
    <button
      type="button"
      onClick={() => !isLocked && onSelect()}
      disabled={isLocked && !done}
      className={cn(
        'touch-target grid w-full grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-1 rounded-xl border px-2 py-2 text-left text-sm transition-colors',
        isActive && 'border-amber-500/50 bg-amber-500/10',
        done && 'border-border bg-secondary/50',
        skipped && 'border-orange-500/30 bg-orange-500/5 opacity-80',
        isLocked && !done && 'opacity-40',
      )}
    >
      <span className="text-muted-foreground">{set.setIndex + 1}</span>
      <span className={cn(pendingPrefill && 'text-muted-foreground')}>
        {set.weight != null ? set.weight : '—'}
      </span>
      <span
        className={cn(
          pendingPrefill && 'text-muted-foreground',
          !done && suggestedReps != null && set.reps == null && 'text-muted-foreground',
        )}
      >
        {set.reps ?? (suggestedReps != null ? suggestedReps : '—')}
      </span>
      <span>{set.rir ?? '—'}</span>
      <span aria-hidden="true">
        {done ? '✓' : skipped ? '—' : isActive ? '○' : '·'}
      </span>
    </button>
  )
}
