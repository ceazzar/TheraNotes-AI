import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8080'
const AGENT_API_KEY = process.env.AGENT_API_KEY || ''

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { assessmentId, trigger } = await request.json()

  if (!assessmentId || !trigger) {
    return NextResponse.json(
      { error: 'assessmentId and trigger are required' },
      { status: 400 }
    )
  }

  const res = await fetch(`${AGENT_SERVICE_URL}/companion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGENT_API_KEY}`,
    },
    body: JSON.stringify({ assessment_id: assessmentId, trigger }),
  })

  const data = await res.json()

  return NextResponse.json(data, { status: res.status })
}
