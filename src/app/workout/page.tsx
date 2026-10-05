import { redirect } from 'next/navigation'
import { getInProgressSession } from '@/lib/db/workout-sessions'
import { getNextWorkoutCode } from '@/lib/program/schedule'
import { formatDateLocal } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function WorkoutIndexPage() {
  const inProgress = await getInProgressSession()
  if (inProgress) {
    redirect(`/workout/${inProgress.id}`)
  }

  const today = formatDateLocal(new Date())
  const code = getNextWorkoutCode(today)
  redirect(`/?start=${code}`)
}
