import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchCommsHubDashboard,
  type CommsHubDashboardDto,
  type DashboardFilters,
} from '../api/commsHubDashboardClient'

const CACHE_MS = 30_000
const DEBOUNCE_MS = 300

function useDebouncedFilters(filters: DashboardFilters): DashboardFilters {
  const [debounced, setDebounced] = useState(filters)
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      setDebounced(filters)
      return
    }
    const id = setTimeout(() => setDebounced(filters), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [filters.period, filters.jobOpeningId])

  return debounced
}

function filtersKey(f: DashboardFilters): string {
  return `${f.period}|${f.jobOpeningId ?? ''}`
}

export function useDashboardAnalytics(filters: DashboardFilters): {
  data: CommsHubDashboardDto | null
  isLoading: boolean
  error: string | null
  refetch: () => void
} {
  const debounced = useDebouncedFilters(filters)
  const [data, setData] = useState<CommsHubDashboardDto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<{
    key: string
    data: CommsHubDashboardDto
    at: number
  } | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    const key = filtersKey(debounced)
    const now = Date.now()
    const cached = cacheRef.current
    if (cached && cached.key === key && now - cached.at < CACHE_MS) {
      setData(cached.data)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    void (async () => {
      try {
        const result = await fetchCommsHubDashboard(debounced)
        if (cancelled) return
        cacheRef.current = { key, data: result, at: Date.now() }
        setData(result)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setData(null)
        setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debounced, reloadTick])

  const refetch = useCallback(() => {
    cacheRef.current = null
    setReloadTick((t) => t + 1)
  }, [])

  return useMemo(
    () => ({ data, isLoading, error, refetch }),
    [data, isLoading, error, refetch],
  )
}
