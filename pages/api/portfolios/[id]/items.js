import { addItem, removeItem } from '../../../../lib/portfolios';
import { requireUser, fail, methodNotAllowed } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    const { id } = req.query;

    if (req.method === 'POST') {
        const { symbol, tag, dca } = req.body || {};
        try {
            return res.status(200).json(await addItem(userId, id, { symbol, tag, dca }));
        } catch (err) {
            return fail(res, err, 'portfolios:addItem');
        }
    }

    if (req.method === 'DELETE') {
        const symbol = req.query.symbol || (req.body || {}).symbol;
        try {
            return res.status(200).json(await removeItem(userId, id, symbol));
        } catch (err) {
            return fail(res, err, 'portfolios:removeItem');
        }
    }

    return methodNotAllowed(res, ['POST', 'DELETE']);
}
