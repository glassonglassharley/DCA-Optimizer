import { useState } from 'react';
import Head from 'next/head';
import { THEMES } from '../components/tokens';
import { Ic } from '../components/icons';

const theme = THEMES.dark;

// ─── Term data ────────────────────────────────────────────────────────────────

const TERMS = [
  {
    key: 'rsi',
    term: 'Relative Strength Index (RSI)',
    cat: 'Indicator',
    def: 'RSI measures the speed and size of recent price moves on a 0–100 scale. It compares the average of recent gains to the average of recent losses over a lookback window (typically 14 trading days). Near 0 = sustained selling. Near 100 = sustained buying. It tells you about momentum, not direction.',
    inApp: 'Every holding in your table shows a live RSI-14 calculated from 45 days of daily closes pulled from Yahoo Finance. RSI below 30 is flagged oversold (+2 to Composite Score). Above 70 is flagged overbought (−2). The RSI line chart on the dashboard plots all holdings together so you can spot which are cooling off.',
    visual: 'rsi',
  },
  {
    key: 'wilders',
    term: "Wilder's Smoothing",
    cat: 'Indicator',
    def: "Wilder's smoothing is the specific averaging method used to calculate RSI. Instead of a simple arithmetic average, each new period's gain/loss is blended into a running total that gives more weight to recent data — making the RSI responsive to momentum shifts without overreacting to individual noisy days.",
    inApp: "DCA Tracker calculates RSI-14 from scratch server-side using Wilder's EMA on 45 days of Yahoo Finance daily closes. The 45-day window ensures at least 31 data points after the 14-day seed period. This matches the method used by TradingView, Bloomberg, and most professional platforms.",
    visual: null,
  },
  {
    key: 'fpe',
    term: 'Forward P/E Ratio',
    cat: 'Indicator',
    def: 'Forward P/E = Current Share Price ÷ Analyst-Estimated Next-12-Month EPS. It prices in future profitability, not the past. A low Forward P/E means you\'re paying little for each dollar of expected earnings. A high one means growth expectations are already baked in — leaving less room for upside surprise.',
    inApp: 'The F/PE column shows analyst-consensus Forward P/E sourced from Yahoo Finance. Crypto has no earnings so this field is blank for BTC, ETH etc. Scoring: F/PE < 20 → +1 to Composite Score. F/PE > 40 → −1. Colour zones: green < 15 (value), neutral 15–25, amber 25–35, red > 35 (growth premium).',
    visual: 'fpe',
  },
  {
    key: 'fg',
    term: 'Fear & Greed Index',
    cat: 'Indicator',
    def: 'CNN Business\'s Fear & Greed Index combines seven market signals — price momentum, market strength, market breadth, put/call ratio, junk bond demand, safe-haven demand, and volatility — into a single 0–100 score. 0 is extreme fear (panic selling). 100 is extreme greed (euphoria). It\'s a contrarian indicator.',
    inApp: 'The F&G column in the Holdings table shows the current reading, refreshed every page load. It\'s the same number for all tickers — it reflects broad market sentiment, not individual stock behaviour. F&G < 30 (fear) adds +1 to every holding\'s score; > 70 (greed) subtracts −1. Historically, buying into fear has outperformed buying into greed.',
    visual: null,
  },
  {
    key: 'rule-1090',
    term: 'The 10/90 RSI Rule',
    cat: 'Rule',
    def: 'Standard RSI thresholds are 30 (oversold) and 70 (overbought). The 10/90 rule tightens those to only act on genuinely extreme readings — below 10 or above 90. Most recoveries start before RSI ever reaches 30; waiting for the 10 level filters out shallow dips and focuses on the real capitulation events that historically produce the best DCA entries.',
    inApp: 'DCA Tracker applies the 5/95 variant by default (configurable). The 30/70 reference lines still appear on the RSI chart as soft guides. Alerts in the Notification Bar only fire at the extreme end (< 30 / > 70 today, tightenable in Settings). The Smart DCA calculator lets you set your own threshold to compare strategies.',
    visual: 'rule-1090',
  },
  {
    key: 'signals',
    term: 'BUY / HOLD / WAIT',
    cat: 'Signal',
    def: 'BUY: multiple signals are aligned in your favour — RSI is low, valuation is reasonable, or analyst sentiment is positive. HOLD: no strong signal either way, continue your scheduled DCA. WAIT: one or more metrics are elevated enough that this period\'s capital may find better deployment elsewhere or should be deferred to next week.',
    inApp: 'Ratings derive from the Composite Score. Score ≥ 6.5 = STRONG BUY or BUY. Score 4–6.5 = HOLD. Score < 4 = WAIT. These are context signals — your DCA schedule should drive the cadence. A WAIT rating means "consider skipping this buy" not "sell everything". Nothing here is financial advice.',
    visual: null,
  },
  {
    key: 'os',
    term: 'Overbought / Oversold',
    cat: 'Signal',
    def: 'Overbought (RSI > 70): the asset has risen so quickly that momentum may be exhausted and profit-taking is likely. Oversold (RSI < 30): it has fallen so hard that panic selling may be nearing exhaustion. Neither condition is a guaranteed reversal signal — assets can stay overbought for weeks in strong trends.',
    inApp: 'The Notification Bar scrolls live alerts when any holding crosses RSI 30 (oversold) or 70 (overbought). Oversold adds +2 to Composite Score; overbought subtracts −2. Use oversold readings as a prompt to deploy your scheduled DCA buy into that specific ticker. Never sell a core holding purely because it is overbought.',
    visual: null,
  },
  {
    key: 'divergence',
    term: 'RSI Divergence',
    cat: 'Signal',
    def: 'Divergence is when price and RSI disagree. Bullish divergence: price makes a lower low but RSI makes a higher low — selling pressure is weakening even as price falls, often preceding a reversal. Bearish divergence: price makes a higher high but RSI makes a lower high — buying momentum is fading even as price rises.',
    inApp: 'DCA Tracker doesn\'t algorithmically flag divergence (it requires identifying multiple swing points), but the RSI line chart on the dashboard makes it visible. If a holding is at a new price low while RSI is clearly higher than its previous trough, that\'s a bullish divergence worth noting before your next DCA decision.',
    visual: null,
  },
  {
    key: 'score',
    term: 'Composite Score (0–10)',
    cat: 'Indicator',
    def: 'A single number that blends four independent signals — RSI (momentum), Fear & Greed (sentiment), Forward P/E (valuation), and analyst rating (consensus) — into one at-a-glance entry attractiveness measure. Higher means more signals are pointing toward a favourable entry. It is explicitly not a price prediction.',
    inApp: 'Formula: Start at 5.0. RSI < 30 → +2 · RSI 30–50 → +1 · RSI > 70 → −2 · RSI 60–70 → −1. F&G < 30 → +1 · F&G > 70 → −1. F/PE < 20 → +1 · F/PE > 40 → −1. STRONG BUY → +1 · BUY → +0.5 · SELL/STRONG SELL → −1. Clamped 0–10, rounded to one decimal. Formula is open — no black box.',
    visual: null,
  },
  {
    key: 'dca',
    term: 'Dollar Cost Averaging',
    cat: 'Concept',
    def: 'DCA is the practice of investing a fixed dollar amount on a regular schedule regardless of price. When prices are high you automatically buy fewer units; when prices are low you buy more. Over months and years this averages out the cost basis and removes the psychological pressure of trying to time the market perfectly.',
    inApp: 'DCA Tracker is built around this strategy. Every signal and score is designed to help you decide whether now is a better or worse time to deploy your scheduled buy — not whether to stop. The DCA Calculator shows the historical difference between blind weekly buying vs RSI-timed buying for any ticker in your watchlist.',
    visual: null,
  },
  {
    key: 'sizing',
    term: 'Position Sizing',
    cat: 'Concept',
    def: 'Position sizing determines how much of your total portfolio goes to each holding. A common framework: Core (40–60%, stable, low-volatility), Growth (20–30%, higher risk/reward), Speculative (5–10%, high-conviction, small). Proper sizing means even a complete loss on a speculative position doesn\'t materially damage the portfolio.',
    inApp: 'The TAG column (CORE, STOCK, CRYPTO, INCOME, HEDGE) maps loosely to sizing categories. CORE implies larger allocations, CRYPTO implies smaller speculative sizing. The tags are informational — the app doesn\'t manage dollar amounts or enforce allocation percentages. Use them as a visual reminder of each holding\'s intended role.',
    visual: null,
  },
  {
    key: 'ma',
    term: 'Moving Average (50 / 200 day)',
    cat: 'Indicator',
    def: 'A moving average smooths daily price noise by averaging closing prices over a rolling window. The 50-day MA reflects intermediate trend; the 200-day MA reflects long-term trend. Golden Cross: 50-day crosses above 200-day (bullish). Death Cross: 50-day crosses below 200-day (bearish). Price above 200-day MA = broadly in an uptrend.',
    inApp: 'The 50-day and 200-day MAs appear on each ticker\'s detail screen, sourced from Yahoo Finance. They\'re displayed as percentage distance from current price (e.g. "11% above 200-day MA"). A holding trading significantly below its 200-day MA in an otherwise strong long-term chart can strengthen the case for DCA accumulation.',
    visual: null,
  },
  {
    key: 'rotation',
    term: 'Sector Rotation',
    cat: 'Concept',
    def: 'Sector rotation describes how institutional capital tends to move between market sectors as the economic cycle evolves. Early recovery → financials and cyclicals. Mid-cycle → technology and industrials. Late cycle → energy and materials. Recession → healthcare, utilities, and consumer staples. Anticipating rotation is how fund managers generate alpha.',
    inApp: 'DCA Tracker doesn\'t automate sector rotation, but the Holdings table helps you monitor concentration. If your entire watchlist is tech-heavy and all RSIs are simultaneously elevated, that may reflect a sector-wide condition rather than individual stock risk — a signal to consider diversifying your DCA across sectors.',
    visual: null,
  },
  {
    key: 'earnings',
    term: 'Earnings Date',
    cat: 'Concept',
    def: 'Publicly listed companies report earnings quarterly. In the days before the announcement, options implied volatility spikes and the stock can gap 5–20% in either direction after the report regardless of its RSI or valuation. This is called earnings risk — fundamentals become temporarily irrelevant as the market prices in the surprise.',
    inApp: 'DCA Tracker doesn\'t currently surface earnings dates, but the principle matters: consider pausing or sizing down DCA buys in the 3–5 days before earnings for volatile holdings like NVDA, TSLA, or AMZN. Post-earnings drops — when they occur — are often some of the best DCA entry points precisely because RSI can crash in a single session.',
    visual: null,
  },
  {
    key: 'reversion',
    term: 'Mean Reversion',
    cat: 'Concept',
    def: 'Mean reversion is the statistical tendency for asset prices to drift back toward their historical average after extreme deviations. When a stock is significantly below its average (oversold), theory suggests it will eventually recover. The theory says nothing about timing — only that extremes are typically temporary.',
    inApp: 'Mean reversion is the intellectual foundation of RSI-based DCA timing. When a holding\'s RSI is extreme (below 10 or 30), the app flags it as a statistically depressed entry — not because a recovery is guaranteed, but because you\'re buying at a price that has historically reverted. Combined with a sound DCA schedule, this asymmetry is the edge.',
    visual: null,
  },
];

const CATS = ['All', 'Indicator', 'Signal', 'Rule', 'Concept'];

// ─── Visual scale components ──────────────────────────────────────────────────

function RSIScale() {
  const zones = [
    { label: '0–10', pct: 10, color: '#10B981', text: 'Extreme\nOversold' },
    { label: '10–30', pct: 20, color: '#22D3EE', text: 'Oversold' },
    { label: '30–70', pct: 40, color: '#4B5478', text: 'Neutral' },
    { label: '70–90', pct: 20, color: '#F59E0B', text: 'Overbought' },
    { label: '90–100', pct: 10, color: '#EF4444', text: 'Extreme\nOverbought' },
  ];
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.text3, letterSpacing: '.1em', marginBottom: 6 }}>RSI SCALE</div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28 }}>
        {zones.map(z => (
          <div key={z.label} style={{ flex: z.pct, background: z.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, color: '#fff', fontWeight: 700, textAlign: 'center', lineHeight: 1.1, padding: '0 2px' }}>{z.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 4 }}>
        {zones.map(z => (
          <div key={z.label} style={{ flex: z.pct, textAlign: 'center' }}>
            <span style={{ fontSize: 8, color: theme.text3, lineHeight: 1.2, display: 'block', whiteSpace: 'pre-line' }}>{z.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FPEScale() {
  const zones = [
    { label: '< 15', pct: 20, color: '#10B981', text: 'Value' },
    { label: '15–25', pct: 25, color: '#22D3EE', text: 'Fair' },
    { label: '25–35', pct: 25, color: '#F59E0B', text: 'Premium' },
    { label: '> 35', pct: 30, color: '#EF4444', text: 'Expensive' },
  ];
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.text3, letterSpacing: '.1em', marginBottom: 6 }}>FORWARD P/E ZONES</div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 28 }}>
        {zones.map(z => (
          <div key={z.label} style={{ flex: z.pct, background: z.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 8, color: '#fff', fontWeight: 700 }}>{z.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', marginTop: 4 }}>
        {zones.map(z => (
          <div key={z.label} style={{ flex: z.pct, textAlign: 'center' }}>
            <span style={{ fontSize: 8, color: theme.text3 }}>{z.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Rule1090Scale() {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: theme.text3, letterSpacing: '.1em', marginBottom: 6 }}>10/90 vs STANDARD 30/70</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Standard 30/70', zones: [
            { label: 'Buy zone', pct: 30, color: '#10B981' },
            { label: 'Neutral', pct: 40, color: '#4B5478' },
            { label: 'Wait zone', pct: 30, color: '#EF4444' },
          ]},
          { label: '10/90 Rule (this app)', zones: [
            { label: 'Extreme', pct: 10, color: '#10B981' },
            { label: 'Neutral (no signal)', pct: 80, color: '#4B5478' },
            { label: 'Extreme', pct: 10, color: '#EF4444' },
          ]},
        ].map(row => (
          <div key={row.label}>
            <div style={{ fontSize: 9, color: theme.text3, marginBottom: 3 }}>{row.label}</div>
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 22 }}>
              {row.zones.map(z => (
                <div key={z.label} style={{ flex: z.pct, background: z.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 7.5, color: '#fff', fontWeight: 700 }}>{z.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Term Card ────────────────────────────────────────────────────────────────

const CAT_COLORS = {
  Indicator: '#5BC8FF',
  Signal:    '#A78BFA',
  Rule:      '#F59E0B',
  Concept:   '#34D399',
};

function TermCard({ t, isOpen, onToggle }) {
  const catColor = CAT_COLORS[t.cat] || theme.text3;
  return (
    <div style={{
      borderRadius: 16, border: `1px solid ${isOpen ? catColor + '50' : theme.line}`,
      background: isOpen ? theme.card : theme.bg2,
      overflow: 'hidden', transition: 'border-color .15s',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', border: 'none', background: 'transparent',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{
          flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
          padding: '3px 8px', borderRadius: 6,
          color: catColor, background: catColor + '20', border: `1px solid ${catColor}40`,
        }}>{t.cat.toUpperCase()}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.text }}>{t.term}</span>
        <span style={{ transform: `rotate(${isOpen ? 90 : 0}deg)`, transition: 'transform .2s', color: theme.text3, fontSize: 16 }}>›</span>
      </button>

      {isOpen && (
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: theme.text2, lineHeight: 1.65 }}>{t.def}</p>
          {t.visual === 'rsi' && <RSIScale/>}
          {t.visual === 'fpe' && <FPEScale/>}
          {t.visual === 'rule-1090' && <Rule1090Scale/>}
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: theme.brand + '0D', border: `1px solid ${theme.brand}30`,
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.1em', color: theme.brand, marginBottom: 6 }}>IN THIS APP</div>
            <p style={{ margin: 0, fontSize: 12.5, color: theme.text2, lineHeight: 1.6 }}>{t.inApp}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlossaryPage() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [openKey, setOpenKey] = useState(null);

  const filtered = TERMS.filter(t => {
    const matchCat = cat === 'All' || t.cat === cat;
    const q = search.toLowerCase();
    const matchSearch = !q || t.term.toLowerCase().includes(q) || t.def.toLowerCase().includes(q) || t.inApp.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const toggle = (key) => setOpenKey(prev => prev === key ? null : key);

  return (
    <>
      <Head>
        <title>Glossary — DCA Tracker</title>
        <meta name="description" content="Plain-English definitions of every metric in DCA Tracker"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </Head>

      <style jsx global>{`
        :root { --font-ui: "Geist", system-ui, sans-serif; --font-mono: "Geist Mono", ui-monospace, monospace; }
        html, body { margin: 0; padding: 0; background: ${theme.bg}; font-family: var(--font-ui); -webkit-font-smoothing: antialiased; }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        input { font-family: inherit; }
        ::-webkit-scrollbar { width: 0; }
      `}</style>

      <div style={{ background: theme.bg, minHeight: '100vh', color: theme.text }}>
        <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 0 80px' }}>

          {/* Header */}
          <div style={{ padding: '16px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => window.history.back()} style={{
              width: 36, height: 36, borderRadius: 11, border: `1px solid ${theme.line2}`,
              background: theme.pillBg, color: theme.text, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.text} strokeWidth="2" strokeLinecap="round">
                <path d="m15 6-6 6 6 6"/>
              </svg>
            </button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.03em' }}>Glossary</div>
              <div style={{ fontSize: 11, color: theme.text3, marginTop: 1 }}>{TERMS.length} terms · plain-English definitions</div>
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: '14px 20px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
              background: theme.card, border: `1px solid ${theme.line2}`, borderRadius: 14,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.text3} strokeWidth="1.7" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
              </svg>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setOpenKey(null); }}
                placeholder="Search RSI, divergence, mean reversion…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: theme.text, fontSize: 14 }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.text3, padding: 0, display: 'flex' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={theme.text3} strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6 6 18"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ padding: '12px 20px 0', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {CATS.map(c => {
              const on = cat === c;
              const cc = CAT_COLORS[c];
              return (
                <button key={c} onClick={() => { setCat(c); setOpenKey(null); }} style={{
                  flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 999,
                  border: `1px solid ${on ? (cc || theme.brand) + '80' : theme.line}`,
                  background: on ? (cc || theme.brand) + '18' : theme.bg2,
                  color: on ? (cc || theme.brand) : theme.text3,
                  fontWeight: 700, fontSize: 11.5, cursor: 'pointer', letterSpacing: '.02em',
                  transition: 'all .15s',
                }}>{c}</button>
              );
            })}
          </div>

          {/* Terms */}
          <div style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: theme.text3, fontSize: 13 }}>
                No terms match &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map(t => (
                <TermCard key={t.key} t={t} isOpen={openKey === t.key} onToggle={() => toggle(t.key)}/>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ margin: '24px 20px 0', padding: '12px 14px', borderRadius: 12, background: theme.bg2, border: `1px dashed ${theme.line2}`, fontSize: 11, color: theme.text3, lineHeight: 1.5 }}>
            <b style={{ color: theme.text2 }}>Data sources.</b> RSI and price data from Yahoo Finance. Fear &amp; Greed Index from CNN/Alternative.me. Forward P/E from analyst consensus via Yahoo Finance. Composite Score formula is open — no black box.{' '}
            <b style={{ color: theme.text2 }}>Nothing here is financial advice.</b>
          </div>

        </div>
      </div>
    </>
  );
}
