import { http, HttpResponse } from 'msw'
import { describe, expect, test } from 'vitest'
import { fetchCoins } from './coins'
import { server } from '../test/server'

const API_BASE = 'https://api.coingecko.com/api/v3'

function coinAt(rank: number) {
  return {
    id: `coin-${rank}`,
    symbol: `c${rank}`,
    name: `Coin ${rank}`,
    image: '',
    current_price: 10000 - rank,
    market_cap_rank: rank,
    price_change_percentage_24h: 0,
  }
}

describe('fetchCoins', () => {
  test('pages through multiple requests once count exceeds 250', async () => {
    const pool = Array.from({ length: 300 }, (_, i) => coinAt(i + 1))
    const requestedPages: string[] = []

    server.use(
      http.get(`${API_BASE}/coins/markets`, ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page'))
        const perPage = Number(url.searchParams.get('per_page'))
        requestedPages.push(`page=${page} per_page=${perPage}`)
        const start = (page - 1) * perPage
        return HttpResponse.json(pool.slice(start, start + perPage))
      }),
    )

    const coins = await fetchCoins('', new AbortController().signal, 300)

    expect(coins).toHaveLength(300)
    expect(coins[0].id).toBe('coin-1')
    expect(coins[299].id).toBe('coin-300')
    expect(requestedPages).toEqual(['page=1 per_page=250', 'page=2 per_page=250'])
  })

  test('stops once CoinGecko has fewer coins than asked for, instead of looping forever', async () => {
    const pool = Array.from({ length: 300 }, (_, i) => coinAt(i + 1))

    server.use(
      http.get(`${API_BASE}/coins/markets`, ({ request }) => {
        const url = new URL(request.url)
        const page = Number(url.searchParams.get('page'))
        const perPage = Number(url.searchParams.get('per_page'))
        const start = (page - 1) * perPage
        return HttpResponse.json(pool.slice(start, start + perPage))
      }),
    )

    const coins = await fetchCoins('', new AbortController().signal, 1000)

    expect(coins).toHaveLength(300)
  })
})
