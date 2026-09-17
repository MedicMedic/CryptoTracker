export interface PricePoint {
  time: number
  price: number
}

// CoinGecko's market_chart endpoint returns prices as [timestamp, price]
// tuples rather than named fields — validate the raw shape at the boundary
// before mapping it into PricePoint.
export function isRawPricePoint(v: unknown): v is [number, number] {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'
}
