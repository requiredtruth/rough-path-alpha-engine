# Rough Path Alpha Engine v1.8.7

- Options dialog beside Bot with saved allocation, leverage, hedging, Chandelier ATR period/multiplier and minimum net profit.
- Default mode now tiles individual long and short positions simultaneously; opposite arrows do not close existing tiles. Entries skip when free cash cannot cover the allocation.
- Per-position Chandelier trails close only for net profit after saved fees, spread and holding costs. Liquidation remains active and can lose collateral.
- Completed one-minute Wilder ATR, monotonic long/short stops, native exits during monitoring, chart CE lines and position trail status.
- Apply exit settings to existing bot positions, or keep their individual saved settings. Manual positions remain unchanged.
- Defaults remain 10% equity / 500×, now with 14-period ATR × 3 profit exits and both-direction tiling enabled.
- APK preserves the previous signing certificate; includes source ZIP, spec and checksums.
