import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function findNearbyGym(lat: number, lng: number): Promise<string | null> {
  const query = `
    [out:json][timeout:10];
    (
      node["leisure"="fitness_centre"](around:300,${lat},${lng});
      node["sport"="fitness"](around:300,${lat},${lng});
      way["leisure"="fitness_centre"](around:300,${lat},${lng});
      way["sport"="fitness"](around:300,${lat},${lng});
      node["amenity"="gym"](around:300,${lat},${lng});
    );
    out center 1;
  `
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.elements?.length > 0) {
      return data.elements[0].tags?.name || 'Gym'
    }
    return null
  } catch {
    return null
  }
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

  const gymName = await findNearbyGym(lat, lng)
  if (!gymName) {
    return NextResponse.json(
      { error: 'No gym detected at your location. Make sure you\'re inside a gym.' },
      { status: 400 }
    )
  }

  const { data: checkin, error } = await supabase
    .from('checkins')
    .insert({ user_id: user.id, location_lat: lat, location_lng: lng, gym_name: gymName })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checkin })
}
