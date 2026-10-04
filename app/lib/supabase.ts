import { createClient } from '@supabase/supabase-js'
import { sydneyDateKey, sydneyWeekday, weekStartOf } from './time'

// The BROWSER client. Anon key only — after db/tick_hardening.sql runs this can
// SELECT and nothing else. Every write goes through /api/tick or /api/stretch,
// which hold the service role server-side. If you find yourself reaching for
// `supabase.from(...).insert(...)` in a component, that is the bug this whole
// branch exists to fix.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Whether a real Supabase target was configured for this build. */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

// createClient throws "supabaseUrl is required" at IMPORT time on an empty
// value, which killed `next build` while prerendering "/" — so a checkout with
// no secrets could not be built or tested at all. The placeholder keeps import
// side-effect-free; .invalid is reserved by RFC 6761 and can never resolve, so
// an unconfigured deploy fails at request time with a clear network error
// instead of failing the build. Limitation: NEXT_PUBLIC_* are inlined at build
// time, so a build without these vars stays unconfigured at runtime.
export const supabase = createClient(
  supabaseUrl || 'http://supabase.invalid',
  supabaseKey || 'anon-key-not-configured',
)

// ── Dates ───────────────────────────────────────────────────────────────────
// All three helpers now delegate to app/lib/time.ts, which is the single
// Australia/Sydney clock the server gates against. Keeping the browser on the
// same zone as the gates means a button never disagrees with the server about
// which day it is.
//
// The zone moved from Australia/Melbourne to Australia/Sydney to match the
// gates. Both zones share identical offsets and DST rules year-round, so no
// existing date key shifts — this is a naming change, not a behaviour one.

/** Calendar date in Sydney, YYYY-MM-DD. The daily habit-reset key. */
export function getTodayDate() {
  return sydneyDateKey()
}

/** Monday of the current Sydney week, YYYY-MM-DD. */
export function getWeekStart() {
  return weekStartOf(sydneyDateKey())
}

/** Weekday name in Sydney, e.g. "Tuesday". */
export function getTodayDayName() {
  return sydneyWeekday()
}
