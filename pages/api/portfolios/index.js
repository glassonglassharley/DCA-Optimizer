import { listPortfolios, createPortfolio } from '../../../lib/portfolios';
import { requireUser, fail, methodNotAllowed } from '../../../lib/apiAuth';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    if (req.method === 'GET') {
        try {
            return res.status(200).json({ portfolios: await listPortfolios(userId) });
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
