import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

type CacheEntry = {
  data: unknown
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()
const listeners = new Set<() => void>()

const DEFAULT_TTL_MS = 30_000

export function invalidateCache(key: string) {
  cache.delete(key)
}

export function invalidateCachePrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}

export function updateCache<T>(key: string, updater: (data: T) => T) {
  const cached = cache.get(key)
  if (!cached) return
  cache.set(key, { data: updater(cached.data as T), fetchedAt: cached.fetchedAt })
  listeners.forEach((listener) => listener())
}

interface UseCachedFetchOptions {
  ttlMs?: number
}

interface UseCachedFetchResult<T> {
  data: T | undefined
  isLoading: boolean
  isRefetching: boolean
  refresh: () => void
}

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCachedFetchOptions = {},
): UseCachedFetchResult<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const [refreshKey, setRefreshKey] = useState(0)
  const [, tick] = useReducer((x: number) => x + 1, 0)
  const [failed, setFailed] = useState(false)
  const fetcherRef = useRef(fetcher)
  if (fetcherRef.current == null) {
    fetcherRef.current = fetcher
  }
  const cancelledRef = useRef(false)
  const prevRefreshKey = useRef(0)

  useEffect(() => {
    cancelledRef.current = false

    const forced = refreshKey !== prevRefreshKey.current
    prevRefreshKey.current = refreshKey

    const cached = cache.get(key)
    const fresh = cached !== undefined && Date.now() - cached.fetchedAt < ttlMs
    if (fresh && !forced) return

    const existing = inflight.get(key)
    const promise = existing ?? fetcherRef.current()
    inflight.set(key, promise)

    promise
      .then((data) => {
        cache.set(key, { data, fetchedAt: Date.now() })
      })
      .catch(() => {
        setFailed(true)
      })
      .finally(() => {
        inflight.delete(key)
        if (!cancelledRef.current) tick()
      })

    return () => {
      cancelledRef.current = true
    }
  }, [key, ttlMs, refreshKey])

  useEffect(() => {
    const listener = () => tick()
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const cached = cache.get(key)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return {
    data: cached?.data as T | undefined,
    isLoading: cached === undefined && !failed,
    isRefetching: inflight.has(key),
    refresh,
  }
}