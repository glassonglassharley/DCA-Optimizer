/**
 * Portfolio data access, always scoped by clerk_user_id.
 *
 * Every function takes clerkUserId as its first argument and every query filters
 * on it. That filter is the ownership boundary — service_role bypasses RLS, so
 * omitting it anywhere would expose other users' rows.
 */

const { DbError, rest } = require('./supabaseAdmin');

const DEFAULT_WATCHLIST_NAME = 'Watchlist';

/** Symbols are stored uppercase; the unique index is on upper(symbol). */
function normalizeSymbol(raw) {
    if (typeof raw !== 'string') return null;
    const s = raw.trim().toUpperCase();
    return /^[A-Z0-9.\-]{1,15}$/.test(s) ? s : null;
}

function normalizeName(raw) {
    if (typeof raw !== 'string') return null;
    const n = raw.trim().replace(/\s+/g, ' ');
    return n.length >= 1 && n.length <= 40 ? n : null;
}

/**
 * Accepts both storage formats the legacy tickers table used:
 *   "NVDA"                                  → { symbol:'NVDA', tag:null,     dca:false }
 *   { symbol:'MSTR', tag:'growth', dca:true} → { symbol:'MSTR', tag:'growth', dca:true }
 * Anything unrecognizable is dropped rather than stored as garbage.
 */
function normalizeLegacyEntry(entry) {
    if (typeof entry === 'string') {
        const symbol = normalizeSymbol(entry);
        return symbol ? { symbol, tag: null, dca: false } : null;
    }
    if (entry && typeof entry === 'object') {
        const symbol = normalizeSymbol(entry.symbol);
        if (!symbol) return null;
        return {
            symbol,
            tag: typeof entry.tag === 'string' && entry.tag.trim() ? entry.tag.trim() : null,
            dca: entry.dca === true,
        };
    }
    return null;
}

/** Drops duplicates by symbol, keeping the first occurrence. */
function dedupeBySymbol(entries) {
    const seen = new Set();
    const out = [];
    for (const e of entries) {
        if (!e || seen.has(e.symbol)) continue;
        seen.add(e.symbol);
        out.push(e);
    }
    return out;
}

const q = encodeURIComponent;

/** All portfolios for a user, each with its items. Ordered oldest-first. */
async function listPortfolios(clerkUserId) {
    const rows = await rest(
        `portfolios?clerk_user_id=eq.${q(clerkUserId)}` +
        `&select=id,name,kind,created_at,updated_at,portfolio_items(symbol,tag,dca,shares,cost_basis)` +
        `&order=created_at.asc`
    );
    return (rows || []).map(r => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        items: (r.portfolio_items || [])
            .map(i => ({
                symbol: i.symbol,
                tag: i.tag ?? null,
                dca: i.dca === true,
                shares: i.shares ?? null,
                costBasis: i.cost_basis ?? null,
            }))
            .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    }));
}

async function countPortfolios(clerkUserId) {
    const rows = await rest(`portfolios?clerk_user_id=eq.${q(clerkUserId)}&select=id`);
    return (rows || []).length;
}

/** Confirms a portfolio belongs to this user. Returns the row or throws 404. */
async function requireOwned(clerkUserId, portfolioId) {
    const rows = await rest(
        `portfolios?id=eq.${q(portfolioId)}&clerk_user_id=eq.${q(clerkUserId)}&select=id,name,kind`
    );
    if (!rows || rows.length === 0) {
        throw new DbError('Portfolio not found.', { status: 404, code: 'not_found' });
    }
    return rows[0];
}

async function createPortfolio(clerkUserId, { name, kind = 'portfolio' }) {
    const clean = normalizeName(name);
    if (!clean) throw new DbError('Name must be 1–40 characters.', { status: 400, code: 'invalid_name' });
    if (kind !== 'portfolio' && kind !== 'watchlist') {
        throw new DbError('kind must be "portfolio" or "watchlist".', { status: 400, code: 'invalid_kind' });
    }

    let rows;
    try {
        rows = await rest('portfolios', {
            method: 'POST',
            body: { clerk_user_id: clerkUserId, name: clean, kind },
            prefer: 'return=representation',
        });
    } catch (err) {
        if (err.detail && err.detail.includes('portfolios_user_name_key')) {
            throw new DbError(`You already have a portfolio named "${clean}".`, {
                status: 409, code: 'duplicate_name',
            });
        }
        throw err;
    }

    const row = rows[0];
    return { id: row.id, name: row.name, kind: row.kind, items: [] };
}

async function renamePortfolio(clerkUserId, portfolioId, name) {
    await requireOwned(clerkUserId, portfolioId);
    const clean = normalizeName(name);
    if (!clean) throw new DbError('Name must be 1–40 characters.', { status: 400, code: 'invalid_name' });

    try {
        await rest(
            `portfolios?id=eq.${q(portfolioId)}&clerk_user_id=eq.${q(clerkUserId)}`,
            { method: 'PATCH', body: { name: clean }, prefer: 'return=minimal' }
        );
    } catch (err) {
        if (err.detail && err.detail.includes('portfolios_user_name_key')) {
            throw new DbError(`You already have a portfolio named "${clean}".`, {
                status: 409, code: 'duplicate_name',
            });
        }
        throw err;
    }
    return { id: portfolioId, name: clean };
}

async function deletePortfolio(clerkUserId, portfolioId) {
    await requireOwned(clerkUserId, portfolioId);

    // An account with no portfolios has nowhere to put a ticker, and the add
    // flow would silently recreate a default. The client hides the control too,
    // but this is the boundary that actually enforces it.
    if (await countPortfolios(clerkUserId) <= 1) {
        throw new DbError('You need at least one portfolio.', {
            status: 409, code: 'last_portfolio',
        });
    }

    // portfolio_items rows go with it via ON DELETE CASCADE.
    await rest(
        `portfolios?id=eq.${q(portfolioId)}&clerk_user_id=eq.${q(clerkUserId)}`,
        { method: 'DELETE', prefer: 'return=minimal' }
    );
    return { id: portfolioId, deleted: true };
}

async function addItem(clerkUserId, portfolioId, { symbol, tag = null, dca = false }) {
    await requireOwned(clerkUserId, portfolioId);
    const clean = normalizeSymbol(symbol);
    if (!clean) throw new DbError('Invalid ticker symbol.', { status: 400, code: 'invalid_symbol' });

    try {
        await rest('portfolio_items', {
            method: 'POST',
            body: { portfolio_id: portfolioId, symbol: clean, tag, dca: dca === true },
            prefer: 'return=minimal',
        });
    } catch (err) {
        // Already present — treat as success so the UI stays idempotent.
        if (err.detail && err.detail.includes('portfolio_items_unique')) return { symbol: clean, added: false };
        throw err;
    }
    return { symbol: clean, added: true };
}

async function removeItem(clerkUserId, portfolioId, symbol) {
    await requireOwned(clerkUserId, portfolioId);
    const clean = normalizeSymbol(symbol);
    if (!clean) throw new DbError('Invalid ticker symbol.', { status: 400, code: 'invalid_symbol' });

    await rest(
        `portfolio_items?portfolio_id=eq.${q(portfolioId)}&symbol=eq.${q(clean)}`,
        { method: 'DELETE', prefer: 'return=minimal' }
    );
    return { symbol: clean, removed: true };
}

/**
 * Bulk insert used by the claim tool. Skips duplicates rather than failing.
 *
 * Duplicates are filtered in advance rather than delegated to ON CONFLICT: the
 * uniqueness rule is the expression index (portfolio_id, upper(symbol)), and
 * PostgREST's on_conflict only accepts plain column lists, so asking it to
 * arbitrate returns 42P10 ("no unique or exclusion constraint matching the ON
 * CONFLICT specification"). Symbols are already uppercased by normalizeSymbol,
 * so comparing them directly matches what the index enforces.
 */
async function addItemsBulk(portfolioId, entries) {
    const deduped = dedupeBySymbol(entries);
    if (deduped.length === 0) return 0;

    const existing = await rest(
        `portfolio_items?portfolio_id=eq.${q(portfolioId)}&select=symbol`
    );
    const taken = new Set((existing || []).map(r => String(r.symbol).toUpperCase()));

    const rows = deduped
        .filter(e => !taken.has(e.symbol))
        .map(e => ({
            portfolio_id: portfolioId,
            symbol: e.symbol,
            tag: e.tag,
            dca: e.dca,
        }));
    if (rows.length === 0) return 0;

    await rest('portfolio_items', {
        method: 'POST',
        body: rows,
        prefer: 'return=minimal',
    });
    return rows.length;
}

/**
 * Splits an incoming symbol list into what can be stored and what cannot.
 *
 * Skips are returned rather than thrown: a real brokerage account holds things
 * with no usable ticker — money-market sweeps, CDs, bonds, options — and one of
 * those must not abort an otherwise good import. Callers report the count.
 */
function partitionSymbols(raw) {
    const list = Array.isArray(raw) ? raw : [];
    const valid = [];
    const skipped = [];
    const seen = new Set();

    for (const entry of list) {
        const clean = normalizeSymbol(entry);
        if (!clean) {
            skipped.push(typeof entry === 'string' && entry.trim() ? entry.trim() : null);
            continue;
        }
        if (seen.has(clean)) continue;
        seen.add(clean);
        valid.push(clean);
    }
    return { valid, skipped };
}

/**
 * What a mirror WOULD change. Pure read — writes nothing, ever.
 *
 * Step one of the two-step import: the caller shows this to the owner and only
 * then calls applyMirror(). Removals are surfaced here precisely so a delete is
 * never the first thing that happens.
 *
 * `remove` carries the symbols exactly as stored, not the uppercased comparison
 * key, so the DELETE that follows matches rows written before symbols were
 * normalized.
 */
async function diffMirror(clerkUserId, portfolioId, symbols) {
    await requireOwned(clerkUserId, portfolioId);

    const { valid, skipped } = partitionSymbols(symbols);
    const target = new Set(valid);

    const existing = await rest(
        `portfolio_items?portfolio_id=eq.${q(portfolioId)}&select=symbol`
    );

    // upper(symbol) is what the unique index compares, so it is what the diff
    // compares too; the stored spelling is kept for the delete filter.
    const storedByKey = new Map();
    for (const row of existing || []) {
        storedByKey.set(String(row.symbol).toUpperCase(), row.symbol);
    }

    const add = valid.filter(s => !storedByKey.has(s)).sort();
    const keep = valid.filter(s => storedByKey.has(s)).sort();
    const remove = [...storedByKey.entries()]
        .filter(([key]) => !target.has(key))
        .map(([, stored]) => stored)
        .sort();

    return {
        add,
        keep,
        remove,
        skipped: skipped.length,
        skippedSymbols: skipped.filter(Boolean).slice(0, 20),
        targetCount: target.size,
        currentCount: storedByKey.size,
    };
}

/**
 * Applies the mirror: adds what is missing, removes what the account no longer
 * holds. Symbols only — shares and cost_basis stay null exactly as they are for
 * every manually added entry.
 *
 * Refuses an empty target outright. A failed or empty holdings fetch must never
 * be read as an instruction to empty the portfolio, so that case throws here as
 * well as being caught in the route — an empty list should have to get past two
 * separate guards to delete anything, and it never does.
 */
async function applyMirror(clerkUserId, portfolioId, symbols) {
    const diff = await diffMirror(clerkUserId, portfolioId, symbols);

    if (diff.targetCount === 0) {
        throw new DbError('Refusing to mirror an empty holdings list.', {
            status: 400, code: 'empty_target',
        });
    }

    // Duplicates are filtered by the diff above rather than delegated to ON
    // CONFLICT: the uniqueness rule is the expression index
    // (portfolio_id, upper(symbol)), and PostgREST's on_conflict only accepts
    // plain column lists, so asking it to arbitrate returns 42P10. Same
    // read-then-split approach addItemsBulk already uses.
    if (diff.add.length > 0) {
        await rest('portfolio_items', {
            method: 'POST',
            body: diff.add.map(symbol => ({
                portfolio_id: portfolioId,
                symbol,
                tag: null,
                dca: false,
            })),
            prefer: 'return=minimal',
        });
    }

    if (diff.remove.length > 0) {
        const list = diff.remove.map(s => `"${s}"`).join(',');
        await rest(
            `portfolio_items?portfolio_id=eq.${q(portfolioId)}&symbol=in.(${q(list)})`,
            { method: 'DELETE', prefer: 'return=minimal' }
        );
    }

    return { ...diff, added: diff.add.length, removed: diff.remove.length, applied: true };
}

module.exports = {
    DEFAULT_WATCHLIST_NAME,
    normalizeSymbol,
    normalizeName,
    normalizeLegacyEntry,
    dedupeBySymbol,
    listPortfolios,
    countPortfolios,
    requireOwned,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    addItem,
    removeItem,
    addItemsBulk,
    partitionSymbols,
    diffMirror,
    applyMirror,
};
