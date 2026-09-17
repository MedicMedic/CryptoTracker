import { http, HttpResponse } from 'msw'
import { render, screen, within } from '@testing-library/react'
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

  test('has its own refresh control, distinct from the list\'s, that refetches the chart', async () => {
    render(<App />)
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: /Bitcoin BTC/ }))

    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('img', { name: /Hourly price for Bitcoin/ })
    within(dialog).getByText(/^Updated /)

    let requestCount = 0
    server.use(
      http.get(`${API_BASE}/coins/:id/market_chart`, () => {
        requestCount++
        return HttpResponse.json({ prices: [] })
      }),
    )

    await userEvent.click(within(dialog).getByRole('button', { name: 'Refresh' }))

    await within(dialog).findByText('No price history available for this coin.')
    expect(requestCount).toBe(1)
  })

  test('reaches the hourly-data toggle by keyboard and opens it with Enter', async () => {
    render(<App />)
    await screen.findByRole('table')
    await userEvent.click(screen.getByRole('button', { name: /Bitcoin BTC/ }))

    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByRole('img', { name: /Hourly price for Bitcoin/ })

    // Focus starts on Close; `summary` isn't in most focusable-element
    // selector lists, so this catches it silently dropping out of the tab
    // order (it did, once — the fix added `summary` to the trap's query).
    await userEvent.tab() // Refresh
    await userEvent.tab() // trend-info info button
    await userEvent.tab() // "Show hourly data as a table"

    const summary = within(dialog).getByText('Show hourly data as a table')
    expect(summary).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(within(dialog).getByRole('table')).toBeInTheDocument()
  })
})
