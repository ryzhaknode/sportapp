import { MobileAccessCard } from '@/components/settings/mobile-access-card'
import { SettingsForm } from '@/components/settings/settings-form'
import { getMaxTests } from '@/lib/db/max-tests'
import { getSettings } from '@/lib/db/settings'
import { getMobileUrl } from '@/lib/mobile-url'
import type { ExerciseVariant } from '@/lib/workouts'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const appSettings = await getSettings()
  const variant = appSettings.currentVariant as ExerciseVariant
  const maxTestsList = await getMaxTests(variant)
  const mobileUrl = getMobileUrl()

  return (
    <main className="flex min-w-0 flex-col gap-6 overflow-x-hidden px-4 py-6">
      <MobileAccessCard mobileUrl={mobileUrl} />

      <header>
        <h1 className="text-2xl font-bold">Налаштування</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Цикл, варіант вправи та max tests
        </p>
      </header>

      <SettingsForm
        startDate={appSettings.startDate}
        currentVariant={variant}
        baselineMax={appSettings.baselineMax}
        maxTests={maxTestsList.map((t) => ({
          id: t.id,
          maxReps: t.maxReps,
          testedAt: t.testedAt,
          notes: t.notes,
        }))}
      />
    </main>
  )
}
