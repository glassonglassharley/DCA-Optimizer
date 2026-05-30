import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Ic } from '../components/icons';
import {
  THEMES, RATING_STYLES, RATING_LABELS,
  getColor, shade, fmtPrice, computeScore, fgColor,
} from '../components/tokens';

const MAX_DESKTOP = 4;
const MAX_MOBILE  = 2;
const LABEL_W = 148;
const ASSET_W = 168;
const MOBILE_LABEL_W = 100;

const CRYPTO_SYMS = new Set(['BTC', 'ETH', 'SOL', 'HYPE', 'BNB', 'ADA', 'DOGE', 'AVAX', 'COIN']);

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function TickerDot({ sym, size = 28 }) {
  const c = getColor(sym);
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.32), flexShrink: 0,
      background: `linear-gradient(150deg, ${c}, ${shade(c, -18)})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.44,
      boxShadow: `0 1px 0 rgba(255,255,255,.28) inset, 0 4px 10px ${c}55`,
    }}>
      {sym.replace('-USD', '').slice(0, 1)}
    </div>
  );
}

function RatingPill({ rating }) {
  const s = RATING_STYLES[rating] || RATING_STYLES['HOLD'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.bd}`,
      color: s.fg, fontWeight: 700, fontSize: 10.5, letterSpacing: '.06em',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: s.fg, boxShadow: `0 0 6px ${s.fg}` }}/>
      {RATING_LABELS[rating] || rating}
    </span>
  );
}

function ScoreHero({ score, theme, isMobile }) {
  const rating = score >= 8 ? 'STRONG BUY' : score >= 6 ? 'BUY' : score >= 4 ? 'HOLD' : 'WAIT';
  const s = RATING_STYLES[rating];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
        <span style={{ fontSize: isMobile ? 24 : 34, fontWeight: 700, color: s.fg, fontFamily: 'var(--font-mono)', letterSpacing: '-0.04em', lineHeight: 1 }}>
          {score.toFixed(1)}
        </span>
        <span style={{ fontSize: isMobile ? 10 : 12, color: theme.text3, fontFamily: 'var(--font-mono)' }}>/10</span>
      </div>
      <RatingPill rating={rating}/>
    </div>
  );
}

function MAHero({ aboveMa200, ma200dist, theme, isMobile }) {
  if (ma200dist == null) return <span style={{ color: theme.text3, fontSize: 12 }}>—</span>;
  const color = aboveMa200 ? '#EF4444' : '#10B981';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: isMobile ? 20 : 26, fontWeight: 700, color, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
        {aboveMa200 ? '+' : ''}{ma200dist.toFixed(1)}%
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, letterSpacing: '.05em',
        color, background: color + '18', border: `1px solid ${color}40`,
      }}>
        {aboveMa200 ? '▲ ABOVE' : '▼ BELOW'}
      </span>
    </div>
  );
}

function SkeletonCell({ theme }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 60, height: 22, borderRadius: 6, background: theme.line, animation: 'cmpPulse 1.4s ease-in-out infinite' }}/>
      <div style={{ width: 40, height: 14, borderRadius: 6, background: theme.line, animation: 'cmpPulse 1.4s ease-in-out infinite .2s' }}/>
    </div>
  );
}

// ─── Ticker search input ───────────────────────────────────────────────────────

function TickerSearch({ theme, onAdd, existing, disabled, isMobile, maxAssets }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(null);

  const doAdd = async () => {
    const sym = q.trim().toUpperCase();
    if (!sym || disabled || status === 'loading') return;
    if (existing.includes(sym)) { setQ(''); return; }
    setStatus('loading');
    try {
      const r = await fetch(`/api/metrics?symbol=${encodeURIComponent(sym)}`);
      const d = await r.json();
      if (d?.currentPrice && !d.error) {
        onAdd(sym, d);
        setQ('');
        setStatus(null);
      } else {
        setStatus('notfound');
      }
    } catch {
      setStatus('notfound');
    }
  };

  const canSubmit = q.trim().length > 0 && !disabled && status !== 'loading';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 14px', borderRadius: 13,
          background: theme.card,
          border: `1.5px solid ${status === 'notfound' ? '#EF4444' : theme.line2}`,
          opacity: disabled ? 0.5 : 1,
          transition: 'border-color .15s',
        }}>
          {Ic.search(14, theme.text3)}
          <input
            value={q}
            onChange={e => { setQ(e.target.value.toUpperCase()); if (status) setStatus(null); }}
            onKeyDown={e => e.key === 'Enter' && doAdd()}
            placeholder={disabled
              ? (isMobile ? 'Maximum 3 assets on mobile' : `Max ${maxAssets} assets`)
              : 'Add up to 4 assets'}
            disabled={disabled}
            autoComplete="off"
            spellCheck="false"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              color: theme.text, fontSize: 14, fontFamily: 'var(--font-mono)',
              fontWeight: 600, letterSpacing: '.04em',
            }}
          />
          {q && (
            <button onClick={() => { setQ(''); setStatus(null); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.text3, padding: 0, lineHeight: 1, display: 'flex' }}>
              {Ic.close(14, theme.text3)}
            </button>
          )}
        </div>
        <button
          onClick={doAdd}
          disabled={!canSubmit}
          style={{
            height: 46, padding: '0 18px', borderRadius: 13, border: 'none',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit ? `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})` : theme.pillBg,
            color: canSubmit ? '#fff' : theme.text3,
            fontWeight: 700, fontSize: 13,
            opacity: status === 'loading' ? 0.65 : 1,
            transition: 'all .15s',
            boxShadow: canSubmit ? `0 4px 14px ${theme.brand}44` : 'none',
            flexShrink: 0,
          }}
        >
          {status === 'loading' ? '…' : 'Add'}
        </button>
      </div>
      {status === 'notfound' && <div style={{ fontSize: 11, color: '#EF4444', paddingLeft: 2 }}>Ticker not found — check the symbol and try again.</div>}
    </div>
  );
}

// ─── Metric definitions ────────────────────────────────────────────────────────

function buildMetrics(theme, isMobile) {
  return [
    {
      key: 'score',
      label: 'DCA Score',
      hint: 'Composite 0–10',
      bestGetter: a => a.score,
      higherIsBetter: true,
      tall: true,
      render: (a, isBest) => <ScoreHero score={a.score} theme={theme} isMobile={isMobile}/>,
    },
    {
      key: 'ma200',
      label: '200MA Deviation',
      hint: '% from 200-day SMA',
      bestGetter: a => a.ma200dist,
      higherIsBetter: false,
      tall: true,
      render: (a, isBest) => <MAHero aboveMa200={a.aboveMa200} ma200dist={a.ma200dist} theme={theme} isMobile={isMobile}/>,
    },
    {
      key: 'price',
      label: 'Price',
      hint: '24h change',
      bestGetter: null,
      render: (a) => {
        const chgColor = a.chg == null ? theme.text3 : a.chg > 0 ? '#10B981' : a.chg < 0 ? '#EF4444' : theme.text2;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 14 : 18, fontWeight: 700, color: theme.text }}>{fmtPrice(a.price)}</span>
            {a.chg != null && (
              <span style={{ fontSize: isMobile ? 10 : 11, fontWeight: 600, color: chgColor, fontFamily: 'var(--font-mono)' }}>
                {a.chg > 0 ? '+' : ''}{a.chg.toFixed(2)}%
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'rsi',
      label: 'RSI (14)',
      hint: '<30 oversold — better entry',
      bestGetter: a => a.rsi,
      higherIsBetter: false,
      render: (a, isBest) => {
        if (a.rsi == null) return <span style={{ color: theme.text3 }}>—</span>;
        const c = a.rsi < 30 ? '#10B981' : a.rsi > 70 ? '#EF4444' : theme.text;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 18 : 22, fontWeight: 700, color: c, lineHeight: 1 }}>{a.rsi}</span>
            <span style={{ fontSize: 9, color: c, fontWeight: 600, letterSpacing: '.05em' }}>
              {a.rsi < 30 ? 'OVERSOLD' : a.rsi > 70 ? 'OVERBOUGHT' : 'NEUTRAL'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'rating',
      label: 'Buy Rating',
      hint: 'Analyst consensus',
      bestGetter: null,
      render: (a) => <RatingPill rating={a.displayRating}/>,
    },
    {
      key: 'fpe',
      label: 'Forward P/E',
      hint: 'Lower = cheaper vs earnings',
      bestGetter: a => a.isCrypto ? null : a.fpe,
      higherIsBetter: false,
      render: (a, isBest) => {
        if (a.isCrypto) return <span style={{ fontSize: isMobile ? 10 : 11, color: theme.text3 }}>N/A</span>;
        if (a.fpe == null) return <span style={{ color: theme.text3 }}>—</span>;
        const c = a.fpe < 20 ? '#10B981' : a.fpe > 40 ? '#EF4444' : '#F59E0B';
        return <span style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 16 : 20, fontWeight: 700, color: c }}>{a.fpe.toFixed(1)}×</span>;
      },
    },
    {
      key: 'beta',
      label: 'Beta',
      hint: '>1 more volatile than market',
      mobileHide: true,
      bestGetter: null,
      render: (a) => {
        if (a.beta == null) return <span style={{ color: theme.text3 }}>—</span>;
        const c = a.beta < 0.8 ? '#10B981' : a.beta > 1.5 ? '#EF4444' : theme.text2;
        return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: c }}>{a.beta.toFixed(2)}</span>;
      },
    },
    {
      key: 'divYield',
      label: 'Div Yield',
      hint: 'Annual — higher is better',
      mobileHide: true,
      bestGetter: a => a.divYield,
      higherIsBetter: true,
      render: (a, isBest) => {
        if (!a.divYield) return <span style={{ color: theme.text3, fontSize: 11 }}>—</span>;
        return (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: isBest ? '#10B981' : theme.text }}>
            {a.divYield.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: 'wkRange',
      label: '52W Range',
      hint: 'Position within year range',
      bestGetter: a => {
        if (!a.wkHigh || !a.wkLow || !a.price) return null;
        return ((a.price - a.wkLow) / (a.wkHigh - a.wkLow)) * 100;
      },
      higherIsBetter: false,
      render: (a) => {
        if (!a.wkHigh || !a.wkLow || !a.price) return <span style={{ color: theme.text3 }}>—</span>;
        const pct = Math.min(100, Math.max(0, ((a.price - a.wkLow) / (a.wkHigh - a.wkLow)) * 100));
        const c = pct < 25 ? '#10B981' : pct > 75 ? '#EF4444' : theme.text2;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: '100%', maxWidth: isMobile ? 90 : 124 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 13 : 16, fontWeight: 700, color: c }}>{pct.toFixed(0)}%</span>
            <div style={{ width: '100%', height: 5, borderRadius: 99, background: theme.bg2 }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: c }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: 8, color: theme.text3, fontFamily: 'var(--font-mono)' }}>${fmtPrice(a.wkLow)}</span>
              <span style={{ fontSize: 8, color: theme.text3, fontFamily: 'var(--font-mono)' }}>${fmtPrice(a.wkHigh)}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'marketCap',
      label: 'Market Cap',
      hint: '',
      mobileHide: true,
      bestGetter: null,
      render: (a) => {
        const raw = typeof a.marketCap === 'object' ? a.marketCap?.raw : a.marketCap;
        const v = typeof raw === 'number' && isFinite(raw) && raw > 0 ? raw : null;
        if (!v) return <span style={{ color: theme.text3 }}>—</span>;
        const fmt = v >= 1e12 ? `$${(v / 1e12).toFixed(2)}T`
          : v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B`
          : `$${(v / 1e6).toFixed(0)}M`;
        return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: theme.text2 }}>{fmt}</span>;
      },
    },
  ];
}

// ─── Best-value helper — returns ALL tied-winner indices ──────────────────────

function isValid(v) { return v != null && !Number.isNaN(v) && isFinite(v); }

function bestIndices(assets, getter, higherIsBetter) {
  if (assets.length < 2) return [];
  let vals;
  try { vals = assets.map(getter); } catch (e) { console.error('[bestIndices] getter threw:', e); return []; }
  if (vals.every(v => !isValid(v))) return [];
  let bv = higherIsBetter ? -Infinity : Infinity;
  vals.forEach(v => {
    if (!isValid(v)) return;
    if (higherIsBetter ? v > bv : v < bv) bv = v;
  });
  if (!isValid(bv)) return [];
  return vals.reduce((acc, v, i) => (isValid(v) && v === bv ? [...acc, i] : acc), []);
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const theme = THEMES.dark;
  const [symbols, setSymbols] = useState([]);
  const [rawMetrics, setRawMetrics] = useState({});
  const [fgIndex, setFgIndex] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const maxAssets = isMobile ? MAX_MOBILE : MAX_DESKTOP;

  useEffect(() => {
    fetch('/api/feargreed')
      .then(r => r.json())
      .then(d => { if (d.value != null) setFgIndex(d.value); })
      .catch(() => {});
  }, []);

  const addAsset = (sym, data) => {
    try {
      if (!sym || !data) return;
      if (symbols.length >= maxAssets || symbols.includes(sym)) return;
      setSymbols(prev => {
        if (prev.includes(sym) || prev.length >= maxAssets) return prev;
        return [...prev, sym];
      });
      setRawMetrics(prev => ({ ...prev, [sym]: data }));
    } catch (err) {
      console.error('[compare] addAsset error:', err);
    }
  };

  const removeAsset = (sym) => {
    setSymbols(prev => prev.filter(s => s !== sym));
    setRawMetrics(prev => { const n = { ...prev }; delete n[sym]; return n; });
  };

  const assets = useMemo(() => symbols.map(sym => {
    try {
      const m = rawMetrics[sym] || {};
      const isCrypto = CRYPTO_SYMS.has(sym);
      const aboveMa72 = m.aboveMa72 ?? null;
      const aboveMa200 = m.aboveMa200 ?? null;
      const ma200dist = (m.currentPrice && m.ma200) ? ((m.currentPrice - m.ma200) / m.ma200) * 100 : null;
      const fpe = m.forwardPE ? parseFloat(m.forwardPE) : null;
      const score = computeScore(m.rsi, fgIndex, isCrypto ? null : fpe, m.rating || 'HOLD', isCrypto, aboveMa72, ma200dist);
      const displayRating = score >= 8 ? 'STRONG BUY' : score >= 6 ? 'BUY' : score >= 4 ? 'HOLD' : 'WAIT';
      const ma200distRounded = (ma200dist != null && isFinite(ma200dist)) ? parseFloat(ma200dist.toFixed(1)) : null;
      return {
        sym,
        name: m.name || sym,
        price: m.currentPrice || null,
        chg: m.regularMarketChangePercent ?? null,
        rsi: (m.rsi != null && m.rsi !== 0) ? m.rsi : null,
        fpe,
        displayRating,
        score: isFinite(score) ? score : 5,
        aboveMa72,
        aboveMa200,
        ma200dist: ma200distRounded,
        ma200: m.ma200 || null,
        beta: m.beta ? parseFloat(m.beta) : null,
        divYield: m.dividendYield ? parseFloat(m.dividendYield) : null,
        marketCap: m.marketCap ?? null,
        wkHigh: m.fiftyTwoWeekHigh ?? null,
        wkLow: m.fiftyTwoWeekLow ?? null,
        isCrypto,
      };
    } catch (err) {
      console.error(`[compare] asset build error for ${sym}:`, err);
      return { sym, name: sym, price: null, chg: null, rsi: null, fpe: null, displayRating: 'HOLD', score: 5, aboveMa72: null, aboveMa200: null, ma200dist: null, ma200: null, beta: null, divYield: null, marketCap: null, wkHigh: null, wkLow: null, isCrypto: CRYPTO_SYMS.has(sym) };
    }
  }), [symbols, rawMetrics, fgIndex]);

  const metrics = useMemo(() => buildMetrics(theme, isMobile), [isMobile]);
  const visibleMetrics = isMobile ? metrics.filter(m => !m.mobileHide) : metrics;

  const isEmpty = symbols.length === 0;
  const gridCols = isMobile
    ? `${MOBILE_LABEL_W}px ${assets.map(() => '1fr').join(' ')}`
    : `${LABEL_W}px ${assets.map(() => `${ASSET_W}px`).join(' ')}`;
  const gridMinW = isMobile ? 'unset' : LABEL_W + assets.length * ASSET_W;

  return (
    <>
      <Head>
        <title>Compare — DCA Anchor</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      <style jsx global>{`
        :root { --font-ui: "Geist", system-ui, sans-serif; --font-mono: "Geist Mono", ui-monospace, monospace; }
        html, body { margin: 0; padding: 0; background: ${theme.bg}; font-family: var(--font-ui); -webkit-font-smoothing: antialiased; }
        * { box-sizing: border-box; }
        button, input { font-family: inherit; }
        ::-webkit-scrollbar { width: 0; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 99px; }
        @keyframes cmpFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        @keyframes cmpPulse { 0%, 100% { opacity: .4; } 50% { opacity: .9; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>

        {/* ── Sticky top bar ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(11,16,32,.88)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          borderBottom: `1px solid ${theme.line}`,
        }}>
          <Link href="/" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: 10,
            border: `1px solid ${theme.line2}`, background: theme.pillBg,
            color: theme.text, textDecoration: 'none', flexShrink: 0,
          }}>
            {Ic.chevL(16, theme.text2)}
          </Link>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, letterSpacing: '-.02em' }}>Compare Assets</div>
            <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 0.5 }}>Side-by-side DCA signal breakdown · max 4 on desktop · max 2 on mobile</div>
          </div>

          {fgIndex != null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 9px',
              borderRadius: 8, background: fgColor(fgIndex) + '18',
              border: `1px solid ${fgColor(fgIndex)}40`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: fgColor(fgIndex), fontFamily: 'var(--font-mono)' }}>{fgIndex}</span>
              <span style={{ fontSize: 9.5, color: fgColor(fgIndex), fontWeight: 600 }}>F&amp;G</span>
            </div>
          )}

          {symbols.length > 0 && (
            <button onClick={() => { setSymbols([]); setRawMetrics({}); }} style={{
              height: 32, padding: '0 12px', borderRadius: 9,
              border: `1px solid ${theme.line2}`, background: 'transparent',
              color: theme.text3, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              flexShrink: 0,
            }}>Clear all</button>
          )}
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 80px' }}>

          {/* ── Search bar ── */}
          <TickerSearch
            theme={theme}
            onAdd={addAsset}
            existing={symbols}
            disabled={symbols.length >= maxAssets}
            isMobile={isMobile}
            maxAssets={maxAssets}
          />

          {/* ── Asset chips ── */}
          {symbols.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', animation: 'cmpFade .3s' }}>
              {symbols.map(sym => {
                const c = getColor(sym);
                return (
                  <div key={sym} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px 6px 8px', borderRadius: 10,
                    background: c + '15', border: `1.5px solid ${c}50`,
                  }}>
                    <TickerDot sym={sym} size={20}/>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)' }}>{sym}</span>
                    <button onClick={() => removeAsset(sym)} style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: theme.text3, padding: 0, display: 'flex', lineHeight: 1,
                    }}>
                      {Ic.close(12, theme.text3)}
                    </button>
                  </div>
                );
              })}
              {symbols.length < maxAssets && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 10,
                  border: `1.5px dashed ${theme.line2}`, color: theme.text3, fontSize: 11,
                }}>
                  + add {maxAssets - symbols.length} more
                </div>
              )}
            </div>
          )}

          {/* ── Empty state ── */}
          {isEmpty && (
            <div style={{
              marginTop: 32, textAlign: 'center', padding: '64px 24px',
              border: `1px dashed ${theme.line2}`, borderRadius: 20,
              background: theme.card,
            }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>⚖️</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: theme.text, marginBottom: 8 }}>Compare up to {maxAssets} assets</div>
              <div style={{ fontSize: 13, color: theme.text2, maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
                Search any stock, ETF, or crypto ticker above. DCA scores, 200MA deviation, RSI, and more side by side.
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['NVDA', 'AAPL', 'BTC', 'TSLA', 'TSM'].map(sym => {
                  const c = getColor(sym);
                  return (
                    <button key={sym} onClick={() => {
                      fetch(`/api/metrics?symbol=${sym}`)
                        .then(r => r.json())
                        .then(d => { if (d?.currentPrice) addAsset(sym, d); })
                        .catch(() => {});
                    }} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
                      borderRadius: 10, border: `1.5px solid ${c}50`, background: c + '12',
                      cursor: 'pointer', color: theme.text, fontSize: 12, fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      <TickerDot sym={sym} size={18}/>
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Comparison table ── */}
          {!isEmpty && (
            <div style={{
              marginTop: 24,
              borderRadius: 18, border: `1px solid ${theme.line}`,
              background: theme.card, overflow: 'hidden',
              animation: 'cmpFade .35s',
            }}>
              <div style={{ overflowX: isMobile ? 'hidden' : 'auto', WebkitOverflowScrolling: 'touch' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  minWidth: gridMinW,
                }}>

                  {/* ── Column headers ── */}
                  {/* corner cell */}
                  <div style={{
                    padding: '14px 12px 14px 16px',
                    background: theme.bg2,
                    borderBottom: `1px solid ${theme.line2}`,
                    position: 'sticky', left: 0, zIndex: 4,
                    display: 'flex', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: theme.text3, letterSpacing: '.08em' }}>METRIC</span>
                  </div>

                  {assets.map((a, i) => {
                    const c = getColor(a.sym);
                    return (
                      <div key={a.sym} style={{
                        padding: isMobile ? '10px 6px 12px' : '14px 12px 16px',
                        borderBottom: `1px solid ${theme.line2}`,
                        borderLeft: `1px solid ${theme.line}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? 4 : 6,
                        background: theme.card, position: 'relative',
                      }}>
                        <TickerDot sym={a.sym} size={isMobile ? 26 : 34}/>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 12 : 14, fontWeight: 700, color: theme.text }}>{a.sym}</div>
                        {!isMobile && <div style={{ fontSize: 10, color: theme.text3, textAlign: 'center', maxWidth: 140, lineHeight: 1.35 }}>{a.name}</div>}
                        <button onClick={() => removeAsset(a.sym)} style={{
                          position: 'absolute', top: 6, right: 6,
                          width: 20, height: 20, borderRadius: 6,
                          border: `1px solid ${theme.line2}`, background: 'transparent',
                          color: theme.text3, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {Ic.close(10, theme.text3)}
                        </button>
                      </div>
                    );
                  })}

                  {/* ── Metric rows ── */}
                  {visibleMetrics.map((metric, mi) => {
                    const bIdxs = metric.bestGetter != null
                      ? bestIndices(assets, metric.bestGetter, metric.higherIsBetter)
                      : [];
                    const bestSyms = bIdxs.map(i => assets[i]?.sym).filter(Boolean);

                    return (
                      <div key={metric.key} style={{ display: 'contents' }}>

                        {/* Label cell */}
                        <div style={{
                          padding: isMobile
                            ? (metric.tall ? '14px 6px 14px 8px' : '11px 6px 11px 8px')
                            : (metric.tall ? '20px 12px 20px 16px' : '15px 12px 15px 16px'),
                          borderTop: `1px solid ${theme.line}`,
                          background: theme.bg2,
                          position: 'sticky', left: 0, zIndex: 2,
                          display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        }}>
                          <div style={{ fontSize: isMobile ? 10 : 12, fontWeight: 600, color: theme.text2, lineHeight: 1.3 }}>{metric.label}</div>
                          {metric.hint && !isMobile && <div style={{ fontSize: 10, color: theme.text3, marginTop: 2, lineHeight: 1.3 }}>{metric.hint}</div>}
                          {bestSyms.length > 0 && (
                            <div style={{ marginTop: isMobile ? 3 : 5, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ width: 5, height: 5, borderRadius: 99, background: '#10B981', flexShrink: 0 }}/>
                              <span style={{ fontSize: 9, color: '#10B981', fontWeight: 600 }}>
                                {bestSyms.length > 1 ? 'tied: ' : 'best: '}{bestSyms.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Value cells */}
                        {assets.map((a, ai) => {
                          const isBest = bIdxs.includes(ai);
                          return (
                            <div key={a.sym} style={{
                              padding: isMobile
                                ? (metric.tall ? '14px 8px' : '11px 8px')
                                : (metric.tall ? '20px 12px' : '15px 12px'),
                              borderTop: `1px solid ${theme.line}`,
                              borderLeft: `1px solid ${isBest ? 'rgba(16,185,129,.35)' : theme.line}`,
                              background: isBest ? 'rgba(16,185,129,.07)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background .2s',
                            }}>
                              {metric.render(a, isBest)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Disclaimer ── */}
          <div style={{ marginTop: 20, fontSize: 11, color: theme.text3, textAlign: 'center', lineHeight: 1.6 }}>
            Educational market data only — not financial advice, not personalized recommendations.{' '}
            <Link href="/methodology" style={{ color: theme.brand, textDecoration: 'none' }}>Score methodology →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
