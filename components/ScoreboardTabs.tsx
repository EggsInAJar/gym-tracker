'use client'

import { useState } from 'react'
import Link from 'next/link'
import { REQUIRED_SESSIONS_PER_WEEK } from '@/lib/utils'

interface Profile {
  id: string
  name: string
  is_comp: boolean
}

interface Row {
  profile: Profile
  totalSessions: number
  currentWeekCount: number
  currentStreak: number
  relegationCount: number
  isCurrentlyRelegated: boolean
}

interface Props {
  rows: Row[]
  currentUserId: string
  defaultTab: 'comp' | 'rec' | 'all'
}

function RankLabel({ index }: { index: number }) {
  if (index === 0) return <span className="text-lg font-bold w-7 text-center shrink-0">🥇</span>
  if (index === 1) return <span className="text-lg font-bold w-7 text-center shrink-0">🥈</span>
  if (index === 2) return <span className="text-lg font-bold w-7 text-center shrink-0">🥉</span>
  return <span className="text-lg font-bold w-7 text-center shrink-0 text-zinc-600">{index + 1}</span>
}

function CompRows({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const isMe = row.profile.id === currentUserId
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
              <RankLabel index={index} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    isComplete ? 'bg-green-500' : hasStarted ? 'bg-orange-500' : 'bg-red-500'
                  }`} />
                  <Link href={`/profile/${row.profile.id}`} className="font-semibold text-zinc-50 truncate hover:underline cursor-pointer">
                    {row.profile.name}{isMe && <span className="text-orange-400 text-xs ml-1">(you)</span>}
                  </Link>
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
      {rows.length === 0 && <EmptyState />}
    </div>
  )
}

function RecRows({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  const sorted = [...rows].sort((a, b) => {
    if (b.currentWeekCount !== a.currentWeekCount) return b.currentWeekCount - a.currentWeekCount
    return b.totalSessions - a.totalSessions
  })
  return (
    <div className="space-y-3">
      {sorted.map((row, index) => {
        const isMe = row.profile.id === currentUserId
        const hasSessionsThisWeek = row.currentWeekCount > 0
        return (
          <div
            key={row.profile.id}
            className={`rounded-2xl border p-4 transition ${
              isMe ? 'ring-1 ring-orange-500 border-orange-800 bg-orange-950/30' : 'border-zinc-800 bg-zinc-900'
            }`}
          >
            <div className="flex items-center gap-4">
              <RankLabel index={index} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${hasSessionsThisWeek ? 'bg-green-500' : 'bg-zinc-600'}`} />
                  <Link href={`/profile/${row.profile.id}`} className="font-semibold text-zinc-50 truncate hover:underline cursor-pointer">
                    {row.profile.name}{isMe && <span className="text-orange-400 text-xs ml-1">(you)</span>}
                  </Link>
                </div>
              </div>
              <div className="flex gap-4 text-right shrink-0">
                <div>
                  <p className="text-xs text-zinc-500">This week</p>
                  <p className={`text-lg font-bold ${hasSessionsThisWeek ? 'text-green-400' : 'text-zinc-600'}`}>
                    {row.currentWeekCount}
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
      {sorted.length === 0 && <EmptyState />}
    </div>
  )
}

function AllRows({ rows, currentUserId }: { rows: Row[]; currentUserId: string }) {
  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const isMe = row.profile.id === currentUserId
        const isComp = row.profile.is_comp
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
              <RankLabel index={index} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    isComp
                      ? (isComplete ? 'bg-green-500' : hasStarted ? 'bg-orange-500' : 'bg-red-500')
                      : (hasStarted ? 'bg-green-500' : 'bg-zinc-600')
                  }`} />
                  <Link href={`/profile/${row.profile.id}`} className="font-semibold text-zinc-50 truncate hover:underline cursor-pointer">
                    {row.profile.name}{isMe && <span className="text-orange-400 text-xs ml-1">(you)</span>}
                  </Link>
                  {isComp && (
                    <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-900 font-bold text-xs px-1.5 py-0.5 rounded shadow-sm shadow-amber-500/30 shrink-0">COMP</span>
                  )}
                </div>
                {isComp && (
                  <div className="text-xs text-zinc-500 mt-0.5 ml-4">
                    {row.relegationCount > 0 && (
                      <span className="text-red-400 mr-2">{row.relegationCount} miss{row.relegationCount !== 1 ? 'es' : ''}</span>
                    )}
                    {row.currentStreak > 0 && (
                      <span className="text-orange-400 mr-2">🔥 {row.currentStreak}wk streak</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-right shrink-0">
                <div>
                  <p className="text-xs text-zinc-500">This week</p>
                  <p className={`text-lg font-bold ${
                    isComp
                      ? (isComplete ? 'text-green-400' : hasStarted ? 'text-orange-400' : 'text-red-400')
                      : (hasStarted ? 'text-green-400' : 'text-zinc-600')
                  }`}>
                    {row.currentWeekCount}
                    {isComp && <span className="text-zinc-600 text-sm font-normal">/{REQUIRED_SESSIONS_PER_WEEK}</span>}
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
      {rows.length === 0 && <EmptyState />}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-zinc-600">
      <p className="text-4xl mb-3">🏋️</p>
      <p>No data yet. Start submitting!</p>
    </div>
  )
}

export default function ScoreboardTabs({ rows, currentUserId, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState<'comp' | 'rec' | 'all'>(defaultTab)

  const compRows = rows.filter(r => r.profile.is_comp)
  const recRows = rows.filter(r => !r.profile.is_comp)

  const tabClass = (tab: 'comp' | 'rec' | 'all') =>
    activeTab === tab
      ? 'bg-zinc-800 text-zinc-50 px-4 py-1.5 rounded-lg text-sm font-medium'
      : 'text-zinc-400 hover:text-zinc-200 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors'

  return (
    <div>
      <div className="flex gap-1 mb-6 bg-zinc-900 rounded-xl p-1 w-fit">
        <button className={tabClass('comp')} onClick={() => setActiveTab('comp')}>
          Comp ({compRows.length})
        </button>
        <button className={tabClass('rec')} onClick={() => setActiveTab('rec')}>
          Rec ({recRows.length})
        </button>
        <button className={tabClass('all')} onClick={() => setActiveTab('all')}>
          All
        </button>
      </div>

      {activeTab === 'comp' && (
        <>
          <div className="flex gap-4 text-xs text-zinc-500 mb-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Complete this week</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> In progress</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Relegated</span>
          </div>
          <CompRows rows={compRows} currentUserId={currentUserId} />
        </>
      )}
      {activeTab === 'rec' && <RecRows rows={recRows} currentUserId={currentUserId} />}
      {activeTab === 'all' && <AllRows rows={rows} currentUserId={currentUserId} />}
    </div>
  )
}
