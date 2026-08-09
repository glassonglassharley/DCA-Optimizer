/**
 * POST /api/plaid/holdings — exchange, fetch, discard. Sandbox only.
 *
 * The access_token lives as a local `const` inside this handler and nowhere
 * else. It is never returned to the client, never logged, never written to
 * Supabase, a cookie, localStorage or a file. When this function returns it
 * goes out of scope and is gone. Re-linking is required to read holdings again,
 * which is the intended trade-off for holding no credentials at rest.
 *
 * The holdings themselves are equally transient: mapped to a lean display shape
 * and returned in the response body. Nothing is stored.
 */

import { plaidClient, plaidErrorPayload, plaidErrorStatus } from '../../../lib/plaid';
import { requireUser, methodNotAllowed } from '../../../lib/apiAuth';

/** Positions arrive keyed by security_id; resolve to something displayable. */
function shapeHoldings(data) {
    const securities = new Map((data.securities || []).map(s => [s.security_id, s]));
    const accounts = new Map((data.accounts || []).map(a => [a.account_id, a]));

    return (data.holdings || []).map(h => {
        const sec = securities.get(h.security_id) || {};
        const acct = accounts.get(h.account_id) || {};
        return {
            symbol: sec.ticker_symbol || null,
            name: sec.name || sec.ticker_symbol || 'Unknown security',
            type: sec.type || null,
            quantity: h.quantity ?? null,
            // Plaid's cost_basis is the total for the position, not per share.
            costBasis: h.cost_basis ?? null,
            price: h.institution_price ?? null,
            value: h.institution_value ?? null,
            currency: h.iso_currency_code || sec.iso_currency_code || null,
            account: acct.name || acct.official_name || null,
            accountType: acct.subtype || acct.type || null,
        };
    });
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    const publicToken = (req.body || {}).public_token;
    if (typeof publicToken !== 'string' || !publicToken.trim()) {
        return res.status(400).json({ error: 'missing_public_token', message: 'A Plaid public_token is required.' });
    }

    try {
        const client = plaidClient();

        // ── in-memory only, from here ──────────────────────────────────────
        const exchange = await client.itemPublicTokenExchange({ public_token: publicToken.trim() });
        const accessToken = exchange.data.access_token;

        const holdings = await client.investmentsHoldingsGet({ access_token: accessToken });
        // ── nothing below this line may carry the token ────────────────────

        const shaped = shapeHoldings(holdings.data);

        return res.status(200).json({
            sandbox: true,
            fetchedAt: new Date().toISOString(),
            accounts: (holdings.data.accounts || []).length,
            holdings: shaped,
            // Stated in the payload so the client can surface it honestly.
            persisted: false,
        });
    } catch (err) {
        // err may embed the request body on some transports; log only the message.
        console.error('[plaid:holdings]', err && err.message);
        return res.status(plaidErrorStatus(err)).json(plaidErrorPayload(err));
    }
}
