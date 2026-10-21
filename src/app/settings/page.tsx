import { PageMain } from '@/components/layout/page-main'
import { SettingsForm } from '@/components/settings/settings-form'
import { getSettings } from '@/lib/db/settings'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const appSettings = await getSettings()

  return (
    <PageMain className="min-w-0 overflow-x-hidden">
      <header>
        <h1 className="text-2xl font-bold">Налаштування</h1>
        <p className="mt-1 text-sm text-muted-foreground">Цикл, таймер, експорт</p>
      </header>

      <SettingsForm
        programStartDate={appSettings.programStartDate}
        tournamentWeekEnabled={appSettings.tournamentWeekEnabled}
        matchDate={appSettings.matchDate}
        timerSoundEnabled={appSettings.timerSoundEnabled}
        timerVibrationEnabled={appSettings.timerVibrationEnabled}
      />
    </PageMain>
  )
}
