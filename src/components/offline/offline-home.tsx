'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WorkoutCodePicker } from '@/components/home/workout-code-picker'
import type { WorkoutTemplateCode } from '@/lib/db/schema'
import { getCachedSnapshot, getLocalInProgressSession } from '@/lib/offline/local-session'
import type { ProgramSnapshot } from '@/lib/offline/types'
import { getWeekNumber } from '@/lib/program/schedule'
import { getWeekContext } from '@/lib/program/week-cycle'
import { formatDateLocal } from '@/lib/utils'

export const OfflineHome = () => {
  const [snapshot, setSnapshot] = useState<ProgramSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState<WorkoutTemplateCode>('A')
  const [inProgressId, setInProgressId] = useState<string | null>(null)
  const [inProgressCode, setInProgressCode] = useState<WorkoutTemplateCode | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const [snap, active] = await Promise.all([
        getCachedSnapshot(),
        getLocalInProgressSession(),
      ])
      setSnapshot(snap)
      if (active) {
        setInProgressId(active.localId)
        setInProgressCode(active.templateCode)
        setCode(active.templateCode)
      }
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) {
    return (
      <main className="px-4 py-8 text-center text-sm text-muted-foreground">
        Завантаження…
      </main>
    )
  }

  if (!snapshot) {
    return (
      <main className="flex min-h-[60vh] flex-col justify-center gap-4 px-4 py-8">
        <h1 className="text-center text-xl font-bold">Немає кешу програми</h1>
        <p className="text-center text-sm text-muted-foreground">
          Спочатку відкрий додаток вдома в Wi‑Fi (Mac увімкнений). Потім у залі можна працювати з
          мобільного інternetу.
        </p>
        <Link
          href="/"
          className="touch-target inline-flex h-12 w-full items-center justify-center rounded-xl border border-border bg-secondary text-sm font-medium"
        >
          Спробувати знову
        </Link>
      </main>
    )
  }

  const today = formatDateLocal(new Date())
  const weekNumber = getWeekNumber(snapshot.programStartDate, today)
  const weekContext = getWeekContext(weekNumber, snapshot.tournamentWeekEnabled)

  return (
    <main className="flex flex-col gap-6 px-4 py-6 pb-24">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-amber-200/90">Режим залу (офлайн)</p>
        <h1 className="text-2xl font-bold">Gym ABC</h1>
        <p className="text-sm text-muted-foreground">
          Тиждень {weekNumber} · {weekContext.mode}
        </p>
      </header>

      {inProgressId && inProgressCode && (
        <Link
          href="/workout/offline"
          className="touch-target flex h-14 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-base font-medium text-emerald-200"
        >
          Продовжити тренування {inProgressCode}
        </Link>
      )}

      {!inProgressId && (
        <>
          <WorkoutCodePicker
            value={code}
            onChange={setCode}
            scheduledToday={null}
            completedToday={{ A: false, B: false, C: false }}
          />
          <Link
            href={`/workout/offline/weigh-in?code=${code}`}
            className="touch-target flex h-14 items-center justify-center rounded-2xl bg-primary text-base font-medium text-primary-foreground"
          >
            Почати тренування {code}
          </Link>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {isOnline
          ? 'Є мережа — після тренування синхронізуй з Mac.'
          : 'Без Mac — записи зберігаються на телефоні.'}
      </p>

      {isOnline && (
        <Link href="/" className="text-center text-sm text-muted-foreground underline-offset-2 hover:underline">
          Повна головна (онлайн)
        </Link>
      )}
    </main>
  )
}
