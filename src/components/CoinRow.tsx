import type { Coin } from '../types/coin'

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
})

// Below this, 6 fraction digits round to "$0.000000" — a coin like Wikicat
// trading at $0.0000000012 loses every significant digit. Switch to
// exponential shorthand instead of showing a number that reads as zero.
const EXPONENTIAL_THRESHOLD = 0.000001

const superscriptDigits: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((ch) => superscriptDigits[ch] ?? ch)
    .join('')
}

function formatPrice(value: number): string {
  if (value > 0 && value < EXPONENTIAL_THRESHOLD) {
    const [mantissa, exponent] = value.toExponential(2).split('e')
    return `$${mantissa}×10${toSuperscript(Number(exponent))}`
  }
  return priceFormatter.format(value)
}

export function CoinRow({ coin, rank }: { coin: Coin; rank: number }) {
  const change = coin.price_change_percentage_24h
  const changeClass = change == null ? '' : change >= 0 ? 'positive' : 'negative'

  return (
    <tr>
      <td className="rank">{rank}</td>
      <td>
        <div className="coin-name">
          {/* decorative — the coin name right beside it already says what this is */}
          <img src={coin.image} alt="" width={24} height={24} loading="lazy" />
          <span>
            {coin.name} <span className="symbol">{coin.symbol.toUpperCase()}</span>
          </span>
        </div>
      </td>
      <td className="price">{formatPrice(coin.current_price)}</td>
      <td className={`change ${changeClass}`}>{change == null ? '—' : percentFormatter.format(change / 100)}</td>
    </tr>
  )
}
