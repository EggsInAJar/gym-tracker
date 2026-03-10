import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MIN_SESSION_MINUTES = 45

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { checkinId, lat, lng } = await request.json()

  const { data: checkin } = await supabase
    .from('checkins')
    .select('*')
    .eq('id', checkinId)
    .eq('user_id', user.id)
    .is('checked_out_at', null)
    .single()

  if (!checkin) return NextResponse.json({ error: 'No active checkin found' }, { status: 400 })

  // Verify still within 500m of original checkin location
  const distance = distanceKm(checkin.location_lat, checkin.location_lng, lat, lng)
  if (distance > 0.5) {
    return NextResponse.json({ error: 'You must be at the gym to check out' }, { status: 400 })
  }

  // Verify session is at least 45 minutes
  const durationMinutes = Math.floor(
    (Date.now() - new Date(checkin.checked_in_at).getTime()) / 60000
  )
  if (durationMinutes < MIN_SESSION_MINUTES) {
    const remaining = MIN_SESSION_MINUTES - durationMinutes
    return NextResponse.json(
      { error: `Session too short. ${remaining} more minute${remaining !== 1 ? 's' : ''} to go.` },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('checkins')
    .update({ checked_out_at: new Date().toISOString(), duration_minutes: durationMinutes })
    .eq('id', checkinId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, durationMinutes })
}
