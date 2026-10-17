# Rough Path Alpha Engine — Complete Strategy, Chart Line, and Prediction Specification

**File:** strat.md  
**Implementation reviewed:** v1.8.5, branch main, source through commit aa33e7402e46a663852428a29eedf7ef54a5387e  
**Purpose:** Reproducible, source-level explanation of what every visual line, calculation, forward projection, scenario, signal, microstructure adjustment, and optimization result actually means.

> **Status and scope:** This document describes the checked-in implementation, not a proposed strategy. It distinguishes mathematical identities, coded heuristics, simulation assumptions, user-interface conventions, and known limits. It does not claim that a projection is a forecast with calibrated probabilities, that a band is a statistical confidence interval, or that chart signals automatically trade.

## 1. System map and terminology

The terminal combines four fundamentally different classes of display:

1. **Observed market prices and candles:** market OHLC, the current price line, and time/price axes.
2. **Observed or estimated position levels:** your entries, public entries, liquidation levels, group averages, and their PnL labels. These lines are *not* the predictive strategy.
3. **Structural Rough Path indicator:** a turquoise causal price center, gold upper border, rose lower border, filled channel, structural score and signal-change triangles.
4. **Forward extrapolations and scenarios:** three dotted continuations of the corresponding center/upper/lower series; a separate pale-blue close-anchored prediction line; numerical long/short possible-move cards.

The structural model is deterministic. It transforms **past and current** prices into features, a filtered center, an envelope and a local slope. Its projection is a geometric **linear extrapolation**, not a learned future-price distribution. Live spot/open-interest/funding observations can deform the envelope and therefore the displayed upside/downside scenario levels; they do not currently train a model, assign odds, or directly modify the core signal score.

### 1.1 Source of truth

| Function | Current implementation | Relevant callers/tests |
| --- | --- | --- |
| Chen signature, path features, signal, bands, projection, backtest | app/src/main/assets/rough.js | tests/rough.test.cjs, tests/channels.test.cjs |
| Live open interest, funding aggregation, spot-flow windows | app/src/main/assets/spectrum.js | app/src/main/assets/research.js |
| Live cascade-pressure envelope | app/src/main/assets/skew.js | pipeline/rough_alpha.py |
| Close-anchored prediction, possible moves, candle-oriented scale | app/src/main/assets/chart-visuals.js | tests/chart-visuals.test.cjs |
| Overlay construction, chart forecasts and cards | app/src/main/assets/research.js | tests/chart-clarity-browser.cjs |
| Actual candle, position and line painting | app/src/main/assets/app.js | tests/chart-clarity-browser.cjs |
| Search planner and objective | app/src/main/assets/search.js; app/src/main/assets/optimizer.js | tests/search.test.cjs |
| Historical downloads and trade-tick normalization | app/src/main/assets/history.js; ticks.js; long-history.js | tests/download.test.cjs |
| Position/average/liquidation grouping | app/src/main/assets/engine.js; trade-state.js | tests/engine.test.cjs |
| Lightweight external streaming math | pipeline/rough_alpha.py | pipeline/test_rough_alpha.py |

The chart implementation and standalone Python pipeline are related but are **not the same full execution engine**; see §15.

### 1.2 Mathematical notation

At chronological observation index \(i\):

- \(t_i\): timestamp in milliseconds, strictly increasing.
- \(O_i,H_i,L_i,C_i\): actual open, high, low and close; all prices positive.
- \(\ell_i = \ln C_i\): natural log of close.
- \(d_i=\ell_i-\ell_{i-1}\): log-price increment.
- \(W\): structural lookback **increments**, so the feature uses \(W+1\) prices.
- \(B\): channel-width volatility lookback.
- \(P\): projection slope lookback **samples**.
- \(H\): base projection steps. Actual forward extrapolation has \(3H\) steps.
- \(\varepsilon=10^{-12}\): numerical guard used in feature denominators.
- \(\operatorname{clip}(x,a,b)=\max(a,\min(b,x))\).

Unless otherwise specified, horizons are sample counts, **not minutes**. The chart converts them to displayed time using its current candle interval. The offline optimizer uses its own actual sample timestamps and sample granularity.

## 2. Every visible line and marker

| Appearance | Displayed object | Precise purpose/source |
| --- | --- | --- |
| Green/red candles with contrasting wicks | Market OHLC | Actual aggregated observed candles; green if close >= open, red otherwise. Not a prediction. |
| Thin green horizontal line | Current live price | Latest accepted price for the selected market, not an estimated future price. Price pill drawn on right at latest edge. |
| Solid turquoise (~#62e0ce) | Causal structural center | Filtered price from the geometric deadband/play operator, §5. Not an ordinary EMA. |
| Solid gold (~#f6be5c) | Upper structural border | Center plus historical-width envelope, possibly compressed by live long-cascade pressure, §§6–7. |
| Solid rose (~#ef7f9f) | Lower structural border | Center minus historical-width envelope, possibly extended downward by live long-cascade pressure. |
| Faint turquoise fill between borders | Structural channel area | Visualizes the contemporaneous upper/lower envelope, only when band-ready. Not a guaranteed range. |
| Dotted turquoise | Center continuation | Own separate slope, projected from last solid center for up to \(3H\) samples, §8. |
| Dotted gold | Upper-border continuation | Own separate upper slope, constrained to remain >= projected center. |
| Dotted rose | Lower-border continuation | Own separate lower slope, constrained to remain <= projected center and > 0. |
| Pale-blue dashed/prediction path (~#b5dbff) with dark backing | Candle-close-anchored prediction | Takes the center projection and **translates it** to start at the most recent visible candle close; §9. Label 'PRED +/−N%'. |
| Green/rose triangles beside candle lows/highs | Newly changed structural L/S direction | Drawn only when a nonzero ready signal differs from the preceding signal, §10. Not order executions. |
| Yellow horizontal line | Your long entry | Own open long position at actual stored entry price. |
| Purple horizontal line | Your short entry | Own open short position. |
| Red dashed horizontal line | Your liquidation line | Paper estimate or live source-derived price; labeled when only estimated. |
| White horizontal line | Your weighted average entry | Notional-weighted across your displayed open positions. |
| Semi-transparent orange short-dashed line | Other trader's long entry | Public position level, not an alpha prediction. |
| Semi-transparent purple longer-dashed line | Other trader's short entry | Public position level. |
| Cyan strong-dashed line | Exact-duplicate public long aggregate | Several trades with **identical** entry AND leverage on the same side; not proximity-based clustering. |
| Pink strong-dashed line | Exact-duplicate public short aggregate | Corresponding short aggregate. |
| Pink thin-dashed line | Other trader liquidation | Known public level or explicitly estimated. |
| Strong yellow/purple 'AVG' levels | Public long/short average entry | Notional-weighted across eligible public trades; all-side and leverage-band averages may be shown separately. |
| Pink/red dashed 'AVG LIQ' levels | Public average liquidation | Notional-weighted available/estimated liquidation prices. |
| Horizontal dark grid lines and price labels | Price axis | Six intervals dividing auto-fitted candle-oriented vertical scale. |
| Bottom time/date tick marks | Time axis | Labels sampled from the displayed candles; local timezone. |
| Thin residual/score sparkline in indicator row | Last up-to-100 structural scores | Score normalized for drawing around zero. **Not** an implied probability. |

Lines can legitimately overlap. A dotted projection continues its own most recent value; **only** the light-blue line is explicitly translated to the last candle close. Position/trader lines may appear far outside the visible price range and their labels then may not appear, but the underlying levels remain stored.

### 2.1 Visual priority

The chart draws position and price levels, indicator channel/fill and projections, then actual candle wicks/bodies **over** predictive and position geometry. The current price pill is drawn later still. This prevents prediction fills and large background trade levels from concealing candles. Forecast and long/short readout cards live outside the candle plotting rectangle.

## 3. Input formation, validation and timeframes

### 3.1 Price and candle sources

- **Executable price/PnL:** live, timestamp-validated Gains mark/index data. Index and mark prices are separate; index helps liquidation calculations and mark is used for PnL.
- **Ordinary chart candles:** Gains 1-minute price history (Arbitrum first, Polygon fallback), current live updates, and explicitly labeled Coinbase spot-history fallback. The fallback is *not* an interchangeable oracle execution price.
- **Long visible windows:** actual Coinbase hourly OHLC history, cached in pages. The most recent Gains data may supply a marked current partial candle; downloaded hourly data is not invented by upsampling.
- **Offline research:** Coinbase BTC-USD 1-minute OHLCV or real Coinbase BTC trade ticks, downloaded, cached/resumable and used as a **separate** dataset. Research trades are simulations, not gTrade trade fills.

In app.js the chart starts with 1-minute live candle buckets. A new accepted price updates the current bucket's close/high/low or starts a fresh bucket. Missing internal minutes can be represented as 'gap-fill' placeholders equal to a previous close, **not real transactions**. They are excluded from price fit and indicator-input aggregation; elapsed timestamp gaps reset indicator feature warmup.

### 3.2 On-screen aggregation and interval

The displayed interval is either user-selected or auto-derived from the visible span:

- Up to 300 visible minutes: 1-minute candles.
- Up to 1,500: 5-minute candles.
- Up to 4,500: 15-minute candles.
- Up to 10,080: 60-minute candles.
- Beyond one week: at least hourly; default 4-hour for shorter monthly ranges and 1-day for longer ones.

Aggregation takes the first open, highest high, lowest low and last close of actual rows in each interval bucket. A chart lookback measured as 32 **displayed samples** is therefore 32 minutes on a 1-minute chart but 32 hours on a 1-hour chart.

The overlay filters out 'gap-fill', reaggregates the actual rows at the selected interval, computes new Rough features for that interval and maps the results to visible candles by bucket time. It does **not** reuse one-minute indicator values unchanged when changing the chart interval.

### 3.3 Validation and gap behavior

Rough.validateRows requires 80–1,100,000 chronological samples with finite timestamp/OHLC, strictly increasing timestamps, positive lows, sane high/low bounds and consistent open/close ranges. It rejects duplicated or unsorted observations. Individual on-chart segments must have enough complete samples to warm up; long history gaps reset the active feature segment.

The default research/chart gap limit is 90,000 milliseconds for one-minute inputs; the on-screen indicator passes 90,000 milliseconds multiplied by the chart candle interval. Tick research uses 300,000 milliseconds. If elapsed time between consecutive **actual** observations exceeds the gap limit, the segment-start index advances and features are not valid again until W increments after that boundary. No missing return path is interpolated into the Rough Path calculation.

## 4. Level-two Chen signature: what is actually measured

### 4.1 The time/log-price path

For a rolling window \(j=i-W,\ldots,i\), use the two-dimensional observed path

\[
X_k = \left( \frac{t_k-t_j}{t_i-t_j},\ \ell_k-\ell_j \right).
\]

The two axes are elapsed normalized time and log close. Each step has increment \(\Delta X_k\). The code computes degree-one and degree-two signatures by **Chen concatenation**:

\[
S^{(1)} \leftarrow S^{(1)} + \Delta X,
\]
\[
S^{(2)}_{ab} \leftarrow S^{(2)}_{ab}
             + S^{(1)}_a\,\Delta X_b
             + \frac12\Delta X_a\Delta X_b.
\]

For each increment the degree-two update uses the *previous* degree-one signature, before updating it. The antisymmetric second-level signed area is

\[
\mathcal A=\frac{S^{(2)}_{12}-S^{(2)}_{21}}{2}.
\]

This measures direction/order of motion in the time–log-price plane. Reversals and ordered motion can alter area even if two paths have equal starting/ending prices. This is a **truncated level-2 signature**, not a full infinite rough-path signature, and it does not magically remove microstructure noise.

### 4.2 Fast rolling implementation

The Android algorithm does not recompute a whole path for every candle. It stores cumulative arrays:

\[
Q_i=\sum_{k=1}^i d_k^2,\quad
V_i=\sum_{k=1}^i |d_k|,
\]
\[
A_i=\sum_{k=1}^i
 \left(\frac{t_k+t_{k-1}}2-t_{\mathrm{epoch}}\right)d_k.
\]

For the current rolling interval beginning at \(j=i-W\):

\[
\Delta\ell=\ell_i-\ell_j,\quad
q=\max(0,Q_i-Q_j),\quad
v_{\mathrm{abs}}=V_i-V_j,\quad
D=t_i-t_j,
\]
\[
S_{12}^{\mathrm{normal}}
=\frac{A_i-A_j-(t_j-t_{\mathrm{epoch}})\Delta\ell}{D},
\]
\[
\mathrm{areaFeature}
=\frac{S_{12}^{\mathrm{normal}}-\frac12\Delta\ell}
       {\sqrt q+10^{-12}}.
\]

The source's test suite compares the prefix implementation against direct signature calculation. The prefix form provides **O(1) rolling feature work per input row after linear preprocessing**, rather than recomputing W consecutive increments for every step.

### 4.3 Lead–lag path and quadratic variation

The library also supplies a separate helper to form a log-path lead–lag lift:

\[
(\ell_0,\ell_0)
\rightarrow(\ell_1,\ell_0)\rightarrow(\ell_1,\ell_1)
\rightarrow(\ell_2,\ell_1)\rightarrow(\ell_2,\ell_2)\rightarrow\cdots.
\]

The absolute signed area of this construction is related to half the sum of squared log increments. The *live indicator* uses the prefix-summed quadratic variation \(q\) directly, rather than recalculating a lead–lag signature on every candle:

\[
\mathrm{QV}=q=\sum_{k=j+1}^i d_k^2,\quad
\mathrm{vol}=\sqrt q+10^{-12}.
\]

Do not mistake quadratic variation for implied volatility or a future confidence distribution.

## 5. Structural score and causal turquoise center

### 5.1 Feature normalization and efficiency

Define:

\[
\mathrm{drift}=\frac{\Delta\ell}{\sqrt q+10^{-12}},
\]
\[
\mathrm{efficiency}=\frac{|\Delta\ell|}{v_{\mathrm{abs}}+10^{-12}}.
\]

Efficiency approaches 1 when signed moves mostly agree; it falls toward 0 when price repeatedly reverses and gross log variation is much larger than net movement.

The raw signature-based score is

\[
R=\mathrm{drift}+a\,\mathrm{areaFeature},
\]

where \(a=\text{areaWeight}\). The source then applies a gain (the historical parameter name 'smooth' is misleading):

\[
R_{\mathrm{scaled}}=R(0.5+0.5s),\qquad s=\text{smooth}.
\]

This is not a conventional exponential-moving-average smoothing pass.

### 5.2 The deadband / play operator

Let \(C_i\) be the current close, and \(F_{i-1}\) the previous center. The causal deadband width is

\[
T_i=C_i\sqrt{\frac{\mathrm{QV}_i}{W}}\,
       (1-\mathrm{efficiency}_i)(1-s).
\]

The turquoise center is updated with:

\[
F_i=\operatorname{clip}(F_{i-1},\,C_i-T_i,\,C_i+T_i).
\]

Interpretation:

- If the previous center still lies inside today's allowed price tube, **it remains unchanged**.
- If the old center is below the tube, it advances only to \(C_i-T_i\).
- If it is above, it moves down only to \(C_i+T_i\).
- Smaller efficiency (more two-way motion) normally widens the tube, permitting more noise rejection.
- Large smooth/passthrough parameter s shrinks the deadband and increases the raw-score gain.
- Near-unidirectional motion (efficiency ≈ 1) contracts the deadband toward the current close.

This is a causal **geometric play/hysteresis filter**, not an EMA. It can still delay turns inside the deadband. Values before feature readiness start at the actual close. At data gaps, its state and slope ring are reset.

The turquoise center is **not** the observed market price, a moving PnL average, or the blue prediction line.

## 6. Gold/rose envelope before live microstructure skew

For a separate lookback \(B=\text{bandWindow}\), compute the squared-log-return total:

\[
q_B(i)=\max(0,Q_i-Q_{i-B}).
\]

The absolute half-width before live skew is

\[
D_i = m\,F_i\,\max(10^{-6},\sqrt{q_B(i)}),
\]

where \(m=\text{bandMult}\).

The neutral channel is:

\[
U_i=F_i+D_i,\qquad
L_i=\max(10^{-9},F_i-D_i).
\]

These bands widen as observed recent log variation rises, scale with price level and the chosen multiplier, and narrow in calm samples. They are **not** Bollinger bands, percentile bands, quantile-regression bands, probabilistic confidence intervals, or target execution prices.

The width calculation requires a complete B-increment segment. Band drawing and triangles wait until the additional readiness conditions described below hold; the unready series can still store center-level fallback values.

## 7. Live multi-chain skew and 'cascade pressure'

### 7.1 What the model reads

This separate, optional envelope modifier draws from:

- **Open positions:** Arbitrum (chain 42161), Polygon (137), Base (8453). Each chain's own pair registry and collateral precision/price are used.
- **Long and short open interest:** positions normalized into USD notional with the appropriate chain-local collateral prices and reported leverage. Normal crypto and DEGEN variants map to a common underlying symbol for this analysis.
- **Long-OI growth:** per-chain snapshots at least roughly a minute apart; comparison revalues older collateral-unit exposure at current USD prices. Chain/registry coverage changes invalidate comparability.
- **Funding:** collateral/market-specific SDK estimates, weighted by contributing **long USD notional**, with missing components disabling a complete funding reading.
- **Spot aggressive trade flow:** Coinbase Exchange and Kraken trades for the chosen crypto/USD asset, with signed USD notional and a 120-second window.

For each counted position, using source-native precision conventions:

\[
\mathrm{notionalUSD}
 =\frac{\mathrm{rawCollateral}}{\mathrm{collateralPrecision}}
  \left(\frac{\mathrm{rawLeverage}}{1000}\right)
  \mathrm{collateralUSDPrice}.
\]

Long/short notional totals are reported separately. Exposure is matched by each chain's market identifier rather than treating pair numbers as globally identical.

The spot flow convention is **aggressive buy minus aggressive sell**. Coinbase Exchange match 'side' is the resting/maker side, so a Coinbase 'sell' corresponds to an aggressive **buy**; Kraken trade 'side' is already the taker side.

A spot book uses trade IDs to reject duplicate/out-of-order prints and detect missing IDs. Reconnects/gaps reset the 120-second warmup. Stale feeds, missing historical baselines, unverified funding and incomplete coverage are flagged rather than silently filled with synthetic values.

### 7.2 Input validity gate

The deform function returns a **neutral** channel if required data are absent or invalid:

- Any required observation field is non-finite.
- Observation timestamp is in the future or more than 120,000 ms old at evaluation time.
- Spot, OI or funding source timestamp is in the future or more than 120,000 ms old.
- Either OI total is negative, or combined OI is zero.
- Spot volume is not positive, or the magnitude of signed flow exceeds volume beyond a tiny tolerance.
- Long-growth or funding estimates are missing.

Consequently 'skew active' means the gate accepted its inputs. It **does not** mean cascade pressure is nonzero or that market coverage is complete.

### 7.3 Exact pressure formula

Let \(\operatorname{c01}(x)=\operatorname{clip}(x,0,1)\). Define

\[
\mathrm{weakness}
=\operatorname{c01}\left(-\frac{\mathrm{spotDelta}}{\mathrm{spotVolume}}\right),
\]
\[
\mathrm{crowding}
=\operatorname{c01}\left(\frac{\mathrm{longOI}-\mathrm{shortOI}}
                             {\mathrm{longOI}+\mathrm{shortOI}}\right),
\]
\[
\mathrm{growth}
=\operatorname{c01}\left(\frac{\mathrm{longOIGrowth}}{0.02}\right),
\]
\[
\mathrm{fundingStrength}
=\operatorname{c01}\left(\frac{\mathrm{fundingDecimalPerHour}}{0.00001}\right),
\]
\[
r=\operatorname{c01}\left(
\mathrm{weakness}\cdot\mathrm{crowding}\cdot\mathrm{growth}
\cdot(0.5+0.5\,\mathrm{fundingStrength})
\right).
\]

For example, aggressive selling, disproportionately crowded longs and increasing long exposure can produce a positive \(r\), especially with positive estimated long funding. It is intentionally an **asymmetric long-cascade risk heuristic**. No mirrored independently modeled short-squeeze term is currently implemented.

With live pressure \(r\):

\[
U_i=F_i+D_i(1-0.8r),
\]
\[
L_i=\max(10^{-9},F_i-D_i(1+0.5r)).
\]

At r=0, upper/lower revert to the neutral values. At r=1, upside half-width is 20% of the neutral half-width and downside half-width is 150% of neutral. The center \(F_i\) is unchanged.

**Critical separation:** pressure alters **the upper/lower bands and their forward extrapolations**. It does **not** directly alter \(\mathrm{drift}\), signature area, \(F_i\), the OLS center slope, structural score or L/S signal. It can change the long/short **cards** because their targets use the upper/lower forecast extrema. Offline optimizer backtests do not reconstruct historical skew or spot flow; they call the neutral indicator.

### 7.4 Labels and numeric interpretation

The indicator strip displays last structural score, long-OI growth percentage, spot delta / volume percentage, funding estimate per hour, and cascade pressure percentage. The last percentage is simply \(100r\), **not** “X% chance of liquidation.” 'Spot 2/2' means the two named sources have warmed valid observations, not all global exchange activity. Funding may be displayed as unavailable while the center/bands remain operational in neutral mode.

## 8. Exact dotted projections of center, upper and lower

### 8.1 Last P-sample slope

The projection code performs independent ordinary least-squares slope fits on the most recent \(P=\text{projectionWindow}\) levels of **each of**:

- \(F\), the center;
- \(U\), the upper border;
- \(L\), the lower border.

With sequence \(z_0,\ldots,z_{P-1}\), positions \(x_k=k\), and \(\bar x=(P-1)/2\):

\[
\beta_z=\frac{\sum_{k=0}^{P-1}(x_k-\bar x)(z_k-z_0)}
                   {P(P^2-1)/12}.
\]

Subtracting \(z_0\) is algebraically equivalent to standard OLS covariance because the centered x-values sum to zero. Slope units are **price per bar**.

The latest single-bar change is

\[
\delta_z=z_{P-1}-z_{P-2}.
\]

Code rule:

\[
b_z=
\begin{cases}
\delta_z,&\beta_z\delta_z<0,\\
\beta_z,&\text{otherwise}.
\end{cases}
\]

So if the longer-window fitted slope and the most recent movement point in **strictly opposite** directions, the latest movement wins. If one is zero, the fitted slope remains. This anti-opposition rule can strongly increase sensitivity to a one-candle reversal. It is **not** an unbiased statistical forecasting rule.

The center slope is also maintained by a rolling-sum/weighted-sum ring in the indicator itself, allowing O(1) slope updates after warmup; the projection function recomputes the independent slopes over the last P points when drawing the full rays. Tests check their agreement for the center.

### 8.2 Projected time and level for every step

For \(k=0,1,\ldots,3H\):

\[
F_{i+k}^{*}=\max(10^{-9},F_i+b_F k),
\]
\[
U_{i+k}^{*}=\max(F_{i+k}^{*},U_i+b_U k),
\]
\[
L_{i+k}^{*}=\max(10^{-9},\min(F_{i+k}^{*},L_i+b_L k)).
\]

These are the three **dotted** lines. Their step-zero points exactly equal the current filtered center and its corresponding borders, subject to the positive-price guards. Upper stays >= center; lower stays <= center. Extrapolations are linear in **price**, not log price, and slope is fixed for the entire forecast at the current evaluation instant.

If defaults apply \(H=12\), the forecast contains **37 values** from step 0 through step 36. On a 1-minute view the full endpoint is 36 minutes away; on a 5-minute view it is 180 minutes away. At the next completed or changing candle, history and slope may be recomputed; the rays can move substantially.

### 8.3 What the projection is NOT

It is not a solved stochastic differential equation, Bayesian posterior, neural forecast, fitted time-series uncertainty envelope, position-execution quote, or a prediction trained on future labels. It shows how recent **filtered** levels would continue if their local extrapolated slopes persisted. There are no modeled path-dependent reversal probabilities or price-target hit probabilities.

## 9. Pale-blue prediction and LONG/SHORT potential cards

### 9.1 Why the pale-blue line differs from the dotted turquoise line

The dotted turquoise center begins at \(F_i\). The prediction line must start at the actual **last visible candle close** \(C_{\mathrm{anchor}}\), so the app translates the entire projected center trajectory by

\[
\Delta_{\mathrm{anchor}}
=C_{\mathrm{anchor}}-F_i^{*},
\]

where \(F_i^{*}\) here means **the step-zero center of the passed forecast subset** (normally \(F_i\)).

For each included projected point \(k\):

\[
P_k=C_{\mathrm{anchor}}+(F_{i+k}^{*}-F_i^{*}).
\]

The blue line begins at \(P_0=C_{\mathrm{anchor}}\), and the final blue forecast price is \(P_K\), where \(K\) is the **last projection step visible** to the chart routine. A dark dashed under-stroke makes the pale-blue line legible. The text tag displays the predicted signed percent change relative to the anchor.

This blue line is a **translated center trajectory**. It does not incorporate current oracle price separately if the latest visible candle close differs from the accepted quote, and it is not a fourth independent model.

The same translation is applied to both bounds for scenario computation:

\[
U_k'=C_{\mathrm{anchor}}+(U_{i+k}^{*}-F_i^{*}),
\]
\[
L_k'=\max(10^{-9},
          C_{\mathrm{anchor}}+(L_{i+k}^{*}-F_i^{*})).
\]

The chart-validity check refuses a malformed forecast, non-positive anchor, upper below center or lower above center.

### 9.2 Directional central prediction readout

Using endpoint \(K\):

\[
\mathrm{predictionTarget}=P_K,
\]
\[
\mathrm{predictionDollarMove}=P_K-C_{\mathrm{anchor}},
\]
\[
\mathrm{predictionPercent}
=100\left(\frac{P_K}{C_{\mathrm{anchor}}}-1\right).
\]

The readout states 'Prediction $target (+/−N%) · [duration] estimate', optionally adding 'quote stale' and cascade-pressure information. Its target is the **last visible translated center**; its positive/negative sign is independent of whether the core score would pass an L/S signal gate.

### 9.3 LONG scenario

The LONG card is the most bullish value anywhere among the **visible** shifted upper-bound points:

\[
P_{\mathrm{long}}=\max(C_{\mathrm{anchor}},U_0',\ldots,U_K'),
\]
\[
\mathrm{longAmount}=P_{\mathrm{long}}-C_{\mathrm{anchor}},
\qquad
\mathrm{longPercent}=100\frac{\mathrm{longAmount}}{C_{\mathrm{anchor}}}.
\]

It displays a **positive distance**, e.g. 'LONG +1.40%' and '+$... → target'. This is not a probability of a bullish trade or an expected net gain. Even when the central prediction slopes down, an initially wide upper channel may still make LONG possible movement positive.

### 9.4 SHORT scenario

Similarly, choose the lowest shifted lower boundary anywhere among the **visible** projected points:

\[
P_{\mathrm{short}}=\min(C_{\mathrm{anchor}},L_0',\ldots,L_K'),
\]
\[
\mathrm{shortAmount}=C_{\mathrm{anchor}}-P_{\mathrm{short}},
\qquad
\mathrm{shortPercent}=100\frac{\mathrm{shortAmount}}{C_{\mathrm{anchor}}}.
\]

The card displays 'SHORT −N%' but the calculated dollar amount is a **positive magnitude of downward movement**. A positive long card and positive-magnitude short card can coexist: the envelope allows **both** directions.

### 9.5 Visibility clipping changes the readout horizon

The chart reserves right-side whitespace for forecasts, but the readout does **not** always use every one of the \(3H+1\) theoretical points. drawRough computes:

- a projection anchor at the last plotted candle's center;
- a visible-forecast subset satisfying a right-edge pixel cutoff;
- ChartVisuals.prediction(anchor close, **that subset**, current interval).

Thus the readout horizon \(K\) can be shorter than \(3H\) on narrow screens or particular zoom levels. The displayed duration is

\[
\mathrm{minutes}=K\times\mathrm{displayCandleIntervalMinutes}.
\]

The independent dotted rays are painted from the full projection, then visually clipped by the canvas. The blue prediction/readout uses its own explicit visible subset. This distinction matters when comparing the mathematical 36-step horizon with the card's shown duration.

### 9.6 Worked arithmetic example

Suppose the last candle closes at $100, the center's step-zero level is $90 and the final center extension in the displayed subset is $94. Suppose the translated final upper is $107 and the lowest translated lower in that subset is $98:

- Close-anchor shift = $100 − $90 = +$10.
- Blue endpoint = $100 + ($94 − $90) = **$104**, or **+4%**.
- LONG possible move = $107 − $100 = **+$7 / +7%**.
- SHORT possible move = $100 − $98 = **$2 / −2%**.
- For two steps separated by 5-minute candles, elapsed displayed horizon = **10 minutes**.

These are arithmetic consequences of supplied line geometry, not probabilities or recommended orders.

## 10. Structural L/S signal logic, including every gate

### 10.1 Warmup/readiness

A signal cannot fire merely because the newest score is nonzero. Readiness requires:

1. A valid W-increment structural feature within the current continuous segment.
2. A complete B-increment envelope volatility window within that segment.
3. P filtered samples in the projection-slope ring.
4. The index to reach the stricter warmup:
   \(i \geq \mathrm{segmentStart}+\max(W,B)+P-1\).

Missing/gapped inputs reset the center and ring, requiring renewed readiness. The displayed channel fill and borders also require ready points.

### 10.2 Projected-slope contribution to signal

The center slope \(b_F\) from §8 and channel width \(D_i\) are used to compute the bounded projection term:

\[
z_i=\operatorname{clip}\left(
    \frac{b_F(3H)}{\max(D_i,10^{-9})},-5,5
\right),
\]
\[
\mathrm{score}_i
=R_{\mathrm{scaled},i}+\gamma z_i,
\]

where \(\gamma=\text{projectionWeight}\). Therefore band width, projection horizon/window and projection weight can affect the **trade direction and threshold crossing**, not merely draw prettier lines. The upper/lower *skew* does not enter this term: its denominator is the original neutral width \(D_i\).

### 10.3 Efficiency gate and price residual

The efficiency gate passes only when:

\[
\mathrm{efficiency}_i\geq\eta,
\]

where \(\eta=\text{noise}\) (the parameter label says 'Efficiency noise gate'). Then the score threshold requires

\[
|\mathrm{score}_i|\geq\theta,
\]

where \(\theta=\text{threshold}\). Direction is finally conditioned on observed close relative to the filtered center:

\[
\mathrm{signal}_i=
\begin{cases}
+1 & \text{if ready, efficiency passes, magnitude passes, score}>0,
\quad C_i\geq F_i;\\
-1 & \text{if ready, efficiency passes, magnitude passes, score}<0,
\quad C_i\leq F_i;\\
0 & \text{otherwise.}
\end{cases}
\]

Positive signal is the 'STRUCTURAL L' state; negative means 'STRUCTURAL S'; zero means 'NEUTRAL'. An equality residual is permitted if the score has the required sign. A strong positive score with price *below* its filtered center is rejected, and the opposite also holds.

### 10.4 Signal triangles versus trade executions

At each visible candle, a green/rose triangular marker is drawn **only** if the current signal is nonzero, band-ready and different from the immediately preceding signal. A persistent long signal does not create a new triangle on every bar. A neutral-to-long or short-to-long transition can generate a green marker; analogous transitions create rose markers.

These markers are derived research events, **not confirmed orders**. Live gTrade opening/closing in the app requires explicit order controls, current market limits, account/wallet state and signing. The model neither guarantees execution nor silently opens trades from an L/S triangle.

## 11. Numeric example of center/channel/signal evolution

Consider the following stylized state at the last valid candle, assuming a price center of $100 and a neutral band half-width of $2.

- Neutral upper = $102; neutral lower = $98.
- If valid live pressure is r = 0.5, upper = \(100+2(1-0.8\times0.5)=101.20\), lower = \(100-2(1+0.5\times0.5)=97.50\).
- A straight-line center projection with \(b_F=+$0.10/bar\), H=12, projects center $103.60 after 36 bars.
- The signal projection term before the weight is \(\operatorname{clip}[(0.10\times36)/2,-5,5]=1.8\).
- With gamma=0.5, projection contributes +0.9 to the structural score. That alone does **not** guarantee an L signal; the total score, efficiency, readiness, and current price residual must still pass.
- If the upper border's last 16 points slope +$0.04/bar and the lower border slopes −$0.06/bar, the independent dotted rays end near $102.64 and $95.34 before the boundary consistency clamps. They are not a constant parallel-width channel.
- If the last candle close is $100.40 while the current center is $100, the **pale-blue** projection starts at $100.40 and ends at $104.00, even though the dotted turquoise center begins at $100 and ends at $103.60.

The values above are invented for **mathematical illustration**, not observed market data or a performance claim.

## 12. Research optimizer: how parameters are selected

### 12.1 Search axes, not a trained AI

The optimizer searches a finite multidimensional collection, not neural-network weights. Its **12 axes** are:

1. W structural window.
2. Structural threshold theta.
3. Efficiency noise gate eta.
4. Signature area weight a.
5. Noise-passthrough gain s (historically 'smooth').
6. Band volatility window B.
7. Band width multiplier m.
8. Projection slope window P.
9. Base horizon H (drawn as 3H).
10. Projection score weight gamma.
11. Simulation leverage.
12. Collateral allocation percentage.

Users provide comma-delimited candidate lists or ascending 'min:max:step' ranges. The grid domain is represented lazily using mixed-radix coordinates/BigInt; the full Cartesian product is **not materialized**. Each axis has at most 10,001 values. The search uses a unique-candidate evaluation budget up to 1,000,000 and never honestly labels partial coverage 'exhaustive'.

### 12.2 Modes and sequence

- **Grid:** evaluates combinations in deterministic coordinate order.
- **Random:** seeded pseudorandom unique combinations, with collision fallback.
- **Anneal:** local coordinate mutations with cooling, probabilistic acceptance of worse scores, and restarts around leaders.
- **Hybrid:** approximately first 20% grid, next 40% random and final 40% annealing.

The reproducible seed defaults to 42. Every evaluated candidate's indicator series is causal. Window feature arrays and unchanged parameter signals are reused to avoid redundant work when candidates differ only in simulated risk settings.

The 'Huge search' preset expands parameter and leverage/collateral axes, sets hybrid search and a 100,000-candidate budget. Huge **does not mean exhaustive** if the combinatorial space exceeds the budget.

### 12.3 Chronological splits and objective

The historical dataset is split in chronological order:

- Train: first 60% of samples.
- Validation: next 20%.
- Holdout: final 20%, **not used in selecting the best parameter set**.

For each candidate, simulate train and validation separately. A split's score is:

\[
\mathrm{splitScore}=
\begin{cases}
\mathrm{ROIpercent}-1.5\,\mathrm{maxDrawdownPercent},
  &\mathrm{trades}\geq5;\\
-10^9,&\text{otherwise.}
\end{cases}
\]

The candidate's selection score is the **minimum** of its train and validation scores. Max drawdown is peak-to-trough equity drawdown in percentage points. Candidates with invalid/numerically overflowing simulations are rejected. Top leaders are kept for reporting; the best eligible candidate's final **holdout** is computed only after selection.

The engine-version compatibility gate currently expects '1.6.0' for applying candidate parameters, even though the Android release is v1.8.5. This is an **indicator/search engine compatibility identifier**, not an APK version mismatch.

### 12.4 Exactly how the strategy simulator trades

The signal at sample \(i-1\) is consumed at sample \(i\) open: **one-sample-later execution**, not a fill at the earlier signal candle's close. Specifically:

- If a position exists and its side does not match the prior signal (including neutral), it is closed at the next open.
- If flat, the prior signal is ±1 and cash is positive, open the matching side at the current open.
- Allocation = current cash times candidate collateral percentage / 100; leverage multiplies collateral into notional.
- Entry and exit prices include direction-dependent percent slippage.
- Fee is charged once on entry and once on exit; borrowing/funding accrue on notional according to simulated holding time.
- An order too costly to survive immediately at entry is counted as a skipped entry.
- Each candle's adverse low (for long) or high (for short) is tested against an approximate liquidation boundary; the simulated exit uses the open if the open already breached it, otherwise the modeled barrier.
- A time gap can force closure at the preceding real candle close and suppress a new signal entry on the gap candle.
- Remaining open position is settled at the end of the tested split.

The simulation tracks balance, equity curve, ROI, max drawdown, trades, wins, win rate, profit factor, fees, accumulated holding charges, data gaps and skipped entries. It stops on extreme numerical overflow.

### 12.5 Simulation arithmetic

Let margin \(M\), leverage \(\lambda\), side \(d=+1\) long or \(-1\) short, entry \(E\), candidate exit \(X\), slippage percent \(s_p\), fee percent per side \(f_p\), borrow percent per hour \(b_p\), funding percent per hour \(g_p\), elapsed hours \(h\), notional \(N=M\lambda\).

\[
E=\mathrm{open}\,(1+d\,s_p/100),\quad
X=\mathrm{exit}\,(1-d\,s_p/100).
\]
\[
\mathrm{gross}=Nd(X/E-1),
\]
\[
\mathrm{holding}=N(b_p+d g_p)h/100,
\]
\[
\mathrm{net}=\mathrm{gross}-2Nf_p/100-\mathrm{holding}.
\]

Losses are limited to posted margin in the simulator; liquidation is approximated from the configured percentage collateral-loss threshold and the modeled charges. Fees, spread, funding and execution assumptions can dominate results at high leverage.

**No** historical oracle latency, slippage-orderbook reconstruction, dynamic market-impact curve, exact liquidation engine replay, price-index mismatch, gas, or changing real protocol leverage schedule is modeled. A positive backtest does not establish future positive expectancy.

### 12.6 Offline versus live inputs

Offline optimizer calls Rough.indicator with historical OHLC/ticks and **no historical live OI/spot/funding observations**, meaning the envelope uses r=0. Consequently an optimized backtest score does **not** validate the current live skew adjustment or the upper/lower scenario-card extremes. Optimization can select slope/horizon/band parameters because these enter the signal score. It does not train prediction probabilities or optimize a future-price loss function.

Applying an eligible result changes the **indicator parameter set** on the chart; risk settings are reported but do **not** automatically change live order leverage, allocation or transmit trades.

## 13. Parameter dictionary, defaults and hard validation

| Parameter | Default | Allowed values in source | Effect |
| --- | ---: | --- | --- |
| window (W) | 32 | integer 4–2048 | Number of log increments in rolling time/signature/efficiency/QV features. |
| threshold (theta) | 0.8 | 0–10 | Absolute final structural-score magnitude gate. |
| noise (eta) | 0.1 | 0–1 | Minimum path efficiency for signal acceptance. |
| areaWeight (a) | 1 | −10 through +10 | Signed influence of normalized signature area. |
| smooth (s) | 0.18 | >0 through 1 | Raw-score gain and inverse strength of deadband; **not** EMA length. |
| bandWindow (B) | 32 | integer 4–2048 | QV lookback for channel width. |
| bandMult (m) | 1.5 | 0.1–10 | Multiplier on price-scaled band half-width. |
| projectionWindow (P) | 16 | integer 4–2048 | Last P center/upper/lower points fit by OLS. |
| projectionSteps (H) | 12 | integer 1–240 | Base horizon; forecast length is 3H plus step zero. |
| projectionWeight (gamma) | 0.5 | 0–5 | Weight of bounded forecast-slope term in structural score. |

These are the programmatic fallback defaults in Rough.defaults. Initial **search form** candidate values are separate UI presets (for example W=16 or 32; gamma=0 or 0.5). An imported, optimized or previously saved active parameter set can therefore differ from the fallback defaults. Invalid parameters throw explicit errors.

Other research defaults from Rough.costs are initial balance $1,000; leverage 5x; collateral 10%; trading fee 0.035% of notional **per side**; slippage 0.005% per side; borrowing 0.0003% of notional per hour; funding 0; liquidation at 90% collateral loss; and 90,000-ms gap limit. The UI permits changing these assumptions and searching leverage/allocation, but live protocol constraints still apply to orders.

## 14. Chart geometry and why candles sometimes look different

### 14.1 Price-axis auto fit

chart-visuals.js first collects actual visible candles with valid high/low and discards 'gap-fill'. It fits minimum low, maximum high and optionally the current accepted quote. The indicator can provide bounds, but their effect on the fitted axis is deliberately capped: at most 35% of the original candle span on either side. Then it adds padding of the greater of 12% of the fitted span and 0.008% of the top value, with a minimum span approximately 0.015% of price.

This design prevents a far-away liquidation line or extreme projected border from **flattening real candles** into a small horizontal band. Therefore a projected line can be visually clipped even though its mathematical value exists. Do not infer that an offscreen projected level is numerically absent.

### 14.2 Time axis, zoom and viewport

Default chart span is 75 minutes, bounded to 10 through 267,840 minutes. Pan offset is stored in minutes and clamped to available history. The user-selected interval can be one of auto/1/5/15/60/240/1440 minutes. Month/six-month presets use UTC calendar-month subtraction and actual hourly history; the display labels show time range, sampled candle interval, zoom and whether viewing latest versus past.

Future projection space is reserved at chart right in proportion to the desired number of steps and visible candles, with minimum/maximum pixel constraints. Dotted projections exist only when viewing the latest bar of the indicator data, **not when panning through old price history**. Panning to historical bars does not draw a hindsight 'future' that would falsely imply it was known then.

### 14.3 What a changing line means

A new **current incomplete** candle can change the observed close, range, score, center, OLS fit and whole projected ray. This is not necessarily a classic 'repainting' bug: it is an expected consequence of continuously changing **currently available** observations. Fully historical calculation is causal for stable input rows, and the tests compare prefix series against corresponding prefixes of full histories. If the data provider later revises stored historical candles, recomputing from changed input can also change historical values.

Missing data, changing timeframe, reaggregation, live skew updates and new downloaded history can move bands and readouts. Visibility may change without a change in the underlying mathematical series because the price fit, clipped projection and plot size adapt to the screen.

## 15. Python research pipeline versus Android chart

pipeline/rough_alpha.py provides Signature2 with increment append and inverse prefix removal, and RoughPathIndicator.update, which operates on chronological log-price ticks and a bounded deque. It shares the basic time/log-price signature-area, quadratic-variation, causal play/deadband and microstructure-pressure concepts. Its rejection parameter defaults to 0.82, corresponding roughly to chart \(1-s\) when s=0.18. It has its own selectable W and band multiplier.

**Important differences:**

- The standalone Python update returns price center, upper/lower, drift, area, efficiency and a 'structural_score'. It does **not** implement the Android P-point OLS ray, 3H prediction, chart blue close-anchoring, or final L/S decision/threshold/price-residual gates.
- Python's default band uses its W-length variation, whereas Android lets B differ from W.
- The standalone structural score omits the Android forecast slope contribution gamma*z and its separate UI search/application mechanics.
- The Python module is read-only and does not send orders or store signing keys.
- The chart and optimizer in the APK use the JavaScript 'rough.js' version described in §§4–12.

Thus do not call Python pipeline output a bit-for-bit identical replication of **every** Android chart signal when nonmatching parameters or missing projection logic are involved.

## 16. Worked interpretation checklist

When looking at the terminal, interpret the items in this order:

1. **Market reality:** verify quote freshness, market name, actual observed candles and selected timeframe. A stale quote invalidates an execution decision even if the chart still contains history.
2. **Turquoise center:** estimate the causal noise-rejected structural level, not a quote or a guaranteed fair value.
3. **Gold and rose bounds:** observe the recent QV-based structural envelope; note whether live pressure is valid or the bands have reverted to neutral.
4. **Score and L/S marker:** inspect whether a gated structural direction is present, and remember triangle = changed research direction, not trade receipt.
5. **Dotted center and borders:** interpret them as three **independent fixed-slope** continuations of recent filtered observations.
6. **Pale-blue line:** treat it as the projected **center move translated to the last candle close**, not an additional learned strategy.
7. **LONG and SHORT cards:** read them as extreme upside/downside **price-distance scenarios** among displayed projected bounds, before leverage, fees, funding, slippage or any probability adjustment.
8. **Positions/LIQs:** use yellow/purple/red/public/average levels as separate account/public-exposure context; these do not themselves create the blue forecast.
9. **Research scores:** assess results on train, validation and genuinely untouched holdout, with feasible live-market costs and enough trades. Never equate backtest ROI to live success.

## 17. Limitations, omissions and important non-claims

- No empirical calibration currently maps structural score, delta, pressure or forecast magnitude into a probability of achieving an outcome. A score of 2.5 is **not 25%, 50%, or 250% confidence**.
- The bands are not conditional quantiles, calibrated volatility confidence levels or exchange liquidation clusters.
- The prediction trajectory is linear in price per sample; a 36-step projection is not 36 independently forecast future candles.
- Neither the current code nor the standalone Python path integrates a trained neural model into these forecast line formulas.
- The pressure modifier is asymmetric (long-cascade risk) and subject to hard freshness/coverage constraints; a low pressure value does not prove a safe long trade.
- Missing spot trades, funding or chain snapshots are not to be silently interpreted as zero market activity.
- Research BTC spot data and live gTrade oracle data have different feeds, execution conventions and prices.
- The last visible forecast point, screen size and selected candle interval can alter card percentages and displayed duration.
- Long and short scenario percentages are **not** projected return on a leveraged position. They exclude collateral, liquidation risk, execution spreads and holding costs.
- The signal's direction does not impose actual TP/SL, profit taking, or position sizing in live mode.
- With arbitrary gTrade market restrictions, leverage listed for one market or simulator cannot be assumed legal for another live market.
- Optimizer selection on train/validation may overfit. Re-running searches after viewing holdout invalidates that holdout as an untouched out-of-sample assessment.
- Backtesting historical candles does not reproduce the actual order book, transaction submission, oracle settlement, changing fees or cross-chain supply of state.
- Normal Android/WebView redraws, viewport clipping and chart candles-in-progress must not be misrepresented as invisible predictive certainty.

## 18. Source-level reproduction recipe

To reproduce the plotted state for fixed historical inputs:

1. Feed strictly increasing real observations \(\{t,O,H,L,C\}\); select a fixed display candle interval and group actual rows accordingly. Omit gap placeholders.
2. Compute log-close \(d_i\), rolling QV, total absolute variation, prefix time-weighted log increments and valid segment starts.
3. At each valid point compute drift, normalized signature area, efficiency, raw score and the deadband center \(F_i\).
4. Compute B-window neutral half-width \(D_i\), then apply **only contemporaneously valid** microstructure observation to get actual upper/lower \(U_i,L_i\).
5. Update the last-P filtered-center slope ring. Derive the 3H normalized forecast-slope score contribution; gate signal by readiness, efficiency, threshold and residual price relation.
6. At the latest edge only, fit independent center/upper/lower slopes and construct \(3H+1\) dotted projection points with boundary guards.
7. Calculate the actual drawing viewport and permitted visible forecast subset. Shift the **center forecast** to anchor at the last candle close; derive the pale-blue line, its final target and its percentage change.
8. Shift upper/lower by the same offset; compute LONG as **max** upper over all retained steps and SHORT as **min** lower. Convert their distances to dollars and percentages of anchor close.
9. Plot the independent unrelated trade/entry/LIQ/average levels, fit the y-scale primarily to actual candles, render indicator and predicted rays and then draw the actual candle bodies in front.
10. When backtesting, use the *previous* signal at the *next* sample open, apply configured simulated frictions, split historical data chronologically and evaluate the untouched holdout separately.

For source-level debugging use the exact files in §1 and corresponding test assertions. The checks in tests/channels.test.cjs verify causality, upper>=center>=lower, exact OLS fit, anchor alignment and triple horizon. tests/chart-visuals.test.cjs verifies clipping-safe candle scale and dollar/percentage scenario math. tests/chart-clarity-browser.cjs verifies forecast/candle paint order, visible panels and three phone layouts.

---

**Summary:** The actual predictive machinery is a causal log-price/time second-order signature feature, QV/efficiency-gated geometric center, QV-priced asymmetric channel, OLS slope extrapolation and optional *envelope-only* live long-cascade pressure. The dotted rays extend the three internal series; the pale-blue line translates the center ray to the last candle close; the LONG/SHORT cards report opposite directional **extrema of the translated envelope**. Nothing in these displays is a calibrated probability or an automatic order.
