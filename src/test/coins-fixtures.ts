import type { Coin } from '../types/coin'

export const bitcoin: Coin = {
  id: 'bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
  current_price: 65000,
  market_cap_rank: 1,
  price_change_percentage_24h: 2.5,
}

export const ethereum: Coin = {
  id: 'ethereum',
  symbol: 'eth',
  name: 'Ethereum',
  image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  current_price: 3400,
  market_cap_rank: 2,
  price_change_percentage_24h: -1.2,
}
