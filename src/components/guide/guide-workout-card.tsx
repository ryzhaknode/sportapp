'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { WorkoutType } from '@/lib/cycle'
import { WORKOUT_COLORS } from '@/lib/workouts'
import { getWorkoutAccent, getWorkoutDot } from '@/lib/program-guide'

interface GuideWorkoutCardProps {
  type: WorkoutType
  label: string
  description: string
  sets: number
  repRange: [number, number]
  rir: string
  rest: string
  starter: string
  starterTotal: number
  index: number
}

export const GuideWorkoutCard = ({
  type,
  label,
  description,
  sets,
  repRange,
  rir,
  rest,
  starter,
  starterTotal,
  index,
}: GuideWorkoutCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
  >
    <Card className={`overflow-hidden border ${getWorkoutAccent(type)}`}>
      <div className={`h-1 ${getWorkoutDot(type)}`} />
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center gap-2">
          <Badge className={WORKOUT_COLORS[type]}>{type}</Badge>
          <span className="font-semibold">{label}</span>
          <span className="text-sm text-muted-foreground">· {description}</span>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Підходи</dt>
            <dd className="font-medium">{sets}×{repRange[0]}–{repRange[1]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">RIR</dt>
            <dd className="font-medium">{rir}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Відпочинок</dt>
            <dd className="font-medium">{rest}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Старт (тиж. 1)</dt>
            <dd className="font-medium">{starter} = {starterTotal}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </motion.div>
)
