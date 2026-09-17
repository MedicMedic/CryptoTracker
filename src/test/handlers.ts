import { http, HttpResponse } from 'msw'
import { bitcoin, ethereum } from './coins-fixtures'

const API_BASE = 'https://api.coingecko.com/api/v3'

// Default happy-path handlers. Individual tests override these with
// `server.use(...)` for the case under test, then MSW resets between tests.
export const handlers = [
  http.get(`${API_BASE}/coins/markets`, () => HttpResponse.json([bitcoin, ethereum])),
  http.get(`${API_BASE}/search`, () => HttpResponse.json({ coins: [{ id: 'bitcoin' }] })),
]
