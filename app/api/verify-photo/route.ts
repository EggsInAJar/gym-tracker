import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photoUrl } = await request.json()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: photoUrl },
          },
          {
            type: 'text',
            text: 'Does this photo show a gym or fitness center environment? Look for gym equipment like weights, machines, benches, exercise areas, or people working out. Answer with YES or NO on the first line, then a brief one-sentence reason.',
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const verified = text.trim().toUpperCase().startsWith('YES')

  return NextResponse.json({ verified, reason: text })
}
