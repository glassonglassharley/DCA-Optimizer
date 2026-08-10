/**
 * POST /api/plaid/link-token — Link token for the owner's brokerage connection.
 *
 * Owner-gated, not merely signed-in-gated. Minting a token is the step that
 * walks a human through a real brokerage login, so letting any authenticated
 * user reach it would expose the production Plaid credentials to third-party
 * auth flows even though the import that follows would 403.
 *
 * Returns only the short-lived link_token, which is what Plaid Link needs in the
 * browser. No access_token exists at this stage, and nothing is written anywhere.
 *
 * PLAID_REDIRECT_URI enables OAuth institutions (Robinhood among them), which
 * send the user to their own site to authenticate and can only hand control back
 * through a registered redirect. Without it Link has nowhere to return to, so the
 * login succeeds and onSuccess never fires. It stays optional: when unset the
 * call is byte-for-byte what it was before, so non-OAuth institutions keep
 * working rather than failing on a half-configured redirect. Plaid requires the
 * value to be HTTPS, free of query params and '#', and registered under
 * Dashboard → Developers → API → Allowed redirect URIs.
 */

import { plaidClient, plaidErrorPayload, plaidErrorStatus, PLAID_ENV } from '../../../lib/plaid';
import { requireOwner, methodNotAllowed } from '../../../lib/apiAuth';

const REDIRECT_URI = (process.env.PLAID_REDIRECT_URI || '').trim();

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    const userId = requireOwner(req, res);
    if (!userId) return;

    if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

    try {
        // client_user_id ties the Link session to the Clerk user, so one user's
        // session can never be used to pull another's holdings.
        const r = await plaidClient().linkTokenCreate({
            user: { client_user_id: userId },
            client_name: 'DCA Anchor',
            products: ['investments'],
            country_codes: ['US'],
            language: 'en',
            ...(REDIRECT_URI ? { redirect_uri: REDIRECT_URI } : {}),
        });

        return res.status(200).json({
            link_token: r.data.link_token,
            expiration: r.data.expiration || null,
            environment: PLAID_ENV,
        });
    } catch (err) {
        console.error('[plaid:link-token]', err && err.message);
        return res.status(plaidErrorStatus(err)).json(plaidErrorPayload(err));
    }
}
