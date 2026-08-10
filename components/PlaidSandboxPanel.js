import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Experimental sandbox-only brokerage preview.
 *
 * Read-only by construction: the public_token goes straight to the server,
 * which exchanges it in memory and returns holdings. Nothing here writes to
 * localStorage, and no access_token ever reaches the browser — the client only
 * ever sees a short-lived link_token and the resulting holdings.
 */

const LINK_SRC = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';

/** Loads Plaid Link on demand so the script is not pulled on every page view. */
function loadPlaidLink() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.Plaid) return Promise.resolve(window.Plaid);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${LINK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Plaid));
      existing.addEventListener('error', () => reject(new Error('Could not load Plaid Link.')));
      return;
    }
    const s = document.createElement('script');
    s.src = LINK_SRC;
    s.async = true;
    s.onload = () => resolve(window.Plaid);
    s.onerror = () => reject(new Error('Could not load Plaid Link.'));
    document.head.appendChild(s);
  });
}

const fmt = (v, digits = 2) =>
  v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function PlaidSandboxPanel({ theme, registerOpen, activePortfolioName }) {
  const [status, setStatus] = useState('idle'); // idle | linking | loading | done | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const handlerRef = useRef(null);

  // Plaid's handler holds an iframe; tear it down if the screen unmounts mid-flow.
  useEffect(() => () => { try { handlerRef.current?.destroy?.(); } catch {} }, []);

  const fetchHoldings = useCallback(async (publicToken) => {
    setStatus('loading');
    try {
      const r = await fetch('/api/plaid/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || d.error || 'Could not fetch holdings.');
      setResult(d);
      setStatus('done');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setResult(null);
    setStatus('linking');
    try {
      const tokenRes = await fetch('/api/plaid/link-token', { method: 'POST' });
      const tokenData = await tokenRes.json().catch(() => ({}));
      if (!tokenRes.ok) throw new Error(tokenData.message || tokenData.error || 'Could not create a link token.');

      const Plaid = await loadPlaidLink();
      handlerRef.current = Plaid.create({
        token: tokenData.link_token,
        onSuccess: (publicToken) => { fetchHoldings(publicToken); },
        onExit: (err) => {
          if (err) setError(err.display_message || err.error_message || 'Link cancelled.');
          setStatus(s => (s === 'linking' ? 'idle' : s));
        },
      });
      handlerRef.current.open();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [fetchHoldings]);

  // Lets the dashboard's contextual buttons drive this same flow instead of
  // each one owning a duplicate Link handler and its own result list.
  const rootRef = useRef(null);
  useEffect(() => {
    if (!registerOpen) return;
    registerOpen(() => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      start();
    });
    return () => registerOpen(null);
  }, [registerOpen, start]);

  const busy = status === 'linking' || status === 'loading';

  return (
    <div ref={rootRef} style={{ padding: '0 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: theme.text3, padding: '4px 4px 8px' }}>
        BROKERAGE (EXPERIMENTAL)
      </div>

      <div style={{ padding: 16, borderRadius: 14, background: theme.card, border: `1px dashed ${theme.line2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', padding: '3px 7px', borderRadius: 999,
            background: 'rgba(245,158,11,.14)', color: '#F59E0B', border: '1px solid rgba(245,158,11,.4)',
          }}>SANDBOX</span>
          <div style={{ fontSize: 13, color: theme.text, fontWeight: 700 }}>Link a brokerage</div>
        </div>

        <div style={{ fontSize: 11.5, color: theme.text3, lineHeight: 1.5, marginBottom: 12 }}>
          Connects to Plaid&apos;s <b style={{ color: theme.text2 }}>sandbox</b> only — fake test accounts, never real money.
          Holdings are fetched once and shown below. <b style={{ color: theme.text2 }}>Nothing is saved</b>: the access token
          is used server-side and discarded, and no holdings are written to the database. Leaving this screen clears them.
        </div>

        <button
          onClick={start}
          disabled={busy}
          style={{
            width: '100%', height: 42, borderRadius: 12, border: 'none',
            background: busy ? theme.pillBg : `linear-gradient(135deg, ${theme.brand}, ${theme.brand2})`,
            color: busy ? theme.text3 : '#fff', fontWeight: 700, fontSize: 13,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {status === 'linking' ? 'Opening Plaid…' : status === 'loading' ? 'Fetching holdings…' : 'Link brokerage (sandbox)'}
        </button>

        {error && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: '#F87171', lineHeight: 1.45 }}>{error}</div>
        )}

        {status === 'done' && result && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>
                {result.holdings.length} holding{result.holdings.length === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: 10.5, color: theme.text3 }}>
                across {result.accounts} account{result.accounts === 1 ? '' : 's'} · not saved
              </div>
            </div>

            {result.holdings.length === 0 ? (
              <div style={{ fontSize: 11.5, color: theme.text3 }}>This sandbox account reported no investment holdings.</div>
            ) : (
              <div style={{ border: `1px solid ${theme.line}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 64px 84px 84px', gap: 6, padding: '7px 10px', background: theme.bg2, fontSize: 9, fontWeight: 700, letterSpacing: '.08em', color: theme.text3 }}>
                  <span>SECURITY</span><span style={{ textAlign: 'right' }}>QTY</span>
                  <span style={{ textAlign: 'right' }}>COST</span><span style={{ textAlign: 'right' }}>VALUE</span>
                </div>
                {result.holdings.map((h, i) => (
                  <div key={`${h.symbol || h.name}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1.5fr 64px 84px 84px', gap: 6, padding: '9px 10px', borderTop: `1px solid ${theme.line}`, fontSize: 11.5, alignItems: 'center' }}>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ color: theme.text, fontFamily: 'var(--font-mono)' }}>{h.symbol || '—'}</b>
                      <span style={{ display: 'block', fontSize: 10, color: theme.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.name}{h.account ? ` · ${h.account}` : ''}
                      </span>
                    </span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.text2 }}>{fmt(h.quantity, 2)}</span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.text3 }}>{fmt(h.costBasis)}</span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.text }}>{fmt(h.value)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 8, fontSize: 10.5, color: theme.text3, lineHeight: 1.45 }}>
              Sandbox test data from Plaid. Cost is the position total as Plaid reports it, not per share.
              These holdings are not part of your portfolios and are not scored.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
