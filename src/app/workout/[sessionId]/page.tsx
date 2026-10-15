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

  // Keyed on the session only: refreshes after each set must keep the
  // client state (current exercise) instead of remounting.
  return (
    <ActiveWorkout
      key={sessionId}
      detail={detail}
      timerSound={settings.timerSoundEnabled}
      timerVibration={settings.timerVibrationEnabled}
    />
  )
}
