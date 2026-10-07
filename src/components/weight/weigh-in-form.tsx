'use client'

import { useState, useTransition } from 'react'
import { actionStartWorkout } from '@/app/actions/workout-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { parseDecimalKg, sanitizeDecimalKgInput } from '@/lib/decimal-kg-input'

interface WeighInFormProps {
  code: WorkoutTemplateCode
  defaultWeightKg: number | null
}

export const WeighInForm = ({ code, defaultWeightKg }: WeighInFormProps) => {
  const [weight, setWeight] = useState(
    defaultWeightKg != null ? String(defaultWeightKg) : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const kg = parseDecimalKg(weight)
    if (kg == null || kg <= 0 || kg < 30 || kg > 300) {
      setError('Введи вагу від 30 до 300 кг (можна з десятими, напр. 74.2)')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        await actionStartWorkout(code, kg)
      } catch {
        setError('Не вдалося почати тренування. Перевір інтернет і спробуй ще раз.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="bodyWeight">Вага, кг</Label>
        <Input
          id="bodyWeight"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="done"
          required
          autoFocus
          placeholder="напр. 74.2"
          value={weight}
          onChange={(e) => setWeight(sanitizeDecimalKgInput(e.target.value))}
          className="touch-target h-14 text-center text-xl tabular-nums"
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
