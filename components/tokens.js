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

export const SCORE_METHODOLOGY = {
  lastUpdated: '2026-08-08',
  baseScore: 5,
  absolute: true,
  components: [
    {
      id: 'rsi', label: 'RSI position', weight: '25%', maxPoints: '±2.0',
      note: 'Contrarian momentum signal. Lower RSI means the asset has cooled off; high RSI is treated as extended.',
      rules: [
        ['RSI < 30', '+2.0', 'Oversold / strongest pullback zone'],
        ['30 ≤ RSI < 50', '+1.0', 'Cooling off below mid-range'],
        ['50–60', '0', 'Neutral momentum'],
        ['60 < RSI ≤ 70', '−1.0', 'Warming up / slightly extended'],
        ['RSI > 70', '−2.0', 'Overbought / extended rally'],
      ],
    },
    {
      id: 'ma200', label: '200-day SMA distance', weight: '30%', maxPoints: '+1.5 / −1.5',
      note: 'Primary long-term baseline signal. Pullbacks below the 200-day average are rewarded; large extensions above it are penalized.',
      rules: [
        ['Price below 200SMA', '+1.5', 'Below baseline; favorable DCA zone'],
        ['0–10% above 200SMA', '0', 'Near baseline'],
        ['10–20% above 200SMA', '−0.5', 'Slightly extended'],
        ['>20% above 200SMA', '−1.5', 'Significantly extended'],
      ],
    },
    {
      id: 'ma72', label: '72-day EMA position', weight: '15%', maxPoints: '±1.0',
      note: 'Medium-term trend/pullback signal. Below the 72-day EMA gets a pullback bonus; above it gets an extension penalty.',
      rules: [
        ['Price below 72EMA', '+1.0', 'Pullback vs medium trend'],
        ['Price above 72EMA', '−1.0', 'Above medium trend / less attractive entry'],
      ],
    },
    {
      id: 'fg', label: 'Fear & Greed', weight: '15%', maxPoints: '±1.0',
      note: 'Broad market sentiment. Fear is treated as constructive for long-term accumulators; greed is treated as caution.',
      rules: [
        ['F&G < 30', '+1.0', 'Fear / pessimism'],
        ['30–70', '0', 'Neutral sentiment'],
        ['F&G > 70', '−1.0', 'Greed / complacency'],
      ],
    },
    {
      id: 'fpe', label: 'Forward P/E', weight: '10%', maxPoints: '±1.0',
      note: 'Valuation signal for stocks only. Excluded for crypto, hedges, MSTR, and assets without meaningful earnings estimates.',
      rules: [
        ['F/PE < 20', '+1.0', 'Cheap vs expected earnings'],
        ['20–40', '0', 'Neutral valuation'],
        ['F/PE > 40', '−1.0', 'Premium valuation'],
      ],
    },
    {
      id: 'analyst', label: 'Analyst consensus', weight: '5%', maxPoints: '+1.0 / −1.0',
      note: 'Small tie-breaker from external consensus ratings; deliberately low weight so it cannot dominate technical/valuation signals.',
      rules: [
        ['Strong Buy', '+1.0', 'Consensus support'],
        ['Buy', '+0.5', 'Moderate consensus support'],
        ['Hold', '0', 'Neutral'],
        ['Sell / Strong Sell', '−1.0', 'Consensus caution'],
      ],
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

export function computeScore(rsi, fg, fpe, rating, isCrypto = false, aboveMa72 = null, ma200dist = null) {
  let score = 5;
  if (rsi != null) {
    if (rsi < 30) score += 2;
    else if (rsi < 50) score += 1;
    else if (rsi > 70) score -= 2;
    else if (rsi > 60) score -= 1;
  }
  if (fg != null) {
    if (fg < 30) score += 1;
    else if (fg > 70) score -= 1;
  }
  if (!isCrypto && fpe != null) {
    if (fpe < 20) score += 1;
    else if (fpe > 40) score -= 1;
  }
  if (rating === 'STRONG BUY') score += 1;
  else if (rating === 'BUY') score += 0.5;
  else if (rating === 'SELL' || rating === 'STRONG SELL') score -= 1;
  // 72 EMA: contrarian — below = pullback zone (+1), above = extended (-1)
  if (aboveMa72 != null) score += aboveMa72 ? -1 : 1;
  // 200 SMA distance: graduated scoring
  if (ma200dist != null) {
    if (ma200dist < 0)        score += 1.5;  // below baseline — strong DCA zone
    else if (ma200dist > 20)  score -= 1.5;  // significantly extended
    else if (ma200dist > 10)  score -= 0.5;  // slightly extended
    // 0–10%: neutral, no adjustment
  }
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

export function scoreContributions({ rsi, fg, fpe, rating, isCrypto = false, aboveMa72 = null, ma200dist = null, sym, tag } = {}) {
  const rows = [];
  const add = (id, label, points, detail, available = true) => rows.push({ id, label, points, detail, available });

  if (rsi == null) add('rsi', 'RSI', 0, 'Missing RSI data', false);
  else if (rsi < 30) add('rsi', 'RSI', 2, `RSI ${rsi}: oversold`);
  else if (rsi < 50) add('rsi', 'RSI', 1, `RSI ${rsi}: cooling off`);
  else if (rsi > 70) add('rsi', 'RSI', -2, `RSI ${rsi}: overbought`);
  else if (rsi > 60) add('rsi', 'RSI', -1, `RSI ${rsi}: warming up`);
  else add('rsi', 'RSI', 0, `RSI ${rsi}: neutral`);

  if (fg == null) add('fg', 'Fear & Greed', 0, 'Missing sentiment data', false);
  else if (fg < 30) add('fg', 'Fear & Greed', 1, `F&G ${fg}: fear`);
  else if (fg > 70) add('fg', 'Fear & Greed', -1, `F&G ${fg}: greed`);
  else add('fg', 'Fear & Greed', 0, `F&G ${fg}: neutral`);

  const peExcluded = isCrypto || tag === 'CRYPTO' || tag === 'HEDGE' || sym === 'MSTR';
  if (peExcluded) add('fpe', 'Forward P/E', 0, sym === 'MSTR' ? 'Excluded for MSTR: Bitcoin treasury company' : 'Excluded: P/E is not meaningful for this asset type', false);
  else if (fpe == null) add('fpe', 'Forward P/E', 0, 'Missing Forward P/E data', false);
  else if (fpe < 20) add('fpe', 'Forward P/E', 1, `F/PE ${parseFloat(fpe).toFixed(1)}: inexpensive`);
  else if (fpe > 40) add('fpe', 'Forward P/E', -1, `F/PE ${parseFloat(fpe).toFixed(1)}: premium`);
  else add('fpe', 'Forward P/E', 0, `F/PE ${parseFloat(fpe).toFixed(1)}: neutral`);

  if (rating === 'STRONG BUY') add('analyst', 'Analyst consensus', 1, 'Strong Buy consensus');
  else if (rating === 'BUY') add('analyst', 'Analyst consensus', 0.5, 'Buy consensus');
  else if (rating === 'SELL' || rating === 'STRONG SELL') add('analyst', 'Analyst consensus', -1, 'Sell-side caution');
  else add('analyst', 'Analyst consensus', 0, `${rating || 'Hold'} consensus`);

  if (aboveMa72 == null) add('ma72', '72-day EMA', 0, 'Missing 72EMA data', false);
  else add('ma72', '72-day EMA', aboveMa72 ? -1 : 1, aboveMa72 ? 'Price above 72EMA' : 'Price below 72EMA pullback');

  if (ma200dist == null) add('ma200', '200-day SMA', 0, 'Missing 200SMA data', false);
  else if (ma200dist < 0) add('ma200', '200-day SMA', 1.5, `${ma200dist.toFixed(1)}% below 200SMA`);
  else if (ma200dist > 20) add('ma200', '200-day SMA', -1.5, `${ma200dist.toFixed(1)}% above 200SMA`);
  else if (ma200dist > 10) add('ma200', '200-day SMA', -0.5, `${ma200dist.toFixed(1)}% above 200SMA`);
  else add('ma200', '200-day SMA', 0, `${ma200dist.toFixed(1)}% above 200SMA: near baseline`);

  return rows;
}

export function scoreTooltip(h) {
  if (!h) return '0–10 absolute score from RSI, moving averages, sentiment, valuation, and analyst consensus.';
  const factors = scoreContributions({ ...h, isCrypto: h.tag === 'CRYPTO' })
    .filter(x => x.points !== 0)
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
    .slice(0, 3)
    .map(x => `${x.label} ${x.points > 0 ? '+' : ''}${x.points}: ${x.detail}`);
  return [`Score ${h.score}/10 (${RATING_LABELS[h.displayRating] || h.displayRating || 'Neutral'})`, ...factors].join('\n');
}
