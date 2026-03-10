-- =============================================
-- Gym Squad - Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- 1. Profiles table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  week_number INT NOT NULL CHECK (week_number BETWEEN 1 AND 53),
  year INT NOT NULL,
  UNIQUE (user_id, week_number, year, photo_url)
);

-- Index for fast scoreboard queries
CREATE INDEX IF NOT EXISTS idx_submissions_user_week ON public.submissions(user_id, year, week_number);

-- =============================================
-- Row Level Security
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone authenticated can read, only owner can write
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Submissions: anyone authenticated can read, only owner can insert
CREATE POLICY "submissions_select" ON public.submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "submissions_insert" ON public.submissions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =============================================
-- Auto-create profile on sign up
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only create profile if email is in the allowed list
  IF EXISTS (SELECT 1 FROM public.allowed_emails WHERE email = NEW.email) THEN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Allowed emails table (allowlist of 15 people)
-- =============================================
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only service role can manage allowed emails
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allowed_emails_select" ON public.allowed_emails
  FOR SELECT TO authenticated USING (true);

-- =============================================
-- Storage bucket for gym photos
-- =============================================
-- Run this after creating the bucket in the Supabase dashboard:
-- Bucket name: gym-photos (set to public)

-- Storage policy: authenticated users can upload to their own folder
-- (Configure in Supabase dashboard → Storage → gym-photos → Policies)
--
-- INSERT policy:  (auth.uid()::text) = (storage.foldername(name))[1]
-- SELECT policy:  true  (public read)


-- =============================================
-- Sample: Add allowed emails (replace with real ones)
-- =============================================
-- INSERT INTO public.allowed_emails (email, name) VALUES
--   ('person1@example.com', 'Alice'),
--   ('person2@example.com', 'Bob'),
--   ...;
