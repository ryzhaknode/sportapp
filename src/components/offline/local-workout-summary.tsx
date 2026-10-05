'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { LocalWorkoutRecord } from '@/lib/offline/types'
import { syncLocalSessionById } from '@/lib/offline/sync-client'
import { formatDisplayDate } from '@/lib/utils'

interface LocalWorkoutSummaryProps {
  record: LocalWorkoutRecord
}

export const LocalWorkoutSummary = ({ record }: LocalWorkoutSummaryProps) => {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [successId, setSuccessId] = useState<number | null>(record.serverSessionId)
  const [pending, startTransition] = useTransition()

  const handleSync = () => {
    setError(null)
    startTransition(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setError('Підключись до Wi‑Fi Mac і спробуй знову')
        return
      }
      const result = await syncLocalSessionById(record.localId)
      if (result.ok) {
        setSuccessId(result.serverSessionId)
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  const synced = record.status === 'synced' || successId != null

  return (
    <main className="flex flex-col gap-6 px-4 py-6 pb-24">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Офлайн-тренування</p>
        <h1 className="text-2xl font-bold">
          Тренування {record.templateCode} завершено
        </h1>
        <p className="text-sm text-muted-foreground">{formatDisplayDate(record.date)}</p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Запис збережено на телефоні. Коли будеш вдома в одній мережі з Mac, натисни синхронізацію —
        прогресія та історія оновляться на комп’ютері.
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {synced && successId != null ? (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-emerald-300">Синхронізовано з Mac</p>
          <Link
            href={`/workout/${successId}/summary`}
            className="touch-target inline-flex h-14 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-medium text-primary-foreground"
          >
            Відкрити підсумок на сервері
          </Link>
        </div>
      ) : (
        <Button
          type="button"
          className="touch-target h-14 w-full text-base"
          disabled={pending}
          onClick={handleSync}
        >
          {pending ? 'Синхронізація…' : 'Синхронізувати з Mac'}
        </Button>
      )}

      <Link
        href="/"
        className="touch-target inline-flex h-12 w-full items-center justify-center rounded-xl text-sm text-muted-foreground hover:text-foreground"
      >
        На головну
      </Link>
    </main>
  )
}
