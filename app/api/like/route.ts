import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { submissionId } = await request.json()
  if (!submissionId) return NextResponse.json({ error: 'Missing submissionId' }, { status: 400 })

  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', user.id)
    .eq('submission_id', submissionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('likes').delete().eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ liked: false })
  } else {
    const { error } = await supabase.from('likes').insert({ user_id: user.id, submission_id: submissionId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ liked: true })
  }
}
