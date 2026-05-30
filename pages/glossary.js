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
    inApp: "DCA Anchor calculates RSI-14 from scratch server-side using Wilder's EMA on 45 days of Yahoo Finance daily closes. The 45-day window ensures at least 31 data points after the 14-day seed period. This matches the method used by TradingView, Bloomberg, and most professional platforms.",
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
    inApp: 'DCA Anchor applies the 5/95 variant by default (configurable). The 30/70 reference lines still appear on the RSI chart as soft guides. Alerts in the Notification Bar only fire at the extreme end (< 30 / > 70 today, tightenable in Settings). The Smart DCA calculator lets you set your own threshold to compare strategies.',
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
    inApp: 'DCA Anchor doesn\'t algorithmically flag divergence (it requires identifying multiple swing points), but the RSI line chart on the dashboard makes it visible. If a holding is at a new price low while RSI is clearly higher than its previous trough, that\'s a bullish divergence worth noting before your next DCA decision.',
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
    inApp: 'DCA Anchor is built around this strategy. Every signal and score is designed to help you decide whether now is a better or worse time to deploy your scheduled buy — not whether to stop. The DCA Calculator shows the historical difference between blind weekly buying vs RSI-timed buying for any ticker in your watchlist.',
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
    inApp: 'DCA Anchor doesn\'t automate sector rotation, but the Holdings table helps you monitor concentration. If your entire watchlist is tech-heavy and all RSIs are simultaneously elevated, that may reflect a sector-wide condition rather than individual stock risk — a signal to consider diversifying your DCA across sectors.',
    visual: null,
  },
  {
    key: 'earnings',
    term: 'Earnings Date',
    cat: 'Concept',
    def: 'Publicly listed companies report earnings quarterly. In the days before the announcement, options implied volatility spikes and the stock can gap 5–20% in either direction after the report regardless of its RSI or valuation. This is called earnings risk — fundamentals become temporarily irrelevant as the market prices in the surprise.',
    inApp: 'DCA Anchor doesn\'t currently surface earnings dates, but the principle matters: consider pausing or sizing down DCA buys in the 3–5 days before earnings for volatile holdings like NVDA, TSLA, or AMZN. Post-earnings drops — when they occur — are often some of the best DCA entry points precisely because RSI can crash in a single session.',
    visual: null,
  },
  {
    key: 'va',
    term: 'Value Averaging',
    cat: 'Concept',
    def: 'Value Averaging (VA) is an investment strategy developed by Harvard professor Michael Edleson in 1991. Unlike DCA — which invests a fixed dollar amount each period — VA invests a variable amount to keep your portfolio growing along a predetermined target path. If your portfolio grew less than the target, you invest more. If it grew more, you invest less (or sell). The goal is to accumulate more shares at lower prices and fewer at higher prices — automatically and mathematically, not by guessing.\n\nExample: you target $500/month in portfolio growth. If the market dropped and your portfolio only gained $200 this month, you invest $300. If it surged and gained $800, you invest nothing. If it fell and lost $200, you invest $700 to hit the target.',
    inApp: 'DCA Anchor is built around standard DCA — fixed amounts on a schedule. Value Averaging is more aggressive in bear markets (you invest more when prices fall) and more conservative in bull runs (you invest less when prices rise). The 200MA Distance column is a natural VA companion: a deeply negative reading (price well below its long-term baseline) is exactly when VA would have you deploy the most capital. Treat a score of 8–10 as a VA "top up" signal and a score below 4 as a VA "coast" signal.',
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
  {
    key: 'ema72',
    term: '72-Day EMA',
    cat: 'Moving Averages',
    def: 'A 72-day exponential moving average gives more weight to recent prices and is more responsive than a simple moving average. Ian Dunlap uses the 72 EMA as a key short-to-medium term trend signal to identify whether price is in a healthy pullback zone or has broken below a meaningful support level.',
    inApp: 'Each holding shows a green chip (▲) when price is above the 72 EMA — indicating a bullish near-term trend. Red chip (▼) means price is below the 72 EMA. When price falls below the 72 EMA, DCA Anchor adds +1 to the composite score as a contrarian signal — the pullback creates a more attractive accumulation zone.',
    visual: null,
  },
  {
    key: 'sma200',
    term: '200-Day SMA',
    cat: 'Moving Averages',
    def: 'The 200-day simple moving average is the most widely watched long-term trend indicator on Wall Street and in crypto markets. Institutions, funds, and algorithmic systems treat it as the dividing line between a long-term uptrend (above) and downtrend (below). It moves slowly and rarely gives false signals.',
    inApp: 'Each holding shows a green chip (▲) when price is above the 200 SMA and red (▼) when below. When price dips below the 200 SMA, DCA Anchor adds +1 to the composite score — historically these moments have been strong long-term DCA entry zones, even if scary in the short term. Requires 200 days of daily price history from Yahoo Finance.',
    visual: null,
  },
  {
    key: 'load-the-boat',
    term: 'Load the Boat',
    cat: 'Signal',
    def: "Ian Dunlap's term for conditions where an investor should deploy maximum capital. All signals align simultaneously: price is below key moving averages, RSI is oversold, and market sentiment (Fear & Greed) is in fear territory. These rare moments represent the convergence of technical and sentiment-based buy signals.",
    inApp: 'In DCA Anchor this corresponds to a High DCA Score of 8–10: RSI below 30 (+2), Fear & Greed below 30 (+1), price below 72 EMA (+1), price below 200 SMA (+1). The score reflects how many signals are aligned — a 10/10 means all five inputs are signaling a contrarian entry. Not a guarantee of returns. Educational use only.',
    visual: null,
  },
  {
    key: '3-price-entry',
    term: '3-Price Entry System',
    cat: 'Concept',
    def: "Ian Dunlap's framework for identifying three strategic buy prices for any given asset: (1) a Quick Entry price — current conditions are mixed but acceptable; (2) a Swing Entry price — price is near a meaningful support level with better risk/reward; (3) a Load the Boat price — maximum conviction entry where all signals converge.",
    inApp: 'Maps directly to DCA Anchor score labels: Neutral (score 4–5.9) = Quick Entry; Favorable Setup (score 6–7.9) = Swing Entry; High DCA Score (8–10) = Load the Boat. Wait (0–3.9) means none of these conditions are met — consider deferring your buy to the next scheduled date. Educational data only, not advice.',
    visual: null,
  },

  // ── Technical Indicators ─────────────────────────────────────────────────────

  {
    key: 'macd',
    term: 'MACD (Moving Average Convergence Divergence)',
    cat: 'Indicator',
    def: 'MACD is a momentum oscillator built from three components. The MACD Line is the difference between the 12-period and 26-period EMAs — it measures whether short-term momentum is outpacing or lagging long-term momentum. The Signal Line is a 9-period EMA of the MACD Line, smoothing it for clearer crossover signals. The Histogram shows the gap between the two lines — expanding bars mean accelerating momentum, shrinking bars mean momentum is fading. A bullish crossover (MACD Line crosses above Signal Line) signals momentum shifting upward. A bearish crossover signals the opposite. Zero-line crossovers (MACD crossing above/below 0) indicate longer-term trend direction shifts.',
    inApp: 'DCA Anchor doesn\'t plot MACD directly, but RSI and 24h price change capture much of the same momentum story. When RSI is trending below 40 and price has dropped 5%+ over multiple sessions, MACD is almost certainly in bearish territory — both signals align. Use TradingView to check MACD if RSI and your Composite Score seem to contradict each other. MACD divergence (price making new lows while MACD makes higher lows) is one of the strongest early-reversal signals and a high-quality DCA accumulation trigger.',
    visual: null,
  },
  {
    key: 'bollinger',
    term: 'Bollinger Bands',
    cat: 'Indicator',
    def: 'Developed by John Bollinger in the 1980s, Bollinger Bands consist of three lines: a 20-period simple moving average (the middle band) with upper and lower bands set 2 standard deviations above and below it. The bands expand when volatility rises and contract when it falls. A Bollinger Squeeze — bands tightening to a multi-month narrow range — signals that volatility is coiling and a large breakout is imminent (direction unknown until it happens). Price closing outside the bands is initially a continuation signal, not a reversal — momentum can keep price at the extreme for days. John Bollinger\'s own rule: "Tags of the bands are not signals. They are just tags."',
    inApp: 'DCA Anchor doesn\'t display Bollinger Bands, but the 52-Week Range column on the Compare page is a coarser version of the same idea — where in its annual price envelope does the stock currently sit? A stock at the low end of its 52W range while RSI is below 30 mirrors what Bollinger traders look for when price hugs the lower band: multiple signals of compression converging. For volatile assets like BTC and NVDA, Bollinger Bands are worth checking on TradingView before your DCA buy to avoid entering immediately before a squeeze-driven flush lower.',
    visual: null,
  },
  {
    key: 'atr',
    term: 'ATR (Average True Range)',
    cat: 'Indicator',
    def: 'ATR measures how much an asset typically moves per day, expressed in price units. It\'s the 14-period average of the "true range" — the largest of: (High − Low), (|High − Prior Close|), or (|Low − Prior Close|). ATR doesn\'t indicate direction, only volatility magnitude. A rising ATR means volatility is expanding — bigger daily swings, more noise to trade through. A falling ATR means the market is quieting — typical in consolidation or just before a squeeze. Crypto assets typically carry ATRs 3–5× higher than comparable equities at the same price.',
    inApp: 'ATR isn\'t displayed in DCA Anchor but directly informs DCA buy sizing. If BTC\'s daily ATR is $4,000, a single $500 DCA buy is less than one-eighth of an average daily swing — statistically noise. If AAPL\'s ATR is $3 and you\'re buying $500, that\'s 167 shares\' worth of daily range — meaningful size. High-ATR assets (TSLA, NVDA, most crypto) benefit from splitting your scheduled DCA buy into 2–3 smaller tranches across 2–3 days rather than one lump sum, reducing the chance of buying at a single-day peak.',
    visual: null,
  },
  {
    key: 'volume',
    term: 'Volume',
    cat: 'Indicator',
    def: 'Volume is the number of shares or coins traded during a given period. It represents conviction — the same price move means something very different on 3× average volume versus 0.3× average volume. The core rules: breakouts above resistance on high volume are trustworthy; breakouts on low volume often fail. Declines on declining volume suggest selling exhaustion (bullish). Volume spikes at multi-month lows ("capitulation candles") are historically among the strongest DCA entry signals — they mark panic exhaustion, not new selling momentum. Volume leads price: rising volume during a sideways base often precedes the breakout.',
    inApp: 'Volume data isn\'t displayed in DCA Anchor, but it\'s critical context for interpreting the 24h price change you see in your Holdings table. When a holding shows a large single-session drop (−6% or more) alongside RSI below 30, checking whether that drop happened on above-average volume tells you whether it was capitulation (likely bottom nearby) or low-volume drift (possibly more to go). Use Yahoo Finance or TradingView to check the volume candle before deciding whether to front-load or delay your next DCA buy.',
    visual: null,
  },

  // ── Signals ──────────────────────────────────────────────────────────────────

  {
    key: 'golden-cross',
    term: 'Golden Cross & Death Cross',
    cat: 'Signal',
    def: 'The Golden Cross occurs when the 50-day MA crosses above the 200-day MA — a broadly bullish long-term confirmation signal, historically associated with sustained uptrends. The Death Cross is the reverse: the 50-day crosses below the 200-day, signaling potential prolonged weakness. Both signals are lagging — price has already moved significantly by the time they print. This makes them poor entry-timing tools but excellent trend-context tools. Historically, S&P 500 returns following Golden Crosses significantly outperform the periods following Death Crosses. Crypto markets amplify both: BTC Death Crosses have preceded 40–80% declines; Golden Crosses have preceded 100–300% rallies.',
    inApp: 'DCA Anchor shows whether each holding is above or below its 200-day SMA. A Golden Cross in progress (50-day approaching the 200-day from below) would show as a holding transitioning from a red 200 SMA chip to green. Treat a confirmed Golden Cross as a green light to maintain your full DCA schedule. A Death Cross warrants staying the course but sizing down slightly and watching for RSI to reach extreme oversold before adding extra. Never stop DCA on a Death Cross alone — the best long-term accumulation often happens during the Death Cross period.',
    visual: null,
  },
  {
    key: 'support-resistance',
    term: 'Support & Resistance',
    cat: 'Signal',
    def: 'Support is a price level where historical buying pressure has repeatedly overwhelmed selling — the asset tends to "bounce" from this floor. Resistance is a ceiling where sellers have consistently overpowered buyers. Once resistance breaks convincingly (on volume), it typically flips to become new support — the "resistance-to-support flip" is one of the most reliable setups in technical analysis. Key levels cluster around: prior highs and lows, round numbers ($100, $50k BTC), the 200-day SMA, high-volume nodes, and 52-week extremes. Stan Weinstein\'s Stage Analysis (Secrets for Profiting in Bull and Bear Markets, 1988) formalizes this: Stage 2 begins exactly when price breaks above a long base\'s resistance.',
    inApp: 'The 52-Week Range column on the Compare page is a direct map of where major support (the 52W low) and resistance (the 52W high) currently sit. A stock near its 52W low with RSI under 30 is sitting on a confluence of major support — historically the highest-quality DCA accumulation zone. A stock pressing against its 52W high (90%+ of range) is at major resistance — useful context to size your current buy lighter and wait for a confirmed breakout with volume before adding more.',
    visual: null,
  },

  // ── Core Concepts ─────────────────────────────────────────────────────────────

  {
    key: 'bull-bear',
    term: 'Bull Market, Bear Market & Correction',
    cat: 'Concept',
    def: 'A Bull Market is a sustained rise of 20%+ from a recent low, typically lasting months to years and driven by rising earnings, economic expansion, and investor optimism. A Bear Market is a sustained decline of 20%+ from a recent high — Wall Street\'s official threshold. A Correction is a shorter, shallower pullback of 10–19%. On average, corrections happen every 12–18 months; bear markets occur every 3–5 years. Since 1928, the S&P 500 has experienced 27 bear markets but still delivered ~10% average annual returns — because it recovered from every single one. DCA investors accumulate more shares per dollar during bear markets and corrections, compressing cost basis for the eventual recovery.',
    inApp: 'DCA Anchor\'s Fear & Greed Index is one of the earliest cycle-shift signals — sustained readings below 30 during drawdowns often precede recoveries. The Composite Score rises automatically in bear market conditions (RSI low + F&G fear + price below 200 SMA) — exactly when long-term DCA investors should be deploying maximum capital. Never pause your DCA schedule during a correction. Statistically, the 12 months following bear market lows produce the highest returns of any 12-month window.',
    visual: null,
  },
  {
    key: 'compounding',
    term: 'Compounding',
    cat: 'Concept',
    def: 'Compounding is the process where investment returns generate their own returns over time — interest on interest, gains on gains. The formula: Future Value = P × (1 + r)^t. A $10,000 investment at 10% annual return over 10 years → $25,937. Over 20 years → $67,275. Over 30 years → $174,494. The two variables that dominate outcomes are time in market and return rate — which is why starting early beats starting large, and why cost basis matters so much. Every percentage point of lower cost basis from well-timed DCA buys compounds forward for decades. John Bogle (The Little Book of Common Sense Investing) called compounding "the magic of investing" and dedicated his career to helping ordinary investors access it through low-cost index funds.',
    inApp: 'Compounding is the entire reason DCA exists at scale. Every reinvested dividend and every buy that catches a low point compounds forward for years. DCA Anchor\'s scoring system is ultimately about improving your average cost basis — the lower your cost basis, the greater the compounding effect on every dollar invested. A single "Load the Boat" entry at a major market low can compound at 3–5× the rate of the same amount invested at a peak. Time in market always beats timing the market — but better timing of your scheduled buys accelerates the compounding curve.',
    visual: null,
  },
  {
    key: 'cost-basis',
    term: 'Cost Basis & Average Cost',
    cat: 'Concept',
    def: 'Your cost basis is the total amount invested divided by the units held — your average purchase price per share or coin. DCA\'s core advantage is producing a cost basis below the simple arithmetic mean of prices during the investment period, because you automatically acquire more units at lower prices and fewer at higher prices. A lower cost basis means profitability is reached sooner, drawdowns are shallower in percentage terms, and the eventual recovery delivers higher returns. Tracking cost basis is essential for tax purposes (capital gains = sale price − cost basis) and for evaluating whether a DCA strategy is actually working.',
    inApp: 'Cost basis is the number DCA Anchor\'s entire system is designed to improve. Every score, every RSI alert, and every F&G signal is asking: is this moment better or worse than average to add? Buying when RSI is below 30 and Fear & Greed is in fear territory systematically produces a lower average cost basis than calendar-only buying. Track your actual average cost in your brokerage account — then compare it to the asset\'s 200-day SMA. If your cost basis is below the 200-day, you\'ve accumulated well. If it\'s above, the next period of RSI weakness is your opportunity to rebalance lower.',
    visual: null,
  },
  {
    key: 'rebalancing',
    term: 'Rebalancing',
    cat: 'Concept',
    def: 'Rebalancing means restoring your portfolio to its intended allocation weights after market movements have caused drift. A portfolio targeting 60% equities / 30% crypto / 10% bonds might drift to 75% equities after a bull run — rebalancing sells some equities and buys the underweighted positions. Annual rebalancing has historically improved risk-adjusted returns by forcing "buy low, sell high" systematically. Tax-efficient rebalancing uses new cash (DCA inflows) to buy underweighted positions rather than selling overweighted ones — no taxable event triggered. This method works best when one or two positions have significantly outperformed.',
    inApp: 'Use DCA Anchor\'s Holdings table to spot allocation drift. When a position\'s Composite Score is low (overbought RSI, high F&G, elevated P/E) AND it has grown to dominate your portfolio value, your next DCA buy is better directed toward underweighted positions with stronger signals. This mechanically rebalances toward value without selling — no taxes, no missed compounding. The F&G score on every holding also helps: deploying DCA into fear-rated holdings while greedy ones sit is tax-efficient rebalancing in practice.',
    visual: null,
  },
  {
    key: 'weinstein',
    term: 'Weinstein Stage Analysis',
    cat: 'Concept',
    def: 'Developed by Stan Weinstein in Secrets for Profiting in Bull and Bear Markets (1988), Stage Analysis categorizes every stock into one of four phases using the 30-week SMA as the axis. Stage 1 (Accumulation): flat, sideways base after a decline — smart money quietly buying while retail gives up. Stage 2 (Advancing): price breaks above Stage 1 resistance and trends up on the right side of the 30W SMA — the only stage Weinstein recommends buying in. Stage 3 (Distribution): plateau, volume-based selling begins, 30W SMA flattens — institutional selling into retail optimism. Stage 4 (Declining): price falls below a declining 30W SMA — avoid entirely until Stage 1 resets. "The bigger the base, the higher in space."',
    inApp: 'The 200-day SMA chip in DCA Anchor is a simplified Stage Analysis read. Price above 200 SMA (green chip) = likely Stage 2. Price below (red chip) = possibly Stage 3 or 4. When a holding shows a red 200 SMA chip but RSI is below 25 and Fear & Greed is in extreme fear, it may be in late Stage 4 transitioning to Stage 1 — historically a powerful long-term DCA accumulation window. Watch for the 200 SMA chip to flip green while the 72 EMA chip also turns green — that double-flip is close to what Weinstein calls a Stage 2 breakout confirmation.',
    visual: null,
  },
  {
    key: 'market-cap-tiers',
    term: 'Market Cap Tiers',
    cat: 'Concept',
    def: 'Market cap = Share Price × Shares Outstanding. It measures a company\'s total market value. The tiers: Mega-cap (>$200B) — AAPL, MSFT, NVDA — most liquid, slowest growth, highest stability. Large-cap ($10B–$200B) — established leaders in major sectors. Mid-cap ($2B–$10B) — often the "sweet spot" combining growth potential with relative stability. Small-cap ($250M–$2B) — higher growth ceiling, higher volatility, less analyst coverage. Micro-cap (<$250M) — speculative, thin liquidity, very high risk. In general: smaller cap = more volatility, more potential upside, and lower liquidity. Institutional investors can\'t easily move in and out of small-caps, so retail investors have an edge in that space.',
    inApp: 'The Market Cap column on the Compare page lets you see, at a glance, whether you\'re comparing assets in the same volatility tier. Comparing AAPL (mega-cap) to a mid-cap tech stock with the same RSI score isn\'t apples-to-apples — the smaller company will exhibit far larger RSI swings and more extreme Composite Scores. As a DCA rule of thumb: large-cap and mega-cap holdings can absorb larger DCA allocations (more predictable recovery trajectories); mid and small-cap should be sized smaller regardless of signal strength.',
    visual: null,
  },

  // ── Fundamental Analysis ──────────────────────────────────────────────────────

  {
    key: 'intrinsic-value',
    term: 'Intrinsic Value',
    cat: 'Fundamental',
    def: 'Intrinsic value is the calculated true worth of a company based on its fundamentals — earnings, cash flows, assets, and growth rate — independent of what the market currently prices it at. Formalized by Benjamin Graham in Security Analysis (1934) and The Intelligent Investor (1949). Graham\'s formula: V = EPS × (8.5 + 2g), where 8.5 is the P/E for a zero-growth company and g is the expected 5-year growth rate. If intrinsic value is $80 and the stock trades at $50, it\'s undervalued. If it trades at $120, you\'re paying a premium with no margin of safety. The concept is the foundation of value investing and directly informs when DCA adds the most long-term value.',
    inApp: 'DCA Anchor uses Forward P/E as a proxy for relative valuation — a low F/PE suggests the market is pricing the stock cheaply relative to expected earnings, which correlates with intrinsic value opportunity. The Composite Score\'s F/PE component (< 20 = +1 to score) is a simplified intrinsic value signal. When F/PE is low, RSI is low, and price is below the 200 SMA simultaneously, the market price is most likely to be below intrinsic value — the exact setup long-term DCA investors want to accumulate into aggressively.',
    visual: null,
  },
  {
    key: 'margin-of-safety',
    term: 'Margin of Safety',
    cat: 'Fundamental',
    def: 'Coined by Benjamin Graham, the margin of safety is the gap between a stock\'s intrinsic value and its current market price, expressed as a percentage. If intrinsic value is $100 and the price is $65, the margin of safety is 35%. This buffer protects against errors in valuation models, unexpected bad news, and general market downturns. Graham recommended a minimum 20–30% margin of safety before buying any stock. Warren Buffett called it "the three most important words in investing." The larger the margin, the lower the probability of permanent capital loss even if your valuation is somewhat wrong. It\'s the core principle separating investing from speculation.',
    inApp: 'DCA Anchor builds margin of safety logic indirectly into the Composite Score. A score of 8–10 requires multiple simultaneous signals of undervaluation — low RSI, fear sentiment, depressed F/PE, and price below key moving averages. When all align, you\'re likely buying with a meaningful margin of safety. A score below 4 with overbought RSI and elevated P/E is the opposite: the margin of safety has eroded — the market is pricing in optimism, leaving little cushion. Use Load the Boat entries (score 8–10) as your highest-margin-of-safety moments.',
    visual: null,
  },
  {
    key: 'pb-ratio',
    term: 'Price-to-Book (P/B) Ratio',
    cat: 'Fundamental',
    def: 'P/B = Current Share Price ÷ Book Value per Share. Book value = Total Assets − Total Liabilities — what shareholders would theoretically receive if the company liquidated everything today. A P/B below 1.0 means you\'re paying less than the company\'s stated net asset value — historically a strong value signal. Benjamin Graham required P/B below 1.2 for his defensive investor screen. P/B is less meaningful for asset-light businesses (software, platforms) where most value lies in intangibles, brand, and IP — NVDA and MSFT trade at 20–30× book legitimately. Most useful for banks, insurers, industrials, and utilities where assets are tangible.',
    inApp: 'DCA Anchor doesn\'t display P/B directly, but it\'s worth checking before committing to a long-term DCA position in any single stock. For value-oriented holdings (banks, ETFs, dividend stocks), a P/B below 1.5 combined with a strong Composite Score (RSI < 30, low F/PE) creates a powerful three-signal convergence: momentum undervaluation, earnings undervaluation, and asset undervaluation simultaneously. Check P/B via Yahoo Finance\'s Statistics tab. For crypto assets, P/B is not applicable — there are no balance sheet assets.',
    visual: null,
  },
  {
    key: 'fcf',
    term: 'Free Cash Flow (FCF)',
    cat: 'Fundamental',
    def: 'FCF = Operating Cash Flow − Capital Expenditures. It\'s the actual cash a business generates after funding its own operations and growth — what Warren Buffett calls "owner\'s earnings." Positive FCF means the company can fund dividends, share buybacks, debt repayment, or acquisitions without issuing new shares or borrowing. Negative FCF is acceptable for high-growth companies investing aggressively in expansion (Amazon ran negative FCF for years), but sustained negative FCF without a credible path to positive is a red flag. FCF is harder to manipulate than net earnings — accounting choices can dress up earnings while cash is more objective. FCF Yield = FCF ÷ Market Cap. Above 5% is generally attractive.',
    inApp: 'DCA Anchor uses Forward P/E — an earnings-based metric — as its primary fundamental signal. FCF is the deeper sanity check. Before building a significant long-term DCA position in any single stock, verify positive FCF via Yahoo Finance\'s Cash Flow statement. A stock with a Composite Score of 7+ AND positive FCF yield above 4% is a stronger setup than the score alone suggests. A low Composite Score driven by a low P/E but with persistently negative FCF may be a value trap — the earnings look cheap because the company is burning cash to sustain them.',
    visual: null,
  },
  {
    key: 'debt-equity',
    term: 'Debt-to-Equity (D/E) Ratio',
    cat: 'Fundamental',
    def: 'D/E = Total Liabilities ÷ Shareholders\' Equity. It measures how much of a company\'s financing comes from debt versus equity. Below 1.0: more equity than debt — conservatively financed, lower bankruptcy risk. 1–2: moderate leverage — common in capital-intensive industries. Above 3.0: high leverage — the company is significantly dependent on debt to operate. High-D/E companies are most vulnerable when interest rates rise (debt service costs spike) or revenues decline (can\'t service obligations). Sectors like utilities and REITs legitimately carry higher D/E due to stable, predictable cash flows that justify the leverage. Benjamin Graham required debt-to-current-assets below 1.1 for his defensive stock screen.',
    inApp: 'DCA Anchor doesn\'t display D/E, but it\'s an important risk filter before building a long-term DCA position in cyclical industries. As a rule of thumb: if a holding has D/E above 3.0 and operates in a volatile sector (retail, airlines, energy), DCA Anchor\'s WAIT signals deserve extra weight — a leveraged company in a downturn can enter a debt spiral fast. Conversely, a company with D/E below 0.5 and a strong Composite Score has a protective fortress balance sheet — better able to weather the downturns your DCA schedule will naturally include.',
    visual: null,
  },
  {
    key: 'eps',
    term: 'EPS & EPS Growth',
    cat: 'Fundamental',
    def: 'EPS (Earnings Per Share) = Net Income ÷ Shares Outstanding. It tells you the profit generated per share. Forward EPS is the analyst-consensus estimate for the next 12 months — this is what your Forward P/E is calculated from (F/PE = Price ÷ Forward EPS). EPS Growth is the rate of change year-over-year. William O\'Neil\'s CANSLIM framework (How to Make Money in Stocks) requires 25%+ quarterly EPS growth vs. the prior year quarter and 25%+ annual EPS growth for 3+ consecutive years as a prerequisite for any growth stock investment. Benjamin Graham required positive EPS for 10+ consecutive years for defensive stock qualification. Accelerating EPS growth — where the growth rate itself is rising — is historically the most powerful fundamental setup.',
    inApp: 'Forward EPS is the hidden driver behind the F/PE column in DCA Anchor. When a stock\'s F/PE drops sharply — from 30× to 18× — it can mean either the price fell or analyst EPS estimates rose. Rising estimates into a falling price is one of the best DCA setups: the market is pricing in fear while analysts see improving earnings. Check EPS estimate revisions on Yahoo Finance or Seeking Alpha before your next scheduled buy. An upward revision trend paired with a Composite Score above 7 is the kind of fundamental + technical alignment that produces outsized long-term DCA returns.',
    visual: null,
  },
];

const CATS = ['All', 'Indicator', 'Signal', 'Rule', 'Concept', 'Moving Averages', 'Fundamental'];

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
            { label: 'Wait', pct: 30, color: '#EF4444' },
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
  'Moving Averages': '#F97316',
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
        <title>Glossary — DCA Anchor</title>
        <meta name="description" content="Plain-English definitions of every metric in DCA Anchor"/>
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
            <b style={{ color: theme.text2 }}>Data sources.</b> RSI and price data from Yahoo Finance. Fear &amp; Greed Index from CNN/Alternative.me. Forward P/E from analyst consensus via Yahoo Finance. Moving average data (72 EMA, 200 SMA) calculated server-side from Yahoo Finance price history. Composite Score formula is open — no black box.{' '}
            <b style={{ color: theme.text2 }}>Nothing here is financial advice.</b>
          </div>

        </div>
      </div>
    </>
  );
}
