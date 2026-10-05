export const OFFLINE_WARMUP_URLS = [
  '/',
  '/offline',
  '/workout/offline',
  '/workout/offline/summary',
  '/workout/offline/weigh-in?code=A',
  '/workout/offline/weigh-in?code=B',
  '/workout/offline/weigh-in?code=C',
] as const

export const warmOfflineShellCache = async (): Promise<void> => {
  if (typeof window === 'undefined' || !navigator.onLine) return

  await Promise.allSettled(
    OFFLINE_WARMUP_URLS.map((path) =>
      fetch(path, { credentials: 'same-origin', cache: 'no-store' }),
    ),
  )
}

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
    await reg.update()
    return reg
  } catch {
    return null
  }
}
