import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import { SignIn as ClerkSignIn, SignInButton, UserButton, useUser } from '@clerk/nextjs';
import { Ic } from '../components/icons';
import PlaidSandboxPanel from '../components/PlaidSandboxPanel';
import {
  TICKER_COLORS, RATING_STYLES, RATING_LABELS, TAG_STYLES, THEMES,
  ACCOUNT_TYPES, SCORE_METHODOLOGY, getColor, fgColor, fgLabel, rsiSignalColor,
  shade, fmtPrice, scoreAsset, ratingForScore, ratingRangeText,
  scoreContributions, scoreTooltip,
  scoreDisplay, coverageLabel, coverageColor, formatCoverage, isRankable,
  COVERAGE_TOOLTIP,
} from '../components/tokens';

// ─── Ticker disambiguation ────────────────────────────────────────────────────
const DISAMBIGUATION_MAP = {
  'HYPE': [
    { sym: 'HYPE',   label: 'Hyperliquid',     sub: 'Crypto · L1 DEX token (HYPE-USD)', tag: 'CRYPTO' },
    { sym: 'HYPE.V', label: 'Aris Mining Corp', sub: 'Stock · TSX Venture Exchange',     tag: 'STOCK'  },
  ],
};

// ─── Private / pre-IPO companies (no Yahoo Finance data) ─────────────────────
const PRIVATE_COMPANIES = {
  'SPACEX':  { name: 'SpaceX',  tag: 'STOCK' },
  'STRIPE':  { name: 'Stripe',  tag: 'STOCK' },
  'OPENAI':  { name: 'OpenAI',  tag: 'TECH'  },
  'DATABRICKS': { name: 'Databricks', tag: 'TECH' },
};

// ─── Atoms ────────────────────────────────────────────────────────────────────

function TickerDot({ sym, size = 28, theme }) {
  const c = getColor(sym);
  const letter = sym.replace('-USD', '').slice(0, 1);
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.32),
      background: `linear-gradient(150deg, ${c}, ${shade(c, -18)})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.46, letterSpacing: '-0.02em',
      boxShadow: `0 1px 0 rgba(255,255,255,.28) inset, 0 4px 10px ${c}55`,
      flex: '0 0 auto',
    }}>{letter}</div>
  );
}

function Card({ style, children, theme, cardStyle = 'flat', tint, onClick }) {
  let surface = {};
  if (cardStyle === 'glass') {
    surface = {
      background: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))',
      border: `0.5px solid ${theme.line2}`,
      backdropFilter: 'blur(20px) saturate(160%)',
      WebkitBackdropFilter: 'blur(20px) saturate(160%)',
      boxShadow: '0 1px 0 rgba(255,255,255,.06) inset, 0 12px 32px rgba(0,0,0,.35)',
    };
  } else if (cardStyle === 'sticker') {
    surface = {
      background: theme.card,
      border: `1.5px solid ${tint || theme.line2}`,
      boxShadow: `0 3px 0 ${tint ? tint + '40' : theme.line2}, 0 12px 24px rgba(0,0,0,.18)`,
    };
  } else {
    surface = {
      background: theme.card,
      border: `1px solid ${theme.line}`,
      boxShadow: '0 1px 0 rgba(255,255,255,.03) inset',
    };
  }
  return (
    <div onClick={onClick} style={{ borderRadius: 18, padding: 16, ...surface, ...style }}>
      {children}
    </div>
  );
}

function RatingPill({ rating, large }) {
  const s = RATING_STYLES[rating] || RATING_STYLES['HOLD'];
  return (
    <span title={ratingRangeText(rating)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: large ? '6px 12px' : '3px 9px',
      borderRadius: 999, background: s.bg, border: `1px solid ${s.bd}`,
      color: s.fg, fontWeight: 700, fontSize: large ? 12 : 10, letterSpacing: '.04em',
      flex: '0 0 auto', maxWidth: '100%', whiteSpace: 'nowrap', lineHeight: 1.1,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.fg, boxShadow: `0 0 8px ${s.fg}`, flex: '0 0 auto' }}/>
      {RATING_LABELS[rating] || rating}
    </span>
  );
}

function TagPill({ tag, theme }) {
  const c = TAG_STYLES[tag] || theme.text3;
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em',
      padding: '3px 7px', borderRadius: 6,
      color: c, background: c + '1F', border: `1px solid ${c}40`,
    }}>{tag}</span>
  );
}

function FGPill({ v }) {
  const c = fgColor(v);
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 6, color: c, background: c + '1F',
      border: `1px solid ${c}40`, minWidth: 32, display: 'inline-flex', justifyContent: 'center',
    }}>{v ?? '—'}</span>
  );
}

function MAPill({ above }) {
  if (above == null) return <span style={{ color: '#4B5478', fontSize: 10 }}>—</span>;
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
      color: above ? '#10B981' : '#EF4444',
      background: above ? 'rgba(16,185,129,.14)' : 'rgba(239,68,68,.14)',
      border: `1px solid ${above ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22,
    }}>
      {above ? '▲' : '▼'}
    </span>
  );
}

function FPEChip({ fpe, tag }) {
  if (fpe == null || tag === 'CRYPTO' || tag === 'HEDGE') return null;
  const val = parseFloat(fpe);
  const color = val < 15 ? '#10B981' : val <= 35 ? '#F59E0B' : '#EF4444';
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
      color, background: color + '20', border: `1px solid ${color}40`,
      fontFamily: 'var(--font-mono)',
    }}>
      PE {val.toFixed(1)}
    </span>
  );
}

function ScoresChart({ data, theme, onPick, focused, chartStyle = 'bars' }) {
  const max = 10;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  if (chartStyle === 'dots') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, padding: '8px 4px 28px', position: 'relative' }}>
        {data.map(d => {
          const c = getColor(d.sym);
          const dots = Math.round(d.score || 0);
          return (
            <div key={d.sym} onClick={() => onPick?.(d.sym)} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 3, cursor: 'pointer', position: 'relative' }}>
              {Array.from({ length: 10 }).map((_, i) => {
                const idx = 9 - i;
                const on = idx < dots;
                return <div key={i} style={{ width: '70%', maxWidth: 14, aspectRatio: '1/1', borderRadius: '50%', background: on ? c : theme.line, opacity: mounted ? 1 : 0, transition: `opacity .5s ${i * 30}ms`, boxShadow: on ? `0 0 8px ${c}66` : 'none' }} />;
              })}
              <div style={{ position: 'absolute', bottom: -22, fontSize: 9, color: focused === d.sym ? c : theme.text3, fontWeight: focused === d.sym ? 700 : 500, fontFamily: 'var(--font-mono)', transform: 'rotate(-30deg)', transformOrigin: 'top left', left: '50%' }}>{d.sym}</div>
            </div>
          );
        })}
      </div>
    );
  }

  const minW = Math.max(data.length * 28 + 22, 220);
  return (
    <div style={{ overflowX: 'auto' }}>
    <div style={{ position: 'relative', paddingLeft: 22, paddingBottom: 28, minWidth: minW }}>
      {[0, 2, 4, 6, 8, 10].map(y => (
        <div key={y} style={{ position: 'absolute', left: 0, right: 0, bottom: 28 + (y / max) * 150, borderTop: `1px dashed ${theme.line}`, opacity: .6 }}>
          <span style={{ position: 'absolute', left: 0, top: -7, fontSize: 9, color: theme.text3, fontFamily: 'var(--font-mono)' }}>{y}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 178, position: 'relative' }}>
        {data.map((d, idx) => {
          const c = getColor(d.sym);
          const h = ((d.score || 0) / max) * 150;
          const isFoc = focused === d.sym;
          return (
            <div key={d.sym} onClick={() => onPick?.(d.sym)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              <div style={{
                width: '70%', maxWidth: 18,
                height: mounted ? h : 0,
                background: `linear-gradient(180deg, ${c}, ${shade(c, -20)})`,
                borderRadius: '6px 6px 2px 2px',
                transition: `height .8s cubic-bezier(.2,.8,.2,1) ${idx * 40}ms`,
                boxShadow: isFoc ? `0 0 0 2px ${c}, 0 0 16px ${c}88` : `0 -1px 0 rgba(255,255,255,.25) inset`,
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontFamily: 'var(--font-mono)', color: c, fontWeight: 700, opacity: isFoc ? 1 : 0, transition: 'opacity .2s' }}>{d.score}</div>
              </div>
              <div style={{ fontSize: 9, color: isFoc ? c : theme.text3, fontWeight: isFoc ? 700 : 500, fontFamily: 'var(--font-mono)', marginTop: 6, transform: 'rotate(-32deg)', transformOrigin: 'top left', whiteSpace: 'nowrap', position: 'absolute', top: '100%', left: '50%' }}>{d.sym}</div>
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

function RSIChart({ data, theme }) {
  const w = 320, h = 170, pad = { l: 20, r: 8, t: 8, b: 24 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const valid = data.filter(d => d.rsi != null);
  if (!valid.length) return (
    <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.text3, fontSize: 12 }}>
      Loading RSI data…
    </div>
  );
  const xs = (i) => pad.l + (i / (valid.length - 1 || 1)) * innerW;
  const ys = (v) => pad.t + (1 - v / 100) * innerH;
  const path = valid.map((d, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(d.rsi)}`).join(' ');
  const area = `${path} L${xs(valid.length - 1)},${pad.t + innerH} L${xs(0)},${pad.t + innerH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="rsiArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.brand} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={theme.brand} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect x={pad.l} y={ys(70)} width={innerW} height={ys(30) - ys(70)} fill={theme.brand} fillOpacity="0.04"/>
      <line x1={pad.l} x2={pad.l + innerW} y1={ys(70)} y2={ys(70)} stroke="#EF4444" strokeOpacity=".35" strokeDasharray="2 3"/>
      <line x1={pad.l} x2={pad.l + innerW} y1={ys(30)} y2={ys(30)} stroke="#10B981" strokeOpacity=".35" strokeDasharray="2 3"/>
      {[0, 20, 40, 60, 80, 100].map(y => (
        <text key={y} x="2" y={ys(y) + 3} fontSize="8" fill={theme.text3} fontFamily="var(--font-mono)">{y}</text>
      ))}
      <path d={area} fill="url(#rsiArea)"/>
      <path d={path} fill="none" stroke={theme.brand} strokeWidth="1.5"/>
      {valid.map((d, i) => {
        const c = getColor(d.sym);
        return (
          <g key={d.sym}>
            <circle cx={xs(i)} cy={ys(d.rsi)} r="5" fill={c} stroke={theme.card} strokeWidth="1.5"/>
            <text x={xs(i)} y={h - 2} fontSize="7" fill={theme.text3} fontFamily="var(--font-mono)" textAnchor="middle" transform={`rotate(-26 ${xs(i)} ${h - 10})`}>{d.sym}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Sparkline({ pts, color, theme }) {
  const w = 320, h = 88;
  const min = Math.min(...pts), max = Math.max(...pts);
  const xs = (i) => (i / (pts.length - 1)) * w;
  const ys = (v) => h - ((v - min) / (max - min || 1)) * h;
  const path = pts.map((v, i) => `${i ? 'L' : 'M'}${xs(i)},${ys(v)}`).join(' ');
  const area = `${path} L${w},${h} L0,${h} Z`;
  const gradId = 'spk' + color.replace('#', '');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".42"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={xs(pts.length - 1)} cy={ys(pts[pts.length - 1])} r="4" fill={color} stroke={theme.card} strokeWidth="1.5"/>
    </svg>
  );
}

function Stat({ theme, cardStyle, label, value, tint, maxValue, bar, zones }) {
  const numVal = typeof value === 'number' ? value : parseFloat(value);
  const pct = bar && !isNaN(numVal) ? Math.min(100, Math.max(0, (numVal / maxValue) * 100)) : 0;
  return (
    <Card theme={theme} cardStyle={cardStyle} style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: theme.text3, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: typeof value === 'string' ? 18 : 26, fontWeight: 700, color: tint || theme.text, fontFamily: 'var(--font-mono)', marginTop: 2, letterSpacing: '-.02em' }}>{value ?? '—'}</div>
      {bar && !isNaN(numVal) ? (
        <div style={{ marginTop: 8, height: 6, borderRadius: 99, background: theme.bg2, position: 'relative', overflow: 'hidden' }}>
          {zones ? (
            <>
              <div style={{ position: 'absolute', left: '30%', top: 0, bottom: 0, width: 1, background: theme.line2 }}/>
              <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, width: 1, background: theme.line2 }}/>
            </>
          ) : null}
          <div style={{ width: `${pct}%`, height: '100%', background: tint, borderRadius: 99, boxShadow: `0 0 8px ${tint}88` }}/>
        </div>
      ) : null}
    </Card>
  );
}

function PercentileBar({ theme, v, sectorAvg }) {
  if (v == null) return (
    <div style={{ height: 24, display: 'flex', alignItems: 'center', fontSize: 11, color: theme.text3 }}>— not applicable —</div>
  );
  const max = 60;
  const pct = Math.min(100, (v / max) * 100);
  const avgPct = sectorAvg != null ? Math.min(100, (sectorAvg / max) * 100) : null;
  const tint = v > 40 ? '#EF4444' : v > 25 ? '#F59E0B' : '#10B981';
  return (
    <div>
      <div style={{ position: 'relative', height: 8, borderRadius: 99, background: theme.bg2, border: `1px solid ${theme.line}` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', borderRadius: 99, background: tint, boxShadow: `0 0 8px ${tint}88` }}/>
        {avgPct != null ? <div style={{ position: 'absolute', left: avgPct + '%', top: -3, bottom: -3, width: 2, background: theme.text2, borderRadius: 2 }}/> : null}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 9.5, color: theme.text3, fontFamily: 'var(--font-mono)' }}>
        <span>0</span><span>15</span>
        <span style={{ color: avgPct != null ? theme.text2 : 'inherit' }}>{avgPct != null ? `sector ${sectorAvg}×` : '30'}</span>
        <span>45</span><span>60+</span>
      </div>
    </div>
  );
}

// ─── Header / Nav ─────────────────────────────────────────────────────────────

function StaxHeader({ theme, onAdd, onLogout, user, fgIndex, isSignedIn }) {
  const [fgOpen, setFgOpen] = useState(false);
  const fgC = fgIndex != null ? fgColor(fgIndex) : theme.text3;
  const fgLbl = fgIndex != null ? fgLabel(fgIndex) : null;
  return (
    <div style={{ padding: '10px 20px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 6px 16px ${theme.brand}55, 0 1px 0 rgba(255,255,255,.3) inset`,
        }}>
          {Ic.logo(20, '#fff')}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em', color: theme.text }}>DCA Anchor</div>
          <div style={{ fontSize: 9.5, color: theme.text3, marginTop: -1, letterSpacing: '.06em' }}>{user || 'GUEST'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {fgIndex != null && (
          <div onClick={() => setFgOpen(v => !v)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: fgOpen ? '4px 10px' : '4px 9px', borderRadius: 9,
            background: fgC + '18', border: `1px solid ${fgC}40`,
            marginRight: 2, cursor: 'pointer', transition: 'all .15s',
          }}>
            {fgOpen ? (
              <div style={{ fontSize: 10, fontWeight: 700, color: fgC, whiteSpace: 'nowrap', lineHeight: 1.4, textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)' }}>F&amp;G {fgIndex}</div>
                <div style={{ fontSize: 8.5, letterSpacing: '.04em' }}>{fgLbl}</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: fgC, fontFamily: 'var(--font-mono)', lineHeight: 1.1 }}>{fgIndex}</div>
                <div style={{ fontSize: 7.5, fontWeight: 700, color: fgC, letterSpacing: '.06em', textTransform: 'uppercase', lineHeight: 1.1 }}>F&amp;G</div>
              </>
            )}
          </div>
        )}
        <IconBtn theme={theme} href="/glossary" title="Glossary">
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text2, fontFamily: 'var(--font-mono)' }}>?</span>
        </IconBtn>
        {!isSignedIn && (
          <SignInButton mode="modal">
            <button type="button" style={{ height: 34, padding: '0 10px', borderRadius: 10, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text2, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Sign in</button>
          </SignInButton>
        )}
        <button type="button" onClick={onAdd} style={{
          height: 34, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
          color: '#fff', fontSize: 12.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: `0 6px 16px ${theme.brand}55, 0 1px 0 rgba(255,255,255,.3) inset`,
          touchAction: 'manipulation',
        }}>{Ic.plus(14, '#fff')} Add</button>
      </div>
    </div>
  );
}

function IconBtn({ theme, children, onClick, href, badge, title }) {
  const style = {
    width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`,
    background: theme.pillBg, color: theme.text, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    textDecoration: 'none',
  };
  const dot = badge ? <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 99, background: '#EF4444', boxShadow: '0 0 0 2px ' + theme.bg }}/> : null;
  if (href) {
    return (
      <a href={href} title={title} style={style}>
        {children}
        {dot}
      </a>
    );
  }
  return (
    <button onClick={onClick} title={title} style={style}>
      {children}
      {dot}
    </button>
  );
}

function BottomNav({ theme, tab, onTab, onAdd }) {
  const tabs = [
    { id: 'home',     label: 'Home',     icon: Ic.home },
    { id: 'calc',     label: 'Calc',     icon: Ic.calc },
    { id: 'compare',  label: 'Compare',  icon: Ic.compare, href: '/compare' },
    { id: 'glossary', label: 'Glossary', icon: Ic.book,    href: '/glossary' },
  ];
  return (
    <div style={{
      margin: '0 12px',
      marginBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
      height: 56,
      borderRadius: 18, padding: '0 4px',
      background: 'rgba(20,27,48,.92)',
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      border: `1px solid ${theme.line2}`,
      boxShadow: '0 12px 30px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.1) inset',
      display: 'flex', alignItems: 'center',
    }}>
      {tabs.slice(0, 2).map(t => <NavBtn key={t.id} t={t} tab={tab} onTab={onTab} theme={theme}/>)}
      <button type="button" aria-label="Add ticker" onClick={onAdd} style={{
        width: 46, height: 46, borderRadius: 14, margin: '0 2px',
        background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
        border: 'none', color: '#fff', cursor: 'pointer', flex: '0 0 auto',
        boxShadow: `0 6px 16px ${theme.brand}88, 0 1px 0 rgba(255,255,255,.3) inset`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation',
      }}>{Ic.plus(20, '#fff')}</button>
      {tabs.slice(2).map(t => <NavBtn key={t.id} t={t} tab={tab} onTab={onTab} theme={theme}/>)}
    </div>
  );
}

function NavBtn({ t, tab, onTab, theme }) {
  const on = tab === t.id;
  const style = {
    flex: 1, height: 48, borderRadius: 14, border: 'none', background: 'transparent', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
    color: on ? theme.brand : theme.text3, textDecoration: 'none', touchAction: 'manipulation',
  };
  if (t.href) {
    return (
      <a href={t.href} style={style}>
        {t.icon(20, theme.text3)}
        <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.02em' }}>{t.label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={() => onTab(t.id)} style={style}>
      {t.icon(20, on ? theme.brand : theme.text3)}
      <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '.02em' }}>{t.label}</span>
    </button>
  );
}

// ─── Notification bar ─────────────────────────────────────────────────────────

function NotifBar({ theme, holdings }) {
  const items = useMemo(() => {
    const msgs = [];
    holdings.forEach(h => {
      if (h.rsi != null && h.rsi < 30) msgs.push({ c: '#10B981', msg: `${h.sym} RSI ${h.rsi} — approaching oversold` });
      if (h.rsi != null && h.rsi > 70) msgs.push({ c: '#EF4444', msg: `${h.sym} RSI ${h.rsi} — overbought, consider waiting` });
      if (h.displayRating === 'BUY' || h.displayRating === 'STRONG BUY') msgs.push({ c: '#10B981', msg: `${h.sym} — ${RATING_LABELS[h.displayRating]} signal today` });
    });
    if (!msgs.length) msgs.push({ c: theme.brand, msg: 'DCA Anchor — transparent analytics, not advice' });
    return msgs.slice(0, 4);
  }, [holdings]);

  const [i, setI] = useState(0);
  useEffect(() => {
    // Switching to a portfolio with fewer alerts shortens this list, and the
    // index kept rotating against the old length — so it could point past the
    // end. Restart from the top whenever the list resizes.
    setI(0);
    const t = setInterval(() => setI(v => (v + 1) % items.length), 3200);
    return () => clearInterval(t);
  }, [items.length]);

  // Effects run after render, so the shrinking render itself still has to be
  // survivable: reading past the end here unmounts the whole tree.
  const cur = items[i] || items[0];
  return (
    <div style={{
      margin: '2px 20px 10px', padding: '8px 12px',
      borderRadius: 12, border: `1px solid ${theme.line}`, background: theme.bg2,
      display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden',
    }}>
      <div style={{ width: 6, height: 6, borderRadius: 99, background: cur.c, boxShadow: `0 0 8px ${cur.c}`, flex: '0 0 auto' }}/>
      <div key={i} style={{ fontSize: 11.5, color: theme.text2, animation: 'staxFade .4s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{cur.msg}</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {items.map((_, j) => <span key={j} style={{ width: 4, height: 4, borderRadius: 99, background: j === i ? theme.text2 : theme.line2 }}/>)}
      </div>
    </div>
  );
}

function TransparencyBar({ theme }) {
  return (
    <div style={{
      margin: '-4px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderRadius: 12,
      background: theme.bg2, border: `1px dashed ${theme.line2}`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6, flex: '0 0 auto',
        background: theme.brand + '22', color: theme.brand,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
      }}>i</div>
      <div style={{ flex: 1, fontSize: 11, color: theme.text2, lineHeight: 1.45 }}>
        <b style={{ color: theme.text }}>Nothing here is advice.</b> Just a transparent view of public market data
        (price, RSI, F&G, F/PE) and how it scores against your DCA plan.{' '}
        <a href="/glossary" style={{ color: theme.brand, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Glossary →</a>
      </div>
    </div>
  );
}

function ScoreInfoBtn({ theme, onClick, label = 'Score methodology' }) {
  return <button type="button" onClick={onClick} title={label} style={{ width: 20, height: 20, borderRadius: 999, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.brand, fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, touchAction: 'manipulation' }}>?</button>;
}

function DrawerSection({ theme, title, children }) {
  return <section style={{ marginTop: 20 }}><h3 style={{ fontSize: 14, color: theme.text, margin: '0 0 8px', letterSpacing: '-.01em' }}>{title}</h3>{children}</section>;
}

function MethodologyDrawer({ theme, open, onClose, holding }) {
  if (!open) return null;
  const example = holding || {
    sym: 'MSTR', displayRating: 'BUY', tag: 'STOCK', rating: 'BUY', analystCount: 12,
    rsi: 47, fg: 30, fpe: null, price: 100, ma72: 104, ma200: 103.2,
  };
  const scored = scoreAsset({ ...example, isCrypto: example.tag === 'CRYPTO' });
  const rows = scoreContributions({ ...example, isCrypto: example.tag === 'CRYPTO' });
  const total = scored.score.toFixed(1);
  const coverage = scored.coverage;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,.68)', backdropFilter: 'blur(4px)' }}/>
      <div style={{ position: 'relative', width: 'min(520px, 100vw)', height: '100%', overflowY: 'auto', background: '#0B1020', borderLeft: `1px solid ${theme.line2}`, boxShadow: '-18px 0 50px rgba(0,0,0,.45)', padding: '18px 18px 28px', color: theme.text }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: theme.brand, textTransform: 'uppercase' }}>Scoring Methodology</div>
            <h2 style={{ margin: '4px 0 4px', fontSize: 22, letterSpacing: '-.03em' }}>How the 0–10 score is calculated</h2>
            <div style={{ fontSize: 11, color: theme.text3 }}>Last updated {SCORE_METHODOLOGY.lastUpdated} · absolute model, not watchlist-relative</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text2, cursor: 'pointer' }}>{Ic.close(16, theme.text2)}</button>
        </div>

        <div style={{ padding: 14, borderRadius: 14, background: theme.card, border: `1px solid ${theme.line}` }}>
          <div style={{ fontSize: 13, color: theme.text2, lineHeight: 1.55 }}>
            Every asset starts from a neutral centre of <b style={{ color: theme.text }}>5.0</b>. Each signal is normalized to a continuous value between <b style={{ color: theme.text }}>−1 and +1</b>, multiplied by its published weight, and averaged over the weights actually available. A score of exactly 5.0 means a genuinely neutral setup. It is market-data context, not financial advice.
          </div>
          <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 10, background: theme.bg2, border: `1px solid ${theme.line}`, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: theme.brand }}>
            {SCORE_METHODOLOGY.formula}
          </div>
          <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12, color: theme.text2, lineHeight: 1.6 }}>
            {SCORE_METHODOLOGY.summary.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>

        <DrawerSection theme={theme} title="Weights and normalization">
          {SCORE_METHODOLOGY.components.map(c => (
            <div key={c.id} style={{ padding: '12px 0', borderBottom: `1px solid ${theme.line}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, fontSize: 13.5, fontWeight: 800 }}>{c.label}</div>
                <div style={{ width: 76, height: 8, borderRadius: 99, background: theme.bg2, overflow: 'hidden' }}><div style={{ width: c.weight, height: '100%', background: `linear-gradient(90deg, ${theme.brand}, ${theme.brand2})` }}/></div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: theme.brand, width: 34, textAlign: 'right' }}>{c.weight}</div>
              </div>
              <div style={{ fontSize: 11.5, color: theme.text3, lineHeight: 1.45, marginTop: 4 }}>{c.note}</div>
              <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: theme.brand2 }}>{c.formula}</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 4 }}>
                {c.scale.map(([at, n]) => <div key={at} style={{ display: 'grid', gridTemplateColumns: '1fr 48px', gap: 8, fontSize: 11.5, color: theme.text2 }}><span>{at}</span><span style={{ color: n.startsWith('+') ? '#4ADE80' : n.startsWith('−') ? '#F87171' : theme.text3, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{n}</span></div>)}
              </div>
            </div>
          ))}
        </DrawerSection>

        <DrawerSection theme={theme} title="Score labels">
          {SCORE_METHODOLOGY.thresholds.map(t => <div key={t.key} style={{ display: 'grid', gridTemplateColumns: '78px 100px 1fr', gap: 8, padding: '8px 0', borderBottom: `1px solid ${theme.line}`, fontSize: 12 }}><span style={{ fontFamily: 'var(--font-mono)', color: theme.brand }}>{t.min}–{t.max}</span><b>{t.label}</b><span style={{ color: theme.text2 }}>{t.meaning}</span></div>)}
        </DrawerSection>

        <DrawerSection theme={theme} title={`Example calculation${example.sym ? `: ${example.sym}` : ''}`}>
          <div style={{ border: `1px solid ${theme.line}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: theme.bg2, fontSize: 12 }}><b>Neutral centre</b><span style={{ fontFamily: 'var(--font-mono)' }}>{SCORE_METHODOLOGY.baseScore.toFixed(1)}</span></div>
            {rows.map(r => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1fr 92px', gap: 8, padding: '9px 12px', borderTop: `1px solid ${theme.line}`, fontSize: 12 }}>
                <span style={{ color: r.available ? theme.text2 : theme.text3 }}>
                  <b style={{ color: theme.text }}>{r.label}</b> — {r.detail}
                  {r.available && <span style={{ color: theme.text3 }}> · signal {r.n > 0 ? '+' : ''}{r.n.toFixed(2)} × {Math.round(r.weight * 100)}%</span>}
                </span>
                <span style={{ color: !r.available ? theme.text3 : r.points > 0 ? '#4ADE80' : r.points < 0 ? '#F87171' : theme.text3, fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                  {r.available ? `${r.points > 0 ? '+' : ''}${r.points.toFixed(2)}` : 'excluded'}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderTop: `1px solid ${theme.line2}`, fontSize: 13 }}><b>Final score</b><b style={{ color: theme.brand, fontFamily: 'var(--font-mono)' }}>{total}/10</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderTop: `1px solid ${theme.line}`, fontSize: 11.5, color: theme.text3 }}><span>Signal coverage</span><span style={{ fontFamily: 'var(--font-mono)' }}>{coverage}%</span></div>
          </div>
        </DrawerSection>

        <DrawerSection theme={theme} title="How to interpret this score">
          <div style={{ fontSize: 12.5, color: theme.text2, lineHeight: 1.6 }}>Higher scores mean the asset is closer to historically attractive DCA conditions: cooler momentum, less extension from moving averages, fearful sentiment, or cheaper valuation. Lower scores mean the asset may be extended. The score does not rank assets against each other and does not predict future returns.</div>
        </DrawerSection>
      </div>
    </div>
  );
}

function PortfolioSummary({ theme, holdings, onMethodology }) {
  if (!holdings.length) return null;
  // A 0%-coverage asset scores 5.0 only as a mathematical fallback. Letting it
  // into these statistics would drag the average toward neutral and let an
  // asset with no data win "best setup".
  const scored = holdings.filter(isRankable);
  const avg = scored.length ? scored.reduce((s, h) => s + (h.score || 0), 0) / scored.length : null;
  const high = scored.filter(h => h.score >= 8).length;
  const favorable = scored.filter(h => h.score >= 6 && h.score < 8).length;
  const extended = scored.filter(h => h.score < 4).length;
  const best = scored[0];
  const unscored = holdings.length - scored.length;
  const mostExtended = [...holdings].sort((a, b) => (b.ma200dist ?? -999) - (a.ma200dist ?? -999))[0];
  const cell = (label, value, tint) => <div style={{ padding: '10px 12px', borderRadius: 12, background: theme.card, border: `1px solid ${theme.line}` }}><div style={{ fontSize: 9.5, color: theme.text3, letterSpacing: '.09em', fontWeight: 800, textTransform: 'uppercase' }}>{label}</div><div style={{ marginTop: 3, fontSize: 15, color: tint || theme.text, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{value}</div></div>;
  return <div style={{ padding: '0 16px' }}><Card theme={theme} style={{ display: 'grid', gap: 10 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><SectionHead theme={theme} title="Portfolio snapshot" sub="Current DCA signal mix"/><div style={{ marginLeft: 'auto' }}><ScoreInfoBtn theme={theme} onClick={onMethodology}/></div></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>{cell('Avg score', avg == null ? '—' : avg.toFixed(1), theme.brand)}{cell('Best setup', best?.sym || '—', getColor(best?.sym || ''))}{cell('High/Fav', scored.length ? `${high}/${favorable}` : '—', '#4ADE80')}{cell('Extended', scored.length ? extended : '—', extended ? '#F87171' : theme.text3)}</div>{unscored > 0 && <div title={COVERAGE_TOOLTIP} style={{ fontSize: 11.5, color: theme.text3 }}>{unscored} asset{unscored > 1 ? 's' : ''} excluded — no scoring signals available.</div>}{mostExtended?.ma200dist != null && <div style={{ fontSize: 11.5, color: theme.text3 }}>Most extended vs 200SMA: <b style={{ color: theme.text }}>{mostExtended.sym}</b> at +{mostExtended.ma200dist.toFixed(1)}%.</div>}</Card></div>;
}

// ─── Local portfolio cache ────────────────────────────────────────────────────
// Mirrors the server state per Clerk user id, so a backend outage renders
// stale-but-present data instead of an empty portfolio. Keyed by user id rather
// than username now that identity comes from Clerk.

const PORTFOLIOS_KEY = (userId) => `dca_portfolios_${userId}`;
const GUEST_USER_ID = 'guest';
const GUEST_PORTFOLIO_ID = 'guest-watchlist';
const guestPortfolios = () => [{ id: GUEST_PORTFOLIO_ID, name: 'Watchlist', kind: 'watchlist', items: [] }];

function makeLocalPortfolio(name, kind = 'portfolio') {
  return { id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, kind, items: [] };
}

function readCachedPortfolios(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(PORTFOLIOS_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedPortfolios(userId, portfolios) {
  if (!userId) return;
  try {
    localStorage.setItem(PORTFOLIOS_KEY(userId), JSON.stringify(portfolios));
  } catch {
    // Private-mode or quota failure — the network write is still attempted.
  }
}

// Which portfolio the user was last looking at. Keyed by Clerk user id so two
// accounts on one browser don't inherit each other's selection.
const ACTIVE_KEY = (userId) => `dca_active_portfolio_${userId}`;

function readActiveId(userId) {
  if (!userId) return null;
  try {
    return localStorage.getItem(ACTIVE_KEY(userId)) || null;
  } catch {
    return null;
  }
}

function writeActiveId(userId, id) {
  if (!userId) return;
  try {
    if (id) localStorage.setItem(ACTIVE_KEY(userId), id);
    else localStorage.removeItem(ACTIVE_KEY(userId));
  } catch {
    // Selection just won't survive reload; not worth failing the switch over.
  }
}

function visiblePortfolios(list) {
  return (Array.isArray(list) ? list : []).filter(p => p?.name !== 'Tagged Portfolio');
}

// ─── Portfolio switcher ───────────────────────────────────────────────────────

function PortfolioBar({ theme, portfolios, activeId, onSelect, onCreate, onRename, onDelete, isSignedIn }) {
  // 'idle' | 'picking' | 'creating' | 'renaming' | 'confirmDelete'
  const [mode, setMode] = useState('idle');
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);

  const active = portfolios.find(p => p.id === activeId) || null;
  // Requirement: an account always keeps at least one portfolio.
  const canDelete = portfolios.length > 1;

  if (!portfolios.length && mode !== 'creating' && mode !== 'picking') return null;

  // The picker's vocabulary is the shipped list plus the names this account
  // already uses, so it isn't frozen at whatever ACCOUNT_TYPES ships with.
  // Names currently in use are then dropped: offering one would only produce a
  // duplicate_name rejection from the unique (clerk_user_id, lower(name)) index.
  const taken = new Set(portfolios.map(p => String(p.name || '').toLowerCase()));
  const suggestions = [...ACCOUNT_TYPES, ...portfolios.map(p => p.name)]
    .filter(n => typeof n === 'string' && n.trim())
    .filter((n, i, all) => all.findIndex(m => m.toLowerCase() === n.toLowerCase()) === i)
    .filter(n => !taken.has(n.toLowerCase()));

  const reset = () => { setMode('idle'); setMenuOpen(false); setName(''); setError(null); };

  const run = async (fn) => {
    try { await fn(); reset(); }
    catch (err) { setError(err.message); }
  };

  const submitCreate = () => { const c = name.trim(); if (c) run(() => onCreate(c)); };
  const submitRename = () => { const c = name.trim(); if (c && active) run(() => onRename(active.id, c)); };

  const editing = mode === 'creating' || mode === 'renaming';
  const btn = (extra = {}) => ({
    height: 28, padding: '0 10px', borderRadius: 8, fontSize: 11.5, cursor: 'pointer', ...extra,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px 0', flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'visible', WebkitOverflowScrolling: 'touch' }}>
      {portfolios.map(p => {
        const on = p.id === activeId;
        return (
          <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
            <button
              onClick={() => { onSelect(p.id); setMenuOpen(false); setMode('idle'); }}
              style={btn({
                padding: on ? '0 4px 0 11px' : '0 11px',
                border: `1px solid ${on ? theme.brand : theme.line2}`,
                background: on ? theme.brand + '22' : theme.pillBg,
                color: on ? theme.brand : theme.text2,
                fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
                borderTopRightRadius: on ? 0 : 8, borderBottomRightRadius: on ? 0 : 8,
              })}
            >
              {p.name}
              <span style={{ marginLeft: 6, opacity: .65, fontFamily: 'var(--font-mono)' }}>{(p.items || []).length}</span>
            </button>

            {/* Manage menu lives on the active tab only, so it never implies
                acting on a portfolio you aren't looking at. */}
            {on && (
              <button
                aria-label={`Manage ${p.name}`}
                onClick={() => { setMenuOpen(o => !o); setMode('idle'); setError(null); }}
                style={btn({
                  padding: '0 8px', marginLeft: -1,
                  border: `1px solid ${theme.brand}`, borderLeft: `1px solid ${theme.brand}55`,
                  background: theme.brand + '22', color: theme.brand, fontWeight: 700,
                  borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
                })}
              >⋯</button>
            )}

            {on && menuOpen && (
              <div style={{
                position: 'absolute', top: 32, right: 0, zIndex: 30, minWidth: 148,
                background: theme.card, border: `1px solid ${theme.line2}`, borderRadius: 10,
                boxShadow: '0 10px 30px rgba(0,0,0,.45)', overflow: 'hidden',
              }}>
                <button
                  onClick={() => { setMode('renaming'); setName(p.name); setMenuOpen(false); setError(null); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 12, background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer' }}
                >Rename</button>
                <button
                  disabled={!canDelete}
                  title={canDelete ? undefined : 'You need at least one portfolio.'}
                  onClick={() => { if (canDelete) { setMode('confirmDelete'); setMenuOpen(false); setError(null); } }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 12,
                    background: 'transparent', border: 'none', borderTop: `1px solid ${theme.line}`,
                    color: canDelete ? '#F87171' : theme.text3,
                    cursor: canDelete ? 'pointer' : 'not-allowed',
                  }}
                >Delete</button>
              </div>
            )}
          </span>
        );
      })}

      {editing ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input
            autoFocus
            value={name}
            maxLength={40}
            onChange={e => { setName(e.target.value); if (error) setError(null); }}
            onKeyDown={e => {
              if (e.key === 'Enter') (mode === 'renaming' ? submitRename : submitCreate)();
              if (e.key === 'Escape') reset();
            }}
            placeholder={mode === 'renaming' ? 'New name' : 'Portfolio name'}
            style={{
              height: 28, width: 130, borderRadius: 8, padding: '0 9px',
              border: `1px solid ${error ? '#EF4444' : theme.line2}`, background: theme.card,
              color: theme.text, fontSize: 11.5, outline: 'none',
            }}
          />
          <button
            onClick={mode === 'renaming' ? submitRename : submitCreate}
            style={btn({ border: 'none', background: theme.brand, color: '#fff', fontWeight: 700 })}
          >{mode === 'renaming' ? 'Save' : 'Add'}</button>
          <button onClick={reset} style={btn({ border: `1px solid ${theme.line2}`, background: 'transparent', color: theme.text3 })}>Cancel</button>
        </span>
      ) : mode === 'confirmDelete' && active ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: theme.text2 }}>
            Delete “{active.name}” and its {(active.items || []).length} tickers?
          </span>
          <button
            onClick={() => run(() => onDelete(active.id))}
            style={btn({ border: 'none', background: '#EF4444', color: '#fff', fontWeight: 700 })}
          >Delete</button>
          <button onClick={reset} style={btn({ border: `1px solid ${theme.line2}`, background: 'transparent', color: theme.text3 })}>Cancel</button>
        </span>
      ) : mode === 'picking' ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
          <button
            onClick={reset}
            style={btn({ border: `1px dashed ${theme.brand}`, background: 'transparent', color: theme.brand, fontWeight: 600 })}
          >+ New</button>

          <div style={{
            position: 'absolute', top: 32, left: 0, zIndex: 30, minWidth: 172,
            background: theme.card, border: `1px solid ${theme.line2}`, borderRadius: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,.45)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 12px', fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em',
              textTransform: 'uppercase', color: theme.text3, borderBottom: `1px solid ${theme.line}`,
            }}>Add account</div>

            {suggestions.map(n => (
              <button
                key={n}
                onClick={() => run(() => onCreate(n))}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                  fontSize: 12, background: 'transparent', border: 'none', color: theme.text, cursor: 'pointer',
                }}
              >{n}</button>
            ))}

            <button
              onClick={() => { setMode('creating'); setName(''); setError(null); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
                fontSize: 12, background: 'transparent', border: 'none',
                borderTop: suggestions.length ? `1px solid ${theme.line}` : 'none',
                color: theme.text2, cursor: 'pointer',
              }}
            >Custom…</button>
          </div>
        </span>
      ) : (
        <button
          onClick={() => { setMode('picking'); setName(''); setMenuOpen(false); setError(null); }}
          style={btn({ border: `1px dashed ${theme.line2}`, background: 'transparent', color: theme.text3, fontWeight: 600 })}
        >+ New</button>
      )}

      {!isSignedIn && (
        <SignInButton mode="modal">
          <button style={btn({ border: `1px solid ${theme.brand}55`, background: theme.brand + '14', color: theme.brand, fontWeight: 700, whiteSpace: 'nowrap', flex: '0 0 auto' })}>Sign in to save</button>
        </SignInButton>
      )}

      {error && <span style={{ fontSize: 11, color: '#F87171', flex: '0 0 auto' }}>{error}</span>}
    </div>
  );
}

// ─── Sync status banner ───────────────────────────────────────────────────────
// Silence was the real defect: a dead backend looked identical to an empty
// portfolio. When sync is down the user has to be told, not guessed at.

function SyncBanner({ theme, state, onRetry }) {
  if (state !== 'offline') return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: '9px 16px', background: '#7F1D1D', color: '#FEE2E2',
      fontSize: 12, fontWeight: 600, lineHeight: 1.35, flexShrink: 0,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: '#FCA5A5', flexShrink: 0 }}/>
      <span style={{ flex: 1, minWidth: 180 }}>
        Not syncing — changes are saved on this device only and won&apos;t appear elsewhere.
      </span>
      <button
        onClick={onRetry}
        style={{
          border: '1px solid #FCA5A5', background: 'transparent', color: '#FEE2E2',
          borderRadius: 8, padding: '4px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
        }}
      >Retry</button>
    </div>
  );
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

function SignIn({ theme }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowY: 'auto', background: theme.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: -80, left: -60, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${theme.brand}55, transparent 70%)`, filter: 'blur(2px)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: 120, right: -70, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${theme.brand2}55, transparent 70%)`, filter: 'blur(2px)', pointerEvents: 'none' }}/>

      <div style={{ position: 'relative', padding: '48px 28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 76, height: 76, borderRadius: 22, background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 12px 30px ${theme.brand}55` }}>
          {Ic.logo(34, '#fff')}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: theme.text, letterSpacing: '-.03em', marginTop: 18 }}>DCA Anchor</div>
        <div style={{ fontSize: 13.5, color: theme.text3, marginTop: 6, textAlign: 'center', lineHeight: 1.5, maxWidth: 300 }}>
          Sign in with your email — your watchlist and portfolios follow you to any device.
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, display: 'flex', justifyContent: 'center', padding: '28px 16px 0' }}>
        {/* routing="hash" keeps Clerk's sub-steps inside this single-page shell,
            so no /sign-in or /sign-up route files are needed. */}
        {/* No signUpUrl: with hash routing there is no <SignUp> mounted at a
            second hash, so an explicit one would send the sign-up link nowhere.
            Omitting it lets Clerk use the account portal, which the dev
            instance provides automatically. */}
        <ClerkSignIn routing="hash"/>
      </div>

      <div style={{ position: 'relative', fontSize: 10, color: theme.text3, textAlign: 'center', lineHeight: 1.5, padding: '20px 24px 24px' }}>
        Public market data only. <b style={{ color: theme.text2 }}>Nothing here is financial advice.</b>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Shown when the selected portfolio holds nothing. Offers the connect path only
 * when Plaid would actually work, so there is never a button that fails on click.
 */
function EmptyPortfolioCta({ theme, plaidConfigured, activePortfolioName, onConnect, onAdd, compact = false }) {
  return (
    <div style={{ textAlign: 'center', padding: compact ? '40px 20px 8px' : '48px 20px 8px', color: theme.text3 }}>
      <div style={{ fontSize: compact ? 32 : 40, marginBottom: 10 }}>📊</div>
      <div style={{ fontSize: compact ? 15 : 16, fontWeight: 600, color: theme.text }}>
        {activePortfolioName ? `${activePortfolioName} is empty` : 'No tickers yet'}
      </div>
      <div style={{ fontSize: 12, marginTop: 8, marginBottom: 16 }}>
        {plaidConfigured
          ? 'Connect a brokerage to preview holdings, or add tickers manually.'
          : 'Add tickers manually to start tracking.'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {plaidConfigured && (
          <button
            onClick={onConnect}
            style={{
              height: 40, padding: '0 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
              background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
              color: '#fff', fontSize: 12.5, fontWeight: 700, minWidth: 264,
            }}
          >Connect a brokerage to preview</button>
        )}
        <button
          onClick={onAdd}
          style={{
            height: 40, padding: '0 18px', borderRadius: 11, cursor: 'pointer', minWidth: 264,
            border: `1px solid ${theme.line2}`,
            background: plaidConfigured ? 'transparent' : `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
            color: plaidConfigured ? theme.text2 : '#fff',
            fontSize: 12.5, fontWeight: plaidConfigured ? 600 : 700,
          }}
        >{plaidConfigured ? 'Add tickers manually' : 'Add tickers'}</button>
      </div>
    </div>
  );
}

function Dashboard({ theme, navigate, onLogout, user, isSignedIn, holdings, loading, onRefresh, lastRefreshed, fgIndex, onDelete, onMethodology, plaidConfigured, plaidEnv, activePortfolioName, registerPlaidOpen }) {
  const [focused, setFocused] = useState(null);
  // The panel registers its open() here so contextual buttons drive one flow.
  const openPlaid = useRef(null);
  // Leader must come from assets that actually have signals behind them.
  const top = holdings.find(isRankable) || null;
  const chartData = holdings;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StaxHeader theme={theme} user={user} isSignedIn={isSignedIn} fgIndex={fgIndex} onAdd={() => navigate('add')} onLogout={onLogout}/>
      <NotifBar theme={theme} holdings={holdings}/>
      <TransparencyBar theme={theme}/>

      <div style={{ padding: '0 16px' }}>
        <ContributionPlanCard theme={theme} holdings={holdings} accountName={activePortfolioName} onPick={sym => navigate('detail', sym)}/>
      </div>

      <PortfolioSummary theme={theme} holdings={holdings} onMethodology={() => onMethodology(top)}/>

      {top && (
        <div style={{ padding: '0 16px' }}>
          <TopPickCard theme={theme} holding={top} onOpen={() => navigate('detail', top.sym)} onMethodology={() => onMethodology(top)}/>
        </div>
      )}

      {chartData.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <Card theme={theme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SectionHead theme={theme} title="Scores" sub="0–10 absolute composite signal"/>
              <ScoreInfoBtn theme={theme} onClick={() => onMethodology(top)}/>
            </div>
            <ScoresChart data={chartData} theme={theme} focused={focused} onPick={s => setFocused(focused === s ? null : s)}/>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${theme.line}` }}>
              {chartData.map(d => {
                const c = getColor(d.sym);
                const on = !focused || focused === d.sym;
                return (
                  <div key={d.sym} style={{ display: 'flex', alignItems: 'center', gap: 5, opacity: on ? 1 : .35, transition: 'opacity .2s' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c }}/>
                    <span style={{ fontSize: 10, color: theme.text2, fontFamily: 'var(--font-mono)' }}>{d.sym}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      <HoldingsTable theme={theme} holdings={holdings} loading={loading} onPick={sym => navigate('detail', sym)} onRefresh={onRefresh} lastRefreshed={lastRefreshed} onDelete={onDelete} onMethodology={onMethodology}/>

      {holdings.length === 0 && !loading && (
        <EmptyPortfolioCta
          theme={theme}
          plaidConfigured={plaidConfigured}
          activePortfolioName={activePortfolioName}
          onConnect={() => openPlaid.current?.()}
          onAdd={() => navigate('add')}
        />
      )}

      {plaidConfigured && (
        <PlaidSandboxPanel
          theme={theme}
          registerOpen={fn => { openPlaid.current = fn; registerPlaidOpen?.(fn); }}
          plaidEnv={plaidEnv}
        />
      )}

      <div style={{ height: 110 }}/>
    </div>
  );
}

function SectionHead({ theme, title, sub }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: theme.text, letterSpacing: '-.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function TopPickCard({ theme, holding: h, onOpen, onMethodology }) {
  const c = getColor(h.sym);
  const sd = scoreDisplay(h);
  return (
    <Card theme={theme} tint={c} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ padding: '14px 16px 12px', background: `linear-gradient(135deg, ${c}1A, transparent 60%)`, borderBottom: `1px solid ${theme.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {Ic.trophy(16, '#FBBF24')}
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: theme.text2, whiteSpace: 'nowrap' }}>WATCHLIST LEADER</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.text3, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
            {Ic.spark(11, '#FBBF24')} live data
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0, flexWrap: 'wrap' }}>
          <TickerDot sym={h.sym} size={42} theme={theme}/>
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)', letterSpacing: '-.02em', flex: '0 0 auto' }}>{h.sym}</div>
              <div style={{ fontSize: 11, color: theme.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{h.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: theme.text2, flexWrap: 'wrap' }}>
              <span title={scoreTooltip(h)} style={{ whiteSpace: 'nowrap' }}><span style={{ color: theme.text3 }}>SCORE </span><b style={{ color: c }}>{sd.usable ? h.score : '—'}</b></span>
              {h.rsi != null && <span style={{ whiteSpace: 'nowrap' }}><span style={{ color: theme.text3 }}>RSI </span><b style={{ color: theme.text }}>{h.rsi}</b></span>}
              <span style={{ whiteSpace: 'nowrap' }}><span style={{ color: theme.text3 }}>$ </span><b style={{ color: theme.text }}>{h.price ? fmtPrice(h.price) : '—'}</b></span>
            </div>
            <div title={COVERAGE_TOOLTIP} style={{ marginTop: 4, fontSize: 10.5, color: coverageColor(h.coverage, theme) }}>
              {sd.usable ? `${formatCoverage(h.coverage)} signal coverage · ${sd.label}` : 'Insufficient data — no scoring signals'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', flex: '0 0 auto' }}><RatingPill rating={h.displayRating || h.rating} large/></div>
        </div>
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,.14)', border: '1px solid rgba(16,185,129,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>💡</div>
        <div style={{ flex: 1, fontSize: 12, color: theme.text2, lineHeight: 1.4 }}>
          {h.why || (sd.usable ? `Score ${h.score}/10 — ${h.displayRating === 'BUY' || h.displayRating === 'STRONG BUY' ? 'market conditions currently score well for this DCA plan' : 'monitor for better entry'}` : 'Not enough signal data to score this asset yet.')}{' '}
          <button type="button" onClick={(e) => { e.stopPropagation(); onMethodology?.(); }} style={{ border: 'none', background: 'transparent', padding: 0, color: '#5BC8FF', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>Methodology →</button>
        </div>
        {Ic.chevR(16, theme.text3)}
      </div>
    </Card>
  );
}

function ContributionPlanCard({ theme, holdings, accountName = 'this account', onPick }) {
  const [amount, setAmount] = useState(500);
  const candidates = useMemo(() => holdings.filter(isRankable).slice(0, 4), [holdings]);
  const dollars = Number.isFinite(Number(amount)) ? Math.max(0, Number(amount)) : 0;
  const weights = candidates.map(h => Math.max(0.35, ((Number(h.score) || 5) - 3.5)));
  const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;
  const plan = candidates.map((h, i) => ({
    h,
    amount: Math.round((dollars * weights[i] / totalWeight) / 5) * 5,
  })).filter(r => r.amount > 0);
  const allocated = plan.reduce((s, r) => s + r.amount, 0);
  if (plan.length && allocated !== dollars) plan[0].amount += dollars - allocated;
  const best = plan[0]?.h;

  return (
    <Card theme={theme} tint={best ? getColor(best.sym) : theme.brand} style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: `1px solid ${theme.line}`, background: `linear-gradient(135deg, ${theme.brand}14, transparent 58%)` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 18px ${theme.brand}44`, flex: '0 0 auto' }}>🧭</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: theme.brand, textTransform: 'uppercase' }}>Contribution allocation assistant</div>
            <div style={{ marginTop: 3, fontSize: 18, fontWeight: 800, color: theme.text, letterSpacing: '-.03em' }}>Plan your next scheduled DCA</div>
            <div style={{ marginTop: 3, fontSize: 11.5, color: theme.text3, lineHeight: 1.45 }}>Rule-based allocation for {accountName || 'this account'} using transparent entry-condition signals. Educational, not advice.</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 118, height: 34, borderRadius: 10, padding: '0 10px', background: theme.bg2, border: `1px solid ${theme.line}`, color: theme.text3 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>$</span>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              aria-label="Contribution amount"
              style={{ width: 72, border: 'none', outline: 'none', background: 'transparent', color: theme.text, fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 800 }}
            />
          </label>
        </div>
      </div>
      {plan.length ? (
        <div style={{ padding: '10px 16px 12px', display: 'grid', gap: 8 }}>
          {plan.map(({ h, amount: amt }, idx) => {
            const c = getColor(h.sym);
            const sd = scoreDisplay(h);
            const why = h.ma200dist != null && h.ma200dist < 0
              ? `${Math.abs(h.ma200dist).toFixed(1)}% below 200MA`
              : h.rsi != null && h.rsi < 50
                ? `cooler RSI ${h.rsi}`
                : sd.partial
                  ? 'limited coverage'
                  : 'best current setup';
            return (
              <button key={h.sym} type="button" onClick={() => onPick?.(h.sym)} style={{ border: 'none', background: idx === 0 ? c + '16' : theme.bg2, borderRadius: 12, padding: '10px 11px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 10, alignItems: 'center', cursor: 'pointer', textAlign: 'left', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                  <TickerDot sym={h.sym} theme={theme} size={26}/>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', color: theme.text, fontSize: 13, fontWeight: 800 }}>{h.sym} <span style={{ color: c }}>Score {h.score}</span></div>
                    <div style={{ marginTop: 2, color: theme.text3, fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{RATING_LABELS[h.displayRating] || sd.label || 'Setup'} · {why}</div>
                  </div>
                </div>
                <div style={{ color: theme.text, fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 900 }}>${Math.max(0, amt).toLocaleString()}</div>
              </button>
            );
          })}
          <div style={{ fontSize: 10.5, color: theme.text3, lineHeight: 1.45 }}>Use this as a contribution checklist. You choose the rules and final orders; DCA Anchor ranks current conditions, not suitability.</div>
        </div>
      ) : (
        <div style={{ padding: 16, fontSize: 12, color: theme.text3 }}>Add tickers with live signals to generate a contribution plan.</div>
      )}
    </Card>
  );
}

function HoldingsTable({ theme, holdings, loading, onPick, onRefresh, lastRefreshed, onDelete, onMethodology }) {
  const minsAgo = lastRefreshed ? Math.floor((Date.now() - lastRefreshed) / 60000) : null;
  return (
    <div style={{ padding: '0 16px' }}>
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: theme.text, display: 'flex', alignItems: 'center', gap: 6 }}>Holdings <ScoreInfoBtn theme={theme} onClick={() => onMethodology?.(holdings[0])}/></div>
            <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 1 }}>
              {holdings.length} tickers · sorted by score
              {onDelete && holdings.length > 0 && ' · swipe or double-click a row to remove'}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, flex: '1 1 150px', minWidth: 0, flexWrap: 'wrap' }}>
            {minsAgo != null && <span style={{ fontSize: 10, color: theme.text3, whiteSpace: 'nowrap' }}>Updated {minsAgo === 0 ? 'just now' : `${minsAgo}m ago`}</span>}
            <button onClick={onRefresh} style={{ fontSize: 11, fontWeight: 600, color: theme.text2, background: theme.pillBg, border: `1px solid ${theme.line}`, padding: '5px 9px', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flex: '0 0 auto' }}>
              {Ic.refresh(12, theme.text2)} Refresh
            </button>
          </div>
        </div>
        <div className="dca-hold-grid" title="DCA signal comes from the 0–10 composite score. Hover/tap signal pills for exact ranges." style={{ padding: '8px 16px', background: theme.bg2, borderBottom: `1px solid ${theme.line}`, borderTop: `1px solid ${theme.line}` }}>
          {['ASSET', 'SIGNAL', 'RSI', 'PE', '200MA', 'PRICE'].map((h, i) => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: theme.text3, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {loading && holdings.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: theme.text3, fontSize: 12 }}>Loading data…</div>
        )}
        {holdings.map((h, i) => (
          <HoldingRow key={h.sym} h={h} theme={theme} last={i === holdings.length - 1} onClick={() => onPick(h.sym)} onDelete={onDelete}/>
        ))}
        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, paddingTop: 12, borderTop: '1px solid #1e2433', margin: '0 16px 16px' }}>
          <div>* RSI — Relative Strength Index (14-day). ≤30 oversold · ≥70 overbought</div>
          <div>* PE — Forward Price-to-Earnings ratio. &lt;15 undervalued · &gt;35 premium. Stocks only.</div>
          <div>* 200MA — Distance from 200-day Moving Average. <span style={{ color: '#10B981' }}>Green</span> = below baseline (favorable DCA zone) · <span style={{ color: '#EF4444' }}>Red</span> = &gt;20% extended</div>
        </div>
      </Card>
    </div>
  );
}

// How far a row must travel before the swipe counts as a delete.
const SWIPE_DELETE_PX = 88;

function HoldingRow({ h, theme, last, onClick, onDelete }) {
  const c = getColor(h.sym);
  const sd = scoreDisplay(h);
  const d = h.ma200dist;
  const distColor = d == null ? theme.text3 : d < 0 ? '#10B981' : d > 20 ? '#EF4444' : theme.text;
  const distLabel = d == null ? '—' : (d >= 0 ? '+' : '') + d.toFixed(1) + '%';

  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);
  // Drag bookkeeping that must not trigger re-renders.
  const drag = useRef(null);
  const swiped = useRef(false);
  const touched = useRef(false);
  const clickTimer = useRef(null);

  useEffect(() => () => clearTimeout(clickTimer.current), []);

  const armed = Math.abs(dx) >= SWIPE_DELETE_PX;

  const remove = () => {
    if (!onDelete || exiting) return;
    setExiting(true);
    // Fling the row off the side it was dragged toward, then drop it from the list.
    setDx(dx >= 0 ? 480 : -480);
    setTimeout(() => onDelete(h.sym), 170);
  };

  const onTouchStart = (e) => {
    if (exiting) return;
    touched.current = true;
    swiped.current = false;
    const t = e.touches[0];
    drag.current = { x: t.clientX, y: t.clientY, axis: null };
    setDragging(true);
  };

  const onTouchMove = (e) => {
    if (!drag.current || exiting) return;
    const t = e.touches[0];
    const ddx = t.clientX - drag.current.x;
    const ddy = t.clientY - drag.current.y;
    // Decide once whether this gesture is a horizontal swipe or a vertical
    // scroll, so dragging the list never drags a row sideways.
    if (drag.current.axis === null) {
      if (Math.abs(ddx) < 6 && Math.abs(ddy) < 6) return;
      drag.current.axis = Math.abs(ddx) > Math.abs(ddy) ? 'x' : 'y';
    }
    if (drag.current.axis !== 'x') return;
    swiped.current = true;
    setDx(ddx);
  };

  const onTouchEnd = () => {
    setDragging(false);
    const axis = drag.current?.axis;
    drag.current = null;
    if (axis === 'x' && Math.abs(dx) >= SWIPE_DELETE_PX) remove();
    else setDx(0);
  };

  const handleClick = () => {
    // A swipe that ended on this row is not a tap.
    if (swiped.current) { swiped.current = false; return; }
    // Touch has the swipe gesture, so it needs no double-tap delay.
    if (touched.current) { touched.current = false; onClick?.(); return; }
    if (clickTimer.current) return; // second click of a double-click
    clickTimer.current = setTimeout(() => { clickTimer.current = null; onClick?.(); }, 240);
  };

  const handleDoubleClick = () => {
    clearTimeout(clickTimer.current);
    clickTimer.current = null;
    remove();
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderBottom: last ? 'none' : `1px solid ${theme.line}` }}>
      {/* Delete affordance revealed underneath as the row slides away. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 18px',
        background: armed ? '#EF4444' : '#7F1D1D',
        opacity: Math.min(1, Math.abs(dx) / SWIPE_DELETE_PX),
        transition: dragging ? 'background .12s' : 'background .12s, opacity .18s',
      }}>
        {[0, 1].map(i => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: '#fff' }}>
            {Ic.close(13, '#fff')} REMOVE
          </span>
        ))}
      </div>

      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        title="Double-click to remove"
        className="dca-hold-grid"
        style={{
          alignItems: 'center',
          padding: '11px 14px',
          cursor: 'pointer',
          position: 'relative',
          background: theme.card || theme.bg,
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform .18s ease-out',
          touchAction: 'pan-y',
          userSelect: 'none',
        }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <TickerDot sym={h.sym} theme={theme} size={26}/>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)', letterSpacing: '-.01em' }}>{h.sym}</div>
          <div style={{ fontSize: 10, color: theme.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name || h.sym}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <TagPill tag={h.tag || 'STOCK'} theme={theme}/>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start', minWidth: 0, overflow: 'hidden' }}>
        {sd.usable
          ? <RatingPill rating={h.displayRating || 'HOLD'}/>
          : <span style={{ fontSize: 10.5, fontWeight: 700, color: theme.text3, whiteSpace: 'nowrap' }}>No score</span>}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: h.rsi == null ? theme.text3 : h.rsi < 30 ? '#10B981' : h.rsi > 70 ? '#EF4444' : theme.text }}>{h.rsi ?? '—'}</div>
      <div title={h.sym === 'MSTR' ? 'PE excluded — Bitcoin treasury company' : undefined} style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: (h.tag === 'CRYPTO' || h.tag === 'HEDGE' || h.sym === 'MSTR' || h.fpe == null) ? theme.text3 : h.fpe < 15 ? '#10B981' : h.fpe <= 35 ? '#F59E0B' : '#EF4444' }}>
        {(h.tag === 'CRYPTO' || h.tag === 'HEDGE' || h.sym === 'MSTR' || h.fpe == null) ? (h.sym === 'MSTR' ? '—*' : '—') : parseFloat(h.fpe).toFixed(1)}
      </div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: distColor, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {distLabel}
      </div>
      <div style={{ textAlign: 'right', overflow: 'hidden' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap' }}>
          {h.price != null && h.price >= 0.01 ? `$${fmtPrice(h.price)}` : '—'}
        </div>
        {h.chg != null && (
          <div style={{ fontSize: 10, color: h.chg >= 0 ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
            {h.chg >= 0 ? '▲' : '▼'} {Math.abs(h.chg).toFixed(2)}%
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

// ─── Recent News ──────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function RecentNews({ sym, theme }) {
  const [articles, setArticles] = useState(null);
  useEffect(() => {
    fetch(`/api/gnews?symbol=${sym}`)
      .then(r => r.json())
      .then(d => setArticles(d.articles || []))
      .catch(() => setArticles([]));
  }, [sym]);

  return (
    <div style={{ padding: '0 16px' }}>
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 8px', fontSize: 13, fontWeight: 700, color: theme.text, borderBottom: `1px solid ${theme.line}` }}>Recent News</div>
        {articles === null && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: theme.text3 }}>Loading…</div>
        )}
        {articles !== null && articles.length === 0 && (
          <div style={{ padding: '12px 14px', fontSize: 12, color: theme.text3 }}>No recent news for {sym}</div>
        )}
        {articles !== null && articles.map((a, i) => (
          <div key={i} style={{ padding: '10px 14px', borderBottom: i < articles.length - 1 ? `1px solid ${theme.line}` : 'none' }}>
            <a href={a.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12.5, fontWeight: 500, color: theme.text, textDecoration: 'none', display: 'block', lineHeight: 1.45, marginBottom: 5 }}>
              {a.title}
            </a>
            <div style={{ display: 'flex', gap: 6, fontSize: 10, color: theme.text3 }}>
              <span>{a.source}</span>
              <span>·</span>
              <span>{timeAgo(a.publishedAt)}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Asset Detail ─────────────────────────────────────────────────────────────

function AssetDetail({ theme, sym, onBack, holdings, fgIndex, onDelete, onMethodology }) {
  const h = holdings.find(x => x.sym === sym) || { sym, name: sym, price: null, rsi: null, fpe: null, fg: fgIndex, score: 5, rating: 'HOLD', displayRating: 'HOLD' };
  const c = getColor(sym);

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('1M');
  const [chartPts, setChartPts] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);

  const removeFromDetail = async () => {
    if (!onDelete) return;
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    await onDelete(sym);
    onBack();
  };

  useEffect(() => {
    let cancelled = false;
    setChartPts(null);
    setChartLoading(true);
    fetch(`/api/chart?symbol=${encodeURIComponent(sym)}&period=${chartPeriod}`)
      .then(r => r.json())
      .then(d => { if (!cancelled && d.closes?.length) setChartPts(d.closes); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setChartLoading(false); });
    return () => { cancelled = true; };
  }, [sym, chartPeriod]);

  const fallbackSpark = useMemo(() => {
    const seed = sym.charCodeAt(0);
    const n = 40; const pts = []; let v = 50;
    for (let i = 0; i < n; i++) { v += Math.sin(i * 0.5 + seed) * 4 + (Math.random() - .5) * 3; pts.push(Math.max(10, Math.min(95, v))); }
    return pts;
  }, [sym]);

  const displayPts = chartPts || fallbackSpark;

  const sectorAvg = sym === 'NVDA' || sym === 'MSFT' || sym === 'AAPL' || sym === 'GOOGL' || sym === 'META' || sym === 'AMD' ? 30 : 22;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ic.chevL(18, theme.text)}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <TickerDot sym={sym} theme={theme} size={32}/>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)', letterSpacing: '-.02em' }}>{sym}</div>
            <div style={{ fontSize: 10.5, color: theme.text3 }}>{h.name || sym}</div>
          </div>
        </div>
        <ScoreInfoBtn theme={theme} onClick={() => onMethodology?.(h)} label={`Why ${sym} scored ${h.score}`}/>
        {onDelete && (
          <button
            type="button"
            onClick={removeFromDetail}
            onBlur={() => setConfirmRemove(false)}
            title={confirmRemove ? `Confirm remove ${sym}` : `Remove ${sym} from this portfolio`}
            style={{
              minHeight: 34, padding: '0 11px', borderRadius: 10,
              border: `1px solid ${confirmRemove ? 'rgba(239,68,68,.55)' : theme.line2}`,
              background: confirmRemove ? 'rgba(239,68,68,.14)' : theme.pillBg,
              color: confirmRemove ? '#FCA5A5' : theme.text3,
              cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 5,
              touchAction: 'manipulation', whiteSpace: 'nowrap',
            }}
          >
            {Ic.close(13, confirmRemove ? '#FCA5A5' : theme.text3)}
            {confirmRemove ? 'Confirm' : 'Remove'}
          </button>
        )}
        <RatingPill rating={h.displayRating || 'HOLD'} large/>
      </div>

      <div style={{ padding: '0 16px' }}>
        <Card theme={theme} tint={c}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)', letterSpacing: '-.03em', lineHeight: 1 }}>
              {h.price != null && h.price >= 0.01 ? `$${fmtPrice(h.price)}` : '—'}
            </div>
            {h.chg != null && (
              <div style={{ fontSize: 13, color: h.chg >= 0 ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 3 }}>
                {h.chg >= 0 ? '▲' : '▼'} {Math.abs(h.chg).toFixed(2)}%
              </div>
            )}
          </div>
          <div style={{ opacity: chartLoading ? 0.5 : 1, transition: 'opacity .2s' }}>
            <Sparkline pts={displayPts} color={c} theme={theme}/>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {['1D', '1W', '1M', '3M', '1Y', '5Y'].map(t => {
              const active = t === chartPeriod;
              return (
                <button
                  key={t}
                  onClick={() => setChartPeriod(t)}
                  style={{
                    flex: 1, textAlign: 'center', fontSize: 10,
                    fontFamily: 'var(--font-mono)', fontWeight: 600,
                    padding: '8px 0', borderRadius: 6, border: 'none',
                    background: active ? c + '24' : 'transparent',
                    color: active ? c : theme.text3,
                    outline: active ? `1px solid ${c}50` : '1px solid transparent',
                    cursor: 'pointer', touchAction: 'manipulation',
                    minHeight: 32,
                  }}
                >{t}</button>
              );
            })}
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div title={scoreTooltip(h)}>
          <Stat theme={theme} label="Score" value={scoreDisplay(h).usable ? h.score : '—'} tint={c} maxValue={10} bar/>
        </div>
        <div title={COVERAGE_TOOLTIP} style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: theme.bg2, border: `1px solid ${theme.line}`, fontSize: 11.5 }}>
          <span style={{ color: theme.text3 }}>Signal coverage</span>
          <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', color: coverageColor(h.coverage, theme) }}>{formatCoverage(h.coverage)}</b>
          <span style={{ color: theme.text3 }}>{scoreDisplay(h).usable ? coverageLabel(h.coverage) : 'Insufficient data'}</span>
        </div>
        <Stat theme={theme} label="RSI (14)" value={h.rsi ?? '—'} tint={rsiSignalColor(h.rsi, theme)} maxValue={100} bar={h.rsi != null} zones/>
        <Stat theme={theme} label="Forward P/E"
          value={(h.fpe != null && h.sym !== 'MSTR') ? parseFloat(h.fpe).toFixed(1) : '—'}
          tint={(h.fpe == null || h.sym === 'MSTR') ? theme.text3 : (h.fpe > 40 ? '#EF4444' : h.fpe > 25 ? '#F59E0B' : '#10B981')}
          maxValue={60} bar={h.fpe != null && h.sym !== 'MSTR'} style={{ gridColumn: 'span 2' }}/>
        <Stat theme={theme} label="72-Day EMA"
          value={h.ma72 != null && h.ma72 >= 0.01 ? `$${fmtPrice(h.ma72)}` : '—'}
          tint={h.aboveMa72 == null ? theme.text3 : h.aboveMa72 ? '#10B981' : '#F59E0B'}/>
        <Stat theme={theme} label="200-Day SMA"
          value={h.ma200 != null && h.ma200 >= 0.01 ? `$${fmtPrice(h.ma200)}` : '—'}
          tint={h.aboveMa200 == null ? theme.text3 : h.aboveMa200 ? '#10B981' : '#F59E0B'}/>
      </div>

      {h.ma200dist != null && (
        <div style={{ padding: '0 16px' }}>
          <Card theme={theme} style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme.text2, letterSpacing: '.06em' }}>200-DAY BASELINE</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                color: h.ma200dist < 0 ? '#10B981' : h.ma200dist > 20 ? '#EF4444' : theme.text }}>
                {(h.ma200dist >= 0 ? '+' : '') + h.ma200dist.toFixed(1) + '%'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: theme.text2, lineHeight: 1.55 }}>
              {h.ma200dist < 0
                ? `Price is ${Math.abs(h.ma200dist).toFixed(1)}% below its 200-day baseline — historically a strong DCA entry zone.`
                : h.ma200dist > 20
                  ? `Price is ${h.ma200dist.toFixed(1)}% above its 200-day baseline — significantly extended, consider waiting.`
                  : `Price is ${h.ma200dist.toFixed(1)}% above its 200-day baseline — slightly extended.`}
            </div>
          </Card>
        </div>
      )}

      {h.fpe != null && (
        <div style={{ padding: '0 16px' }}>
          <Card theme={theme} style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme.text2, letterSpacing: '.06em' }}>VALUATION CONTEXT</span>
              <span style={{ marginLeft: 'auto', fontSize: 9.5, color: theme.text3, fontFamily: 'var(--font-mono)' }}>F/PE percentile (sector)</span>
            </div>
            <PercentileBar theme={theme} v={h.fpe} sectorAvg={sectorAvg}/>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.text2, lineHeight: 1.5 }}>
              {h.fpe > 40
                ? `Expensive vs sector. Earnings would need to grow ~${Math.round((h.fpe / 22 - 1) * 100)}% to meet a 22× baseline.`
                : h.fpe > 25
                  ? 'Slightly elevated, in line with recent multi-year average.'
                  : 'Reasonable valuation vs sector average.'}
            </div>
          </Card>
        </div>
      )}

      <div style={{ padding: '0 16px' }}>
        <Card theme={theme}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>Why this rating? <ScoreInfoBtn theme={theme} onClick={() => onMethodology?.(h)} label="Open score methodology"/></div>
          <div style={{ fontSize: 12, color: theme.text2, lineHeight: 1.5 }}>
            {h.why || `Based on composite score of ${h.score}/10 from RSI position, market sentiment, and valuation metrics.`}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${theme.line}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              ['Score', h.score],
              ['RSI', h.rsi ?? '—'],
              ['F/PE', h.fpe != null ? parseFloat(h.fpe).toFixed(1) : '—'],
              ['Tag', h.tag || 'STOCK'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '5px 9px', borderRadius: 8, background: theme.bg2, border: `1px solid ${theme.line}`, fontSize: 10.5 }}>
                <span style={{ color: theme.text3 }}>{k} </span><b style={{ color: theme.text, fontFamily: 'var(--font-mono)' }}>{v}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <RecentNews sym={sym} theme={theme}/>

      <div style={{ padding: '0 16px', textAlign: 'center', fontSize: 11, color: '#475569', lineHeight: 1.6 }}>
        Educational market data only. Analyst ratings sourced from Yahoo Finance. Not financial advice.
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, border: `1px dashed ${theme.line2}`, background: theme.bg2 }}>
          <span style={{ fontSize: 16 }}>🔔</span>
          <span style={{ fontSize: 12, color: theme.text3, fontWeight: 500 }}>Price alerts — coming soon</span>
        </div>
      </div>
      <div style={{ height: 110 }}/>
    </div>
  );
}

// ─── Add Ticker ───────────────────────────────────────────────────────────────

function AddTicker({ theme, onBack, selectedTickers, onToggle }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'added' | 'notfound' | 'exists'
  const [lastSym, setLastSym] = useState('');
  const [disambig, setDisambig] = useState(null); // null | array of options

  const doAdd = async (sym) => {
    setDisambig(null);
    // Private companies have no Yahoo Finance data — allow without validation
    if (PRIVATE_COMPANIES[sym]) {
      onToggle(sym);
      setLastSym(sym);
      setQ('');
      setStatus('added');
      setTimeout(() => setStatus(null), 2000);
      return;
    }
    setStatus('loading');
    try {
      const r = await fetch(`/api/metrics?symbol=${encodeURIComponent(sym)}`);
      if (r.ok) {
        const d = await r.json();
        if (d && !d.error) {
          onToggle(sym);
          setLastSym(sym);
          setQ('');
          setStatus('added');
          setTimeout(() => setStatus(null), 2000);
        } else {
          setStatus('notfound');
        }
      } else {
        setStatus('notfound');
      }
    } catch {
      setStatus('notfound');
    }
  };

  const handleAdd = () => {
    const sym = q.trim().toUpperCase();
    if (!sym) return;
    if (selectedTickers.includes(sym)) {
      setLastSym(sym);
      setStatus('exists');
      return;
    }
    const options = DISAMBIGUATION_MAP[sym];
    if (options) { setDisambig(options); return; }
    doAdd(sym);
  };

  const canAdd = q.trim().length > 0 && status !== 'loading';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ic.chevL(18, theme.text)}</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, letterSpacing: '-.02em' }}>Add Ticker</div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: theme.card, border: `1px solid ${status === 'notfound' ? '#EF4444' : theme.line2}`, borderRadius: 14, transition: 'border-color .15s' }}>
            <input
              value={q}
              onChange={e => { setQ(e.target.value.toUpperCase()); if (status && status !== 'added') setStatus(null); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="AAPL, BTC, SOFI, PLTR…"
              autoComplete="off"
              spellCheck="false"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: theme.text, fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.06em' }}
            />
            {q && <button onClick={() => { setQ(''); setStatus(null); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.text3, padding: 0, display: 'flex' }}>{Ic.close(16, theme.text3)}</button>}
          </div>
          <button
            onClick={handleAdd}
            disabled={!canAdd}
            style={{ minWidth: 60, height: 48, borderRadius: 14, border: 'none', cursor: canAdd ? 'pointer' : 'not-allowed', background: canAdd ? `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})` : theme.pillBg, color: canAdd ? '#fff' : theme.text3, fontWeight: 700, fontSize: 13, opacity: status === 'loading' ? 0.65 : 1, transition: 'all .15s', boxShadow: canAdd ? `0 4px 14px ${theme.brand}44` : 'none' }}>
            {status === 'loading' ? '…' : 'Add'}
          </button>
        </div>
        {status === 'notfound' && <div style={{ fontSize: 11.5, color: '#EF4444', paddingLeft: 2 }}>Ticker not found.</div>}
        {status === 'exists'   && <div style={{ fontSize: 11.5, color: theme.text3, paddingLeft: 2 }}>{lastSym} is already in your list.</div>}
        {status === 'added'    && <div style={{ fontSize: 11.5, color: '#10B981', paddingLeft: 2 }}>{lastSym} added.</div>}
        {!status && <div style={{ fontSize: 11, color: theme.text3, paddingLeft: 2 }}>Any stock, ETF, or crypto — type the symbol and press Add.</div>}
      </div>

      {/* Disambiguation picker */}
      {disambig && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ padding: '16px', borderRadius: 16, background: theme.card, border: `1.5px solid ${theme.brand}55`, boxShadow: `0 8px 24px rgba(0,0,0,.35)` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
              Multiple assets match "{q.trim().toUpperCase()}"
            </div>
            <div style={{ fontSize: 11, color: theme.text3, marginBottom: 14 }}>Select the one you want to track:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {disambig.map(opt => {
                const c = getColor(opt.sym);
                const tagC = opt.tag === 'CRYPTO' ? '#F97316' : '#60A5FA';
                return (
                  <button key={opt.sym} onClick={() => doAdd(opt.sym)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                    background: c + '12', border: `1.5px solid ${c}50`,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}>
                    <TickerDot sym={opt.sym} theme={theme} size={32}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)' }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: theme.text3, marginTop: 2 }}>{opt.sub}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
                      color: tagC, background: tagC + '1F', border: `1px solid ${tagC}40` }}>{opt.tag}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setDisambig(null)} style={{
              marginTop: 10, width: '100%', padding: '10px', borderRadius: 10,
              border: `1px solid ${theme.line2}`, background: 'transparent',
              color: theme.text3, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      )}

      {selectedTickers.length > 0 && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.text3, letterSpacing: '.1em' }}>TRACKING</div>
          {selectedTickers.map(sym => {
            const c = getColor(sym);
            return (
              <div key={sym} onClick={() => onToggle(sym)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14,
                background: c + '15', border: `1.5px solid ${c}60`,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <TickerDot sym={sym} theme={theme} size={36}/>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)' }}>{sym}</div>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(239,68,68,.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {Ic.close(14, '#EF4444')}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ height: 110 }}/>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsScreen({ theme, onBack, user }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ic.chevL(18, theme.text)}</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, letterSpacing: '-.02em' }}>Settings</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <Card theme={theme} style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, boxShadow: `0 8px 18px ${theme.brand}55` }}>
            {(user || 'G').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user || 'Guest'}</div>
            <div style={{ fontSize: 11, color: theme.text3, marginTop: 1 }}>DCA Anchor</div>
          </div>
          <UserButton afterSignOutUrl="/"/>
        </Card>
      </div>

      {[
        { title: 'PORTFOLIO', items: [{ label: 'DCA Frequency', val: 'Weekly', icon: '🔁' }, { label: 'Buy Day', val: 'Mondays', icon: '📅' }, { label: 'Target Allocation', val: 'Balanced', icon: '⚖️' }] },
        { title: 'SIGNALS', items: [{ label: 'RSI strategy', val: '5/95 extremes', icon: '⚙️' }, { label: 'Alert thresholds', val: 'RSI 5/95', icon: '🎯' }, { label: 'Data refresh', val: 'Every 60m', icon: '🔄' }] },
        { title: 'LEARN & TRANSPARENCY', items: [{ label: 'Glossary of terms', icon: '📖', href: '/glossary' }, { label: 'Score methodology', val: 'Open formula', icon: '🧮' }, { label: 'Data sources', val: 'Yahoo Finance, Alt.me', icon: '🔗' }] },
      ].map(group => (
        <div key={group.title} style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: theme.text3, padding: '4px 4px 8px' }}>{group.title}</div>
          <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
            {group.items.map((it, i) => {
              const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderBottom: i === group.items.length - 1 ? 'none' : `1px solid ${theme.line}`, cursor: it.onClick || it.href ? 'pointer' : 'default', textDecoration: 'none' };
              const inner = (
                <>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: theme.bg2, border: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{it.icon}</div>
                  <div style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: 500 }}>{it.label}</div>
                  <span style={{ fontSize: 12, color: theme.text2, fontFamily: 'var(--font-mono)' }}>{it.val}</span>
                  {Ic.chevR(14, theme.text3)}
                </>
              );
              if (it.href) return <a key={it.label} href={it.href} style={rowStyle}>{inner}</a>;
              return <div key={it.label} onClick={it.onClick} style={rowStyle}>{inner}</div>;
            })}
          </Card>
        </div>
      ))}

      <div style={{ textAlign: 'center', fontSize: 10, color: theme.text3, padding: '12px 16px 16px', fontFamily: 'var(--font-mono)' }}>DCA Anchor 3.0.0</div>
      <div style={{ height: 110 }}/>
    </div>
  );
}

// ─── Calculator ───────────────────────────────────────────────────────────────

function fmt$(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return '$' + n.toFixed(2);
}

function fmtUnits(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return n.toFixed(4);
}

function DualLineChart({ smartTimeline, blindTimeline, theme }) {
  const w = 320, h = 160, pad = { l: 44, r: 8, t: 10, b: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const allValues = [
    ...smartTimeline.map(t => t.costBasis).filter(v => v != null),
    ...blindTimeline.map(t => t.costBasis).filter(v => v != null),
  ];
  if (!allValues.length) return null;

  const minV = Math.min(...allValues) * 0.97;
  const maxV = Math.max(...allValues) * 1.03;
  const n = Math.max(smartTimeline.length, blindTimeline.length);

  const xs = (i, total) => pad.l + (i / Math.max(total - 1, 1)) * innerW;
  const ys = (v) => pad.t + (1 - (v - minV) / (maxV - minV)) * innerH;

  const buildPath = (tl) => {
    const pts = tl.filter(t => t.costBasis != null);
    if (!pts.length) return '';
    return pts.map((t, i) => {
      const xi = tl.indexOf(t);
      return `${i === 0 ? 'M' : 'L'}${xs(xi, tl.length)},${ys(t.costBasis)}`;
    }).join(' ');
  };

  const blindPath = buildPath(blindTimeline);
  const smartPath = buildPath(smartTimeline);

  // Y axis labels
  const yTicks = [minV, (minV + maxV) / 2, maxV];

  // X axis labels (first and last date)
  const firstDate = blindTimeline[0]?.date || '';
  const lastDate = blindTimeline[blindTimeline.length - 1]?.date || '';
  const fmtDate = (d) => {
    if (!d) return '';
    const [, m, day] = d.split('-');
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[+m]} ${+day}`;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ display: 'block' }}>
      {/* Grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} x2={pad.l + innerW} y1={ys(v)} y2={ys(v)} stroke={theme.line} strokeDasharray="2 3"/>
          <text x={pad.l - 3} y={ys(v) + 3} fontSize="8" fill={theme.text3} fontFamily="var(--font-mono)" textAnchor="end">
            {v >= 1000 ? `$${Math.round(v / 100) / 10}k` : `$${Math.round(v)}`}
          </text>
        </g>
      ))}
      {/* X labels */}
      <text x={pad.l} y={h - 2} fontSize="8" fill={theme.text3} fontFamily="var(--font-mono)">{fmtDate(firstDate)}</text>
      <text x={pad.l + innerW} y={h - 2} fontSize="8" fill={theme.text3} fontFamily="var(--font-mono)" textAnchor="end">{fmtDate(lastDate)}</text>
      {/* Lines */}
      {blindPath && <path d={blindPath} fill="none" stroke="#5BC8FF" strokeWidth="1.5" opacity=".7"/>}
      {smartPath && <path d={smartPath} fill="none" stroke="#10B981" strokeWidth="2"/>}
      {/* End dots */}
      {blindTimeline.filter(t => t.costBasis != null).slice(-1).map((t, i) => (
        <circle key={i} cx={xs(blindTimeline.indexOf(t), blindTimeline.length)} cy={ys(t.costBasis)} r="3.5" fill="#5BC8FF" stroke={theme.card} strokeWidth="1.5"/>
      ))}
      {smartTimeline.filter(t => t.costBasis != null).slice(-1).map((t, i) => (
        <circle key={i} cx={xs(smartTimeline.indexOf(t), smartTimeline.length)} cy={ys(t.costBasis)} r="3.5" fill="#10B981" stroke={theme.card} strokeWidth="1.5"/>
      ))}
    </svg>
  );
}

function CalcMetricRow({ label, smartVal, blindVal, theme }) {
  return (
    <div style={{ display: 'flex', borderBottom: `1px solid ${theme.line}` }}>
      <div style={{ flex: 1, padding: '10px 12px', borderRight: `1px solid ${theme.line}` }}>
        <div style={{ fontSize: 9.5, color: theme.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#10B981' }}>{smartVal}</div>
      </div>
      <div style={{ flex: 1, padding: '10px 12px' }}>
        <div style={{ fontSize: 9.5, color: theme.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: theme.text }}>{blindVal}</div>
      </div>
    </div>
  );
}

function CalculatorScreen({ theme, holdings }) {
  const tickers = holdings.map(h => h.sym);
  const [ticker, setTicker] = useState(tickers[0] || '');

  // Sync ticker when holdings load after initial mount (async data fetch)
  useEffect(() => {
    if (!ticker && tickers.length > 0) setTicker(tickers[0]);
  }, [tickers, ticker]);
  const [amount, setAmount] = useState('100');
  const [frequency, setFrequency] = useState('weekly');
  const [buyDay, setBuyDay] = useState('1'); // weekly: 0=Mon…4=Fri; monthly: 1,8,15,22
  const [rsiThreshold, setRsiThreshold] = useState('35');
  const [period, setPeriod] = useState('6m');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const weeklyDays = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
  ];
  const monthlyDays = [
    { value: '1',  label: '1st' },
    { value: '8',  label: '8th' },
    { value: '15', label: '15th' },
    { value: '22', label: '22nd' },
  ];

  // Compute next scheduled buy date
  const nextBuyDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (frequency === 'weekly') {
      const target = parseInt(buyDay); // JS getDay(): 0=Sun,1=Mon,...
      let d = new Date(today);
      for (let i = 1; i <= 7; i++) {
        d = new Date(today.getTime() + i * 86400000);
        if (d.getDay() === target) break;
      }
      return d;
    } else {
      const dom = parseInt(buyDay);
      let d = new Date(today.getFullYear(), today.getMonth(), dom);
      if (d <= today) d = new Date(today.getFullYear(), today.getMonth() + 1, dom);
      return d;
    }
  }, [frequency, buyDay]);

  const fmtNextBuy = (d) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
  };

  const handleRun = async () => {
    if (!ticker || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(
        `/api/calculator?symbol=${encodeURIComponent(ticker)}&period=${period}&rsiThreshold=${rsiThreshold}&amount=${amount}&frequency=${frequency}&buyDay=${buyDay}`
      );
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setResult(d);
    } catch (e) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    border: 'none', outline: 'none', background: 'transparent',
    color: theme.text, fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 600,
    width: '100%',
  };

  const fieldWrap = {
    padding: '11px 14px', background: theme.card,
    border: `1px solid ${theme.line2}`, borderRadius: 12,
  };

  const labelStyle = {
    fontSize: 9.5, fontWeight: 700, letterSpacing: '.09em',
    color: theme.text3, marginBottom: 5, display: 'block',
  };

  const s = result?.smart;
  const b = result?.blind;

  const advantage = (s && b && s.buyCount > 0 && b.avgCostBasis > 0 && s.avgCostBasis > 0)
    ? (b.avgCostBasis - s.avgCostBasis) * s.totalUnits
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ padding: '10px 20px 2px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 16px ${theme.brand}55` }}>
          {Ic.calc(18, '#fff')}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: theme.text, letterSpacing: '-.02em' }}>DCA Calculator</div>
          <div style={{ fontSize: 10, color: theme.text3, marginTop: 1 }}>Smart vs Blind · historical simulation</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Ticker */}
        <div>
          <span style={labelStyle}>TICKER</span>
          <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 8 }}>
            {ticker && <div style={{ width: 22, height: 22, borderRadius: 7, background: getColor(ticker), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flex: '0 0 auto' }}>{ticker[0]}</div>}
            <select value={ticker} onChange={e => setTicker(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
              {tickers.length === 0 && <option value="">Add tickers first</option>}
              {tickers.map(sym => <option key={sym} value={sym}>{sym}</option>)}
            </select>
            {Ic.chevR(14, theme.text3)}
          </div>
        </div>

        {/* Amount + Frequency */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={labelStyle}>INVEST PER PERIOD</span>
            <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: theme.text3, fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>$</span>
              <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, width: '100%' }}/>
            </div>
          </div>
          <div>
            <span style={labelStyle}>FREQUENCY</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ v: 'weekly', l: 'Weekly' }, { v: 'monthly', l: 'Monthly' }].map(o => (
                <button key={o.v} onClick={() => { setFrequency(o.v); setBuyDay(o.v === 'weekly' ? '1' : '1'); }} style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${frequency === o.v ? theme.brand + '55' : theme.line2}`,
                  background: frequency === o.v ? theme.brand + '18' : theme.card,
                  color: frequency === o.v ? theme.brand : theme.text3,
                  fontWeight: frequency === o.v ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
                }}>{o.l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Buy Day + RSI Threshold */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={labelStyle}>BUY DAY</span>
            <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 8 }}>
              <select value={buyDay} onChange={e => setBuyDay(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none', fontSize: 13 }}>
                {(frequency === 'weekly' ? weeklyDays : monthlyDays).map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
              {Ic.chevR(14, theme.text3)}
            </div>
          </div>
          <div>
            <span style={labelStyle}>RSI THRESHOLD</span>
            <div style={{ ...fieldWrap, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: theme.text3, fontWeight: 600, whiteSpace: 'nowrap' }}>RSI &lt;</span>
              <input type="number" min="1" max="99" value={rsiThreshold} onChange={e => setRsiThreshold(e.target.value)} style={{ ...inputStyle, width: '100%' }}/>
            </div>
          </div>
        </div>

        {/* Next buy callout */}
        <div style={{ padding: '9px 14px', borderRadius: 10, background: theme.bg2, border: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: 99, background: theme.brand, boxShadow: `0 0 8px ${theme.brand}` }}/>
          <span style={{ fontSize: 11.5, color: theme.text2 }}>
            Next scheduled buy: <b style={{ color: theme.text, fontFamily: 'var(--font-mono)' }}>{fmtNextBuy(nextBuyDate)}</b>
          </span>
        </div>

        {/* Period row */}
        <div>
          <span style={labelStyle}>BACKTEST PERIOD</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ v: '6m', l: '6 months' }, { v: '12m', l: '12 months' }].map(o => (
              <button key={o.v} onClick={() => setPeriod(o.v)} style={{
                flex: 1, padding: '11px 0', borderRadius: 12, border: `1px solid ${period === o.v ? theme.brand + '55' : theme.line2}`,
                background: period === o.v ? theme.brand + '18' : theme.card,
                color: period === o.v ? theme.brand : theme.text3,
                fontWeight: period === o.v ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
              }}>{o.l}</button>
            ))}
          </div>
        </div>

        {/* Run button */}
        <button
          onClick={handleRun}
          disabled={!ticker || loading}
          style={{
            height: 50, borderRadius: 14, border: 'none', cursor: ticker && !loading ? 'pointer' : 'not-allowed',
            background: ticker && !loading ? `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})` : theme.line,
            color: ticker && !loading ? '#fff' : theme.text3,
            fontWeight: 700, fontSize: 14, letterSpacing: '.02em',
            boxShadow: ticker && !loading ? `0 8px 20px ${theme.brand}44` : 'none',
            transition: 'all .15s', opacity: loading ? 0.65 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>Calculating<span style={{ opacity: 0.6 }}>…</span></>
          ) : (
            <>{Ic.calc(16, 'currentColor')} Run Simulation →</>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '0 16px', padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', fontSize: 12, color: '#EF4444' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && s && b && (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            <div style={{ padding: '8px 12px', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', borderRadius: '12px 0 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: '#10B981', boxShadow: '0 0 8px #10B981' }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', letterSpacing: '.06em' }}>SMART DCA</span>
            </div>
            <div style={{ padding: '8px 12px', background: theme.bg2, border: `1px solid ${theme.line2}`, borderRadius: '0 12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 99, background: theme.brand, opacity: 0.7 }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: theme.text2, letterSpacing: '.06em' }}>BLIND DCA</span>
            </div>
          </div>

          <Card theme={theme} style={{ padding: 0, overflow: 'hidden', borderRadius: '0 0 18px 18px', marginTop: -12, borderTop: 'none' }}>
            <CalcMetricRow theme={theme} label="Avg Cost Basis"
              smartVal={fmt$(s.avgCostBasis)} blindVal={fmt$(b.avgCostBasis)}/>
            <CalcMetricRow theme={theme} label="Units Accumulated"
              smartVal={fmtUnits(s.totalUnits)} blindVal={fmtUnits(b.totalUnits)}/>
            <CalcMetricRow theme={theme} label="Total Invested"
              smartVal={fmt$(s.totalInvested)} blindVal={fmt$(b.totalInvested)}/>
            <div style={{ display: 'flex', borderBottom: `1px solid ${theme.line}` }}>
              <div style={{ flex: 1, padding: '10px 12px', borderRight: `1px solid ${theme.line}` }}>
                <div style={{ fontSize: 9.5, color: theme.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>Portfolio Value</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#10B981' }}>{fmt$(s.portfolioValue)}</div>
                <div style={{ fontSize: 9.5, color: theme.text3, marginTop: 2 }}>@ ${result.currentPrice?.toFixed(2)}</div>
              </div>
              <div style={{ flex: 1, padding: '10px 12px' }}>
                <div style={{ fontSize: 9.5, color: theme.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>Portfolio Value</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: theme.text }}>{fmt$(b.portfolioValue)}</div>
                <div style={{ fontSize: 9.5, color: theme.text3, marginTop: 2 }}>@ ${result.currentPrice?.toFixed(2)}</div>
              </div>
            </div>

            {/* Buy count row */}
            <div style={{ display: 'flex' }}>
              <div style={{ flex: 1, padding: '10px 12px', borderRight: `1px solid ${theme.line}` }}>
                <div style={{ fontSize: 9.5, color: theme.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>Buys Made</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#10B981' }}>{s.buyCount}</div>
              </div>
              <div style={{ flex: 1, padding: '10px 12px' }}>
                <div style={{ fontSize: 9.5, color: theme.text3, fontWeight: 600, letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 3 }}>Buys Made</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: theme.text }}>{b.buyCount}</div>
              </div>
            </div>
          </Card>

          {/* Advantage callout */}
          {advantage != null && Math.abs(advantage) > 0.01 && (
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: advantage > 0 ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.06)',
              border: `1px solid ${advantage > 0 ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.25)'}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 20, flex: '0 0 auto' }}>{advantage > 0 ? '🎯' : '📊'}</div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: advantage > 0 ? '#10B981' : '#EF4444' }}>
                  {advantage > 0
                    ? `Smart DCA saves ${fmt$(Math.abs(advantage))} in cost basis`
                    : `Blind DCA captured ${fmt$(Math.abs(advantage))} more value`}
                </div>
                <div style={{ fontSize: 11, color: theme.text2, marginTop: 2 }}>
                  {advantage > 0
                    ? `Lower avg entry by ${fmt$(b.avgCostBasis - s.avgCostBasis)}/unit on ${s.buyCount} selective buys`
                    : `Market trended up — more buys = more units accumulated`}
                </div>
              </div>
            </div>
          )}

          {s.buyCount === 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: theme.bg2, border: `1px dashed ${theme.line2}`, fontSize: 12, color: theme.text2, textAlign: 'center' }}>
              RSI never dropped below {rsiThreshold} during this period — Smart DCA made no buys. Try a higher threshold.
            </div>
          )}

          {/* Chart */}
          {s.buyCount > 0 && b.buyCount > 0 && (
            <Card theme={theme}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.text, marginBottom: 4 }}>Avg Cost Basis Over Time</div>
              <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 20, height: 2, borderRadius: 1, background: '#10B981' }}/>
                  <span style={{ fontSize: 10, color: theme.text2, fontFamily: 'var(--font-mono)' }}>Smart DCA</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 20, height: 2, borderRadius: 1, background: '#5BC8FF', opacity: 0.7 }}/>
                  <span style={{ fontSize: 10, color: theme.text2, fontFamily: 'var(--font-mono)' }}>Blind DCA</span>
                </div>
              </div>
              <DualLineChart smartTimeline={result.smart.timeline} blindTimeline={result.blind.timeline} theme={theme}/>
            </Card>
          )}

          {/* Disclaimer */}
          <div style={{
            padding: '12px 14px', borderRadius: 12, marginBottom: 4,
            background: theme.bg2, border: `1px dashed ${theme.line2}`,
            fontSize: 10.5, color: theme.text3, lineHeight: 1.55, textAlign: 'center',
          }}>
            Based on historical price data only. Not a prediction. <b style={{ color: theme.text2 }}>Nothing here is financial advice.</b>
          </div>
        </div>
      )}

      {/* Footnote legend */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.6, paddingTop: 12, borderTop: '1px solid #1e2433' }}>
          <div style={{ marginBottom: 8 }}>How this works</div>
          <div>* Ticker — select any asset from your watchlist to backtest</div>
          <div>* Amount — how much you invest per week or month</div>
          <div>* Frequency — Weekly buys on your chosen day · Monthly buys on your chosen date</div>
          <div>* RSI Threshold — Smart DCA only buys when RSI drops below this number (default 35)</div>
          <div style={{ marginBottom: 8 }}>* Backtest Period — how many months of historical price data to simulate against</div>
          <div>Smart DCA — only deploys capital when RSI is at or below your threshold. Fewer buys, potentially lower average cost basis.</div>
          <div style={{ marginBottom: 8 }}>Blind DCA — buys on every scheduled interval regardless of market conditions. More consistent, higher average cost basis during rallies.</div>
          <div style={{ marginBottom: 8 }}>The dollar difference shown is how much Smart DCA would have saved per unit vs Blind DCA over the selected period.</div>
          <div>* Based on historical Yahoo Finance price data only. Not a prediction. Not financial advice.</div>
        </div>
      </div>

      <div style={{ height: 110 }}/>
    </div>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────

function DesktopSidebar({ theme, activeScreen, onNav, user, onLogout }) {
  const items = [
    { id: 'home',     label: 'Home',       icon: Ic.home,    screen: 'dashboard' },
    { id: 'calc',     label: 'Calculator', icon: Ic.calc,    screen: 'calculator' },
    { id: 'compare',  label: 'Compare',    icon: Ic.compare, screen: 'compare',   href: '/compare' },
    { id: 'glossary', label: 'Glossary',   icon: Ic.book,    screen: 'glossary',  href: '/glossary' },
  ];
  return (
    // The parent <aside class="dca-sidebar"> is a COLUMN flex container, so a
    // flex-basis here sizes the HEIGHT, not the width. `flex: 0 0 200px` sat
    // next to `width: 200` and read like a width, but it capped this box at
    // 200px tall and overrode height:100vh — clipping every nav item past the
    // third. Width comes from the aside; this only needs to fill it.
    <div style={{
      width: 200, background: '#0B1020',
      borderRight: `1px solid rgba(255,255,255,.08)`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* Branding */}
      <div style={{ padding: '22px 16px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid rgba(255,255,255,.06)` }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${theme.brand}55`,
        }}>{Ic.logo(16, '#fff')}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, letterSpacing: '-.02em' }}>DCA Anchor</div>
      </div>
      {/* Nav items */}
      <div style={{ flex: 1, padding: '10px 8px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const on = activeScreen === item.screen || (item.screen === 'dashboard' && activeScreen === 'detail');
          const navStyle = {
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 10, border: 'none', cursor: 'pointer',
            background: on ? theme.brand + '18' : 'transparent',
            color: on ? theme.brand : theme.text3,
            fontWeight: on ? 600 : 500, fontSize: 13,
            borderLeft: on ? `2px solid ${theme.brand}` : '2px solid transparent',
            transition: 'all .15s', textAlign: 'left', textDecoration: 'none', width: '100%', minHeight: 42,
          };
          if (item.href) {
            return (
              <a key={item.id} href={item.href} style={navStyle}>
                {item.icon(16, theme.text3)}
                {item.label}
              </a>
            );
          }
          return (
            <button key={item.id} onClick={() => onNav(item.screen)} style={navStyle}>
              {item.icon(16, on ? theme.brand : theme.text3)}
              {item.label}
            </button>
          );
        })}
      </div>
      {/* User */}
      {user && (
        <div style={{ padding: '12px 16px 8px', borderTop: `1px solid rgba(255,255,255,.06)`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: theme.brand + '28', color: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {(user || 'G').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ flex: 1, fontSize: 12, color: theme.text2, fontWeight: 500, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user}</div>
          <UserButton afterSignOutUrl="/"/>
        </div>
      )}
      {/* Disclaimer */}
      <div style={{ padding: user ? '0 12px 14px' : '12px 12px 14px', borderTop: user ? 'none' : `1px solid rgba(255,255,255,.06)` }}>
        <div style={{ fontSize: 9, color: '#4B5478', lineHeight: 1.5, textAlign: 'center' }}>
          Educational market data only.<br/>Not financial advice. Not personalized recommendations.
        </div>
      </div>
    </div>
  );
}

function DesktopHeader({ theme, user, isSignedIn, onAdd, onLogout, fgIndex, plaidConfigured, onImport }) {
  const fgC = fgIndex != null ? fgColor(fgIndex) : theme.text3;
  const fgLbl = fgIndex != null ? fgLabel(fgIndex) : null;
  return (
    <div style={{
      padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid rgba(255,255,255,.06)`, background: '#0B1020',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.text, letterSpacing: '-.02em' }}>DCA Contribution Planner</div>
          <div style={{ marginTop: 1, fontSize: 10.5, color: theme.text3 }}>Decide where your next scheduled contribution goes.</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {fgIndex != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: fgC + '18', border: `1px solid ${fgC}40` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: fgC, fontFamily: 'var(--font-mono)' }}>{fgIndex}</span>
            <span style={{ fontSize: 10, color: fgC, fontWeight: 600 }}>F&amp;G</span>
            {fgLbl && <span style={{ fontSize: 10, color: theme.text3 }}>· {fgLbl}</span>}
          </div>
        )}
        {plaidConfigured && (
          <button
            onClick={onImport}
            title="Connect a brokerage (sandbox) and preview its holdings"
            style={{
              height: 34, padding: '0 13px', borderRadius: 9, cursor: 'pointer',
              border: `1px solid ${theme.line2}`, background: 'transparent',
              color: theme.text2, fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >{Ic.refresh(12, theme.text2)} Connect brokerage</button>
        )}
        {!isSignedIn && (
          <SignInButton mode="modal">
            <button style={{
              height: 34, padding: '0 13px', borderRadius: 9, cursor: 'pointer',
              border: `1px solid ${theme.brand}66`, background: theme.brand + '16',
              color: theme.brand, fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
            }}>Sign in to save</button>
          </SignInButton>
        )}
        <button onClick={onAdd} style={{
          height: 34, padding: '0 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
          color: '#fff', fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: `0 4px 12px ${theme.brand}44`,
        }}>{Ic.plus(13, '#fff')} Add Ticker</button>
      </div>
    </div>
  );
}

function DesktopDashboardRight({ theme, holdings, loading, navigate, fgIndex, onMethodology }) {
  const [focused, setFocused] = useState(null);
  // Leader must come from assets that actually have signals behind them.
  const top = holdings.find(isRankable) || null;
  const chartData = holdings;
  return (
    <>
      {top && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Watchlist Leader</div>
          <TopPickCard theme={theme} holding={top} onOpen={() => navigate('detail', top.sym)} onMethodology={() => onMethodology?.(top)}/>
        </div>
      )}
      {chartData.length > 0 && (
        <Card theme={theme}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SectionHead theme={theme} title="Scores" sub="0–10 absolute composite signal"/>
            <ScoreInfoBtn theme={theme} onClick={() => onMethodology?.(top)}/>
          </div>
          <ScoresChart data={chartData} theme={theme} focused={focused} onPick={s => setFocused(focused === s ? null : s)}/>
        </Card>
      )}
      {chartData.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.text3 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📈</div>
          <div style={{ fontSize: 13, color: theme.text2 }}>Add tickers to see charts</div>
        </div>
      )}
    </>
  );
}

function DesktopDashboard({ theme, holdings, loading, navigate, onRefresh, fgIndex, onMethodology }) {
  const [focused, setFocused] = useState(null);
  // Leader must come from assets that actually have signals behind them.
  const top = holdings.find(isRankable) || null;
  const chartData = holdings;

  return (
    <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Left: Holdings table (60%) */}
      <div style={{ flex: '0 0 60%', overflowY: 'auto', borderRight: `1px solid rgba(255,255,255,.06)`, padding: '24px 20px 24px 28px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>Holdings</div>
        <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 88px 30px 36px 48px 1fr', gap: 5, padding: '8px 16px', background: theme.bg2, borderBottom: `1px solid ${theme.line}` }}>
            {['ASSET', 'BUY RATING', 'RSI', 'PE', '200MA', 'PRICE'].map((h, i) => (
              <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: theme.text3, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {loading && holdings.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: theme.text3, fontSize: 12 }}>Loading data…</div>
          )}
          {holdings.length === 0 && !loading && (
            <div style={{ padding: 48, textAlign: 'center', color: theme.text3 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 6 }}>No tickers yet</div>
              <div style={{ fontSize: 12 }}>Use Add Ticker to start tracking</div>
            </div>
          )}
          {holdings.map((h, i) => (
            <HoldingRow key={h.sym} h={h} theme={theme} last={i === holdings.length - 1} onClick={() => navigate('detail', h.sym)}/>
          ))}
        </Card>
        {holdings.length > 0 && (
          <button onClick={onRefresh} style={{ marginTop: 12, fontSize: 11, fontWeight: 600, color: theme.text3, background: theme.bg2, border: `1px solid ${theme.line}`, padding: '6px 10px', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {Ic.refresh(12, theme.text3)} Refresh data
          </button>
        )}
      </div>

      {/* Right: Charts (40%) */}
      <div style={{ flex: '0 0 40%', overflowY: 'auto', padding: '24px 28px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {top && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Watchlist Leader</div>
            <TopPickCard theme={theme} holding={top} onOpen={() => navigate('detail', top.sym)}/>
          </div>
        )}
        {chartData.length > 0 && (
          <Card theme={theme}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SectionHead theme={theme} title="Scores" sub="0–10 absolute composite signal"/>
              <ScoreInfoBtn theme={theme} onClick={() => onMethodology?.(top)}/>
            </div>
            <ScoresChart data={chartData} theme={theme} focused={focused} onPick={s => setFocused(focused === s ? null : s)}/>
          </Card>
        )}
        {chartData.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: theme.text3 }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>📈</div>
            <div style={{ fontSize: 13, color: theme.text2 }}>Add tickers to see charts</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function tagFor(sym) {
  if (PRIVATE_COMPANIES[sym]) return PRIVATE_COMPANIES[sym].tag || 'STOCK';
  const crypto = ['BTC', 'ETH', 'SOL', 'HYPE', 'COIN', 'BNB', 'ADA', 'DOGE', 'AVAX'];
  const income = ['DIVO'];
  const hedge = ['GLD'];
  if (sym.endsWith('-USD')) return 'CRYPTO';
  if (crypto.includes(sym)) return 'CRYPTO';
  if (income.includes(sym)) return 'INCOME';
  if (hedge.includes(sym)) return 'HEDGE';
  return 'STOCK';
}

export default function Home() {
  const theme = THEMES.dark;
  const { isLoaded: authLoaded, isSignedIn, user: clerkUser } = useUser();
  const userId = clerkUser?.id || null;
  const signedIn = authLoaded && isSignedIn;
  const storageId = signedIn ? userId : GUEST_USER_ID;
  const userLabel =
    signedIn ? (clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.username || 'Account') : 'Guest';

  const [stack, setStack] = useState([{ screen: 'dashboard' }]);
  const [tab, setTab] = useState('home');
  const [portfolios, setPortfolios] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [metricsMap, setMetricsMap] = useState({});
  const [fgIndex, setFgIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [syncState, setSyncState] = useState('ok'); // 'ok' | 'saving' | 'offline'
  // Server-derived: whether the Plaid connect flow would actually succeed, and
  // which environment it targets. Both are owner-only and false/null otherwise.
  const [plaidConfigured, setPlaidConfigured] = useState(false);
  const [plaidEnv, setPlaidEnv] = useState(null);
  // Dashboard registers the panel's open() here so the header's Import can call it.
  const dashboardPlaidOpen = useRef(null);
  const [methodologyAsset, setMethodologyAsset] = useState(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const cur = stack[stack.length - 1];
  const navigate = (screen, arg) => setStack(s => [...s, { screen, arg }]);
  const back = () => setStack(s => s.length > 1 ? s.slice(0, -1) : [{ screen: 'dashboard' }]);
  const replace = (screen) => setStack([{ screen }]);

  const activePortfolio = useMemo(
    () => portfolios.find(p => p.id === activeId) || portfolios[0] || null,
    [portfolios, activeId]
  );

  // The rest of the app still thinks in bare symbols; portfolios are the source.
  const selectedTickers = useMemo(
    () => (activePortfolio?.items || []).map(i => i.symbol),
    [activePortfolio]
  );

  // Every state change goes through here so the cache can never drift from state.
  const commit = useCallback((next) => {
    setPortfolios(next);
    writeCachedPortfolios(storageId, next);
  }, [storageId]);

  /**
   * Whatever the user is already on wins as long as it still exists; otherwise
   * fall back to the selection saved from a previous visit, then to the first
   * portfolio. This is what makes the active tab survive a reload.
   */
  const resolveActive = useCallback((list, prev) => {
    if (prev && list.some(p => p.id === prev)) return prev;
    const saved = readActiveId(storageId);
    if (saved && list.some(p => p.id === saved)) return saved;
    return list[0]?.id ?? null;
  }, [storageId]);

  const selectActive = useCallback((id) => {
    setActiveId(id);
    writeActiveId(storageId, id);
  }, [storageId]);

  const loadPortfolios = useCallback(async ({ silent = false } = {}) => {
    if (!signedIn || !userId) return;
    if (!silent) setDataLoading(true);
    try {
      const r = await fetch('/api/portfolios');
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(`${r.status} ${d.message || d.error || 'load failed'}`);
      }
      const d = await r.json();
      setPlaidConfigured(d.plaidConfigured === true);
      setPlaidEnv(typeof d.plaidEnv === 'string' ? d.plaidEnv : null);
      const list = Array.isArray(d.portfolios) ? d.portfolios : [];
      const visible = visiblePortfolios(list);
      commit(visible);
      setActiveId(prev => resolveActive(visible, prev));
      setSyncState('ok');
    } catch (err) {
      console.error('[portfolios] load failed:', err.message);
      setSyncState('offline');
    } finally {
      setDataLoading(false);
    }
  }, [signedIn, userId, commit, resolveActive]);

  // Hydrate from cache first so a slow or failed request never shows an empty
  // portfolio, then reconcile with the server.
  useEffect(() => {
    if (!authLoaded) return;
    if (!signedIn) {
      const cachedGuest = visiblePortfolios(readCachedPortfolios(GUEST_USER_ID));
      const local = cachedGuest && cachedGuest.length ? cachedGuest : guestPortfolios();
      setPortfolios(local);
      setActiveId(prev => resolveActive(local, prev));
      setPlaidConfigured(false);
      setPlaidEnv(null);
      setSyncState('ok');
      setDataLoading(false);
      return;
    }
    const cached = visiblePortfolios(readCachedPortfolios(storageId));
    if (cached && cached.length) {
      setPortfolios(cached);
      setActiveId(prev => resolveActive(cached, prev));
    }
    loadPortfolios({ silent: !!(cached && cached.length) });
  }, [authLoaded, signedIn, storageId, loadPortfolios, resolveActive]);

  /** A brand-new account has no rows yet; create the default watchlist on demand. */
  const ensurePortfolio = async () => {
    if (activePortfolio) return activePortfolio;
    if (!signedIn) {
      const created = guestPortfolios()[0];
      commit([created]);
      selectActive(created.id);
      return created;
    }
    const r = await fetch('/api/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Watchlist', kind: 'watchlist' }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || d.error || 'Could not create a watchlist.');
    const created = { ...d.portfolio, items: d.portfolio.items || [] };
    commit([...portfolios, created]);
    selectActive(created.id);
    return created;
  };

  const createPortfolio = async (name) => {
    if (!signedIn) {
      const created = makeLocalPortfolio(name);
      commit([...portfolios, created]);
      selectActive(created.id);
      return;
    }
    const r = await fetch('/api/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, kind: 'portfolio' }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || d.error || 'Could not create portfolio.');
    const created = { ...d.portfolio, items: d.portfolio.items || [] };
    commit([...portfolios, created]);
    selectActive(created.id);
  };

  const renamePortfolio = async (id, name) => {
    if (!signedIn) {
      commit(portfolios.map(p => p.id === id ? { ...p, name } : p));
      return;
    }
    const r = await fetch(`/api/portfolios/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || d.error || 'Could not rename portfolio.');
    commit(portfolios.map(p => p.id === id ? { ...p, name: d.portfolio?.name ?? name } : p));
  };

  const deletePortfolio = async (id) => {
    // Mirrors the server guard so the last portfolio can't be removed even if
    // the control is somehow reachable.
    if (portfolios.length <= 1) throw new Error('You need at least one portfolio.');

    const remaining = portfolios.filter(p => p.id !== id);
    if (!signedIn) {
      commit(remaining);
      if (id === activePortfolio?.id) selectActive(remaining[0]?.id ?? null);
      return;
    }
    const r = await fetch(`/api/portfolios/${id}`, { method: 'DELETE' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || d.error || 'Could not delete portfolio.');

    commit(remaining);
    // Deleting whatever was on screen has to land somewhere real.
    if (id === activePortfolio?.id) selectActive(remaining[0]?.id ?? null);
  };


  // Fetch Fear & Greed index — server first, browser fallback to alternative.me
  useEffect(() => {
    fetch('/api/feargreed')
      .then(r => r.json())
      .then(d => {
        if (d.value != null) {
          setFgIndex(d.value);
        } else {
          return fetch('https://api.alternative.me/fng/?limit=1')
            .then(r => r.json())
            .then(data => { if (data.data?.[0]) setFgIndex(parseInt(data.data[0].value)); })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Fetch metrics for selected tickers
  const fetchMetrics = async () => {
    if (!selectedTickers.length) return;
    setLoading(true);
    const results = await Promise.allSettled(
      selectedTickers.map(async ticker => {
        const r = await fetch(`/api/metrics?symbol=${ticker}`);
        const d = await r.json();
        return [ticker, d];
      })
    );
    const updated = {};
    for (const r of results) {
      if (r.status === 'fulfilled') {
        const [ticker, data] = r.value;
        updated[ticker] = data;
      }
    }
    setMetricsMap(updated);
    setLoading(false);
    setLastRefreshed(Date.now());
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3600000);
    return () => clearInterval(interval);
  }, [selectedTickers]);

  const holdings = useMemo(() => {
    return selectedTickers.filter(sym => typeof sym === 'string').map(sym => {
      const m = metricsMap[sym] || {};
      const rating = m.rating || 'HOLD';
      const rsi = m.rsi;
      const fpe = m.forwardPE ? parseFloat(m.forwardPE) : null;
      const tag = tagFor(sym);
      const isCrypto = tag === 'CRYPTO';
      const aboveMa72 = m.aboveMa72 ?? null;
      const aboveMa200 = m.aboveMa200 ?? null;
      const ma200dist = (m.currentPrice && m.ma200) ? ((m.currentPrice - m.ma200) / m.ma200) * 100 : null;
      const ma72dist = (m.currentPrice && m.ma72) ? ((m.currentPrice - m.ma72) / m.ma72) * 100 : null;
      // Everything the scoring engine reads, in one object, so the holding row
      // carries the same inputs the tooltip and methodology drawer re-score from.
      const scoreInput = {
        sym, tag, isCrypto,
        rsi,
        fg: fgIndex,
        fpe,
        rating,
        analystCount: m.analystCount ?? null,
        price: m.currentPrice ?? null,
        ma72: m.ma72 ?? null,
        ma200: m.ma200 ?? null,
      };
      const { score, coverage } = scoreAsset(scoreInput);
      const displayRating = ratingForScore(score);
      return {
        sym,
        name: m.name || PRIVATE_COMPANIES[sym]?.name || sym,
        price: m.currentPrice || null,
        chg: m.regularMarketChangePercent || null,
        rsi,
        fpe,
        fg: fgIndex,
        rating,
        analystCount: m.analystCount ?? null,
        displayRating,
        score,
        coverage,
        tag,
        ma72: m.ma72 || null,
        ma200: m.ma200 || null,
        aboveMa72,
        aboveMa200,
        ma200dist: ma200dist != null ? parseFloat(ma200dist.toFixed(1)) : null,
        ma72dist: ma72dist != null ? parseFloat(ma72dist.toFixed(1)) : null,
        wkLow:  m.fiftyTwoWeekLow  ?? null,
        wkHigh: m.fiftyTwoWeekHigh ?? null,
        why: null,
      };
    }).sort((a, b) => b.score - a.score);
  }, [selectedTickers, metricsMap, fgIndex]);

  const toggleTicker = async (sym) => {
    let target;
    try {
      target = await ensurePortfolio();
    } catch (err) {
      console.error('[portfolios] could not create watchlist:', err.message);
      setSyncState('offline');
      return;
    }

    const has = (target.items || []).some(i => i.symbol === sym);

    // Update locally first (and mirror to cache) so the UI stays responsive and
    // the change survives a failed request; then reconcile with the server.
    const optimistic = portfolios.map(p => p.id !== target.id ? p : {
      ...p,
      items: has
        ? p.items.filter(i => i.symbol !== sym)
        : [...p.items, { symbol: sym, tag: null, dca: false, shares: null, costBasis: null }],
    });
    commit(optimistic);

    if (!signedIn) {
      setSyncState('ok');
      return;
    }
    setSyncState('saving');

    try {
      const r = has
        ? await fetch(`/api/portfolios/${target.id}/items?symbol=${encodeURIComponent(sym)}`, { method: 'DELETE' })
        : await fetch(`/api/portfolios/${target.id}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: sym }),
          });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || d.error || 'save rejected');
      }
      setSyncState('ok');
    } catch (err) {
      console.error('[portfolios] save failed:', err.message);
      setSyncState('offline');
    }
  };

  /**
   * Delete-only counterpart to toggleTicker, used by the swipe/double-click
   * gesture. Kept separate so a gesture that fires on an already-removed row
   * can never toggle the symbol back on.
   */
  const removeTicker = async (sym) => {
    const target = activePortfolio;
    if (!target || !(target.items || []).some(i => i.symbol === sym)) return;

    commit(portfolios.map(p => p.id !== target.id ? p : {
      ...p,
      items: p.items.filter(i => i.symbol !== sym),
    }));

    if (!signedIn) {
      setSyncState('ok');
      return;
    }
    setSyncState('saving');

    try {
      const r = await fetch(`/api/portfolios/${target.id}/items?symbol=${encodeURIComponent(sym)}`, { method: 'DELETE' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.message || d.error || 'delete rejected');
      }
      setSyncState('ok');
    } catch (err) {
      // The row is already gone from the UI; re-read the server so the list
      // reflects what actually persisted rather than an optimistic lie.
      console.error('[portfolios] delete failed:', err.message);
      setSyncState('offline');
      loadPortfolios({ silent: true });
    }
  };

  if (!authLoaded) return <div style={{ background: theme.bg, minHeight: '100vh' }}/>;

  const isDashboard = cur.screen === 'dashboard';

  const desktopNav = (screen) => {
    replace(screen);
    if (screen === 'dashboard')  setTab('home');
    if (screen === 'calculator') setTab('calc');
  };

  const mobileNav = (nextTab) => {
    setTab(nextTab);
    if (nextTab === 'home')     replace('dashboard');
    if (nextTab === 'calc')     replace('calculator');
  };

  const openAddTicker = () => {
    setTab('home');
    navigate('add');
  };

  const openMethodology = (asset = null) => {
    setMethodologyAsset(asset || holdings[0] || null);
    setMethodologyOpen(true);
  };

  let body;
  if (cur.screen === 'dashboard') body = <Dashboard theme={theme} navigate={navigate} user={userLabel} isSignedIn={signedIn} holdings={holdings} loading={loading || dataLoading} onRefresh={fetchMetrics} lastRefreshed={lastRefreshed} fgIndex={fgIndex} onDelete={removeTicker} onMethodology={openMethodology} plaidConfigured={signedIn && plaidConfigured} plaidEnv={plaidEnv} activePortfolioName={activePortfolio?.name || null} registerPlaidOpen={fn => { dashboardPlaidOpen.current = fn; }}/>;
  else if (cur.screen === 'detail') body = <AssetDetail theme={theme} sym={cur.arg} onBack={back} holdings={holdings} fgIndex={fgIndex} onDelete={removeTicker} onMethodology={openMethodology}/>;
  else if (cur.screen === 'add') body = <AddTicker theme={theme} onBack={back} selectedTickers={selectedTickers} onToggle={toggleTicker}/>;
  else if (cur.screen === 'settings') body = <SettingsScreen theme={theme} onBack={back} user={userLabel}/>;
  else if (cur.screen === 'calculator') body = <CalculatorScreen theme={theme} holdings={holdings}/>;
  else body = <Dashboard theme={theme} navigate={navigate} user={userLabel} isSignedIn={signedIn} holdings={holdings} loading={loading || dataLoading} onRefresh={fetchMetrics} lastRefreshed={lastRefreshed} fgIndex={fgIndex} onDelete={removeTicker} onMethodology={openMethodology} plaidConfigured={signedIn && plaidConfigured} plaidEnv={plaidEnv} activePortfolioName={activePortfolio?.name || null} registerPlaidOpen={fn => { dashboardPlaidOpen.current = fn; }}/>;

  return (
    <>
      <Head>
        <title>DCA Anchor</title>
        <meta name="description" content="Transparent DCA analytics — not advice"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      <style jsx global>{`
        :root { --font-ui: "Geist", system-ui, sans-serif; --font-mono: "Geist Mono", ui-monospace, monospace; }
        html, body { margin: 0; padding: 0; background: ${theme.bg}; font-family: var(--font-ui); -webkit-font-smoothing: antialiased; min-height: 100%; overscroll-behavior: none; -webkit-tap-highlight-color: transparent; overflow-x: hidden; }
        * { box-sizing: border-box; }
        @keyframes staxFade { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }
        button { font-family: inherit; }
        input { font-family: inherit; }
        select { font-family: inherit; }
        ::-webkit-scrollbar { width: 0; }

        /* ── Responsive shell ── */
        .dca-root { background: ${theme.bg}; color: ${theme.text}; min-height: 100vh; }

        /* Mobile defaults */
        .dca-sidebar   { display: none; }
        .dca-dsk-hdr   { display: none; }
        .dca-main      { height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        .dca-mob-nav   { flex-shrink: 0; z-index: 100; display: block; }
        .dca-mob-shell { max-width: 430px; margin: 0 auto; flex: 1; min-height: 0; position: relative; overflow: hidden; }
        .dca-mob-inner { position: absolute; inset: 0; overflow-y: auto; padding-top: 8px; padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 8px); }
        .dca-dsk-only  { display: none; }
        .dca-mob-only  { display: block; }

        /* Holdings table columns. The mobile shell is capped at 430px whatever
           the viewport, so the rating column only widens once the desktop
           layout is actually in play and the row has room for it. */
        .dca-hold-grid { display: grid; gap: 5px; min-width: 0;
                         grid-template-columns: minmax(116px,1.25fr) minmax(88px,.75fr) 34px minmax(76px,.7fr); }
        .dca-hold-grid > :nth-child(4), .dca-hold-grid > :nth-child(5) { display: none !important; }
        .dca-hold-grid > :nth-child(6) { min-width: 0; overflow-wrap: normal; word-break: keep-all; }

        @media (max-width: 390px) {
          .dca-hold-grid { grid-template-columns: minmax(118px,1fr) minmax(84px,.72fr) minmax(74px,.62fr); gap: 4px; }
          .dca-hold-grid > :nth-child(3) { display: none !important; }
        }

        @media (min-width: 430px) and (max-width: 1099px) {
          .dca-hold-grid { grid-template-columns: minmax(140px,1.35fr) minmax(96px,.8fr) 34px minmax(80px,.7fr); }
        }

        /* Desktop ≥ 1100px. Below this the two-column split (220px sidebar +
           60/40 columns) leaves the holdings grid less room than its own fixed
           columns need, so mobile owns everything under 1100. */
        @media (min-width: 1100px) {
          .dca-root       { display: flex; height: 100vh; overflow: hidden; }
          .dca-sidebar    { display: flex; flex-direction: column; width: 220px; flex-shrink: 0;
                            height: 100vh; overflow-y: auto; position: sticky; top: 0;
                            background: #0B1020; border-right: 1px solid rgba(255,255,255,.08); }
          .dca-main       { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100vh; overflow: hidden; }
          .dca-dsk-hdr    { display: flex; flex-shrink: 0; }
          .dca-mob-nav    { display: none !important; }
          .dca-mob-shell  { max-width: none; margin: 0; min-height: 0; height: auto; flex: 1; overflow: hidden; position: relative; }
          .dca-mob-inner  { position: absolute; inset: 0; overflow-y: auto; padding-bottom: 0; }
          .dca-dsk-only   { display: block; }
          .dca-mob-only   { display: none; }

          /* Signin: centered on desktop */
          .dca-signin-wrap { display: flex; flex: 1; align-items: center; justify-content: center; }
          .dca-signin-box  { width: 430px; max-height: 90vh; overflow-y: auto; }

          /* Dashboard two-column */
          .dca-dash-grid  { display: flex; flex: 1; overflow: hidden; height: 100%; }
          .dca-dash-left  { flex: 0 0 60%; overflow-y: auto; border-right: 1px solid rgba(255,255,255,.06); padding: 24px 20px 40px 28px; }
          .dca-dash-right { flex: 0 0 40%; overflow-y: auto; padding: 24px 28px 40px 20px; display: flex; flex-direction: column; gap: 16px; }

          .dca-hold-grid  { grid-template-columns: minmax(160px,1.4fr) minmax(92px,.8fr) 34px 38px 54px minmax(88px,.7fr); }
          .dca-hold-grid > :nth-child(3), .dca-hold-grid > :nth-child(4), .dca-hold-grid > :nth-child(5) { display: block !important; }

          /* Secondary screens (calc, settings, etc.) centered */
          .dca-panel      { height: 100%; overflow-y: auto; }
          .dca-panel-inner { max-width: 680px; margin: 0 auto; }
        }

        @media (max-width: 1099px) {
          .dca-dash-grid { display: flex; flex-direction: column; flex: 1; min-height: 0; }
          .dca-dash-left { padding: 0; border: none; flex: 1; min-height: 0; overflow-y: auto; }
          .dca-dash-right { padding: 0; border: none; }
          .dca-signin-wrap, .dca-signin-box { display: contents; }
        }
      `}</style>

      <div className="dca-root">
        {/* ── Sidebar (desktop only) ── */}
        <aside className="dca-sidebar">
          <DesktopSidebar theme={theme} activeScreen={cur.screen} onNav={desktopNav} user={signedIn ? userLabel : null}/>
        </aside>

        {/* ── Main area ── */}
        <div className="dca-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          <SyncBanner theme={theme} state={syncState} onRetry={() => loadPortfolios()}/>

          {isDashboard && (
            <PortfolioBar
              theme={theme}
              portfolios={portfolios}
              activeId={activePortfolio?.id ?? null}
              onSelect={selectActive}
              onCreate={createPortfolio}
              onRename={renamePortfolio}
              onDelete={deletePortfolio}
              isSignedIn={signedIn}
            />
          )}

          <div className="dca-dsk-hdr">
            <DesktopHeader theme={theme} user={userLabel} isSignedIn={signedIn} onAdd={openAddTicker} fgIndex={fgIndex} plaidConfigured={signedIn && plaidConfigured} onImport={() => { setTab('home'); replace('dashboard'); requestAnimationFrame(() => dashboardPlaidOpen.current?.()); }}/>
          </div>

          {/* ── Content ── */}
          {isDashboard ? (
            /* Dashboard: two-column grid on desktop, single column on mobile */
            <div className="dca-dash-grid">
              {/* Left: holdings table */}
              <div className="dca-dash-left">
                <div className="dca-mob-only" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}>
                  {body}
                </div>
                <div className="dca-dsk-only">
                  <NotifBar theme={theme} holdings={holdings}/>
                  <div style={{ marginTop: 16, marginBottom: 16 }}>
                    <div style={{ marginBottom: 14 }}>
                      <ContributionPlanCard theme={theme} holdings={holdings} accountName={activePortfolio?.name || null} onPick={sym => navigate('detail', sym)}/>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Holdings — sorted by DCA setup</div>
                    <HoldingsTable theme={theme} holdings={holdings} loading={loading || dataLoading} onPick={sym => navigate('detail', sym)} onRefresh={fetchMetrics} lastRefreshed={lastRefreshed} onDelete={removeTicker} onMethodology={openMethodology}/>
                    {holdings.length === 0 && !(loading || dataLoading) && (
                      <EmptyPortfolioCta
                        theme={theme}
                        compact
                        plaidConfigured={plaidConfigured}
                        activePortfolioName={activePortfolio?.name || null}
                        onConnect={() => dashboardPlaidOpen.current?.()}
                        onAdd={openAddTicker}
                      />
                    )}
                  </div>
                </div>
              </div>
              {/* Right: charts (desktop only) */}
              <div className="dca-dash-right dca-dsk-only">
                <DesktopDashboardRight theme={theme} holdings={holdings} loading={loading || dataLoading} navigate={navigate} fgIndex={fgIndex} onMethodology={openMethodology}/>
              </div>
            </div>
          ) : (
            /* All other screens */
            <div className="dca-mob-shell">
              <div className="dca-mob-inner">
                <div className="dca-panel">
                  <div className="dca-panel-inner">
                    {body}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mobile bottom nav */}
          <div className="dca-mob-nav">
            <BottomNav theme={theme} tab={tab} onTab={mobileNav} onAdd={openAddTicker}/>
          </div>
        </div>
      </div>

      <MethodologyDrawer
        theme={theme}
        open={methodologyOpen}
        holding={methodologyAsset}
        onClose={() => setMethodologyOpen(false)}
      />
    </>
  );
}
