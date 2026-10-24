Restores Twintrade-compatible network and trading behavior.

- Native and foreground prices use the working Gains v4 oracle directly, without a blocking REST registry dependency.
- Supports flat oracle arrays and independent mark/index object frames; native index quote freshness is fixed.
- Removes the Arbitrum-only guard that blocked every Polygon live order. Fresh quote, wallet, collateral and on-chain checks remain.
- Production Polygon/Arbitrum/Base backends are preferred for public trades; fallback and reconnect remain.
- Holding estimates use the live oracle; chart snapshots cannot make stale quotes tradable.
- APK uses the existing signing certificate and version code 23.

Validation: native/JS/Python regressions, mobile browser suite, real oracle and three-chain backend/funding probes. Android emulator startup, upgrade and native quote/Worker checks run before publication. No live transactions are broadcast by QA.
