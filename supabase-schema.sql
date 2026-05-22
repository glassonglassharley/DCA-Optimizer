-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to run even if the table already exists.

CREATE TABLE IF NOT EXISTS public.tickers (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  username    text        NOT NULL,
  tickers     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Add UNIQUE constraint on username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.tickers'::regclass
      AND contype = 'u'
      AND conname = 'tickers_username_key'
  ) THEN
    ALTER TABLE public.tickers ADD CONSTRAINT tickers_username_key UNIQUE (username);
  END IF;
END $$;

-- Enable RLS (safe to run if already enabled)
ALTER TABLE public.tickers ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the anon policy so it's always current
DROP POLICY IF EXISTS "public_read_write" ON public.tickers;
CREATE POLICY "public_read_write" ON public.tickers
  FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
