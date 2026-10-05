'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActiveWorkoutLocal } from '@/components/workout/active-workout-local'
import { getCachedSnapshot, getLocalWorkout } from '@/lib/offline/local-session'
import type { LocalWorkoutRecord } from '@/lib/offline/types'

export default function LocalWorkoutPage({ params }: PageProps<'/workout/local/[localId]'>) {
  const router = useRouter()
  const [localId, setLocalId] = useState<string | null>(null)
  const [record, setRecord] = useState<LocalWorkoutRecord | null>(null)
  const [timerSound, setTimerSound] = useState(true)
  const [timerVibration, setTimerVibration] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void params.then((p) => setLocalId(p.localId))
  }, [params])

  useEffect(() => {
    if (!localId) return
    const load = async () => {
      const [workout, snapshot] = await Promise.all([
        getLocalWorkout(localId),
        getCachedSnapshot(),
      ])
      if (!workout) {
        router.replace('/')
        return
      }
      if (workout.status === 'completed' || workout.status === 'synced') {
        router.replace(`/workout/local/${localId}/summary`)
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
  }, [localId, router])

  if (loading || !localId || !record) {
    return (
      <main className="px-4 py-8 text-center text-sm text-muted-foreground">
        Завантаження офлайн-тренування…
      </main>
    )
  }

  return (
    <ActiveWorkoutLocal
      localId={localId}
      initialRecord={record}
      timerSound={timerSound}
      timerVibration={timerVibration}
    />
  )
}
