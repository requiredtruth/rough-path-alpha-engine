# Rough Path Alpha Engine — v1.0.0

## Installation and identity
Signed Android APK, package `com.roughpath.alpha`, Android 8.0/API 26 minimum, API 35 target. Android 10+ supports direct report export to Downloads. Install RoughPathAlpha.apk from the GitHub release. It installs alongside TwinTrade. No account or subscription is needed for market data or backtesting. Live execution requires a funded Polygon wallet with native USDC collateral and POL gas.

## Terminal and execution
The terminal retains the tested TwinTrade main revision 85bc329b2dbd4dd70c95ed4b6cdd4d666446ffc1 foundation: native price monitor, background paper ledger, secure local key storage, market discovery, WebSocket reconnection, chart pan/zoom/time labels, public position/liquidation overlays, fee-aware PnL, history, sounds, account portfolio and order reconciliation. It also reuses MobileTrader's resumable Coinbase history module.

Gains v4 price feed: `wss://backend-pricing.eu.gains.trade/v4`. Mark and index prices remain distinct. Mark prices drive PnL; index prices are used for liquidation calculations. Live price frames reject stale, future, malformed and out-of-order samples. The native foreground monitor continues when user-enabled; notifications and battery permissions are handled by Android. Turning off the monitor stops background prices. WebView state is retained across app switching; OS process termination may restart the page.

Polygon chain 137. Trading Diamond `0x209A9A01980377916851af2cA075C2b170452018`; native USDC `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`, six decimals. Long/short orders use exact collateral percentage, current oracle prices, on-chain market/collateral/trading-state checks, exact-token approvals and reviewed signing. Transaction broadcast and oracle execution are different states; pending orders reconcile from receipts and confirmed resulting positions. Signing key storage uses Android Keystore AES-GCM; decrypted keys are used by bundled Ethers signing code while loaded. No keys are stored in source or releases.

Execution leverage uses current protocol limits, with three decimal precision. The Bitcoin terminal routes leverage exceeding regular BTC limits to BTCDEGEN when allowed. Static fallback minimum is 1.1x; current on-chain group minimum/maximum takes precedence. **1x–500x is available in the research simulator; live orders cannot bypass gTrade's actual market restrictions.** No automatic live trades are sent by the indicator or optimizer.

PnL subtracts trading fees, borrowing, signed funding and estimated close fees where on-chain fee information is available. Unknown fee/PnL fields show unavailable instead of a fabricated number. Stats and position cards expose collateral, notional, leverage, entry and liquidation levels, holding rates and account available equity. Paper assumptions are editable estimates. Gas, oracle skew, historical fee tiers and market impact are not reconstructed by the backtester.

## Rough Path indicator
The turquoise line and signal strip overlay the selected market. Parameters are persisted per app: rolling sample window, score threshold, efficiency gate, signature area weight and smoothing gain. Defaults: window 32, threshold 0.8, efficiency 0.1, area weight 1, gain 0.18.

For each rolling time/log-price path, level-2 signatures are computed with Chen concatenation for piecewise linear increments. For a segment increment d, S2 += S1 tensor d + 0.5 d tensor d, then S1 += d. The antisymmetric area is (S12−S21)/2. Time is normalized within the window. Prefix sums compute this rolling area in O(1) per sample. A lead–lag lift's area magnitude equals half the summed squared log-price increments. This quadratic variation normalizes directional return and area; efficiency equals absolute net log return divided by total absolute log variation.

Raw score = log return / sqrt(quadratic variation) + areaWeight * area / sqrt(quadratic variation). A causal exponential filter with the smoothing gain filters the score. A long/short signal requires both the efficiency gate and score threshold; otherwise neutral. The displayed price line uses a gated exponential smoother, with a much smaller gain during noisy periods. Warmup and gaps reset the features. Placeholder chart gap fills are excluded from indicator data. No future samples enter the live indicator or past features.

This is an original practical indicator inspired by rough-path signatures. It is not a proof that noise filtering yields profitable alpha. The signal and turquoise line are research outputs, not an exact solution of a stochastic differential equation.

## Historical data
Research screen: Rough α button near Stats. Select UTC from/until dates, exclusive until. Last year defaults to 365 completed days, last week to seven. Coinbase Exchange BTC-USD one-minute OHLCV uses 200-bucket pages below the 300-bucket API limit. Typical year: approximately 525,600 samples and 2,628 pages. Leap-year full-calendar data can have 527,040 samples. One book supports 600,000 minute buckets; split larger studies into separate date ranges. The app downloads data itself; no year-sized dataset is bundled.

Each page is normalized, sorted, deduplicated and committed to IndexedDB before checkpoint progress advances. Pausing or interruption leaves committed pages reusable. HTTP transient failures retry with exponential backoff; permanent HTTP 400/401/403/404 fails visibly. Empty or incomplete candle windows are counted as unavailable rather than filled. Retry missing candles deletes sparse cached pages and refetches them. Interrupted jobs resume by pressing Download / resume with the same dates. UI downloads and workers run while the app remains active; Android may suspend or kill research work in the background. Reopen and resume cached downloads. Completed results and the last valid data range, grid and cost settings persist.

Actual Coinbase trade ticks use `/products/BTC-USD/trades?limit=1000&after=...` with the oldest trade ID as the pagination cursor. Pages and cursor are checkpointed separately in the same cache. Tick IDs deduplicate samples; equal timestamps retain deterministic trade ordering. Downloads stop after crossing the requested start. API errors, archive exhaustion or non-advancing cursors remain visible; partial data is not labeled complete. Since this API walks backward from the latest trades, older dates can require substantial download time and storage. Tick optimization is capped at 1.1 million samples per book. A year of candles and a year of ticks have very different resource requirements; choose shorter tick books. Candle data is always labeled candles, not ticks.

JSON OHLCV import: array of `{t,o,h,l,c,v}`, timestamp in milliseconds, sorted unique timestamps, valid positive OHLC, rows within the selected date interval, max 32 MB per imported file. Android system file picker is used. No synthetic historical prices are inserted.

## On-device optimizer and simulator
Dedicated Web Worker keeps the terminal responsive. Packed transferable Float64 sample buffers avoid cloning all candle objects into the worker. Rolling features are reused across candidates sharing a window. Grids accept up to 20 comma-separated values per dimension and at most 512 candidates. Default grid has 162 candidates. Pause/cancel terminates optimization immediately; completed reports are retained.

Chronological splits: first 60% training, next 20% validation, final 20% holdout. Each split begins with fresh simulation cash and no position. Prior samples may warm up features, but no positions carry across splits. Candidates are ranked by min(training ROI − 1.5 * drawdown, validation ROI − 1.5 * drawdown), with at least five trades in both selection splits. Final holdout is evaluated only after selecting the best candidate. Repeated human tuning after inspecting holdout invalidates its status as untouched.

Signals from sample i act at sample i+1 open. Position size is an editable percentage of current cash, with one position at a time; neutral or reversed signal closes the position. Leverage ranges from 1x to 500x. Editable opening/closing fee and adverse slippage apply to notional, plus time-based borrowing and signed funding. Intracandle high/low triggers the estimated liquidation threshold, with adverse gap-open handling. Position loss is capped at collateral. Entry costs that already breach liquidation are skipped. Missing minute gaps above 90 seconds or tick gaps above five minutes close positions at the last available price and reset indicator features. This explicitly assumes liquidation at last quote for gap separation, not knowledge of prices within the gap. OHLC cannot reconstruct the complete ordering of intraminute prices.

Report: ROI, max drawdown, trades, win rate, fees, holding cost, profit factor, candidate parameters, selection score, chronological date splits, gaps, skipped costly entries and holdout equity curve. Export JSON to Downloads. Apply selected indicator copies eligible parameters to the live chart; it does not place orders. Automatic optimization after download is enabled by default and can be disabled.

## Validation and limits
`./test.sh`: JS syntax, mathematical signature identities, direct-vs-prefix area, causality, smoothing, fees/slippage/funding, gap resets, deterministic backtests, leverage validation, real year pagination, native ledger and price parser regressions. `npm run test:browser`: portrait/landscape terminal, chart overlay, data cache, dedicated worker optimization and report rendering using controlled data. GitHub Actions installs the signed APK on Android 15, checks page readiness, app switching and process restart, verifies signature/alignment/checksums and publishes release assets only if required checks pass.

`reports/year-benchmark.json` is a synthetic computational capacity benchmark, not evidence of profitable live performance. Network probes are read-only. Live funded transactions are not executed during development. Device GPU computation is not used; optimization is CPU-based. IndexedDB quota depends on device/WebView free storage. Actual tick history availability is determined by Coinbase. Price/API/chain availability is external.

## Build and release
JDK 17+, Android SDK platform 35/build-tools 35.0.0, Python 3, zip and Node 22. `install.sh` sets up SDK tooling; `build.sh` builds, aligns and signs the APK. Restore private signing key to `build/signing.jks`, never commit it. Default signing password `android`; alternate password source via RP_KEYSTORE_PASS (apksigner syntax, e.g. env:NAME). `run.sh` serves the local web app on 127.0.0.1:8765, so workers and IndexedDB work on a regular HTTP origin.

Main branch is the development and release branch. Release v1.0.0 includes RoughPathAlpha.apk, source.zip, spec.md and SHA256SUMS. Private signing material stays outside Git and source archives.

## Primary references
- https://docs.gains.trade/developer/integrators/guides/mark-%2B-index-introduction
- https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles
- https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-trades
- https://arxiv.org/abs/1307.7244
