import { formatChange, formatPrice } from '../lib/format'
import type { Coin } from '../types/coin'

export function CoinRow({ coin, rank, onSelect }: { coin: Coin; rank: number; onSelect: (coin: Coin) => void }) {
  const change = coin.price_change_percentage_24h
  const changeClass = change == null ? '' : change >= 0 ? 'positive' : 'negative'

  return (
    <tr>
      <td className="rank">{rank}</td>
      <td>
        <button type="button" className="coin-name" onClick={() => onSelect(coin)}>
          {/* decorative — the coin name right beside it already says what this is */}
          <img src={coin.image} alt="" width={24} height={24} loading="lazy" />
          <span>
            {coin.name} <span className="symbol">{coin.symbol.toUpperCase()}</span>
          </span>
        </button>
      </td>
      <td className="price">{formatPrice(coin.current_price)}</td>
      <td className={`change ${changeClass}`}>{formatChange(change)}</td>
    </tr>
  )
}
