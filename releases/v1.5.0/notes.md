Rough Path Alpha v1.5.0 — full-spectrum indicator data

- Arbitrum, Polygon and Base all contribute to the visible Rough Path chart bands and corresponding dotted projections. Funding is weighted by actual long USD exposure, so larger venues have greater influence.
- All priced collateral types participate through chain-local precision/USD metadata and symbol/pair-ID mapping. Collateral repricing alone is excluded from OI accumulation. Regular + DEGEN variants are combined by underlying asset.
- Continuous Coinbase and Kraken spot trade streams replace the 100-trade sample. Maker/taker signs, trade-ID deduplication/gaps, heartbeat checks, bounded two-minute buckets and reconnect warmup protect CVD quality.
- Main-chart coverage label and Rough α per-chain USD table expose stale/missing chains, unpriced collateral, spot venues and funding coverage. Unknown inputs stay neutral rather than being invented.
- Includes v1.4 geometric signature/deadband center and gains.trade/gains.dev HTTPS/WebSocket failover with primary recovery. Python streaming and multi-chain modules are included in source ZIP.
- Original signing certificate retained, Android versionCode 6. Rerun older optimizer reports before applying settings.

Validation: signature/skew/failover regressions; three-chain all-collateral normalization, chain-specific IDs, DEGEN aggregation, collateral repricing, OI-weighted funding, partial coverage and spot gap/warmup tests; Python/Android math parity; portrait/landscape chart and actual worker browser tests. Android 15 install/update, app switching, restart and WebView worker instrumentation must pass the release workflow before publication. External feed availability remains outside application control. Full configured coverage is three chains and two spot venues, not every global exchange. No funded trades sent.
