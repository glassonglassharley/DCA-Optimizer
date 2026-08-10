/**
 * POST /api/plaid/import — mirror a fetched holdings symbol list into a portfolio.
 *
 * Two steps, and the first one never writes:
 *
 *   { portfolioId, symbols }                → 200 with the diff. Nothing changed.
 *   { portfolioId, symbols, confirm: true } → applies that diff.
 *
 * Deliberately token-free. The symbol list arrives from the holdings response
 * the owner just looked at, so the Plaid access_token stays confined to
 * /api/plaid/holdings and never travels further into the app — there is no code
 * path from here to Plaid at all. That the client supplies the symbols widens
 * nothing: this route is owner-only, and the owner can already add or remove
 * any symbol through /api/portfolios/[id]/items.
 *
 * Symbols only. shares and cost_basis are left null, matching every manually
 * added entry, so nothing downstream has to guess whether a quantity is real.
 */

import { diffMirror, applyMirror } from '../../../lib/portfolios';
import { requireOwner, fail, methodNotAllowed } from '../../../lib/apiAuth';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireOwner(req, res);
    if (!userId) return;

    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    const { portfolioId, symbols, confirm } = req.body || {};

    if (typeof portfolioId !== 'string' || !portfolioId.trim()) {
        return res.status(400).json({
            error: 'missing_portfolio', message: 'A portfolioId is required.',
        });
    }
    if (!Array.isArray(symbols)) {
        return res.status(400).json({
            error: 'missing_symbols', message: 'symbols must be an array.',
        });
    }

    try {
        // Always diff first, even when confirming: it re-reads current state and
        // re-validates every symbol server-side rather than trusting the shape
        // the client echoed back.
        const diff = await diffMirror(userId, portfolioId.trim(), symbols);

        // EMPTY-FETCH GUARD. An account that returned nothing usable — or a
        // fetch that quietly failed upstream — must never be read as "remove
        // everything". Abort before any write, on both steps.
        if (diff.targetCount === 0) {
            return res.status(200).json({
                ...diff,
                applied: false,
                aborted: true,
                reason: 'empty_holdings',
                message: 'No importable tickers were found, so the portfolio was left untouched.',
            });
        }

        if (confirm !== true) {
            return res.status(200).json({
                ...diff,
                applied: false,
                aborted: false,
                message: 'Preview only — nothing has been changed yet.',
            });
        }

        return res.status(200).json(await applyMirror(userId, portfolioId.trim(), symbols));
    } catch (err) {
        return fail(res, err, 'plaid:import');
    }
}
