import { notFound, redirect } from 'next/navigation'
import { ActiveWorkout } from '@/components/workout/active-workout'
import { getSettings } from '@/lib/db/settings'
import { loadSessionDetail } from '@/lib/db/workout-sessions'

export const dynamic = 'force-dynamic'

export default async function WorkoutSessionPage({ params }: PageProps<'/workout/[sessionId]'>) {
  const { sessionId: sessionIdStr } = await params
  const sessionId = Number(sessionIdStr)
  if (!Number.isFinite(sessionId)) notFound()

  const detail = await loadSessionDetail(sessionId)
  if (!detail) notFound()

  if (detail.session.status === 'completed') {
    redirect(`/workout/${sessionId}/summary`)
  }

  if (detail.session.status === 'abandoned') {
    redirect('/')
  }

  const settings = await getSettings()

  const syncKey = detail.exercises
    .flatMap((e) => e.sets.map((s) => `${s.id}:${s.status}`))
    .join(',')

  return (
    <ActiveWorkout
      key={`${sessionId}-${syncKey}`}
      detail={detail}
      timerSound={settings.timerSoundEnabled}
      timerVibration={settings.timerVibrationEnabled}
    />
  )
}
