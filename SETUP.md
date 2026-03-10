# PlexTech Gym Comp — Setup Guide

## 1. Create a Supabase project

Go to supabase.com → New project. Copy the **Project URL** and **anon public key**.

## 2. Configure environment variables

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run the database schema

In Supabase dashboard → SQL Editor → paste and run the contents of `supabase/schema.sql`.

## 4. Add the 15 allowed emails

In Supabase SQL Editor:
```sql
INSERT INTO public.allowed_emails (email, name) VALUES
  ('alice@gmail.com', 'Alice'),
  ('bob@gmail.com', 'Bob'),
  -- ... add all 15
  ;
```

## 5. Create the photo storage bucket

In Supabase dashboard → Storage → New bucket:
- Name: `gym-photos`
- Public bucket: ✅

Then add these policies on the `gym-photos` bucket:

**INSERT policy** (authenticated users upload to their own folder):
```sql
(auth.uid()::text) = (storage.foldername(name))[1]
```

**SELECT policy** (public read):
```sql
true
```

## 6. Configure Supabase Auth

In Supabase → Authentication → Email:
- Enable "Magic Links" / OTP
- Add your site URL to "Redirect URLs": `http://localhost:3000/auth/callback`
- For production add: `https://your-domain.com/auth/callback`

## 7. Run the app

```bash
npm run dev
```

Visit http://localhost:3000 — sign in with any of the 15 allowed emails.

## How it works

| Feature | Detail |
|---|---|
| Auth | Magic link via email — no passwords |
| Allowlist | `allowed_emails` table; DB trigger auto-creates profile on first sign-in |
| Weekly goal | 4 sessions/week (Mon–Sun ISO week) |
| Photo upload | Stored in Supabase Storage; max 10MB |
| Scoreboard | Ranked by this week's count → streak → total |
| Relegation | Tracked when a past week had 1–3 sessions |

## Deploy to Vercel

```bash
npx vercel
```

Add the two env vars in the Vercel dashboard and add the production URL to Supabase redirect URLs.
