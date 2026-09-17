import { useState } from 'react'
import './App.css'
import { CoinList } from './components/CoinList'
import { SearchBox } from './components/SearchBox'
import { useCoins } from './hooks/useCoins'

function App() {
  const [query, setQuery] = useState('')
  const { state, retry } = useCoins(query)

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
        <CoinList state={state} query={query} onRetry={retry} />
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
