# Contributing to CryptoTracker

This is the guide for adding a feature to this app without breaking what's already here. For "how do I run this thing," see [README.md](README.md) — this file assumes you've already got it running.

## Layout, and why

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

- **`types/`** — "what does a valid coin/price-point look like, and how do I check one I got from the network before I use it?" `isCoin` and `isRawPricePoint` are hand-rolled guards, not a schema library — see the Decisions section of the README for why. Every fetch function filters through one of these before returning data, so nothing downstream has to defend against a malformed API response.
- **`lib/`** — the actual talking-to-CoinGecko logic, and nothing else. No React imports here on purpose: `api.ts` is generic fetch/retry machinery, `coins.ts` is CoinGecko-specific (endpoints, pagination, the search-then-fetch flow), `format.ts` is display formatting (currency, percent, the exponential shorthand for sub-cent prices). Because these are plain functions, they're unit-tested directly (`coins.test.ts`, `format.test.ts`) without touching React or the DOM.
- **`hooks/`** — turns a `lib/` fetch function into `RequestState` (`idle | loading | error | success`) that a component can render. `useCoins` and `useCoinHistory` are the same pattern twice: debounce (if needed) → `AbortController` → call the `lib/` function → keep previous success data visible during a refetch instead of blanking to a spinner (see Fragile parts below on why that last part matters). If you add a third piece of async data, follow this pattern rather than inventing a new one.
- **`components/`** — take `state: RequestState<T>` and callbacks as props, render one branch per status. They don't call `fetch` or import from `lib/` directly (except pure formatters). This is what makes them testable by rendering `<App />` against MSW instead of needing a mocked hook per test.

## Where a new feature goes

- **A new field from the CoinGecko response** (e.g. show all-time-high): add it to the `Coin` interface and `isCoin` guard in `types/coin.ts`, then read it wherever you display it. If it needs its own formatting, add a formatter to `lib/format.ts` next to `formatPrice`/`formatChange` rather than inlining it in a component.
- **A new sortable column**: extend `SortKey` in `SortableHeader.tsx`, add its value lookup to `sortCoins()` in `CoinList.tsx`, and render another `<SortableHeader>` in the `<thead>`. Don't touch `rankById` — rank is deliberately independent of sort (see Fragile parts).
- **A new async data source** (a different chart, a coin-detail sub-panel, whatever): add a fetch function to `lib/` (or a new file there) returning a plain array/object through a type guard, add a hook in `hooks/` following the `useCoins`/`useCoinHistory` shape, and add a matching MSW handler in `test/handlers.ts` so `App.test.tsx`-style tests don't hit the real network. Point it at `${API_BASE}` from the existing pattern in `coins.ts`, not a hardcoded URL.
- **A new view/route** (e.g. a coin comparison page): there's no router in this app — it's a single screen plus a modal. If a feature needs a second real "page," that's the point to add `react-router` or similar; don't fake it with more boolean state in `App.tsx`.
- **Styling**: everything lives in `App.css` plus the CSS custom properties (light/dark pairs) at the top of `index.css`. Reuse a `--rule`/`--accent`/`--ink*` token rather than a new hardcoded color, or dark mode silently breaks for just your new element.

## Running the checks

```bash
npm run lint    # oxlint — static analysis, no build step
npm run build   # tsc -b (typecheck) && vite build — catches type errors lint won't
npm test        # vitest run — the full suite, mocked network via MSW
```

A clean run looks like:

- `lint`: no output, or only the two pre-existing `react(set-state-in-effect)` warnings in `useDelayedFlag.ts` and `useCoinHistory.ts` (both are the "set state from a resolved promise/timer inside an effect" pattern this app relies on for async state — known, not a regression). Any new warning or an `error`-level finding means something to look at.
- `build`: exits 0, ends with Vite's `dist/` output summary. A `tsc` failure here (not in `lint`) usually means a type is wrong in a way that isn't purely stylistic — oxlint doesn't typecheck.
- `test`: `Test Files  4 passed (4)` / `Tests  16 passed (16)`, no `FAIL` lines. It runs against the real CoinGecko API's *shape* via MSW fixtures, not the live API — see Limitations in the README for what that doesn't catch.

Run all three before committing. `npm run build`'s `tsc -b` step is the only place `erasableSyntaxOnly` violations (e.g. TypeScript parameter-property shorthand in a class constructor, which this project can't use) get caught — lint won't flag it.

## Fragile parts

- **Rank is carried, not recomputed, and depends on fetch order staying canonical.** `CoinList.tsx` builds `rankById` from `state.data`'s array order (`coin, i => i+1`) *before* applying the user's sort, so a coin sorted to the bottom of the table still shows its real rank instead of a new one from its row position — this is deliberate (`How to apply` per the "ranking should carry over" feedback that shaped it: [CoinList.tsx:56](src/components/CoinList.tsx#L56)). It only works because `fetchCoins` in `lib/coins.ts` always returns data already sorted by `byRankThenPrice`. If a future change to `fetchCoins` returns data in a different order (e.g. an API change, a new query param) without preserving that invariant, ranks will silently renumber on every sort instead of staying pinned — nothing will error, the numbers will just be wrong. There's no test pinning this invariant directly; if you touch `fetchCoins`'s ordering, manually re-check that sorting by Price doesn't change the Rank column.
- **CoinGecko's pagination `page` param means "skip `(page-1) * per_page`," so `per_page` must stay constant across every request in one `fetchCoins` call.** This was a real bug once (see `coins.test.ts`'s multi-page test, and the commit history around "fix: remove the arbitrary 250 cap, page past it correctly"): varying `per_page` between requests points the skip math at the wrong rows and silently drops or duplicates coins. If you touch the pagination loop in `lib/coins.ts`, keep `pageSize` fixed per call and only trim to `count` at the very end — the existing unit test asserts the exact `page=`/`per_page=` query string sent on each request, so a regression here should fail loudly, but only if you run it.
- **Keyboard accessibility in `CoinDetailModal.tsx`'s focus trap is a hand-maintained selector list, and it has already silently dropped an element type once.** The trap's `querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]...')` and the `:focus-visible` CSS rule in `index.css` are two separate lists of "things that are focusable here," kept in sync by hand. `summary` was missing from both until a user caught it by trying to reach the hourly-data toggle by keyboard — nothing in the type system or the test suite flags a focusable element silently falling out of tab order, because the trap doesn't error, it just wraps early. If you add a new interactive element inside the modal (another button, a link, a custom widget with `tabIndex`), it needs adding to *both* lists, and the only real check is `CoinDetailModal.test.tsx`'s keyboard-path test (`reaches the hourly-data toggle by keyboard...`) plus manually tabbing through the live modal — the test suite runs in jsdom, which has no real layout, so it can't catch a scroll-related keyboard issue (like the table region needing its own `tabIndex` to be scrollable) on its own.
- **The chart's "trend" line is deliberately not a forecast, and it would be easy to accidentally make it look like one.** `PriceChart.tsx`'s `projectTrend` is a least-squares fit over the last ~8 hourly points, extended one hour forward — it carries zero information beyond the recent slope. It's currently gated by three things staying in place: the dashed (not solid) stroke, the "not a forecast" caption, and the info tooltip explaining the methodology. If you rework the chart's visual style, keep the trend segment visually distinct from the real data line — the caption alone isn't enough for someone skimming the chart.

## Testing

See the README's Testing section for how to run the suite and what it covers. One addition for contributors: tests render `<App />` against MSW-mocked responses (`test/handlers.ts`, fixtures in `test/coins-fixtures.ts`) rather than mocking hooks or components — if you add a new API call, add a handler for it, or the default `onUnhandledRequest: 'error'` setup (`test/setup.ts`) will fail any test that triggers it, including ones that don't otherwise touch your feature.
