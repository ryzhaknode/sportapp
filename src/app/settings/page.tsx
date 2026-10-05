import { MobileAccessCard } from '@/components/settings/mobile-access-card'
import { SettingsForm } from '@/components/settings/settings-form'
import { getSettings } from '@/lib/db/settings'
import { getMobileUrl } from '@/lib/mobile-url'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const appSettings = await getSettings()
  const mobileUrl = getMobileUrl()

  return (
    <main className="flex min-w-0 flex-col gap-6 overflow-x-hidden px-4 py-6">
      <MobileAccessCard mobileUrl={mobileUrl} />

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
    </main>
  )
}
