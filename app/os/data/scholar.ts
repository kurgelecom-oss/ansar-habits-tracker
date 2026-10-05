/* The Study Hall — Strong Across Learning, v1.

   A learner's OS, not a timetable. It teaches Ansar HOW to learn (retrieval,
   spacing, teach-back) and keeps the core tools sharp (maths fluency, reading,
   writing, science thinking, maps and money). It never touches the 08:30–13:30
   homeschool block; it runs in short slots around it.

   The memory methods follow the best-supported findings in learning science:
   retrieval practice (testing yourself) and spaced repetition beat re-reading.

   Benchmarks are v1 STARTING targets for a 12-year-old, not national norms.
   The first honest test sets the baseline; Ansar is compared with Ansar. */

import type { ZoneOS } from "./types";

const os: ZoneOS = {
  id: "scholar",
  name: "Strong Across Learning",
  shortName: "Study Hall",
  icon: "📚",
  accent: "#60a5fa",
  accentSoft: "rgba(96, 165, 250, 0.14)",
  kicker: "ANSAR OS · THE STUDY HALL",
  intro:
    "The Study Hall is where you learn how to learn. Homeschool gives you the lessons; this is your training ground for the skills underneath them: remembering what you study, doing maths fast and accurately, reading with real understanding, writing a paragraph that makes a point, and thinking like a scientist. Short sessions, done most days, beat long ones done once. Every skill has Bronze, Silver and Gold targets so you can see yourself getting sharper month by month.",

  /* ── The week ─────────────────────────────────────────────────────────── */
  week: [
    {
      day: "Monday", theme: "Memory Monday",
      headline: "Start the week by pulling facts OUT of your head, not pushing them in.",
      sessions: [
        { id: "mon-blurt", icon: "🧠", title: "Blurt + Leitner box", start: "14:30", minutes: 30, libraryId: "blurt-sheet",
          what: ["Pick one topic from last week's homeschool", "Blurt everything you remember onto a blank page (8 min)", "Check your notes and fill gaps in a different colour", "Review today's Leitner box cards (10 min)"] },
        { id: "mon-read", icon: "🌙", title: "Bedtime reading", start: "20:15", minutes: 15, libraryId: "reciprocal-reading",
          what: ["Paper book, screens already off", "Read for 12 minutes", "Say one sentence out loud: what happened?"] },
      ],
      tip: "If the blank page feels scary, good. That struggle is exactly what makes the memory stick.",
    },
    {
      day: "Tuesday", theme: "Times-Table Tuesday",
      headline: "Fast facts free up your brain for the hard part of every maths problem.",
      sessions: [
        { id: "tue-tables", icon: "✖️", title: "Tables sprint + mental maths", start: "14:30", minutes: 30, libraryId: "tables-sprint",
          what: ["2-minute mixed tables sprint, score it", "Drill the three facts you missed until they're instant", "10 minutes of mental strategies: split, round and adjust", "Finish with one more 2-minute sprint"] },
        { id: "tue-read", icon: "🌙", title: "Bedtime reading", start: "20:15", minutes: 15, libraryId: "vocab-detective",
          what: ["Read for 12 minutes", "Catch one new word and guess its meaning from the sentence", "Check it in a paper dictionary tomorrow"] },
      ],
      tip: "Speed comes from accuracy. Get them right first, then get them fast.",
    },
    {
      day: "Wednesday", theme: "Write-It Wednesday",
      headline: "One great paragraph is worth more than three messy pages.",
      sessions: [
        { id: "wed-teel", icon: "✍️", title: "TEEL paragraph", start: "14:30", minutes: 30, libraryId: "teel-paragraph",
          what: ["Pick a question from the prompt list (e.g. should kids have pocket money?)", "Plan T-E-E-L in four dot points (5 min)", "Write the paragraph (15 min)", "Edit with the COPS checklist (10 min)"] },
        { id: "wed-read", icon: "🌙", title: "Bedtime reading", start: "20:15", minutes: 15, libraryId: "reciprocal-reading",
          what: ["Read for 12 minutes", "Ask one question the author hasn't answered yet", "Predict what happens next"] },
      ],
      tip: "Club training tonight, so get the paragraph done at 14:30 and enjoy football with a clear head.",
    },
    {
      day: "Thursday", theme: "Think-It Thursday",
      headline: "Word problems and science both start the same way: what is the question really asking?",
      sessions: [
        { id: "thu-word", icon: "🧩", title: "Word problems + check", start: "14:30", minutes: 30, libraryId: "word-problems",
          what: ["Three word problems, draw a bar model for each", "Estimate the answer before calculating", "Check every answer with the inverse operation", "Teach Mum the hardest one in 2 minutes"] },
        { id: "thu-read", icon: "🌙", title: "Bedtime reading", start: "20:15", minutes: 15, libraryId: "reciprocal-reading",
          what: ["Read for 12 minutes", "Summarise the chapter in 20 words or fewer", "Write it on the bookmark card"] },
      ],
      tip: "The answer you estimate first is your alarm bell. If the real answer is miles off, check again.",
    },
    {
      day: "Friday", theme: "Teach-Back Friday",
      headline: "If you can teach it simply, you really know it.",
      sessions: [
        { id: "fri-teach", icon: "🎓", title: "Teach-back + spelling", start: "14:30", minutes: 30, libraryId: "teach-back",
          what: ["Teach Mum one thing you learned this week in 5 minutes, no notes", "Note the parts where you got stuck and look them up", "Spelling: Look, Say, Cover, Write, Check on this week's 10 words", "Quick self-test on all 10"] },
        { id: "fri-read", icon: "🌙", title: "Bedtime reading", start: "20:15", minutes: 15,
          what: ["Free choice: any book you like", "Just enjoy it. No summaries tonight"] },
      ],
      tip: "Getting stuck while teaching is not failing. It shows you exactly what to study next.",
    },
    {
      day: "Saturday", theme: "Lab & Map Saturday",
      headline: "After football, be a scientist or an explorer for 45 minutes.",
      sessions: [
        { id: "sat-lab", icon: "🔬", title: "Fair test lab or map mission", start: "10:30", minutes: 45, libraryId: "fair-test",
          what: ["Alternate weeks: a fair-test experiment, or a map or money mission", "Mum checks the plan before anything starts", "Write it up on one page", "Last Saturday of the month: benchmark tests instead"] },
        { id: "sat-read", icon: "🌙", title: "Bedtime reading", start: "20:15", minutes: 15,
          what: ["Read for 12 minutes", "Tell Mum the best sentence you read this week"] },
      ],
      tip: "Last Saturday of the month is test day. Do the benchmarks honestly and write the scores down.",
    },
    {
      day: "Sunday", theme: "Match Day Rest",
      headline: "Football day. The only study is a story before bed.",
      sessions: [
        { id: "sun-read", icon: "🌙", title: "Bedtime reading", start: "20:15", minutes: 15,
          what: ["Any book you like", "Pick next week's 10 spelling words from your reading and writing"] },
      ],
      tip: "Rest is part of learning. Your brain files away the week while you sleep.",
    },
  ],

  /* ── Library ──────────────────────────────────────────────────────────── */
  library: {
    label: "Skills",
    icon: "📚",
    title: "The Study Skills Library",
    lead: "Sixteen skills that make every subject easier. Each one has a Bronze, Silver and Gold target. Bronze is where you start, Gold is where a strong Year 7 learner lives.",
    categories: ["Memory & study skills", "Maths fluency", "Reading", "Writing", "Science", "Geography & economics"],
    items: [
      /* Memory & study skills */
      {
        id: "blurt-sheet", name: "Blurt Sheet (Retrieval Practice)", category: "Memory & study skills", minutes: 15,
        kit: "Blank A4 paper, two pens of different colours, your notes",
        why: "Testing yourself is one of the strongest study methods scientists have found. Pulling a fact out of your memory makes it stronger; re-reading mostly makes it feel familiar.",
        steps: ["Write the topic at the top of a blank page", "Set a timer for 8 minutes and write EVERYTHING you remember: facts, words, diagrams", "Stop. Open your notes", "Add what you missed or got wrong in the second colour", "Tomorrow, blurt again and see how much less second colour you need"],
        points: ["No peeking during the blurt. The struggle is the workout", "The second colour shows you exactly what to study", "Short and often beats long and once"],
        targets: { bronze: "Blurt for 8 minutes on one topic", silver: "Less than a third of the page in second colour", gold: "Full page from memory, almost no second colour, a week later" },
        watch: "blurting method revision retrieval practice",
      },
      {
        id: "leitner-box", name: "Leitner Box Flashcards", category: "Memory & study skills", minutes: 10,
        kit: "Index cards, a shoebox with 5 dividers (Box 1 to Box 5)",
        why: "Spaced repetition means you review a card just as you are about to forget it. The Leitner box does the timing for you, so easy cards go away and hard cards keep coming back.",
        steps: ["Write a question on the front, the answer on the back. One fact per card", "All new cards start in Box 1", "Get it right: move it up one box. Get it wrong: back to Box 1", "Box 1 every day, Box 2 every 2 days, Box 3 twice a week, Box 4 weekly, Box 5 fortnightly", "Count the cards you reviewed and write it on the box lid"],
        points: ["Say the answer out loud BEFORE you flip", "Be honest: nearly right is wrong", "Make your own cards; making them is half the learning"],
        targets: { bronze: "Box set up, 30 cards, used 4 days a week", silver: "100 cards, 20 in Box 4 or 5", gold: "200+ cards, half of them in Box 4 or 5" },
        watch: "Leitner system flashcards how to use",
      },
      {
        id: "cornell-notes", name: "Cornell Notes", category: "Memory & study skills", minutes: 20,
        kit: "Lined paper, a ruler, a pen",
        why: "Cornell notes turn a page of notes into a ready-made quiz. The question column on the left lets you test yourself later without making new flashcards.",
        steps: ["Rule a line 6 cm from the left edge and another 5 cm from the bottom", "While you read or watch, write notes in the big right section, short phrases only", "After, write a question in the left column next to each chunk of notes", "Write a 2 to 3 sentence summary in the bottom box", "To revise: cover the right side and answer the left-side questions out loud"],
        points: ["Short phrases, not full sentences", "Questions, not headings, in the left column", "The summary must be in your own words"],
        targets: { bronze: "One page with all three sections filled", silver: "Answer 8 of 10 left-column questions with notes covered", gold: "Answer all of them a week later" },
        watch: "Cornell note taking method for students",
      },
      {
        id: "teach-back", name: "Teach-Back", category: "Memory & study skills", minutes: 10,
        kit: "Mum (or a toy, or the wall), a small whiteboard if you have one",
        why: "Explaining something in simple words shows you instantly which parts you really understand and which parts you were just repeating.",
        steps: ["Pick one idea you learned this week", "Explain it out loud in 3 to 5 minutes, no notes, as if to a 9-year-old", "Use one example and one drawing", "Every time you get stuck or use a fancy word you can't explain, write it down", "Look those up, then teach it again"],
        points: ["Simple words only. If you can't say it simply, you don't know it yet", "An example beats a definition", "Getting stuck is the useful bit"],
        targets: { bronze: "Teach for 3 minutes without notes", silver: "5 minutes with one example and one drawing", gold: "Mum can teach it back to you correctly afterwards" },
        watch: "Feynman technique explained for students",
      },

      /* Maths fluency */
      {
        id: "tables-sprint", name: "Times-Table Sprint", category: "Maths fluency", minutes: 10,
        kit: "Printed mixed tables sheet (up to 12 × 12) or a set of tables flashcards, a timer",
        why: "When 7 × 8 is instant, your brain has room for the real problem. Slow tables make fractions, division and algebra feel much harder than they are.",
        steps: ["Two-minute sprint on mixed facts, write answers only", "Mark it and circle every miss", "Make a flashcard for each miss and put it in Box 1", "Drill the misses: say each one 3 times, then test", "One more two-minute sprint to finish"],
        points: ["Skip a hard one and come back; don't freeze", "Know the trick facts: 9s fingers, 11s, 12 = 10 + 2", "Beat your own score, not anyone else's"],
        targets: { bronze: "40 correct in 2 minutes", silver: "60 correct in 2 minutes", gold: "80 correct in 2 minutes, no misses" },
        watch: "times tables strategies for kids 6 7 8 times tables",
      },
      {
        id: "mental-strategies", name: "Mental Maths Strategies", category: "Maths fluency", minutes: 15,
        kit: "A mini whiteboard or scrap paper (for writing answers only)",
        why: "Strong maths thinkers don't do everything in columns. They split numbers, round and adjust, and use doubles. These tricks make you quicker and help you spot wrong answers.",
        steps: ["Split: 46 + 38 = 40 + 30 + 6 + 8", "Round and adjust: 49 × 6 = 50 × 6 − 6", "Double and halve: 25 × 16 = 50 × 8 = 100 × 4", "Bridge through ten: 8 + 7 = 8 + 2 + 5", "Do 10 questions using the strategy of the day, then 10 mixed"],
        points: ["Say which strategy you used before giving the answer", "There's more than one smart way. Pick the easiest one", "Write only the answer, keep the working in your head"],
        targets: { bronze: "12 of 20 correct in 3 minutes", silver: "16 of 20 correct in 3 minutes", gold: "19 of 20 correct in 3 minutes" },
        watch: "mental maths strategies year 6",
      },
      {
        id: "fdp-triangle", name: "Fractions, Decimals, Percentages", category: "Maths fluency", minutes: 15,
        kit: "Paper, a 100-square grid, coloured pencils",
        why: "A half, 0.5 and 50% are the same amount wearing different clothes. Knowing the common ones instantly helps with shopping, sport stats and every test you will ever sit.",
        steps: ["Learn the core set: 1/2, 1/4, 3/4, 1/5, 1/10, 1/3 as decimals and percentages", "Shade them on a 100-square to SEE why 1/4 = 25%", "Convert: fraction to decimal (divide top by bottom), decimal to percent (× 100)", "Order a mixed list: 0.3, 1/4, 35%, 2/5", "Real life: 20% off a $45 item. What do you pay?"],
        points: ["Percent means out of 100", "Turn everything into the same form before comparing", "Estimate first: is the answer more or less than half?"],
        targets: { bronze: "Core set correct from memory", silver: "15 of 20 conversions in 3 minutes", gold: "19 of 20 conversions, plus a discount problem right" },
        watch: "fractions decimals percentages explained year 6",
      },
      {
        id: "word-problems", name: "Word Problems + Checking", category: "Maths fluency", minutes: 20,
        kit: "Paper, pencil, a list of 3 to 5 word problems",
        why: "Most maths mistakes in word problems happen before any calculating: reading too fast or answering the wrong question. A routine and a check catch them.",
        steps: ["Read it twice. Underline the question, circle the numbers", "Draw a bar model or a quick picture", "Estimate the answer with rounded numbers", "Calculate, then write the answer as a sentence with units", "Check with the inverse: if you multiplied, divide back. Does it match your estimate?"],
        points: ["What is the question ACTUALLY asking?", "Units every time: dollars, metres, minutes", "If the check doesn't match, the first answer is wrong, not the check"],
        targets: { bronze: "3 problems with bar models and sentence answers", silver: "4 of 5 right with an estimate and inverse check each", gold: "5 of 5 right, two-step problems included" },
        watch: "bar model method word problems",
      },

      /* Reading */
      {
        id: "reciprocal-reading", name: "Reading Detective (Predict, Question, Clarify, Summarise)", category: "Reading", minutes: 15,
        kit: "A paper book, a bookmark card, a pencil",
        why: "Good readers talk to the book in their head. These four moves turn reading from words going past your eyes into real understanding.",
        steps: ["Predict: before you start, guess what will happen from the title or last chapter", "Question: ask one thing you want answered as you read", "Clarify: if a word or sentence confuses you, re-read it and work it out", "Summarise: at the end, say what happened in 20 words or fewer", "Write the 20-word summary on your bookmark card"],
        points: ["Who, what, where, why: answer them in your summary", "Re-reading a confusing bit is what strong readers do", "Your prediction doesn't need to be right, just reasoned"],
        targets: { bronze: "A 20-word summary for every reading session this week", silver: "Answer 4 of 5 questions on a chapter without looking back", gold: "Explain WHY a character acted the way they did, with evidence from the text" },
        watch: "reciprocal reading predict question clarify summarise",
      },
      {
        id: "vocab-detective", name: "Vocabulary Detective", category: "Reading", minutes: 10,
        kit: "A small notebook (your word book), a paper dictionary",
        why: "The more words you know, the faster you read and the better you write. Most new words come from reading, if you catch them.",
        steps: ["While reading, catch one word you don't fully know", "Guess its meaning from the sentence around it", "Check the dictionary. Was your guess close?", "Write the word, the meaning in your own words, and your own sentence", "Use the word out loud at dinner tonight"],
        points: ["Context clues first, dictionary second", "Your own sentence proves you understand it", "Look for word parts: un-, re-, -able, -tion"],
        targets: { bronze: "3 new words a week in the word book", silver: "5 a week, and you can define last month's words", gold: "Use 3 word-book words correctly in your own writing each week" },
        watch: "context clues vocabulary for kids",
      },

      /* Writing */
      {
        id: "teel-paragraph", name: "TEEL Paragraph", category: "Writing", minutes: 30,
        kit: "Lined paper or a document on your MacBook, a prompt question",
        why: "TEEL is the skeleton of almost every good argument you will write in high school: one clear point, explained and proven.",
        steps: ["T: Topic sentence that answers the question in one line", "E: Explain your point in 1 to 2 sentences", "E: Evidence or an example: a fact, a number, a real story", "L: Link back to the question to finish", "Read it aloud. Does every sentence help the topic sentence?"],
        points: ["One paragraph, one point", "Evidence must be specific: who, what, how many", "Vary how your sentences start"],
        targets: { bronze: "All four TEEL parts present", silver: "Scores 9 of 12 on the paragraph rubric", gold: "Scores 11 of 12, with evidence that really proves the point" },
        watch: "TEEL paragraph structure explained",
      },
      {
        id: "cops-editing", name: "COPS Editing Checklist", category: "Writing", minutes: 10,
        kit: "Your draft, a coloured pen",
        why: "Every writer makes mistakes in a first draft, even professionals. Editing with a checklist means you find them before your reader does.",
        steps: ["C: Capitals at the start of sentences and for names", "O: Organisation. Does it flow? Is each paragraph about one thing?", "P: Punctuation. Full stops, commas, question marks, apostrophes", "S: Spelling. Circle any word you're unsure of and check it", "Read it aloud once more. Your ear catches what your eye misses"],
        points: ["One letter of COPS at a time, not all at once", "Reading aloud slowly finds missing words", "Fix it in colour so you can see your edits"],
        targets: { bronze: "Do all four COPS checks on every piece", silver: "Find and fix at least 3 errors yourself before Mum reads it", gold: "Mum finds no more than 1 error after your edit" },
        watch: "COPS editing strategy for students",
      },
      {
        id: "spelling-lscwc", name: "Look, Say, Cover, Write, Check", category: "Writing", minutes: 10,
        kit: "This week's 10 words, paper, a folded flap to cover with",
        why: "Spelling sticks when you retrieve the word from memory, not when you copy it. This routine makes you remember it, then proves it.",
        steps: ["Look at the word. Notice the tricky part and underline it", "Say it slowly, syllable by syllable", "Cover it", "Write it from memory", "Check letter by letter. If wrong, start again with that word"],
        points: ["Find the tricky bit: is it a double letter, a silent letter?", "Group words by pattern: -tion, -ough, -ible", "Pick words from your own writing mistakes"],
        targets: { bronze: "12 of 20 in the monthly test", silver: "16 of 20", gold: "19 of 20, including words from earlier months" },
        watch: "look say cover write check spelling strategy",
      },

      /* Science */
      {
        id: "fair-test", name: "Fair Test Lab + Write-Up", category: "Science", minutes: 45,
        kit: "Household items Mum approves (paper planes, ice cubes, seeds, balls), a ruler, a timer, a write-up sheet",
        why: "A fair test changes ONE thing and keeps everything else the same, so you know what caused the result. It's how real scientists find out what is true.",
        steps: ["Question: e.g. does the length of a paper plane's wings change how far it flies?", "Variables: the ONE thing you change, the thing you measure, and everything you keep the same", "Predict what will happen and why", "Run it at least 3 times for each setting and record results in a table", "Write up: question, prediction, method, results table, graph, conclusion"],
        points: ["Change only one thing", "Three repeats, then take the average", "The conclusion must match your data, even if your prediction was wrong"],
        targets: { bronze: "A test with one clear variable and a results table", silver: "3 repeats, an average, and a bar or line graph", gold: "A full write-up that explains a result you didn't expect" },
        watch: "fair test science experiment variables for kids",
      },

      /* Geography & economics */
      {
        id: "map-skills", name: "Map Skills", category: "Geography & economics", minutes: 20,
        kit: "A printed street map of your suburb or Melway-style map, a ruler, an atlas",
        why: "Maps are how you understand where things are and how far apart they are. Grid references, compass directions and scale are the three tools that unlock any map.",
        steps: ["Compass: find north and give directions using N, S, E, W and NE, SW", "Grid references: find a place using letters across and numbers up", "Scale: measure with a ruler and convert to real distance", "Plan a route from home to a park or the library and write the directions", "Atlas challenge: find 5 countries, their capitals and which continent they're on"],
        points: ["Along the corridor, then up the stairs", "Check the scale before guessing distances", "Use landmarks in your directions"],
        targets: { bronze: "Read compass directions and grid references correctly", silver: "Plan a route with distance worked out from the scale", gold: "Give clear directions someone else can follow without help" },
        watch: "map skills grid references and scale for kids",
      },
      {
        id: "money-brain", name: "Money Brain: Needs, Wants and Budgets", category: "Geography & economics", minutes: 25,
        kit: "Paper, a calculator, a real supermarket receipt or catalogue",
        why: "Economics is about making smart choices when you can't have everything. Knowing needs from wants, making a budget, and how supply and demand change prices is a skill for life.",
        steps: ["Sort 15 items into needs (food, shelter, clothing) and wants", "Budget: you have $50 for a family picnic. Plan it from a catalogue and stay under", "Supply and demand: why do strawberries cost less in summer? Why do new release games cost more?", "Read a real receipt: total, GST, the most expensive item", "Write 3 sentences on what you learned"],
        points: ["A need keeps you safe and healthy; a want is nice to have", "A budget is a plan before you spend, not a record after", "More supply usually means lower prices; more demand usually means higher prices"],
        targets: { bronze: "Sort needs and wants and explain 3 choices", silver: "A $50 budget that adds up exactly and stays under", gold: "Explain one real price change using supply and demand" },
        watch: "needs and wants supply and demand explained for kids",
      },
    ],
  },

  /* ── Programmes ───────────────────────────────────────────────────────── */
  programmes: [
    {
      id: "memory-engine", icon: "🧠", label: "Memory Engine", kicker: "PROGRAMME 1",
      title: "The Memory Engine",
      intro: "A system that makes what you learn in homeschool stay learned. Three tools: blurting, the Leitner box, and teaching it back. Ten minutes most days keeps the engine running.",
      rules: ["Test yourself before you re-read anything", "Every mistake becomes a flashcard", "Box 1 every day; the box tells you the rest", "One teach-back every Friday"],
      blocks: [
        { name: "Daily", when: "14:30 slot, first 10 minutes", items: [
          { name: "Leitner box review", dose: "Box 1 + whatever is due, ~10 min", cue: "Say it before you flip" },
          { name: "New cards", dose: "3 to 5 from today's mistakes", cue: "One fact per card" },
        ] },
        { name: "Twice a week", when: "Monday and Thursday", items: [
          { name: "Blurt sheet", dose: "8 min blurt + 5 min fix", cue: "Second colour shows the gaps" },
          { name: "Cornell question check", dose: "Cover notes, answer 10 questions", cue: "Out loud, not in your head" },
        ] },
        { name: "Weekly", when: "Friday 14:30", items: [
          { name: "Teach-back", dose: "5 min to Mum, no notes", cue: "If you can't say it simply, look it up" },
          { name: "Card count", dose: "Write total reviewed on the lid", cue: "Watch the number grow" },
        ] },
      ],
      redFlags: ["You feel sick, tearful or panicky about tests for more than a few days", "Headaches or sore eyes during reading or writing", "You study a lot but remember almost nothing, week after week", "The box has grown so big that daily review takes more than 20 minutes"],
    },
    {
      id: "maths-ladder", icon: "🔢", label: "Maths Ladder", kicker: "PROGRAMME 2",
      title: "The Maths Fluency Ladder",
      intro: "Climb from fast facts to confident problem solving. Each rung builds on the one below, so don't skip ahead. When you hit Silver on a rung twice in a row, step up.",
      rules: ["Accuracy first, then speed", "Estimate before you calculate", "Check every answer with the inverse", "Missed facts go straight into the Leitner box"],
      blocks: [
        { name: "Rung 1: Facts", when: "Tuesday + any spare 5 minutes", items: [
          { name: "Mixed tables sprint", dose: "2 min × 2", cue: "Skip and come back, never freeze" },
          { name: "Missed-fact drill", dose: "3 facts, 3 times each", cue: "Say the whole fact, not just the answer" },
        ] },
        { name: "Rung 2: Mental strategies", when: "Tuesday, after the sprint", items: [
          { name: "Strategy of the day", dose: "10 questions", cue: "Name the strategy out loud" },
          { name: "Mixed mental sprint", dose: "20 questions in 3 min", cue: "Answers only on paper" },
        ] },
        { name: "Rung 3: FDP + problems", when: "Thursday", items: [
          { name: "Conversions", dose: "20 in 3 min", cue: "Same form before comparing" },
          { name: "Word problems", dose: "3 to 5 with bar models", cue: "Underline the question" },
          { name: "Inverse check", dose: "Every answer", cue: "Does it match the estimate?" },
        ] },
      ],
      redFlags: ["Maths makes you so upset you can't continue, more than once in a week", "You keep mixing up the same numbers or reversing digits even when going slowly", "You can't see the worksheet clearly or have to squint", "Your scores drop for three weeks in a row"],
    },
    {
      id: "read-write-daily", icon: "📖", label: "Read & Write", kicker: "PROGRAMME 3",
      title: "Read & Write Daily",
      intro: "Strong readers become strong writers. Fifteen minutes of real book reading every night, one proper paragraph a week, and ten spelling words that come from your own mistakes.",
      rules: ["Paper book at 20:15, after screens off", "One new word caught every reading session", "One TEEL paragraph every Wednesday", "COPS check before anyone else reads your writing"],
      blocks: [
        { name: "Every night", when: "20:15, 15 minutes", items: [
          { name: "Reading", dose: "12 min", cue: "Read the way you'd tell the story" },
          { name: "Quick summary or question", dose: "1 to 3 min", cue: "20 words or fewer" },
        ] },
        { name: "Weekly writing", when: "Wednesday 14:30", items: [
          { name: "TEEL paragraph", dose: "1 paragraph, 30 min", cue: "One paragraph, one point" },
          { name: "COPS edit", dose: "10 min", cue: "One letter at a time" },
        ] },
        { name: "Weekly spelling", when: "Sunday pick, Friday test", items: [
          { name: "Choose 10 words", dose: "From your own writing and reading", cue: "Find the tricky bit" },
          { name: "Look, Say, Cover, Write, Check", dose: "10 min", cue: "From memory, not copying" },
        ] },
      ],
      redFlags: ["Letters or words seem to move, blur or swap on the page", "Reading gives you headaches or tired, sore eyes", "You avoid reading aloud because it feels very hard, much harder than for others your age", "You understand stories when they're read to you but not when you read them yourself"],
    },
  ],

  /* ── Experts ──────────────────────────────────────────────────────────── */
  experts: {
    title: "What a great teacher is really looking for",
    lead: "Teachers don't just mark answers. They watch how you learn. These are the habits that make a teacher say: this kid is going to go far.",
    corners: [
      { icon: "🔁", name: "Learning habits", lookFor: ["Tests himself instead of just re-reading", "Comes back to old topics, not just new ones", "Turns mistakes into flashcards", "Starts work without being reminded"] },
      { icon: "🔢", name: "Accuracy", lookFor: ["Estimates before calculating", "Checks answers with the inverse", "Shows working someone else can follow", "Uses units every time"] },
      { icon: "📖", name: "Understanding", lookFor: ["Can explain an idea in his own words", "Asks why, not just what", "Re-reads when something doesn't make sense", "Connects ideas across subjects"] },
      { icon: "✍️", name: "Communication", lookFor: ["Writes one clear point per paragraph", "Backs claims with evidence", "Edits his own work before handing it in", "Speaks clearly when presenting"] },
      { icon: "🦁", name: "Mindset", lookFor: ["Keeps going when it gets hard", "Asks for help after trying, not before", "Treats feedback as useful, not as an insult", "Proud of effort, not just marks"] },
    ],
    redCards: [
      "Re-reading notes and calling it studying",
      "Rushing to finish instead of rushing to understand",
      "Guessing an answer without estimating or checking",
      "Saying I'm just not a maths person",
      "Hiding mistakes instead of learning from them",
    ],
  },

  /* ── Benchmarks ───────────────────────────────────────────────────────── */
  benchmarks: [
    { id: "tables-2min", icon: "✖️", test: "Mixed times tables in 2 minutes", how: "Mixed facts up to 12 × 12 on a printed sheet. Count correct answers only.", unit: "correct", better: "higher", bronze: 40, silver: 60, gold: 80 },
    { id: "tables-grid", icon: "⏱️", test: "12 × 12 grid fill", how: "Fill a blank 12 × 12 multiplication grid. Time in seconds; any mistake adds 5 seconds.", unit: "seconds", better: "lower", bronze: 300, silver: 210, gold: 150 },
    { id: "mental-sprint", icon: "⚡", test: "Mental maths sprint", how: "20 mixed questions (add, subtract, multiply, divide) in 3 minutes. Answers only, no written working.", unit: "/20", better: "higher", bronze: 12, silver: 16, gold: 19 },
    { id: "fdp-convert", icon: "➗", test: "Fraction, decimal, percent conversions", how: "20 conversions in 3 minutes from a printed sheet.", unit: "/20", better: "higher", bronze: 10, silver: 15, gold: 19 },
    { id: "reading-wpm", icon: "📖", test: "Reading speed with comprehension", how: "Read an unseen page aloud for 1 minute; Mum counts correct words. Then answer 5 questions. It only counts if you get 4 or more right.", unit: "words/min", better: "higher", bronze: 110, silver: 130, gold: 150 },
    { id: "spelling-20", icon: "🔤", test: "Monthly spelling test", how: "20 words: 15 from this month's lists, 5 from earlier months. Mum reads them out.", unit: "/20", better: "higher", bronze: 12, silver: 16, gold: 19 },
    { id: "cards-month", icon: "🗂️", test: "Flashcards reviewed this month", how: "Add up the card counts written on the Leitner box lid.", unit: "cards", better: "higher", bronze: 150, silver: 300, gold: 500 },
    { id: "paragraph-score", icon: "✍️", test: "Paragraph quality score", how: "Mum scores one TEEL paragraph: Topic, Explain, Evidence, Link and COPS accuracy, using the rubric. Starting target, not a school standard.", unit: "/12", better: "higher", bronze: 6, silver: 9, gold: 11 },
    { id: "blurt-recall", icon: "🧠", test: "One-week recall", how: "Blurt a topic you studied a week ago for 8 minutes. Mum picks 10 key facts from your notes; count how many you wrote.", unit: "/10", better: "higher", bronze: 5, silver: 7, gold: 9 },
  ],

  /* ── Ladder ───────────────────────────────────────────────────────────── */
  ladder: [
    { icon: "🌱", name: "Starter", what: "Blurting, Leitner box and nightly reading are part of your week", when: "First month" },
    { icon: "🥉", name: "Steady learner", what: "Bronze on every benchmark; the routines happen without reminders", when: "End of Term 1" },
    { icon: "🥈", name: "Sharp learner", what: "Silver on most benchmarks; you can teach back any topic from the last month", when: "Mid-year" },
    { icon: "🥇", name: "Independent learner", what: "Gold on at least half the benchmarks; you plan your own revision for a topic", when: "End of the year" },
    { icon: "🎓", name: "Ready for Year 7 and beyond", what: "You study the right way on your own, write a clear argument and handle multi-step maths with checks", when: "Start of high school" },
  ],
  ladderNote: "These are starting targets for a 12-year-old, set before your first test. After your first honest test day, Mum re-sets them so Silver is hard but possible this month. You are compared with your own last score, never with anyone else.",

  /* ── Season ───────────────────────────────────────────────────────────── */
  season: {
    goals: [
      { icon: "🧠", goal: "Make study stick", measure: "One-week recall at 7 out of 10 or better" },
      { icon: "🔢", goal: "Fast, accurate maths", measure: "Silver on the tables sprint and mental maths sprint" },
      { icon: "✍️", goal: "Read deeply, write clearly", measure: "Paragraph score 9 out of 12 and reading at 130 words a minute with comprehension" },
    ],
    phases: [
      { icon: "🧱", name: "Foundations", months: "January to March", aim: "Set up the Leitner box, blurting and nightly reading. Lock in times tables." },
      { icon: "🔨", name: "Build", months: "April to June", aim: "Mental strategies, fractions, decimals and percentages, and the TEEL paragraph." },
      { icon: "🚀", name: "Stretch", months: "July to September", aim: "Multi-step word problems, fair-test write-ups, and maps and money." },
      { icon: "🏁", name: "Show & Prepare", months: "October to December", aim: "Teach back the year, beat your own benchmarks, and get ready for Year 7." },
    ],
    phaseForMonth: ["Foundations", "Foundations", "Foundations", "Build", "Build", "Build", "Stretch", "Stretch", "Stretch", "Show & Prepare", "Show & Prepare", "Show & Prepare"],
    months: [
      { month: "January", focus: "Build your Leitner box and start nightly reading", libraryId: "leitner-box" },
      { month: "February", focus: "Times tables to instant recall", libraryId: "tables-sprint" },
      { month: "March", focus: "Blurt sheets after every big homeschool topic", libraryId: "blurt-sheet" },
      { month: "April", focus: "Mental maths: split, round and adjust, double and halve", libraryId: "mental-strategies" },
      { month: "May", focus: "Fractions, decimals and percentages", libraryId: "fdp-triangle" },
      { month: "June", focus: "TEEL paragraphs every week", libraryId: "teel-paragraph" },
      { month: "July", focus: "Word problems with bar models and checks", libraryId: "word-problems" },
      { month: "August", focus: "Fair tests and science write-ups", libraryId: "fair-test" },
      { month: "September", focus: "Maps, needs, wants and budgets", libraryId: "money-brain" },
      { month: "October", focus: "Cornell notes for longer topics", libraryId: "cornell-notes" },
      { month: "November", focus: "Teach back the whole year, one topic a week", libraryId: "teach-back" },
      { month: "December", focus: "Editing like a pro, then a well-earned rest", libraryId: "cops-editing" },
    ],
  },

  /* ── Heroes ───────────────────────────────────────────────────────────── */
  heroes: {
    title: "Great minds who learned the hard way",
    lead: "None of these people found learning easy all the time. They had setbacks, missing chances and hard teachers. What they did next is what made them great.",
    people: [
      {
        id: "al-khwarizmi", name: "Muhammad ibn Musa al-Khwarizmi", emoji: "🧮", country: "Persia (Khwarazm, Central Asia)", known: "Father of algebra · House of Wisdom, Baghdad", born: "c. 780 · Khwarazm, Central Asia", colour: "#f59e0b",
        tagline: "The scholar whose name gave us the word algorithm and whose book gave us algebra.",
        childhood: "Very little is known about his childhood. His name tells us his family came from Khwarazm, a region south of the Aral Sea in what is now Uzbekistan and Turkmenistan. As a grown man he worked in Baghdad at the House of Wisdom, a great centre of learning where scholars translated and studied books from Greece, Persia and India.",
        hardship: ["There were no algebra symbols like x or = in his time. He had to write every equation out in words.", "Ideas were spread across languages and books from different countries, so a scholar had to gather and compare them.", "Ordinary people needed help with practical problems like dividing inheritances, trade and measuring land, and there was no simple method for them."],
        overcame: ["He wrote a book about solving equations step by step. Part of its title, al-jabr, became the word algebra.", "He explained the Hindu-Arabic number system, with place value and zero, which helped spread it to the Muslim world and later to Europe.", "When his work was translated into Latin, his name became algoritmi, which gave us the word algorithm.", "He made his methods practical, using real problems people actually had."],
        lesson: "A clear method, written step by step, can be used by anyone. That's what an algorithm is.",
        challenge: "Write your own step-by-step method for one type of maths problem this week, so clearly that Mum can follow it.",
      },
      {
        id: "ibn-al-haytham", name: "Ibn al-Haytham", emoji: "💡", country: "Iraq / Egypt", known: "Book of Optics · pioneer of the experimental method", born: "c. 965 · Basra, Iraq", colour: "#facc15",
        tagline: "The scientist who said: don't just believe it, test it.",
        childhood: "Ibn al-Haytham grew up in Basra, in what is now Iraq, and studied religion, mathematics and the books of the great Greek thinkers. He later moved to Cairo in Egypt, where he did his most famous work.",
        hardship: ["According to the old accounts, he promised the ruler of Egypt, al-Hakim, that he could control the flooding of the Nile. When he travelled to see the river, he realised it was impossible.", "The story goes that, afraid of the ruler's anger, he pretended to be unwell in the mind and was kept confined at home for years.", "Many famous scholars before him had wrong ideas about how we see, and few people questioned them."],
        overcame: ["He used that long time to study and write. His Book of Optics changed science.", "He showed that we see because light travels into our eyes, not because our eyes send out rays as some earlier thinkers believed.", "He tested ideas with careful experiments, including light passing through a small hole into a dark room, the camera obscura.", "He argued that a scientist should question even famous authors and check things for himself."],
        lesson: "Don't believe something just because someone important said it. Test it fairly and see.",
        challenge: "Run one fair test this Saturday where you predict the result, then let the data prove you right or wrong.",
      },
      {
        id: "mirzakhani", name: "Maryam Mirzakhani", emoji: "🌀", country: "Iran", known: "First woman to win the Fields Medal (2014)", born: "1977 · Tehran, Iran", colour: "#a78bfa",
        tagline: "She lost confidence in maths at school, then became one of the best mathematicians in the world.",
        childhood: "Maryam grew up in Tehran. As a girl she loved reading novels and dreamed of becoming a writer. She went to a school for talented girls in Tehran.",
        hardship: ["In her first year of middle school she did badly in maths, and her teacher didn't think she was talented. Her confidence dropped.", "She wasn't especially interested in maths at first; books and stories were her love.", "Later in life she faced cancer, and she died in 2017 at just 40."],
        overcame: ["The next year a different teacher encouraged her, and her confidence and results grew.", "She and a friend pushed their school to give them the same olympiad maths classes that boys' schools had.", "She won gold medals at the International Mathematical Olympiad in 1994 and 1995, with a perfect score in 1995.", "She worked slowly and deeply, drawing her ideas on huge sheets of paper, and in 2014 became the first woman to win the Fields Medal."],
        lesson: "One bad year in a subject says nothing about how good you can become. The right effort and support change everything.",
        challenge: "Pick the subject you feel weakest in. Do 10 extra minutes on it on three days this week and notice what changes.",
      },
      {
        id: "katherine-johnson", name: "Katherine Johnson", emoji: "🚀", country: "United States", known: "NASA mathematician · Friendship 7 and Apollo 11", born: "1918 · White Sulphur Springs, West Virginia, USA", colour: "#38bdf8",
        tagline: "She counted everything as a child, and later her numbers helped send astronauts into space.",
        childhood: "Katherine loved numbers so much as a child that she counted everything: the steps to the road, the steps to church, the dishes she washed. She was so quick that she skipped ahead several grades.",
        hardship: ["She was African American, and her county did not offer high school for Black children.", "Her family had to move to another town, Institute, during the school year so she could keep studying.", "At NASA's earlier agency she worked in a segregated unit, and women were often left out of important meetings."],
        overcame: ["She started high school at about 10 and finished university at 18 with top marks in maths.", "At work she kept asking questions and asked to attend the briefings, until she was included.", "In 1962 astronaut John Glenn asked for her to check the electronic computer's orbit calculations by hand before his flight.", "She later worked on calculations for the Apollo 11 Moon landing, and in 2015 received the Presidential Medal of Freedom."],
        lesson: "Accuracy and asking good questions earn trust. People came to Katherine because her numbers were right.",
        challenge: "Check every maths answer this week with the inverse operation, the way Katherine double-checked the computer.",
      },
      {
        id: "terence-tao", name: "Terence Tao", emoji: "♾️", country: "Australia", known: "Fields Medal (2006) · UCLA mathematician", born: "1975 · Adelaide, South Australia", colour: "#34d399",
        tagline: "An Aussie kid who became one of the world's best mathematicians, and says hard work matters more than genius.",
        childhood: "Terence grew up in Adelaide. He was fascinated by maths from a very young age and was doing university-level maths while still a child, studying at high school and university at the same time.",
        hardship: ["Being far ahead in maths meant he was much younger than the other students in his classes.", "His parents had to balance pushing his maths with letting him grow up as a normal kid with friends his own age.", "At the International Mathematical Olympiad he didn't win gold straight away. He won bronze, then silver, before gold."],
        overcame: ["He won bronze at 10, silver at 11, and gold at 12, still the youngest gold medallist ever.", "He completed his PhD at Princeton University in the United States at 21.", "He won the Fields Medal in 2006, one of the highest honours in mathematics.", "He has written publicly that you don't need to be a genius to do maths; steady hard work and learning from others matter more."],
        lesson: "Even a famous genius improved one step at a time: bronze, then silver, then gold.",
        challenge: "Look at your benchmark scores. Pick one where you're on Bronze and plan exactly how you'll reach Silver.",
      },
      {
        id: "ramanujan", name: "Srinivasa Ramanujan", emoji: "📓", country: "India", known: "Self-taught genius · Fellow of the Royal Society", born: "1887 · Erode, Tamil Nadu, India", colour: "#fb7185",
        tagline: "A poor, mostly self-taught boy whose notebooks amazed the best mathematicians in England.",
        childhood: "Ramanujan grew up in a poor family in Kumbakonam, in South India. As a teenager he got hold of a book listing thousands of maths results, and he worked through it on his own, filling notebooks with his own discoveries.",
        hardship: ["He loved maths so much that he neglected his other subjects, failed exams and lost his college scholarship.", "With no degree, he struggled to find work and had very little money.", "In England he fell seriously ill, far from home. He went back to India and died in 1920 at just 32."],
        overcame: ["He took a job as a clerk and kept doing maths in every spare moment.", "In 1913 he wrote to the Cambridge mathematician G. H. Hardy, sending pages of his results. Hardy saw his genius and invited him to Cambridge.", "Working with Hardy, he published important papers and in 1918 was elected a Fellow of the Royal Society.", "His notebooks are still being studied by mathematicians today."],
        lesson: "Passion is powerful, but neglecting your other subjects cost Ramanujan years. Be strong across all your learning.",
        challenge: "Keep a maths notebook this week. Write down one pattern you notice each day, however small.",
      },
    ],
  },

  /* ── Watch ────────────────────────────────────────────────────────────── */
  watch: {
    lead: "Videos can teach you a lot, if you watch the right ones in the right way. Watch with a notebook, pause to think, and always do something with what you learned. All watching happens before 20:00, on your MacBook, with Mum's OK.",
    worthIt: [
      { icon: "👨‍🏫", title: "Eddie Woo (Wootube)", why: "An award-winning Sydney maths teacher who explains ideas clearly and makes them exciting.", how: "Pick a topic you're learning; pause before each answer and try it yourself first." },
      { icon: "🎓", title: "Khan Academy", why: "Free, step-by-step lessons in maths, science and more, with practice questions.", how: "Watch one short video, then do the practice. Never watch three in a row without practising." },
      { icon: "🔢", title: "Numberphile", why: "Mathematicians showing surprising patterns with numbers. Great for loving maths, not just doing it.", how: "Try the puzzle on paper before the answer is shown." },
      { icon: "🧪", title: "Crash Course Kids", why: "Short, clear science and engineering explanations at the right level.", how: "Write 3 facts on a Cornell page afterwards." },
      { icon: "💭", title: "TED-Ed", why: "Animated lessons on science, history and big ideas, many with thinking questions.", how: "Teach the idea back to Mum after watching." },
      { icon: "🌏", title: "BBC Bitesize", why: "Clear short lessons on maths, English, science and geography, many aimed at ages 11 and 12.", how: "Use it to check a topic you found hard this week." },
    ],
    zeroValue: [
      { icon: "📱", title: "Study with me streams and study vlogs", why: "Watching someone else study is not studying. It feels productive but nothing goes into your memory." },
      { icon: "⏩", title: "Speed-watching lessons on 2× with no notes", why: "It feels like learning but you won't remember it tomorrow. Retrieval is what makes it stick." },
      { icon: "🤯", title: "Get smart quick and memory hack clickbait", why: "There is no shortcut. The real methods, testing and spacing, take effort, and that's why they work." },
      { icon: "🎮", title: "Autoplay rabbit holes", why: "One good video turns into ten random ones. Choose what you'll watch before you open the site." },
    ],
    rules: [
      "Choose the video before you open the site, and close it when it ends",
      "Notebook open, pen in hand",
      "Do something after every video: practise, blurt or teach it back",
      "No comments sections and no chatting with strangers online",
      "Screens off at 20:00. Bedtime reading is always a paper book",
    ],
  },

  /* ── Family ───────────────────────────────────────────────────────────── */
  family: {
    role: [
      { icon: "🎧", text: "Listener for Friday teach-backs" },
      { icon: "📝", text: "Marks the monthly benchmarks on the last Saturday" },
      { icon: "✅", text: "Approves every science experiment before it starts" },
      { icon: "🔤", text: "Reads out the spelling test" },
      { icon: "📊", text: "Re-sets the targets after the first test day" },
      { icon: "💬", text: "Asks: what did you learn today that surprised you?" },
    ],
    always: [
      "Praise the effort and the method, not just the score",
      "Let him struggle for a few minutes before helping. That's where learning happens",
      "Keep sessions short: stop on time, even when it's going well",
      "Ask him to explain his thinking, even when the answer is right",
      "Keep screens off from 20:00 so bedtime reading is a paper book",
    ],
    never: [
      "Compare his scores with other children's",
      "Use extra study as a punishment",
      "Schedule Study Hall inside homeschool hours",
      "Let a bad test day turn into a bad week. One score is just information",
    ],
    askFirst: [
      "Any experiment with heat, water near electrics, sharp tools, or kitchen chemicals",
      "Any new website, app or online tool",
      "Going outside to map or survey the neighbourhood",
      "Changing a benchmark target or the weekly routine",
    ],
  },
};

export default os;
