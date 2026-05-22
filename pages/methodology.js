import Head from 'next/head';
import { THEMES } from '../components/tokens';

const theme = THEMES.dark;

const weights = [
  ['Momentum / RSI', '25%', 'RSI helps show whether recent price action is stretched, cooling, or neutral.'],
  ['Trend / moving averages', '25%', 'Trend context helps separate normal pullbacks from weaker long-term setups.'],
  ['Valuation or drawdown', '20%', 'Stocks may use Forward P/E; ETFs and crypto lean more on drawdown and volatility.'],
  ['Market sentiment', '15%', 'Fear & Greed gives broad market context, not ticker-specific advice.'],
  ['DCA plan fit', '15%', 'Cadence, risk tolerance, and asset focus should shape how the score is interpreted.'],
];

function Card({ children }) {
  return (
    <section style={{
      padding: 16,
      borderRadius: 16,
      background: theme.card,
      border: `1px solid ${theme.line}`,
      boxShadow: '0 1px 0 rgba(255,255,255,.03) inset',
    }}>
      {children}
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <>
      <Head>
        <title>Methodology - DCA Tracker</title>
        <meta name="description" content="How DCA Tracker calculates its educational DCA score."/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </Head>

      <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 620, margin: '0 auto', padding: '18px 20px 80px', display: 'grid', gap: 14 }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => window.history.back()} style={{
              width: 36, height: 36, borderRadius: 11, border: `1px solid ${theme.line2}`,
              background: theme.pillBg, color: theme.text, cursor: 'pointer',
            }}>Back</button>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-.03em' }}>Methodology</h1>
              <p style={{ margin: '3px 0 0', color: theme.text3, fontSize: 12 }}>Transparent 0-10 DCA score. Educational only.</p>
            </div>
          </header>

          <Card>
            <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>Positioning</h2>
            <p style={{ margin: 0, color: theme.text2, fontSize: 13, lineHeight: 1.6 }}>
              A transparent DCA watchlist that helps you understand market conditions before your next scheduled buy.
              The score is not personalized financial advice, a price prediction, or an instruction to buy or sell.
            </p>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 10px', fontSize: 15 }}>Score Components</h2>
            <div style={{ display: 'grid', gap: 9 }}>
              {weights.map(([label, weight, copy]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: 12, borderRadius: 12, background: theme.bg2, border: `1px solid ${theme.line}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                    <div style={{ marginTop: 3, color: theme.text2, fontSize: 11.5, lineHeight: 1.45 }}>{copy}</div>
                  </div>
                  <strong style={{ color: theme.brand, fontFamily: 'monospace' }}>{weight}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>Asset-Specific Scoring</h2>
            <p style={{ margin: '0 0 8px', color: theme.text2, fontSize: 13, lineHeight: 1.55 }}><b style={{ color: theme.text }}>Stocks:</b> RSI, moving averages, Forward P/E, sentiment, earnings context when available, and trend.</p>
            <p style={{ margin: '0 0 8px', color: theme.text2, fontSize: 13, lineHeight: 1.55 }}><b style={{ color: theme.text }}>ETFs / index funds:</b> trend, volatility, drawdown, expense ratio when available, and index or sector exposure.</p>
            <p style={{ margin: 0, color: theme.text2, fontSize: 13, lineHeight: 1.55 }}><b style={{ color: theme.text }}>Crypto:</b> volatility, momentum, drawdown, moving averages, and sentiment. Crypto does not use P/E.</p>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>Data Freshness</h2>
            <p style={{ margin: 0, color: theme.text2, fontSize: 13, lineHeight: 1.6 }}>
              Price, RSI, Forward P/E, Fear & Greed, moving-average data, and score calculations can refresh at different times.
              If data is delayed, stale, or unavailable, the app should show that clearly instead of hiding it.
            </p>
          </Card>

          <Card>
            <h2 style={{ margin: '0 0 8px', fontSize: 15 }}>Privacy</h2>
            <p style={{ margin: 0, color: theme.text2, fontSize: 13, lineHeight: 1.6 }}>
              Username-only accounts are privacy-friendly, but a username alone is not strong authentication.
              The preferred direction is no email, no password, no brokerage connection, plus a random internal user ID and optional passkey support later.
            </p>
          </Card>
        </main>
      </div>
    </>
  );
}
