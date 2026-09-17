export interface Coin {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap_rank: number | null
  price_change_percentage_24h: number | null
}

export function isCoin(v: unknown): v is Coin {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Coin).id === 'string' &&
    typeof (v as Coin).symbol === 'string' &&
    typeof (v as Coin).name === 'string' &&
    typeof (v as Coin).current_price === 'number'
  )
}
