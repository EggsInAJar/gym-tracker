import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const email = user?.email

      // Check if email is in the allowlist
      const { data: allowed } = await supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', email)
        .single()

      if (!allowed) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/?error=not_allowed`)
      }

      // Upsert profile (in case it doesn't exist yet)
      await supabase.from('profiles').upsert({
        id: user!.id,
        email: user!.email!,
        name: user!.user_metadata?.full_name ?? email!.split('@')[0],
      })

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
