const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
})

export const percentFormatter = new Intl.NumberFormat('en-US', {
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

export function formatPrice(value: number): string {
  if (value > 0 && value < EXPONENTIAL_THRESHOLD) {
    const [mantissa, exponent] = value.toExponential(2).split('e')
    return `$${mantissa}×10${toSuperscript(Number(exponent))}`
  }
  return priceFormatter.format(value)
}

export function formatChange(change: number | null): string {
  return change == null ? '—' : percentFormatter.format(change / 100)
}

const compactPriceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

// K/M shorthand for the coin list at narrow widths, where the full price
// ("$76,085.47") is what pushes the 24h column off-screen. Below $1, compact
// notation would round every significant digit away ("$0.0"), and nothing
// under $1 is long enough to need shortening anyway — defer to formatPrice.
export function formatCompactPrice(value: number): string {
  return value < 1 ? formatPrice(value) : compactPriceFormatter.format(value)
}

const axisPriceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function roundToSignificant(value: number, sig = 3): number {
  if (value === 0) return 0
  const magnitude = 10 ** (Math.floor(Math.log10(Math.abs(value))) - sig + 1)
  return Math.round(value / magnitude) * magnitude
}

// For a computed/historical value (a chart gridline, a tooltip reading a
// point from a price series) rather than an exact quoted price — those
// carry full float precision (76085.469233) that reads as noise on an axis
// or in a tooltip. Round to a few significant figures first, then use
// whole dollars once the coin's in dollar range; formatPrice's own
// cents/exponential handling covers everything under $1.
export function formatAxisPrice(value: number): string {
  const rounded = roundToSignificant(value, 3)
  return Math.abs(rounded) >= 1 ? axisPriceFormatter.format(rounded) : formatPrice(rounded)
}
