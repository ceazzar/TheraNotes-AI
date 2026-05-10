/**
 * Clinician profile — single-row-per-user record holding identity and clinic
 * details that pre-fill report headers and the /generate intake form.
 *
 * The underlying `clinician_profiles` table was created in migration 003 for
 * an older feature set (correction tracking, common_gaps). Migration 008 added
 * the human-facing identity fields. This module defines the typed shape and
 * the read/upsert helpers used by Settings and /generate.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ClinicianProfile {
  user_id: string
  display_name: string | null
  credentials: string | null
  ahpra_registration: string | null
  contact_email: string | null
  contact_phone: string | null
  clinic_name: string | null
  clinic_abn: string | null
  ndis_provider_number: string | null
  clinic_address: string | null
}

export type ClinicianProfileUpdate = Omit<ClinicianProfile, 'user_id'>

const PROFILE_COLUMNS =
  'user_id, display_name, credentials, ahpra_registration, contact_email, contact_phone, clinic_name, clinic_abn, ndis_provider_number, clinic_address'

/**
 * Fetch a profile by user id. Returns null if no row exists yet (first-time
 * user — settings will create one on first save).
 */
export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ClinicianProfile | null> {
  const { data, error } = await supabase
    .from('clinician_profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as ClinicianProfile | null) ?? null
}

/**
 * Upsert profile fields. Creates the row if missing.
 */
export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: ClinicianProfileUpdate,
): Promise<ClinicianProfile> {
  const payload = {
    user_id: userId,
    ...updates,
  }
  const { data, error } = await supabase
    .from('clinician_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select(PROFILE_COLUMNS)
    .single()
  if (error) throw error
  return data as ClinicianProfile
}
