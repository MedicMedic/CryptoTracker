# CryptoTracker

A small React + TypeScript app that shows live prices for the top cryptocurrencies and lets you search for a specific coin, backed by the public [CoinGecko API](https://www.coingecko.com/en/api).

## Running it

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically `http://localhost:5173`).

## Environment variables

| variable                   | for                              | required | value comes from                 | without it                                 |
| --------------------------- | --------------------------------- | -------- | --------------------------------- | -------------------------------------------- |
| `VITE_COINGECKO_API_BASE`   | which CoinGecko host to call      | no       | your local `.env` (see `.env.example`) | falls back to the public CoinGecko API   |

Copy `.env.example` to `.env` only if you need to point at something other than the public API (e.g. a proxy to dodge the free tier's rate limit).

## Using it

1. On load, the app fetches the top 50 coins by market cap and lists them with rank, price, and 24h change.
2. Click "Show more" to extend the default list in steps of 50, with no fixed ceiling — past 250 coins it transparently pages through multiple CoinGecko requests (their `per_page` limit) and concatenates the results.
3. Type in the search box to look up a specific coin by name or symbol (e.g. "doge"). The list narrows to matches after a short debounce.
4. Click Refresh (next to the "Updated <time>" indicator) to get a new snapshot without reloading the page.
5. Click a coin's name to open a modal with its price history — roughly the last 48 hours, hourly — as a line chart with a hover tooltip and a "Show hourly data as a table" fallback. A dashed segment extends the line one hour past the last real point: a naive trend line (least squares over the last several hours), clearly labeled as not a forecast, with an "ⓘ" next to it explaining how it's calculated.
6. If a request fails, the list (or the chart) shows the server's own error message and a "Try again" button when the failure is one that might succeed on retry (network errors, 5xx, rate limiting).

## Testing

```bash
npm test
```

Runs the Vitest suite against a mocked CoinGecko API (via MSW): `src/App.test.tsx` covers the default list rendering, a search with no matches, and a server failure with retry; `src/components/CoinDetailModal.test.tsx` covers opening/closing the chart modal, Escape/focus-return, and its own retry path; `src/lib/coins.test.ts` and `src/lib/format.test.ts` cover pagination paging math and price-formatting edge cases directly. It does not cover visual regressions or the CoinGecko API's actual behavior.

## Limitations

- No app-level cap on pagination, but every 250 coins costs another request — clicking "Show more" repeatedly toward CoinGecko's full ~17,000-coin list would mean dozens of requests and is likely to hit their public rate limit.
- Search resolves through CoinGecko's `/search` endpoint (matched by name/symbol) and then re-fetches prices for those specific coins, so it costs two requests instead of one; there's no client-side-only fallback if `/search` is down.
- No caching between renders — switching away from a search query and back re-fetches instead of reusing the last response.
- Prices are not live-updating; use the Refresh button (or reload the page) to get a new snapshot.
- Subject to CoinGecko's public rate limit (roughly 10–30 requests/minute); heavy typing in the search box can trip it despite the debounce.
- The chart's trend line is a naive least-squares fit over the last ~8 hours, extended one hour forward — it has no signal beyond the shape of that window. Short-term crypto price moves are close to a random walk; it's a visual aid, not something to trade on (labeled as such in the UI).

## Decisions

- **Fetch top-50 by market cap on load, rather than an empty state waiting for a search** — considered starting blank until the user searches, rejected because an empty first screen gives no sense of what the app does.
- **Search via `/search` + `/coins/markets?ids=`, rather than filtering a single pre-fetched list client-side** — considered fetching a large local list once and filtering it in the browser, rejected because CoinGecko has thousands of coins and a top-50 snapshot would miss most search results; the two-request approach costs latency but returns correct matches.
- **Hand-rolled `isCoin` type guard, rather than a schema library** — considered zod, rejected as overkill for the one shape this app actually consumes.
- **Hand-rolled inline SVG chart, rather than a charting library** — considered Recharts/Chart.js, rejected for one chart type this small; kept the bundle from growing for a single line + hover tooltip.
- **Show a labeled naive trend projection, rather than no prediction at all** — considered omitting it entirely, went with a clearly-labeled ("not a forecast", with an info tooltip on the methodology) dashed extrapolation instead, on the view that an honestly-labeled naive readout is more useful than either silence or an implied real forecast.
