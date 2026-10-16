# Python streaming integration

Python 3.10+, no dependencies. Add `pipeline` to your module path:

```python
from rough_alpha import RoughPathIndicator, Microstructure, ReadRouter

indicator = RoughPathIndicator(window=32)
# In your ordered tick loop, snapshot is None until all inputs are measured.
snapshot = Microstructure(
    t=tick_ms, oi_long=long_notional, oi_short=short_notional,
    long_growth=long_growth_fraction,
    spot_delta=aggressive_buy_notional - aggressive_sell_notional,
    spot_volume=aggressive_buy_notional + aggressive_sell_notional,
    funding=long_funding_decimal_per_hour,
    spot_at=spot_timestamp_ms, oi_at=oi_timestamp_ms,
    funding_at=funding_timestamp_ms,
)
output = indicator.update(tick_ms, price, snapshot)
# Your strategy may read output['upper'], ['lower'], ['risk'], ['ready'].
# Gate execution separately on fresh quotes, valid feeds and risk limits.
router = ReadRouter()
public_data = router.get('https://backend-polygon.gains.trade/open-trades')
```

`Microstructure.long_growth` is a fraction against an earlier authoritative
long-OI snapshot; OI levels alone cannot establish accumulation. Keep venue,
chain, product, units and baseline stable. Do not mix spot maker/taker side
conventions. `risk` is bounded heuristic pressure, not a calibrated probability.
The Python stream shares Android's feature/deadband/skew equations for equal
feature/band windows; it exposes structural score without the chart's OLS
projection adjustment. Android's native Java/WebView modules implement the
WebSocket recovery lifecycle; Python ReadRouter covers HTTPS JSON reads only.
Neither module submits orders or accepts private keys.

Run `python3 -m unittest discover -s pipeline -v`.
