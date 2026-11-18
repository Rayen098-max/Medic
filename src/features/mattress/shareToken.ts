/**
 * Scoped, opaque share links for the SmartGRID Posture Lab.
 *
 * The customer-facing URL never carries a patient id. It carries only an
 * opaque token that the database resolves to a first name. The SQL functions
 * in supabase/migrations/20261118_mattress_share_tokens.sql are the security
 * boundary; this module only talks to them.
 */

import { supabase } from '@/utils/db';

const TOKEN_PATTERN = /^[a-f0-9]{32,64}$/i;
const MAX_GREETING_LENGTH = 24;

/**
 * Keep only the first name, strip control/format characters and cap length.
 * React escapes the value again at render time; this is defence in depth.
 */
export function sanitizeFirstName(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  // Strip control, zero-width and bidi override characters before parsing.
  // eslint-disable-next-line no-control-regex
  const CONTROL_AND_BIDI = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

  const first = value
    .normalize('NFKC')
    .replace(CONTROL_AND_BIDI, ' ')
    .trim()
    .split(/\s+/)[0]
    ?.slice(0, MAX_GREETING_LENGTH);

  if (!first) return null;

  // Allow letters, marks, apostrophes, hyphens and dots (common in names).
  const cleaned = first.replace(/[^\p{L}\p{M}'’.-]/gu, '');
  return cleaned.length > 0 ? cleaned : null;
}

export function buildMattressSharePath(token: string): string | null {
  const trimmed = token.trim();
  if (!TOKEN_PATTERN.test(trimmed)) return null;
  return `/mattress/s/${trimmed}`;
}

/**
 * Create a scoped share token for one patient. Only a physio who owns the
 * patient (or an admin/manager) can succeed; the RPC enforces that check.
 * Returns null when the migration is not deployed or the caller is not allowed.
 */
export async function createMattressShareToken(
  patientId: string,
  hours = 168
): Promise<string | null> {
  if (!supabase || !patientId) return null;

  try {
    const { data, error } = await supabase.rpc('create_mattress_share_token', {
      p_patient_id: patientId,
      p_hours: hours
    });

    if (error) {
      console.warn('Could not create SmartGRID share token:', error.message);
      return null;
    }

    const token = typeof data === 'string' ? data.trim() : '';
    return TOKEN_PATTERN.test(token) ? token : null;
  } catch (error) {
    console.warn('Could not create SmartGRID share token:', error);
    return null;
  }
}

/**
 * Resolve only the greeting first name for a token. The RPC returns a single
 * first_name column and nothing else — no patient id, consultation or contact
 * details can be fetched through this path.
 */
export async function getMattressShareGreeting(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!supabase || !TOKEN_PATTERN.test(trimmed)) return null;

  try {
    const { data, error } = await supabase.rpc('get_mattress_share_greeting', {
      p_token: trimmed
    });

    if (error) return null;

    const row = Array.isArray(data) ? data[0] : data;
    return sanitizeFirstName(row?.first_name);
  } catch {
    return null;
  }
}
