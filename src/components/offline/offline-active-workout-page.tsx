'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ActiveWorkoutLocal } from '@/components/workout/active-workout-local'
import {
  getCachedSnapshot,
  getLocalInProgressSession,
} from '@/lib/offline/local-session'
import type { LocalWorkoutRecord } from '@/lib/offline/types'

export const OfflineActiveWorkoutPage = () => {
  const [record, setRecord] = useState<LocalWorkoutRecord | null>(null)
  const [timerSound, setTimerSound] = useState(true)
  const [timerVibration, setTimerVibration] = useState(true)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [workout, snapshot] = await Promise.all([
        getLocalInProgressSession(),
        getCachedSnapshot(),
      ])
      if (!workout) {
        setMissing(true)
        setLoading(false)
        return
      }
      if (workout.status === 'completed' || workout.status === 'synced') {
        window.location.assign('/workout/offline/summary')
        return
      }
      setRecord(workout)
      if (snapshot) {
        setTimerSound(snapshot.timerSoundEnabled)
        setTimerVibration(snapshot.timerVibrationEnabled)
      }
      setLoading(false)
    }
    void load()
  }, [])

  if (loading) {
    return (
      <main className="px-4 py-8 text-center text-sm text-muted-foreground">
        Завантаження офлайн-тренування…
      </main>
    )
  }

  if (missing || !record) {
    return (
      <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 py-8">
        <p className="text-center text-sm text-muted-foreground">Немає активного офлайн-тренування</p>
        <Link href="/offline" className="text-emerald-300 underline-offset-2 hover:underline">
          Обрати тренування
        </Link>
      </main>
    )
  }

  return (
    <ActiveWorkoutLocal
      localId={record.localId}
      initialRecord={record}
      timerSound={timerSound}
      timerVibration={timerVibration}
      summaryPath="/workout/offline/summary"
    />
  )
}
