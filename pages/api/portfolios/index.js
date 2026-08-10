import { listPortfolios, createPortfolio, DEFAULT_WATCHLIST_NAME } from '../../../lib/portfolios';
import { requireUser, isOwner, fail, methodNotAllowed } from '../../../lib/apiAuth';
import { isPlaidReady, PLAID_ENV } from '../../../lib/plaid';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    if (req.method === 'GET') {
        try {
            let portfolios = await listPortfolios(userId);

            // A brand-new account owns no rows, and the switcher hides itself
            // while the list is empty — so there is no control to create the
            // first portfolio with. Provision one here, server-side, so it
            // happens however the client arrives and can't be skipped.
            if (portfolios.length === 0) {
                try {
                    await createPortfolio(userId, {
                        name: DEFAULT_WATCHLIST_NAME,
                        kind: 'watchlist',
                    });
                } catch (err) {
                    // Two first loads can race. The unique index on
                    // (clerk_user_id, lower(name)) settles it, and the loser
                    // just re-reads what the winner inserted.
                    if (err.code !== 'duplicate_name') throw err;
                }
                portfolios = await listPortfolios(userId);
            }

            // Rides along on the call the dashboard already makes, so gating the
            // connect buttons costs no extra request. Owner-only, matching the
            // routes themselves: a non-owner never sees a control that would
            // 403 on click, and learns nothing about the Plaid setup. No key
            // ever crosses the wire; plaidEnv exists so the UI can label a live
            // brokerage connection honestly instead of always saying "sandbox".
            const owner = isOwner(userId);
            return res.status(200).json({
                portfolios,
                plaidConfigured: owner && isPlaidReady(),
                plaidEnv: owner ? PLAID_ENV : null,
            });
        } catch (err) {
            return fail(res, err, 'portfolios:list');
        }
    }

    if (req.method === 'POST') {
        const { name, kind } = req.body || {};
        try {
            return res.status(201).json({ portfolio: await createPortfolio(userId, { name, kind }) });
        } catch (err) {
            return fail(res, err, 'portfolios:create');
        }
    }

    return methodNotAllowed(res, ['GET', 'POST']);
}
