import { listPortfolios, createPortfolio, DEFAULT_WATCHLIST_NAME } from '../../../lib/portfolios';
import { requireUser, fail, methodNotAllowed } from '../../../lib/apiAuth';

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

            return res.status(200).json({ portfolios });
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
