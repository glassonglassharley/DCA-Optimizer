-- ============================================================================
-- DCA Optimizer — contribution log schema (Clerk-owned)
--
-- RUN THIS IN THE SUPABASE SQL EDITOR BEFORE DEPLOYING THE APP CODE THAT USES IT.
-- Dashboard → SQL Editor → New query → paste → Run.
--
-- Safe to run more than once (every statement is idempotent).
-- Requires supabase-portfolios.sql to have been run first — contributions
-- reference public.portfolios.
--
-- A contribution is an EVENT: "on this date I put these dollars into these
-- tickers." It is deliberately separate from portfolio_items, which is position
-- STATE. Folding the two together would make history unreconstructible, which is
-- why the unused portfolio_items.shares / cost_basis columns are left alone.
-- ============================================================================


-- ── 1. Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contributions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text        NOT NULL,
  -- Account type IS the portfolio; there is no parallel enum to drift from it.
  -- ON DELETE SET NULL so deleting a portfolio never erases the record that
  -- money was contributed — the history outlives the container.
  portfolio_id  uuid        REFERENCES public.portfolios(id) ON DELETE SET NULL,
  logged_at     date        NOT NULL,
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contribution_items (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid          NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  symbol          text          NOT NULL,
  amount_usd      numeric(12,2) NOT NULL CHECK (amount_usd >= 0),
  -- Snapshot of the price when the contribution was logged. NULL is meaningful
  -- and must stay allowed: it means "price unknown at log time", which the UI
  -- reports as "Price not recorded" rather than inventing a zero.
  price_at_log    numeric(18,6),
  shares_est      numeric(18,8)
);


-- ── 2. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS contributions_user_idx
  ON public.contributions (clerk_user_id);

-- History reads are always newest-first for one user.
CREATE INDEX IF NOT EXISTS contributions_user_logged_idx
  ON public.contributions (clerk_user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS contribution_items_contribution_idx
  ON public.contribution_items (contribution_id);

-- Per-ticker totals group on symbol.
CREATE INDEX IF NOT EXISTS contribution_items_symbol_idx
  ON public.contribution_items (symbol);


-- ── 3. Lock out anon ────────────────────────────────────────────────────────
-- All access goes through /api/* using the service_role key, which bypasses RLS.
-- Enabling RLS with no policies means anon and authenticated are denied outright.

ALTER TABLE public.contributions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contributions      FROM anon, authenticated;
REVOKE ALL ON public.contribution_items FROM anon, authenticated;
