'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PREditorProps {
  userId: string
  initialBench: number | null
  initialSquat: number | null
  initialDeadlift: number | null
}

export default function PREditor({ userId, initialBench, initialSquat, initialDeadlift }: PREditorProps) {
  const [editing, setEditing] = useState(false)
  const [bench, setBench] = useState(initialBench?.toString() ?? '')
  const [squat, setSquat] = useState(initialSquat?.toString() ?? '')
  const [deadlift, setDeadlift] = useState(initialDeadlift?.toString() ?? '')
  const [saved, setSaved] = useState({ bench: initialBench, squat: initialSquat, deadlift: initialDeadlift })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const updates = {
      bench_pr: bench !== '' ? parseInt(bench) : null,
      squat_pr: squat !== '' ? parseInt(squat) : null,
      deadlift_pr: deadlift !== '' ? parseInt(deadlift) : null,
    }
    await supabase.from('profiles').update(updates).eq('id', userId)
    setSaved({ bench: updates.bench_pr, squat: updates.squat_pr, deadlift: updates.deadlift_pr })
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => {
    setBench(saved.bench?.toString() ?? '')
    setSquat(saved.squat?.toString() ?? '')
    setDeadlift(saved.deadlift?.toString() ?? '')
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-6 flex-wrap">
        <PRDisplay label="Bench" value={saved.bench} />
        <PRDisplay label="Squat" value={saved.squat} />
        <PRDisplay label="Deadlift" value={saved.deadlift} />
        <button
          onClick={() => setEditing(true)}
          className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit PRs
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-end gap-4 flex-wrap">
      <PRInput label="Bench" value={bench} onChange={setBench} />
      <PRInput label="Squat" value={squat} onChange={setSquat} />
      <PRInput label="Deadlift" value={deadlift} onChange={setDeadlift} />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={handleCancel}
          className="text-zinc-400 hover:text-zinc-200 text-sm px-3 py-1.5 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
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

function PRInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-orange-500"
        />
        <span className="text-zinc-500 text-xs">lbs</span>
      </div>
    </div>
  )
}
