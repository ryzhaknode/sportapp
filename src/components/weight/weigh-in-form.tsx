'use client'

import { useState, useTransition } from 'react'
import { actionStartWorkout } from '@/app/actions/workout-session'
import { createLocalWorkout, OfflineCacheError } from '@/lib/offline/local-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkoutTemplateCode } from '@/lib/db/schema'

interface WeighInFormProps {
  code: WorkoutTemplateCode
  defaultWeightKg: number | null
  /** Після офлайн-старту — повне завантаження сторінки (для SW-кешу). */
  offlineWorkoutPath?: string
}

const goOfflineWorkout = (path: string) => {
  window.location.assign(path)
}

export const WeighInForm = ({
  code,
  defaultWeightKg,
  offlineWorkoutPath = '/workout/offline',
}: WeighInFormProps) => {
  const [weight, setWeight] = useState(
    defaultWeightKg != null ? String(defaultWeightKg) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const kg = Number(weight.replace(',', '.'))
    if (!Number.isFinite(kg) || kg <= 0) {
      setError('Введи вагу в кілограмах')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          await createLocalWorkout(code, kg)
          goOfflineWorkout(offlineWorkoutPath)
          return
        }
        await actionStartWorkout(code, kg)
      } catch (err) {
        if (err instanceof OfflineCacheError) {
          setError(err.message)
          return
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          try {
            await createLocalWorkout(code, kg)
            goOfflineWorkout(offlineWorkoutPath)
            return
          } catch (offlineErr) {
            setError(
              offlineErr instanceof OfflineCacheError
                ? offlineErr.message
                : 'Не вдалося почати офлайн-тренування',
            )
            return
          }
        }
        try {
          await createLocalWorkout(code, kg)
          goOfflineWorkout(offlineWorkoutPath)
        } catch {
          setError('Не вдалося почати тренування (немає зв’язку з Mac)')
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="bodyWeight">Вага, кг</Label>
        <Input
          id="bodyWeight"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={30}
          max={300}
          required
          autoFocus
          placeholder="напр. 82.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="touch-target h-14 text-center text-xl"
        />
        {defaultWeightKg != null && (
          <p className="text-center text-xs text-muted-foreground">
            Минулий запис: {defaultWeightKg} кг
          </p>
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="touch-target h-14 w-full text-base">
        {pending ? 'Запуск…' : 'Почати тренування'}
      </Button>
    </form>
  )
}
