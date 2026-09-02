'use client'

import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { AnimatedNumber } from '@/components/workout/animated-number'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatSetsDisplay } from '@/lib/workouts'
import type { WorkoutType } from '@/lib/cycle'

interface WorkoutSummaryProps {
  type: WorkoutType
  reps: number[]
  totalReps: number
  delta: number | null
  onDone: () => void
}

export const WorkoutSummary = ({
  type,
  reps,
  totalReps,
  delta,
  onDone,
}: WorkoutSummaryProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-6 backdrop-blur-sm"
  >
    <Card className="w-full max-w-sm border-amber-500/20">
      <CardContent className="flex flex-col items-center gap-6 pt-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-2xl font-bold text-emerald-400"
        >
          ✓
        </motion.div>

        <div>
          <p className="text-sm text-muted-foreground">Тренування {type} завершено</p>
          <p className="mt-2 text-4xl font-bold">
            <AnimatedNumber value={totalReps} />{' '}
            <span className="text-lg font-normal text-muted-foreground">reps</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{formatSetsDisplay(reps)}</p>
        </div>

        {delta !== null && delta !== 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
              delta > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {delta > 0 ? (
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
            )}
            {delta > 0 ? '+' : ''}
            {delta} до минулого {type}
          </motion.div>
        )}

        {delta === 0 && (
          <p className="text-sm text-muted-foreground">Той самий обсяг, що й минулого разу</p>
        )}

        <Button size="lg" className="w-full" onClick={onDone}>
          Готово
        </Button>
      </CardContent>
    </Card>
  </motion.div>
)
