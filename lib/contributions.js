/**
 * Contribution log data access, always scoped by clerk_user_id.
 *
 * Same ownership contract as lib/portfolios.js: every function takes
 * clerkUserId first and every query filters on it. service_role bypasses RLS, so
 * that filter is the only thing standing between one user's history and
 * another's.
 *
 * A contribution is an immutable event — logged, listed, deleted, never edited.
 * Editing a past contribution would silently rewrite the average cost basis
 * derived from it, so corrections are a delete plus a new entry.
 */

const { DbError, rest } = require('./supabaseAdmin');
const { normalizeSymbol, requireOwned } = require('./portfolios');

const q = encodeURIComponent;

// One logged contribution is a single scheduled DCA, not a portfolio import.
const MAX_ITEMS = 25;
const MAX_AMOUNT = 1_000_000;
const MAX_NOTE = 280;

/** Dollars, to the cent. Rejects negatives, NaN and absurd magnitudes. */
function normalizeAmount(raw) {
    const n = typeof raw === 'string' ? Number(raw.replace(/[$,\s]/g, '')) : Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
    return Math.round(n * 100) / 100;
}

/** Optional price snapshot. Zero is rejected — it would poison a cost average. */
function normalizePrice(raw) {
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

/**
 * A calendar date, not a timestamp — a contribution belongs to a day, and
 * timezone-shifting it across midnight would move it between months in the
 * cumulative view. Defaults to today when omitted.
 */
function normalizeDate(raw) {
    if (raw == null || raw === '') {
        return new Date().toISOString().slice(0, 10);
    }
    if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
    // Rejects 2026-02-31: Date normalizes it, so a round trip that changes the
    // string proves the input was not a real calendar day.
    const parsed = new Date(`${raw}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) return null;
    return raw;
}

function normalizeNote(raw) {
    if (raw == null) return null;
    if (typeof raw !== 'string') return null;
    const n = raw.trim();
    if (!n) return null;
    return n.slice(0, MAX_NOTE);
}

/**
 * Validates the rows of one contribution.
 *
 * Unlike the Plaid import, an unusable row is a hard error rather than a silent
 * skip: the user typed these amounts and a dropped line would misreport what
 * they contributed.
 */
function normalizeItems(raw) {
    const list = Array.isArray(raw) ? raw : [];
    if (list.length === 0) {
        throw new DbError('Add at least one ticker to log.', { status: 400, code: 'no_items' });
    }
    if (list.length > MAX_ITEMS) {
        throw new DbError(`A contribution can cover at most ${MAX_ITEMS} tickers.`, {
            status: 400, code: 'too_many_items',
        });
    }

    const seen = new Set();
    const out = [];

    for (const entry of list) {
        const symbol = normalizeSymbol(entry && entry.symbol);
        if (!symbol) {
            throw new DbError('Invalid ticker symbol.', { status: 400, code: 'invalid_symbol' });
        }
        if (seen.has(symbol)) {
            throw new DbError(`${symbol} appears twice in one contribution.`, {
                status: 400, code: 'duplicate_symbol',
            });
        }
        seen.add(symbol);

        const amount = normalizeAmount(entry.amountUsd ?? entry.amount_usd);
        if (amount == null) {
            throw new DbError(`Invalid amount for ${symbol}.`, { status: 400, code: 'invalid_amount' });
        }

        const price = normalizePrice(entry.priceAtLog ?? entry.price_at_log);
        out.push({
            symbol,
            amount_usd: amount,
            price_at_log: price,
            // Derived once, at write time, from the price the user actually saw.
            // Recomputing it later against a current price would silently
            // restate history.
            shares_est: price ? Number((amount / price).toFixed(8)) : null,
        });
    }

    const total = out.reduce((s, i) => s + i.amount_usd, 0);
    if (total <= 0) {
        throw new DbError('A contribution needs a total above $0.', {
            status: 400, code: 'zero_total',
        });
    }
    return out;
}

function shapeContribution(row) {
    return {
        id: row.id,
        portfolioId: row.portfolio_id ?? null,
        loggedAt: row.logged_at,
        note: row.note ?? null,
        createdAt: row.created_at,
        items: (row.contribution_items || [])
            .map(i => ({
                symbol: i.symbol,
                amountUsd: i.amount_usd == null ? 0 : Number(i.amount_usd),
                priceAtLog: i.price_at_log == null ? null : Number(i.price_at_log),
                sharesEst: i.shares_est == null ? null : Number(i.shares_est),
            }))
            .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    };
}

/** Every contribution for a user, newest first, each with its rows. */
async function listContributions(clerkUserId) {
    const rows = await rest(
        `contributions?clerk_user_id=eq.${q(clerkUserId)}` +
        `&select=id,portfolio_id,logged_at,note,created_at,` +
        `contribution_items(symbol,amount_usd,price_at_log,shares_est)` +
        `&order=logged_at.desc,created_at.desc`
    );
    return (rows || []).map(shapeContribution);
}

/**
 * Writes one contribution and its rows.
 *
 * PostgREST gives no transaction across two requests, so a failed item insert
 * would strand an empty parent that renders as a $0 entry. The parent is deleted
 * on that path to keep history free of records that describe nothing.
 */
async function createContribution(clerkUserId, { portfolioId, loggedAt, note, items } = {}) {
    const cleanItems = normalizeItems(items);

    const cleanDate = normalizeDate(loggedAt);
    if (!cleanDate) {
        throw new DbError('Date must be a real calendar date (YYYY-MM-DD).', {
            status: 400, code: 'invalid_date',
        });
    }

    // A null portfolio is allowed (the portfolio may since have been deleted),
    // but a supplied one must belong to this user — otherwise the request could
    // file history against someone else's account.
    let ownedPortfolioId = null;
    if (portfolioId) {
        await requireOwned(clerkUserId, portfolioId);
        ownedPortfolioId = portfolioId;
    }

    const parentRows = await rest('contributions', {
        method: 'POST',
        body: {
            clerk_user_id: clerkUserId,
            portfolio_id: ownedPortfolioId,
            logged_at: cleanDate,
            note: normalizeNote(note),
        },
        prefer: 'return=representation',
    });

    const parent = parentRows && parentRows[0];
    if (!parent) {
        throw new DbError('Could not save the contribution.', { status: 502, code: 'insert_failed' });
    }

    try {
        await rest('contribution_items', {
            method: 'POST',
            body: cleanItems.map(i => ({ contribution_id: parent.id, ...i })),
            prefer: 'return=minimal',
        });
    } catch (err) {
        try {
            await rest(
                `contributions?id=eq.${q(parent.id)}&clerk_user_id=eq.${q(clerkUserId)}`,
                { method: 'DELETE', prefer: 'return=minimal' }
            );
        } catch {
            // Cleanup is best effort; the original failure is the one to report.
        }
        throw err;
    }

    return shapeContribution({ ...parent, contribution_items: cleanItems });
}

async function deleteContribution(clerkUserId, contributionId) {
    const rows = await rest(
        `contributions?id=eq.${q(contributionId)}&clerk_user_id=eq.${q(clerkUserId)}&select=id`
    );
    if (!rows || rows.length === 0) {
        throw new DbError('Contribution not found.', { status: 404, code: 'not_found' });
    }

    // contribution_items rows go with it via ON DELETE CASCADE.
    await rest(
        `contributions?id=eq.${q(contributionId)}&clerk_user_id=eq.${q(clerkUserId)}`,
        { method: 'DELETE', prefer: 'return=minimal' }
    );
    return { id: contributionId, deleted: true };
}

module.exports = {
    MAX_ITEMS,
    MAX_AMOUNT,
    MAX_NOTE,
    normalizeAmount,
    normalizePrice,
    normalizeDate,
    normalizeNote,
    normalizeItems,
    listContributions,
    createContribution,
    deleteContribution,
};
