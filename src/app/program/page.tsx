import { ProgramEditor } from '@/components/program/program-editor'
import { getAllTemplates } from '@/lib/db/program'
import { DELOAD_WEEKS, EXTRA_SET_WEEKS } from '@/lib/program/week-cycle'
import { CYCLE_LENGTH_WEEKS, PROGRAM_NAME } from '@/lib/program/seed'

export const dynamic = 'force-dynamic'

export default async function ProgramPage() {
  const templates = await getAllTemplates()

  return (
    <main className="flex flex-col gap-6 px-4 py-6 pb-24">
      <header>
        <h1 className="text-2xl font-bold">Програма</h1>
        <p className="text-sm text-muted-foreground">{PROGRAM_NAME}</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>Цикл: {CYCLE_LENGTH_WEEKS} тижнів</p>
        <p>Розвантаження: тижні {DELOAD_WEEKS.join(', ')}</p>
        <p>+1 підхід (груди/спина): тижні {EXTRA_SET_WEEKS.join('–')}</p>
        <p className="mt-2">Розклад: Пн A · Ср B · Пт C</p>
      </section>

      <ProgramEditor templates={templates} />
    </main>
  )
}
