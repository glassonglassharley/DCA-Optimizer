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
  'STRONG BUY':  'High DCA Score',
  'BUY':         'Favorable Setup',
  'HOLD':        'Neutral',
  'WAIT':        'Wait Zone',
  'SELL':        'Sell Signal',
  'STRONG SELL': 'Strong Sell',
  'AVOID':       'Avoid',
};

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
    example:'"Wait Zone" means metrics are unfavorable today; skip this buy and DCA into something else.' },
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
  if (p == null) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return p.toFixed(2);
}

export function computeScore(rsi, fg, fpe, rating, isCrypto = false, aboveMa72 = null, aboveMa200 = null) {
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
  // MA signals: below MA = contrarian DCA entry (+1), above = extended (-1)
  if (aboveMa72 != null) score += aboveMa72 ? -1 : 1;
  if (aboveMa200 != null) score += aboveMa200 ? -1 : 1;
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}
