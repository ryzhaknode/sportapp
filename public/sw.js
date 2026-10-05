/* eslint-disable no-restricted-globals */
const VERSION = 'gym-abc-v2'
const SHELL_CACHE = `${VERSION}-shell`
const STATIC_CACHE = `${VERSION}-static`

const PRECACHE_URLS = [
  '/offline',
  '/workout/offline',
  '/workout/offline/summary',
  '/workout/offline/weigh-in?code=A',
  '/workout/offline/weigh-in?code=B',
  '/workout/offline/weigh-in?code=C',
  '/manifest.webmanifest',
  '/icons/icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

const isSameOrigin = (url) => url.origin === self.location.origin

const isStaticAsset = (pathname) =>
  pathname.startsWith('/_next/static/') ||
  pathname.startsWith('/icons/') ||
  pathname === '/manifest.webmanifest'

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (!isSameOrigin(url)) return

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request))
    return
  }

  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  }
})

const cacheFirst = async (request, cacheName) => {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return cached ?? Response.error()
  }
}

const networkFirstShell = async (request) => {
  const cache = await caches.open(SHELL_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached

    const offlineFallback =
      (await cache.match('/offline')) ??
      (await cache.match('/workout/offline')) ??
      (await cache.match('/'))

    if (offlineFallback) return offlineFallback

    return new Response('Офлайн — спочатку відкрий додаток вдома в Wi‑Fi.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
