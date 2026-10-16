Network recovery and clearer Rough Path indicators

- Log button shows endpoint errors, retries, native/WebView transport state, byte downloads, history page progress and CVD warmup; export a bounded redacted JSON log.
- Native HTTPS data bridge avoids WebView CORS failures. Gains .trade/.dev routing and primary recovery remain active, with timestamp-verified HTTPS price recovery when sockets stall.
- Bounded two-second source-clock tolerance; stale quotes still pause orders. Old snapshots cannot be stamped as fresh candles.
- Arbitrum, Base and Polygon funding use local and global routes; missing funding remains visibly unavailable.
- Stronger signature/skew bands, independent metric and structural-score strip, optional compact public labels with all trade lines retained.
- Real Coinbase spot candles can repair history outages with explicit source labels and cannot overwrite Gains candles.
