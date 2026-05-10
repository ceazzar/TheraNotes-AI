/**
 * Full E2E test: Peter Parker FCA Report Generation
 *
 * Tests the complete generation pipeline by authenticating,
 * creating an assessment, calling /api/generate for each section,
 * running the coherence check, then comparing output against
 * the gold standard reference report.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const OUTPUT_DIR = join(__dirname, 'output')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = join(ROOT, '.env.local')
  const content = readFileSync(envPath, 'utf8')
  const env = {}
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      let val = match[2].trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      val = val.replace(/\\n$/, '')
      env[match[1].trim()] = val
    }
  }
  return env
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const env = loadEnv()
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const BASE_URL = 'http://localhost:3000'
const TEST_EMAIL = 'test@user.com'
const TEST_PASSWORD = 'test123'

// Section generation order (from template.json, excluding auto_generate)
const SECTIONS = [
  'Report Header / Participant Details',
  'Report Overview',
  'Assessment Process',
  'Part A: About The Participant',
  'Part B: Mental Health And Psychosocial Functioning',
  'Part C: Functional Impairments Relating To Disability',
  'Part D: Assessment Findings',
  'Part E: Summary & Recommendations',
]

// ---------------------------------------------------------------------------
// Input data
// ---------------------------------------------------------------------------

const clinicalNotes = readFileSync(
  join(ROOT, 'docs/peter-parker/Input - Clinical Note.md'),
  'utf8'
)
const transcriptSummary = readFileSync(
  join(ROOT, 'docs/peter-parker/Input - Assessment Transcript Summary.md'),
  'utf8'
)
const combinedNotes = `${clinicalNotes}\n\n${transcriptSummary}`

// ---------------------------------------------------------------------------
// API caller with auth
// ---------------------------------------------------------------------------

let _fullSession = null

async function callAPI(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: buildAuthCookies(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`API ${path} returned ${res.status}: ${errBody.error || res.statusText}`)
  }

  return res.json()
}

function buildAuthCookies() {
  const projectRef = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1]
  const baseName = `sb-${projectRef}-auth-token`

  const sessionJson = JSON.stringify(_fullSession)
  const chunkSize = 3180
  const cookies = []

  if (sessionJson.length <= chunkSize) {
    cookies.push(`${baseName}=${encodeURIComponent(sessionJson)}`)
  } else {
    for (let i = 0; i * chunkSize < sessionJson.length; i++) {
      const chunk = sessionJson.slice(i * chunkSize, (i + 1) * chunkSize)
      cookies.push(`${baseName}.${i}=${encodeURIComponent(chunk)}`)
    }
  }

  return cookies.join('; ')
}

// ---------------------------------------------------------------------------
// Main test
// ---------------------------------------------------------------------------

async function run() {
  mkdirSync(OUTPUT_DIR, { recursive: true })

  console.log('=== Peter Parker FCA E2E Test (API) ===')
  console.log(`Timestamp: ${timestamp()}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log()

  // Step 1: Authenticate
  console.log('[1/5] Authenticating...')
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error: signInErr } =
    await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    })

  if (signInErr || !authData?.session) {
    console.error('Sign in failed:', signInErr?.message)
    process.exit(1)
  }

  _fullSession = authData.session
  const userId = _fullSession.user.id
  console.log(`  User: ${userId}`)

  // Step 2: Create assessment with FULL intake (drawn from gold standard FCA report).
  // Phase B verification: with all intake fields populated, every section should
  // generate (none gated as 'pending'), and the report should approach 0 INSUF markers.
  console.log('[2/5] Creating assessment with full intake...')
  const { data: assessment, error: assessmentErr } = await supabase
    .from('assessments')
    .insert({
      user_id: userId,
      title: 'Peter Parker FCA',
      participant_name: 'Peter Parker',
      participant_dob: '1975-08-15',
      ndis_number: '123456789',
      assessor_name: 'Mary Jane Watson',
      assessor_credentials: 'Occupational Therapist',
      assessment_dates: '20 January 2026',
      assessment_location: 'Telehealth',
      clinical_notes: combinedNotes,
      functional_domains: {},
      intake_metadata: {
        client: {
          address: 'Unit 12/5-7 Maple Street, Oakwood Heights',
          plan_start: '2022-03-05',
          plan_end: '2026-03-04',
          nok_phone: '0412 345 678',
        },
        assessor: {
          email: 'mj@horizonhealth.com.au',
          company: 'Horizon Health Australia',
        },
        assessment: {
          report_date: '2026-01-27',
          mode: 'telehealth',
        },
      },
      standardized_scores: {
        whodas: {
          understanding_communicating: 70,
          getting_around: 75,
          self_care: 50,
          getting_along: 75,
          life_activities: 90,
          participation: 75,
          overall: 73,
          percentile: 98.1,
        },
        sensory_profile: {
          low_registration: 'Much more than most people',
          sensation_avoiding: 'Much more than most people',
          sensory_sensitivity: 'Much more than most people',
          sensation_seeking: 'Much less than most people',
        },
      },
      ndis_goals: [
        'I would like to live independently in my home for as long as possible and rely less on my informal support',
        'I would like to work on my mental wellbeing and be able to enter the community and meet people in a manner that I feel safe and secure',
      ],
      status: 'generating',
    })
    .select('id')
    .single()

  if (assessmentErr || !assessment) {
    console.error('Failed to create assessment:', assessmentErr?.message)
    process.exit(1)
  }
  console.log(`  Assessment ID: ${assessment.id}`)

  // Step 3: Generate each section
  console.log(`[3/5] Generating ${SECTIONS.length} sections...`)
  const startTime = Date.now()
  let reportId = null
  const results = {}

  for (let i = 0; i < SECTIONS.length; i++) {
    const sectionName = SECTIONS[i]
    const sectionStart = Date.now()
    console.log(`  [${i + 1}/${SECTIONS.length}] ${sectionName}...`)

    try {
      const data = await callAPI('/api/generate', {
        assessmentId: assessment.id,
        reportId,
        sectionId: sectionName,
        clinicalNotes: combinedNotes,
      })

      reportId = data.reportId
      results[data.sectionId] = {
        content: data.content,
        insufficientData: data.insufficientData,
        status: data.status ?? 'ready',
        missing: data.missing,
        words: (data.content || '').split(/\s+/).filter(Boolean).length,
        duration: ((Date.now() - sectionStart) / 1000).toFixed(1),
      }

      const statusTag =
        data.status === 'pending'
          ? ` [PENDING — missing: ${(data.missing || []).join(', ')}]`
          : data.insufficientData
            ? ' [INSUFFICIENT DATA]'
            : ''
      console.log(
        `    Done in ${results[data.sectionId].duration}s ` +
        `(${results[data.sectionId].words} words)${statusTag}`
      )
    } catch (err) {
      console.error(`    FAILED: ${err.message}`)
      results[sectionName] = { error: err.message }
    }
  }

  console.log(`  Report ID: ${reportId}`)

  // Step 4: Run coherence check
  console.log('[4/5] Running coherence check...')
  try {
    const coherence = await callAPI('/api/generate', {
      action: 'coherence_check',
      reportId,
      clinicalNotes: combinedNotes,
    })

    console.log('  Coherence result:', coherence.coherenceResult?.slice(0, 100) + '...')

    const coherencePath = join(OUTPUT_DIR, `peter-parker-coherence-${timestamp()}.md`)
    writeFileSync(coherencePath, coherence.coherenceResult || '')
    console.log(`  Saved: ${coherencePath}`)
  } catch (err) {
    console.error('  Coherence check failed:', err.message)
  }

  // Update assessment status
  await supabase
    .from('assessments')
    .update({ status: 'complete' })
    .eq('id', assessment.id)

  const totalDuration = ((Date.now() - startTime) / 1000 / 60).toFixed(1)

  // Step 5: Save and compare
  console.log('[5/5] Saving output and comparing...')

  // Build full markdown
  let generatedMarkdown = '# Functional Capacity Assessment Report\n\n'
  generatedMarkdown += `**Participant:** Peter Parker\n`
  generatedMarkdown += `**NDIS Number:** 123456789\n`
  generatedMarkdown += `**Assessor:** Mary Jane Watson\n`
  generatedMarkdown += `**Report ID:** ${reportId}\n`
  generatedMarkdown += `**Generated:** ${new Date().toISOString()}\n\n---\n\n`

  for (const sectionName of SECTIONS) {
    const result = results[sectionName]
    if (result?.content) {
      generatedMarkdown += `# ${sectionName}\n\n`
      generatedMarkdown += `${result.content}\n\n---\n\n`
    } else if (result?.error) {
      generatedMarkdown += `# ${sectionName}\n\n[GENERATION ERROR: ${result.error}]\n\n---\n\n`
    }
  }

  const ts = timestamp()
  const outputPath = join(OUTPUT_DIR, `peter-parker-generated-${ts}.md`)
  writeFileSync(outputPath, generatedMarkdown)

  // Save raw data
  const jsonPath = join(OUTPUT_DIR, `peter-parker-generated-${ts}.json`)
  writeFileSync(jsonPath, JSON.stringify({ reportId, assessment: assessment.id, results }, null, 2))

  // === Report ===
  const goldStandard = readFileSync(join(ROOT, 'docs/peter-parker/Peter Parker - FCA Report.md'), 'utf8')
  const genWords = generatedMarkdown.split(/\s+/).length
  const goldWords = goldStandard.split(/\s+/).length
  const successCount = Object.values(results).filter(r => r.status === 'ready' && r.content).length
  const pendingCount = Object.values(results).filter(r => r.status === 'pending').length
  const failCount = Object.values(results).filter(r => r.error).length
  const insufficientCount = Object.values(results).filter(r => r.insufficientData).length

  console.log()
  console.log('='.repeat(60))
  console.log('E2E TEST RESULTS')
  console.log('='.repeat(60))
  console.log()
  console.log(`Duration:             ${totalDuration} minutes`)
  console.log(`Sections ready:       ${successCount} / ${SECTIONS.length}`)
  console.log(`Sections pending:     ${pendingCount} (intake gates not satisfied)`)
  console.log(`Sections failed:      ${failCount}`)
  console.log(`INSUF markers:        ${insufficientCount} (in ready sections)`)
  console.log()
  console.log(`Generated words:      ${genWords}`)
  console.log(`Gold standard words:  ${goldWords}`)
  console.log(`Word ratio:           ${(genWords / goldWords * 100).toFixed(0)}%`)
  console.log()

  // Section-by-section breakdown
  console.log('Section breakdown:')
  console.log('-'.repeat(60))
  for (const sectionName of SECTIONS) {
    const r = results[sectionName]
    if (r?.status === 'pending') {
      console.log(`  ${sectionName}: PENDING (missing: ${(r.missing || []).join(', ')})`)
    } else if (r?.content) {
      const flag = r.insufficientData ? ' [INSUF]' : ''
      console.log(`  ${sectionName}: ${r.words} words, ${r.duration}s${flag}`)
    } else {
      console.log(`  ${sectionName}: FAILED - ${r?.error || 'unknown'}`)
    }
  }

  // Check for INSUFFICIENT DATA markers
  const insufficientMatches = generatedMarkdown.match(/\[INSUFFICIENT DATA[^\]]*\]/g)
  if (insufficientMatches) {
    console.log()
    console.log(`INSUFFICIENT DATA markers (${insufficientMatches.length}):`)
    for (const m of insufficientMatches) console.log(`  - ${m}`)
  }

  console.log()
  console.log('Output files:')
  console.log(`  Report:    ${outputPath}`)
  console.log(`  JSON:      ${jsonPath}`)
  console.log()
  console.log(`Report viewer: ${BASE_URL}/report/${reportId}`)
  console.log(`Workspace:     ${BASE_URL}/workspace/${reportId}`)
  console.log()
  console.log('Done!')
}

run().catch((err) => {
  console.error('E2E test failed:', err)
  process.exit(1)
})
