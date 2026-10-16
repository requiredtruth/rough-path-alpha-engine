# Rough Path Alpha Engine v1.4.0

Main chart: geometric signature center, gold/rose envelopes with live OI/spot/funding deformation, and matching dotted projections. Gains reads and streams automatically fail over between gains.trade and gains.dev and probe for primary recovery. Missing live inputs keep skew neutral.

Python integration: [pipeline/README.md](pipeline/README.md). Full behavior and data limitations: [spec.md](spec.md).

# Rough Path Alpha Engine

Android gTrade terminal with a causal Rough Path signature indicator, live Bitcoin chart, upper/lower channel borders, dotted forward projections extended 3× along their own counterparts and an on-device parameter search.

[Download APK, source.zip and spec.md](https://github.com/requiredtruth/rough-path-alpha-engine/releases/latest)

1. Install **RoughPathAlpha.apk** (Android 8+).
2. Zoom offers calendar **1 month** and **6 months** charts with cached hourly history. Use **Rough α** next to Stats to download Coinbase BTC one-minute data. Month/six-month research presets and Last year are available; Last year downloads about 525,600 candles; Download / resume preserves cached progress.
3. Search indicator settings, **1–500x leverage** and **collateral %** using lists or `min:max:step` ranges. Choose exhaustive grid, seeded random, simulated annealing or hybrid. **Huge search preset** explores a broad space with 100,000 evaluations; budgets support up to 1,000,000 unique candidates per run. Entire-space search requires the budget to cover the displayed finite count. Edit simulation costs. The optimizer uses chronological training/validation plus an untouched holdout. The best eligible parameters update the live chart automatically by default, or use Apply selected indicator. Channel and projection settings participate in backtest signal generation.
4. Paper trading starts with $100. For live orders, configure a funded Polygon wallet in Settings and switch to LIVE. Orders require review and follow actual protocol leverage limits. Research supports 1x–500x; static live minimum is 1.1x until discovery reports otherwise.

Actual trade-tick pagination is also available. Tick history is much larger than candles; optimization caps each tick book at 1.1 million samples. The app never labels candles as ticks, never invents missing samples and never sends automated live orders from research signals.

## Build

JDK 17+, Node 22+, Android platform 35/build-tools 35.0.0. Run `./install.sh`, restore your private signing key into `build/signing.jks`, then `./build.sh`. `./test.sh` runs mathematical and native regression tests. `npm ci && npm run test:browser` runs mobile UI/worker tests. `./run.sh` opens the web terminal served locally.

Source foundation: requiredtruth/twintrade main 85bc329b2dbd4dd70c95ed4b6cdd4d666446ffc1 and requiredtruth/mobile-trader resumable history module. See THIRD_PARTY_NOTICES.md and [spec.md](spec.md) for formulas, endpoints, assumptions and validation scope.
