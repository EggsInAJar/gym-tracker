import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentWeek, REQUIRED_SESSIONS_PER_WEEK } from '@/lib/utils'
import NavBar from '@/components/NavBar'
import ScoreboardTabs from '@/components/ScoreboardTabs'
import { Profile } from '@/types'

interface UserRow {
  profile: Profile
  totalSessions: number
  currentWeekCount: number
  currentStreak: number
  bestStreak: number
  relegationCount: number
  isCurrentlyRelegated: boolean
}

async function buildScoreboard(supabase: Awaited<ReturnType<typeof createClient>>): Promise<UserRow[]> {
  const { week, year } = getCurrentWeek()

  const { data: profiles } = await supabase.from('profiles').select('*')
  if (!profiles || profiles.length === 0) return []

  const { data: allSubmissions } = await supabase
    .from('submissions')
    .select('user_id, week_number, year, submitted_at')
    .order('year', { ascending: true })
    .order('week_number', { ascending: true })

  if (!allSubmissions) return []

  // Group submissions by user → week
  const byUser = new Map<string, Map<string, number>>()
  for (const s of allSubmissions) {
    if (!byUser.has(s.user_id)) byUser.set(s.user_id, new Map())
    const key = `${s.year}-${s.week_number}`
    const userMap = byUser.get(s.user_id)!
    userMap.set(key, (userMap.get(key) || 0) + 1)
  }

  const rows: UserRow[] = profiles.map((profile: Profile) => {
    const weekMap = byUser.get(profile.id) || new Map<string, number>()

    const totalSessions = Array.from(weekMap.values()).reduce((a, b) => a + b, 0)
    const currentWeekCount = weekMap.get(`${year}-${week}`) || 0

    // Calculate current streak (consecutive completed weeks going backwards from now)
    let currentStreak = 0
    let checkWeek = week
    let checkYear = year
    // If this week isn't done yet, start checking from last week
    if (currentWeekCount < REQUIRED_SESSIONS_PER_WEEK) {
      checkWeek--
      if (checkWeek === 0) { checkWeek = 52; checkYear-- }
    }
    for (let i = 0; i < 52; i++) {
      const key = `${checkYear}-${checkWeek}`
      if ((weekMap.get(key) || 0) >= REQUIRED_SESSIONS_PER_WEEK) {
        currentStreak++
        checkWeek--
        if (checkWeek === 0) { checkWeek = 52; checkYear-- }
      } else break
    }
    if (currentWeekCount >= REQUIRED_SESSIONS_PER_WEEK) currentStreak++ // include current week

    // Best streak
    let bestStreak = 0
    let tempStreak = 0
    const allWeekKeys = Array.from(weekMap.keys()).sort()
    // Simple pass: not perfect for non-contiguous gaps but good enough
    for (const key of allWeekKeys) {
      if ((weekMap.get(key) || 0) >= REQUIRED_SESSIONS_PER_WEEK) {
        tempStreak++
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    // Relegation: count weeks where user had at least 1 submission but < 4
    let relegationCount = 0
    const currentWeekKey = `${year}-${week}`
    for (const [key, cnt] of weekMap.entries()) {
      if (key === currentWeekKey) continue // don't count current in-progress week
      if (cnt > 0 && cnt < REQUIRED_SESSIONS_PER_WEEK) relegationCount++
    }

    const isCurrentlyRelegated = currentWeekCount < REQUIRED_SESSIONS_PER_WEEK

    return {
      profile,
      totalSessions,
      currentWeekCount,
      currentStreak,
      bestStreak,
      relegationCount,
      isCurrentlyRelegated,
    }
  })

  // Rank: sort by current week count desc, then streak desc, then total desc
  rows.sort((a, b) => {
    if (b.currentWeekCount !== a.currentWeekCount) return b.currentWeekCount - a.currentWeekCount
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak
    return b.totalSessions - a.totalSessions
  })

  return rows
}

export default async function ScoreboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/')

  const rows = await buildScoreboard(supabase)
  const { week, year } = getCurrentWeek()

  return (
    <div className="min-h-screen">
      <NavBar userName={profile.name} />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-50">Scoreboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Week {week}, {year}</p>
        </div>

        <ScoreboardTabs
          rows={rows}
          currentUserId={user.id}
          defaultTab={profile.is_comp ? 'comp' : 'rec'}
        />
      </main>
    </div>
  )
}
