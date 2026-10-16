# Rough Path Alpha Engine v1.8.1

Main chart: geometric signature center, gold/rose envelopes with live Arbitrum/Polygon/Base OI and funding plus continuous Coinbase/Kraken spot-flow deformation, and matching dotted projections. Gains reads and streams automatically fail over between gains.trade and gains.dev and probe for primary recovery. Missing live inputs keep skew neutral.

Python integration: [pipeline/README.md](pipeline/README.md). Full behavior and data limitations: [spec.md](spec.md).

# Rough Path Alpha Engine

Android gTrade terminal with a causal Rough Path signature indicator, live Bitcoin chart, upper/lower channel borders, dotted forward projections extended 3× along their own counterparts and an on-device parameter search.

[Download APK, source.zip and spec.md](https://github.com/requiredtruth/rough-path-alpha-engine/releases/latest)

1. Install **RoughPathAlpha.apk** (Android 8+).
2. Zoom offers calendar **1 month** and **6 months** charts with cached hourly history. Use **Rough α** next to Stats to download Coinbase BTC one-minute data. Month/six-month research presets and Last year are available; Last year downloads about 525,600 candles; Download / resume preserves cached progress.
3. Search indicator settings, **1–500x leverage** and **collateral %** using lists or `min:max:step` ranges. Choose exhaustive grid, seeded random, simulated annealing or hybrid. **Huge search preset** explores a broad space with 100,000 evaluations; budgets support up to 1,000,000 unique candidates per run. Entire-space search requires the budget to cover the displayed finite count. Edit simulation costs. The optimizer uses chronological training/validation plus an untouched holdout. The best eligible parameters update the live chart automatically by default, or use Apply selected indicator. Channel and projection settings participate in backtest signal generation.
4. Paper trading starts with $100 using verified Arbitrum prices. Polygon live submission is blocked while its own oracle feed is unavailable; Arbitrum prices are not substituted for Polygon execution quotes. Research supports 1x–500x; static live minimum is 1.1x until discovery reports otherwise.

Actual trade-tick pagination is also available. Tick history is much larger than candles; optimization caps each tick book at 1.1 million samples. The app never labels candles as ticks, never invents missing samples and never sends automated live orders from research signals.

## Build

JDK 17+, Node 22+, Android platform 35/build-tools 35.0.0. Run `./install.sh`, restore your private signing key into `build/signing.jks`, then `./build.sh`. `./test.sh` runs mathematical and native regression tests. `npm ci && npm run test:browser` runs mobile UI/worker tests. `./run.sh` opens the web terminal served locally.

Source foundation: requiredtruth/twintrade main 85bc329b2dbd4dd70c95ed4b6cdd4d666446ffc1 and requiredtruth/mobile-trader resumable history module. See THIRD_PARTY_NOTICES.md and [spec.md](spec.md) for formulas, endpoints, assumptions and validation scope.

v1.6 adds a **Log** button for endpoint health, retry errors, download progress, CVD warmup and redacted JSON export. Native public-data HTTPS recovery handles WebView CORS restrictions and stalled sockets without marking stale prices fresh. The chart has a separate indicator strip and compact public labels (Settings → Chart labels); every trade line remains available. Arbitrum funding uses the current market API; Polygon/Base historical rates require source timestamps under three minutes old. Missing funding keeps skew neutral. Coinbase spot history fallback is explicitly labeled.

Panel controls: **−** minimizes, **+** restores, and **Max** assigns spare space to that panel while returning the others to default sizes. Minimize other panels afterward for additional room. **Reset** returns to normal sizing. Layout survives restart and rotation; Settings → Reset panel sizes restores everything. Market feeds and background monitoring continue while panels are minimized.

Automatic gap backfill pauses when you have no open position in that market family; amber placeholders are hidden while flat. Initial chart history still loads. Host lights show current health, keep the last HTTP failure visible, and sort by host rather than last update. Event history stays still until **Refresh events**; **Live follow** is optional and **Freeze view** lets you read any snapshot.

v1.7.1 fixes repeated backfill status text and toolbar wrapping that made the chart bounce. Status is generated from a clean per-market value; toolbar actions stay on one line and the plot keeps its allocated geometry during routine status/rate updates.

Version 1.8.0 replaces the unavailable legacy pricing hostname with the verified `/v1/arbitrum` API: registered symbols, independent mark/index values, per-market timestamps, subscribed WebSockets with ping/pong, HTTPS recovery and automatic `.trade`/`.dev` routing. Chart history tries Arbitrum first. `tools/audit-network.cjs` inventories DNS, exact HTTPS routes, WebSocket subscriptions and RPC chain IDs. `tools/verify-price-pipeline.cjs` gates release on real fresh registered BTC prices over both transports and real candles. Audit results describe provider availability at test time, not a future uptime guarantee.

[Verified endpoint inventory and current coverage limits](docs/network-endpoints.md).

Version 1.8.1 makes Log native reads asynchronous, bounds the rendered lists and recovers the Activity after a WebView renderer exit. Android QA repeatedly opens/closes Log under saturated telemetry. Fresh collateral-specific funding/borrowing estimates now use the already bundled Gains SDK and chain-local `/trading-variables/all` state across Arbitrum, Polygon and Base. Estimates use a fresh Arbitrum reference price, are labeled in the indicator and paper costs, expire with their source data, and do not authorize Polygon live execution. Full estimate coverage is distinct from exchange-reported funding coverage.
