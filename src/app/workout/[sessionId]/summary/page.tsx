import { notFound } from 'next/navigation'
import { WorkoutSummaryView } from '@/components/workout/workout-summary-view'
import { loadSessionDetail } from '@/lib/db/workout-sessions'
import { buildWorkoutSummary } from '@/lib/workout-summary-data'

export const dynamic = 'force-dynamic'

export default async function WorkoutSummaryPage({
  params,
}: PageProps<'/workout/[sessionId]/summary'>) {
  const { sessionId: sessionIdStr } = await params
  const sessionId = Number(sessionIdStr)
  if (!Number.isFinite(sessionId)) notFound()

  const detail = await loadSessionDetail(sessionId)
  if (!detail || detail.session.status !== 'completed') notFound()

  const summary = await buildWorkoutSummary(sessionId)
  if (!summary) notFound()

  return (
    <WorkoutSummaryView
      sessionId={sessionId}
      summary={summary}
      initialNote={detail.session.note}
    />
  )
}
