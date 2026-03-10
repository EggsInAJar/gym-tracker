import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getCurrentWeek, getWeekDateRange, formatDate, REQUIRED_SESSIONS_PER_WEEK } from '@/lib/utils'
import NavBar from '@/components/NavBar'
import SubmitPhotoButton from '@/components/SubmitPhotoButton'
import WeekGrid from '@/components/WeekGrid'
import { Submission } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // Ensure profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  const { week, year } = getCurrentWeek()
  const { start, end } = getWeekDateRange(week, year)

  // Fetch this week's submissions for the user
  const { data: weekSubmissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_number', week)
    .eq('year', year)
    .order('submitted_at', { ascending: true })

  const submissions: Submission[] = weekSubmissions || []
  const count = submissions.length
  const remaining = Math.max(0, REQUIRED_SESSIONS_PER_WEEK - count)
  const isComplete = count >= REQUIRED_SESSIONS_PER_WEEK

  // Fetch recent submissions (last 5 weeks) for streak display
  const { data: allSubmissions } = await supabase
    .from('submissions')
    .select('week_number, year')
    .eq('user_id', user.id)
    .order('year', { ascending: false })
    .order('week_number', { ascending: false })

  // Calculate current streak
  let streak = 0
  if (allSubmissions) {
    const weekMap = new Map<string, number>()
    for (const s of allSubmissions) {
      const key = `${s.year}-${s.week_number}`
      weekMap.set(key, (weekMap.get(key) || 0) + 1)
    }

    let checkWeek = week
    let checkYear = year
    while (true) {
      const key = `${checkYear}-${checkWeek}`
      const cnt = weekMap.get(key) || 0
      if (cnt >= REQUIRED_SESSIONS_PER_WEEK) {
        streak++
        checkWeek--
        if (checkWeek === 0) { checkWeek = 52; checkYear-- }
      } else {
        break
      }
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar userName={profile.name} />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Week header */}
        <div>
          <p className="text-zinc-500 text-sm">Week {week}</p>
          <h1 className="text-2xl font-bold text-zinc-50">
            {formatDate(start)} — {formatDate(end)}
          </h1>
        </div>

        {/* Progress card */}
        <div className={`rounded-2xl border p-6 ${isComplete ? 'bg-green-950 border-green-800' : 'bg-zinc-900 border-zinc-800'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-zinc-400 text-sm font-medium">This week</p>
              <p className="text-4xl font-bold text-zinc-50 mt-1">
                {count}<span className="text-zinc-500 text-2xl font-normal">/{REQUIRED_SESSIONS_PER_WEEK}</span>
              </p>
            </div>
            <div className="text-right">
              {isComplete ? (
                <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 text-sm font-semibold px-3 py-1 rounded-full">
                  ✓ Complete
                </span>
              ) : (
                <span className="text-zinc-400 text-sm">
                  {remaining} more to go
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min(100, (count / REQUIRED_SESSIONS_PER_WEEK) * 100)}%` }}
            />
          </div>

          {/* Session dots */}
          <div className="flex gap-3 mt-5">
            {Array.from({ length: REQUIRED_SESSIONS_PER_WEEK }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-16 rounded-xl flex items-center justify-center text-lg ${
                  i < count
                    ? isComplete ? 'bg-green-500/30 text-green-300' : 'bg-orange-500/30 text-orange-300'
                    : 'bg-zinc-800 text-zinc-600'
                }`}
              >
                {i < count ? '💪' : '·'}
              </div>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <SubmitPhotoButton
          userId={user.id}
          currentCount={count}
          disabled={count >= REQUIRED_SESSIONS_PER_WEEK}
        />

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Current Streak</p>
            <p className="text-3xl font-bold text-zinc-50 mt-1">{streak}<span className="text-zinc-500 text-base font-normal"> wks</span></p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-wide">Status</p>
            <p className={`text-lg font-bold mt-1 ${isComplete || count > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {isComplete ? 'On track' : count > 0 ? 'In progress' : 'Not started'}
            </p>
          </div>
        </div>

        {/* This week's photos */}
        {submissions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">This week&apos;s sessions</h2>
            <WeekGrid submissions={submissions} />
          </div>
        )}
      </main>
    </div>
  )
}
