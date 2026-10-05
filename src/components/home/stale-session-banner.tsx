'use client'

import { useState } from 'react'
import { actionAbandonSession, actionResolveStaleSession } from '@/app/actions/workout-session'
import { Button } from '@/components/ui/button'

interface StaleSessionBannerProps {
  sessionId: number
}

export const StaleSessionBanner = ({ sessionId }: StaleSessionBannerProps) => {
  const [loading, setLoading] = useState(false)

  return (
    <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 p-4 text-sm">
      <p className="font-medium text-orange-200">Незавершене тренування старше 12 год</p>
      <p className="mt-1 text-muted-foreground">
        Завершити решту як «немає часу» або видалити сесію.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <Button
          type="button"
          className="touch-target h-12"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            await actionResolveStaleSession(sessionId)
          }}
        >
          Завершити автоматично
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            await actionAbandonSession(sessionId)
          }}
        >
          Видалити сесію
        </Button>
      </div>
    </div>
  )
}
