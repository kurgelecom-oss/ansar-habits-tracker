/* ════════════════════════════════════════════════════════════════════════════
   The Football Pathway week — v1.

   Built AROUND the homeschool day, never inside it:
     06:45  feet on floor → Dawn Touches (the existing "movement" habit)
     08:30–13:30  homeschool — football never takes a minute of this
     afternoon  the day's one main session
     Mon + Wed evening  club training (the existing soccer_training habit)
     Saturday  Saturday Push (easy — match tomorrow) + match prep
     Sunday  MATCH DAY — Pascoe Vale's junior league plays on Sundays
     Friday  the light day (touches, film, mobility)

   The weekly load is capped at 12 hours (one hour per year of age — the
   American Academy of Pediatrics rule of thumb for young athletes). The page
   shows the running total so the cap is visible, not buried.

   Times are v1 assumptions (club training assumed 5:30pm). Change them here.
   ══════════════════════════════════════════════════════════════════════════ */

export type SessionKind = "touches" | "technical" | "speed" | "strength" | "engine" | "club" | "match" | "film" | "rest" | "agent";

export interface Session {
  id: string;
  kind: SessionKind;
  icon: string;
  title: string;
  start: string; // HH:MM Melbourne
  minutes: number;
  /** Counts toward the 12-hour weekly football cap. Film study and the agent meeting do not. */
  countsToLoad: boolean;
  what: string[];
  href?: string;
}

export interface DayPlan {
  day: string;
  theme: string;
  headline: string;
  sessions: Session[];
  fuel: string;
  treatWindow: string | null;
  lightsOut: string;
}

const dawn: Session = {
  id: "dawn_touches", kind: "touches", icon: "🌅", title: "Dawn Touches", start: "06:50", minutes: 20, countsToLoad: true,
  what: ["5 min ball mastery (toe taps, sole rolls, inside-outs)", "5 min juggling — beat yesterday", "5 min wall passes, weak foot first", "5 min mobility"],
  href: "/pathway/drills",
};

export const WEEK: DayPlan[] = [
  {
    day: "Monday", theme: "Club Night", headline: "Sharp touches, then give everything at training.",
    sessions: [
      dawn,
      { id: "mon_weak_wall", kind: "technical", icon: "🦶", title: "Weak-foot wall", start: "15:45", minutes: 15, countsToLoad: true, what: ["100 passes weak foot only", "Count clean first touches out of 50"], href: "/pathway/drills#weak-wall-100" },
      { id: "club_mon", kind: "club", icon: "🏟️", title: "Club training", start: "17:30", minutes: 90, countsToLoad: true, what: ["Arrive 10 min early", "Ask the coach one question", "Win one thing: a race, a duel, a rondo"] },
    ],
    fuel: "Main meal by 2:30pm. Banana + water at 4:45pm. Recovery: milk + fruit within an hour of training.",
    treatWindow: null, lightsOut: "9:00pm",
  },
  {
    day: "Tuesday", theme: "Speed & Strength", headline: "Fast feet, strong body. Quality over quantity.",
    sessions: [
      dawn,
      { id: "tue_speed", kind: "speed", icon: "⚡", title: "Speed & agility", start: "15:45", minutes: 25, countsToLoad: true, what: ["FIFA 11+ Kids warm-up", "6 × 10 m starts, full rest", "4 × 5-10-5 shuttle", "Ladder: 3 patterns × 2"], href: "/pathway/fitness" },
      { id: "tue_strength", kind: "strength", icon: "💪", title: "Strength circuit A", start: "16:15", minutes: 25, countsToLoad: true, what: ["Bodyweight circuit A — 3 rounds", "Perfect form or stop"], href: "/pathway/strength" },
    ],
    fuel: "Normal day. Protein at every meal (eggs, chicken, yoghurt, beans).",
    treatWindow: null, lightsOut: "9:00pm",
  },
  {
    day: "Wednesday", theme: "Club Night", headline: "First touch like glue, then training.",
    sessions: [
      dawn,
      { id: "wed_touch", kind: "technical", icon: "🧲", title: "First-touch tune-up", start: "15:45", minutes: 15, countsToLoad: true, what: ["Half-turn receives off the wall × 40", "Aerial control × 20 each foot"], href: "/pathway/drills#half-turn" },
      { id: "club_wed", kind: "club", icon: "🏟️", title: "Club training", start: "17:30", minutes: 90, countsToLoad: true, what: ["Scan before every receive", "Talk: call for the ball by name", "Be first back when you lose it"] },
    ],
    fuel: "Same as Monday. Pack a water bottle and a snack for after.",
    treatWindow: null, lightsOut: "9:00pm",
  },
  {
    day: "Thursday", theme: "Master Session", headline: "The big technical session of the week.",
    sessions: [
      dawn,
      { id: "thu_master", kind: "technical", icon: "🎯", title: "Master session", start: "15:45", minutes: 50, countsToLoad: true, what: ["10 min this month's focus drill", "15 min 1v1 box moves", "15 min finishing gates", "10 min speed dribble"], href: "/pathway/drills" },
      { id: "thu_engine", kind: "engine", icon: "🫀", title: "Engine finisher", start: "16:40", minutes: 12, countsToLoad: true, what: ["15 s on / 15 s off dribble sprints × 8", "Rest 2 min, repeat"], href: "/pathway/conditioning" },
    ],
    fuel: "Bigger carbs at lunch (rice, pasta, wraps) — this is a heavy day.",
    treatWindow: null, lightsOut: "9:00pm",
  },
  {
    day: "Friday", theme: "Recovery & Film", headline: "Light legs, sharp eyes. Match is on Sunday.",
    sessions: [
      dawn,
      { id: "fri_film", kind: "film", icon: "🎬", title: "Film study", start: "15:30", minutes: 25, countsToLoad: false, what: ["Watch ONE player for 20 minutes of a real match", "Count how often he checks his shoulder", "Write one thing to copy on Sunday"], href: "/pathway/screens" },
      { id: "fri_mobility", kind: "rest", icon: "🧘", title: "Mobility + stretch", start: "16:00", minutes: 10, countsToLoad: false, what: ["World's greatest stretch, deep squat, hamstring sweeps", "Legs up the wall 2 min"], href: "/pathway/fitness" },
    ],
    fuel: "Normal day. Treat window tonight if the week was done properly — Mum's call. Two days before the match, so tonight is the treat night, not Saturday.",
    treatWindow: "Friday family night — one treat meal or dessert.", lightsOut: "9:00pm",
  },
  {
    day: "Saturday", theme: "Push + Match Prep", headline: "Saturday Push at easy pace. Tomorrow is match day.",
    sessions: [
      { id: "sat_push", kind: "engine", icon: "🔥", title: "Saturday Push", start: "08:00", minutes: 40, countsToLoad: true, what: ["Engine: 2 km run, no walking — conversation pace, the match is tomorrow", "Strength & skill: 3 rounds 10 push-ups, 30 s plank, 50 juggles", "Off-season / bye week: add Strength circuit B"] },
      { id: "sat_prep", kind: "touches", icon: "🎒", title: "Match prep", start: "17:00", minutes: 10, countsToLoad: true, what: ["Boots clean, shin pads, water bottle packed", "Check kick-off time + ground on the Matches tab", "Write 3 goals for tomorrow (e.g. scan 10×, win 5 duels, 1 weak-foot pass)"], href: "/pathway/matches" },
    ],
    fuel: "Match tomorrow: normal meals, extra carbs at dinner (rice, pasta), plenty of water. No junk tonight.",
    treatWindow: null, lightsOut: "8:45pm",
  },
  {
    day: "Sunday", theme: "Match Day", headline: "Pascoe Vale plays on Sundays. Play brave, play smart, have fun.",
    sessions: [
      { id: "sun_match", kind: "match", icon: "⚽", title: "Match (or free play)", start: "10:00", minutes: 60, countsToLoad: true, what: ["Kick-off and ground are on the Matches tab (times change week to week)", "Hit your 3 goals from last night", "No match (bye / off-season): play for fun, no training"], href: "/pathway/matches" },
      { id: "sun_log", kind: "film", icon: "🧾", title: "Log my match", start: "15:00", minutes: 5, countsToLoad: false, what: ["Minutes, goals, assists, rating", "One thing I learned"], href: "/pathway/matches" },
      { id: "sun_agent", kind: "agent", icon: "🤝", title: "Agent meeting with Mum", start: "18:00", minutes: 10, countsToLoad: false, what: ["What went well in the match and the week?", "What hurt or felt tired?", "Pick ONE focus for next week"] },
    ],
    fuel: "Match day: oats at breakfast, main meal 3 hours before kick-off, banana 1 hour before, orange slices at half-time, recovery snack after.",
    treatWindow: "After the match — one treat.", lightsOut: "9:00pm",
  },
];

export const WEEKLY_CAP_HOURS = 12;

export function planFor(weekday: string): DayPlan {
  return WEEK.find(day => day.day === weekday) ?? WEEK[6];
}

export function weeklyLoadMinutes(): number {
  return WEEK.reduce((sum, day) => sum + day.sessions.filter(s => s.countsToLoad).reduce((m, s) => m + s.minutes, 0), 0);
}

/** The ticks a day asks for: every session plus the daily habits of a pro. */
export interface CheckItem { id: string; label: string; icon: string; detail?: string }

export function checklistFor(plan: DayPlan): CheckItem[] {
  const sessions = plan.sessions
    .filter(s => s.kind !== "rest")
    .map(s => ({ id: s.id, label: s.title, icon: s.icon, detail: `${formatTime(s.start)}${s.minutes ? ` · ${s.minutes} min` : ""}` }));
  return [
    ...sessions,
    { id: "fuel_water", label: "Two full water bottles", icon: "💧" },
    { id: "fuel_plate", label: "Every meal had a protein + a colour", icon: "🥗" },
    { id: "sleep", label: `Lights out by ${plan.lightsOut}`, icon: "🌙" },
    { id: "reflect", label: "One line: what got better today?", icon: "📝" },
  ];
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}
