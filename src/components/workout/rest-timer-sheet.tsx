'use client'

import { useCallback, useEffect, useEffectEvent, useState } from 'react'
import { actionAdjustRestTimer, actionClearRestTimer } from '@/app/actions/workout-session'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/utils'
import { playTimerEndSound, vibratePattern } from '@/lib/timer-feedback'
import { createRestCountdown } from '@/lib/rest-countdown'

interface RestTimerSheetProps {
  sessionId?: number
  restTimer: { endsAt: string; label: string | null } | null
  nextLabel: string | null
  soundEnabled: boolean
  vibrationEnabled: boolean
  onDismiss: () => void
  onClear?: () => void | Promise<void>
  onAdjust?: (deltaSec: number) => void | Promise<void>
}

export const RestTimerSheet = ({
  sessionId,
  restTimer,
  nextLabel,
  soundEnabled,
  vibrationEnabled,
  onDismiss,
  onClear,
  onAdjust,
}: RestTimerSheetProps) => {
  const [view, setView] = useState<{ endsAt: string; remaining: number; total: number } | null>(
    null,
  )

  const endsAt = restTimer?.endsAt ?? null
  const visible = endsAt != null

  useEffect(() => {
    if (!visible) return
    document.body.setAttribute('data-overlay-open', 'true')
    return () => document.body.removeAttribute('data-overlay-open')
  }, [visible])

  const onWarn = useEffectEvent(() => {
    if (vibrationEnabled) vibratePattern([80])
  })

  const onEnd = useEffectEvent(() => {
    if (vibrationEnabled) vibratePattern([200, 100, 200])
    if (soundEnabled) playTimerEndSound()
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Відпочинок завершено', {
        body: nextLabel ?? 'Наступний підхід',
      })
    }
  })

  useEffect(() => {
    if (!endsAt) return

    const countdown = createRestCountdown(new Date(endsAt).getTime(), Date.now(), {
      onWarn: () => onWarn(),
      onEnd: () => onEnd(),
    })

    let id: ReturnType<typeof setInterval> | undefined
    const tick = () => {
      const remaining = countdown.tick(Date.now())
      setView({ endsAt, remaining, total: countdown.total })
      if (remaining === 0) clearInterval(id)
      return remaining
    }

    if (tick() > 0) id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt])

  const handleSkip = useCallback(async () => {
    if (onClear) {
      await onClear()
    } else if (sessionId != null) {
      await actionClearRestTimer(sessionId)
    }
    onDismiss()
  }, [sessionId, onClear, onDismiss])

  const handleAdjust = async (delta: number) => {
    if (onAdjust) {
      await onAdjust(delta)
    } else if (sessionId != null) {
      await actionAdjustRestTimer(sessionId, delta)
    }
    onDismiss()
  }

  const remaining = view && view.endsAt === endsAt ? view.remaining : 0
  if (!endsAt || !view || remaining <= 0) return null

  const progress = 1 - remaining / view.total

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-2xl border border-border bg-card/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-md">
      <p className="text-center text-sm text-muted-foreground">Відпочинок</p>
      <p className="text-center text-4xl font-bold tabular-nums">{formatDuration(remaining)}</p>
      <div className="mx-auto mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-amber-500 transition-all duration-300"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
      {nextLabel && (
        <p className="mt-2 text-center text-xs text-muted-foreground">Далі: {nextLabel}</p>
      )}
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="touch-target flex-1"
          onClick={() => handleAdjust(-15)}
        >
          −15 с
        </Button>
        <Button type="button" variant="secondary" className="touch-target flex-1" onClick={handleSkip}>
          Пропустити
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="touch-target flex-1"
          onClick={() => handleAdjust(15)}
        >
          +15 с
        </Button>
      </div>
    </div>
  )
}
