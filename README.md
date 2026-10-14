# Rough Path Alpha Engine

Android gTrade terminal with a causal Rough Path signature indicator, live Bitcoin chart and an on-device parameter optimizer.

[Download APK, source.zip and spec.md](https://github.com/requiredtruth/rough-path-alpha-engine/releases/latest)

1. Install **RoughPathAlpha.apk** (Android 8+).
2. Use **Rough α** next to Stats to download Coinbase BTC one-minute data. Last year downloads about 525,600 candles; Download / resume preserves cached progress.
3. Edit parameter lists and simulation costs. The optimizer uses chronological training/validation plus an untouched holdout. Apply selected indicator updates the live chart.
4. Paper trading starts with $100. For live orders, configure a funded Polygon wallet in Settings and switch to LIVE. Orders require review and follow actual protocol leverage limits. Research supports 1x–500x; static live minimum is 1.1x until discovery reports otherwise.

Actual trade-tick pagination is also available. Tick history is much larger than candles; optimization caps each tick book at 1.1 million samples. The app never labels candles as ticks, never invents missing samples and never sends automated live orders from research signals.

## Build

JDK 17+, Node 22+, Android platform 35/build-tools 35.0.0. Run `./install.sh`, restore your private signing key into `build/signing.jks`, then `./build.sh`. `./test.sh` runs mathematical and native regression tests. `npm ci && npm run test:browser` runs mobile UI/worker tests. `./run.sh` opens the web terminal served locally.

Source foundation: requiredtruth/twintrade main 85bc329b2dbd4dd70c95ed4b6cdd4d666446ffc1 and requiredtruth/mobile-trader resumable history module. See THIRD_PARTY_NOTICES.md and [spec.md](spec.md) for formulas, endpoints, assumptions and validation scope.
