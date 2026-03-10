-- =============================================
-- Gym Squad - Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- 1. Allowed emails table (run this first)
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allowed_emails_select" ON public.allowed_emails
  FOR SELECT TO authenticated USING (true);

-- 2. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- 3. Submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  year INT NOT NULL,
  UNIQUE (user_id, week_number, year, photo_url)
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_select" ON public.submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "submissions_insert" ON public.submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_submissions_user_week ON public.submissions(user_id, year, week_number);

-- =============================================
-- Add allowed emails (replace with real ones)
-- =============================================
-- INSERT INTO public.allowed_emails (email) VALUES
--   ('person1@gmail.com'),
--   ('person2@gmail.com');
