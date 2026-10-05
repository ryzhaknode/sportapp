import Link from 'next/link'
import type { WorkoutTemplateCode } from '@/lib/db/schema'

interface StartWorkoutFormProps {
  code: WorkoutTemplateCode
  children: React.ReactNode
}

export const StartWorkoutForm = ({ code, children }: StartWorkoutFormProps) => {
  return (
    <Link href={`/workout/weigh-in/${code}`} className="block">
      {children}
    </Link>
  )
}
