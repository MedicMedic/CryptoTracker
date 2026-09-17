import { formatChange, formatCompactPrice, formatPrice } from '../lib/format'
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
          {/* Below the narrow breakpoint only the symbol stays visible (there's
              no room for both) — coin-name-full is visually hidden rather than
              display:none there, so the button's accessible name is still
              "Bitcoin BTC" for a screen reader regardless of viewport width. */}
          <span className="coin-name-full">{coin.name}</span> <span className="symbol">{coin.symbol.toUpperCase()}</span>
        </button>
      </td>
      <td className="price">
        <span className="price-full">{formatPrice(coin.current_price)}</span>
        {/* Same value, two renderings — only one is ever visible at once, so
            hiding the other with display:none (not visually-hidden) is the
            right call here: showing both to a screen reader would announce
            the same price twice. */}
        <span className="price-compact">{formatCompactPrice(coin.current_price)}</span>
      </td>
      <td className={`change ${changeClass}`}>{formatChange(change)}</td>
    </tr>
  )
}
