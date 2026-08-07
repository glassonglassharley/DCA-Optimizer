/**
 * ONE-TIME MIGRATION ENDPOINT — delete this file once the import has run.
 *
 * Imports two specific legacy rows from public.tickers into Clerk-owned
 * portfolios. Deliberately constrained:
 *
 *   - Sources are HARDCODED below. No user-supplied username is accepted, so
 *     this cannot be used to claim anyone else's row.
 *   - Refuses to run unless the caller's Clerk account has zero portfolios,
 *     so it can never overwrite real data or run twice.
 *   - Reads legacy rows with service_role, which keeps working after anon is
 *     revoked on public.tickers.
 *
 * To retire it: delete this file and the "Import" panel in pages/index.js, then
 * run the legacy lockdown block at the bottom of supabase-portfolios.sql.
 */

import { rest, DbError } from '../../lib/supabaseAdmin';
import {
    DEFAULT_WATCHLIST_NAME,
    countPortfolios,
    createPortfolio,
    addItemsBulk,
    normalizeLegacyEntry,
    dedupeBySymbol,
    listPortfolios,
} from '../../lib/portfolios';
import { requireUser, fail, methodNotAllowed } from '../../lib/apiAuth';

// The only rows this endpoint will ever read. Exact strings, case-sensitive —
// 'HarleyGlass' is unreachable through the old sign-in form, which force-lowercased.
const CLAIMABLE = [
    { username: 'glassharley', name: DEFAULT_WATCHLIST_NAME, kind: 'watchlist' },
    { username: 'HarleyGlass', name: 'Tagged Portfolio', kind: 'portfolio' },
];

async function readLegacyRow(username) {
    const rows = await rest(
        `tickers?username=eq.${encodeURIComponent(username)}&select=tickers,updated_at&limit=1`
    );
    if (!rows || rows.length === 0) return null;
    return Array.isArray(rows[0].tickers) ? rows[0].tickers : [];
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    if (req.method === 'GET') {
        // Lets the UI decide whether to offer the import at all.
        try {
            const existing = await countPortfolios(userId);
            return res.status(200).json({
                available: existing === 0,
                alreadyHasPortfolios: existing > 0,
                sources: CLAIMABLE.map(c => ({ name: c.name, kind: c.kind })),
            });
        } catch (err) {
            return fail(res, err, 'claim:status');
        }
    }

    if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

    try {
        const existing = await countPortfolios(userId);
        if (existing > 0) {
            throw new DbError(
                'Import is only available on an account with no portfolios yet.',
                { status: 409, code: 'already_claimed' }
            );
        }

        const imported = [];
        for (const source of CLAIMABLE) {
            const raw = await readLegacyRow(source.username);
            if (raw === null) {
                imported.push({ name: source.name, status: 'source_missing', count: 0 });
                continue;
            }

            // Handles both storage formats: plain strings and {symbol,tag,dca}.
            const entries = dedupeBySymbol(raw.map(normalizeLegacyEntry).filter(Boolean));
            const portfolio = await createPortfolio(userId, { name: source.name, kind: source.kind });
            const count = await addItemsBulk(portfolio.id, entries);

            imported.push({
                name: source.name,
                kind: source.kind,
                status: 'imported',
                count,
                skipped: raw.length - entries.length,
            });
        }

        return res.status(200).json({ success: true, imported, portfolios: await listPortfolios(userId) });
    } catch (err) {
        return fail(res, err, 'claim:import');
    }
}
