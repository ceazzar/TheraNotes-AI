import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8080'
const AGENT_API_KEY = process.env.AGENT_API_KEY || ''

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reportId } = await request.json()

  const res: Response = await fetch(`${AGENT_SERVICE_URL}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGENT_API_KEY}`,
    },
    body: JSON.stringify({ report_id: reportId, user_id: user.id }),
  })

  const data = await res.json()

  if (data.flags) {
    await supabase
      .from('reports')
      .update({ planner_review: { flags: data.flags, reviewed_at: new Date().toISOString() } })
      .eq('id', reportId)
  }

  return NextResponse.json(data, { status: res.status })
}
