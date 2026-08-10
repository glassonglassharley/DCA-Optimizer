import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Owner-only brokerage connection — READ-ONLY PREVIEW.
 *
 * This panel connects, fetches, and displays. It writes nothing, anywhere:
 *
 *   - No access_token reaches the browser. The public_token goes straight to
 *     the server, which exchanges it in memory and discards it.
 *   - Nothing is written to Supabase. This flow deliberately does NOT call
 *     /api/plaid/import (or the mirror helpers behind it) — holdings are shown
 *     on screen and forgotten when the screen unmounts.
 *   - Nothing is written to localStorage.
 *
 * Every label is driven by `plaidEnv` rather than hardcoded. This panel once
 * promised "fake test accounts, never real money", which stops being true the
 * moment PLAID_ENV is production — so the environment decides what the user is
 * told, and an unknown environment falls back to the real-account wording
 * rather than the reassuring one.
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

export default function PlaidSandboxPanel({ theme, registerOpen, plaidEnv }) {
  const [status, setStatus] = useState('idle'); // idle | linking | loading | done | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const handlerRef = useRef(null);

  // Only sandbox gets the reassuring copy; anything else — including an
  // environment we could not read — is described as a real account.
  const isSandbox = plaidEnv === 'sandbox';
  const envKnown = typeof plaidEnv === 'string' && plaidEnv.length > 0;

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
        // The only thing that happens on success is a read: fetch and display.
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
  const untickered = (result?.holdings || []).filter(h => !h.symbol).length;

  return (
    <div ref={rootRef} style={{ padding: '0 16px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', color: theme.text3, padding: '4px 4px 8px' }}>
        BROKERAGE
      </div>

      <div style={{ padding: 16, borderRadius: 14, background: theme.card, border: `1px dashed ${theme.line2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          {envKnown && (
            <span style={{
              fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', padding: '3px 7px', borderRadius: 999,
              whiteSpace: 'nowrap',
              background: isSandbox ? 'rgba(245,158,11,.14)' : 'rgba(16,185,129,.14)',
              color: isSandbox ? '#F59E0B' : '#10B981',
              border: `1px solid ${isSandbox ? 'rgba(245,158,11,.4)' : 'rgba(16,185,129,.4)'}`,
            }}>{isSandbox ? 'SANDBOX' : 'LIVE ACCOUNT'}</span>
          )}
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em', padding: '3px 7px', borderRadius: 999,
            whiteSpace: 'nowrap', color: theme.text3, background: theme.pillBg,
            border: `1px solid ${theme.line2}`,
          }}>READ-ONLY</span>
          <div style={{ fontSize: 13, color: theme.text, fontWeight: 700 }}>Connect a brokerage</div>
        </div>

        <div style={{ fontSize: 11.5, color: theme.text3, lineHeight: 1.5, marginBottom: 12 }}>
          {isSandbox ? (
            <>Connects to Plaid&apos;s <b style={{ color: theme.text2 }}>sandbox</b> — fake test accounts, never real money.</>
          ) : (
            <>Connects to your <b style={{ color: theme.text2 }}>real brokerage account</b> through Plaid.</>
          )}{' '}
          This is a <b style={{ color: theme.text2 }}>read-only preview</b>: holdings are fetched once and shown below,
          and <b style={{ color: theme.text2 }}>nothing is saved</b> — not to your portfolios, not to the database.
          No credentials are kept either; the access token is used server-side and discarded, so reconnecting is
          needed to look again. Leaving this screen clears the list.
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
          {status === 'linking' ? 'Opening Plaid…' : status === 'loading' ? 'Fetching holdings…' : 'Connect brokerage'}
        </button>

        {error && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: '#F87171', lineHeight: 1.45 }}>{error}</div>
        )}

        {status === 'done' && result && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.text }}>
                {result.holdings.length} holding{result.holdings.length === 1 ? '' : 's'}
              </div>
              <div style={{ fontSize: 10.5, color: theme.text3 }}>
                across {result.accounts} account{result.accounts === 1 ? '' : 's'} · not saved
              </div>
            </div>

            {result.holdings.length === 0 ? (
              <div style={{ fontSize: 11.5, color: theme.text3 }}>This account reported no investment holdings.</div>
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
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.text2, whiteSpace: 'nowrap' }}>{fmt(h.quantity, 2)}</span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.text3, whiteSpace: 'nowrap' }}>{fmt(h.costBasis)}</span>
                    <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: theme.text, whiteSpace: 'nowrap' }}>{fmt(h.value)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 8, fontSize: 10.5, color: theme.text3, lineHeight: 1.45 }}>
              Cost is the position total as Plaid reports it, not per share.
              {untickered > 0 ? ` ${untickered} position${untickered === 1 ? '' : 's'} had no ticker symbol.` : ''}{' '}
              These holdings are a preview only — they are not part of your portfolios and are not scored.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
