'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, Plus, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/utils'

interface RestTimerProps {
  durationSeconds: number
  onComplete: () => void
  onSkip: () => void
}

const playCompletionSound = () => {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)

    setTimeout(() => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.value = 1175
      gain2.gain.setValueAtTime(0.25, ctx.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start()
      osc2.stop(ctx.currentTime + 0.5)
    }, 200)
  } catch {
    // Audio may be blocked until user interaction
  }
}

export const RestTimer = ({ durationSeconds, onComplete, onSkip }: RestTimerProps) => {
  const [remaining, setRemaining] = useState(durationSeconds)
  const [paused, setPaused] = useState(false)
  const completedRef = useRef(false)

  const handleComplete = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    playCompletionSound()
    onComplete()
  }, [onComplete])

  useEffect(() => {
    completedRef.current = false
  }, [durationSeconds])

  useEffect(() => {
    if (paused || remaining <= 0) return

    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id)
          handleComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(id)
  }, [paused, remaining, handleComplete])

  const progress = 1 - remaining / durationSeconds

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex w-full max-w-sm flex-col items-center gap-8 px-6"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Відпочинок
          </p>

          <div className="relative flex h-48 w-48 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-secondary"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-amber-400"
                strokeDasharray={2 * Math.PI * 44}
                animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - progress) }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </svg>
            <motion.span
              key={remaining}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-5xl font-bold tabular-nums"
              aria-live="polite"
            >
              {formatDuration(remaining)}
            </motion.span>
          </div>

          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? 'Продовжити таймер' : 'Пауза'}
            >
              {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
              {paused ? 'Продовжити' : 'Пауза'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setRemaining((r) => r + 30)}
              aria-label="Додати 30 секунд"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              30с
            </Button>
            <Button variant="secondary" onClick={onSkip} aria-label="Пропустити відпочинок">
              <SkipForward className="h-4 w-4" aria-hidden="true" />
              Далі
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
