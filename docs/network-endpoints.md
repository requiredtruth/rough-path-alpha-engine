# Verified market-data routes — 2026-10-16

Read-only audit: 133 DNS, HTTPS, subscribed WebSocket and RPC checks. [Raw observations](network-audit-2026-10-16.json). Availability is observed at test time. HTTP success alone does not establish quote freshness or complete input coverage.

Configured Gains reads try `.trade`, fall back to the same service on `.dev`, and probe the primary after 60 seconds. The current audit found `.trade` TLS/socket resets, working `.dev` services below, and no DNS record for the old `.dev` pricing subdomains. The app now uses the verified API pricing service rather than guessing another pricing hostname.

| Data | Working route | Validation |
|---|---|---|
| Arbitrum market registry | `https://api.gains.dev/v1/arbitrum/markets` | 488 rows; explicit unique symbol/pairIndex mapping |
| Arbitrum current prices | `https://api.gains.dev/v1/arbitrum/prices` | Numeric-string mark/index; reject unknown symbols and rows at least 5 seconds old |
| Arbitrum price stream | `wss://api.gains.dev/v1/arbitrum/ws` | Subscribe `{"op":"subscribe","channel":"prices"}`; answer `op:ping` with `op:pong`; parse per-row updatedAt |
| Arbitrum candles | `https://api.gains.dev/v1/arbitrum/markets/BTC%2FUSD/candles?interval=1m&from=MS&to=MS` | Actual OHLC rows; timestamps in milliseconds; BTC-USD alias also works |
| Arbitrum current funding | `https://api.gains.dev/v1/arbitrum/markets/BTC%2FUSD/funding` | Verify returned market; finite signed hourly funding and nonnegative borrowing |
| Chain metadata | `https://backend-{arbitrum,polygon,base}.gains.dev/trading-variables/collaterals,pairs` | Chain-local collateral precision, USD prices and pair identity |
| Full chain variables | Same chain hosts, `/trading-variables/all` | Valid current schema; used for liquidation research |
| Registry/leverage discovery | Same chain hosts, `/trading-variables/pairs,groups,pairInfos` | Pair/group and leverage data present |
| Open trades/OI | Same chain hosts, `/open-trades` | Arbitrum 999, Polygon 55, Base 447 rows in audit; notional normalized per collateral |
| Public chain streams | `wss://backend-{arbitrum,polygon,base}.gains.dev` | Real `name/value` events, including currentBlock |
| Recent public history | `https://backend-global.gains.dev/api/trading-history/24h?chainId=ID` | Arrays for 42161, 137 and 8453; distinct chain identities retained |
| Coinbase spot flow | `wss://ws-feed.exchange.coinbase.com` | BTC-USD matches/heartbeat subscription; real timestamped prints |
| Kraken spot flow | `wss://ws.kraken.com/v2` | trade subscription for BTC/USD; source timestamps checked; snapshot alone is not warmed CVD |
| Coinbase history | `https://api.exchange.coinbase.com/products/BTC-USD/candles` | Actual 60-second and 3600-second candles with explicit start/end |
| Coinbase tick history | Same product, `/trades?limit=2` | Actual trade IDs, price, size, side and time |
| Polygon RPC | `https://polygon-bor-rpc.publicnode.com`, WSS equivalent | chainId `0x89` |
| Polygon RPC fallback | `https://polygon.drpc.org` | chainId `0x89`; block number; 2227-byte deployed Diamond code |
| Arbitrum RPC | `https://arbitrum-one-rpc.publicnode.com`, WSS equivalent | chainId `0xa4b1` |
| Base RPC | `https://base-rpc.publicnode.com`, WSS equivalent | chainId `0x2105` |

## Unavailable and stale inputs

- `/v1/polygon/*` and `/v1/base/*` current-market API routes returned 404. Their separate legacy chain backends above work for OI and trade events.
- Chain-local `/api/holding-rates/{collateral}/{pair}` returned 404; removed from runtime attempts.
- Global `/api/holding-rates/3/0?chainId=42161` and `chainId=137` returned history whose last source time was hours old. Base returned an empty history. Historical receipt time cannot make those rates fresh; no zero funding is invented.
- `polygon-rpc.com` returned 401 and is no longer the configured RPC fallback. An OnFinality candidate returned 429 and was not selected.
- Polygon live orders require verified Polygon oracle quotes. Arbitrum quotes feed the chart and paper simulation; they do not authorize Polygon execution.

Version 1.8.1 additionally derives explicitly labeled collateral-specific SDK estimates from fresh chain variables and a fresh Arbitrum underlying-price reference. Global funding history remains excluded. Estimate coverage can reach 100% without claiming that missing exchange-reported rates became available. Missing or expired estimates keep deformation neutral. Spot CVD requires two minutes without detected gaps plus recent actual trades. The underlying Rough Path chart continues while those inputs warm up or remain unavailable.

## Reproduce

Run `node tools/audit-network.cjs` for the full route inventory, then `node tools/verify-price-pipeline.cjs` for the production adapter's real REST + subscribed WSS + candle release gate. Reports go to `build/network-audit.json` and `build/price-pipeline.json`. The release workflow also runs native parsing/ledger regressions, mobile rendering, error-only and reentrant socket failures, fallback/recovery, panel stability, signed package checks and Android installation/background tests. No test sends orders or loads a wallet key.

Schema reference: official Gains API SDK, https://github.com/GainsNetwork-org/gains-api-sdk . Runtime adapters are original integration code using its public wire protocol.
