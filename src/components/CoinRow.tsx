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

export function CoinRow({ coin }: { coin: Coin }) {
  const change = coin.price_change_percentage_24h
  const changeClass = change == null ? '' : change >= 0 ? 'positive' : 'negative'

  return (
    <tr>
      <td className="rank">{coin.market_cap_rank ?? '—'}</td>
      <td>
        <div className="coin-name">
          {/* decorative — the coin name right beside it already says what this is */}
          <img src={coin.image} alt="" width={24} height={24} loading="lazy" />
          <span>
            {coin.name} <span className="symbol">{coin.symbol.toUpperCase()}</span>
          </span>
        </div>
      </td>
      <td className="price">{priceFormatter.format(coin.current_price)}</td>
      <td className={`change ${changeClass}`}>{change == null ? '—' : percentFormatter.format(change / 100)}</td>
    </tr>
  )
}
