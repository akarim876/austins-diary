/**
 * Austin's Diary — Service Worker
 *
 * Strategy:
 *  - App shell (HTML, JS, CSS, fonts, images) → stale-while-revalidate
 *    so the UI loads instantly from cache while updates arrive in background.
 *  - Navigation requests → network-first, fall back to cached index.html
 *    so SPA routing works offline (shows the UI shell even without data).
 *  - Supabase API / storage → always network-only; real data must be live.
 *  - Google Fonts → cache-first with long TTL (fonts rarely change).
 *
 * Cache versioning: bump SHELL_VERSION when deploying breaking layout changes
 * so users get a fresh cache on next visit.
 */

const SHELL_VERSION  = 'v1'
const SHELL_CACHE    = `austins-diary-shell-${SHELL_VERSION}`
const FONTS_CACHE    = 'austins-diary-fonts-v1'

// Supabase hostnames to always bypass caching
const BYPASS_HOSTS = ['supabase.co', 'supabase.io', 'supabase.in']

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
      ])
    )
  )
  // Take control immediately — don't wait for old SW to die
  self.skipWaiting()
})

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, FONTS_CACHE])
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.has(key))
          .map((key) => caches.delete(key))
      )
    )
  )
  // Claim all open tabs so they use this SW without reload
  self.clients.claim()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isBypassHost(url) {
  return BYPASS_HOSTS.some((host) => url.hostname.includes(host))
}

function isGoogleFont(url) {
  return (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  )
}

function isStaticAsset(url) {
  // Vite outputs content-hashed JS/CSS; anything under /assets/ is safe to cache
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons') ||
      url.pathname.match(/\.(png|svg|ico|webp|woff2?|ttf)$/))
  )
}

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 1. Never intercept Supabase traffic
  if (isBypassHost(url)) return

  // 2. Google Fonts — cache-first (fonts are immutable once loaded)
  if (isGoogleFont(url)) {
    event.respondWith(
      caches.open(FONTS_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  // 3. SPA navigation — network-first, fall back to cached index.html shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((cached) => cached ?? new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  // 4. Vite static assets (/assets/*, icons, images) — stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        // Kick off background revalidation
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone())
            return response
          })
          .catch(() => cached)
        // Return cached copy immediately; background fetch updates it for next visit
        return cached ?? fetchPromise
      })
    )
    return
  }

  // 5. Everything else — network only (no caching)
})
