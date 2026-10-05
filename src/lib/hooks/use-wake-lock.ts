'use client'

import { useEffect } from 'react'

export const useWakeLock = (enabled: boolean): void => {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return
    }

    let lock: WakeLockSentinel | null = null

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // ignored — unsupported or low battery
      }
    }

    void acquire()

    return () => {
      void lock?.release()
    }
  }, [enabled])
}
