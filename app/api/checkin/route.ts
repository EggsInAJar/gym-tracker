import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const GYMS = [
  // RSF (Recreational Sports Facility) at UC Berkeley - 2301 Bancroft Way
  { name: 'RSF at Berkeley', lat: 37.86854, lng: -122.26278, radiusKm: 0.2 },
  // Planet Fitness - 4349 San Pablo Ave, Emeryville, CA 94608
  { name: 'Planet Fitness Emeryville', lat: 37.84471, lng: -122.28533, radiusKm: 0.2 },
]

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function findGym(lat: number, lng: number) {
  return GYMS.find(gym => distanceKm(gym.lat, gym.lng, lat, lng) <= gym.radiusKm) ?? null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lat, lng } = await request.json()
  if (!lat || !lng) return NextResponse.json({ error: 'Location required' }, { status: 400 })

  // Check for existing active checkin
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', user.id)
    .is('checked_out_at', null)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already checked in' }, { status: 400 })

  const gym = findGym(lat, lng)
  if (!gym) {
    return NextResponse.json(
      { error: 'You must be at an approved gym to check in.' },
      { status: 400 }
    )
  }

  const { data: checkin, error } = await supabase
    .from('checkins')
    .insert({ user_id: user.id, location_lat: lat, location_lng: lng, gym_name: gym.name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checkin })
}
