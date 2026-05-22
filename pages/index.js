import { useState, useEffect, useRef, useMemo } from 'react';
import Head from 'next/head';
import { Ic } from '../components/icons';
import {
  TICKER_COLORS, RATING_STYLES, RATING_LABELS, TAG_STYLES, THEMES, GLOSSARY,
  getColor, fgColor, fgLabel, rsiSignalColor, shade, fmtPrice, computeScore,
} from '../components/tokens';

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
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: large ? '6px 12px' : '3px 9px',
      borderRadius: 999, background: s.bg, border: `1px solid ${s.bd}`,
      color: s.fg, fontWeight: 700, fontSize: large ? 12 : 10.5, letterSpacing: '.06em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.fg, boxShadow: `0 0 8px ${s.fg}` }}/>
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

  return (
    <div style={{ position: 'relative', paddingLeft: 22, paddingBottom: 28 }}>
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

function StaxHeader({ theme, onAdd, onBell, onGlossary, notifs, user }) {
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
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em', color: theme.text }}>DCA Tracker</div>
          <div style={{ fontSize: 9.5, color: theme.text3, marginTop: -1, letterSpacing: '.06em' }}>{user || 'GUEST'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconBtn theme={theme} onClick={onGlossary}>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.text2, fontFamily: 'var(--font-mono)' }}>?</span>
        </IconBtn>
        <IconBtn theme={theme} onClick={onBell} badge={notifs}>{Ic.bell(18, theme.text2)}</IconBtn>
        <button onClick={onAdd} style={{
          height: 34, padding: '0 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
          color: '#fff', fontSize: 12.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: `0 6px 16px ${theme.brand}55, 0 1px 0 rgba(255,255,255,.3) inset`,
        }}>{Ic.plus(14, '#fff')} Add</button>
      </div>
    </div>
  );
}

function IconBtn({ theme, children, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`,
      background: theme.pillBg, color: theme.text, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      {children}
      {badge ? <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 99, background: '#EF4444', boxShadow: '0 0 0 2px ' + theme.bg }}/> : null}
    </button>
  );
}

function BottomNav({ theme, tab, setTab, onAdd }) {
  const tabs = [
    { id: 'home',     label: 'Home',     icon: Ic.home },
    { id: 'calc',     label: 'Calc',     icon: Ic.calc },
    { id: 'glossary', label: 'Glossary', icon: Ic.book },
  ];
  return (
    <div style={{
      position: 'absolute', left: 12, right: 12, bottom: 14, height: 56,
      borderRadius: 18, padding: '0 4px',
      background: 'rgba(20,27,48,.82)',
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      border: `1px solid ${theme.line2}`,
      boxShadow: '0 12px 30px rgba(0,0,0,.25), 0 1px 0 rgba(255,255,255,.1) inset',
      display: 'flex', alignItems: 'center',
    }}>
      {tabs.slice(0, 2).map(t => <NavBtn key={t.id} t={t} tab={tab} setTab={setTab} theme={theme}/>)}
      <button onClick={onAdd} style={{
        width: 46, height: 46, borderRadius: 14, margin: '0 2px',
        background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
        border: 'none', color: '#fff', cursor: 'pointer', flex: '0 0 auto',
        boxShadow: `0 6px 16px ${theme.brand}88, 0 1px 0 rgba(255,255,255,.3) inset`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{Ic.plus(20, '#fff')}</button>
      {tabs.slice(2).map(t => <NavBtn key={t.id} t={t} tab={tab} setTab={setTab} theme={theme}/>)}
    </div>
  );
}

function NavBtn({ t, tab, setTab, theme }) {
  const on = tab === t.id;
  return (
    <button onClick={() => setTab(t.id)} style={{
      flex: 1, height: 48, borderRadius: 14, border: 'none', background: 'transparent', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
      color: on ? theme.brand : theme.text3,
    }}>
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
      if (h.rating === 'BUY' || h.rating === 'STRONG BUY') msgs.push({ c: '#10B981', msg: `${h.sym} — ${RATING_LABELS[h.rating]} signal today` });
    });
    if (!msgs.length) msgs.push({ c: theme.brand, msg: 'DCA Tracker — transparent analytics, not advice' });
    return msgs.slice(0, 4);
  }, [holdings]);

  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(v => (v + 1) % items.length), 3200);
    return () => clearInterval(t);
  }, [items.length]);

  const cur = items[i];
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

function TransparencyBar({ theme, onLearn }) {
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
        <a onClick={onLearn} style={{ color: theme.brand, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Glossary →</a>
      </div>
    </div>
  );
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

function SignIn({ theme, onEnter }) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'error'

  const clean = username.trim().toLowerCase();
  const valid = /^[a-z0-9_-]{2,20}$/.test(clean);

  const handleGo = async () => {
    if (!valid || status === 'loading') return;
    setStatus('loading');
    try {
      const r = await fetch(`/api/sync?username=${encodeURIComponent(clean)}`);
      if (r.ok) {
        const d = await r.json();
        onEnter(clean, d.tickers || []);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: theme.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'absolute', top: -80, left: -60, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${theme.brand}55, transparent 70%)`, filter: 'blur(2px)', pointerEvents: 'none' }}/>
      <div style={{ position: 'absolute', top: 120, right: -70, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${theme.brand2}55, transparent 70%)`, filter: 'blur(2px)', pointerEvents: 'none' }}/>

      <div style={{ position: 'relative', padding: '48px 28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 14px 32px ${theme.brand}66, 0 1px 0 rgba(255,255,255,.3) inset`,
        }}>{Ic.logo(34, '#fff')}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: theme.text, letterSpacing: '-.03em', marginTop: 14 }}>DCA Tracker</div>
        <div style={{ fontSize: 12.5, color: theme.text2, marginTop: 4, textAlign: 'center', maxWidth: 260, lineHeight: 1.45 }}>
          Pick a username — your watchlist syncs to any device.
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, padding: '32px 22px 0', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', color: theme.text3, marginBottom: 6, paddingLeft: 2 }}>USERNAME</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px 2px 14px',
            background: theme.card, border: `1.5px solid ${status === 'error' ? '#EF4444' : valid ? theme.brand + '88' : theme.line2}`, borderRadius: 14, transition: 'border .2s',
          }}>
            <span style={{ color: theme.text3, fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>@</span>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')); if (status) setStatus(null); }}
              onKeyDown={e => e.key === 'Enter' && handleGo()}
              placeholder="your-name"
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="none"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: theme.text, fontSize: 15, padding: '14px 0', fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.02em' }}
            />
            <button onClick={handleGo} disabled={!valid || status === 'loading'}
              style={{
                height: 38, padding: '0 16px', margin: 4, borderRadius: 10, border: 'none',
                background: valid && status !== 'loading' ? `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})` : theme.line,
                color: valid && status !== 'loading' ? '#fff' : theme.text3, fontSize: 12, fontWeight: 700,
                cursor: valid && status !== 'loading' ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                boxShadow: valid && status !== 'loading' ? `0 6px 14px ${theme.brand}55` : 'none', transition: 'all .15s',
                opacity: status === 'loading' ? 0.65 : 1,
              }}>{status === 'loading' ? '…' : 'Go →'}</button>
          </div>
          {status === 'error' && <div style={{ marginTop: 6, fontSize: 11.5, color: '#EF4444', paddingLeft: 2 }}>Something went wrong — try again.</div>}
          {!status && username.length > 0 && !valid && <div style={{ marginTop: 6, fontSize: 11.5, color: theme.text3, paddingLeft: 2 }}>2–20 chars · letters, numbers, _ or -</div>}
          <div style={{ marginTop: 8, fontSize: 11, color: theme.text3, paddingLeft: 2, lineHeight: 1.5 }}>
            New username? Claimed instantly. Returning? Your watchlist loads automatically.
          </div>
          <div style={{ marginTop: 6, fontSize: 10.5, color: theme.text3, paddingLeft: 2, lineHeight: 1.5, fontStyle: 'italic' }}>
            No email. No password. No brokerage connection.
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <button onClick={() => onEnter('demo', [])} style={{
          height: 48, borderRadius: 14, cursor: 'pointer', background: theme.card, color: theme.text,
          border: `1.5px solid ${theme.line2}`, fontWeight: 700, fontSize: 13.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 15 }}>✨</span> View Demo Portfolio
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: theme.brand, background: theme.brand + '22', padding: '2px 6px', borderRadius: 5 }}>DEMO</span>
        </button>

        <div style={{ fontSize: 10, color: theme.text3, textAlign: 'center', lineHeight: 1.5, padding: '4px 8px 16px' }}>
          Public watchlist — anyone with your username can view it. Public market data only. <b style={{ color: theme.text2 }}>Nothing here is financial advice.</b>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ theme, navigate, user, holdings, loading, onRefresh, lastRefreshed }) {
  const [focused, setFocused] = useState(null);
  const top = holdings[0];
  const chartData = holdings.slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StaxHeader theme={theme} user={user} onAdd={() => navigate('add')} onBell={() => {}} onGlossary={() => { window.location.href = '/glossary'; }} notifs={holdings.some(h => h.rsi != null && h.rsi < 30)}/>
      <NotifBar theme={theme} holdings={holdings}/>
      <TransparencyBar theme={theme} onLearn={() => { window.location.href = '/glossary'; }}/>

      {top && (
        <div style={{ padding: '0 16px' }}>
          <TopPickCard theme={theme} holding={top} onOpen={() => navigate('detail', top.sym)}/>
        </div>
      )}

      {chartData.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <Card theme={theme}>
            <SectionHead theme={theme} title="Scores" sub="0–10 composite signal"/>
            <ScoresChart data={chartData} theme={theme} focused={focused} onPick={s => setFocused(focused === s ? null : s)}/>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${theme.line}` }}>
              {chartData.slice(0, 6).map(d => {
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

      {chartData.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <Card theme={theme}>
            <SectionHead theme={theme} title="RSI" sub="14-day · oversold ≤ 30 · overbought ≥ 70"/>
            <RSIChart data={chartData} theme={theme}/>
          </Card>
        </div>
      )}

      <HoldingsTable theme={theme} holdings={holdings} loading={loading} onPick={sym => navigate('detail', sym)} onRefresh={onRefresh} lastRefreshed={lastRefreshed}/>

      {holdings.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.text3 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>No tickers selected</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Tap Add to select tickers to track</div>
        </div>
      )}

      <div style={{ height: 80 }}/>
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

function TopPickCard({ theme, holding: h, onOpen }) {
  const c = getColor(h.sym);
  return (
    <Card theme={theme} tint={c} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={onOpen}>
      <div style={{ padding: '14px 16px 12px', background: `linear-gradient(135deg, ${c}1A, transparent 60%)`, borderBottom: `1px solid ${theme.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {Ic.trophy(16, '#FBBF24')}
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: theme.text2 }}>WATCHLIST LEADER</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: theme.text3, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 4 }}>
            {Ic.spark(11, '#FBBF24')} live data
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <TickerDot sym={h.sym} size={42} theme={theme}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)', letterSpacing: '-.02em' }}>{h.sym}</div>
              <div style={{ fontSize: 11, color: theme.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 11, color: theme.text2 }}>
              <span><span style={{ color: theme.text3 }}>SCORE </span><b style={{ color: c }}>{h.score}</b></span>
              {h.rsi != null && <span><span style={{ color: theme.text3 }}>RSI </span><b style={{ color: theme.text }}>{h.rsi}</b></span>}
              <span><span style={{ color: theme.text3 }}>$ </span><b style={{ color: theme.text }}>{fmtPrice(h.price)}</b></span>
            </div>
          </div>
          <RatingPill rating={h.rating} large/>
        </div>
      </div>
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,.14)', border: '1px solid rgba(16,185,129,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>💡</div>
        <div style={{ flex: 1, fontSize: 12, color: theme.text2, lineHeight: 1.4 }}>
          {h.why || `Score ${h.score}/10 — ${h.rating === 'BUY' || h.rating === 'STRONG BUY' ? 'market conditions currently score well for this DCA plan' : 'monitor for better entry'}`}{' '}
          <a href="/methodology" style={{ color: '#5BC8FF', fontSize: 11, textDecoration: 'none', whiteSpace: 'nowrap' }}>Methodology →</a>
        </div>
        {Ic.chevR(16, theme.text3)}
      </div>
    </Card>
  );
}

function HoldingsTable({ theme, holdings, loading, onPick, onRefresh, lastRefreshed }) {
  const minsAgo = lastRefreshed ? Math.floor((Date.now() - lastRefreshed) / 60000) : null;
  return (
    <div style={{ padding: '0 16px' }}>
      <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: theme.text }}>Holdings</div>
            <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 1 }}>{holdings.length} tickers · sorted by score</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {minsAgo != null && <span style={{ fontSize: 10, color: theme.text3 }}>Updated {minsAgo === 0 ? 'just now' : `${minsAgo}m ago`}</span>}
            <button onClick={onRefresh} style={{ fontSize: 11, fontWeight: 600, color: theme.text2, background: theme.pillBg, border: `1px solid ${theme.line}`, padding: '5px 9px', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              {Ic.refresh(12, theme.text2)} Refresh
            </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 62px 44px 30px 30px 1fr', gap: 6, padding: '8px 16px', background: theme.bg2, borderBottom: `1px solid ${theme.line}`, borderTop: `1px solid ${theme.line}` }}>
          {['ASSET', 'RATING', 'SCORE', '72MA', '200MA', 'PRICE / DATA'].map((h, i) => (
            <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', color: theme.text3, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
          ))}
        </div>
        {loading && holdings.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: theme.text3, fontSize: 12 }}>Loading data…</div>
        )}
        {holdings.map((h, i) => (
          <HoldingRow key={h.sym} h={h} theme={theme} last={i === holdings.length - 1} onClick={() => onPick(h.sym)}/>
        ))}
      </Card>
    </div>
  );
}

function HoldingRow({ h, theme, last, onClick }) {
  const c = getColor(h.sym);
  return (
    <div onClick={onClick} style={{
      display: 'grid', gridTemplateColumns: '1.6fr 62px 44px 30px 30px 1fr', gap: 6, alignItems: 'center',
      padding: '11px 14px', borderBottom: last ? 'none' : `1px solid ${theme.line}`,
      cursor: 'pointer',
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
      <div><RatingPill rating={h.rating || 'HOLD'}/></div>
      <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: c }}>{h.score}</div>
      <div style={{ textAlign: 'right' }}><MAPill above={h.aboveMa72}/></div>
      <div style={{ textAlign: 'right' }}><MAPill above={h.aboveMa200}/></div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: theme.text }}>
          {h.price ? `$${fmtPrice(h.price)}` : 'N/A'}
        </div>
        {h.chg != null && (
          <div style={{ fontSize: 10, color: h.chg >= 0 ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
            {h.chg >= 0 ? '▲' : '▼'} {Math.abs(h.chg).toFixed(2)}%
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          {h.fpe != null && h.tag !== 'CRYPTO' && h.tag !== 'HEDGE' && (
            <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: h.fpe < 15 ? '#10B981' : h.fpe <= 35 ? '#F59E0B' : '#EF4444' }}>
              PE {parseFloat(h.fpe).toFixed(1)}
            </span>
          )}
          <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: fgColor(h.fg) }}>
            FG {h.fg ?? '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Asset Detail ─────────────────────────────────────────────────────────────

function AssetDetail({ theme, sym, onBack, holdings, fgIndex }) {
  const h = holdings.find(x => x.sym === sym) || { sym, name: sym, price: null, rsi: null, fpe: null, fg: fgIndex, score: 5, rating: 'HOLD' };
  const c = getColor(sym);

  const spark = useMemo(() => {
    const seed = sym.charCodeAt(0);
    const n = 40; const pts = []; let v = 50;
    for (let i = 0; i < n; i++) { v += Math.sin(i * 0.5 + seed) * 4 + (Math.random() - .5) * 3; pts.push(Math.max(10, Math.min(95, v))); }
    return pts;
  }, [sym]);

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
        <RatingPill rating={h.rating || 'HOLD'} large/>
      </div>

      <div style={{ padding: '0 16px' }}>
        <Card theme={theme} tint={c}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, fontFamily: 'var(--font-mono)', letterSpacing: '-.03em', lineHeight: 1 }}>
              {h.price != null ? `$${fmtPrice(h.price)}` : '—'}
            </div>
            {h.chg != null && (
              <div style={{ fontSize: 13, color: h.chg >= 0 ? '#10B981' : '#EF4444', fontFamily: 'var(--font-mono)', fontWeight: 600, marginBottom: 3 }}>
                {h.chg >= 0 ? '▲' : '▼'} {Math.abs(h.chg).toFixed(2)}%
              </div>
            )}
          </div>
          <Sparkline pts={spark} color={c} theme={theme}/>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {['1D', '1W', '1M', '3M', '1Y', '5Y'].map((t, i) => (
              <div key={t} style={{ flex: 1, textAlign: 'center', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '5px 0', borderRadius: 6, background: i === 2 ? c + '24' : 'transparent', color: i === 2 ? c : theme.text3, border: i === 2 ? `1px solid ${c}50` : '1px solid transparent' }}>{t}</div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Stat theme={theme} label="Score" value={h.score} tint={c} maxValue={10} bar/>
        <Stat theme={theme} label="RSI (14)" value={h.rsi ?? '—'} tint={rsiSignalColor(h.rsi, theme)} maxValue={100} bar={h.rsi != null} zones/>
        <Stat theme={theme} label="Fear & Greed" value={h.fg ?? fgIndex ?? '—'} tint={fgColor(h.fg ?? fgIndex)} maxValue={100} bar={h.fg != null || fgIndex != null}/>
        <Stat theme={theme} label="Forward P/E"
          value={h.fpe != null ? parseFloat(h.fpe).toFixed(1) : 'n/a'}
          tint={h.fpe == null ? theme.text3 : (h.fpe > 40 ? '#EF4444' : h.fpe > 25 ? '#F59E0B' : '#10B981')}
          maxValue={60} bar={h.fpe != null}/>
      </div>

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
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 6 }}>Why this rating?</div>
          <div style={{ fontSize: 12, color: theme.text2, lineHeight: 1.5 }}>
            {h.why || `Based on composite score of ${h.score}/10 from RSI position, market sentiment, and valuation metrics.`}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${theme.line}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              ['Score', h.score],
              ['RSI', h.rsi ?? 'n/a'],
              ['F&G', h.fg ?? fgIndex ?? 'n/a'],
              ['F/PE', h.fpe != null ? parseFloat(h.fpe).toFixed(1) : 'n/a'],
              ['Tag', h.tag || 'STOCK'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '5px 9px', borderRadius: 8, background: theme.bg2, border: `1px solid ${theme.line}`, fontSize: 10.5 }}>
                <span style={{ color: theme.text3 }}>{k} </span><b style={{ color: theme.text, fontFamily: 'var(--font-mono)' }}>{v}</b>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', gap: 10 }}>
        <button style={{ flex: 1, height: 46, borderRadius: 12, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`, color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: `0 8px 20px ${theme.brand}55` }}>Log a Buy</button>
        <button style={{ flex: 1, height: 46, borderRadius: 12, cursor: 'pointer', border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text, fontWeight: 600, fontSize: 13 }}>Set Alert</button>
      </div>
      <div style={{ height: 80 }}/>
    </div>
  );
}

// ─── Add Ticker ───────────────────────────────────────────────────────────────

function AddTicker({ theme, onBack, selectedTickers, onToggle }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'added' | 'notfound' | 'exists'
  const [lastSym, setLastSym] = useState('');

  const handleAdd = async () => {
    const sym = q.trim().toUpperCase();
    if (!sym) return;
    if (selectedTickers.includes(sym)) {
      setLastSym(sym);
      setStatus('exists');
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
      <div style={{ height: 80 }}/>
    </div>
  );
}

// ─── Glossary ─────────────────────────────────────────────────────────────────

function GlossaryScreen({ theme, onBack }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(GLOSSARY[0].key);
  const filtered = q ? GLOSSARY.filter(g => (g.term + g.def + g.key).toLowerCase().includes(q.toLowerCase())) : GLOSSARY;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ic.chevL(18, theme.text)}</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, letterSpacing: '-.02em' }}>Glossary</div>
          <div style={{ fontSize: 10.5, color: theme.text3, marginTop: 1 }}>plain-English definitions of every metric</div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: theme.card, border: `1px solid ${theme.line2}`, borderRadius: 12 }}>
          {Ic.search(16, theme.text3)}
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search RSI, Fear & Greed, F/PE…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: theme.text, fontSize: 13 }}/>
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(g => {
          const isOpen = open === g.key;
          return (
            <Card key={g.key} theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
              <button onClick={() => setOpen(isOpen ? null : g.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ minWidth: 46, padding: '4px 8px', borderRadius: 7, background: theme.brand + '1F', color: theme.brand, border: `1px solid ${theme.brand}40`, fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 11, textAlign: 'center' }}>{g.key}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: theme.text }}>{g.term}</div>
                  <div style={{ fontSize: 10, color: theme.text3, marginTop: 1, letterSpacing: '.06em', fontWeight: 600 }}>{g.cat.toUpperCase()}</div>
                </div>
                <div style={{ transform: `rotate(${isOpen ? 90 : 0}deg)`, transition: 'transform .2s' }}>{Ic.chevR(16, theme.text3)}</div>
              </button>
              {isOpen && (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12.5, color: theme.text2, lineHeight: 1.55 }}>{g.def}</div>
                  <div style={{ padding: '9px 11px', borderRadius: 10, background: theme.bg2, border: `1px solid ${theme.line}`, fontSize: 11.5, color: theme.text2, lineHeight: 1.5 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: theme.text3, letterSpacing: '.08em', marginRight: 6 }}>EXAMPLE</span>{g.example}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {filtered.length === 0 && <div style={{ padding: '40px 12px', textAlign: 'center', color: theme.text3, fontSize: 12 }}>No terms match &quot;{q}&quot;</div>}
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ padding: '12px 14px', borderRadius: 12, background: theme.bg2, border: `1px dashed ${theme.line2}`, fontSize: 11, color: theme.text2, lineHeight: 1.5 }}>
          <b style={{ color: theme.text }}>Source transparency.</b> Price + RSI from Yahoo Finance, F&G from CNN/Alternative.me, Forward P/E from analyst consensus. Composite Score is an open formula — see Settings → Score weights.
        </div>
      </div>
      <div style={{ height: 80 }}/>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsScreen({ theme, onBack, onGlossary, onSignOut, user }) {
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
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>{user || 'Guest'}</div>
            <div style={{ fontSize: 11, color: theme.text3, marginTop: 1 }}>DCA Tracker</div>
          </div>
        </Card>
      </div>

      {[
        { title: 'PORTFOLIO', items: [{ label: 'DCA Frequency', val: 'Weekly', icon: '🔁' }, { label: 'Buy Day', val: 'Mondays', icon: '📅' }, { label: 'Target Allocation', val: 'Balanced', icon: '⚖️' }] },
        { title: 'SIGNALS', items: [{ label: 'RSI strategy', val: '5/95 extremes', icon: '⚙️' }, { label: 'Alert thresholds', val: 'RSI 5/95', icon: '🎯' }, { label: 'Data refresh', val: 'Every 60m', icon: '🔄' }] },
        { title: 'LEARN & TRANSPARENCY', items: [{ label: 'Glossary of terms', val: `${GLOSSARY.length} entries`, icon: '📖', onClick: onGlossary }, { label: 'Score methodology', val: 'Open formula', icon: '🧮' }, { label: 'Data sources', val: 'Yahoo Finance, Alt.me', icon: '🔗' }] },
      ].map(group => (
        <div key={group.title} style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: theme.text3, padding: '4px 4px 8px' }}>{group.title}</div>
          <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
            {group.items.map((it, i) => (
              <div key={it.label} onClick={it.onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px', borderBottom: i === group.items.length - 1 ? 'none' : `1px solid ${theme.line}`, cursor: it.onClick ? 'pointer' : 'default' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: theme.bg2, border: `1px solid ${theme.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{it.icon}</div>
                <div style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: 500 }}>{it.label}</div>
                <span style={{ fontSize: 12, color: theme.text2, fontFamily: 'var(--font-mono)' }}>{it.val}</span>
                {Ic.chevR(14, theme.text3)}
              </div>
            ))}
          </Card>
        </div>
      ))}

      <div style={{ padding: '8px 16px' }}>
        <button onClick={onSignOut} style={{ width: '100%', height: 44, borderRadius: 12, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: '#EF4444', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Log out</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 10, color: theme.text3, padding: '4px 16px 16px', fontFamily: 'var(--font-mono)' }}>DCA Tracker 3.0.0</div>
      <div style={{ height: 80 }}/>
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

      <div style={{ height: 80 }}/>
    </div>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────

function DesktopSidebar({ theme, activeScreen, onNav, user }) {
  const items = [
    { id: 'home',     label: 'Home',       icon: Ic.home, screen: 'dashboard' },
    { id: 'calc',     label: 'Calculator', icon: Ic.calc, screen: 'calculator' },
    { id: 'glossary', label: 'Glossary',   icon: Ic.book, screen: 'glossary' },
  ];
  return (
    <div style={{
      width: 200, background: '#0B1020',
      borderRight: `1px solid rgba(255,255,255,.08)`,
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
      flex: '0 0 200px',
    }}>
      {/* Branding */}
      <div style={{ padding: '22px 16px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid rgba(255,255,255,.06)` }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${theme.brand}55`,
        }}>{Ic.logo(16, '#fff')}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: theme.text, letterSpacing: '-.02em' }}>DCA Tracker</div>
      </div>
      {/* Nav items */}
      <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const on = activeScreen === item.screen || (item.screen === 'dashboard' && activeScreen === 'detail');
          return (
            <button key={item.id} onClick={() => onNav(item.screen)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: on ? theme.brand + '18' : 'transparent',
              color: on ? theme.brand : theme.text3,
              fontWeight: on ? 600 : 500, fontSize: 13,
              borderLeft: on ? `2px solid ${theme.brand}` : '2px solid transparent',
              transition: 'all .15s', textAlign: 'left',
            }}>
              {item.icon(16, on ? theme.brand : theme.text3)}
              {item.label}
            </button>
          );
        })}
      </div>
      {/* User */}
      {user && (
        <div style={{ padding: '12px 16px 8px', borderTop: `1px solid rgba(255,255,255,.06)`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: theme.brand + '28', color: theme.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
            {(user || 'G').slice(0, 1).toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: theme.text2, fontWeight: 500, fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user}</div>
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

function DesktopHeader({ theme, user, onAdd }) {
  return (
    <div style={{
      padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: `1px solid rgba(255,255,255,.06)`, background: '#0B1020',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, letterSpacing: '-.01em' }}>Dashboard</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user && <div style={{ fontSize: 12, color: theme.text3, fontFamily: 'var(--font-mono)', background: theme.bg2, padding: '4px 10px', borderRadius: 7, border: `1px solid ${theme.line}` }}>@{user}</div>}
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

function DesktopDashboardRight({ theme, holdings, loading, navigate, fgIndex }) {
  const [focused, setFocused] = useState(null);
  const top = holdings[0];
  const chartData = holdings.slice(0, 10);
  return (
    <>
      {top && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Watchlist Leader</div>
          <TopPickCard theme={theme} holding={top} onOpen={() => navigate('detail', top.sym)}/>
        </div>
      )}
      {chartData.length > 0 && (
        <Card theme={theme}>
          <SectionHead theme={theme} title="Scores" sub="0–10 composite signal"/>
          <ScoresChart data={chartData} theme={theme} focused={focused} onPick={s => setFocused(focused === s ? null : s)}/>
        </Card>
      )}
      {chartData.length > 0 && (
        <Card theme={theme}>
          <SectionHead theme={theme} title="RSI" sub="14-day · ≤30 oversold · ≥70 overbought"/>
          <RSIChart data={chartData} theme={theme}/>
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

function DesktopDashboard({ theme, holdings, loading, navigate, onRefresh, fgIndex }) {
  const [focused, setFocused] = useState(null);
  const top = holdings[0];
  const chartData = holdings.slice(0, 10);

  return (
    <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* Left: Holdings table (60%) */}
      <div style={{ flex: '0 0 60%', overflowY: 'auto', borderRight: `1px solid rgba(255,255,255,.06)`, padding: '24px 20px 24px 28px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text3, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 14 }}>Holdings</div>
        <Card theme={theme} style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 62px 44px 30px 30px 1fr', gap: 6, padding: '8px 16px', background: theme.bg2, borderBottom: `1px solid ${theme.line}` }}>
            {['ASSET', 'RATING', 'SCORE', '72MA', '200MA', 'PRICE / DATA'].map((h, i) => (
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
            <SectionHead theme={theme} title="Scores" sub="0–10 composite signal"/>
            <ScoresChart data={chartData} theme={theme} focused={focused} onPick={s => setFocused(focused === s ? null : s)}/>
          </Card>
        )}
        {chartData.length > 0 && (
          <Card theme={theme}>
            <SectionHead theme={theme} title="RSI" sub="14-day · oversold ≤ 30 · overbought ≥ 70"/>
            <RSIChart data={chartData} theme={theme}/>
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
  const crypto = ['BTC', 'ETH', 'SOL', 'HYPE', 'COIN', 'MSTR'];
  const income = ['DIVO'];
  const hedge = ['GLD'];
  if (crypto.includes(sym)) return 'CRYPTO';
  if (income.includes(sym)) return 'INCOME';
  if (hedge.includes(sym)) return 'HEDGE';
  return 'STOCK';
}

export default function Home() {
  const theme = THEMES.dark;
  const [authLoading, setAuthLoading] = useState(true);
  const [stack, setStack] = useState([{ screen: 'signin' }]);
  const [tab, setTab] = useState('home');
  const [user, setUser] = useState(null);
  const [selectedTickers, setSelectedTickers] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});
  const [fgIndex, setFgIndex] = useState(50);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const didMount = useRef(false);

  const cur = stack[stack.length - 1];
  const navigate = (screen, arg) => setStack(s => [...s, { screen, arg }]);
  const back = () => setStack(s => s.length > 1 ? s.slice(0, -1) : s);
  const replace = (screen) => setStack([{ screen }]);

  // Auto-login from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('dca_username');
    if (saved) {
      fetch(`/api/sync?username=${encodeURIComponent(saved)}`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(d => {
          setUser(saved);
          setSelectedTickers(d.tickers || []);
          replace('dashboard');
        })
        .catch(() => { localStorage.removeItem('dca_username'); })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, []);

  const handleEnter = (username, tickers = []) => {
    if (username === 'demo') {
      setUser('DEMO PORTFOLIO');
      setSelectedTickers(['BTC', 'ETH', 'NVDA', 'MSFT', 'AAPL', 'GOOGL', 'TSLA', 'AMZN', 'META', 'SOL', 'AMD']);
    } else {
      localStorage.setItem('dca_username', username);
      setUser(username);
      setSelectedTickers(tickers);
    }
    replace('dashboard');
    setTab('home');
  };

  const handleSignOut = () => {
    localStorage.removeItem('dca_username');
    setUser(null);
    setSelectedTickers([]);
    replace('signin');
    setTab('home');
  };

  // Persist tickers to Supabase whenever the list changes
  useEffect(() => {
    if (!user || user === 'DEMO PORTFOLIO') return;
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, tickers: selectedTickers }),
    }).catch(() => {});
  }, [selectedTickers]);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (cur.screen === 'signin') return;
    if (tab === 'home')     replace('dashboard');
    if (tab === 'calc')     replace('calculator');
    if (tab === 'glossary') replace('glossary');
  }, [tab]);

  // Fetch Fear & Greed index once
  useEffect(() => {
    fetch('/api/feargreed').then(r => r.json()).then(d => { if (d.value != null) setFgIndex(d.value); }).catch(() => {});
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
    return selectedTickers.map(sym => {
      const m = metricsMap[sym] || {};
      const rating = m.rating || 'HOLD';
      const rsi = m.rsi;
      const fpe = m.forwardPE ? parseFloat(m.forwardPE) : null;
      const tag = tagFor(sym);
      const isCrypto = tag === 'CRYPTO';
      const aboveMa72 = m.aboveMa72 ?? null;
      const aboveMa200 = m.aboveMa200 ?? null;
      const score = computeScore(rsi, fgIndex, isCrypto ? null : fpe, rating, isCrypto, aboveMa72, aboveMa200);
      return {
        sym,
        name: m.name || sym,
        price: m.currentPrice || null,
        chg: m.regularMarketChangePercent || null,
        rsi,
        fpe,
        fg: fgIndex,
        rating,
        score,
        tag,
        ma72: m.ma72 || null,
        ma200: m.ma200 || null,
        aboveMa72,
        aboveMa200,
        why: null,
      };
    }).sort((a, b) => b.score - a.score);
  }, [selectedTickers, metricsMap, fgIndex]);

  const toggleTicker = (sym) => {
    setSelectedTickers(prev => prev.includes(sym) ? prev.filter(t => t !== sym) : [...prev, sym]);
  };

  if (authLoading) return <div style={{ background: theme.bg, minHeight: '100vh' }}/>;

  const onSignin = cur.screen === 'signin';
  const isDashboard = cur.screen === 'dashboard';

  const desktopNav = (screen) => {
    replace(screen);
    if (screen === 'dashboard')  setTab('home');
    if (screen === 'calculator') setTab('calc');
    if (screen === 'glossary')   setTab('glossary');
  };

  let body;
  if (cur.screen === 'signin') body = <SignIn theme={theme} onEnter={handleEnter}/>;
  else if (cur.screen === 'dashboard') body = <Dashboard theme={theme} navigate={navigate} user={user} holdings={holdings} loading={loading} onRefresh={fetchMetrics} lastRefreshed={lastRefreshed}/>;
  else if (cur.screen === 'detail') body = <AssetDetail theme={theme} sym={cur.arg} onBack={back} holdings={holdings} fgIndex={fgIndex}/>;
  else if (cur.screen === 'add') body = <AddTicker theme={theme} onBack={back} selectedTickers={selectedTickers} onToggle={toggleTicker}/>;
  else if (cur.screen === 'glossary') body = <GlossaryScreen theme={theme} onBack={back}/>;
  else if (cur.screen === 'settings') body = <SettingsScreen theme={theme} onBack={back} onGlossary={() => replace('glossary')} onSignOut={handleSignOut} user={user}/>;
  else if (cur.screen === 'calculator') body = <CalculatorScreen theme={theme} holdings={holdings}/>;
  else body = <Dashboard theme={theme} navigate={navigate} user={user} holdings={holdings} loading={loading} onRefresh={fetchMetrics} lastRefreshed={lastRefreshed}/>;

  return (
    <>
      <Head>
        <title>DCA Tracker</title>
        <meta name="description" content="Transparent DCA analytics — not advice"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      <style jsx global>{`
        :root { --font-ui: "Geist", system-ui, sans-serif; --font-mono: "Geist Mono", ui-monospace, monospace; }
        html, body { margin: 0; padding: 0; background: ${theme.bg}; font-family: var(--font-ui); -webkit-font-smoothing: antialiased; height: 100%; }
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
        .dca-mob-nav   { display: block; }
        .dca-mob-shell { max-width: 430px; margin: 0 auto; min-height: 100vh; position: relative; overflow: hidden; }
        .dca-mob-inner { position: absolute; inset: 0; overflow-y: auto; padding-top: 8px; padding-bottom: 8px; }
        .dca-dsk-only  { display: none; }
        .dca-mob-only  { display: block; }

        /* Desktop ≥ 768px */
        @media (min-width: 768px) {
          .dca-root       { display: flex; height: 100vh; overflow: hidden; }
          .dca-sidebar    { display: flex; flex-direction: column; width: 220px; flex-shrink: 0;
                            height: 100vh; overflow-y: auto; position: sticky; top: 0;
                            background: #0B1020; border-right: 1px solid rgba(255,255,255,.08); }
          .dca-main       { flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100vh; overflow: hidden; }
          .dca-dsk-hdr    { display: flex; flex-shrink: 0; }
          .dca-mob-nav    { display: none !important; }
          .dca-mob-shell  { max-width: none; margin: 0; min-height: 0; flex: 1; overflow: hidden; position: relative; }
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

          /* Secondary screens (calc, settings, etc.) centered */
          .dca-panel      { height: 100%; overflow-y: auto; }
          .dca-panel-inner { max-width: 680px; margin: 0 auto; }
        }

        @media (max-width: 767px) {
          .dca-dash-grid { display: block; }
          .dca-dash-left, .dca-dash-right { padding: 0; border: none; }
          .dca-signin-wrap, .dca-signin-box { display: contents; }
        }
      `}</style>

      <div className="dca-root">
        {/* ── Sidebar (desktop only) ── */}
        {!onSignin && (
          <aside className="dca-sidebar">
            <DesktopSidebar theme={theme} activeScreen={cur.screen} onNav={desktopNav} user={user}/>
          </aside>
        )}

        {/* ── Main area ── */}
        <div className={onSignin ? '' : 'dca-main'} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Desktop header (authenticated only) */}
          {!onSignin && (
            <div className="dca-dsk-hdr">
              <DesktopHeader theme={theme} user={user} onAdd={() => navigate('add')}/>
            </div>
          )}

          {/* ── Content ── */}
          {onSignin ? (
            /* Sign-in: mobile card + desktop centered */
            <div className="dca-signin-wrap" style={{ flex: 1 }}>
              <div className="dca-signin-box">
                <div style={{ height: '100vh' }}>
                  {body}
                </div>
              </div>
            </div>
          ) : isDashboard ? (
            /* Dashboard: two-column grid on desktop, single column on mobile */
            <div className="dca-dash-grid">
              {/* Left: holdings table */}
              <div className="dca-dash-left">
                <div className="dca-mob-only">
                  {/* Mobile: render full Dashboard (has notif bar, etc.) */}
                  {body}
                </div>
                <div className="dca-dsk-only">
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.text3, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12 }}>Holdings — sorted by score</div>
                    <HoldingsTable theme={theme} holdings={holdings} loading={loading} onPick={sym => navigate('detail', sym)} onRefresh={fetchMetrics} lastRefreshed={lastRefreshed}/>
                  </div>
                </div>
              </div>
              {/* Right: charts (desktop only) */}
              <div className="dca-dash-right dca-dsk-only">
                <DesktopDashboardRight theme={theme} holdings={holdings} loading={loading} navigate={navigate} fgIndex={fgIndex}/>
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

          {/* Mobile disclaimer + bottom nav */}
          <div className="dca-mob-nav">
            {!onSignin && (
              <div style={{ padding: '4px 12px 2px', background: theme.bg, borderTop: `1px solid ${theme.line}`, textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: theme.text3 }}>Educational market data only. Not financial advice. Not personalized recommendations.</span>
              </div>
            )}
            <BottomNav theme={theme} tab={tab} setTab={setTab} onAdd={() => navigate('add')}/>
          </div>
        </div>
      </div>
    </>
  );
}
