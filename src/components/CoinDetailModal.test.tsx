import { http, HttpResponse } from 'msw'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import App from '../App'
import { server } from '../test/server'

const API_BASE = 'https://api.coingecko.com/api/v3'

describe('CoinDetailModal', () => {
  test('opens on clicking a coin, shows the chart, and closes on Escape', async () => {
    render(<App />)
    await screen.findByRole('table')

    await userEvent.click(screen.getByRole('button', { name: /Bitcoin BTC/ }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Bitcoin')

    const chart = await screen.findByRole('img', { name: /Hourly price for Bitcoin/ })
    expect(chart).toBeInTheDocument()

    // The naive trend projection should be labeled as not a forecast, not
    // presented as a real prediction.
    expect(screen.getByText(/not a forecast/)).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  test('returns focus to the coin button that opened it, after closing', async () => {
    render(<App />)
    await screen.findByRole('table')

    const coinButton = screen.getByRole('button', { name: /Bitcoin BTC/ })
    await userEvent.click(coinButton)
    await screen.findByRole('dialog')

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(coinButton).toHaveFocus()
  })

  test('shows the real failure shape when the chart request fails, with a retry', async () => {
    server.use(
      http.get(`${API_BASE}/coins/:id/market_chart`, () =>
        HttpResponse.json({ message: 'Service unavailable' }, { status: 500 }),
      ),
    )

    render(<App />)
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: /Bitcoin BTC/ }))

    const alert = await screen.findByRole('alert', {}, { timeout: 5000 })
    expect(alert).toHaveTextContent('Service unavailable')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  }, 10000)
})
