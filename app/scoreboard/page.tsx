import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentWeek, REQUIRED_SESSIONS_PER_WEEK } from '@/lib/utils'
import NavBar from '@/components/NavBar'
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

        {/* Legend */}
        <div className="flex gap-4 text-xs text-zinc-500 mb-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Complete this week</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> In progress</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Relegated</span>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => {
            const isMe = row.profile.id === user.id
            const isComplete = row.currentWeekCount >= REQUIRED_SESSIONS_PER_WEEK
            const hasStarted = row.currentWeekCount > 0

            return (
              <div
                key={row.profile.id}
                className={`rounded-2xl border p-4 transition ${
                  isMe ? 'ring-1 ring-orange-500 border-orange-800 bg-orange-950/30' : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className={`text-lg font-bold w-7 text-center shrink-0 ${
                    index === 0 ? 'text-yellow-400' : index === 1 ? 'text-zinc-300' : index === 2 ? 'text-amber-600' : 'text-zinc-600'
                  }`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </div>

                  {/* Name + status dot */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isComplete ? 'bg-green-500' : hasStarted ? 'bg-orange-500' : 'bg-red-500'
                      }`} />
                      <span className="font-semibold text-zinc-50 truncate">
                        {row.profile.name}{isMe && <span className="text-orange-400 text-xs ml-1">(you)</span>}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 ml-4">
                      {row.relegationCount > 0 && (
                        <span className="text-red-400 mr-2">{row.relegationCount} miss{row.relegationCount !== 1 ? 'es' : ''}</span>
                      )}
                      {row.currentStreak > 0 && (
                        <span className="text-orange-400 mr-2">🔥 {row.currentStreak}wk streak</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-4 text-right shrink-0">
                    <div>
                      <p className="text-xs text-zinc-500">This week</p>
                      <p className={`text-lg font-bold ${isComplete ? 'text-green-400' : hasStarted ? 'text-orange-400' : 'text-red-400'}`}>
                        {row.currentWeekCount}<span className="text-zinc-600 text-sm font-normal">/{REQUIRED_SESSIONS_PER_WEEK}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500">Total</p>
                      <p className="text-lg font-bold text-zinc-200">{row.totalSessions}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {rows.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-4xl mb-3">🏋️</p>
            <p>No data yet. Start submitting!</p>
          </div>
        )}
      </main>
    </div>
  )
}
