'use client'

import { useSearchParams } from 'next/navigation'
import { WeighInForm } from '@/components/weight/weigh-in-form'
import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { WORKOUT_CODE_COLORS } from '@/lib/program/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const isCode = (c: string | null): c is WorkoutTemplateCode =>
  c === 'A' || c === 'B' || c === 'C'

export default function OfflineWeighInPage() {
  const searchParams = useSearchParams()
  const codeParam = searchParams.get('code')
  const code = isCode(codeParam) ? codeParam : null

  if (!code) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-8">
        <p className="text-sm text-muted-foreground">Обери A, B або C на головній офлайн-сторінці.</p>
        <Link href="/offline" className="text-emerald-300 underline-offset-2 hover:underline">
          Назад
        </Link>
      </main>
    )
  }

  return (
    <main className="flex min-h-[70vh] flex-col justify-center gap-6 px-4 py-8">
      <header className="flex flex-col gap-2 text-center">
        <span
          className={cn(
            'mx-auto w-fit rounded-lg border px-3 py-1 text-sm font-semibold',
            WORKOUT_CODE_COLORS[code],
          )}
        >
          Перед тренуванням {code}
        </span>
        <h1 className="text-2xl font-bold">Вага тіла</h1>
        <p className="text-sm text-muted-foreground">Офлайн — запис збережеться на телефоні.</p>
      </header>

      <WeighInForm code={code} defaultWeightKg={null} offlineWorkoutPath="/workout/offline" />
    </main>
  )
}
