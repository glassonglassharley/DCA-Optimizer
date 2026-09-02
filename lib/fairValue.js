// Fair Value estimation layer for DCA Anchor.
//
// This file is deliberately separate from the DCA Score model. Nothing here is
// read by scoreAsset(), SCORE_WEIGHTS, rankings, ratings, sorting, or signal
// coverage. The current entries are explicit demo estimates only; assets without
// a real/demo model return unavailable rather than deriving a fake fair value
// from current market price.

export const FAIR_VALUE_STATUSES = {
  DEEP_VALUE: 'DEEP VALUE',
  UNDERVALUED: 'UNDERVALUED',
  FAIR_VALUE: 'FAIR VALUE',
  OVERVALUED: 'OVERVALUED',
  EXPENSIVE: 'EXPENSIVE',
};

export const FAIR_VALUE_THRESHOLDS = [
  { status: FAIR_VALUE_STATUSES.DEEP_VALUE, maxDeviation: -25 },
  { status: FAIR_VALUE_STATUSES.UNDERVALUED, maxDeviation: -8 },
  { status: FAIR_VALUE_STATUSES.FAIR_VALUE, maxDeviation: 8 },
  { status: FAIR_VALUE_STATUSES.OVERVALUED, maxDeviation: 25 },
  { status: FAIR_VALUE_STATUSES.EXPENSIVE, maxDeviation: Infinity },
];

const DEMO_SOURCE = 'demo';

// Explicit demo data by asset model family. These are placeholders for future
// model/API outputs, not formulas. Keep additions intentional and source-tagged.
const DEMO_EQUITY_ESTIMATES = {
  AAPL: { fairValue: 205, confidence: 78, methodology: 'Earnings + Historical Multiple' },
  MSFT: { fairValue: 495, confidence: 76, methodology: 'Earnings + Historical Multiple' },
  NVDA: { fairValue: 160, confidence: 68, methodology: 'Earnings + Historical Multiple' },
  COST: { fairValue: 940, confidence: 64, methodology: 'Earnings + Historical Multiple' },
  V: { fairValue: 345, confidence: 74, methodology: 'Earnings + Historical Multiple' },
  GOOGL: { fairValue: 220, confidence: 75, methodology: 'Earnings + Historical Multiple' },
  META: { fairValue: 690, confidence: 70, methodology: 'Earnings + Historical Multiple' },
};

const DEMO_ETF_ESTIMATES = {
  QQQ: { fairValue: 575, confidence: 63, methodology: 'ETF Holdings Valuation' },
  XLV: { fairValue: 162, confidence: 66, methodology: 'ETF Holdings Valuation' },
  DIVO: { fairValue: 44, confidence: 61, methodology: 'ETF Holdings Valuation' },
  IBIT: { fairValue: 72, confidence: 58, methodology: 'ETF Holdings Valuation' },
};

const DEMO_CRYPTO_ESTIMATES = {
  BTC: { fairValue: 135000, confidence: 57, methodology: 'BTC On-Chain + Macro' },
  'BTC-USD': { fairValue: 135000, confidence: 57, methodology: 'BTC On-Chain + Macro' },
};

const DEMO_COMMODITY_ESTIMATES = {
  GLD: { fairValue: 315, confidence: 60, methodology: 'Commodity NAV + Real Rates Proxy' },
};

function normalizeSymbol(sym) {
  return typeof sym === 'string' ? sym.trim().toUpperCase() : '';
}

function finiteNumber(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function statusForDeviation(deviationPercent) {
  return FAIR_VALUE_THRESHOLDS.find(t => deviationPercent <= t.maxDeviation)?.status || FAIR_VALUE_STATUSES.FAIR_VALUE;
}

function modelForHolding(holding = {}) {
  const sym = normalizeSymbol(holding.sym || holding.symbol);
  const tag = normalizeSymbol(holding.tag);

  if (DEMO_CRYPTO_ESTIMATES[sym]) return DEMO_CRYPTO_ESTIMATES[sym];
  if (tag === 'CRYPTO') return null;

  if (DEMO_COMMODITY_ESTIMATES[sym]) return DEMO_COMMODITY_ESTIMATES[sym];
  if (tag === 'HEDGE') return null;

  if (DEMO_ETF_ESTIMATES[sym]) return DEMO_ETF_ESTIMATES[sym];
  if (tag === 'ETF' || tag === 'INCOME') return null;

  if (DEMO_EQUITY_ESTIMATES[sym]) return DEMO_EQUITY_ESTIMATES[sym];
  if (tag === 'STOCK' || tag === 'TECH') return null;

  return null;
}

export function getFairValueEstimate(holding = {}) {
  const currentPrice = finiteNumber(holding.price ?? holding.currentPrice);
  const estimate = modelForHolding(holding);

  if (!estimate) {
    return {
      available: false,
      currentPrice,
      reason: 'No valuation model available',
    };
  }

  const fairValue = finiteNumber(estimate.fairValue);
  if (fairValue == null || fairValue <= 0 || currentPrice == null || currentPrice <= 0) {
    return {
      available: false,
      currentPrice,
      reason: currentPrice == null ? 'Current price unavailable' : 'No valuation model available',
    };
  }

  const deviationPercent = ((currentPrice / fairValue) - 1) * 100;
  const roundedDeviation = Math.round(deviationPercent * 10) / 10;

  return {
    available: true,
    fairValue,
    currentPrice,
    deviationPercent: roundedDeviation,
    marginOfSafety: roundedDeviation < 0 ? Math.abs(roundedDeviation) : 0,
    status: statusForDeviation(roundedDeviation),
    confidence: Math.max(0, Math.min(100, Math.round(estimate.confidence))),
    methodology: estimate.methodology,
    sourceType: DEMO_SOURCE,
  };
}
