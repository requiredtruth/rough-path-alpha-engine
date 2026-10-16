"""Multi-chain, all-collateral USD aggregation for Rough Path Alpha.

Fetch chain-local collaterals/pairs and open-trades through ReadRouter. Funding
keys are (chain_name, collateral_index, pair_index), decimal per hour. Keep
baseline snapshots from at least 60 seconds earlier; never mix chain IDs.
"""
from dataclasses import dataclass
import math

CHAINS = {'ARBITRUM': 42161, 'POLYGON': 137, 'BASE': 8453}


def family(symbol):
    return symbol.upper().replace('DEGEN/', '/')


@dataclass
class ChainSnapshot:
    name: str
    at: int
    meta_at: int
    registry: dict
    rows: list


def normalize(snapshot, market, now):
    """Return component token notionals and current USD conversion prices."""
    if snapshot.name not in CHAINS or any(t > now or now-t > 120000 for t in (snapshot.at,snapshot.meta_at)):
        return None
    collaterals = {}
    for c in snapshot.registry.get('collaterals', []):
        try:
            ci=int(c['collateralIndex']);precision=float(c['collateralConfig']['precision']);usd=float(c['prices']['collateralPriceUsd'])
            if precision>0 and usd>0 and math.isfinite(precision) and math.isfinite(usd):collaterals[ci]=(precision,usd)
        except (KeyError,TypeError,ValueError):continue
    indices={i for i,p in enumerate(snapshot.registry.get('pairs',[])) if family(p['from'].split('_')[0]+'/'+p['to'])==family(market)}
    if not indices or not collaterals:return None
    components={};seen=set();skipped=0
    for raw in snapshot.rows:
        try:
            t=raw['trade'];pi=int(t['pairIndex'])
            if pi not in indices or t['isOpen'] is not True or int(t['tradeType'])!=0:continue
            key=(t['user'].lower(),t['index'])
            if key in seen:continue
            seen.add(key);ci=int(t['collateralIndex']);precision,usd=collaterals[ci]
            amount=float(t['collateralAmount']);lev=float(t['leverage'])/1000
            if not math.isfinite(amount) or not math.isfinite(lev) or amount<0 or lev<=0 or type(t['long']) is not bool:raise ValueError()
            c=components.setdefault((ci,pi),dict(long=0.,short=0.,usd=usd))
            c['long' if t['long'] else 'short']+=amount/precision*lev
        except (KeyError,TypeError,ValueError):skipped+=1
    return dict(name=snapshot.name,at=min(snapshot.at,snapshot.meta_at),components=components,skipped=skipped,
                scope=(tuple(sorted((ci,v[0]) for ci,v in collaterals.items())),tuple(sorted(indices))),
                usd_by_collateral={ci:v[1] for ci,v in collaterals.items()})


def combine(snapshots, baselines, funding, market, now):
    """Combine fresh chains; revalue old collateral units at current prices.

    Returns Microstructure-compatible values, plus explicit coverage. A missing
    contributing funding rate invalidates combined funding rather than being
    replaced by zero. Registry changes reset growth comparability.
    """
    long=short=old_long=change=weighted=weight=0.;parts=[];fund_at=now;oi_at=now;growth_ok=True
    for snapshot in snapshots:
        a=normalize(snapshot,market,now)
        if a is None:continue
        parts.append(a);oi_at=min(oi_at,a['at']);base=baselines.get(snapshot.name)
        b=normalize(base,market,base.at) if base and 60000<=now-base.at<=300000 else None
        if b is None or a['scope']!=b['scope'] or a['skipped']!=b['skipped']:growth_ok=False;b=None
        keys=set(a['components']) | (set(b['components']) if b else set())
        for ci,pi in keys:
            current=a['components'].get((ci,pi),{'long':0.,'short':0.})
            usd=a['usd_by_collateral'].get(ci)
            if usd is None:continue
            l=current['long']*usd;long+=l;short+=current['short']*usd
            previous=b['components'].get((ci,pi),{}).get('long',0.) if b else 0.
            old_long+=previous*usd;change+=(current['long']-previous)*usd
            f=funding.get((snapshot.name,ci,pi))
            if l>0 and f and math.isfinite(f[0]) and 0<=now-f[1]<=120000:
                weighted+=l*f[0];weight+=l;fund_at=min(fund_at,f[1])
    valid_fund=long>0 and weight>=long*(1-1e-10)
    return dict(oi_long=long,oi_short=short,long_growth=change/old_long if growth_ok and old_long>0 else math.nan,
                funding=weighted/long if valid_fund else math.nan,funding_at=fund_at if valid_fund else math.nan,
                oi_at=oi_at if parts else math.nan,coverage=[p['name'] for p in parts if not p['skipped']],
                funding_coverage=weight/long if long else 0.)
