/* Scout's Eye + the season — v1.

   What coaches look for uses the "four corners" model that most academies
   (and Football Australia's coaching courses) use: technical, tactical,
   physical, psychological — plus social, because teams pick teammates.

   Level: Football Australia's National Curriculum puts ages 9–13 in the
   SKILL ACQUISITION PHASE — master the ball, 1v1, striking, running with the
   ball, first touch. Tactics and physical work come later. That is why this
   pathway is ball-heavy and bodyweight-only.

   Benchmarks are v1 STARTING targets, not national norms. The first honest
   test sets the real baseline; progress is judged against Ansar, not peers —
   at 12 a year's difference in growth can hide or fake talent. */

export interface Corner { icon: string; name: string; lookFor: string[] }

export const FOUR_CORNERS: Corner[] = [
  { icon: "🎯", name: "Technical", lookFor: ["First touch that sets up the next action", "Uses BOTH feet without thinking", "Receives on the half-turn, facing forward", "Keeps the ball in tight spaces under pressure"] },
  { icon: "🧠", name: "Game IQ", lookFor: ["Checks his shoulder BEFORE the ball comes", "Makes the simple pass when it's on, the brave one when it's needed", "Knows where to stand when he doesn't have the ball", "Plays forward"] },
  { icon: "⚡", name: "Physical", lookFor: ["Quick first steps and sharp turns", "Balance and coordination", "Still working hard in the last 10 minutes", "NOT size — late developers often overtake early ones"] },
  { icon: "🦁", name: "Mindset", lookFor: ["Coachable — listens, tries it, asks questions", "Reacts to a mistake by winning the ball back", "Wants the ball when the game is hard", "Trains the same when no one is watching"] },
  { icon: "🤝", name: "Teammate", lookFor: ["Talks — calls names, encourages", "Positive body language, even when losing", "Celebrates others' goals", "Respects the ref"] },
];

export const RED_CARDS_FOR_SCOUTS = [
  "Head down after losing the ball",
  "Arguing with the ref or teammates",
  "Walking back when the team defends",
  "Ignoring the coach's instruction to do his own thing",
  "Only trying when he's on the ball",
];

export interface Benchmark { id: string; icon: string; test: string; how: string; unit: string; better: "higher" | "lower"; bronze: number; silver: number; gold: number }

export const BENCHMARKS: Benchmark[] = [
  { id: "juggle_alt", icon: "🔁", test: "Juggling — alternate feet", how: "Best of 3 attempts", unit: "touches", better: "higher", bronze: 50, silver: 150, gold: 300 },
  { id: "juggle_weak", icon: "🦶", test: "Juggling — weak foot only", how: "Best of 3 attempts", unit: "touches", better: "higher", bronze: 15, silver: 40, gold: 80 },
  { id: "wall_60", icon: "🧱", test: "Wall passes in 60 s (5 m, two-touch)", how: "Count clean returns", unit: "passes", better: "higher", bronze: 20, silver: 26, gold: 32 },
  { id: "weak_clean", icon: "🎯", test: "Weak-foot clean first touch", how: "Out of 50 wall passes", unit: "/50", better: "higher", bronze: 30, silver: 40, gold: 45 },
  { id: "sprint_20", icon: "⚡", test: "20 m sprint", how: "Standing start, best of 3, hand-timed", unit: "s", better: "lower", bronze: 4.0, silver: 3.7, gold: 3.5 },
  { id: "agility_5105", icon: "↔️", test: "5-10-5 shuttle", how: "Best of 2", unit: "s", better: "lower", bronze: 6.0, silver: 5.6, gold: 5.3 },
  { id: "dribble_20", icon: "⚽", test: "Speed dribble 20 m", how: "Ball must stop in the end zone", unit: "s", better: "lower", bronze: 5.0, silver: 4.4, gold: 4.0 },
  { id: "run_2k", icon: "🫀", test: "2 km run", how: "Monthly time trial", unit: "min", better: "lower", bronze: 10.0, silver: 9.0, gold: 8.25 },
  { id: "finish_gates", icon: "🥅", test: "Finishing gates (20 shots)", how: "Through a corner gate from 12 m", unit: "/20", better: "higher", bronze: 8, silver: 12, gold: 15 },
];

export function tierFor(b: Benchmark, value: number | null | undefined): "gold" | "silver" | "bronze" | "starting" | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const beats = (target: number) => (b.better === "higher" ? value >= target : value <= target);
  if (beats(b.gold)) return "gold";
  if (beats(b.silver)) return "silver";
  if (beats(b.bronze)) return "bronze";
  return "starting";
}

export interface Rung { icon: string; name: string; what: string; when: string }

export const PATHWAY_LADDER: Rung[] = [
  { icon: "🏘️", name: "Community club", what: "Where most players start. Play every week, have fun, get touches.", when: "Now" },
  { icon: "🏅", name: "NPL junior club (Football NSW)", what: "The top level of junior football in NSW. Better coaching, better opponents.", when: "Trials usually Oct–Nov for next season" },
  { icon: "🏟️", name: "A-League academy", what: "Sydney FC, Western Sydney Wanderers, Macarthur FC, Central Coast Mariners. Usually scout from NPL and talent-ID days.", when: "Typically from U13–U14 upward" },
  { icon: "🇦🇺", name: "Youth national teams", what: "Joeys (U17) and younger talent camps. Picked from academies and NPL.", when: "Mid-teens" },
];

export const LADDER_NOTE = "Trial dates and age groups change every year — confirm with the club and Football NSW before planning around them.";

/* ── The year ───────────────────────────────────────────────────────────── */

export interface Phase { name: string; months: string; icon: string; aim: string }

export const YEAR_PHASES: Phase[] = [
  { name: "Trials & transition", months: "Oct–Nov", icon: "📋", aim: "Test everything. Trial for next season. Futsal or summer 7s for fun touches." },
  { name: "Off-season", months: "Dec–Jan", icon: "🏖️", aim: "At least 3–4 weeks with NO structured football. Swim, play other sports, rest the growing body." },
  { name: "Pre-season", months: "Feb–Mar", icon: "🔥", aim: "Build the engine and strength base. Ramp up — never go 0 to 100." },
  { name: "Season", months: "Apr–Aug", icon: "⚽", aim: "Perform on Saturdays, recover properly, keep Dawn Touches alive." },
  { name: "Finals & review", months: "Sep", icon: "🏆", aim: "Finals, full test day, agent meeting: what's next year's one big goal?" },
];

export const MONTH_FOCUS: { month: string; focus: string; drill: string }[] = [
  { month: "January", focus: "Rest + juggling records", drill: "juggling-ladder" },
  { month: "February", focus: "Engine base", drill: "speed-dribble" },
  { month: "March", focus: "Speed & first steps", drill: "speed-dribble" },
  { month: "April", focus: "1v1 attacking", drill: "box-1v1" },
  { month: "May", focus: "Passing range", drill: "switch-play" },
  { month: "June", focus: "Scanning", drill: "shoulder-check" },
  { month: "July", focus: "Finishing", drill: "finishing-gates" },
  { month: "August", focus: "Weak foot", drill: "weak-wall-100" },
  { month: "September", focus: "Test month + half-turn receiving", drill: "half-turn" },
  { month: "October", focus: "First touch", drill: "wall-two-touch" },
  { month: "November", focus: "Weak-foot finishing", drill: "weak-foot-finish" },
  { month: "December", focus: "Ball mastery + futsal", drill: "ball-mastery-60" },
];

export const YEAR_GOALS = [
  { icon: "🦶", goal: "Weak foot as trusted as the strong foot on the wall test", measure: "weak_clean ≥ 40/50" },
  { icon: "🔁", goal: "300 alternate-foot juggles", measure: "juggle_alt = Gold" },
  { icon: "🏅", goal: "Earn a place at a higher level for the 2027 season", measure: "Trial Oct–Nov 2026" },
  { icon: "🫀", goal: "2 km under 8:30", measure: "run_2k ≤ 8.5" },
  { icon: "📚", goal: "Zero homeschool missed for football", measure: "Non-negotiable" },
];
