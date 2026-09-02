'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { WorkoutType } from '@/lib/cycle'
import { WORKOUT_COLORS, WORKOUT_TEMPLATES } from '@/lib/workouts'
import { formatDisplayDate } from '@/lib/utils'

interface TodayCardProps {
  date: string
  type: WorkoutType
  completed: boolean
  totalReps?: number
}

export const TodayCard = ({ date, type, completed, totalReps }: TodayCardProps) => {
  const template = WORKOUT_TEMPLATES[type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden">
        <div className={`h-1.5 ${type === 'A' ? 'bg-amber-500' : type === 'B' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
        <CardContent className="flex flex-col gap-5 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">{formatDisplayDate(date)}</p>
            <div className="mt-2 flex items-center gap-3">
              <h2 className="text-2xl font-bold">Тренування {type}</h2>
              <Badge className={WORKOUT_COLORS[type]}>{template.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {template.sets} підходи · RIR {template.rir}
            </p>
          </div>

          {completed && totalReps !== undefined && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              <span className="font-medium">Виконано · {totalReps} reps</span>
            </div>
          )}

          <Link
            href="/workout"
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-8 text-base font-medium text-background transition-all hover:opacity-90"
          >
            {completed ? 'Переглянути запис' : 'Почати тренування'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}
