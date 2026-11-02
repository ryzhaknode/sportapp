'use client'

import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { WORKOUT_CODE_COLORS } from '@/lib/program/types'
import { cn } from '@/lib/utils'

interface WorkoutCodePickerProps {
  value: WorkoutTemplateCode
  onChange: (code: WorkoutTemplateCode) => void
  disabled?: boolean
  /** Next workout in the A → B → C order. */
  nextCode: WorkoutTemplateCode
  completedToday: Record<WorkoutTemplateCode, boolean>
}

const CODES: WorkoutTemplateCode[] = ['A', 'B', 'C']

export const WorkoutCodePicker = ({
  value,
  onChange,
  disabled = false,
  nextCode,
  completedToday,
}: WorkoutCodePickerProps) => {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Обери тренування</p>
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Тип тренування">
        {CODES.map((code) => {
          const selected = value === code
          const isNext = nextCode === code
          const isDone = completedToday[code]

          return (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={disabled}
              onClick={() => onChange(code)}
              className={cn(
                'touch-target flex flex-col items-center justify-center rounded-xl border py-3 text-base font-semibold transition-colors',
                selected
                  ? cn(WORKOUT_CODE_COLORS[code], 'ring-2 ring-amber-500/40')
                  : 'border-border bg-secondary/40 text-muted-foreground',
                disabled && 'opacity-50',
              )}
            >
              {code}
              {isNext && (
                <span className="mt-0.5 text-[10px] font-normal opacity-80">наступне</span>
              )}
              {isDone && (
                <span className="mt-0.5 text-[10px] font-normal text-emerald-400">✓ сьогодні</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
