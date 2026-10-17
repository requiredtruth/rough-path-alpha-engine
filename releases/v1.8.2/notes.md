v1.8.2 fixes connection routing and price recovery

- Use verified Gains .dev API/chain/global hosts first; retain .trade fallback and share HTTPS/WebSocket host health.
- Keep market prices on an independent Android network queue; recover BTC/ETH from HTTPS when those quotes are stale.
- Handle subscription acknowledgements without false price-frame errors.
- Preserve Coinbase CVD warmup across out-of-order heartbeat delivery; show receiving vs ready venues separately.
- Funding estimate warnings no longer mark working endpoint hosts as failed.
- Compile the complete Android source tree, verify the existing release certificate, run regression/mobile tests and live read-only feed checks.

Spot indicators require two continuous minutes of trades after connection or an actual gap. Existing cached data is retained during connection recovery.
