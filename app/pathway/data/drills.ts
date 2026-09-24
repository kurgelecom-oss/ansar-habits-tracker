/* The drill library — v1. Each drill carries an animated pitch diagram spec
   (rendered by components/PitchDiagram.tsx as a looping SVG, our "GIF"), the
   coaching points, and Bronze / Silver / Gold targets for a 12-year-old.

   Targets are STARTING targets. After the first honest test, Mum re-sets them
   so Silver is "hard but possible this month".

   Heading is deliberately absent: Football Australia's heading guidelines
   limit heading practice for under-12s and under-13s. */

export type DrillCategory = "Ball mastery" | "First touch" | "Weak foot" | "1v1 & dribbling" | "Passing" | "Finishing" | "Scanning & IQ";

export interface Diagram {
  /** SVG path on a 100 × 64 pitch for the player (Ansar). */
  player: string;
  /** SVG path for the ball. Same duration as the player. */
  ball: string;
  dur: number;
  cones?: [number, number][];
  wall?: boolean;
  goal?: boolean;
  partner?: [number, number];
  defender?: string;
  label?: string;
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  minutes: number;
  kit: string;
  why: string;
  steps: string[];
  points: string[];
  targets: { bronze: string; silver: string; gold: string };
  diagram: Diagram;
  watch: string; // YouTube search phrase for a real demo
}

export const CATEGORIES: DrillCategory[] = ["Ball mastery", "First touch", "Weak foot", "1v1 & dribbling", "Passing", "Finishing", "Scanning & IQ"];

export const DRILLS: Drill[] = [
  {
    id: "ball-mastery-60", name: "Ball Mastery 60s", category: "Ball mastery", minutes: 8, kit: "1 ball, 2 m² of space",
    why: "Thousands of touches teach the ball to obey you. Every great technician did this as a kid.",
    steps: ["Toe taps — 60 s", "Sole rolls across the body — 60 s", "Inside-inside (bells) — 60 s", "Sole roll + inside push (L-turns) — 60 s", "Pull-push (V-turns) — 60 s", "Rest 30 s between each"],
    points: ["On your toes, knees soft", "Eyes UP — glance at the ball, don't stare", "Speed only when it's clean"],
    targets: { bronze: "5 moves, no stopping", silver: "5 moves, eyes up half the time", gold: "5 moves at full speed, eyes up" },
    diagram: { player: "M48 32 L52 32 L48 32 L52 32 L48 32", ball: "M50 34 L54 34 L50 34 L54 34 L50 34", dur: 1.6, label: "Fast feet on the spot" },
    watch: "ball mastery drills for kids toe taps sole rolls",
  },
  {
    id: "juggling-ladder", name: "Juggling Ladder", category: "Ball mastery", minutes: 10, kit: "1 ball",
    why: "Juggling builds soft touch, balance and concentration. It's also the easiest test to track.",
    steps: ["Strong foot only — best score", "Weak foot only — best score", "Alternate feet — best score", "Feet-thigh-feet-head pattern (keep the ball low)"],
    points: ["Lock the ankle, toe slightly up", "Small touches, waist height", "Beat your record, not your friend's"],
    targets: { bronze: "50 alternate", silver: "150 alternate", gold: "300 alternate" },
    diagram: { player: "M50 34 L50 34", ball: "M50 38 L50 22 L50 38", dur: 1.2, label: "Ball up, ball down, never the grass" },
    watch: "how to juggle a football better kids",
  },
  {
    id: "cone-slalom", name: "Cone Slalom", category: "1v1 & dribbling", minutes: 10, kit: "6 cones 1 m apart",
    why: "Tight dribbling with both feet and both sides of each foot.",
    steps: ["Inside of feet only × 3", "Outside of feet only × 3", "Strong foot only × 2", "Weak foot only × 2", "Race the clock × 2"],
    points: ["A touch between every cone", "Ball stays under your hips", "Accelerate out of the last cone"],
    targets: { bronze: "No cones hit, both feet", silver: "Under 9 s there and back", gold: "Under 7 s there and back" },
    diagram: { cones: [[25, 32], [35, 32], [45, 32], [55, 32], [65, 32], [75, 32]], player: "M15 32 C22 22 28 22 30 32 S38 42 40 32 S48 22 50 32 S58 42 60 32 S68 22 70 32 S78 42 85 32", ball: "M17 33 C24 23 30 23 32 33 S40 43 42 33 S50 23 52 33 S60 43 62 33 S70 23 72 33 S80 43 87 33", dur: 4, label: "Weave, touch, weave, explode" },
    watch: "cone slalom dribbling drill youth football",
  },
  {
    id: "wall-two-touch", name: "Wall Two-Touch", category: "First touch", minutes: 8, kit: "1 ball, a wall",
    why: "Receive across the body and pass back. Pros want the first touch to set up the second.",
    steps: ["Stand 5 m from the wall", "Receive with the right, pass with the left", "Then receive left, pass right", "Move back to 8 m for the last 2 minutes"],
    points: ["First touch goes sideways, out of your feet", "Open hips before the ball arrives", "Count clean touches"],
    targets: { bronze: "20 clean in 60 s", silver: "26 clean in 60 s", gold: "32 clean in 60 s" },
    diagram: { wall: true, player: "M70 28 L70 36 L70 28", ball: "M72 30 L94 32 L72 36 L94 32 L72 30", dur: 2.4, label: "Touch across, pass back" },
    watch: "wall passing drills first touch football",
  },
  {
    id: "half-turn", name: "Half-Turn Receive", category: "First touch", minutes: 10, kit: "Ball, wall, 2 cones as a gate",
    why: "Coaches LOVE players who receive facing forward. It's the difference between a pass and a chance.",
    steps: ["Pass to the wall", "Check your shoulder as it comes back", "Receive on the back foot, half-turned", "Touch through the cone gate beside you", "Both directions, both feet"],
    points: ["Body open like a door, not a wall", "Receive with the foot FURTHEST from the ball", "Your first touch goes forward"],
    targets: { bronze: "15 through the gate", silver: "25 through the gate, both feet", gold: "40 through the gate, scanning every time" },
    diagram: { wall: true, cones: [[55, 20], [55, 28]], player: "M72 34 L70 30 L60 24", ball: "M92 32 L72 32 L68 28 L58 24", dur: 2.4, label: "Scan, open up, go through the gate" },
    watch: "receiving on the half turn football drill",
  },
  {
    id: "aerial-control", name: "Aerial Cushion", category: "First touch", minutes: 8, kit: "1 ball",
    why: "Long balls and bouncing balls are where average players lose it and good players kill it dead.",
    steps: ["Throw the ball up 3–4 m", "Cushion with the laces × 20 each foot", "Thigh then foot × 20", "Chest then foot × 10 (keep it gentle)", "Kill it, then take one touch away"],
    points: ["Meet the ball, then pull back like catching an egg", "Watch it all the way down", "Second touch must be ready"],
    targets: { bronze: "12 of 20 dead each foot", silver: "16 of 20 each foot", gold: "18 of 20, weak foot too" },
    diagram: { player: "M50 36 L50 36", ball: "M50 34 L50 10 L50 34 L58 36", dur: 2, label: "Up, down, dead" },
    watch: "aerial ball control drills kids football",
  },
  {
    id: "weak-wall-100", name: "Weak-Foot 100", category: "Weak foot", minutes: 10, kit: "Ball, wall",
    why: "Two-footed players are rare at 12. That's exactly why scouts notice them.",
    steps: ["100 passes weak foot only", "Inside of foot, then laces", "Log how many first touches were clean out of the last 50"],
    points: ["Plant foot next to the ball, pointing at the target", "Lock the ankle", "Slow and clean beats fast and messy"],
    targets: { bronze: "30 of 50 clean", silver: "40 of 50 clean", gold: "45 of 50 clean" },
    diagram: { wall: true, player: "M72 32 L72 32", ball: "M74 32 L94 32 L74 32", dur: 1.4, label: "Left, left, left…" },
    watch: "weak foot training drills football",
  },
  {
    id: "weak-foot-finish", name: "Weak-Foot Finish", category: "Weak foot", minutes: 10, kit: "Ball, goal or target",
    why: "Defenders show you onto your weak foot. Punish them.",
    steps: ["Dribble in from 18 m", "Shift the ball onto your weak foot", "Strike low to the far corner", "20 reps, count goals"],
    points: ["Shift touch out of your feet", "Body over the ball keeps it low", "Pick the corner BEFORE you strike"],
    targets: { bronze: "8 of 20 on target", silver: "12 of 20 on target", gold: "12 of 20 goals" },
    diagram: { goal: true, cones: [[60, 28]], player: "M30 36 L55 34 L62 30", ball: "M32 37 L57 35 L64 30 L96 22", dur: 2.6, label: "Shift, set, strike" },
    watch: "weak foot finishing drill",
  },
  {
    id: "box-1v1", name: "1v1 Box Escapes", category: "1v1 & dribbling", minutes: 12, kit: "4 cones in a 5 m square, a partner (optional)",
    why: "Beating a player is the most valuable skill a young attacker owns.",
    steps: ["Drive at a cone like it's a defender", "Scissors and go × 5", "Drag-back and go × 5", "Cruyff turn and go × 5", "Stepover + outside cut × 5", "Then live with Dad/sibling as defender"],
    points: ["Slow in, FAST out", "Sell the fake with your shoulders", "Explode for three steps after the move"],
    targets: { bronze: "4 moves both ways", silver: "4 moves at speed", gold: "Beat a live defender 6 of 10" },
    diagram: { cones: [[40, 20], [60, 20], [40, 44], [60, 44]], player: "M25 32 L45 32 L49 28 L49 36 L75 32", ball: "M27 33 L47 33 L51 30 L51 37 L77 33", defender: "M55 32 L52 30 L52 34", dur: 3, label: "Slow in, fake, fast out" },
    watch: "1v1 moves for kids scissors drag back cruyff turn",
  },
  {
    id: "speed-dribble", name: "Speed Dribble 20", category: "1v1 & dribbling", minutes: 8, kit: "Ball, 2 cones 20 m apart",
    why: "Running WITH the ball at top speed wins space in matches.",
    steps: ["Dribble 20 m as fast as you can", "Big touches — 3 or 4 steps between touches", "Stop dead at the end cone", "6 reps, walk back to recover"],
    points: ["Push with the laces, toe down", "Touch with the foot nearest the ball", "Eyes up between touches"],
    targets: { bronze: "Under 5.0 s", silver: "Under 4.4 s", gold: "Under 4.0 s" },
    diagram: { cones: [[15, 32], [85, 32]], player: "M15 34 L85 34", ball: "M18 35 L88 35", dur: 2.2, label: "Big push, run, push" },
    watch: "running with the ball drill football kids",
  },
  {
    id: "triangle-pass", name: "Triangle One-Touch", category: "Passing", minutes: 10, kit: "3 cones, a partner",
    why: "Crisp one-touch passing is how teams play through pressure.",
    steps: ["Cones in a triangle, 8 m apart", "Pass and follow your pass", "Two-touch round, then one-touch", "Switch direction every minute"],
    points: ["Pass to the partner's FAR foot", "Weight: firm but kind", "Move after every pass"],
    targets: { bronze: "20 passes no mistakes", silver: "40 passes one-touch", gold: "60 passes one-touch, both feet" },
    diagram: { cones: [[30, 45], [70, 45], [50, 18]], partner: [70, 45], player: "M30 45 L50 18 L30 45", ball: "M30 45 L70 45 L50 18 L30 45", dur: 3, label: "Pass, follow, repeat" },
    watch: "triangle passing drill youth soccer",
  },
  {
    id: "switch-play", name: "Switch of Play", category: "Passing", minutes: 10, kit: "Ball, 2 cone zones 25–30 m apart",
    why: "Seeing and hitting the far side opens games up — coaches notice range.",
    steps: ["Strike a lofted pass into a 5 m zone 25 m away", "10 each foot", "Then drive it low along the grass × 10"],
    points: ["Lean back slightly for height, lock ankle", "Strike under the middle of the ball", "Follow through to the target"],
    targets: { bronze: "4 of 10 land in the zone", silver: "6 of 10", gold: "8 of 10, weak foot 5" },
    diagram: { cones: [[80, 12], [90, 12], [80, 22], [90, 22]], player: "M15 50 L22 48", ball: "M24 48 Q55 -10 85 17", dur: 2.2, label: "Look far, strike far" },
    watch: "long pass technique youth football",
  },
  {
    id: "finishing-gates", name: "Finishing Gates", category: "Finishing", minutes: 12, kit: "Ball, goal, 4 cones in the corners",
    why: "Goals come from corners, not the goalkeeper's chest.",
    steps: ["Cones 1 m inside each post", "Strike through the gate from 12 m", "Laces low, then side-foot placed", "20 strong foot, 20 weak foot"],
    points: ["Eyes on the ball at contact", "Non-kicking foot beside the ball", "Pick your corner early"],
    targets: { bronze: "8 of 20 through a gate", silver: "12 of 20", gold: "15 of 20, weak foot 10" },
    diagram: { goal: true, cones: [[97, 24], [97, 40]], player: "M60 32 L70 32", ball: "M72 33 L98 26", dur: 1.6, label: "Corners win" },
    watch: "finishing drills for kids soccer corners",
  },
  {
    id: "turn-shoot", name: "Turn & Shoot", category: "Finishing", minutes: 10, kit: "Ball, goal, cone",
    why: "Strikers get the ball with their back to goal. The fast turn is the goal.",
    steps: ["Back to goal at the cone", "Receive (from a throw or wall)", "Turn with the inside or outside", "Shoot within two touches"],
    points: ["Check your shoulder before the ball arrives", "Turn AWAY from the imaginary defender", "Shoot early"],
    targets: { bronze: "10 turns, 5 on target", silver: "10 turns, 7 on target", gold: "Turn + shot under 2 s, 7 on target" },
    diagram: { goal: true, cones: [[65, 32]], player: "M66 36 L68 32 L74 30", ball: "M40 32 L66 34 L72 31 L98 28", dur: 2.4, label: "Check, turn, shoot" },
    watch: "turn and shoot drill striker youth",
  },
  {
    id: "shoulder-check", name: "Shoulder-Check Call", category: "Scanning & IQ", minutes: 10, kit: "Ball, wall, a helper behind you",
    why: "The best midfielders check over their shoulder again and again before the ball arrives. Most 12-year-olds hardly ever do.",
    steps: ["Pass to the wall", "Helper behind you holds up fingers or a colour", "Shout it BEFORE the ball comes back", "Then receive and turn to the side the helper points"],
    points: ["Check BEFORE the ball comes, not after", "Quick head turn, eyes back to the ball", "Look twice if you can"],
    targets: { bronze: "15 of 20 called right", silver: "18 of 20", gold: "20 of 20 and turn the right way" },
    diagram: { wall: true, partner: [40, 32], player: "M70 32 L70 32", ball: "M72 32 L94 32 L72 32", dur: 2, label: "Look, call, receive" },
    watch: "scanning drill football shoulder check youth",
  },
  {
    id: "rondo-3v1", name: "Rondo 3v1", category: "Scanning & IQ", minutes: 12, kit: "4 cones (8 m square), 3 friends or family",
    why: "Barcelona's La Masia uses rondos every day: angles, one-touch, no panic.",
    steps: ["Three keep it from one in the middle", "Two-touch max, then one-touch", "Defender swaps after winning it", "Count passes in a row"],
    points: ["Always make a triangle — give an angle", "Pass away from the defender's foot", "Move when you're not on the ball"],
    targets: { bronze: "8 passes in a row", silver: "15 in a row", gold: "20 in a row one-touch" },
    diagram: { cones: [[35, 16], [65, 16], [35, 48], [65, 48]], partner: [65, 16], player: "M35 48 L35 44", ball: "M35 46 L65 18 L35 16 L37 46", defender: "M50 32 L56 26 L46 24 L50 32", dur: 3.2, label: "Angles beat the defender" },
    watch: "rondo 3v1 drill kids",
  },
];

export function drillById(id: string): Drill | undefined {
  return DRILLS.find(d => d.id === id);
}
