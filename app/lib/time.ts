/* ════════════════════════════════════════════════════════════════════════════
   Australia/Sydney time — the single source of "what time is it for Ansar".

   Every gate in gating.ts is decided against a clock produced here, and every
   one of them is only as trustworthy as this file. Three rules, all learned the
   hard way:

   1. NEVER hardcode an offset. `getUTCHours() + 10` is wrong for roughly half
      the year — Sydney is UTC+11 during AEDT (early Oct to early Apr). A gate
      running an hour early in summer would reject legitimate 6:30am ticks.
   2. NEVER append "+10:00" to a timestamp string. That was tried on this
      codebase before and reverted: it shifted everything by ten hours because
      the value it was applied to was already UTC.
   3. NEVER round-trip a calendar date through toISOString(). A "YYYY-MM-DD"
      here is a calendar date, not an instant; converting it via local time and
      reading it back in UTC drifts by a day depending on where the process runs.

   The only correct primitive is Intl.DateTimeFormat with an IANA zone, which
   knows the DST rules. Everything below is built on it.
   ══════════════════════════════════════════════════════════════════════════ */

export const TZ = "Australia/Sydney";

// en-CA formats as YYYY-MM-DD, which is exactly the shape of a Supabase `date`
// column, so the key needs no reassembly.
const DATE_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// hourCycle h23 matters: with hour12:false some locales render midnight as "24",
// which would parse to minute-of-day 1440 and put every gate an entire day out.
const PARTS_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hourCycle: "h23",
  weekday: "long",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export interface SydneyNow {
  /** Calendar date in Sydney, YYYY-MM-DD. The daily reset key. */
  date: string;
  /** "Monday" … "Sunday", in Sydney. */
  weekday: string;
  hour: number;
  minute: number;
  second: number;
  /** Minutes since Sydney midnight — the unit every window comparison uses. */
  minutesOfDay: number;
  /** The underlying instant, UTC ISO. What actually gets written to Supabase. */
  iso: string;
  /** Epoch millis of the same instant, for dwell arithmetic. */
  ms: number;
}

/** Calendar date in Sydney as YYYY-MM-DD. */
export function sydneyDateKey(at: Date = new Date()): string {
  return DATE_FMT.format(at);
}

/** The full Sydney-local view of an instant. */
export function sydneyNow(at: Date = new Date()): SydneyNow {
  const parts: Record<string, string> = {};
  for (const p of PARTS_FMT.formatToParts(at)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    hour,
    minute,
    second: Number(parts.second),
    minutesOfDay: hour * 60 + minute,
    iso: at.toISOString(),
    ms: at.getTime(),
  };
}

/** Minutes since Sydney midnight. */
export function sydneyMinutesOfDay(at: Date = new Date()): number {
  return sydneyNow(at).minutesOfDay;
}

/** Sydney weekday name. */
export function sydneyWeekday(at: Date = new Date()): string {
  return sydneyNow(at).weekday;
}

/** True on Saturday or Sunday **in Sydney** — the wallet redemption window. */
export function isSydneyWeekend(at: Date = new Date()): boolean {
  const d = sydneyNow(at).weekday;
  return d === "Saturday" || d === "Sunday";
}

/**
 * "HH:MM" (24hr) → minutes since midnight, or null if it isn't a valid time.
 * Null is meaningful to callers: an unset or malformed window means "no window",
 * not "midnight". See gating.ts for how that is handled.
 */
export function parseHHMM(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Minutes since midnight → "6:30am", for button labels. */
export function formatClock(minutesOfDay: number | null): string {
  if (minutesOfDay === null) return "";
  const h24 = Math.floor(minutesOfDay / 60);
  const m = minutesOfDay % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

/**
 * Calendar-date arithmetic. Entirely UTC-anchored: a "YYYY-MM-DD" is split into
 * numbers, walked with Date.UTC, and reassembled from UTC accessors. No local
 * time and no toISOString() round-trip is involved, so the answer is the same on
 * a Sydney laptop and a UTC build box.
 */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  const yy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Weekday name for a calendar date, UTC-anchored so it never drifts a day. */
export function dayNameOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", { timeZone: "UTC", weekday: "long" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** Monday of the Sydney week containing `dateStr`. */
export function weekStartOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dow = t.getUTCDay();              // 0 = Sunday
  return addDays(dateStr, dow === 0 ? -6 : 1 - dow);
}
