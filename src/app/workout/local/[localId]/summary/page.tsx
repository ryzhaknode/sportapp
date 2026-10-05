'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LocalWorkoutSummary } from '@/components/offline/local-workout-summary'
import { getLocalWorkout } from '@/lib/offline/local-session'
import type { LocalWorkoutRecord } from '@/lib/offline/types'

export default function LocalWorkoutSummaryPage({
  params,
}: PageProps<'/workout/local/[localId]/summary'>) {
  const router = useRouter()
  const [localId, setLocalId] = useState<string | null>(null)
  const [record, setRecord] = useState<LocalWorkoutRecord | null>(null)

  useEffect(() => {
    void params.then((p) => setLocalId(p.localId))
  }, [params])

  useEffect(() => {
    if (!localId) return
    void getLocalWorkout(localId).then((r) => {
      if (!r) {
        router.replace('/')
        return
      }
      if (r.status === 'in_progress') {
        router.replace(`/workout/local/${localId}`)
        return
      }
      setRecord(r)
    })
  }, [localId, router])

  if (!record) {
    return (
      <main className="px-4 py-8 text-center text-sm text-muted-foreground">
        Завантаження…
      </main>
    )
  }

  return <LocalWorkoutSummary record={record} />
}
