import { useDelayedFlag } from '../hooks/useDelayedFlag'
import type { RequestState } from '../types/request-state'
import type { Coin } from '../types/coin'
import { CoinRow } from './CoinRow'
import { Spinner } from './Spinner'

interface CoinListProps {
  state: RequestState<Coin[]>
  query: string
  onRetry: () => void
  onShowMore?: () => void
}

export function CoinList({ state, query, onRetry, onShowMore }: CoinListProps) {
  const showSpinner = useDelayedFlag(state.status === 'loading')

  if (state.status === 'idle') return null
  if (state.status === 'loading') return showSpinner ? <Spinner /> : null

  if (state.status === 'error') {
    return (
      <p role="alert" className="status-message">
        {state.message} {state.retryable && <button onClick={onRetry}>Try again</button>}
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

  return (
    <div className="table-wrap">
      <table>
        <caption className="visually-hidden">
          {query ? `Coins matching "${query}"` : 'Top coins by market cap'}
        </caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Coin</th>
            <th scope="col">Price</th>
            <th scope="col">24h</th>
          </tr>
        </thead>
        <tbody>
          {state.data.map((coin) => (
            <CoinRow key={coin.id} coin={coin} />
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
