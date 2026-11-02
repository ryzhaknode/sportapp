import { redirect } from 'next/navigation'
import { getSettings } from '@/lib/db/settings'
import { getCycleState, getInProgressSession } from '@/lib/db/workout-sessions'
import { getNextWorkoutCode } from '@/lib/program/schedule'

export const dynamic = 'force-dynamic'

export default async function WorkoutIndexPage() {
  const inProgress = await getInProgressSession()
  if (inProgress) {
    redirect(`/workout/${inProgress.id}`)
  }

  const { programStartDate } = await getSettings()
  const code = getNextWorkoutCode((await getCycleState(programStartDate)).lastCode)
  redirect(`/?start=${code}`)
}
