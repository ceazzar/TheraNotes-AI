import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL
const AGENT_API_KEY = process.env.AGENT_API_KEY

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportId } = await request.json()

  if (!AGENT_SERVICE_URL || !AGENT_API_KEY) {
    return NextResponse.json(
      { error: 'Agent service is not configured' },
      { status: 503 }
    )
  }

  const { data: report } = await supabase
    .from('reports')
    .select('id')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  let res: Response
  try {
    res = await fetch(`${AGENT_SERVICE_URL}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_API_KEY}`,
      },
      body: JSON.stringify({ report_id: reportId, user_id: user.id }),
    })
  } catch {
    return NextResponse.json(
      { error: 'Agent service is unavailable' },
      { status: 503 }
    )
  }

  const data = await res.json()

  if (data.flags) {
    await supabase
      .from('reports')
      .update({ planner_review: { flags: data.flags, reviewed_at: new Date().toISOString() } })
      .eq('id', reportId)
      .eq('user_id', user.id)
  }

  return NextResponse.json(data, { status: res.status })
}
