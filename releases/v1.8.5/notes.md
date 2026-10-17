v1.8.5 makes candles readable and adds explicit price projections

- Candle-focused auto scale; distant entries/liquidations, synthetic gaps and extreme indicator projections cannot flatten actual prices.
- Candles render above indicator fills, trade labels and forecast overlays with contrasting bodies/wicks.
- Horizontal chart panning keeps prices fitted. Saved vertical offsets are cleared; stale historical offsets clamp to available data. Latest / fit remains visible.
- Separate LONG and SHORT cards show projected price move in dollars and percent, target prices and the visible horizon. These are unlevered model estimates before fees.
- Distinct light-blue prediction line anchored to the current candle close; existing channel projections retained.
- Forecast/status cards and transient trade/download notices no longer cover the candle plot.
- The chart and positions stay visible together, with saved draggable panel sizes.

Validated with low-leverage positions, extreme overlay ranges, topmost candle paint order, vertical drag and stale-pan recovery, model scenario arithmetic, three mobile layouts, native Java/Python/JS regressions and the existing release certificate. Android installation and WebView instrumentation remain required before publication.
