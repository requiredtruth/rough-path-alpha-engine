Adds an upper/lower volatility channel and dotted forward projection to the Rough Path trading terminal.

- Solid gold/rose borders, subtle channel fill and dotted center/border extensions with widening uncertainty.
- Expanded exhaustive parameter search: channel lookback/width, projection slope window/horizon/weight plus existing signature and noise parameters.
- The backtester uses the same causal channel/projection signals as the chart. Training/validation select parameters; holdout remains excluded.
- Best eligible parameters automatically update the chart by default, with an option for manual application.
- Visibility switches, correct spacing when chart candles aggregate, no forward projections while panning old data, and channel-aware price scaling.

Install over v1.0.0; signing certificate and saved wallet/data identity are retained. APK, source.zip and spec.md included. Projection lines extrapolate past structure and are not future market data.
