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
6. If a request fails, the list (or the chart) shows the server's own error message and a "Try again" button when the failure is one that might succeed on retry (network errors, 5xx, rate limiting) — if it won't, the message says so instead of showing a button.

## Operating it by keyboard

Everything in the app is reachable and operable without a mouse:

- The first Tab press reveals a "Skip to main content" link; activating it jumps past the header straight to the coin list.
- Tab order in the main view: search input → Refresh → the Price and 24h column headers (Enter/Space flips the sort direction and updates the ▲/▼ icon) → each coin's name (Enter/Space opens its detail modal) → Show more.
- Opening a coin's modal moves focus to its Close button. From there, Tab cycles: Close → Refresh → the trend-line info button (ⓘ, only when a trend line is shown) → "Show hourly data as a table" (Enter/Space expands it) → the hourly data table itself, once expanded, which is its own Tab stop and scrolls with the arrow keys or Page Down/Up. Tab wraps back to Close from the end instead of escaping to the page behind the modal.
- Escape closes the modal from anywhere inside it and returns focus to the coin button that opened it.
- Every focusable control shows a visible focus ring when reached by keyboard (via `:focus-visible` — it doesn't appear on a mouse click, so it won't show up when you're just clicking around).

## Demonstrating the loading, error and empty states

All three are reachable without touching the code:

- **Loading** — on a fast connection it resolves before the spinner would show (by design, see Decisions). To see it reliably: open DevTools → Network tab → set throttling to "Slow 3G" → click Refresh (or reload the page). The spinner appears after a short delay and stays until the throttled response lands.
- **Error** — with DevTools Network throttling set to "Offline," click Refresh (or reload the page, or open a coin's modal). The request fails as a network error, which is retryable: the message reads as a connection failure and a "Try again" button appears — click it (still offline) to see it fail again, or go back online and click it to see it recover. To see the non-retryable branch (no "Try again," "Retrying won't fix this." instead), change `VITE_COINGECKO_API_BASE` in `.env` to a URL that 404s, e.g. `https://api.coingecko.com/api/v3/nonexistent`.
- **Empty** — type a search with no possible match, e.g. `zzzznotacoin`, into the search box. CoinGecko's `/search` returns no results and the list shows `No coins match "zzzznotacoin".` without ever calling `/coins/markets`.

## Contributing a feature

This section is for whoever adds the next feature — it assumes the app already runs.

### Layout, and why

```
src/
  types/       shape contracts + runtime guards for anything that crosses the network
  lib/         pure functions, no React — fetching, retry, formatting
  hooks/       stateful React glue over lib/ (RequestState, debounce, abort)
  components/  presentation — given state as props, never fetch themselves
  test/        shared MSW mock server, handlers, and fixtures
  App.tsx      top-level composition: owns query/count/selectedCoin state, wires hooks to components
```

The split exists because this app talks to an API (CoinGecko) it doesn't control and can't fully trust the shape of. The three layers below `App.tsx` each answer one question:

- **`types/`** — "what does a valid coin/price-point look like, and how do I check one I got from the network before I use it?" `isCoin` and `isRawPricePoint` are hand-rolled guards, not a schema library (see Decisions). Every fetch function filters through one of these before returning data, so nothing downstream has to defend against a malformed API response.
- **`lib/`** — the actual talking-to-CoinGecko logic, and nothing else. No React imports here on purpose: `api.ts` is generic fetch/retry machinery, `coins.ts` is CoinGecko-specific (endpoints, pagination, the search-then-fetch flow), `format.ts` is display formatting (currency, percent, the exponential shorthand for sub-cent prices). Because these are plain functions, they're unit-tested directly (`coins.test.ts`, `format.test.ts`) without touching React or the DOM.
- **`hooks/`** — turns a `lib/` fetch function into `RequestState` (`idle | loading | error | success`) that a component can render. `useCoins` and `useCoinHistory` are the same pattern twice: debounce (if needed) → `AbortController` → call the `lib/` function → keep previous success data visible during a refetch instead of blanking to a spinner (see Fragile parts on why that last part matters). If you add a third piece of async data, follow this pattern rather than inventing a new one.
- **`components/`** — take `state: RequestState<T>` and callbacks as props, render one branch per status. They don't call `fetch` or import from `lib/` directly (except pure formatters). This is what makes them testable by rendering `<App />` against MSW instead of needing a mocked hook per test.

### Where a new feature goes

- **A new field from the CoinGecko response** (e.g. show all-time-high): add it to the `Coin` interface and `isCoin` guard in `types/coin.ts`, then read it wherever you display it. If it needs its own formatting, add a formatter to `lib/format.ts` next to `formatPrice`/`formatChange` rather than inlining it in a component.
- **A new sortable column**: extend `SortKey` in `SortableHeader.tsx`, add its value lookup to `sortCoins()` in `CoinList.tsx`, and render another `<SortableHeader>` in the `<thead>`. Don't touch `rankById` — rank is deliberately independent of sort (see Fragile parts).
- **A new async data source** (a different chart, a coin-detail sub-panel, whatever): add a fetch function to `lib/` (or a new file there) returning a plain array/object through a type guard, add a hook in `hooks/` following the `useCoins`/`useCoinHistory` shape, and add a matching MSW handler in `test/handlers.ts` so `App.test.tsx`-style tests don't hit the real network. Point it at `${API_BASE}` from the existing pattern in `coins.ts`, not a hardcoded URL.
- **A new view/route** (e.g. a coin comparison page): there's no router in this app — it's a single screen plus a modal. If a feature needs a second real "page," that's the point to add `react-router` or similar; don't fake it with more boolean state in `App.tsx`.
- **Styling**: everything lives in `App.css` plus the CSS custom properties (light/dark pairs) at the top of `index.css`. Reuse a `--rule`/`--accent`/`--ink*` token rather than a new hardcoded color, or dark mode silently breaks for just your new element.

### Running the checks

```bash
npm run lint    # oxlint — static analysis, no build step
npm run build   # tsc -b (typecheck) && vite build — catches type errors lint won't
npm test        # vitest run — the full suite, mocked network via MSW
```

A clean run looks like:

- `lint`: no output, or only the two pre-existing `react(set-state-in-effect)` warnings in `useDelayedFlag.ts` and `useCoinHistory.ts` (both are the "set state from a resolved promise/timer inside an effect" pattern this app relies on for async state — known, not a regression). Any new warning or an `error`-level finding means something to look at.
- `build`: exits 0, ends with Vite's `dist/` output summary. A `tsc` failure here (not in `lint`) usually means a type is wrong in a way that isn't purely stylistic — oxlint doesn't typecheck.
- `test`: `Test Files  4 passed (4)` / `Tests  16 passed (16)`, no `FAIL` lines. `src/App.test.tsx` covers the default list rendering, a search with no matches, and a server failure with retry; `src/components/CoinDetailModal.test.tsx` covers opening/closing the chart modal, Escape/focus-return, and its own retry path; `src/lib/coins.test.ts` and `src/lib/format.test.ts` cover pagination paging math and price-formatting edge cases directly. Tests render `<App />` against MSW-mocked responses (`test/handlers.ts`, fixtures in `test/coins-fixtures.ts`) rather than mocking hooks or components — if you add a new API call, add a handler for it, or the default `onUnhandledRequest: 'error'` setup (`test/setup.ts`) will fail any test that triggers it, including ones that don't otherwise touch your feature. It does not cover visual regressions or the CoinGecko API's actual live behavior.

Run all three before committing. `npm run build`'s `tsc -b` step is the only place `erasableSyntaxOnly` violations (e.g. TypeScript parameter-property shorthand in a class constructor, which this project can't use) get caught — lint won't flag it.

### Fragile parts

- **Rank is carried, not recomputed, and depends on fetch order staying canonical.** `CoinList.tsx` builds `rankById` from `state.data`'s array order (`coin, i => i+1`) *before* applying the user's sort, so a coin sorted to the bottom of the table still shows its real rank instead of a new one from its row position — this is deliberate. It only works because `fetchCoins` in `lib/coins.ts` always returns data already sorted by `byRankThenPrice`. If a future change to `fetchCoins` returns data in a different order (e.g. an API change, a new query param) without preserving that invariant, ranks will silently renumber on every sort instead of staying pinned — nothing will error, the numbers will just be wrong. There's no test pinning this invariant directly; if you touch `fetchCoins`'s ordering, manually re-check that sorting by Price doesn't change the Rank column.
- **CoinGecko's pagination `page` param means "skip `(page-1) * per_page`," so `per_page` must stay constant across every request in one `fetchCoins` call.** This was a real bug once (see `coins.test.ts`'s multi-page test, and the "fix: remove the arbitrary 250 cap, page past it correctly" commit): varying `per_page` between requests points the skip math at the wrong rows and silently drops or duplicates coins. If you touch the pagination loop in `lib/coins.ts`, keep `pageSize` fixed per call and only trim to `count` at the very end — the existing unit test asserts the exact `page=`/`per_page=` query string sent on each request, so a regression here should fail loudly, but only if you run it.
- **Keyboard accessibility in `CoinDetailModal.tsx`'s focus trap is a hand-maintained selector list, and it has already silently dropped an element type once.** The trap's `querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]...')` and the `:focus-visible` CSS rule in `index.css` are two separate lists of "things that are focusable here," kept in sync by hand. `summary` was missing from both until manual keyboard testing caught it — nothing in the type system or the test suite flags a focusable element silently falling out of tab order, because the trap doesn't error, it just wraps early. If you add a new interactive element inside the modal (another button, a link, a custom widget with `tabIndex`), it needs adding to *both* lists, and the only real check is `CoinDetailModal.test.tsx`'s keyboard-path test (`reaches the hourly-data toggle by keyboard...`) plus manually tabbing through the live modal — the test suite runs in jsdom, which has no real layout, so it can't catch a scroll-related keyboard issue (like the table region needing its own `tabIndex` to be scrollable) on its own.
- **The chart's "trend" line is deliberately not a forecast, and it would be easy to accidentally make it look like one.** `PriceChart.tsx`'s `projectTrend` is a least-squares fit over the last ~8 hourly points, extended one hour forward — it carries zero information beyond the recent slope. It's currently gated by three things staying in place: the dashed (not solid) stroke, the "not a forecast" caption, and the info tooltip explaining the methodology. If you rework the chart's visual style, keep the trend segment visually distinct from the real data line — the caption alone isn't enough for someone skimming the chart.

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

## Out of scope

Not partially built, not planned for later — deliberately not attempted:

- **No accounts, auth, or saved state.** Every visit starts from the same public top-50 view; there's no way to save a personal list, and nothing persists between sessions.
- **No portfolio tracking.** The app shows market data only — no holdings, no cost basis, no profit/loss, nothing tied to a user's own positions.
- **No price alerts or notifications.**
- **No history beyond the ~48 hours CoinGecko's `days=2` window returns.** There's no week/month/year chart view, and no plan to page further back — the trend line is explicitly short-window for the same reason.
- **No multi-currency display.** Every price is USD; `vs_currency` isn't user-selectable.
- **No server-side component.** The app calls CoinGecko's public endpoint directly from the browser — no proxy, no API key, no server-side caching. That's also why it's bound by CoinGecko's public rate limit (see Limitations).
- **No native or mobile-wrapped app.** It's a responsive web page, nothing more.
