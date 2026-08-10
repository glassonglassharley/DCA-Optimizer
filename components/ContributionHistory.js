import { useMemo, useState } from 'react';

/**
 * Recorded contributions: per-ticker totals, running average cost basis, and the
 * cumulative log.
 *
 * Everything here is derived at render time from the contribution list — nothing
 * is stored pre-aggregated. That is deliberate: a stored total would drift the
 * moment an entry is deleted, and the signed-in and guest paths would each need
 * their own way of keeping it honest. One pure summarize() over a plain array
 * serves both.
 */

const money = (n, digits = 2) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Rolls the log up.
 *
 * Average cost basis divides only the dollars that carried a price snapshot by
 * the shares those dollars bought. Amounts logged without a price contribute to
 * the total contributed but are excluded from the average, because folding them
 * in would divide real dollars by shares that were never estimated and quietly
 * understate the average.
 */
export function summarize(contributions) {
    const list = Array.isArray(contributions) ? contributions : [];
    const byTicker = new Map();
    let grandTotal = 0;

    for (const c of list) {
        for (const item of c.items || []) {
            const amount = Number(item.amountUsd) || 0;
            grandTotal += amount;

            const row = byTicker.get(item.symbol) || {
                symbol: item.symbol, totalUsd: 0, pricedUsd: 0, pricedShares: 0, entries: 0,
            };
            row.totalUsd += amount;
            row.entries += 1;

            const shares = Number(item.sharesEst);
            if (item.priceAtLog != null && Number.isFinite(shares) && shares > 0) {
                row.pricedUsd += amount;
                row.pricedShares += shares;
            }
            byTicker.set(item.symbol, row);
        }
    }

    const tickers = [...byTicker.values()]
        .map(r => ({
            ...r,
            avgCost: r.pricedShares > 0 ? r.pricedUsd / r.pricedShares : null,
        }))
        .sort((a, b) => b.totalUsd - a.totalUsd);

    // Oldest first so the running sum reads as growth over time.
    const chronological = [...list].sort((a, b) => String(a.loggedAt).localeCompare(String(b.loggedAt)));
    let running = 0;
    const cumulative = chronological.map(c => {
        const amount = (c.items || []).reduce((s, i) => s + (Number(i.amountUsd) || 0), 0);
        running += amount;
        return { id: c.id, loggedAt: c.loggedAt, note: c.note ?? null, items: c.items || [], amount, running };
    });

    return { tickers, cumulative, grandTotal, count: list.length };
}

function formatDay(iso) {
    if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '—';
    // Parsed as UTC and formatted in UTC so the stored calendar day is the day
    // shown — constructing a local Date from a bare date string would shift it
    // backwards for anyone west of Greenwich.
    const d = new Date(`${iso}T00:00:00Z`);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export default function ContributionHistory({ theme, contributions = [], portfolioNames = {}, onDelete, busy = false }) {
    const [expanded, setExpanded] = useState(false);
    const { tickers, cumulative, grandTotal, count } = useMemo(() => summarize(contributions), [contributions]);

    const recent = expanded ? [...cumulative].reverse() : [...cumulative].reverse().slice(0, 4);
    const maxRunning = cumulative.length ? cumulative[cumulative.length - 1].running : 0;

    return (
        <div style={{ padding: '0 16px' }}>
            <div style={{ padding: 16, borderRadius: 14, background: theme.card, border: `1px solid ${theme.line}` }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: theme.text }}>Your recorded DCAs</div>
                    {count > 0 && (
                        <div style={{ fontSize: 10.5, color: theme.text3 }}>
                            {count} contribution{count === 1 ? '' : 's'} · ${money(grandTotal)} total
                        </div>
                    )}
                </div>

                {count === 0 ? (
                    <div style={{ marginTop: 10, fontSize: 12, color: theme.text3, lineHeight: 1.5 }}>
                        No contributions logged yet. When you make a contribution, log it here to build your history.
                    </div>
                ) : (
                    <>
                        {/* Per-ticker totals and running average cost basis. */}
                        <div style={{ marginTop: 12, border: `1px solid ${theme.line}`, borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 92px 100px', gap: 6, padding: '7px 10px', background: theme.bg2, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: theme.text3 }}>
                                <span>TICKER</span>
                                <span style={{ textAlign: 'right' }}>CONTRIBUTED</span>
                                <span style={{ textAlign: 'right' }}>AVG COST</span>
                            </div>
                            {tickers.map(t => (
                                <div key={t.symbol} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 92px 100px', gap: 6, padding: '9px 10px', borderTop: `1px solid ${theme.line}`, fontSize: 11.5, alignItems: 'center' }}>
                                    <span style={{ minWidth: 0 }}>
                                        <b style={{ color: theme.text, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{t.symbol}</b>
                                        <span style={{ display: 'block', fontSize: 10, color: theme.text3 }}>
                                            {t.entries} entr{t.entries === 1 ? 'y' : 'ies'}
                                        </span>
                                    </span>
                                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.text, whiteSpace: 'nowrap' }}>${money(t.totalUsd)}</span>
                                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.avgCost == null ? theme.text3 : theme.text2, whiteSpace: 'nowrap', fontSize: t.avgCost == null ? 9.5 : 11.5 }}>
                                        {t.avgCost == null ? 'Price not recorded' : `$${money(t.avgCost)}`}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Cumulative log, newest first, with a proportional bar. */}
                        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                            {recent.map(entry => (
                                <div key={entry.id} style={{ background: theme.bg2, borderRadius: 10, padding: '9px 10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.text }}>{formatDay(entry.loggedAt)}</span>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 800, color: theme.text }}>${money(entry.amount)}</span>
                                        <span style={{ fontSize: 10, color: theme.text3 }}>running ${money(entry.running)}</span>
                                        {onDelete && (
                                            <button
                                                onClick={() => onDelete(entry.id)}
                                                disabled={busy}
                                                aria-label="Remove this contribution"
                                                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: theme.text3, fontSize: 10.5, cursor: busy ? 'default' : 'pointer', textDecoration: 'underline', padding: 0 }}
                                            >Remove</button>
                                        )}
                                    </div>
                                    <div style={{ marginTop: 6, height: 4, borderRadius: 999, background: theme.line, overflow: 'hidden' }}>
                                        <div style={{ width: `${maxRunning > 0 ? (entry.running / maxRunning) * 100 : 0}%`, height: '100%', background: `linear-gradient(90deg, ${theme.brand}, ${theme.brand2})` }}/>
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 10.5, color: theme.text3, lineHeight: 1.45 }}>
                                        {entry.items.map(i => `${i.symbol} $${money(i.amountUsd)}`).join(' · ')}
                                    </div>
                                    {entry.note && (
                                        <div style={{ marginTop: 4, fontSize: 10.5, color: theme.text2, fontStyle: 'italic' }}>{entry.note}</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {cumulative.length > 4 && (
                            <button
                                onClick={() => setExpanded(v => !v)}
                                style={{ marginTop: 10, background: 'none', border: 'none', color: theme.text3, fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                            >{expanded ? 'Show less' : `Show all ${cumulative.length}`}</button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
