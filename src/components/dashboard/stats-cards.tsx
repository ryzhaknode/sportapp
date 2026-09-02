'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorkoutType } from '@/lib/cycle'
import { WORKOUT_ACCENT, WORKOUT_TEMPLATES, formatSetsDisplay } from '@/lib/workouts'

interface StatEntry {
  type: WorkoutType
  totalReps: number | null
  sets: number[] | null
  date: string | null
}

interface StatsCardsProps {
  stats: StatEntry[]
}

export const StatsCards = ({ stats }: StatsCardsProps) => (
  <div className="grid grid-cols-3 gap-3">
    {stats.map(({ type, totalReps, sets, date }, index) => {
      const template = WORKOUT_TEMPLATES[type]
      return (
        <motion.div
          key={type}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="p-3 pb-0">
              <CardTitle className={`text-sm ${WORKOUT_ACCENT[type]}`}>
                {type}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              {totalReps !== null ? (
                <>
                  <p className="text-2xl font-bold tabular-nums">{totalReps}</p>
                  {sets && (
                    <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
                      {formatSetsDisplay(sets)}
                    </p>
                  )}
                  {date && (
                    <p className="mt-1 text-[10px] text-muted-foreground">{date}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-muted-foreground/40">—</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{template.label}</p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )
    })}
  </div>
)
