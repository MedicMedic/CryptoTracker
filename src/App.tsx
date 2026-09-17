import { useState } from 'react'
import './App.css'
import { CoinList } from './components/CoinList'
import { SearchBox } from './components/SearchBox'
import { useCoins } from './hooks/useCoins'

const PAGE_SIZE = 50
const MAX_PER_PAGE = 150

function App() {
  const [query, setQuery] = useState('')
  const [perPage, setPerPage] = useState(PAGE_SIZE)
  const { state, retry } = useCoins(query, perPage)

  // Only the default (unsearched) view is paginated — a search already
  // returns every match CoinGecko's /search endpoint has for that query.
  const canShowMore =
    !query.trim() && state.status === 'success' && state.data.length >= perPage && perPage < MAX_PER_PAGE

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
        <CoinList
          state={state}
          query={query}
          onRetry={retry}
          onShowMore={canShowMore ? () => setPerPage((n) => Math.min(n + PAGE_SIZE, MAX_PER_PAGE)) : undefined}
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
    </>
  )
}

export default App
