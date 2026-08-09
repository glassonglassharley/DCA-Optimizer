export const TICKER_COLORS = {
  XLV:'#4FB8E5', COST:'#8B5CF6', MSFT:'#34D399', GLD:'#FBBF24',
  'BTC-USD':'#F97316', TSLA:'#EF4444', QQQ:'#60A5FA', IBIT:'#A78BFA',
  AIPO:'#22D3EE', WMT:'#EC4899', DIVO:'#14B8A6', NVDA:'#84CC16', V:'#6366F1',
  BTC:'#F97316', ETH:'#7C3AED', SOL:'#9333EA', HYPE:'#06B6D4',
  AAPL:'#94A3B8', GOOGL:'#4ADE80', AMZN:'#FCD34D', META:'#60A5FA',
  AMD:'#F87171', COIN:'#818CF8', NFLX:'#E50914',
};

export const RATING_STYLES = {
  'STRONG BUY': { fg:'#4ade80', bg:'rgba(74,222,128,.12)', bd:'rgba(74,222,128,.4)' },
  'BUY':        { fg:'#10B981', bg:'rgba(16,185,129,.14)', bd:'rgba(16,185,129,.45)' },
  'HOLD':       { fg:'#F59E0B', bg:'rgba(245,158,11,.14)', bd:'rgba(245,158,11,.45)' },
  'WAIT':       { fg:'#94A3B8', bg:'rgba(148,163,184,.16)',bd:'rgba(148,163,184,.45)' },
  'SELL':       { fg:'#EF4444', bg:'rgba(239,68,68,.12)',  bd:'rgba(239,68,68,.4)' },
  'STRONG SELL':{ fg:'#fca5a5', bg:'rgba(239,68,68,.15)', bd:'rgba(239,68,68,.45)' },
  'AVOID':      { fg:'#EF4444', bg:'rgba(239,68,68,.12)', bd:'rgba(239,68,68,.4)' },
};

export const RATING_LABELS = {
  'STRONG BUY':  'High',
  'BUY':         'Favorable',
  'HOLD':        'Neutral',
  'WAIT':        'Wait',
  'SELL':        'Sell Signal',
  'STRONG SELL': 'Strong Sell',
  'AVOID':       'Avoid',
};

/**
 * Published weights. These are the real coefficients the score is built from —
 * scoreAsset() divides by the weight actually in play, so what is shown here is
 * what a component is worth.
 */
export const SCORE_WEIGHTS = {
  ma200: 0.30,
  rsi: 0.25,
  ma72: 0.15,
  fg: 0.15,
  fpe: 0.10,
  analyst: 0.05,
};

export const SCORE_METHODOLOGY = {
  lastUpdated: '2026-08-08',
  baseScore: 5,
  absolute: true,
  model: 'continuous-weighted',
  formula: 'score = 5 + 5 × ( Σ weightᵢ × signalᵢ ) ÷ ( Σ active weightᵢ )',
  summary: [
    'Every asset starts from a neutral centre of 5.0.',
    'Each signal is normalized to a continuous value between −1 and +1, where +1 is the most favorable setup for adding and −1 the most extended.',
    'Each normalized signal is multiplied by its published weight.',
    'Signals that are missing or do not apply are dropped from both sides of the calculation, and the remaining weights are renormalized — they are never counted as neutral.',
    'The resulting weighted signal shifts the score up or down from 5.',
    'A score of exactly 5.0 now means a genuinely neutral setup, not an absence of data.',
    'The score is absolute — it describes the asset against its own history, not against the rest of your watchlist.',
    'Signal coverage shows how much of the model was actually populated for that asset.',
  ],
  components: [
    {
      id: 'ma200', label: '200-day SMA distance', weight: '30%', formula: 'clamp(−distance% ÷ 20)',
      note: 'Primary long-term baseline. The further below the 200-day average, the more favorable; extension above it is penalized proportionally.',
      scale: [['20% below', '+1'], ['10% below', '+0.5'], ['at the 200SMA', '0'], ['10% above', '−0.5'], ['20%+ above', '−1']],
    },
    {
      id: 'rsi', label: 'RSI', weight: '25%', formula: 'clamp((50 − RSI) ÷ 25)',
      note: 'Contrarian momentum, centred on RSI 50. Cooler momentum scores higher; hot momentum scores lower.',
      scale: [['RSI 25 or lower', '+1'], ['RSI 37.5', '+0.5'], ['RSI 50', '0'], ['RSI 62.5', '−0.5'], ['RSI 75 or higher', '−1']],
    },
    {
      id: 'ma72', label: '72-day EMA distance', weight: '15%', formula: 'clamp(−distance% ÷ 10)',
      note: 'Medium-term trend. Measured as percentage distance from the 72-day EMA, so a small dip is scored differently from a deep one.',
      scale: [['10% below', '+1'], ['5% below', '+0.5'], ['at the 72EMA', '0'], ['5% above', '−0.5'], ['10%+ above', '−1']],
    },
    {
      id: 'fg', label: 'Fear & Greed', weight: '15%', formula: 'clamp((50 − F&G) ÷ 25)',
      note: 'Broad market sentiment. Fear is constructive for long-term accumulators; greed is treated as caution.',
      scale: [['25 or lower', '+1'], ['37.5', '+0.5'], ['50', '0'], ['62.5', '−0.5'], ['75 or higher', '−1']],
    },
    {
      id: 'fpe', label: 'Forward P/E', weight: '10%', formula: 'clamp((30 − F/PE) ÷ 15)',
      note: 'Valuation, for assets where earnings make it meaningful. Excluded for crypto, hedges, MSTR, negative forward earnings, and missing data — and when excluded its weight is removed, not zeroed.',
      scale: [['P/E 15 or lower', '+1'], ['P/E 22.5', '+0.5'], ['P/E 30', '0'], ['P/E 37.5', '−0.5'], ['P/E 45 or higher', '−1']],
    },
    {
      id: 'analyst', label: 'Analyst consensus', weight: '5%', formula: 'symmetric mapping',
      note: 'Small tie-breaker from sell-side consensus. Excluded entirely when no analyst covers the asset, rather than being read as a Hold.',
      scale: [['Strong Buy', '+1'], ['Buy', '+0.5'], ['Hold', '0'], ['Sell', '−0.5'], ['Strong Sell', '−1']],
    },
  ],
  thresholds: [
    { min: 8, max: 10, key: 'STRONG BUY', label: 'High', meaning: 'Multiple favorable signals are aligned.' },
    { min: 6, max: 7.9, key: 'BUY', label: 'Favorable', meaning: 'More signals are favorable than unfavorable.' },
    { min: 4, max: 5.9, key: 'HOLD', label: 'Neutral', meaning: 'Mixed, incomplete, or mostly balanced signals.' },
    { min: 0, max: 3.9, key: 'WAIT', label: 'Wait', meaning: 'Signals are extended or unfavorable for a fresh DCA add.' },
  ],
};

export function ratingForScore(score) {
  if (score >= 8) return 'STRONG BUY';
  if (score >= 6) return 'BUY';
  if (score >= 4) return 'HOLD';
  return 'WAIT';
}

export function ratingRangeText(rating) {
  const row = SCORE_METHODOLOGY.thresholds.find(t => t.key === rating);
  return row ? `${row.label}: ${row.min}–${row.max}/10. ${row.meaning}` : 'Score label based on the 0–10 composite.';
}

export const TAG_STYLES = {
  CORE:'#22D3EE', HEDGE:'#FBBF24', SAT:'#A78BFA', INCOME:'#34D399',
  CRYPTO:'#F97316', TECH:'#818CF8', STOCK:'#60A5FA', ETF:'#34D399',
};

// Starting points for the "Add account" picker, not a closed set: portfolio
// names are free text (1–40 chars), so anything here is a shortcut for typing,
// and "Custom…" still accepts whatever the user wants. The picker merges these
// with the names the account already uses, so the list reflects real usage
// rather than staying frozen at whatever ships here.
export const ACCOUNT_TYPES = [
  'Roth IRA',
  'Traditional IRA',
  'Individual',
  'Brokerage',
];

export const THEMES = {
  dark: {
    bg:'#0B1020', bg2:'#0F162B', card:'#141B30', cardHi:'#1A2240',
    line:'rgba(255,255,255,0.08)', line2:'rgba(255,255,255,0.14)',
    text:'#F1F5FB', text2:'#A8B2C8', text3:'#6E7793',
    brand:'#5BC8FF', brand2:'#A78BFA', pillBg:'rgba(255,255,255,0.06)',
  },
  light: {
    bg:'#F6F7FB', bg2:'#EEF0F7', card:'#FFFFFF', cardHi:'#FAFBFF',
    line:'rgba(15,20,40,0.08)', line2:'rgba(15,20,40,0.14)',
    text:'#0E1330', text2:'#4B5478', text3:'#8089A4',
    brand:'#2A6FDB', brand2:'#7A5AE0', pillBg:'rgba(15,20,40,0.05)',
  },
};

export const GLOSSARY = [
  { key:'DCA', term:'Dollar-Cost Averaging', cat:'Strategy',
    def:'Investing a fixed dollar amount on a regular schedule regardless of price. Smooths out timing risk by averaging your cost basis across many buys.',
    example:'$200 every Monday into XLV — you buy more shares when cheap, fewer when expensive.' },
  { key:'RSI', term:'Relative Strength Index', cat:'Technical',
    def:'A momentum oscillator (0–100) measuring speed and magnitude of recent price moves. Common interpretation: ≤ 30 oversold, ≥ 70 overbought.',
    example:'XLV RSI 38 — cooling off, approaching the oversold zone.' },
  { key:'FPE', term:'Forward P/E Ratio', cat:'Valuation',
    def:'Current price ÷ analyst-estimated next-12-month EPS. Lower = cheaper vs expected earnings.',
    example:'XLV F/PE 18.4 vs sector avg ~20 — priced near the middle of its range.' },
  { key:'FG', term:'Fear & Greed Index', cat:'Sentiment',
    def:'0–100 market-sentiment gauge: 0 extreme fear, 100 extreme greed. Contrarian read — fear can precede bottoms.',
    example:'Reading 42 — mildly fearful, historically a constructive window for accumulators.' },
  { key:'SCORE', term:'Composite Score', cat:'Internal',
    def:'0–10 internal score combining RSI position, F&G, valuation (F/PE percentile), and trend. Higher = more attractive entry. Not advice.',
    example:'XLV: RSI low + F&G fearful + F/PE in-range → 7.6/10.' },
  { key:'OS', term:'Oversold / Overbought', cat:'Technical',
    def:'RSI states. Oversold (≤ 30) suggests selling may be exhausted; overbought (≥ 70) suggests buying may be exhausted.',
    example:'AIPO RSI 82 — deep into overbought territory.' },
  { key:'TAGS', term:'Core / Hedge / Satellite / Income', cat:'Strategy',
    def:'Portfolio role tags. Core = backbone. Hedge = diversifier. Satellite = higher-conviction smaller positions. Income = yield-focused.',
    example:'XLV is CORE — the largest, longest-held positions in your portfolio.' },
  { key:'RATINGS', term:'Score Labels', cat:'Internal',
    def:'Label the DCA composite score suggests. These reflect signals only — your DCA schedule overrides any label. Not financial advice.',
    example:'"Wait" means metrics are unfavorable today; skip this buy and DCA into something else.' },
  { key:'MA200', term:'200-day Moving Average', cat:'Technical',
    def:'Average closing price over the last 200 trading days. Price above = uptrend, below = downtrend.',
    example:'QQQ is currently 11% above its 200-day MA — extended.' },
];

export function getColor(sym) {
  return TICKER_COLORS[sym] || '#60A5FA';
}

export function fgColor(v) {
  if (v == null) return '#6E7793';
  if (v >= 75) return '#EF4444';
  if (v >= 55) return '#F59E0B';
  if (v >= 45) return '#10B981';
  if (v >= 25) return '#22D3EE';
  return '#6366F1';
}

export function fgLabel(v) {
  if (v == null) return '—';
  if (v >= 75) return 'Extreme Greed';
  if (v >= 55) return 'Greed';
  if (v >= 45) return 'Neutral';
  if (v >= 25) return 'Fear';
  return 'Extreme Fear';
}

// RSI 5/95 strategy: only flag extremes
export function rsiSignalColor(v, theme) {
  if (v == null) return theme.text3;
  if (v < 5)  return '#10B981';
  if (v > 95) return '#EF4444';
  return theme.text;
}

export function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  r = Math.round((t - r) * p) + r;
  g = Math.round((t - g) * p) + g;
  b = Math.round((t - b) * p) + b;
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function fmtPrice(p) {
  if (p == null || p <= 0) return '—';
  if (p < 0.01) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(3);
}

const clamp1 = (x) => Math.max(-1, Math.min(1, x));
const finite = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Percentage distance of price from a moving average, or null if unusable. */
function pctFrom(price, ma) {
  const p = finite(price), m = finite(ma);
  if (p == null || m == null || m === 0) return null;
  return ((p - m) / m) * 100;
}

/**
 * THE single rule deciding whether Forward P/E counts. Scoring, tooltips and the
 * methodology drawer all read this, so they can never disagree — previously the
 * contribution list excluded hedges while the score still applied their P/E.
 */
export function forwardPeEligibility({ sym, tag, isCrypto = false, fpe } = {}) {
  const s = typeof sym === 'string' ? sym.toUpperCase() : '';
  if (isCrypto || tag === 'CRYPTO') return { eligible: false, reason: 'Excluded: earnings-based valuation is not meaningful for crypto' };
  if (tag === 'HEDGE') return { eligible: false, reason: 'Excluded: earnings-based valuation is not meaningful for hedge assets' };
  if (s === 'MSTR') return { eligible: false, reason: 'Excluded for MSTR: Bitcoin treasury company' };
  const v = finite(typeof fpe === 'string' ? parseFloat(fpe) : fpe);
  if (v == null) return { eligible: false, reason: 'Missing Forward P/E data' };
  // A negative forward P/E means expected losses. Left in, the formula reads it
  // as spectacularly cheap and hands out the maximum valuation bonus.
  if (v <= 0) return { eligible: false, reason: `Excluded: forward P/E ${v.toFixed(1)} implies negative earnings` };
  return { eligible: true, value: v };
}

const ANALYST_SIGNAL = { 'STRONG BUY': 1, 'BUY': 0.5, 'HOLD': 0, 'SELL': -0.5, 'STRONG SELL': -1 };

/**
 * Normalized signals for one asset. Every entry carries its published weight and
 * a signal in [-1, +1]; entries with available:false are dropped from the score
 * entirely rather than contributing zero.
 */
export function scoreSignals(input = {}) {
  const { rsi, fg, fpe, rating, analystCount, price, ma72, ma200, sym, tag, isCrypto = false } = input;
  const W = SCORE_WEIGHTS;
  const rows = [];
  const push = (id, label, weight, n, detail, available = true) =>
    rows.push({ id, label, weight, n: available ? n : null, detail, available });

  // 200-day SMA distance — accepts a precomputed distance or derives it.
  const d200 = finite(input.ma200dist) != null ? finite(input.ma200dist) : pctFrom(price, ma200);
  if (d200 == null) push('ma200', '200-day SMA', W.ma200, null, 'Missing 200SMA data', false);
  else push('ma200', '200-day SMA', W.ma200, clamp1(-d200 / 20), `${d200 >= 0 ? '+' : ''}${d200.toFixed(1)}% vs 200SMA`);

  // RSI
  const r = finite(rsi);
  if (r == null) push('rsi', 'RSI', W.rsi, null, 'Missing RSI data', false);
  else push('rsi', 'RSI', W.rsi, clamp1((50 - r) / 25), `RSI ${r}`);

  // 72-day EMA distance — percentage, not a boolean.
  const d72 = finite(input.ma72dist) != null ? finite(input.ma72dist) : pctFrom(price, ma72);
  if (d72 == null) push('ma72', '72-day EMA', W.ma72, null, 'Missing 72EMA data', false);
  else push('ma72', '72-day EMA', W.ma72, clamp1(-d72 / 10), `${d72 >= 0 ? '+' : ''}${d72.toFixed(1)}% vs 72EMA`);

  // Fear & Greed
  const g = finite(fg);
  if (g == null) push('fg', 'Fear & Greed', W.fg, null, 'Missing sentiment data', false);
  else push('fg', 'Fear & Greed', W.fg, clamp1((50 - g) / 25), `F&G ${g}`);

  // Forward P/E
  const pe = forwardPeEligibility({ sym, tag, isCrypto, fpe });
  if (!pe.eligible) push('fpe', 'Forward P/E', W.fpe, null, pe.reason, false);
  else push('fpe', 'Forward P/E', W.fpe, clamp1((30 - pe.value) / 15), `F/PE ${pe.value.toFixed(1)}`);

  // Analyst consensus — absent coverage is an absence, not a Hold.
  const covered = finite(analystCount) != null ? finite(analystCount) > 0 : false;
  const key = typeof rating === 'string' ? rating.toUpperCase() : null;
  if (!covered || key == null || ANALYST_SIGNAL[key] === undefined) {
    push('analyst', 'Analyst consensus', W.analyst, null, 'No analyst coverage', false);
  } else {
    push('analyst', 'Analyst consensus', W.analyst, ANALYST_SIGNAL[key], `${key.toLowerCase()} consensus`);
  }

  return rows;
}

/**
 * score = 5 + 5 × ( Σ wᵢ·nᵢ ) ÷ ( Σ wᵢ over available components )
 * Bounded to [0,10] by construction because every nᵢ ∈ [-1,1]; the clamp is
 * only float defence. Coverage is the share of total weight that was usable.
 */
export function scoreAsset(input = {}) {
  const signals = scoreSignals(input);
  const totalWeight = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
  let num = 0, active = 0;
  for (const s of signals) if (s.available && s.n != null) { num += s.weight * s.n; active += s.weight; }

  const score = active === 0 ? 5 : 5 + 5 * (num / active);
  return {
    score: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
    coverage: Math.round((active / totalWeight) * 100),
    activeWeight: active,
    signals,
  };
}

/** Kept as the single entry point callers use for a bare number. */
export function computeScore(input = {}) {
  return scoreAsset(input).score;
}

/**
 * Per-signal breakdown in SCORE POINTS (already weighted and renormalized), so
 * the numbers shown add up to the distance from the 5.0 centre. `n` is kept
 * alongside for anything that wants the raw normalized signal — the two must
 * never be confused: n is in [-1,1], points are score units.
 */
export function scoreContributions(input = {}) {
  const { signals, activeWeight } = scoreAsset(input);
  return signals.map(s => ({
    id: s.id,
    label: s.label,
    weight: s.weight,
    n: s.n,
    // 5 x wi x ni / active-weight: this component's actual push on the score.
    points: (s.available && s.n != null && activeWeight > 0)
      ? Math.round((5 * s.weight * s.n / activeWeight) * 100) / 100
      : 0,
    detail: s.detail,
    available: s.available,
  }));
}

export function scoreTooltip(h) {
  if (!h) return '0–10 absolute score from moving averages, RSI, sentiment, valuation, and analyst consensus.';
  const { coverage } = scoreAsset({ ...h, isCrypto: h.tag === 'CRYPTO' });
  const factors = scoreContributions({ ...h, isCrypto: h.tag === 'CRYPTO' })
    .filter(x => x.points !== 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 3)
    .map(x => `${x.label} ${x.points > 0 ? '+' : ''}${x.points.toFixed(2)}: ${x.detail}`);
  return [
    `Score ${h.score}/10 (${RATING_LABELS[h.displayRating] || h.displayRating || 'Neutral'})`,
    ...factors,
    `Signal coverage: ${coverage}%`,
  ].join('\n');
}
