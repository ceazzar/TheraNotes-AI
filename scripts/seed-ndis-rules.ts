import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const seedPath = join(process.cwd(), 'agents/test_data/ndis_rules_seed.json')
  const rules = JSON.parse(readFileSync(seedPath, 'utf-8'))
  console.log(`Seeding ${rules.length} NDIS rules...`)
  const { error } = await supabase.from('ndis_rules').insert(rules)
  if (error) { console.error('Error:', error.message); process.exit(1) }
  const { count } = await supabase.from('ndis_rules').select('*', { count: 'exact', head: true })
  console.log(`Done. ${count} NDIS rules in database.`)
}

main().catch(console.error)
