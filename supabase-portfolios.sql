-- ============================================================================
-- DCA Optimizer — portfolios schema (Clerk-owned)
--
-- RUN THIS IN THE SUPABASE SQL EDITOR BEFORE DEPLOYING THE APP CODE THAT USES IT.
-- Dashboard → SQL Editor → New query → paste → Run.
--
-- Safe to run more than once (every statement is idempotent).
-- This does NOT touch the legacy public.tickers table; see the final section
-- for the lockdown step to run only AFTER you have claimed your data.
-- ============================================================================


-- ── 1. Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.portfolios (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text        NOT NULL,
  name          text        NOT NULL,
  kind          text        NOT NULL DEFAULT 'portfolio'
                            CHECK (kind IN ('portfolio', 'watchlist')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid        NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  symbol       text        NOT NULL,
  tag          text,                          -- legacy 'growth' / 'core', nullable
  dca          boolean     NOT NULL DEFAULT false,
  shares       numeric,                       -- NULL for watchlist entries
  cost_basis   numeric,                       -- NULL until cost tracking is used
  added_at     timestamptz NOT NULL DEFAULT now()
);


-- ── 2. Indexes ──────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS portfolios_user_idx
  ON public.portfolios (clerk_user_id);

-- One portfolio name per user, case-insensitively.
CREATE UNIQUE INDEX IF NOT EXISTS portfolios_user_name_key
  ON public.portfolios (clerk_user_id, lower(name));

CREATE INDEX IF NOT EXISTS portfolio_items_portfolio_idx
  ON public.portfolio_items (portfolio_id);

-- Prevents 'nvda' and 'NVDA' becoming two rows — the same duplicate class that
-- produced the case-variant username rows in the legacy tickers table.
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_items_unique
  ON public.portfolio_items (portfolio_id, upper(symbol));


-- ── 3. Lock out anon ────────────────────────────────────────────────────────
-- All access goes through /api/* using the service_role key, which bypasses RLS.
-- Enabling RLS with no policies means anon and authenticated are denied outright.

ALTER TABLE public.portfolios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.portfolios      FROM anon, authenticated;
REVOKE ALL ON public.portfolio_items FROM anon, authenticated;


-- ── 4. updated_at maintenance ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS portfolios_touch_updated_at ON public.portfolios;
CREATE TRIGGER portfolios_touch_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ============================================================================
-- 5. LEGACY LOCKDOWN — RUN THIS SEPARATELY, ONLY AFTER YOUR CLAIM SUCCEEDS.
--
-- The anon key is in public git history and public.tickers currently allows
-- anon full read/write. Once /api/claim has imported glassharley and
-- HarleyGlass, run the block below to close that hole.
--
-- Leaving it commented for now keeps the existing /api/sync working mid-build,
-- exactly as intended.
-- ============================================================================

-- DROP POLICY IF EXISTS "public_read_write" ON public.tickers;
-- REVOKE ALL ON public.tickers FROM anon, authenticated;
-- ALTER TABLE public.tickers ENABLE ROW LEVEL SECURITY;
