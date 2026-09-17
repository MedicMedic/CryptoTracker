import { useMemo, useRef, useState } from 'react'
import type { PricePoint } from '../types/price-point'
import { formatAxisPrice } from '../lib/format'

const HOUR_MS = 3_600_000
const VIEW_W = 640
const VIEW_H = 260
const MARGIN = { top: 16, right: 16, bottom: 28, left: 68 }

const timeFormatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
// The chart spans close to exactly 48 hours, so the start and end land on
// nearly the same time of day — "9:00 PM" to "9:02 PM" reads as two minutes
// apart instead of two days. Every on-chart label needs the date too.
const axisFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

interface Trend {
  time: number
  price: number
}

// Least-squares line through the most recent points, extended one hour past
// the last real one. This is a naive momentum readout, not a model — it has
// no memory of anything but the shape of this window, and short-term crypto
// moves are close to a random walk. Treat the label as load-bearing: this is
// not a forecast anyone should trade on.
function projectTrend(data: PricePoint[]): Trend | null {
  if (data.length < 3) return null

  const window = data.slice(-Math.min(8, data.length))
  const x0 = window[0].time
  const xs = window.map((p) => (p.time - x0) / HOUR_MS) // hours since window start, keeps numbers small
  const ys = window.map((p) => p.price)
  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null

  const slope = num / den
  const intercept = meanY - slope * meanX
  const lastX = xs[n - 1] + 1 // one hour past the last real point
  return { time: data[data.length - 1].time + HOUR_MS, price: intercept + slope * lastX }
}

export function PriceChart({ data, coinName }: { data: PricePoint[]; coinName: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const trend = useMemo(() => projectTrend(data), [data])

  const { xScale, yScale, linePath, dashPath, gridLines } = useMemo(() => {
    const times = data.map((p) => p.time)
    const prices = data.map((p) => p.price)
    if (trend) {
      times.push(trend.time)
      prices.push(trend.price)
    }
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const pricePad = (maxPrice - minPrice) * 0.1 || maxPrice * 0.05 || 1

    const plotW = VIEW_W - MARGIN.left - MARGIN.right
    const plotH = VIEW_H - MARGIN.top - MARGIN.bottom

    const xScale = (t: number) => MARGIN.left + ((t - minTime) / (maxTime - minTime || 1)) * plotW
    const yScale = (p: number) =>
      MARGIN.top + plotH - ((p - (minPrice - pricePad)) / (maxPrice + pricePad - (minPrice - pricePad) || 1)) * plotH

    const linePath = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.time)} ${yScale(p.price)}`).join(' ')
    const last = data[data.length - 1]
    const dashPath = trend && last ? `M ${xScale(last.time)} ${yScale(last.price)} L ${xScale(trend.time)} ${yScale(trend.price)}` : null

    // Four evenly-spaced horizontal gridlines with price labels — the
    // recessive, hairline kind, never the data itself.
    const gridLines = Array.from({ length: 4 }, (_, i) => {
      const price = minPrice - pricePad + ((maxPrice + pricePad - (minPrice - pricePad)) * i) / 3
      return { y: yScale(price), price }
    })

    return { xScale, yScale, linePath, dashPath, gridLines }
  }, [data, trend])

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg || data.length === 0) return
    const rect = svg.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W
    let nearest = 0
    let nearestDist = Infinity
    data.forEach((p, i) => {
      const dist = Math.abs(xScale(p.time) - relX)
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = i
      }
    })
    setHoverIndex(nearest)
  }

  if (data.length === 0) return null

  const first = data[0]
  const last = data[data.length - 1]
  const changePct = ((last.price - first.price) / first.price) * 100
  const direction = changePct >= 0 ? 'up' : 'down'
  const rangeLabel = `${dayFormatter.format(first.time)} to ${dayFormatter.format(last.time)}`
  const chartSummary = `Hourly price for ${coinName}, ${rangeLabel}: from ${formatAxisPrice(first.price)} to ${formatAxisPrice(last.price)}, ${direction} ${Math.abs(changePct).toFixed(1)}%.`

  const hovered = hoverIndex !== null ? data[hoverIndex] : null
  const tooltipX = hovered ? xScale(hovered.time) : 0
  const tooltipOnRight = hovered ? tooltipX < VIEW_W - 146 : true

  return (
    <div className="price-chart">
      <svg
        ref={svgRef}
        role="img"
        aria-label={chartSummary}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((g) => (
          <g key={g.y}>
            <line x1={MARGIN.left} x2={VIEW_W - MARGIN.right} y1={g.y} y2={g.y} className="chart-grid" />
            <text x={MARGIN.left - 8} y={g.y} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
              {formatAxisPrice(g.price)}
            </text>
          </g>
        ))}

        <text x={xScale(first.time)} y={VIEW_H - 8} className="chart-axis-label" textAnchor="start">
          {axisFormatter.format(first.time)}
        </text>
        <text x={xScale(last.time)} y={VIEW_H - 8} className="chart-axis-label" textAnchor="end">
          {axisFormatter.format(last.time)}
        </text>

        <path d={linePath} className="chart-line" fill="none" />
        {dashPath && <path d={dashPath} className="chart-trend-line" fill="none" />}

        {/* end marker: surface-color ring so it reads distinctly from the line it sits on */}
        <circle cx={xScale(last.time)} cy={yScale(last.price)} r={6} className="chart-marker-ring" />
        <circle cx={xScale(last.time)} cy={yScale(last.price)} r={4} className="chart-marker" />

        {trend && (
          <circle cx={xScale(trend.time)} cy={yScale(trend.price)} r={4} className="chart-trend-marker" />
        )}

        {hovered && (
          <g>
            <line
              x1={tooltipX}
              x2={tooltipX}
              y1={MARGIN.top}
              y2={VIEW_H - MARGIN.bottom}
              className="chart-crosshair"
            />
            <circle cx={tooltipX} cy={yScale(hovered.price)} r={4} className="chart-marker" />
            <g transform={`translate(${tooltipOnRight ? tooltipX + 8 : tooltipX - 8}, ${MARGIN.top + 4})`}>
              <rect
                x={tooltipOnRight ? 0 : -136}
                y={0}
                width={136}
                height={36}
                rx={4}
                className="chart-tooltip-bg"
              />
              <text x={tooltipOnRight ? 8 : -128} y={15} className="chart-tooltip-text">
                {axisFormatter.format(hovered.time)}
              </text>
              <text x={tooltipOnRight ? 8 : -128} y={29} className="chart-tooltip-value">
                {formatAxisPrice(hovered.price)}
              </text>
            </g>
          </g>
        )}
      </svg>

      {trend && (
        <p className="chart-trend-caption">
          <span className="chart-trend-swatch" aria-hidden="true" /> Trend if this continues — a naive projection
          from recent momentum, <strong>not a forecast</strong>.
          <button
            type="button"
            className="chart-trend-info"
            aria-label="How this trend line is calculated"
            title="A straight line fit to the last several hours of price data (least squares), extended one hour past the last real point. It only reads the recent slope — it knows nothing about news, order books, or anything else that actually moves price. Short-term crypto moves are close to a random walk, so treat this as a visual aid, not a signal."
          >
            ⓘ
          </button>
        </p>
      )}

      <details className="chart-table-toggle">
        <summary>Show hourly data as a table</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {/* newest first — the chart itself stays chronological (oldest to
                  newest, left to right), but a table reads more naturally with
                  the latest update on top */}
              {[...data].reverse().map((p) => (
                <tr key={p.time}>
                  <td>
                    {dayFormatter.format(p.time)} {timeFormatter.format(p.time)}
                  </td>
                  <td>{formatAxisPrice(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
