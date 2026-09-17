import { describe, expect, test } from 'vitest'
import { formatAxisPrice, formatPrice } from './format'

describe('formatAxisPrice', () => {
  test('rounds a raw historical-series float to a clean whole-dollar tick', () => {
    // This is the exact bug caught live: CoinGecko's market_chart prices
    // carry full float precision, which read as "$76,085.469233" instead
    // of a clean axis tick.
    expect(formatAxisPrice(76085.469233)).toBe('$76,100')
  })

  test('rounds a sub-dollar price to a few significant figures, not 6 decimals', () => {
    expect(formatAxisPrice(0.0791234)).toBe('$0.0791')
  })

  test('still exponential-shorthands a sub-cent price after rounding', () => {
    expect(formatAxisPrice(0.0000000012345)).toBe(formatPrice(0.00000000123))
  })

  test('rounds zero without dividing by zero', () => {
    expect(formatAxisPrice(0)).toBe('$0.00')
  })
})
