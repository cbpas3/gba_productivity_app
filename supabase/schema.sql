-- =============================================================================
-- GBA Productivity App — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. TASKS table
-- ---------------------------------------------------------------------------
-- Stores each user's quest list. Timestamps are stored as bigint milliseconds
-- to match the existing Zustand store which uses Date.now().
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tasks (
  id                uuid        PRIMARY KEY,
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text        NOT NULL DEFAULT '',
  priority          text        NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status            text        NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed')),
  recurrence        text        NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly')),
  reward_claimed    boolean     NOT NULL DEFAULT false,
  created_at        bigint      NOT NULL,
  completed_at      bigint,
  last_completed_at bigint
);

-- Index on user_id for fast per-user queries
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks (user_id);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see and modify their own tasks
CREATE POLICY "tasks: owner full access"
  ON public.tasks
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 2. PROFILES table
-- ---------------------------------------------------------------------------
-- One row per user. Stores the pending reward pool and UI settings.
-- pending_exp  → serialised Reward[] JSON array (full reward objects)
-- settings_json → serialised UI preferences (mobileControlAlignment, etc.)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pending_exp   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  settings_json jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner full access"
  ON public.profiles
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 3. STORAGE bucket: saves
-- ---------------------------------------------------------------------------
-- Each user stores exactly one file at: saves/{user_id}/game.sav
-- The bucket is private (public = false).
-- ---------------------------------------------------------------------------

-- Create the bucket (idempotent via ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'saves',
  'saves',
  false,
  262144,  -- 256 KB max (GBA saves are at most 128 KB)
  ARRAY['application/octet-stream', 'application/x-gameboy-rom']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: a user can only read/write objects whose folder matches their uid
-- Path convention enforced: saves/{user_id}/game.sav

CREATE POLICY "saves: owner can select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'saves'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "saves: owner can insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'saves'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "saves: owner can update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'saves'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "saves: owner can delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'saves'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
