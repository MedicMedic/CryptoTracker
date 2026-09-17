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
2. Type in the search box to look up a specific coin by name or symbol (e.g. "doge"). The list narrows to matches after a short debounce.
3. If a request fails, the list shows the server's own error message and a "Try again" button when the failure is one that might succeed on retry (network errors, 5xx, rate limiting).

## Testing

```bash
npm test
```

Runs the Vitest suite in `src/App.test.tsx` against a mocked CoinGecko API (via MSW) — covering the default list rendering, a search with no matches, and a server failure with retry. It does not cover visual regressions or the CoinGecko API's actual behavior.

## Limitations

- No pagination — only the top 50 coins are shown in the default view.
- Search resolves through CoinGecko's `/search` endpoint (matched by name/symbol) and then re-fetches prices for those specific coins, so it costs two requests instead of one; there's no client-side-only fallback if `/search` is down.
- No caching between renders — switching away from a search query and back re-fetches instead of reusing the last response.
- Prices are not live-updating; refresh to get a new snapshot.
- Subject to CoinGecko's public rate limit (roughly 10–30 requests/minute); heavy typing in the search box can trip it despite the debounce.

## Decisions

- **Fetch top-50 by market cap on load, rather than an empty state waiting for a search** — considered starting blank until the user searches, rejected because an empty first screen gives no sense of what the app does.
- **Search via `/search` + `/coins/markets?ids=`, rather than filtering a single pre-fetched list client-side** — considered fetching a large local list once and filtering it in the browser, rejected because CoinGecko has thousands of coins and a top-50 snapshot would miss most search results; the two-request approach costs latency but returns correct matches.
- **Hand-rolled `isCoin` type guard, rather than a schema library** — considered zod, rejected as overkill for the one shape this app actually consumes.
