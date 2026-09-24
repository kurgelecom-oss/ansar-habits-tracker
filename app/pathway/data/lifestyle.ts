/* Fuel, treats, screens and Mum's rules — v1.

   Fuel follows the Sports Dietitians Australia line for young athletes: food
   first, no supplements, carbohydrate to match the day's work, water as the
   default drink, never energy drinks. Treats are scheduled, not banned — food
   is never a prize or a punishment. Nihal is the final word on all of it; the
   Fuel page shows tonight's family dinner live from Nihal OS. */

export interface Plate { name: string; when: string; split: [string, number][]; examples: string }

export const PLATES: Plate[] = [
  { name: "Training-day plate", when: "Mon · Tue · Wed · Thu · Sat", split: [["Carbs (rice, pasta, bread, potato)", 40], ["Protein (chicken, eggs, fish, beans, yoghurt)", 25], ["Veg + fruit", 35]], examples: "Chicken + rice + salad · Pasta bolognese with veg · Wrap with eggs and beans" },
  { name: "Easy-day plate", when: "Fri · Sun", split: [["Carbs", 25], ["Protein", 25], ["Veg + fruit", 50]], examples: "Fish + potato + greens · Lentil soup + bread · Omelette + toast + fruit" },
];

export interface FuelMoment { time: string; icon: string; what: string }

export const TRAINING_DAY_FUEL: FuelMoment[] = [
  { time: "Breakfast", icon: "🥣", what: "Oats or Weet-Bix with milk + fruit. Eggs if hungry." },
  { time: "Morning tea", icon: "🍌", what: "Fruit + yoghurt or cheese. Water bottle #1 started." },
  { time: "Lunch (by 1:30pm)", icon: "🍛", what: "Training-day plate. The main fuel for this afternoon." },
  { time: "60 min before training", icon: "⏱️", what: "Small snack: banana, toast with honey, or crackers. 400–500 ml water." },
  { time: "During", icon: "💧", what: "Sips of water every break. Sports drinks only if it's hot AND over 60 min." },
  { time: "Within 60 min after", icon: "🥛", what: "Recovery: milk or a smoothie + fruit, or a yoghurt + banana." },
  { time: "Dinner", icon: "🍽️", what: "Mum's table (live from Nihal OS below). Eat the protein and the veg first." },
];

export const MATCH_DAY_FUEL: FuelMoment[] = [
  { time: "3 hours before", icon: "🍝", what: "Main meal: rice/pasta/bread + some protein. Nothing new, nothing greasy." },
  { time: "1 hour before", icon: "🍌", what: "Banana or a jam sandwich. 500 ml water through the morning." },
  { time: "Half-time", icon: "🍊", what: "Orange slices + water." },
  { time: "After", icon: "🥛", what: "Recovery snack, then the post-match treat window opens." },
];

export const NEVER_FOODS = [
  "Energy drinks — ever. Caffeine and a growing heart don't mix.",
  "Supplements, protein powders, pre-workouts — food first until Mum and a sports dietitian say otherwise.",
  "Skipping breakfast on a training day.",
];

export interface TreatWindow { when: string; icon: string; rule: string }

export const TREAT_YES: TreatWindow[] = [
  { when: "Friday family night", icon: "🍕", rule: "One treat meal or dessert with the family — earned by a full week." },
  { when: "After the match or Saturday Push", icon: "🍦", rule: "One treat. You played; enjoy it." },
  { when: "Celebrations", icon: "🎉", rule: "Birthdays, Eid, family events — Mum decides." },
];

export const TREAT_NO: TreatWindow[] = [
  { when: "The night before a match", icon: "🚫", rule: "Match fuel only. The treat waits till after." },
  { when: "3 hours before any training", icon: "⏳", rule: "Greasy or sugary food sits in your stomach and slows you down." },
  { when: "On the way to training", icon: "🚗", rule: "Servo snacks are not fuel." },
  { when: "After 8pm", icon: "🌙", rule: "Sugar late steals sleep, and sleep is where you grow." },
  { when: "Alone, in your room", icon: "🚪", rule: "Treats are shared at the table, not hidden." },
];

export const TREAT_PRINCIPLES = [
  "No food is banned forever. Aim for 80% real food, 20% fun food.",
  "Treats are never a prize for eating vegetables and never a punishment for a bad game.",
  "Mum can open or close any window. Her call is final.",
];

/* ── Screens ─────────────────────────────────────────────────────────────── */

export interface ScreenItem { icon: string; title: string; why: string; how?: string }

export const WATCH_WORTH_IT: ScreenItem[] = [
  { icon: "🎬", title: "Full-match film study", why: "The only watching that makes you better tomorrow.", how: "Pick ONE player. For 20 minutes watch him, not the ball. Count his shoulder checks. Write one thing to copy." },
  { icon: "🧠", title: "Tactics explainers", why: "Learn why teams press, build up and switch play.", how: "One short explainer a week, then tell Mum what you learned in 3 sentences." },
  { icon: "🛠️", title: "A skill tutorial you'll try within 24 hours", why: "Watch 1 → Practise 1. Otherwise it's just entertainment.", how: "Save it, try it at Dawn Touches tomorrow." },
  { icon: "📖", title: "Player documentaries Mum has approved", why: "Stories of how the best got there — see the Legends page.", how: "Weekend only, inside the screen-time switch." },
];

export const WATCH_ZERO_VALUE: ScreenItem[] = [
  { icon: "📱", title: "Endless Shorts / Reels / TikTok", why: "Built to never end. Zero transfer to your feet. Steals focus from homeschool." },
  { icon: "✨", title: "Skill-compilation edits", why: "Fun, but they show the 1% that worked, never the 99% of practice. Only watch if you'll practise it (Watch 1 → Practise 1)." },
  { icon: "🗣️", title: "Transfer rumours, drama and reaction channels", why: "Adults arguing about other people's football. You have your own to play." },
  { icon: "🎮", title: "EA FC / gaming past the limit", why: "Fun is fine — it counts as screen time, not training." },
  { icon: "🌙", title: "Anything after 8:30pm", why: "Screens before bed cut sleep. Sleep is when your body grows and fixes itself." },
];

export const SCREEN_RULES = [
  "Screen time follows the board's daily switch — this page decides what goes IN that time.",
  "Watch 1 → Practise 1: any skill you watch gets tried on the ball within 24 hours.",
  "Screens off 60 minutes before lights out. Phone charges outside the bedroom.",
  "Film study (Friday) is training, not screen time — it's on the plan.",
];

/* ── Mum = the agent ─────────────────────────────────────────────────────── */

export const MUM_ROLE = [
  { icon: "🎯", text: "Sets the ONE focus for the week at Sunday's agent meeting" },
  { icon: "🍕", text: "Opens and closes the treat windows" },
  { icon: "🩹", text: "Final say on rest when something hurts" },
  { icon: "✅", text: "Signs off test results and unlocks level-2 strength" },
];

export const ALWAYS = ["Homeschool first — football never cuts into 8:30–1:30", "Tell Mum the same day if something hurts", "Lights out on time on school nights", "Respect the coach, the ref and your teammates"];
export const NEVER = ["Train through sharp pain", "Energy drinks", "Phone in bed", "Argue with the ref"];
export const ASK_MUM = ["Extra sessions beyond the plan", "Treats outside the windows", "New gym equipment or heavier weights", "Late nights before a match"];
