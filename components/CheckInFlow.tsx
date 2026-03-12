'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentWeek } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const MIN_MINUTES = 45

interface Checkin {
  id: string
  checked_in_at: string
  gym_name: string
  location_lat: number
  location_lng: number
}

interface CheckInFlowProps {
  userId: string
  currentCount: number
  activeCheckin: Checkin | null
  disabled: boolean
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

type Phase = 'idle' | 'checking_in' | 'active' | 'checking_out' | 'uploading' | 'verifying' | 'done'

export default function CheckInFlow({ userId, currentCount, activeCheckin, disabled }: CheckInFlowProps) {
  const [phase, setPhase] = useState<Phase>(activeCheckin ? 'active' : 'idle')
  const [checkin, setCheckin] = useState<Checkin | null>(activeCheckin)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (phase !== 'active' || !checkin) return
    const update = () => {
      setElapsed(Math.floor((Date.now() - new Date(checkin.checked_in_at).getTime()) / 1000))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [phase, checkin])

  const getLocation = (): Promise<GeolocationCoordinates> =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation not supported by your browser'))
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        () => reject(new Error('Could not get your location. Please enable location permissions.')),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })

  const handleCheckIn = async () => {
    setPhase('checking_in')
    setError('')
    try {
      const coords = await getLocation()
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: coords.latitude, lng: coords.longitude }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCheckin(data.checkin)
      setPhase('active')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in')
      setPhase('idle')
    }
  }

  const handleCheckOut = async () => {
    if (!checkin) return
    setPhase('checking_out')
    setError('')
    try {
      const coords = await getLocation()
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkinId: checkin.id, lat: coords.latitude, lng: coords.longitude }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPhase('uploading')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check out')
      setPhase('active')
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Image must be under 10MB'); return }

    setPhase('verifying')
    setError('')

    try {
      const supabase = createClient()
      const { week, year } = getCurrentWeek()
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${year}-${week}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('gym-photos')
        .upload(fileName, file, { upsert: false })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('gym-photos').getPublicUrl(fileName)

      // Verify with Claude
      const verifyRes = await fetch('/api/verify-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: publicUrl }),
      })
      const verifyData = await verifyRes.json()

      if (!verifyData.verified) {
        await supabase.storage.from('gym-photos').remove([fileName])
        throw new Error(`Not a gym photo: ${verifyData.reason}`)
      }

      const { error: dbError } = await supabase.from('submissions').insert({
        user_id: userId,
        photo_url: publicUrl,
        week_number: week,
        year,
        checkin_id: checkin?.id ?? null,
      })
      if (dbError) throw dbError

      setPhase('done')
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try again.')
      setPhase('uploading')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (disabled) {
    return (
      <div className="w-full py-4 rounded-2xl bg-green-950 border border-green-800 text-green-400 font-semibold text-center">
        Week complete! See you next Monday 💪
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="w-full py-4 rounded-2xl bg-green-950 border border-green-800 text-green-400 font-semibold text-center">
        ✓ Session logged!
      </div>
    )
  }

  if (phase === 'uploading' || phase === 'verifying') {
    return (
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
          id="photo-upload"
        />
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4">
          <p className="text-zinc-50 font-semibold">Gym session verified!</p>
          <p className="text-zinc-400 text-sm">Submit a photo to log your session</p>
          {phase === 'verifying' ? (
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
              <Spinner /> Verifying photo with AI...
            </div>
          ) : (
            <label
              htmlFor="photo-upload"
              className="block w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm cursor-pointer transition-colors"
            >
              Upload gym photo
            </label>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    )
  }

  if (phase === 'active' || phase === 'checking_out') {
    const elapsedMinutes = Math.floor(elapsed / 60)
    const canCheckOut = elapsedMinutes >= MIN_MINUTES
    const remaining = Math.max(0, MIN_MINUTES - elapsedMinutes)

    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Checked in at</p>
            <p className="text-zinc-50 font-semibold mt-0.5">{checkin?.gym_name}</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-400 text-xs">Session time</p>
            <p className="text-2xl font-mono font-bold text-zinc-50">{formatDuration(elapsed)}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
            <span>0 min</span>
            <span>{MIN_MINUTES} min required</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${canCheckOut ? 'bg-green-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min(100, (elapsedMinutes / MIN_MINUTES) * 100)}%` }}
            />
          </div>
        </div>

        {!canCheckOut && (
          <p className="text-zinc-500 text-sm text-center">
            {remaining} more minute{remaining !== 1 ? 's' : ''} until you can check out
          </p>
        )}

        <button
          onClick={handleCheckOut}
          disabled={!canCheckOut || phase === 'checking_out'}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-colors bg-green-600 hover:bg-green-700 text-white disabled:bg-zinc-700 disabled:text-zinc-500"
        >
          {phase === 'checking_out' ? (
            <span className="flex items-center justify-center gap-2"><Spinner /> Verifying location...</span>
          ) : 'Check Out'}
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
    )
  }

  // idle or checking_in
  return (
    <div>
      <button
        onClick={handleCheckIn}
        disabled={phase === 'checking_in'}
        className="w-full py-4 rounded-2xl font-semibold text-sm transition-colors bg-orange-500 hover:bg-orange-600 text-white disabled:bg-zinc-700 disabled:text-zinc-500"
      >
        {phase === 'checking_in' ? (
          <span className="flex items-center justify-center gap-2"><Spinner /> Finding gym...</span>
        ) : `Check In (${currentCount}/4 this week)`}
      </button>
      {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
      <p className="text-zinc-600 text-xs text-center mt-2">You must be at a gym to check in</p>
    </div>
  )
}
