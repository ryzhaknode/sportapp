'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSlotAction } from '@/app/actions/program'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TemplateWithSlots } from '@/lib/db/program'
import { WORKOUT_CODE_COLORS } from '@/lib/program/types'
import { cn } from '@/lib/utils'
import { formatDuration } from '@/lib/utils'

interface ProgramEditorProps {
  templates: TemplateWithSlots[]
}

export const ProgramEditor = ({ templates }: ProgramEditorProps) => {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})

  const startEdit = (slotId: number, slot: TemplateWithSlots['slots'][0]) => {
    setEditingId(slotId)
    setDraft({
      sets: String(slot.sets),
      repMin: String(slot.repMin),
      repMax: String(slot.repMax),
      rirMin: String(slot.rirMin),
      rirMax: String(slot.rirMax),
      restSec: String(slot.restSec),
      startWeight: slot.startWeight != null ? String(slot.startWeight) : '',
      increment: String(slot.increment),
    })
  }

  const save = (slotId: number) => {
    startTransition(async () => {
      await updateSlotAction(slotId, {
        sets: Number(draft.sets),
        repMin: Number(draft.repMin),
        repMax: Number(draft.repMax),
        rirMin: Number(draft.rirMin),
        rirMax: Number(draft.rirMax),
        restSec: Number(draft.restSec),
        startWeight: draft.startWeight ? Number(draft.startWeight) : null,
        increment: Number(draft.increment),
      })
      setEditingId(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {templates.map((tpl) => (
        <section key={tpl.id} className="flex flex-col gap-3">
          <h2
            className={cn(
              'inline-flex w-fit rounded-lg border px-3 py-1 text-sm font-semibold',
              WORKOUT_CODE_COLORS[tpl.code],
            )}
          >
            Тренування {tpl.code}
          </h2>
          <ul className="flex flex-col gap-2">
            {tpl.slots.map((slot) => (
              <li key={slot.id} className="rounded-xl border border-border bg-card p-3">
                <p className="font-medium">{slot.exercise.name}</p>
                <p className="text-xs text-muted-foreground">
                  {slot.sets} × {slot.repMin}–{slot.repMax} · RIR {slot.rirMin}–{slot.rirMax} ·{' '}
                  {formatDuration(slot.restSec)}
                  {slot.startWeight != null ? ` · старт ${slot.startWeight} kg` : ' · підібрати'}
                </p>

                {editingId === slot.id ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(['sets', 'repMin', 'repMax', 'rirMin', 'rirMax', 'restSec', 'startWeight', 'increment'] as const).map(
                      (key) => (
                        <div key={key} className="flex flex-col gap-1">
                          <Label className="text-xs">{key}</Label>
                          <Input
                            value={draft[key] ?? ''}
                            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                            className="h-10"
                          />
                        </div>
                      ),
                    )}
                    <div className="col-span-2 flex gap-2">
                      <Button
                        type="button"
                        className="touch-target flex-1"
                        disabled={pending}
                        onClick={() => save(slot.id)}
                      >
                        Зберегти
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                        Скасувати
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2 h-10 w-full"
                    onClick={() => startEdit(slot.id, slot)}
                  >
                    Редагувати
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
