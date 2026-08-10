import { renamePortfolio, deletePortfolio } from '../../../../lib/portfolios';
import { requireUser, fail, methodNotAllowed } from '../../../../lib/apiAuth';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireUser(req, res);
    if (!userId) return;

    const { id } = req.query;

    if (req.method === 'PATCH') {
        try {
            return res.status(200).json({ portfolio: await renamePortfolio(userId, id, (req.body || {}).name) });
        } catch (err) {
            return fail(res, err, 'portfolios:rename');
        }
    }

    if (req.method === 'DELETE') {
        try {
            return res.status(200).json(await deletePortfolio(userId, id));
        } catch (err) {
            return fail(res, err, 'portfolios:delete');
        }
    }

    return methodNotAllowed(res, ['PATCH', 'DELETE']);
}
