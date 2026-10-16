"""Bounded streaming Rough Path Alpha building blocks, Python 3.10+.

No execution or key custody. Inputs must be delivered in event-time order.
Prices use log coordinates. Truncated signatures summarize geometry; neither
truncation nor a causal deadband can guarantee removal of all market noise.
"""
from collections import deque
from dataclasses import dataclass
import json
import math
import time
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen


class Signature2:
    """Degree-two tensor signature; Chen concatenation and prefix removal."""
    def __init__(self):
        self.first = [0.0, 0.0]
        self.second = [[0.0, 0.0], [0.0, 0.0]]

    def append(self, d):
        for i in range(2):
            for j in range(2):
                self.second[i][j] += self.first[i] * d[j] + d[i] * d[j] / 2
        for i in range(2):
            self.first[i] += d[i]

    def remove_prefix(self, d):
        rest = [self.first[i] - d[i] for i in range(2)]
        for i in range(2):
            for j in range(2):
                self.second[i][j] -= d[i] * rest[j] + d[i] * d[j] / 2
        self.first = rest

    @property
    def area(self):
        return (self.second[0][1] - self.second[1][0]) / 2


@dataclass(frozen=True)
class Microstructure:
    t: int
    oi_long: float
    oi_short: float
    long_growth: float  # fraction, measured against an earlier snapshot
    spot_delta: float  # aggressive buy minus sell notional
    spot_volume: float  # same venue/window/unit as delta
    funding: float  # decimal per hour; positive = longs pay
    spot_at: int
    oi_at: int
    funding_at: int


def deform(center, width, observation, at):
    """Return upper, lower, bounded long-cascade pressure, data-valid flag."""
    if not math.isfinite(center) or center <= 0 or not math.isfinite(width) or width < 0:
        raise ValueError('Invalid center/width')
    neutral = center + width, max(1e-9, center - width), 0.0, False
    s = observation
    if s is None or not all(math.isfinite(v) for v in vars(s).values()):
        return neutral
    if (any(t > at or at - t > 120_000 for t in (s.t, s.spot_at, s.oi_at, s.funding_at))
            or min(s.oi_long, s.oi_short) < 0 or s.oi_long + s.oi_short <= 0
            or s.spot_volume <= 0 or abs(s.spot_delta) > s.spot_volume * 1.000001):
        return neutral
    clip = lambda x: max(0.0, min(1.0, x))
    risk = clip(-s.spot_delta / s.spot_volume) * clip(
        (s.oi_long - s.oi_short) / (s.oi_long + s.oi_short)) * clip(
        s.long_growth / .02) * (.5 + .5 * clip(s.funding / .00001))
    return center + width * (1 - .8 * risk), max(1e-9, center - width * (1 + .5 * risk)), risk, True


class RoughPathIndicator:
    """O(1) work per tick, O(window) memory, no EMA convolution.

    Uses the same time/log-price area, efficiency, volatility and deadband
    equations as the Android chart. Supply snapshots known at that tick.
    Envelope pressure is a heuristic score, never a calibrated probability.
    """
    def __init__(self, window=32, band_mult=1.5, rejection=.82, area_weight=1.0,
                 max_gap_ms=90_000):
        if not isinstance(window, int) or not 4 <= window <= 2048:
            raise ValueError('window must be 4..2048')
        if not all(math.isfinite(x) for x in (band_mult, rejection, area_weight, max_gap_ms)):
            raise ValueError('Non-finite parameter')
        if band_mult <= 0 or not 0 <= rejection <= 1 or max_gap_ms <= 0:
            raise ValueError('Invalid parameter')
        self.window, self.band_mult, self.rejection = window, band_mult, rejection
        self.area_weight, self.max_gap = area_weight, max_gap_ms
        self.previous = None
        self.level = None
        self._clear()

    def _clear(self):
        self.path = Signature2()
        self.increments = deque()
        self.qv = self.variation = 0.0

    def update(self, t, price, observation=None):
        if not math.isfinite(t) or t <= 0 or not math.isfinite(price) or price <= 0:
            raise ValueError('Positive finite timestamp and price required')
        if self.previous and t <= self.previous[0]:
            raise ValueError('Duplicate or out-of-order tick')
        log_price = math.log(price)
        if self.previous and t - self.previous[0] <= self.max_gap:
            d = (float(t - self.previous[0]), log_price - self.previous[1])
            if len(self.increments) == self.window:
                old = self.increments.popleft()
                self.path.remove_prefix(old)
                self.qv -= old[1] ** 2
                self.variation -= abs(old[1])
            self.path.append(d)
            self.increments.append(d)
            self.qv += d[1] ** 2
            self.variation += abs(d[1])
        else:
            self._clear()
            self.level = price
        self.previous = (t, log_price)
        if len(self.increments) < self.window:
            self.level = price
            return dict(t=t, center=price, upper=price, lower=price, ready=False, risk=0.0, skew_active=False)
        qv = max(0.0, self.qv)
        vol = math.sqrt(qv) + 1e-12
        efficiency = min(1.0, abs(self.path.first[1]) / (max(0.0, self.variation) + 1e-12))
        area = self.path.area / self.path.first[0] / vol
        tube = price * math.sqrt(qv / self.window) * (1 - efficiency) * self.rejection
        self.level = max(price - tube, min(price + tube, self.level))
        width = self.band_mult * self.level * max(1e-6, math.sqrt(qv))
        upper, lower, risk, active = deform(self.level, width, observation, t)
        return dict(t=t, center=self.level, upper=upper, lower=lower,
                    drift=self.path.first[1] / vol, area=area,
                    structural_score=(self.path.first[1] / vol + self.area_weight * area) * (1 - .5 * self.rejection),
                    efficiency=efficiency, ready=True, risk=risk, skew_active=active)


class ReadRouter:
    """Read-only JSON transport: independent service circuits, primary recovery.

    Both candidates must use HTTPS and the identical service/path/query.
    DNS/TLS/socket/timeout/HTTP/JSON failures try the other host. Does not
    accept transaction bodies, authentication headers or arbitrary hosts.
    """
    def __init__(self, opener=urlopen, clock=time.monotonic, cooldown=60):
        self.opener, self.clock, self.cooldown = opener, clock, cooldown
        self.failed_until = {}

    @staticmethod
    def pair(url):
        u = urlsplit(url)
        host = u.hostname or ''
        if (u.scheme != 'https' or u.username or u.password or u.port not in (None, 443)
                or not any(host == 'gains.' + d or host.endswith('.gains.' + d) for d in ('trade', 'dev'))):
            raise ValueError('Untrusted Gains HTTPS endpoint')
        host = host.rsplit('.', 1)[0] + '.trade'
        return tuple(urlunsplit(('https', host.rsplit('.', 1)[0] + '.' + d, u.path, u.query, ''))
                     for d in ('trade', 'dev'))

    def get(self, url, timeout=8):
        primary, secondary = self.pair(url)
        service = urlsplit(primary).netloc
        candidates = (secondary, primary) if self.clock() < self.failed_until.get(service, 0) else (primary, secondary)
        error = None
        for candidate in candidates:
            try:
                with self.opener(Request(candidate, headers={'User-Agent': 'RoughPathAlpha/1.4'}), timeout=timeout) as r:
                    if r.status != 200 or r.geturl() != candidate:
                        raise ValueError('Unexpected HTTP response or redirect')
                    raw = r.read(16_000_001)
                    if len(raw) > 16_000_000:
                        raise ValueError('Response exceeds 16 MB')
                    result = json.loads(raw)
                if candidate == primary:
                    self.failed_until.pop(service, None)
                return result
            except (OSError, ValueError) as e:
                error = e
                if candidate == primary:
                    self.failed_until[service] = self.clock() + self.cooldown
        raise ConnectionError('Both Gains endpoints failed') from error
