'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actionAddBodyWeight } from '@/app/actions/body-weight'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const AddWeightForm = () => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [weight, setWeight] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const kg = Number(weight.replace(',', '.'))
    if (!Number.isFinite(kg) || kg <= 0) return

    startTransition(async () => {
      await actionAddBodyWeight({ date, weightKg: kg })
      setWeight('')
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
    >
      <p className="text-sm font-semibold">Додати запис</p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="weightDate" className="text-xs text-muted-foreground">
            Дата
          </Label>
          <Input
            id="weightDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="touch-target h-12 w-full min-w-0 text-base"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="weightKg" className="text-xs text-muted-foreground">
            Вага, кг
          </Label>
          <Input
            id="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="напр. 82.5"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="touch-target h-12 w-full text-center text-lg tabular-nums"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="touch-target h-14 w-full text-base">
        Зберегти
      </Button>
    </form>
  )
}
