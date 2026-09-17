import { useState } from 'react'
import './App.css'
import { CoinDetailModal } from './components/CoinDetailModal'
import { CoinList } from './components/CoinList'
import { RefreshBar } from './components/RefreshBar'
import { SearchBox } from './components/SearchBox'
import { useCoins } from './hooks/useCoins'
import type { Coin } from './types/coin'

const PAGE_SIZE = 50

function App() {
  const [query, setQuery] = useState('')
  const [count, setCount] = useState(PAGE_SIZE)
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null)
  const { state, retry, lastUpdatedAt } = useCoins(query, count)

  // Only the default (unsearched) view is paginated — a search already
  // returns every match CoinGecko's /search endpoint has for that query.
  // fetchCoins pages through CoinGecko internally (250 per request) and
  // returns fewer than `count` only once it's exhausted their coin list,
  // so there's no separate cap to track here.
  const canShowMore = !query.trim() && state.status === 'success' && state.data.length >= count

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header>
        <h1>CryptoTracker</h1>
        <p className="tagline">Live prices for the top cryptocurrencies.</p>
      </header>
      <main id="main" tabIndex={-1}>
        <SearchBox value={query} onChange={setQuery} />
        <RefreshBar lastUpdatedAt={lastUpdatedAt} onRefresh={retry} />
        <CoinList
          state={state}
          query={query}
          onRetry={retry}
          onShowMore={canShowMore ? () => setCount((n) => n + PAGE_SIZE) : undefined}
          onSelectCoin={setSelectedCoin}
        />
      </main>
      <footer>
        <p>
          Data from{' '}
          <a href="https://www.coingecko.com/en/api" target="_blank" rel="noreferrer">
            CoinGecko
          </a>
          . Not financial advice.
        </p>
      </footer>
      {selectedCoin && <CoinDetailModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />}
    </>
  )
}

export default App
