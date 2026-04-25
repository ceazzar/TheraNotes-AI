import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL
const AGENT_API_KEY = process.env.AGENT_API_KEY

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

  if (!AGENT_SERVICE_URL || !AGENT_API_KEY) {
    return NextResponse.json(
      { error: 'Agent service is not configured' },
      { status: 503 }
    )
  }

  const { data: assessment } = await supabase
    .from('assessments')
    .select('id')
    .eq('id', assessmentId)
    .eq('user_id', user.id)
    .single()

  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  let res: Response
  try {
    res = await fetch(`${AGENT_SERVICE_URL}/companion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
      body: JSON.stringify({ assessment_id: assessmentId, trigger, user_id: user.id }),
    })
  } catch {
    return NextResponse.json(
      { error: 'Agent service is unavailable' },
      { status: 503 }
    )
  }

  const data = await res.json()

  return NextResponse.json(data, { status: res.status })
}
