import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseDocument } from '@/lib/ingest/parser'
import {
  mergeParsedAssessmentBundles,
  parseStandardisedAssessmentText,
} from '@/lib/assessments/standardised'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const files = formData
    .getAll('files')
    .filter((entry): entry is File => entry instanceof File)

  const singleFile = formData.get('file')
  if (singleFile instanceof File) files.push(singleFile)

  if (files.length === 0) {
    return NextResponse.json({ error: 'No assessment file provided' }, { status: 400 })
  }

  try {
    const bundles = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer())
        const text = await parseDocument(buffer, file.name)
        return parseStandardisedAssessmentText({ filename: file.name, text })
      }),
    )

    const parsed = mergeParsedAssessmentBundles(bundles)
    if (Object.keys(parsed.scores).length === 0) {
      return NextResponse.json(
        { error: 'No supported standardised OT assessment scores were detected.' },
        { status: 422 },
      )
    }

    return NextResponse.json(parsed)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to parse assessment file' },
      { status: 500 },
    )
  }
}
