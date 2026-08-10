import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * The log flow — a bottom sheet that turns the assistant's ranked amounts into a
 * recorded contribution.
 *
 * Purely presentational: it owns the in-progress edits and nothing else. It does
 * not know whether the result will be written to Supabase or to localStorage,
 * which is what lets the signed-in and guest paths share one screen.
 *
 * Mount it conditionally rather than toggling a prop — unmounting is what resets
 * the draft, so reopening never resurrects a half-edited entry.
 */

/**
 * Today in the user's own timezone.
 *
 * toISOString() would give the UTC day, which is already tomorrow for anyone
 * west of Greenwich in the evening — logging an contribution on the 9th at 5pm PT
 * would file it under the 10th and land it in the wrong month of the cumulative
 * view.
 */
function todayLocal() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const money = (n) =>
    Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Digits and a single decimal point; empty stays empty so the field can be cleared. */
function cleanAmountInput(raw) {
    const only = String(raw).replace(/[^0-9.]/g, '');
    const parts = only.split('.');
    return parts.length <= 2 ? only : `${parts[0]}.${parts.slice(1).join('')}`;
}

export default function ContributionSheet({
    theme,
    rows = [],
    portfolios = [],
    activePortfolioId = null,
    submitting = false,
    error = null,
    onSubmit,
    onClose,
}) {
    const [lines, setLines] = useState(() =>
        rows.map(r => ({
            symbol: r.symbol,
            amount: r.amount == null ? '' : String(r.amount),
            price: r.price ?? null,
        }))
    );
    const [portfolioId, setPortfolioId] = useState(activePortfolioId || '');
    const [date, setDate] = useState(todayLocal);
    const [note, setNote] = useState('');
    const [noteOpen, setNoteOpen] = useState(false);

    // A sheet that traps the user is worse than one that closes too easily.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, submitting]);

    const total = useMemo(
        () => lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
        [lines]
    );

    const setAmount = useCallback((symbol, raw) => {
        const next = cleanAmountInput(raw);
        setLines(ls => ls.map(l => (l.symbol === symbol ? { ...l, amount: next } : l)));
    }, []);

    const removeLine = useCallback((symbol) => {
        setLines(ls => ls.filter(l => l.symbol !== symbol));
    }, []);

    const fundable = lines.filter(l => (Number(l.amount) || 0) > 0);
    const canSave = !submitting && fundable.length > 0 && total > 0;

    const submit = () => {
        if (!canSave) return;
        onSubmit?.({
            portfolioId: portfolioId || null,
            loggedAt: date,
            note: note.trim() || null,
            items: fundable.map(l => ({
                symbol: l.symbol,
                amountUsd: Number(l.amount),
                // The price the user was actually looking at when they logged.
                // Null is honest and stays null — history renders it as
                // "Price not recorded" rather than inventing a zero.
                priceAtLog: l.price ?? null,
            })),
        });
    };

    return (
        <div className="dca-sheet" role="dialog" aria-modal="true" aria-label="Log contribution">
            <div
                onClick={() => { if (!submitting) onClose?.(); }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(2,6,23,.68)', backdropFilter: 'blur(4px)' }}
            />

            <div className="dca-sheet-panel" style={{ background: '#0B1020', color: theme.text, border: `1px solid ${theme.line2}` }}>
                {/* Pinned header: title + live running total. */}
                <div style={{ flex: '0 0 auto', padding: '14px 16px 12px', borderBottom: `1px solid ${theme.line}`, background: `linear-gradient(135deg, ${theme.brand}14, transparent 58%)` }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: theme.brand, textTransform: 'uppercase' }}>Contribution</div>
                            <div style={{ marginTop: 3, fontSize: 19, fontWeight: 800, letterSpacing: '-.03em' }}>Log contribution</div>
                        </div>
                        <button
                            onClick={() => { if (!submitting) onClose?.(); }}
                            aria-label="Close"
                            style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line2}`, background: theme.pillBg, color: theme.text2, cursor: 'pointer', fontSize: 16, lineHeight: 1, flex: '0 0 auto' }}
                        >×</button>
                    </div>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 10.5, color: theme.text3, letterSpacing: '.08em', fontWeight: 700 }}>TOTAL</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 900, color: theme.text, letterSpacing: '-.02em' }}>${money(total)}</span>
                        <span style={{ fontSize: 10.5, color: theme.text3, marginLeft: 'auto' }}>
                            {fundable.length} ticker{fundable.length === 1 ? '' : 's'}
                        </span>
                    </div>
                </div>

                {/* Scrolling middle. */}
                <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '12px 16px 16px', display: 'grid', gap: 10, alignContent: 'start' }}>
                    {lines.length === 0 ? (
                        <div style={{ fontSize: 12, color: theme.text3, padding: '10px 2px' }}>
                            Every ticker was removed. Close and start again to log a contribution.
                        </div>
                    ) : lines.map(l => (
                        <div key={l.symbol} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 116px 34px', gap: 8, alignItems: 'center', background: theme.bg2, borderRadius: 12, padding: '9px 10px' }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, fontWeight: 800, color: theme.text }}>{l.symbol}</div>
                                <div style={{ marginTop: 2, fontSize: 10, color: theme.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {l.price != null ? `@ $${money(l.price)}` : 'Price not recorded'}
                                </div>
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, height: 40, borderRadius: 10, padding: '0 9px', background: theme.card, border: `1px solid ${theme.line}` }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: theme.text3 }}>$</span>
                                <input
                                    value={l.amount}
                                    onChange={e => setAmount(l.symbol, e.target.value)}
                                    inputMode="decimal"
                                    aria-label={`Amount for ${l.symbol}`}
                                    style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: theme.text, fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800 }}
                                />
                            </label>
                            <button
                                onClick={() => removeLine(l.symbol)}
                                aria-label={`Remove ${l.symbol}`}
                                style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${theme.line}`, background: theme.pillBg, color: theme.text3, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}
                            >×</button>
                        </div>
                    ))}

                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr', marginTop: 2 }}>
                        <label style={{ display: 'grid', gap: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: theme.text3 }}>ACCOUNT</span>
                            <select
                                value={portfolioId}
                                onChange={e => setPortfolioId(e.target.value)}
                                style={{ height: 42, borderRadius: 10, padding: '0 10px', background: theme.card, border: `1px solid ${theme.line}`, color: theme.text, fontSize: 13.5 }}
                            >
                                {portfolios.length === 0 && <option value="">No account</option>}
                                {portfolios.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </label>

                        <label style={{ display: 'grid', gap: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: theme.text3 }}>DATE</span>
                            <input
                                type="date"
                                value={date}
                                max={todayLocal()}
                                onChange={e => setDate(e.target.value)}
                                style={{ height: 42, borderRadius: 10, padding: '0 10px', background: theme.card, border: `1px solid ${theme.line}`, color: theme.text, fontSize: 13.5, fontFamily: 'var(--font-mono)' }}
                            />
                        </label>

                        {noteOpen ? (
                            <label style={{ display: 'grid', gap: 5 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: theme.text3 }}>NOTE (OPTIONAL)</span>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value.slice(0, 280))}
                                    rows={2}
                                    placeholder="Anything worth remembering about this one."
                                    style={{ borderRadius: 10, padding: '9px 10px', background: theme.card, border: `1px solid ${theme.line}`, color: theme.text, fontSize: 13, resize: 'vertical', fontFamily: 'var(--font-ui)' }}
                                />
                            </label>
                        ) : (
                            <button
                                onClick={() => setNoteOpen(true)}
                                style={{ justifySelf: 'start', background: 'none', border: 'none', padding: '2px 0', color: theme.text3, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                            >Add a note</button>
                        )}
                    </div>

                    {error && (
                        <div style={{ fontSize: 11.5, color: '#F87171', lineHeight: 1.45 }}>{error}</div>
                    )}

                    <div style={{ fontSize: 10.5, color: theme.text3, lineHeight: 1.45 }}>
                        This records what you contributed. DCA Anchor does not place orders and does not tell you what to buy.
                    </div>
                </div>

                {/* Pinned footer, within thumb reach. */}
                <div style={{ flex: '0 0 auto', padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)', borderTop: `1px solid ${theme.line}`, background: '#0B1020' }}>
                    <button
                        onClick={submit}
                        disabled={!canSave}
                        style={{
                            width: '100%', height: 46, borderRadius: 12, border: 'none',
                            background: canSave ? `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})` : theme.pillBg,
                            color: canSave ? '#fff' : theme.text3,
                            fontWeight: 800, fontSize: 14, cursor: canSave ? 'pointer' : 'not-allowed',
                        }}
                    >{submitting ? 'Saving…' : 'Save to history'}</button>
                </div>
            </div>
        </div>
    );
}
