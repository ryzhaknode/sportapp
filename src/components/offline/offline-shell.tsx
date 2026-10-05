'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { actionGetProgramSnapshot } from '@/app/actions/offline'
import { Button } from '@/components/ui/button'
import { idbPutSnapshot } from '@/lib/offline/idb'
import {
  getLocalInProgressSession,
  listPendingSyncSessions,
} from '@/lib/offline/local-session'
import { syncLocalSessionById } from '@/lib/offline/sync-client'
import type { LocalWorkoutRecord } from '@/lib/offline/types'
import { registerServiceWorker, warmOfflineShellCache } from '@/lib/offline/cache-routes'

interface OfflineShellProps {
  children: ReactNode
}

export const OfflineShell = ({ children }: OfflineShellProps) => {
  const router = useRouter()
  const [pending, setPending] = useState<LocalWorkoutRecord[]>([])
  const [inProgress, setInProgress] = useState<LocalWorkoutRecord | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [online, setOnline] = useState(true)
  const [shellReady, setShellReady] = useState(false)

  const refreshLocalState = useCallback(async () => {
    const [queue, active] = await Promise.all([
      listPendingSyncSessions(),
      getLocalInProgressSession(),
    ])
    setPending(queue)
    setInProgress(active)
  }, [])

  const cacheSnapshot = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    try {
      const snapshot = await actionGetProgramSnapshot()
      await idbPutSnapshot(snapshot)
    } catch {
      // Mac unreachable — keep previous cache
    }
  }, [])

  const runSyncAll = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncMessage('Немає мережі до Mac')
      return
    }
    setSyncing(true)
    setSyncMessage(null)
    try {
      const queue = await listPendingSyncSessions()
      if (queue.length === 0) {
        setSyncMessage('Немає тренувань для синхронізації')
        return
      }
      let ok = 0
      const errors: string[] = []
      for (const item of queue) {
        const result = await syncLocalSessionById(item.localId)
        if (result.ok) {
          ok += 1
          if (!result.alreadySynced) {
            router.refresh()
          }
        } else {
          errors.push(`${item.templateCode} (${item.date}): ${result.message}`)
        }
      }
      if (errors.length === 0) {
        setSyncMessage(`Синхронізовано ${ok} тренувань`)
      } else {
        setSyncMessage(errors.join(' · '))
      }
    } finally {
      setSyncing(false)
      await refreshLocalState()
    }
  }, [refreshLocalState, router])

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    updateOnline()
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    void refreshLocalState()
    void cacheSnapshot()
    void registerServiceWorker().then(async () => {
      await warmOfflineShellCache()
      setShellReady(true)
    })
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void runSyncAll()
    }
  }, [cacheSnapshot, refreshLocalState, runSyncAll])

  useEffect(() => {
    const onOnline = () => {
      void cacheSnapshot()
      void runSyncAll()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [cacheSnapshot, runSyncAll])

  useEffect(() => {
    const id = setInterval(() => void refreshLocalState(), 5000)
    return () => clearInterval(id)
  }, [refreshLocalState])

  const showBanner = pending.length > 0 || !online || inProgress != null

  return (
    <>
      {online && shellReady && (
        <p className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-1.5 text-center text-xs text-emerald-300/90 backdrop-blur-md">
          Готово для залу — PWA відкривається з мобільного інternetу
        </p>
      )}
      {showBanner && (
        <div className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-2 backdrop-blur-md">
          {!online && (
            <p className="text-center text-xs text-amber-200/90">Офлайн — дані зберігаються на телефоні</p>
          )}
          {inProgress && (
            <p className="mt-1 text-center text-xs">
              <Link
                href="/workout/offline"
                className="font-medium text-emerald-300 underline-offset-2 hover:underline"
              >
                Продовжити офлайн-тренування {inProgress.templateCode}
              </Link>
            </p>
          )}
          {pending.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-center text-xs text-muted-foreground">
                {pending.length} тренувань очікують синхронізації з Mac
              </p>
              <Button
                type="button"
                size="sm"
                className="touch-target h-11 w-full"
                disabled={syncing || !online}
                onClick={() => void runSyncAll()}
              >
                {syncing ? 'Синхронізація…' : 'Синхронізувати зараз'}
              </Button>
            </div>
          )}
          {syncMessage && (
            <p className="mt-2 text-center text-xs text-muted-foreground" role="status">
              {syncMessage}
            </p>
          )}
        </div>
      )}
      {children}
    </>
  )
}
