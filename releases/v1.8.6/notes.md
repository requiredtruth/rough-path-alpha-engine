# Rough Path Alpha Engine v1.8.6

- Bot button next to Close: green arrows buy long, red arrows sell short; opposite arrows close bot positions before reversing.
- Every new confirmed arrow allocates 10% of current total paper equity at 500×, with same-side stacking and free-cash checks.
- Bot positions use your paper wallet and show in Positions, History and the chart with normal P&L, entry and liquidation lines.
- Real saved paper fees, slippage and holding estimates; native liquidation monitoring; no wallet signing or live transactions.
- Confirmed candle arrows only; no replay on start or duplicated refresh orders. Stop bot leaves positions available for manual management.
- Bot runs with the terminal visible; app restart leaves it off. Unsupported/stale markets show a reason. BTC 500× follows the configured BTCDEGEN execution route.
- Includes APK, source ZIP, specification and checksums; preserves the existing release signing certificate.
