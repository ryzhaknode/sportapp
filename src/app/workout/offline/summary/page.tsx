'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LocalWorkoutSummary } from '@/components/offline/local-workout-summary'
import { listLocalWorkouts } from '@/lib/offline/local-session'
import type { LocalWorkoutRecord } from '@/lib/offline/types'

export default function OfflineWorkoutSummaryPage() {
  const [record, setRecord] = useState<LocalWorkoutRecord | null>(null)

  useEffect(() => {
    const load = async () => {
      const all = await listLocalWorkouts()
      const latest = all
        .filter((s) => s.status === 'completed' || s.status === 'synced')
        .sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? ''))[0]
      if (!latest) {
        window.location.assign('/offline')
        return
      }
      setRecord(latest)
    }
    void load()
  }, [])

  if (!record) {
    return (
      <main className="px-4 py-8 text-center text-sm text-muted-foreground">
        Завантаження…
      </main>
    )
  }

  return (
    <>
      <LocalWorkoutSummary record={record} />
      <p className="pb-24 text-center">
        <Link href="/offline" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
          До режиму залу
        </Link>
      </p>
    </>
  )
}
