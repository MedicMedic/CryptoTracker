import { requestWithRetry } from './api'
import { isCoin, type Coin } from '../types/coin'

const API_BASE = import.meta.env.VITE_COINGECKO_API_BASE ?? 'https://api.coingecko.com/api/v3'

interface SearchResponse {
  coins: { id: string }[]
}

// Resolves the default top-N-by-market-cap view when `query` is empty
// (`perPage` controls N), otherwise resolves matching coins by name/symbol
// via the search endpoint first, since /coins/markets itself has no
// text-search parameter — `perPage` doesn't apply to a search result set.
export async function fetchCoins(query: string, signal: AbortSignal, perPage = 50): Promise<Coin[]> {
  const trimmed = query.trim()
  const ids = trimmed ? await searchIds(trimmed, signal) : null

  if (ids && ids.length === 0) return []

  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: ids ? String(ids.length) : String(perPage),
    page: '1',
    sparkline: 'false',
  })
  if (ids) params.set('ids', ids.join(','))

  const data = await requestWithRetry<unknown[]>(`${API_BASE}/coins/markets?${params}`, { signal })
  return data.filter(isCoin)
}

async function searchIds(query: string, signal: AbortSignal): Promise<string[]> {
  const data = await requestWithRetry<SearchResponse>(
    `${API_BASE}/search?query=${encodeURIComponent(query)}`,
    { signal },
  )
  return data.coins.slice(0, 12).map((c) => c.id)
}
