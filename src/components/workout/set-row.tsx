'use client'

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface SetRowProps {
  index: number
  reps: number
  previousReps?: number
  completed: boolean
  active: boolean
  onChange: (reps: number) => void
  onComplete: () => void
}

export const SetRow = ({
  index,
  reps,
  previousReps,
  completed,
  active,
  onChange,
  onComplete,
}: SetRowProps) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && reps > 0 && !completed) {
      onComplete()
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-4 transition-colors',
        completed && 'border-emerald-500/30 bg-emerald-500/5',
        active && !completed && 'border-amber-500/40 bg-amber-500/5',
        !active && !completed && 'border-border bg-card',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
        {index + 1}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor={`set-${index}`} className="text-xs text-muted-foreground">
          Підхід {index + 1}
        </Label>
        <Input
          ref={inputRef}
          id={`set-${index}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={reps || ''}
          disabled={completed}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          onKeyDown={handleKeyDown}
          className="h-10 text-lg font-semibold"
          aria-describedby={previousReps !== undefined ? `prev-${index}` : undefined}
        />
        {previousReps !== undefined && (
          <span id={`prev-${index}`} className="text-xs text-muted-foreground">
            Минулого разу: {previousReps}
          </span>
        )}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        animate={completed ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        onClick={() => reps > 0 && !completed && onComplete()}
        disabled={completed || reps <= 0}
        aria-label={`Завершити підхід ${index + 1}`}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors',
          completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-border bg-secondary hover:border-amber-500/50 disabled:opacity-40',
        )}
      >
        <Check className="h-5 w-5" aria-hidden="true" />
      </motion.button>
    </motion.div>
  )
}
