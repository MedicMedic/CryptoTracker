import { useState } from 'react'
import { useDelayedFlag } from '../hooks/useDelayedFlag'
import type { RequestState } from '../types/request-state'
import type { Coin } from '../types/coin'
import { CoinRow } from './CoinRow'
import { Spinner } from './Spinner'
import { SortableHeader, type SortDir, type SortKey } from './SortableHeader'

interface CoinListProps {
  state: RequestState<Coin[]>
  query: string
  onRetry: () => void
  onShowMore?: () => void
  onSelectCoin: (coin: Coin) => void
}

function sortCoins(coins: Coin[], key: SortKey, dir: SortDir): Coin[] {
  const value = (c: Coin) => (key === 'price' ? c.current_price : (c.price_change_percentage_24h ?? -Infinity))
  return [...coins].sort((a, b) => (dir === 'asc' ? value(a) - value(b) : value(b) - value(a)))
}

export function CoinList({ state, query, onRetry, onShowMore, onSelectCoin }: CoinListProps) {
  const showSpinner = useDelayedFlag(state.status === 'loading')
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null)

  function toggleSort(key: SortKey) {
    setSort((prev) => (!prev || prev.key !== key ? { key, dir: 'desc' } : { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' }))
  }

  if (state.status === 'idle') return null
  if (state.status === 'loading') return showSpinner ? <Spinner /> : null

  if (state.status === 'error') {
    return (
      <p role="alert" className="status-message">
        {state.message}{' '}
        {state.retryable ? (
          <button onClick={onRetry}>Try again</button>
        ) : (
          <span className="status-note">Retrying won't fix this.</span>
        )}
      </p>
    )
  }

  // Success with zero results is its own fact, distinct for a search with
  // no matches vs. the default list coming back empty (e.g. the API is down
  // but still answering 200s with nothing in them).
  if (state.data.length === 0) {
    return (
      <p className="status-message">
        {query ? `No coins match "${query}".` : 'No market data available right now.'}
      </p>
    )
  }

  // Rank reflects each coin's position in the canonical (fetched) order and
  // stays pinned to that coin — re-sorting by price/24h reorders the rows
  // but never renumbers them, so a coin sorted to the bottom still shows
  // its real rank instead of picking up a new one from its row position.
  const rankById = new Map(state.data.map((coin, i) => [coin.id, i + 1]))
  const rows = sort ? sortCoins(state.data, sort.key, sort.dir) : state.data

  return (
    <div className="table-wrap">
      <table>
        <caption className="visually-hidden">
          {query ? `Coins matching "${query}"` : 'Top coins by market cap'}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="rank-header">
              Rank
            </th>
            <th scope="col">Coin</th>
            <SortableHeader
              label="Price"
              sortKey="price"
              active={sort?.key ?? null}
              dir={sort?.key === 'price' ? sort.dir : 'desc'}
              onSort={toggleSort}
            />
            <SortableHeader
              label="24h"
              sortKey="change"
              active={sort?.key ?? null}
              dir={sort?.key === 'change' ? sort.dir : 'desc'}
              onSort={toggleSort}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((coin) => (
            <CoinRow key={coin.id} coin={coin} rank={rankById.get(coin.id) ?? 0} onSelect={onSelectCoin} />
          ))}
        </tbody>
      </table>
      {onShowMore && (
        <button className="show-more" onClick={onShowMore}>
          Show more
        </button>
      )}
    </div>
  )
}
