'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { WorkoutSummaryData } from '@/lib/workout-summary-data'
import { formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface WorkoutSummaryViewProps {
  sessionId: number
  summary: WorkoutSummaryData
  initialNote?: string | null
}

export const WorkoutSummaryView = ({ summary, initialNote }: WorkoutSummaryViewProps) => {
  const [note, setNote] = useState(initialNote ?? '')

  return (
    <main className="flex flex-col gap-6 px-4 py-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold">Підсумок тренування {summary.templateCode}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Прогрес у {summary.progressCount} з {summary.totalExercises} вправ ·{' '}
          {formatDuration(summary.durationSec)} · {summary.setCount} підходів
        </p>
        <p className="text-sm text-muted-foreground">
          Тоннаж: {Math.round(summary.tonnage)} kg
          {summary.tonnageDelta != null && (
            <span
              className={cn(
                'ml-2',
                summary.tonnageDelta >= 0 ? 'text-emerald-400' : 'text-orange-400',
              )}
            >
              ({summary.tonnageDelta >= 0 ? '+' : ''}
              {Math.round(summary.tonnageDelta)})
            </span>
          )}
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead className="border-b border-border bg-secondary/50 text-muted-foreground">
            <tr>
              <th className="p-2 font-medium">Вправа</th>
              <th className="p-2 font-medium">Минулого</th>
              <th className="p-2 font-medium">Сьогодні</th>
              <th className="p-2 font-medium">Результат</th>
              <th className="p-2 font-medium">Далі</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((row) => (
              <tr key={row.name} className="border-b border-border/60">
                <td className="p-2 font-medium">{row.name}</td>
                <td className="p-2 text-muted-foreground">{row.lastDisplay}</td>
                <td className="p-2">{row.todayDisplay}</td>
                <td
                  className={cn(
                    'p-2',
                    row.resultTone === 'good' && 'text-emerald-400',
                    row.resultTone === 'bad' && 'text-orange-400',
                    row.resultTone === 'neutral' && 'text-muted-foreground',
                  )}
                >
                  {row.isPr ? 'PR · ' : ''}
                  {row.resultLabel}
                </td>
                <td className="p-2 text-muted-foreground">{row.nextHint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="flex flex-col gap-2 text-sm">
        <span className="text-muted-foreground">Нотатка (необов&apos;язково)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="rounded-xl border border-border bg-background p-3"
          placeholder="Сон, самопочуття…"
        />
      </label>

      <Link href="/">
        <Button type="button" className="touch-target h-14 w-full">
          Готово
        </Button>
      </Link>
    </main>
  )
}
