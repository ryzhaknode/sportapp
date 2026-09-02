'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Moon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDisplayDate } from '@/lib/utils'

interface RestDayViewProps {
  date: string
  nextWorkoutDate: string
  nextWorkoutType: string
}

export const RestDayView = ({ date, nextWorkoutDate, nextWorkoutType }: RestDayViewProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="overflow-hidden border-border/60">
      <div className="breathing-gradient h-32" />
      <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
          <Moon className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{formatDisplayDate(date)}</p>
          <h2 className="mt-1 text-2xl font-bold">День відновлення</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Відпочинок — частина прогресії. Наступне тренування{' '}
            <span className="font-medium text-foreground">{nextWorkoutType}</span>{' '}
            {nextWorkoutDate !== date && `· ${nextWorkoutDate}`}
          </p>
        </div>

        <Link
          href="/workout?skipRest=1"
          className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 text-base font-medium text-background transition-all hover:opacity-90"
        >
          Пропустити відпочинок і тренуватись
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="text-xs text-muted-foreground">
          Цикл A/B/C зміститься на 1 день вперед
        </p>
      </CardContent>
    </Card>
  </motion.div>
)
