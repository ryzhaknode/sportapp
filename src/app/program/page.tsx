import { PageMain } from '@/components/layout/page-main'
import { ProgramEditor } from '@/components/program/program-editor'
import { getAllTemplates } from '@/lib/db/program'
import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { getSettings } from '@/lib/db/settings'
import { getCyclePosition, getCycleState } from '@/lib/db/workout-sessions'
import { WORKOUT_ORDER } from '@/lib/program/schedule'
import { DELOAD_WEEKS, EXTRA_SET_WEEKS } from '@/lib/program/week-cycle'
import { CYCLE_LENGTH_WEEKS, PROGRAM_NAME } from '@/lib/program/seed'

export const dynamic = 'force-dynamic'

export default async function ProgramPage() {
  const [templates, settings] = await Promise.all([getAllTemplates(), getSettings()])
  const cycleState = await getCycleState(settings.programStartDate)
  const nextPhase = Object.fromEntries(
    WORKOUT_ORDER.map((code) => [code, getCyclePosition(cycleState, code).phase]),
  ) as Record<WorkoutTemplateCode, 0 | 1>

  return (
    <PageMain>
      <header>
        <h1 className="text-[1.625rem] font-bold leading-tight">Програма</h1>
        <p className="text-sm text-muted-foreground">{PROGRAM_NAME}</p>
      </header>

      <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p>Програма: {CYCLE_LENGTH_WEEKS} циклів A → B → C, без прив’язки до днів і тижнів</p>
        <p>Розвантаження: цикл {DELOAD_WEEKS[0]} · тест: цикл {CYCLE_LENGTH_WEEKS}</p>
        <p>
          +1 підхід (груди/спина): цикли {EXTRA_SET_WEEKS[0]}–
          {EXTRA_SET_WEEKS[EXTRA_SET_WEEKS.length - 1]}
        </p>
        <p className="mt-2">Цикл починається з A; номер циклу — скільки A ти вже провів.</p>
      </section>

      <ProgramEditor templates={templates} nextPhase={nextPhase} />
    </PageMain>
  )
}
