import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavBar from '@/components/NavBar'
import FeedCard from '@/components/FeedCard'
import { FeedItem, FeedItemWithMeta } from '@/types'

export default async function FeedPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/')

  const { data: rawFeed } = await supabase
    .from('submissions')
    .select(`
      id, user_id, photo_url, submitted_at, week_number, year, checkin_id,
      profiles ( id, name, is_comp ),
      checkins ( id, duration_minutes, gym_name, checked_in_at ),
      likes ( count ),
      comments ( count )
    `)
    .order('submitted_at', { ascending: false })
    .limit(50)

  const feed = (rawFeed ?? []) as unknown as FeedItem[]

  const submissionIds = feed.map(f => f.id)

  let myLikedSet = new Set<string>()
  if (submissionIds.length > 0) {
    const { data: myLikes } = await supabase
      .from('likes')
      .select('submission_id')
      .eq('user_id', user.id)
      .in('submission_id', submissionIds)
    myLikedSet = new Set((myLikes ?? []).map(l => l.submission_id))
  }

  const feedWithMeta: FeedItemWithMeta[] = feed.map(item => ({
    ...item,
    isLikedByMe: myLikedSet.has(item.id),
    likeCount: item.likes?.[0]?.count ?? 0,
    commentCount: item.comments?.[0]?.count ?? 0,
  }))

  return (
    <div className="min-h-screen">
      <NavBar userName={profile.name} userId={user.id} />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <h1 className="text-xl font-bold text-zinc-50">Feed</h1>
        {feedWithMeta.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-4xl mb-3">🏋️</p>
            <p>No sessions yet. Be the first to check in!</p>
          </div>
        ) : (
          feedWithMeta.map(item => <FeedCard key={item.id} item={item} />)
        )}
      </main>
    </div>
  )
}
