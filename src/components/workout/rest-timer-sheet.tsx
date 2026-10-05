'use client'

import { useCallback, useEffect, useState } from 'react'
import { actionAdjustRestTimer, actionClearRestTimer } from '@/app/actions/workout-session'
import { Button } from '@/components/ui/button'
import { formatDuration } from '@/lib/utils'
import { playTimerEndSound, vibratePattern } from '@/lib/timer-feedback'

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
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)

  const endsAt = restTimer?.endsAt ?? null
  const visible = endsAt != null

  useEffect(() => {
    if (!visible) return
    document.body.setAttribute('data-overlay-open', 'true')
    return () => document.body.removeAttribute('data-overlay-open')
  }, [visible])

  useEffect(() => {
    if (!endsAt) {
      setRemaining(0)
      return
    }

    const endMs = new Date(endsAt).getTime()
    const startTotal = Math.max(1, Math.ceil((endMs - Date.now()) / 1000))
    setTotal(startTotal)

    let warned10 = false

    const tick = () => {
      const sec = Math.max(0, Math.ceil((endMs - Date.now()) / 1000))
      setRemaining(sec)

      if (sec === 10 && !warned10) {
        warned10 = true
        if (vibrationEnabled) vibratePattern([80])
      }

      if (sec === 0) {
        if (vibrationEnabled) vibratePattern([200, 100, 200])
        if (soundEnabled) playTimerEndSound()
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Відпочинок завершено', {
            body: nextLabel ?? 'Наступний підхід',
          })
        }
      }
    }

    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt, nextLabel, soundEnabled, vibrationEnabled])

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

  if (!endsAt || remaining <= 0) return null

  const progress = total > 0 ? 1 - remaining / total : 0

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
