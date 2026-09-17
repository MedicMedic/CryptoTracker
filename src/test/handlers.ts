import { http, HttpResponse } from 'msw'
import { bitcoin, ethereum } from './coins-fixtures'

const API_BASE = 'https://api.coingecko.com/api/v3'

// Default happy-path handlers. Individual tests override these with
// `server.use(...)` for the case under test, then MSW resets between tests.
function hourlyPrices(hours: number, startPrice: number) {
  const now = Date.now()
  return Array.from({ length: hours }, (_, i) => [
    now - (hours - 1 - i) * 3_600_000,
    startPrice + i * (startPrice * 0.001),
  ])
}

export const handlers = [
  http.get(`${API_BASE}/coins/markets`, () => HttpResponse.json([bitcoin, ethereum])),
  http.get(`${API_BASE}/search`, () => HttpResponse.json({ coins: [{ id: 'bitcoin' }] })),
  http.get(`${API_BASE}/coins/:id/market_chart`, ({ params }) => {
    const startPrice = params.id === 'ethereum' ? ethereum.current_price : bitcoin.current_price
    return HttpResponse.json({ prices: hourlyPrices(48, startPrice) })
  }),
]
