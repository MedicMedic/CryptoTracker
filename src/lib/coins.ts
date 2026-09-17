import { requestWithRetry } from './api'
import { isCoin, type Coin } from '../types/coin'

const API_BASE = import.meta.env.VITE_COINGECKO_API_BASE ?? 'https://api.coingecko.com/api/v3'

interface SearchResponse {
  coins: { id: string }[]
}

// CoinGecko rejects per_page above this on /coins/markets — it's a
// per-request limit, not the size of their coin list (17,000+), so going
// past `count` coins means paging through multiple requests and
// concatenating, not just asking for a bigger page.
const MAX_REQUEST_PAGE_SIZE = 250

// Resolves the default top-N-by-market-cap view when `query` is empty
// (`count` controls N), otherwise resolves matching coins by name/symbol
// via the search endpoint first, since /coins/markets itself has no
// text-search parameter — `count` doesn't apply to a search result set.
export async function fetchCoins(query: string, signal: AbortSignal, count = 50): Promise<Coin[]> {
  const trimmed = query.trim()
  const ids = trimmed ? await searchIds(trimmed, signal) : null

  if (ids && ids.length === 0) return []
  if (ids) return (await fetchMarketsPage(ids, ids.length, 1, signal)).sort(byRankThenPrice)

  // CoinGecko's `page` means "skip (page-1) * per_page" — per_page has to
  // stay the same across every request in this loop, or that skip math
  // points at the wrong rows. Trim down to `count` only at the very end.
  const pageSize = Math.min(MAX_REQUEST_PAGE_SIZE, count)
  const coins: Coin[] = []
  for (let page = 1; coins.length < count; page++) {
    const batch = await fetchMarketsPage(null, pageSize, page, signal)
    coins.push(...batch)
    if (batch.length < pageSize) break // fewer than asked for — that's every coin CoinGecko has
  }
  return coins.slice(0, count).sort(byRankThenPrice)
}

async function fetchMarketsPage(
  ids: string[] | null,
  pageSize: number,
  page: number,
  signal: AbortSignal,
): Promise<Coin[]> {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: String(pageSize),
    page: String(page),
    sparkline: 'false',
  })
  if (ids) params.set('ids', ids.join(','))

  const data = await requestWithRetry<unknown[]>(`${API_BASE}/coins/markets?${params}`, { signal })
  return data.filter(isCoin)
}

// CoinGecko's own market_cap_rank occasionally ties two coins at the same
// number (a newly-listed asset the rank field hasn't caught up to yet) —
// break the tie by price, descending, so the order stays deterministic.
function byRankThenPrice(a: Coin, b: Coin): number {
  const rankA = a.market_cap_rank ?? Infinity
  const rankB = b.market_cap_rank ?? Infinity
  if (rankA !== rankB) return rankA - rankB
  return b.current_price - a.current_price
}

async function searchIds(query: string, signal: AbortSignal): Promise<string[]> {
  const data = await requestWithRetry<SearchResponse>(
    `${API_BASE}/search?query=${encodeURIComponent(query)}`,
    { signal },
  )
  return data.coins.slice(0, 12).map((c) => c.id)
}
