'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { exportCsvAction, exportDataAction, updateSettingsAction } from '@/app/actions/settings'
import { requestNotificationPermission } from '@/lib/timer-feedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SettingsFormProps {
  programStartDate: string
  tournamentWeekEnabled: boolean
  matchDate: string | null
  timerSoundEnabled: boolean
  timerVibrationEnabled: boolean
}

export const SettingsForm = ({
  programStartDate,
  tournamentWeekEnabled,
  matchDate,
  timerSoundEnabled,
  timerVibrationEnabled,
}: SettingsFormProps) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    programStartDate,
    tournamentWeekEnabled,
    matchDate: matchDate ?? '',
    timerSoundEnabled,
    timerVibrationEnabled,
  })

  const handleSaveSettings = () => {
    startTransition(async () => {
      await updateSettingsAction({
        programStartDate: form.programStartDate,
        tournamentWeekEnabled: form.tournamentWeekEnabled,
        matchDate: form.matchDate || null,
        timerSoundEnabled: form.timerSoundEnabled,
        timerVibrationEnabled: form.timerVibrationEnabled,
      })
      router.refresh()
    })
  }

  const handleExport = async () => {
    const data = await exportDataAction()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gym-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCsv = async () => {
    const csv = await exportCsvAction()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gym-sessions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleNotifications = async () => {
    await requestNotificationPermission()
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Програма</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="programStartDate">Дата старту 13-тижневого циклу</Label>
            <Input
              id="programStartDate"
              type="date"
              value={form.programStartDate}
              onChange={(e) => setForm((f) => ({ ...f, programStartDate: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="matchDate">Дата важливого матчу (опційно)</Label>
            <Input
              id="matchDate"
              type="date"
              value={form.matchDate}
              onChange={(e) => setForm((f) => ({ ...f, matchDate: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.tournamentWeekEnabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, tournamentWeekEnabled: e.target.checked }))
              }
              className="h-5 w-5 rounded border-border"
            />
            Турнірний тиждень (2 підходи, запас 2–3)
          </label>
          <Button onClick={handleSaveSettings} disabled={pending} className="touch-target h-12">
            Зберегти
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Таймер</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.timerSoundEnabled}
              onChange={(e) => setForm((f) => ({ ...f, timerSoundEnabled: e.target.checked }))}
              className="h-5 w-5"
            />
            Звук наприкінці відпочинку
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.timerVibrationEnabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, timerVibrationEnabled: e.target.checked }))
              }
              className="h-5 w-5"
            />
            Вібрація
          </label>
          <Button type="button" variant="secondary" className="touch-target h-12" onClick={handleNotifications}>
            Дозволити сповіщення
          </Button>
          <Button onClick={handleSaveSettings} disabled={pending} variant="outline">
            Зберегти таймер
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Резервна копія</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" onClick={handleExport} className="touch-target h-12 w-full">
            <Download className="h-4 w-4" aria-hidden="true" />
            Експорт JSON
          </Button>
          <Button variant="outline" onClick={handleExportCsv} className="touch-target h-12 w-full">
            Експорт історії CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
