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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">Додати запис</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="weightDate" className="text-xs">
            Дата
          </Label>
          <Input
            id="weightDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="weightKg" className="text-xs">
            Вага, кг
          </Label>
          <Input
            id="weightKg"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-11"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={pending} variant="secondary" className="touch-target h-11">
        Зберегти
      </Button>
    </form>
  )
}
