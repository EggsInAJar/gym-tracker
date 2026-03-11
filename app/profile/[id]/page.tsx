import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import WeekGrid from '@/components/WeekGrid'
import PREditor from '@/components/PREditor'
import { getCurrentWeek, getWeekDateRange, REQUIRED_SESSIONS_PER_WEEK } from '@/lib/utils'
import { Profile, Submission } from '@/types'

function buildStats(profile: Profile, allSubmissions: { user_id: string; week_number: number; year: number }[]) {
  const { week, year } = getCurrentWeek()

  const weekMap = new Map<string, number>()
  for (const s of allSubmissions) {
    if (s.user_id !== profile.id) continue
    const key = `${s.year}-${s.week_number}`
    weekMap.set(key, (weekMap.get(key) || 0) + 1)
  }

  const totalSessions = Array.from(weekMap.values()).reduce((a, b) => a + b, 0)
  const currentWeekCount = weekMap.get(`${year}-${week}`) || 0

  // Current streak
  let currentStreak = 0
  let checkWeek = week
  let checkYear = year
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
  if (currentWeekCount >= REQUIRED_SESSIONS_PER_WEEK) currentStreak++

  // Best streak
  let bestStreak = 0
  let tempStreak = 0
  const allWeekKeys = Array.from(weekMap.keys()).sort()
  for (const key of allWeekKeys) {
    if ((weekMap.get(key) || 0) >= REQUIRED_SESSIONS_PER_WEEK) {
      tempStreak++
      bestStreak = Math.max(bestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  // Relegation count
  let relegationCount = 0
  const currentWeekKey = `${year}-${week}`
  for (const [key, cnt] of weekMap.entries()) {
    if (key === currentWeekKey) continue
    if (cnt > 0 && cnt < REQUIRED_SESSIONS_PER_WEEK) relegationCount++
  }

  return { totalSessions, currentWeekCount, currentStreak, bestStreak, relegationCount }
}

function groupByWeek(submissions: Submission[]): { label: string; week: number; year: number; items: Submission[] }[] {
  const groups = new Map<string, { label: string; week: number; year: number; items: Submission[] }>()
  for (const sub of submissions) {
    const key = `${sub.year}-${sub.week_number}`
    if (!groups.has(key)) {
      const { start, end } = getWeekDateRange(sub.week_number, sub.year)
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      groups.set(key, {
        label: `Week ${sub.week_number}, ${sub.year} · ${fmt(start)}–${fmt(end)}`,
        week: sub.week_number,
        year: sub.year,
        items: [],
      })
    }
    groups.get(key)!.items.push(sub)
  }
  return Array.from(groups.values()).sort((a, b) => b.year - a.year || b.week - a.week)
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: currentProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!currentProfile) redirect('/')

  const { data: targetProfile } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (!targetProfile) redirect('/scoreboard')

  const { data: submissionsRaw } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', id)
    .order('submitted_at', { ascending: false })

  const submissions: Submission[] = submissionsRaw || []

  const { data: allSubmissionsRaw } = await supabase
    .from('submissions')
    .select('user_id, week_number, year')
    .eq('user_id', id)

  const stats = buildStats(targetProfile, allSubmissionsRaw || [])

  const { data: activeCheckin } = await supabase
    .from('checkins')
    .select('*')
    .eq('user_id', id)
    .is('checked_out_at', null)
    .maybeSingle()

  const isOwnProfile = user.id === id
  const weekGroups = groupByWeek(submissions)

  return (
    <div className="min-h-screen">
      <NavBar userName={currentProfile.name} userId={user.id} />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Back link */}
        <Link href="/scoreboard" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Scoreboard
        </Link>

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-50">{targetProfile.name}</h1>
            {targetProfile.is_comp ? (
              <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-900 font-bold text-xs px-2 py-0.5 rounded shadow-sm shadow-amber-500/30">
                COMP
              </span>
            ) : (
              <span className="bg-zinc-700 text-zinc-400 font-medium text-xs px-2 py-0.5 rounded">
                REC
              </span>
            )}
            {activeCheckin && (
              <span className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                At the gym now
              </span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Sessions" value={stats.totalSessions.toString()} />
          <StatCard label="Current Streak" value={`${stats.currentStreak}wk`} />
          <StatCard label="Best Streak" value={`${stats.bestStreak}wk`} />
          {targetProfile.is_comp && (
            <StatCard label="Missed Weeks" value={stats.relegationCount.toString()} valueClass="text-red-400" />
          )}
        </div>

        {/* PRs */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Powerlifting PRs</h2>
          {isOwnProfile ? (
            <PREditor
              userId={id}
              initialBench={targetProfile.bench_pr}
              initialSquat={targetProfile.squat_pr}
              initialDeadlift={targetProfile.deadlift_pr}
            />
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <PRDisplay label="Bench" value={targetProfile.bench_pr} />
              <PRDisplay label="Squat" value={targetProfile.squat_pr} />
              <PRDisplay label="Deadlift" value={targetProfile.deadlift_pr} />
            </div>
          )}
        </div>

        {/* Photo history */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Photo History</h2>
          {weekGroups.length === 0 ? (
            <div className="text-center py-16 text-zinc-600">
              <p className="text-4xl mb-3">🏋️</p>
              <p>No sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {weekGroups.map(group => (
                <div key={`${group.year}-${group.week}`}>
                  <p className="text-xs text-zinc-500 font-medium mb-3">{group.label}</p>
                  <WeekGrid submissions={group.items} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 ${valueClass ?? 'text-zinc-200'}`}>{value}</p>
    </div>
  )
}

function PRDisplay({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-zinc-200">
        {value != null ? <>{value} <span className="text-zinc-500 text-sm font-normal">lbs</span></> : <span className="text-zinc-600">—</span>}
      </p>
    </div>
  )
}
