'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Plus } from 'lucide-react'
import {
  addMaxTestAction,
  exportDataAction,
  updateSettingsAction,
} from '@/app/actions/settings'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EXERCISE_VARIANTS, type ExerciseVariant } from '@/lib/workouts'
import { formatShortDate } from '@/lib/utils'

interface MaxTestItem {
  id: number
  maxReps: number
  testedAt: string
  notes: string | null
}

interface SettingsFormProps {
  startDate: string
  currentVariant: ExerciseVariant
  baselineMax: number
  maxTests: MaxTestItem[]
}

export const SettingsForm = ({
  startDate,
  currentVariant,
  baselineMax,
  maxTests,
}: SettingsFormProps) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    startDate,
    currentVariant,
    baselineMax: String(baselineMax),
  })
  const [maxForm, setMaxForm] = useState({
    maxReps: '',
    testedAt: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  const handleSaveSettings = () => {
    startTransition(async () => {
      await updateSettingsAction({
        startDate: form.startDate,
        currentVariant: form.currentVariant as ExerciseVariant,
        baselineMax: Number(form.baselineMax),
      })
      router.refresh()
    })
  }

  const handleAddMaxTest = () => {
    if (!maxForm.maxReps) return
    startTransition(async () => {
      await addMaxTestAction({
        variant: form.currentVariant as ExerciseVariant,
        maxReps: Number(maxForm.maxReps),
        testedAt: maxForm.testedAt,
        notes: maxForm.notes || undefined,
      })
      setMaxForm({ maxReps: '', testedAt: new Date().toISOString().slice(0, 10), notes: '' })
      router.refresh()
    })
  }

  const handleExport = async () => {
    const data = await exportDataAction()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sportapp-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Цикл тренувань</CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4 overflow-hidden">
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor="startDate">Дата старту циклу</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="variant">Варіант вправи</Label>
            <select
              id="variant"
              value={form.currentVariant}
              onChange={(e) =>
                setForm((f) => ({ ...f, currentVariant: e.target.value as ExerciseVariant }))
              }
              className="flex h-11 w-full rounded-xl border border-border bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(EXERCISE_VARIANTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="baselineMax">Baseline max (0 RIR)</Label>
            <Input
              id="baselineMax"
              type="number"
              min={1}
              value={form.baselineMax}
              onChange={(e) => setForm((f) => ({ ...f, baselineMax: e.target.value }))}
            />
          </div>

          <Button onClick={handleSaveSettings} disabled={pending}>
            Зберегти
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Тест максимуму</CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4 overflow-hidden">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="maxReps">Max reps</Label>
              <Input
                id="maxReps"
                type="number"
                min={1}
                value={maxForm.maxReps}
                onChange={(e) => setMaxForm((f) => ({ ...f, maxReps: e.target.value }))}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="testedAt">Дата</Label>
              <Input
                id="testedAt"
                type="date"
                value={maxForm.testedAt}
                onChange={(e) => setMaxForm((f) => ({ ...f, testedAt: e.target.value }))}
              />
            </div>
          </div>
          <Button variant="secondary" onClick={handleAddMaxTest} disabled={pending || !maxForm.maxReps}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Додати запис
          </Button>

          {maxTests.length > 0 && (
            <ul className="flex flex-col gap-2">
              {maxTests.map((test) => (
                <li
                  key={test.id}
                  className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3 text-sm"
                >
                  <span>{formatShortDate(test.testedAt)}</span>
                  <span className="font-semibold">{test.maxReps} reps</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Резервна копія</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} className="w-full">
            <Download className="h-4 w-4" aria-hidden="true" />
            Експорт JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
