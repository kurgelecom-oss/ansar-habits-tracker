import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Calendar date in Melbourne, as YYYY-MM-DD. Uses the IANA zone so AEST/AEDT
// (UTC+10/+11) is handled automatically — never a hardcoded offset. This is the
// key that gates the daily habit reset, so it must reflect Ansar's local day,
// not the server's UTC day.
export function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Melbourne" }).format(new Date())
}

export function getWeekStart() {
  // Anchor Melbourne's "today" at local noon so the weekday/date maths never
  // crosses a midnight boundary, then walk back to Monday. Format the result
  // from date components (no toISOString) to keep the key in the local day.
  const d = new Date(getTodayDate() + "T12:00:00")
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${dd}`
}

export function getTodayDayName() {
  return new Date().toLocaleDateString("en-AU", { weekday: "long" })
}
