import { notFound } from 'next/navigation'
import { WeighInForm } from '@/components/weight/weigh-in-form'
import { getLatestBodyWeight } from '@/lib/db/body-weight'
import { getTodayCompletedSessionForCode } from '@/lib/db/workout-sessions'
import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { WORKOUT_CODE_COLORS } from '@/lib/program/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const isCode = (c: string): c is WorkoutTemplateCode => c === 'A' || c === 'B' || c === 'C'

export default async function WeighInPage({ params }: PageProps<'/workout/weigh-in/[code]'>) {
  const { code: codeStr } = await params
  if (!isCode(codeStr)) notFound()

  const latest = await getLatestBodyWeight()
  const doneToday = await getTodayCompletedSessionForCode(codeStr)

  if (doneToday) {
    notFound()
  }

  return (
    <main className="flex min-h-[70vh] flex-col justify-center gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 text-center">
        <span
          className={cn(
            'mx-auto w-fit rounded-lg border px-3 py-1 text-sm font-semibold',
            WORKOUT_CODE_COLORS[codeStr],
          )}
        >
          Перед тренуванням {codeStr}
        </span>
        <h1 className="text-2xl font-bold">Вага тіла</h1>
        <p className="text-sm text-muted-foreground">
          Зважся вдома перед залом — дані підуть у графік на вкладці «Вага».
        </p>
      </header>

      <WeighInForm code={codeStr} defaultWeightKg={latest} />
    </main>
  )
}
