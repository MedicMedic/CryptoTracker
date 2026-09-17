import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import App from './App'
import { server } from './test/server'

const API_BASE = 'https://api.coingecko.com/api/v3'

describe('App', () => {
  test('shows the default top-coins list on load', async () => {
    render(<App />)

    const table = await screen.findByRole('table')
    expect(table).toHaveTextContent('Bitcoin')
    expect(table).toHaveTextContent('Ethereum')
  })

  test('shows a distinct empty state when a search has no matches', async () => {
    server.use(http.get(`${API_BASE}/search`, () => HttpResponse.json({ coins: [] })))

    render(<App />)
    await screen.findByRole('table')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search coins' }), 'zzzznotacoin')

    expect(await screen.findByText('No coins match "zzzznotacoin".')).toBeInTheDocument()
  }, 10000)

  test('shows the real failure shape the server sends, and lets the user retry', async () => {
    server.use(
      http.get(`${API_BASE}/coins/markets`, () =>
        HttpResponse.json({ message: 'Service unavailable' }, { status: 500 }),
      ),
    )

    render(<App />)

    const alert = await screen.findByRole('alert', {}, { timeout: 5000 })
    expect(alert).toHaveTextContent('Service unavailable')

    server.resetHandlers() // the outage clears — the next attempt should succeed
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('table')).toHaveTextContent('Bitcoin')
  }, 10000)

  test('"Show more" extends the default view past the first page', async () => {
    server.use(
      http.get(`${API_BASE}/coins/markets`, ({ request }) => {
        const perPage = Number(new URL(request.url).searchParams.get('per_page'))
        const coins = Array.from({ length: perPage }, (_, i) => ({
          id: `coin-${i}`,
          symbol: `c${i}`,
          name: `Coin ${i}`,
          image: '',
          current_price: perPage - i,
          market_cap_rank: i + 1,
          price_change_percentage_24h: 0,
        }))
        return HttpResponse.json(coins)
      }),
    )

    render(<App />)
    await screen.findByRole('table')
    expect(screen.getAllByRole('row')).toHaveLength(51) // 50 coins + header row

    await userEvent.click(screen.getByRole('button', { name: 'Show more' }))

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(101))
  })

  test('shows a refresh control after load and refetches on click', async () => {
    render(<App />)
    await screen.findByRole('table')

    expect(screen.getByText(/^Updated /)).toBeInTheDocument()
    const refreshButton = screen.getByRole('button', { name: 'Refresh' })

    let requestCount = 0
    server.use(
      http.get(`${API_BASE}/coins/markets`, () => {
        requestCount++
        return HttpResponse.json([])
      }),
    )

    await userEvent.click(refreshButton)

    expect(await screen.findByText('No market data available right now.')).toBeInTheDocument()
    expect(requestCount).toBe(1)
  })
})
