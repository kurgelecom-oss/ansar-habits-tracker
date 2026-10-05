/* ════════════════════════════════════════════════════════════════════════════
   ZONE OS — Chess Thinking (THE CHESS ACADEMY), v1.

   Built around his day: one short evening slot at 19:40 that ends before
   screens off at 20:00, and one longer Sunday 16:00 session after the match
   has been recovered from. Nothing touches 08:30–13:30 homeschool.

   Tool: Lichess (free, no ads, open source). Mum creates the account, keeps
   the password and switches on Kid mode, which turns off chat and messages.

   Accuracy: puzzles are described as PATTERNS, never as invented positions.
   Opening moves are standard main lines. Hero facts are kept to the
   well-documented record; anything uncertain was left out. Benchmarks are
   STARTING targets for a 12-year-old, re-set by Mum after the first test.
   ══════════════════════════════════════════════════════════════════════════ */

import type { ZoneOS } from "./types";

const os: ZoneOS = {
  id: "chess",
  name: "Chess Thinking",
  shortName: "Chess",
  icon: "♞",
  accent: "#e5e7eb",
  accentSoft: "rgba(229, 231, 235, 0.14)",
  kicker: "ANSAR OS · THE CHESS ACADEMY",
  intro:
    "Chess is training for your brain the way football is training for your legs. Twenty minutes most evenings is enough to get properly good: spot tactics fast, open the game like a strong player, finish won endgames without wobbling, and check every move before you play it. The habits you build here (look before you leap, stay calm on the clock, learn from your losses) are the same ones that help in school, in football and in life. Everything runs on Lichess, which is free, has no ads, and is used by world champions.",

  /* ── The week ─────────────────────────────────────────────────────────── */
  week: [
    {
      day: "Monday",
      theme: "Tactics Monday",
      headline: "Short and sharp after club training: patterns, not marathons.",
      sessions: [
        { id: "mon-tactics", icon: "⚔️", title: "Fork & pin puzzles", start: "19:40", minutes: 15, what: ["Lichess Puzzles → Puzzle themes → Fork: 6 puzzles", "Then Pin: 4 puzzles", "Say the pattern name out loud before you move", "Write the hardest one's theme in your chess notebook"], libraryId: "fork-double-attack" },
      ],
      tip: "Tired from training? Do fewer puzzles slowly rather than lots quickly. Quality beats quantity. If prayer time lands here, pray first.",
    },
    {
      day: "Tuesday",
      theme: "Opening Tuesday",
      headline: "Learn the first ten moves so the middle game starts on your terms.",
      sessions: [
        { id: "tue-opening", icon: "📖", title: "Repertoire drill", start: "19:40", minutes: 20, what: ["Analysis board: play your Italian Game moves as White from memory", "Then your Black replies to 1.e4 and 1.d4", "Check each line against your notebook", "Fix ONE line you got wrong, then play it 3 more times"], libraryId: "white-italian" },
      ],
      tip: "Don't learn new lines this week until the old ones come out right three times in a row.",
    },
    {
      day: "Wednesday",
      theme: "Endgame Wednesday",
      headline: "Club night, then five calm minutes of endgame technique.",
      sessions: [
        { id: "wed-endgame", icon: "♔", title: "Mate the lone king", start: "19:40", minutes: 15, what: ["Lichess Practice → Piece checkmates: Queen mate × 2", "Rook mate × 2 (box method)", "Time your best rook mate on the clock", "Write the time in your notebook"], libraryId: "kr-v-k" },
      ],
      tip: "Endgames reward calm. Shrink the box one step at a time and never rush into stalemate.",
    },
    {
      day: "Thursday",
      theme: "Think Thursday",
      headline: "Train the blunder check until it happens without thinking.",
      sessions: [
        { id: "thu-blunder", icon: "🛑", title: "Checks, captures, threats", start: "19:40", minutes: 20, what: ["10 puzzles at your normal level", "Before EVERY move, say: checks? captures? threats? (theirs and yours)", "Then 2 minutes of the Lichess Coordinates trainer", "Note any puzzle where the check would have saved you"], libraryId: "blunder-check" },
      ],
      tip: "The best players aren't the ones who never miss things. They're the ones who check every time.",
    },
    {
      day: "Friday",
      theme: "Review Friday",
      headline: "Go back over a game of yours. This is where the real learning happens.",
      sessions: [
        { id: "fri-review", icon: "🔍", title: "Review one of your games", start: "19:40", minutes: 20, what: ["Pick a game from this week (win or loss)", "First go through it WITHOUT the engine: mark where you felt unsure", "Then turn on computer analysis and find your biggest mistake", "Write one sentence: 'Next time I will…'"], libraryId: "game-review" },
      ],
      tip: "Losses teach you more than wins. Review the painful ones first.",
    },
    {
      day: "Saturday",
      theme: "Speed Saturday",
      headline: "Fast pattern spotting. Last Saturday of the month is test day.",
      sessions: [
        { id: "sat-storm", icon: "⚡", title: "Puzzle Storm + mate-in-1s", start: "19:40", minutes: 15, what: ["2 runs of Puzzle Storm (3 minutes each)", "Then Puzzle themes → Mate in 1: as many as you can in 3 minutes", "Last Saturday of the month: do the Benchmark tests instead", "Write your best scores down"], libraryId: "mate-patterns" },
      ],
      tip: "Speed comes from patterns you've already seen. If your score drops, slow down. Accuracy first.",
    },
    {
      day: "Sunday",
      theme: "Game Day",
      headline: "Play a proper game with a proper clock, then learn from it while it's fresh.",
      sessions: [
        { id: "sun-game", icon: "♟️", title: "One rapid game (10+5)", start: "16:00", minutes: 25, what: ["Play one rated 10+5 game on Lichess (Kid mode on), or a bot at a level that beats you about half the time", "Write the moves on paper as you go, or just your opening and key moments", "Use your blunder check every move", "Glance at the clock at move 10 and move 20"], libraryId: "clock-management" },
        { id: "sun-review", icon: "📝", title: "Quick review", start: "16:30", minutes: 15, what: ["Go through the game while you still remember your thoughts", "Find the moment the game turned", "Save it to your Lichess study 'My games'"], libraryId: "game-review" },
      ],
      tip: "You've played a football match this morning, so eat and rest first. Chess after a rest is much sharper.",
    },
  ],

  /* ── The library ──────────────────────────────────────────────────────── */
  library: {
    label: "Skills",
    icon: "♞",
    title: "The Chess Skill Library",
    lead:
      "Sixteen skills that strong players use every game. Each one has a Bronze, Silver and Gold target. Start at Bronze, and only move up when it feels easy. Practise everything on Lichess: Puzzles, Practice, the Analysis board and Learn.",
    categories: ["Tactics", "Openings", "Endgames", "Thinking", "Notation & review"],
    items: [
      {
        id: "fork-double-attack", name: "Forks & Double Attacks", category: "Tactics", minutes: 15, kit: "Lichess Puzzles → Puzzle themes → Fork",
        why: "One move that attacks two things at once. Your opponent can only save one. Most games between club players are won by a fork.",
        steps: ["Learn the knight fork shape: the knight jumps to a square that hits two pieces at once (often king and queen, or king and rook)", "Look for pawn forks too: a pawn moving forward to attack two pieces side by side", "Queens fork everything: a check plus an attack on a loose piece is a classic double attack", "Solve 10 fork puzzles. Before moving, name the two targets", "In your own games, check: are any two of their pieces a knight's jump apart from one square?"],
        points: ["Undefended pieces are fork bait. Spot them first", "A check is the best half of a double attack: they MUST answer it", "Name both targets before you play the move"],
        targets: { bronze: "8 of 10 fork puzzles right", silver: "10/10 fork puzzles, no hints", gold: "Find a fork in one of your own real games" },
        watch: "knight fork chess tactics explained for beginners",
      },
      {
        id: "pins-skewers", name: "Pins & Skewers", category: "Tactics", minutes: 15, kit: "Lichess Puzzles → themes Pin and Skewer",
        why: "Bishops, rooks and queens attack along lines. A pin freezes a piece in front of something more valuable. A skewer hits the valuable piece first and wins the one behind.",
        steps: ["Pin: attack a piece that can't move without exposing something bigger behind it (an absolute pin is when the king is behind, so it can't move at all)", "Skewer: attack the big piece first, it moves, and you take what was behind it", "Look for two of their pieces on the same line, rank, file or diagonal", "Solve 6 pin and 4 skewer puzzles", "Bonus: pile up on a pinned piece. Attack it again, with a pawn if you can"],
        points: ["Two enemy pieces on one line? Look for a pin or a skewer", "Pinned pieces don't really defend", "Kings and queens on the same line are an alarm bell, for both sides"],
        targets: { bronze: "Explain the difference between a pin and a skewer to Mum", silver: "8/10 pin & skewer puzzles", gold: "Win material with a pin or skewer in a real game" },
        watch: "chess pin and skewer tactics for kids",
      },
      {
        id: "discovered-attack", name: "Discovered Attacks", category: "Tactics", minutes: 15, kit: "Lichess Puzzles → themes Discovered attack",
        why: "Move one piece out of the way and the piece behind it attacks. Now there are two threats in one move. A discovered check is the most powerful version.",
        steps: ["Find your 'hidden' line piece: a bishop, rook or queen sitting behind one of your own pieces", "Look at what it would hit if the front piece moved", "Now move the front piece WITH a threat of its own: a check, a capture, or an attack on the queen", "Solve 8 discovered-attack puzzles", "Learn the double check: both pieces give check, so the king has to move"],
        points: ["The front piece is the one that does the damage. Make its move count", "Discovered check means you can attack anything with the front piece", "Watch for your opponent setting these up against you too"],
        targets: { bronze: "6/8 discovered-attack puzzles", silver: "8/8 and you can explain double check", gold: "Spot a discovered attack (yours or theirs) in a real game" },
        watch: "discovered attack chess tactic explained",
      },
      {
        id: "back-rank", name: "Back-Rank Mate", category: "Tactics", minutes: 10, kit: "Lichess Puzzles → themes Back rank mate",
        why: "A castled king behind three unmoved pawns has no escape square. One rook or queen landing on the back rank can end the game, even late in a winning position.",
        steps: ["Picture it: the king is on its back row, its own pawns in front block every escape", "A rook or queen checks along that back row and nothing can block or take it", "Solve 8 back-rank puzzles", "Learn the cure: give your king 'luft' (air) by moving one pawn in front of it, when you have a spare moment", "Before every rook trade, ask: is my back rank safe?"],
        points: ["Check your own back rank first, then theirs", "If a defender is the only thing guarding the back rank, it is overloaded", "One pawn move for luft can save the game"],
        targets: { bronze: "6/8 back-rank puzzles", silver: "8/8 and you make luft in your own games when needed", gold: "Go a month with no back-rank losses" },
        watch: "back rank checkmate chess pattern beginners",
      },
      {
        id: "remove-defender", name: "Removing the Defender", category: "Tactics", minutes: 15, kit: "Lichess Puzzles → themes Capturing defender, Deflection",
        why: "If one piece is guarding two jobs, take it, chase it away or lure it off. Then the thing it was guarding falls.",
        steps: ["For every enemy piece, ask: what is it defending?", "Find a piece with two jobs. That piece is overloaded", "Capture it, attack it so it must move, or offer something it must take (deflection)", "Then take what it was protecting", "Solve 8 puzzles on Capturing defender and Deflection"],
        points: ["Count attackers and defenders on the key square", "A piece with two jobs can only do one", "Sometimes giving material away wins more back"],
        targets: { bronze: "6/8 puzzles", silver: "8/8 puzzles and you can explain 'overloaded'", gold: "Win material by removing a defender in a real game" },
        watch: "removing the defender chess tactic explained",
      },
      {
        id: "mate-patterns", name: "Mate-in-1 & Mate-in-2 Patterns", category: "Tactics", minutes: 10, kit: "Lichess Puzzles → themes Mate in 1, Mate in 2; Lichess Practice → Checkmate patterns",
        why: "Checkmate patterns are the alphabet of chess. When you know them by sight, you stop missing wins and stop walking into losses.",
        steps: ["Work through Lichess Practice → Checkmate patterns, one pattern a session", "Then solve Mate in 1 puzzles as fast as you can for 3 minutes, counting correct ones", "Move on to Mate in 2: the first move is usually a check or a sacrifice that forces the king", "Write the names of patterns you meet (back-rank, smothered, Anastasia's, and so on)"],
        points: ["Look at every check first, even the 'silly' ones", "Where can the king run? Cover those squares", "Speed comes from recognising, not guessing"],
        targets: { bronze: "10 mate-in-1s in 3 minutes", silver: "15 in 3 minutes", gold: "20 in 3 minutes, plus 8/10 mate-in-2s" },
        watch: "checkmate patterns every beginner should know",
      },
      {
        id: "opening-principles", name: "Opening Principles", category: "Openings", minutes: 15, kit: "A board or the Lichess analysis board",
        why: "You don't need to memorise hundreds of moves. Five rules get you to a good middle game in almost every opening.",
        steps: ["Control the centre with a pawn: e4 or d4 (or meet them with ...e5 or ...d5)", "Develop knights and bishops before moving the same piece twice", "Castle early, usually by move 10", "Don't bring the queen out early. It gets chased and you lose time", "Connect your rooks (nothing between them on the back row), then make a plan"],
        points: ["Every opening move should develop, control the centre or keep the king safe", "Knights before bishops is a good default", "If they break a rule, punish it with development, not greed"],
        targets: { bronze: "Say all five rules from memory", silver: "Castle by move 10 in 4 of your last 5 games", gold: "Fully developed and castled by move 12 in every game this month" },
        watch: "chess opening principles for beginners explained",
      },
      {
        id: "white-italian", name: "As White: The Italian Game", category: "Openings", minutes: 20, kit: "Lichess analysis board + your chess notebook",
        why: "One simple, classical repertoire played by everyone from beginners to world champions. It follows every opening rule, so even when you forget a move you'll find a good one.",
        steps: ["Main line: 1.e4 e5 2.Nf3 Nc6 3.Bc4. Pawn in the centre, knight attacks e5, bishop aims at f7", "If 3...Bc5: play 4.c3 Nf6 5.d3, then castle and play calmly", "If 3...Nf6 (Two Knights): play 4.d3. Simple and solid", "If Black doesn't play 1...e5: use the principles: Nf3, a bishop out, castle, pawns to the centre", "Play the main lines 3 times each from memory on the analysis board"],
        points: ["Watch out for f7: it's your target, and f2 is theirs", "After d3 the game is slow, so make a plan, don't panic", "Learn ideas (centre, castle, f7) before more moves"],
        targets: { bronze: "Play the first 5 moves of both lines from memory", silver: "Use the Italian in 5 games and castle in all of them", gold: "Explain why each of your first 6 moves is a good move" },
        watch: "Italian Game opening for beginners Giuoco Piano",
      },
      {
        id: "black-replies", name: "As Black: Your Two Replies", category: "Openings", minutes: 20, kit: "Lichess analysis board + your chess notebook",
        why: "As Black you need one answer to 1.e4 and one to 1.d4. Both are classical and follow the principles, so they're easy to play well.",
        steps: ["Against 1.e4, play 1...e5. After 2.Nf3 play 2...Nc6", "If 3.Bc4 (Italian): reply 3...Bc5 or 3...Nf6. If 3.Bb5 (Spanish): reply 3...a6 or 3...Nf6", "Against 1.d4, play 1...d5. After 2.c4 play 2...e6 (the Queen's Gambit Declined)", "Then develop: ...Nf6, ...Be7, castle, ...c6 or ...b6 for the light-squared bishop", "Against anything else: centre pawn, knights out, castle"],
        points: ["Don't grab the c4 pawn early in the Queen's Gambit. Hold the centre", "Equal is a great result with Black. Play solid first", "Know your plan for the light-squared bishop; it's often your worst piece"],
        targets: { bronze: "Know your reply to 1.e4 and 1.d4 for the first 3 moves", silver: "Castle safely in 5 games as Black", gold: "Reach move 15 equal or better in 3 of 5 Black games (check with the engine after)" },
        watch: "Queen's Gambit Declined for beginners",
      },
      {
        id: "kq-v-k", name: "King + Queen v King", category: "Endgames", minutes: 10, kit: "Lichess Practice → Piece checkmates I → Queen mate",
        why: "The first mate every player must be able to do quickly. Getting it wrong, especially stalemate, throws away a won game.",
        steps: ["Put your queen a knight's move away from their king. This traps it in a box", "Each time their king moves, move your queen to keep the same knight's-move shape, shrinking the box", "When their king is stuck on the edge, STOP pushing with the queen", "Bring your own king up beside it", "Deliver mate with the queen, protected by your king"],
        points: ["Before every move, ask: does their king have a legal move? If not, and it isn't check, that's stalemate", "The queen squeezes, the king finishes", "Slow and certain beats fast and stalemated"],
        targets: { bronze: "Mate a computer from the middle of the board", silver: "Mate in under 60 seconds", gold: "Mate in under 40 seconds, 5 times in a row, no stalemates" },
        watch: "king and queen vs king checkmate technique",
      },
      {
        id: "kr-v-k", name: "King + Rook v King (the box)", category: "Endgames", minutes: 15, kit: "Lichess Practice → Piece checkmates I → Rook mate",
        why: "Harder than the queen mate because your king has to do real work. If you can do this fast, you understand how kings and pieces work together.",
        steps: ["Use the rook to cut their king into a box (a rook on a rank or file it can't cross)", "Bring your king towards theirs to help", "When the kings face each other with one square between, give check with the rook", "When their king runs away, make a waiting move with the rook (along its line) so they must step back", "Shrink the box until they're on the edge, then checkmate"],
        points: ["Keep the rook far away from their king so it can't be attacked", "The rook check works when the kings are facing (opposition)", "Use waiting moves; they're not wasted moves"],
        targets: { bronze: "Mate the computer with no time limit", silver: "Mate in under 2 minutes", gold: "Mate in under 75 seconds, 3 in a row" },
        watch: "king and rook vs king checkmate box method",
      },
      {
        id: "kp-opposition", name: "King & Pawn: The Opposition", category: "Endgames", minutes: 15, kit: "A board or Lichess board editor",
        why: "Many games come down to one pawn. Knowing the opposition tells you whether it becomes a queen or a draw. Capablanca said beginners should study endings early.",
        steps: ["Opposition: the two kings face each other with one square between. The side that does NOT have to move 'has the opposition'", "Rule 1: put your king IN FRONT of your pawn, not behind it", "Rule 2: win the opposition so their king has to step aside", "Rule of the square: draw a box from the pawn to the queening rank. If their king can step into it, it can catch the pawn", "Set up King + pawn v King on the board editor and play both sides"],
        points: ["King in front, pawn behind", "Take the opposition, don't give it away", "An edge-file (a or h) pawn is often a draw. Learn why"],
        targets: { bronze: "Explain the opposition to Mum on a board", silver: "Win King + pawn v King against the computer from a winning position", gold: "Know when it's a win and when it's a draw before you play it out" },
        watch: "king and pawn endgame opposition explained beginners",
      },
      {
        id: "blunder-check", name: "The Blunder Check (CCT)", category: "Thinking", minutes: 10, kit: "Every single game and puzzle",
        why: "Most games below master level are lost by a piece left hanging or a tactic missed. A ten-second check before every move fixes most of them.",
        steps: ["Before you move, look at THEIR last move: what does it threaten?", "Checks: what checks can they give, and can you give any?", "Captures: what can they take, and what can you take?", "Threats: what are they planning next, and what will your move allow?", "Only then play the move. Hand off the piece only when you're sure"],
        points: ["'What did their move just do?' is the most important question in chess", "Checks, captures, threats, in that order, every move", "If the move looks amazing, check it twice"],
        targets: { bronze: "Do the check out loud in 10 puzzles", silver: "No pieces hung for nothing in 3 games in a row", gold: "A whole month of games with no one-move blunders" },
        watch: "chess thinking process checks captures threats",
      },
      {
        id: "clock-management", name: "Time Management", category: "Thinking", minutes: 25, kit: "Lichess 10+5 or 15+10 games",
        why: "Fast play is how strong positions get thrown away. Too slow and you lose on time. Good players spend time on the moves that matter.",
        steps: ["Play the opening at a steady pace: you know these moves", "Slow down when something changes: a capture, a check, a new threat, or the start of an endgame", "Checkpoints: at move 10 you should still have most of your time; at move 20 still around half", "Never premove in a long game", "If you're short of time, play simple safe moves, not tricks"],
        points: ["Spend time where the game is decided", "A won position with no time left can still be lost", "Rapid and classical games, not bullet, are how you get better"],
        targets: { bronze: "Finish 5 rapid games without losing on time", silver: "At move 20, still have half your time in most games", gold: "Never lose on time in a whole month of rapid games" },
        watch: "chess time management tips for beginners",
      },
      {
        id: "notation", name: "Reading & Writing Notation", category: "Notation & review", minutes: 10, kit: "Lichess Coordinates trainer, pencil and paper",
        why: "Notation lets you record your games, read chess books and follow lessons. In real tournaments you have to write every move.",
        steps: ["Files are a to h (left to right from White), ranks are 1 to 8", "Pieces: K king, Q queen, R rook, B bishop, N knight. Pawns have no letter", "Moves: Nf3 (knight to f3), exd5 (e-pawn takes on d5), O-O (castle short), O-O-O (castle long), + check, # mate", "Do 2 minutes of the Lichess Coordinates trainer from White's side, then from Black's", "Write down one whole game by hand and check it against Lichess"],
        points: ["Write the move first, then play it (that's what tournament players do)", "x means captures, + means check", "Practise from Black's side too; it feels backwards at first"],
        targets: { bronze: "10 correct in the Coordinates trainer (30 s)", silver: "18 correct, and a full game written with no mistakes", gold: "25 correct from both sides" },
        watch: "how to read and write chess notation algebraic",
      },
      {
        id: "game-review", name: "Reviewing Your Own Games", category: "Notation & review", minutes: 20, kit: "Lichess game page + 'Request a computer analysis', your notebook",
        why: "Playing makes you experienced; reviewing makes you better. Strong players study their own losses carefully.",
        steps: ["Right after the game, write down what you were thinking at the key moments", "Go through the game WITHOUT the engine first. Where did you feel unsure?", "Turn on computer analysis. Find the biggest swing in the evaluation graph", "Ask: was it a tactic, a missed blunder check, the opening, or the clock?", "Write one lesson in your notebook and save the game to a Lichess study called 'My games'"],
        points: ["Your thoughts first, the engine second", "One lesson per game is enough", "Look for the same mistake showing up again and again"],
        targets: { bronze: "Review 4 games this month", silver: "Review 8 games, each with a written lesson", gold: "Review every rated game and spot your top 3 repeating mistakes" },
        watch: "how to analyze your own chess games",
      },
    ],
  },

  /* ── Programmes ───────────────────────────────────────────────────────── */
  programmes: [
    {
      id: "tactics",
      icon: "⚔️",
      label: "Tactics",
      kicker: "PROGRAMME 1 · 8 WEEKS",
      title: "Tactics Training",
      intro:
        "Tactics win most games at your level. This eight-week block trains one pattern at a time until you see it without searching, then mixes them up so you find them in real games.",
      rules: [
        "Accuracy first, speed second. A wrong answer at speed teaches nothing.",
        "Name the pattern before you play the move.",
        "Do the blunder check in every puzzle, not just in games.",
        "Puzzles you get wrong go in your notebook. Try them again next week.",
      ],
      blocks: [
        {
          name: "Weeks 1–2 · Forks and double attacks",
          when: "Mon + Thu 19:40",
          items: [
            { name: "Fork puzzles", dose: "10 per session", cue: "Name both targets first" },
            { name: "Mate-in-1 sprint", dose: "3 minutes", cue: "Look at every check" },
          ],
        },
        {
          name: "Weeks 3–4 · Pins, skewers and discovered attacks",
          when: "Mon + Thu 19:40",
          items: [
            { name: "Pin and skewer puzzles", dose: "8 per session", cue: "Two pieces on one line?" },
            { name: "Discovered attack puzzles", dose: "5 per session", cue: "The front piece must threaten too" },
          ],
        },
        {
          name: "Weeks 5–6 · Back rank and removing the defender",
          when: "Mon + Thu 19:40",
          items: [
            { name: "Back-rank puzzles", dose: "6 per session", cue: "Can the king escape?" },
            { name: "Capturing defender / deflection", dose: "6 per session", cue: "Which piece has two jobs?" },
          ],
        },
        {
          name: "Weeks 7–8 · Mixed and timed",
          when: "Mon + Thu + Sat 19:40",
          items: [
            { name: "Mixed puzzles (Lichess Puzzles, no theme)", dose: "15 per session", cue: "Find the pattern yourself" },
            { name: "Puzzle Storm", dose: "2 runs", cue: "Beat last week's best" },
          ],
        },
      ],
      redFlags: [
        "Your puzzle rating keeps falling for two weeks: stop and tell Mum, so you can slow down together",
        "Puzzles are making you angry or upset: stop for the day",
        "Your eyes are sore or you're getting headaches at the screen",
      ],
    },
    {
      id: "openings",
      icon: "📖",
      label: "Openings",
      kicker: "PROGRAMME 2 · 6 WEEKS",
      title: "Openings Repertoire",
      intro:
        "One repertoire as White and two replies as Black, learned through ideas, not just moves. By the end you'll reach a good middle game every time without thinking hard.",
      rules: [
        "Principles first: centre, develop, castle.",
        "Learn ideas, not long lines. Ten moves deep is plenty for now.",
        "Every line you learn goes in your notebook, in notation.",
        "After every game, check where you left your preparation and why.",
      ],
      blocks: [
        {
          name: "Weeks 1–2 · Principles + Italian Game",
          when: "Tue 19:40 + Sun 16:00",
          items: [
            { name: "Say the five opening rules", dose: "Once each session", cue: "Centre, develop, castle" },
            { name: "Italian main lines from memory", dose: "3 times each", cue: "Bishop aims at f7" },
            { name: "Play the Italian as White vs a bot", dose: "1 game", cue: "Castle by move 10" },
          ],
        },
        {
          name: "Weeks 3–4 · As Black against 1.e4",
          when: "Tue 19:40 + Sun 16:00",
          items: [
            { name: "1...e5 2.Nf3 Nc6 lines", dose: "3 times each", cue: "Know your answer to Bc4 and Bb5" },
            { name: "Play as Black vs a bot", dose: "1 game", cue: "Equal is a good result" },
          ],
        },
        {
          name: "Weeks 5–6 · As Black against 1.d4",
          when: "Tue 19:40 + Sun 16:00",
          items: [
            { name: "Queen's Gambit Declined setup", dose: "3 times", cue: "Hold d5, develop, castle" },
            { name: "Repertoire test: play every line from memory", dose: "Once, end of week 6", cue: "Fix the one you miss" },
          ],
        },
      ],
      redFlags: [
        "You're memorising long lines you don't understand: stop and go back to principles",
        "You want to switch openings every week. Tell Mum and stick with these for the season",
      ],
    },
    {
      id: "endgames",
      icon: "♔",
      label: "Endgames",
      kicker: "PROGRAMME 3 · 6 WEEKS",
      title: "Endgame School",
      intro:
        "Capablanca taught that endgames should be learned early, because they show you what each piece can really do. These are the mates and pawn endings every strong player can do half asleep.",
      rules: [
        "Before every move in a mate: is it stalemate?",
        "Time your mates so you can see yourself getting faster.",
        "Play both sides of pawn endings: learn how to win AND how to hold the draw.",
      ],
      blocks: [
        {
          name: "Weeks 1–2 · King + Queen v King",
          when: "Wed 19:40 + Sat 19:40",
          items: [
            { name: "Queen mate (Lichess Practice)", dose: "3 times", cue: "Knight's-move box" },
            { name: "Timed queen mate", dose: "2 attempts", cue: "Queen squeezes, king finishes" },
          ],
        },
        {
          name: "Weeks 3–4 · King + Rook v King",
          when: "Wed 19:40 + Sat 19:40",
          items: [
            { name: "Rook mate (Lichess Practice)", dose: "3 times", cue: "Shrink the box" },
            { name: "Timed rook mate", dose: "2 attempts", cue: "Waiting moves are fine" },
          ],
        },
        {
          name: "Weeks 5–6 · King and pawn",
          when: "Wed 19:40 + Sun 16:00",
          items: [
            { name: "Opposition drill on the board editor", dose: "10 minutes", cue: "Side NOT to move has it" },
            { name: "Rule of the square", dose: "5 positions you set up", cue: "Can their king catch it?" },
            { name: "K + P v K vs the computer", dose: "3 games each side", cue: "King in front of the pawn" },
          ],
        },
      ],
      redFlags: [
        "You stalemate three times in a row: stop, and slow right down next session",
        "You're getting frustrated: switch to puzzles for the day and come back",
      ],
    },
  ],

  /* ── What coaches look for ────────────────────────────────────────────── */
  experts: {
    title: "What a chess coach is really looking for",
    lead:
      "A good chess coach doesn't only look at your rating. They watch HOW you think, how you handle the clock, and how you react when things go wrong.",
    corners: [
      { icon: "⚔️", name: "Tactics", lookFor: ["Spots forks, pins and loose pieces quickly", "Checks, captures, threats before every move", "Sees the opponent's tactics, not just his own", "Calculates 2–3 moves ahead accurately"] },
      { icon: "🧭", name: "Understanding", lookFor: ["Follows opening principles without being told", "Has a plan in the middle game, not just random moves", "Knows the basic mates and pawn endings cold", "Can explain WHY a move is good"] },
      { icon: "⏱️", name: "Discipline", lookFor: ["Plays slowly at the important moments", "Writes his moves in tournaments", "Doesn't play bullet to 'warm up'", "Finishes games he's losing; doesn't rage-quit"] },
      { icon: "🦁", name: "Mindset", lookFor: ["Reviews his losses without excuses", "Stays calm after a mistake and fights on", "Plays stronger opponents and learns from them", "Practises the same when nobody's watching"] },
      { icon: "🤝", name: "Sportsmanship", lookFor: ["Shakes hands before and after, win or lose", "Says 'good game' and means it", "Quiet at the board, no distracting the opponent", "Follows the touch-move rule honestly"] },
    ],
    redCards: [
      "Moving instantly without a blunder check",
      "Playing hours of bullet and calling it training",
      "Resigning or leaving too early when the position is still playable",
      "Never reviewing games, especially losses",
      "Learning trick openings instead of principles",
      "Sulking, blaming luck, or being rude to an opponent",
    ],
  },

  /* ── Benchmarks ───────────────────────────────────────────────────────── */
  benchmarks: [
    { id: "puzzle-rating", icon: "🧩", test: "Lichess puzzle rating", how: "Read it from your Lichess profile on test day. Starting target only; Mum re-sets after the first test", unit: "rating", better: "higher", bronze: 1400, silver: 1600, gold: 1800 },
    { id: "mate1-3min", icon: "♚", test: "Mate-in-1s solved in 3 minutes", how: "Puzzle themes → Mate in 1. Mum times 3 minutes; count correct answers only", unit: "puzzles", better: "higher", bronze: 10, silver: 15, gold: 20 },
    { id: "storm", icon: "⚡", test: "Puzzle Storm score", how: "Best of 2 runs (3 minutes each)", unit: "score", better: "higher", bronze: 15, silver: 22, gold: 30 },
    { id: "kq-time", icon: "👑", test: "K+Q v K mate time", how: "Lichess Practice → Queen mate. Mum times from first move to mate. Stalemate = no score", unit: "seconds", better: "lower", bronze: 90, silver: 60, gold: 40 },
    { id: "kr-time", icon: "🏰", test: "K+R v K mate time", how: "Lichess Practice → Rook mate. Mum times from first move to mate. Best of 2", unit: "seconds", better: "lower", bronze: 180, silver: 120, gold: 75 },
    { id: "coords", icon: "🔤", test: "Coordinates trainer (30 s)", how: "Lichess Coordinates trainer, White's side, best of 2", unit: "correct", better: "higher", bronze: 10, silver: 18, gold: 25 },
    { id: "rapid-rating", icon: "♟️", test: "Lichess rapid rating", how: "From your profile on test day. Starting target only", unit: "rating", better: "higher", bronze: 1300, silver: 1500, gold: 1700 },
    { id: "games-reviewed", icon: "📝", test: "Games reviewed this month", how: "Count games in your 'My games' study with a written lesson", unit: "games", better: "higher", bronze: 4, silver: 8, gold: 12 },
    { id: "clean-games", icon: "🛑", test: "Clean games (no blunders) out of your last 5", how: "Lichess computer analysis: games with zero moves marked 'Blunder'", unit: "/5", better: "higher", bronze: 1, silver: 2, gold: 3 },
  ],

  ladder: [
    { icon: "🌱", name: "Learner", what: "Knows all the rules, castling, en passant and notation. Finishes the Lichess Learn section.", when: "Now" },
    { icon: "⚔️", name: "Tactician", what: "Spots the main tactics, does the blunder check, mates with K+Q and K+R.", when: "First 6 months" },
    { icon: "♟️", name: "Club player", what: "Joins a junior chess club (Mum finds one through Chess Victoria) and plays real games on a real board with a clock.", when: "This year" },
    { icon: "🏆", name: "Tournament player", what: "Plays a junior weekend tournament, writes every move and reviews every game.", when: "When Mum and you are ready" },
    { icon: "📈", name: "Rated player", what: "Earns an official Australian Chess Federation rating from tournament games.", when: "After a few tournaments" },
    { icon: "🎓", name: "Strong junior", what: "Plays state junior events and helps teach younger kids, which is the best way to learn.", when: "The long road" },
  ],
  ladderNote:
    "These are rungs, not deadlines. Every number on this page is a STARTING target for a 12-year-old, not a norm. After your first honest test, Mum re-sets them so Silver is 'hard but possible this month'. Compare yourself to last month's you, not to anyone else.",

  /* ── The season ───────────────────────────────────────────────────────── */
  season: {
    goals: [
      { icon: "🧩", goal: "See tactics fast and stop blundering", measure: "Puzzle rating and clean games out of 5" },
      { icon: "♔", goal: "Win every won endgame", measure: "K+Q and K+R mate times, no stalemates" },
      { icon: "📝", goal: "Learn from every game", measure: "Games reviewed with a written lesson" },
    ],
    phases: [
      { icon: "🌱", name: "Foundations", months: "January – March", aim: "Rules, notation, opening principles and the blunder check" },
      { icon: "⚔️", name: "Tactics Engine", months: "April – June", aim: "Run the Tactics Training programme and build pattern speed" },
      { icon: "♔", name: "Endgame School", months: "July – September", aim: "Mates, opposition and the Openings Repertoire" },
      { icon: "🏆", name: "Game Ready", months: "October – December", aim: "Real games with a clock, careful review, maybe a first junior tournament" },
    ],
    phaseForMonth: [
      "Foundations", "Foundations", "Foundations",
      "Tactics Engine", "Tactics Engine", "Tactics Engine",
      "Endgame School", "Endgame School", "Endgame School",
      "Game Ready", "Game Ready", "Game Ready",
    ],
    months: [
      { month: "January", focus: "Notation: read and write every move", libraryId: "notation" },
      { month: "February", focus: "Opening principles in every game", libraryId: "opening-principles" },
      { month: "March", focus: "The blunder check becomes automatic", libraryId: "blunder-check" },
      { month: "April", focus: "Forks and double attacks", libraryId: "fork-double-attack" },
      { month: "May", focus: "Pins, skewers and discovered attacks", libraryId: "pins-skewers" },
      { month: "June", focus: "Back-rank mates and removing the defender", libraryId: "remove-defender" },
      { month: "July", focus: "King + Queen and King + Rook mates", libraryId: "kr-v-k" },
      { month: "August", focus: "King and pawn: the opposition", libraryId: "kp-opposition" },
      { month: "September", focus: "Your White and Black repertoire", libraryId: "white-italian" },
      { month: "October", focus: "Time management in rapid games", libraryId: "clock-management" },
      { month: "November", focus: "Reviewing your own games", libraryId: "game-review" },
      { month: "December", focus: "Mate patterns and a season retest", libraryId: "mate-patterns" },
    ],
  },

  /* ── Heroes ───────────────────────────────────────────────────────────── */
  heroes: {
    title: "Chess heroes",
    lead: "Real champions with real struggles. None of them was born knowing chess; they all built it, one game at a time.",
    people: [
      {
        id: "carlsen", name: "Magnus Carlsen", emoji: "👑", country: "Norway", known: "World Champion 2013–2023", born: "1990 · Tønsberg, Norway", colour: "#c8102e",
        tagline: "The football-loving kid who became the highest-rated player in history.",
        childhood: "Magnus grew up in Norway, a country with almost no chess tradition. His dad taught him the game, and around the age of 8 he got hooked, spending hours alone with chess books and setting up positions. He became a grandmaster in 2004 at 13.",
        hardship: ["Norway had very few strong players, so he had to travel to find tough opponents.", "At 13 he drew a rapid game against Garry Kasparov, then lost the next one and was knocked out.", "He was a kid among adults at most tournaments."],
        overcame: ["He trained with Norwegian grandmaster Simen Agdestein while going to a sports school in Oslo.", "His family took a year travelling around Europe so he could play tournaments.", "He kept playing football and other sports, which he says keep his head fresh.", "He became World Champion in 2013 and reached a peak rating of 2882 in 2014, the highest ever."],
        lesson: "Loving the game is the engine. Magnus played because he enjoyed it, and the hours followed.",
        challenge: "This week, play through one chess game just for fun, with no rating on the line, and notice what you enjoy.",
      },
      {
        id: "polgar", name: "Judit Polgár", emoji: "⚡", country: "Hungary", known: "Strongest female player in history", born: "1976 · Budapest, Hungary", colour: "#ce2939",
        tagline: "A homeschooled girl who played the best men in the world, and beat them.",
        childhood: "Judit and her two older sisters were homeschooled by their parents in Budapest, with chess at the centre of their learning. In 1991, at 15, she became a grandmaster, younger than Bobby Fischer had been.",
        hardship: ["Many people at the time believed girls could not reach the top in chess.", "She chose to play in open events against the strongest men instead of only women's events, which meant losing a lot on the way up.", "She was often the only girl in the room."],
        overcame: ["She trained daily alongside her sisters, so they pushed each other.", "She played an aggressive, attacking style and became the only woman ever to reach the overall world top 10.", "She beat many world champions in individual games, including Garry Kasparov in 2002."],
        lesson: "Homeschool can build a champion. Daily, focused practice beats raw talent.",
        challenge: "Play one bot or opponent this week that's stronger than you. Win or lose, review the game.",
      },
      {
        id: "anand", name: "Viswanathan Anand", emoji: "🐯", country: "India", known: "World Champion 2000 and 2007–2013", born: "1969 · Mayiladuthurai, India", colour: "#ff9933",
        tagline: "India's first grandmaster, who learned chess from his mum.",
        childhood: "Anand's mother taught him chess when he was about 6. While the family lived in the Philippines, he and his mum solved the puzzles from a TV chess programme together, and he sent in so many right answers that he became a regular winner.",
        hardship: ["When he started, India had no grandmasters and very little chess coaching.", "In 2013 he lost his world title to Magnus Carlsen in front of his home crowd in Chennai.", "Many people said his career at the top was over."],
        overcame: ["He was famous for playing fast, earning the nickname 'the Lightning Kid'.", "He became India's first grandmaster in 1988, and inspired a whole country to take up chess.", "After losing in 2013, he won the Candidates Tournament in 2014 to earn a rematch."],
        lesson: "A big loss isn't the end. Anand lost his title at home and came straight back.",
        challenge: "Take your most painful loss this month, review it calmly, and write down one lesson.",
      },
      {
        id: "gukesh", name: "Gukesh Dommaraju", emoji: "🎯", country: "India", known: "Youngest undisputed World Champion", born: "2006 · Chennai, India", colour: "#1e90ff",
        tagline: "Missed a world record by 17 days, then became World Champion at 18.",
        childhood: "Gukesh started chess at 7 in Chennai, the city where Anand had inspired a generation. His father, an ENT surgeon, put his medical work aside for a time so he could travel with Gukesh to tournaments.",
        hardship: ["He became a grandmaster in 2019 at 12 years and 7 months, just 17 days too old to break the record for the youngest ever.", "His family made real sacrifices so he could keep playing.", "Before his title match in 2024, many experts thought he was too young."],
        overcame: ["He didn't dwell on the record and kept improving.", "In 2024 he won the Candidates Tournament at 17, the youngest ever.", "In December 2024 he beat Ding Liren to become the youngest undisputed World Champion, at 18."],
        lesson: "Missing a goal by a whisker is not failure. Keep going and a bigger goal can come.",
        challenge: "Pick one benchmark you just missed last test. Train it a little every day this week.",
      },
      {
        id: "mutesi", name: "Phiona Mutesi", emoji: "🌍", country: "Uganda", known: "The Queen of Katwe", born: "1996 · Kampala, Uganda", colour: "#fcdc04",
        tagline: "From a slum in Kampala to the Chess Olympiad.",
        childhood: "Phiona grew up in Katwe, one of Kampala's poorest areas. Her father died when she was very young, and her family couldn't afford to keep her in school. At about 9 she followed her brother to a chess programme run by coach Robert Katende, partly because it gave out a free bowl of porridge.",
        hardship: ["Her family often didn't have enough food and sometimes had nowhere stable to live.", "She had to leave school because there was no money for fees.", "She had never seen a chess board before she joined the programme."],
        overcame: ["She learned quickly from Coach Katende and became Uganda's junior girls' champion.", "She represented Uganda at the Chess Olympiad as a young teenager.", "Her story became the book and Disney film 'Queen of Katwe', and she later went to university in the United States."],
        lesson: "Where you start doesn't decide where you finish. Show up, learn, keep going.",
        challenge: "Show up for every chess session this week, even the short ones. Tick each one off.",
      },
      {
        id: "capablanca", name: "José Raúl Capablanca", emoji: "🎩", country: "Cuba", known: "World Champion 1921–1927", born: "1888 · Havana, Cuba", colour: "#002a8f",
        tagline: "The endgame genius who said: learn the endings first.",
        childhood: "Capablanca learned chess as a small boy in Havana by watching his father play. He became famous for playing simply and clearly, and for his endgame skill.",
        hardship: ["After he won the world title in 1921, he lost it to Alexander Alekhine in 1927.", "He never got the rematch he wanted.", "His smooth style made people think chess came easily to him, but endgame technique takes real practice."],
        overcame: ["He beat Emanuel Lasker in 1921 to become World Champion.", "He wrote 'Chess Fundamentals', which starts by teaching simple endings, and players still use it today.", "He stayed one of the world's best for years after losing the title."],
        lesson: "Simple, clean play wins. Master the basics before chasing tricks.",
        challenge: "Do the King + Rook v King mate three times this week and beat your time.",
      },
    ],
  },

  /* ── What to watch ────────────────────────────────────────────────────── */
  watch: {
    lead:
      "Videos can teach you a lot, but only if you're learning, not just being entertained. Watch with a board open and pause to guess the next move.",
    worthIt: [
      { icon: "🎓", title: "Lichess Learn and Practice", why: "Free, no ads, and you learn by doing, not watching.", how: "lichess.org → Learn, then Practice. Do one section a session." },
      { icon: "🏛️", title: "Beginner lectures from the Saint Louis Chess Club", why: "Real coaches explaining principles, tactics and endgames step by step.", how: "YouTube search: 'Saint Louis Chess Club beginner lecture'. Pause and play the moves on a board." },
      { icon: "📚", title: "Chess Fundamentals series by John Bartholomew", why: "Calm, clear lessons on how to think in your own games.", how: "YouTube search: 'John Bartholomew chess fundamentals'." },
      { icon: "♔", title: "Endgame technique videos", why: "Mates and pawn endings shown slowly. Perfect for the Endgame School.", how: "YouTube search: 'king and rook vs king box method'. Then do it yourself on Lichess." },
      { icon: "🏆", title: "Annotated world championship games", why: "See how Anand, Carlsen and Gukesh actually think at the board.", how: "YouTube search: 'Gukesh Ding world championship game explained'. Guess the move before they show it." },
    ],
    zeroValue: [
      { icon: "💥", title: "Clickbait trap and 'win in 5 moves' videos", why: "Tricks that only work against weak players. Principles beat traps." },
      { icon: "📺", title: "Hours of blitz and bullet streams", why: "Fun, but too fast to learn from. You watch moves, not thinking." },
      { icon: "🗣️", title: "Chess drama and gossip channels", why: "Arguments between players teach you nothing about the game." },
      { icon: "📊", title: "Just watching the engine bar move", why: "The engine knows the answer; you need to find it yourself." },
    ],
    rules: [
      "Learn first, watch second. Twenty minutes of puzzles beats an hour of videos.",
      "Have a board open and pause to guess the move.",
      "Screens off at 20:00, chess included.",
      "Mum knows what you're watching.",
    ],
  },

  /* ── Mum's corner ─────────────────────────────────────────────────────── */
  family: {
    role: [
      { icon: "🔐", text: "Sets up the Lichess account and keeps the password" },
      { icon: "🧒", text: "Turns on Kid mode (Preferences), which switches off chat and messages" },
      { icon: "⏱️", text: "Times the monthly benchmark tests" },
      { icon: "🏛️", text: "Finds a junior chess club or tournament when you're ready" },
      { icon: "♟️", text: "Plays the odd game with you on a real board" },
      { icon: "🎉", text: "Celebrates effort and reviews, not just wins" },
    ],
    always: [
      "Kid mode stays on in your Lichess account.",
      "Rapid games (10+5 or longer) for training, not bullet.",
      "Shake hands and say 'good game', win or lose.",
      "Tell Mum straight away if anyone online makes you uncomfortable.",
      "Screens off at 20:00.",
    ],
    never: [
      "Share your real name, age, school, city, photos or any contact details online.",
      "Chat, add friends or follow links from strangers on chess sites.",
      "Use an engine or any help during a game. That's cheating, and Lichess bans for it.",
      "Change your password or make a new account without Mum.",
      "Play chess during homeschool time.",
    ],
    askFirst: [
      "Joining a Lichess team, club or tournament.",
      "Playing in any over-the-board tournament (Mum comes with you).",
      "Signing up to any other chess site or app.",
      "Buying a chess book, course or set.",
      "Playing anyone online who has messaged you.",
    ],
  },
};

export default os;
