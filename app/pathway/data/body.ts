/* Fitness, conditioning and strength — v1, written for a 12-year-old who has
   probably not hit his growth spurt yet (boys usually peak around 13–15).

   The science that shapes every line here:
   • Youth strength training is safe and useful WHEN it is supervised, technique-
     first and built on bodyweight — the position of the major sports-medicine
     bodies. Max lifts and heavy barbells are the wrong tool at 12.
   • FIFA 11+ Kids is a 15-minute warm-up built for under-14s; FIFA's own trials
     found clearly fewer injuries in teams that used it.
   • Growth-plate pain is common in footballers aged 10–14: below the kneecap
     (Osgood-Schlatter) and the back of the heel (Sever's). Pain there means
     tell Mum and back off — never "push through". */

export interface Exercise { name: string; dose: string; cue: string }
export interface Block { name: string; when: string; items: Exercise[] }
export interface Programme {
  id: "fitness" | "conditioning" | "strength";
  icon: string;
  title: string;
  kicker: string;
  intro: string;
  rules: string[];
  blocks: Block[];
  redFlags: string[];
}

const RED_FLAGS = [
  "Pain below the kneecap or at the back of the heel — stop, tell Mum. Common in growing footballers; it needs rest, not grit.",
  "Sharp pain, swelling or limping — the session is over.",
  "Dizzy, sick or a headache after a knock to the head — stop and tell an adult immediately.",
  "Two bad nights of sleep in a row — swap hard work for a light touch session.",
];

export const PROGRAMMES: Programme[] = [
  {
    id: "fitness", icon: "⚡", title: "Fitness: speed, agility, movement", kicker: "Move like a footballer",
    intro: "At 12 your nervous system learns speed faster than it ever will again. This is the window to get quick feet, fast starts and clean movement — not long boring runs.",
    rules: ["Speed work only when you're fresh — never after a hard session", "Full rest between sprints (walk back, breathe)", "Every rep at 100% or don't do it", "Warm up with FIFA 11+ Kids every time"],
    blocks: [
      { name: "FIFA 11+ Kids warm-up", when: "Before every session · 15 min", items: [
        { name: "Running game", dose: "2 min", cue: "Jog, change direction on a clap" },
        { name: "Skating jumps", dose: "2 × 10", cue: "Land soft, knee over toes" },
        { name: "Spiderman (hands-feet crawl)", dose: "2 × 10 m", cue: "Hips low, back flat" },
        { name: "Single-leg stance + ball pass around", dose: "2 × 30 s each leg", cue: "Stand tall, don't wobble" },
        { name: "Squat jumps with soft landing", dose: "2 × 8", cue: "Land like a cat" },
        { name: "Falling technique (roll)", dose: "5 each side", cue: "Roll on your shoulder, not your wrist" },
      ] },
      { name: "Speed & agility session", when: "Tuesday · 25 min", items: [
        { name: "A-skips / B-skips", dose: "2 × 15 m each", cue: "Knees up, arms drive" },
        { name: "10 m starts (standing, then lying)", dose: "6 reps, 60 s rest", cue: "Lean forward, push the ground back" },
        { name: "5-10-5 shuttle", dose: "4 reps, 90 s rest", cue: "Low hips at the turn, touch the line" },
        { name: "Ladder: in-in-out-out, lateral, icky shuffle", dose: "2 each", cue: "Light, quick, on your toes" },
        { name: "Reaction starts (Mum/Dad drops a ball)", dose: "6 reps", cue: "Catch it before the second bounce" },
      ] },
      { name: "Daily mobility", when: "After Dawn Touches · 5 min", items: [
        { name: "World's greatest stretch", dose: "3 each side", cue: "Slow, breathe out" },
        { name: "Deep squat hold", dose: "30 s", cue: "Heels down, chest up" },
        { name: "Hamstring sweeps", dose: "10 each leg", cue: "Straight leg, reach long" },
        { name: "Calf + ankle rocks", dose: "10 each", cue: "Knee over toes, heel down" },
      ] },
    ],
    redFlags: RED_FLAGS,
  },
  {
    id: "conditioning", icon: "🫀", title: "Conditioning: the engine", kicker: "Last 10 minutes, still flying",
    intro: "Football is sprint, jog, sprint, stop, sprint. So the engine is trained the same way — short bursts, ideally WITH the ball. Kids recover fast; use it.",
    rules: ["Short and sharp beats long and slow", "Use the ball whenever possible", "Club training already builds a lot of engine — don't double up on club nights", "Hydrate before, during and after"],
    blocks: [
      { name: "Engine finisher", when: "Thursday · 12 min", items: [
        { name: "Dribble sprint 15 s / walk 15 s", dose: "8 reps × 2 sets, 2 min between", cue: "Ball close even when tired" },
      ] },
      { name: "Saturday Push engine", when: "Saturday · the existing Push", items: [
        { name: "2 km continuous run", dose: "1 × — log your time", cue: "Even pace; last 400 m fastest" },
      ] },
      { name: "Small-sided games", when: "Any time with mates", items: [
        { name: "2v2 or 3v3, small pitch, no goalie", dose: "4 × 4 min, 2 min rest", cue: "Press straight away when you lose it" },
      ] },
      { name: "Monthly engine test", when: "Last Saturday of the month", items: [
        { name: "2 km time trial (replaces the Push run)", dose: "1 ×", cue: "Log it on Scout's Eye" },
        { name: "Beep test / Yo-Yo (if the club runs one)", dose: "1 ×", cue: "Note the level" },
      ] },
    ],
    redFlags: RED_FLAGS,
  },
  {
    id: "strength", icon: "💪", title: "Strength: bodyweight first", kicker: "Earn the weights",
    intro: "Strong players win duels, jump higher, sprint faster and get injured less. At 12 the gym is your own body. Master it and the weights come later — that's how academies do it.",
    rules: ["Twice a week, never on back-to-back days", "2–3 sets of 8–12 perfect reps", "Form breaks = set over", "No max lifts, no heavy barbells, no ego", "Light dumbbells (4–6 kg) only once every bodyweight move is perfect — and only with an adult watching"],
    blocks: [
      { name: "Circuit A", when: "Tuesday · 3 rounds", items: [
        { name: "Bodyweight squat", dose: "12", cue: "Sit back, knees out, chest proud" },
        { name: "Push-up", dose: "8–12", cue: "Straight body like a plank" },
        { name: "Glute bridge", dose: "12", cue: "Squeeze at the top 2 s" },
        { name: "Inverted row (under a sturdy table)", dose: "8", cue: "Pull chest to the edge" },
        { name: "Plank", dose: "30 s", cue: "Don't let the hips sag" },
        { name: "Jump & stick", dose: "5", cue: "Land and freeze, soft knees" },
      ] },
      { name: "Circuit B", when: "Friday · 3 rounds", items: [
        { name: "Split squat", dose: "8 each leg", cue: "Back knee kisses the floor" },
        { name: "Side plank", dose: "20 s each side", cue: "Straight line head to feet" },
        { name: "Single-leg calf raise", dose: "12 each", cue: "Slow down, 2 s" },
        { name: "Nordic hamstring (partner holds ankles)", dose: "4 slow lowers", cue: "Fall as slowly as you can — protects hamstrings" },
        { name: "Bear crawl", dose: "2 × 10 m", cue: "Knees just off the floor" },
        { name: "Single-leg balance, eyes closed", dose: "20 s each", cue: "Ankles of steel" },
      ] },
      { name: "Earn the weights (level 2)", when: "Unlocks when Mum ticks off perfect form", items: [
        { name: "Goblet squat", dose: "3 × 10 @ 4–6 kg", cue: "Same as bodyweight squat" },
        { name: "Medicine-ball chest throw", dose: "3 × 8 @ 2–3 kg", cue: "Explode, catch soft" },
        { name: "Broomstick deadlift technique", dose: "3 × 8", cue: "Hinge at the hips, flat back" },
      ] },
    ],
    redFlags: RED_FLAGS,
  },
];

export function programme(id: Programme["id"]): Programme {
  return PROGRAMMES.find(p => p.id === id)!;
}
