Rough Path Alpha v1.4.0

- Main chart uses level-2 time/log-price signatures and a geometric deadband center instead of EMA smoothing. Gold/rose envelopes and dotted projections visibly deform from fresh spot-flow weakness, growing Polygon long OI, and funding pressure.
- Missing/stale inputs stay neutral. OI is Polygon-specific; spot flow is a sampled Coinbase proxy. Pressure is a heuristic score, not a liquidation probability.
- Read-only gains.trade → gains.dev failover covers HTTPS, foreground/multi-chain WebSockets, native background prices, and history. Working secondary streams remain active while primary recovery probes wait for valid fresh data.
- Modular Python streaming signature/skew engine and HTTPS router included in source ZIP under pipeline/.
- Updated signal semantics: structural score, efficiency and matching geometric-center residual replace the former EMA-lag channel breakout. Rerun old optimization reports before applying parameters.
- Original signing certificate retained; Android versionCode 5.

Validation: JS/native regressions, Python unit tests, controlled WebSocket failover/recovery tests, mobile/landscape browser chart and optimizer tests, APK signature/alignment checks. Android 15 installation/restart and actual WebView worker instrumentation run in the release workflow before asset publication. Both live API domains returned errors from the build environment; external service recovery was not independently verified. No funded orders were sent.
