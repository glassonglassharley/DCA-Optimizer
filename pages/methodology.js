import Head from 'next/head';
import { THEMES } from '../components/tokens';
import { Ic } from '../components/icons';

export default function Methodology() {
  const theme = THEMES.dark;
  const T = theme.text;
  const T2 = theme.text2;
  const T3 = theme.text3;

  return (
    <>
      <Head>
        <title>Score Methodology — DCA Tracker</title>
        <meta name="description" content="How the DCA Tracker composite score is calculated"/>
      </Head>
      <div style={{ background: theme.bg, minHeight: '100vh', color: T, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 20px 60px' }}>

          {/* Back link */}
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: theme.brand, textDecoration: 'none', marginBottom: 28 }}>
            {Ic.chevL(14, theme.brand)} Back to app
          </a>

          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', marginBottom: 6 }}>Score Methodology</h1>
          <p style={{ fontSize: 14, color: T2, lineHeight: 1.7, marginBottom: 32 }}>
            How the DCA Tracker composite score (0–10) is calculated — plain English, no jargon.
          </p>

          <Disclaimer theme={theme}/>

          <Section title="What is the DCA Score?" theme={theme}>
            <p>Each ticker gets a score from <b>0 to 10</b>. Higher scores indicate market conditions that have historically been more favorable for dollar-cost averaging — meaning you might be buying at a relatively better price. Lower scores suggest conditions where prices may be extended or sentiment is euphoric.</p>
            <p style={{ marginTop: 12 }}>The score is a <em>signal</em>, not a prediction. It does not tell you what a price will do next. Your DCA schedule — fixed amounts on fixed dates — is more important than any score.</p>
          </Section>

          <Section title="The Three Inputs" theme={theme}>
            <InputRow
              theme={theme}
              label="RSI (Relative Strength Index)"
              weight="Up to ±2 points"
              desc="A 14-day momentum measure (0–100). When RSI is low, the asset has been selling off recently. When RSI is high, it's been rallying. We use it as a contrarian signal:"
              rows={[
                ['RSI below 30', '+2 pts', 'Oversold — potential accumulation zone'],
                ['RSI 30–50', '+1 pt', 'Cooling off — below mid-range'],
                ['RSI 60–70', '−1 pt', 'Warming up — above mid-range'],
                ['RSI above 70', '−2 pts', 'Overbought — extended rally'],
              ]}
            />
            <InputRow
              theme={theme}
              label="Fear & Greed Index"
              weight="Up to ±1 point"
              desc="A 0–100 market-sentiment gauge from Alternative.me (crypto) and CNN (stocks). Extreme fear has historically preceded recoveries; extreme greed has preceded corrections."
              rows={[
                ['F&G below 30', '+1 pt', 'Fear — market is broadly pessimistic'],
                ['F&G above 70', '−1 pt', 'Greed — market is broadly optimistic'],
              ]}
            />
            <InputRow
              theme={theme}
              label="Forward P/E Ratio (stocks only)"
              weight="Up to ±1 point"
              desc="Price relative to next-year earnings estimates. Only applied to stocks — crypto tickers are scored on RSI and F&G only since P/E is not meaningful for them."
              rows={[
                ['F/PE below 20', '+1 pt', 'Priced cheaply vs expected earnings'],
                ['F/PE above 40', '−1 pt', 'Expensive vs expected earnings'],
              ]}
            />
          </Section>

          <Section title="Score Labels" theme={theme}>
            <p style={{ marginBottom: 14 }}>After the score is calculated it maps to a display label:</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.line2}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: T3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>SCORE RANGE</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: T3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>LABEL</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: T3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>MEANING</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['7–10', 'High', 'Multiple favorable signals aligned'],
                  ['5.5–7', 'Favorable Setup', 'More signals positive than negative'],
                  ['4–5.5', 'Neutral', 'Mixed or no strong signals'],
                  ['0–4', 'Wait Zone', 'Signals unfavorable for adding now'],
                ].map(([range, label, meaning]) => (
                  <tr key={range} style={{ borderBottom: `1px solid ${theme.line}` }}>
                    <td style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)', fontSize: 13, color: theme.brand }}>{range}</td>
                    <td style={{ padding: '10px 10px', fontWeight: 700, color: T }}>{label}</td>
                    <td style={{ padding: '10px 10px', color: T2, fontSize: 12 }}>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="What the score does NOT do" theme={theme}>
            <ul style={{ paddingLeft: 20, lineHeight: 2, color: T2, fontSize: 14 }}>
              <li>It does not predict future prices.</li>
              <li>It does not account for your personal tax situation, risk tolerance, or financial goals.</li>
              <li>It does not recommend a specific dollar amount to invest.</li>
              <li>It does not account for company-specific news, earnings, or events.</li>
            </ul>
          </Section>

          <Section title="Scoring Framework — Inspired by Ian Dunlap's Technical Analysis" theme={theme}>
            <p>The composite score weights five independent signals. Each signal is a contrarian indicator — it rewards conditions that historically create attractive DCA entry points, not conditions that feel good to buy.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.line2}` }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: theme.text3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>SIGNAL</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: theme.text3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>WEIGHT</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', color: theme.text3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>LOGIC</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['RSI (14-day)', '~25%', 'RSI < 30 = +2 · RSI 30–50 = +1 · RSI 60–70 = −1 · RSI > 70 = −2'],
                  ['Fear & Greed Index', '~15%', 'F&G < 30 (fear) = +1 · F&G > 70 (greed) = −1'],
                  ['Forward P/E (stocks only)', '~15%', 'F/PE < 20 = +1 · F/PE > 40 = −1 · Skip for crypto/ETFs'],
                  ['72-Day EMA Position', '~15%', 'Price below 72 EMA = +1 (pullback zone) · Above = −1'],
                  ['200-Day SMA Distance', '~30%', 'Below 200 SMA = +1.5 · 0–10% above = neutral · 10–20% above = −0.5 · >20% above = −1.5'],
                ].map(([sig, wt, logic]) => (
                  <tr key={sig} style={{ borderBottom: `1px solid ${theme.line}` }}>
                    <td style={{ padding: '10px 10px', fontWeight: 600, color: theme.text, fontSize: 13 }}>{sig}</td>
                    <td style={{ padding: '10px 10px', color: theme.brand, fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{wt}</td>
                    <td style={{ padding: '10px 10px', color: theme.text2, fontSize: 12 }}>{logic}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 16 }}>The 200-Day SMA distance uses <b>graduated scoring</b>: the further below the long-term baseline, the stronger the DCA signal. Price above the baseline is penalised proportionally — slightly extended (+10–20%) costs 0.5 points; significantly extended (&gt;20%) costs 1.5 points. This is the highest-weight single signal in the model.</p>

            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: theme.text, marginBottom: 12 }}>Ian Dunlap's 3-Price Entry System</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.line2}` }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: theme.text3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>SCORE</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: theme.text3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>LABEL</th>
                    <th style={{ textAlign: 'left', padding: '6px 10px', color: theme.text3, fontWeight: 600, fontSize: 11, letterSpacing: '.06em' }}>IAN DUNLAP EQUIVALENT</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['8–10', 'High', 'Load the Boat — all signals aligned, maximum conviction entry'],
                    ['6–7.9', 'Favorable Setup', 'Swing Entry — near support, good risk/reward'],
                    ['4–5.9', 'Neutral', 'Quick Entry — mixed signals, proceed with normal DCA schedule'],
                    ['0–3.9', 'Wait Zone', 'No entry — signals unfavorable, defer this buy cycle'],
                  ].map(([score, label, equiv]) => (
                    <tr key={score} style={{ borderBottom: `1px solid ${theme.line}` }}>
                      <td style={{ padding: '10px 10px', fontFamily: 'var(--font-mono)', color: theme.brand, fontSize: 13 }}>{score}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: theme.text }}>{label}</td>
                      <td style={{ padding: '10px 10px', color: theme.text2, fontSize: 12 }}>{equiv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Data sources" theme={theme}>
            <p><b>Price &amp; RSI:</b> Yahoo Finance (delayed ~15 min for US equities, real-time for crypto).</p>
            <p style={{ marginTop: 8 }}><b>Fear &amp; Greed:</b> Alternative.me API (updated daily).</p>
            <p style={{ marginTop: 8 }}><b>Analyst ratings / F/PE:</b> Yahoo Finance quoteSummary (consensus from major brokerages, updated daily).</p>
          </Section>

          <Disclaimer theme={theme}/>

        </div>
      </div>
    </>
  );
}

function Disclaimer({ theme }) {
  return (
    <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 28 }}>
      <p style={{ fontSize: 12, color: '#fca5a5', lineHeight: 1.6, margin: 0 }}>
        <b>Educational market data only. Not financial advice. Not personalized recommendations.</b> The DCA Score is a data aggregation tool. It does not constitute investment advice, a solicitation, or a recommendation to buy or sell any security or asset. Always do your own research and consult a qualified financial advisor before making investment decisions.
      </p>
    </div>
  );
}

function Section({ title, children, theme }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: theme.text, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${theme.line}` }}>{title}</h2>
      <div style={{ fontSize: 14, color: theme.text2, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

function InputRow({ theme, label, weight, desc, rows }) {
  return (
    <div style={{ marginBottom: 24, background: theme.card, borderRadius: 10, padding: '14px 16px', border: `1px solid ${theme.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, color: theme.text, fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 11, color: theme.brand, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{weight}</span>
      </div>
      <p style={{ fontSize: 13, color: theme.text2, marginBottom: 10, lineHeight: 1.6 }}>{desc}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <tbody>
          {rows.map(([condition, pts, note]) => (
            <tr key={condition} style={{ borderTop: `1px solid ${theme.line}` }}>
              <td style={{ padding: '7px 8px', fontFamily: 'var(--font-mono)', color: theme.text }}>{condition}</td>
              <td style={{ padding: '7px 8px', fontWeight: 700, color: pts.startsWith('+') ? '#4ade80' : '#f87171', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{pts}</td>
              <td style={{ padding: '7px 8px', color: theme.text3 }}>{note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
