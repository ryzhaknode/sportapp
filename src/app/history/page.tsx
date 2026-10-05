import Link from 'next/link'
import { asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { exerciseSlots, exercises, workoutSessions, workoutTemplates } from '@/lib/db/schema'
import { getCompletedSessions } from '@/lib/db/workout-sessions'
import { Badge } from '@/components/ui/badge'
import { WORKOUT_CODE_COLORS } from '@/lib/program/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const sessions = await getCompletedSessions(40)
  const db = getDb()

  const templateIds = [...new Set(sessions.map((s) => s.workoutTemplateId))]
  const templates =
    templateIds.length > 0
      ? await db
          .select()
          .from(workoutTemplates)
          .where(inArray(workoutTemplates.id, templateIds))
      : []
  const tplMap = new Map(templates.map((t) => [t.id, t.code]))

  const slots = await db.select().from(exerciseSlots).orderBy(asc(exerciseSlots.id))
  const allEx = await db.select().from(exercises)
  const exMap = new Map(allEx.map((e) => [e.id, e.name]))

  const seen = new Set<string>()
  const exerciseLinks: { slotId: number; name: string }[] = []
  for (const slot of slots) {
    const name = exMap.get(slot.exerciseId) ?? '?'
    const key = `${name}-${slot.workoutTemplateId}`
    if (seen.has(key)) continue
    seen.add(key)
    exerciseLinks.push({ slotId: slot.id, name })
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold">Історія</h1>
        <p className="text-sm text-muted-foreground">Завершені тренування</p>
      </header>

      <ul className="flex flex-col gap-2">
        {sessions.map((s) => {
          const code = tplMap.get(s.workoutTemplateId)
          const dateLabel = new Date(`${s.date}T12:00:00`).toLocaleDateString('uk-UA', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })
          const timeLabel = s.finishedAt
            ? new Date(s.finishedAt).toLocaleTimeString('uk-UA', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null

          return (
            <li key={s.id}>
              <Link
                href={`/workout/${s.id}/summary`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                <div>
                  <p className="font-medium">{dateLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Тиждень {s.weekNumber} · {s.mode}
                    {timeLabel ? ` · ${timeLabel}` : ''}
                  </p>
                </div>
                {code && (
                  <Badge variant="outline" className={cn(WORKOUT_CODE_COLORS[code])}>
                    {code}
                  </Badge>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      {sessions.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Ще немає завершених тренувань.</p>
      )}

      <section className="mt-4">
        <h2 className="mb-2 text-lg font-semibold">Вправи</h2>
        <ul className="flex flex-col gap-2">
          {exerciseLinks.map((l) => (
            <li key={l.slotId}>
              <Link
                href={`/history/exercise/${l.slotId}`}
                className="block rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary/50"
              >
                {l.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
