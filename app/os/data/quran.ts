/* ════════════════════════════════════════════════════════════════════════════
   ZONE OS — Qur'an & Surat Al-Kahf.

   Deliberately conservative. No Arabic verse text and no English translations
   of verses are quoted anywhere in this file. Themes are described plainly;
   meanings, rulings and exact tajweed counts are left to Ansar's teacher
   ("ask your teacher"). Story ayah ranges are the commonly taught ones and are
   marked "about". Heroes keep to widely taught facts from the traditional
   biographies; where a birth year is not reliably recorded it says so.
   ══════════════════════════════════════════════════════════════════════════ */

import type { ZoneOS } from "./types";

const os: ZoneOS = {
  id: "quran",
  name: "Qur'an & Surat Al-Kahf",
  shortName: "Qur'an",
  icon: "☪️",
  accent: "#34d399",
  accentSoft: "rgba(52, 211, 153, 0.14)",
  kicker: "ANSAR OS · THE QUR'AN JOURNEY",
  intro:
    "This is your Qur'an journey, built around one surah: Surat Al-Kahf, surah 18, with 110 ayat. You will learn to recite with good manners and clean letters, learn the core tajweed rules one at a time, memorise Al-Kahf in small chunks you can actually keep, and revise so nothing slips away. Al-Kahf holds four famous stories, each about a different test in life: faith, wealth, knowledge and power. Each week you take one small lesson and try to live it. Fifteen minutes in the morning, fifteen in the evening, and Al-Kahf every Friday. Slow and steady beats fast and forgotten. For meanings and rulings, always ask your teacher.",

  /* ── The week ─────────────────────────────────────────────────────────── */
  week: [
    {
      day: "Monday",
      theme: "New Ayat Monday",
      headline: "Start the week with a fresh chunk and a clean evening revision.",
      sessions: [
        { id: "mon-new", icon: "🌅", title: "New memorisation", start: "07:10", minutes: 15, what: ["Listen to this week's 2 new ayat 3 times with one reciter", "Read them 5 times looking at the mushaf", "Recite them 3 times with eyes closed", "Mark any tricky word in pencil"], libraryId: "chunk-repeat" },
        { id: "mon-rev", icon: "🌙", title: "Evening revision", start: "19:15", minutes: 15, what: ["Recite this morning's ayat from memory", "Recite the last 7 days of new ayat (recent)", "One slip? Fix it, then say the ayah 3 times clean"], libraryId: "revision-cycle" },
      ],
      tip: "Club training tonight. Do the morning chunk properly so the evening is just a quick check.",
    },
    {
      day: "Tuesday",
      theme: "Tajweed Tuesday",
      headline: "Add today's ayat, then hunt one tajweed rule on the page.",
      sessions: [
        { id: "tue-new", icon: "🌅", title: "New memorisation + link", start: "07:10", minutes: 15, what: ["Listen, read and recite today's 2 ayat", "Link them to yesterday's: say the last ayah of yesterday into the first of today", "Recite all of this week's ayat once"], libraryId: "link-ayat" },
        { id: "tue-rev", icon: "🌙", title: "Revision + rule hunt", start: "19:15", minutes: 15, what: ["Recite recent ayat from memory", "Open the page you are memorising and find every example of this week's rule", "Read those words aloud slowly with the rule"], libraryId: "noon-izhar" },
      ],
      tip: "A rule you spot on your own page sticks far better than one you read about.",
    },
    {
      day: "Wednesday",
      theme: "Clean Letters Wednesday",
      headline: "Memorise, then polish one group of letters until they sound right.",
      sessions: [
        { id: "wed-new", icon: "🌅", title: "New memorisation", start: "07:10", minutes: 15, what: ["Today's 2 ayat: listen 3, read 5, recite 3", "Recite Monday to Wednesday's ayat joined together", "Say one tricky word 5 times slowly"], libraryId: "chunk-repeat" },
        { id: "wed-rev", icon: "🌙", title: "Makharij polish", start: "19:15", minutes: 15, what: ["5 min: one group of letters from the makharij map", "10 min: old revision, one older chunk from memory"], libraryId: "makharij-map" },
      ],
      tip: "Club training again. If you are tired after, keep the evening to 10 calm minutes. Calm and correct beats long and sloppy.",
    },
    {
      day: "Thursday",
      theme: "Link-Up Thursday",
      headline: "Join the whole week into one smooth piece.",
      sessions: [
        { id: "thu-new", icon: "🌅", title: "New memorisation + full link", start: "07:10", minutes: 15, what: ["Today's 2 ayat: listen, read, recite", "Recite the whole week's new ayat in one go", "Recite it once to Mum, holding the mushaf open for her to follow"], libraryId: "link-ayat" },
        { id: "thu-rev", icon: "🌙", title: "Old revision", start: "19:15", minutes: 15, what: ["Recite one older chunk from memory (old)", "Recite recent ayat once", "Get ready for Friday: put your mushaf somewhere you will see it"], libraryId: "revision-cycle" },
      ],
      tip: "Tomorrow is Friday, the day for Al-Kahf. Know where your mushaf is tonight.",
    },
    {
      day: "Friday",
      theme: "Al-Kahf Friday",
      headline: "Friday is Al-Kahf day: read the whole surah and choose this week's lesson.",
      sessions: [
        { id: "fri-review", icon: "🌅", title: "Week check", start: "07:10", minutes: 15, what: ["No new ayat today", "Recite this week's new ayat from memory, start to finish", "Note any ayah that still wobbles for Saturday"], libraryId: "revision-cycle" },
        { id: "fri-kahf", icon: "📖", title: "Read Surat Al-Kahf", start: "17:00", minutes: 30, what: ["Make wudu and sit somewhere quiet", "Read the whole surah from the mushaf, at a steady pace", "Too long today? Split it: half now, half after the next prayer", "Pick one lesson from the story you are memorising and write it in one line"], libraryId: "friday-kahf" },
      ],
      tip: "Many families read Al-Kahf on Friday as a well-known practice. Ask your teacher what timing they teach.",
    },
    {
      day: "Saturday",
      theme: "Strengthen Saturday",
      headline: "Fix the wobbles from the week so new ayat sit on solid ground.",
      sessions: [
        { id: "sat-fix", icon: "🔧", title: "Wobble fixing", start: "07:10", minutes: 15, what: ["Take the ayah that wobbled most this week", "Listen 3 times, read 5, recite 5 with eyes closed", "Recite the whole week twice clean"], libraryId: "listen-reciter" },
        { id: "sat-rev", icon: "🌙", title: "Old revision", start: "19:15", minutes: 15, what: ["Recite an older chunk from memory", "On test Saturdays (last Saturday of the month): do the benchmark tests instead"], libraryId: "revision-cycle" },
      ],
      tip: "Football Push this morning, so keep the Qur'an session calm and before you head out.",
    },
    {
      day: "Sunday",
      theme: "Live It Sunday",
      headline: "Light recitation and one lesson to carry into the new week.",
      sessions: [
        { id: "sun-listen", icon: "🎧", title: "Listening only", start: "07:10", minutes: 10, what: ["Listen to next week's new ayat 3 times with one reciter", "Follow along in the mushaf with your finger", "No pressure to memorise yet"], libraryId: "listen-reciter" },
        { id: "sun-lesson", icon: "🌱", title: "Lesson of the week + du'a", start: "19:15", minutes: 15, what: ["Talk with Mum about the story you are in and its theme", "Choose one small action for the week", "Make du'a in your own words for help to remember and to act"], libraryId: "story-lesson" },
      ],
      tip: "Match day. The morning is just listening, so it is short and easy.",
    },
  ],

  /* ── Library ──────────────────────────────────────────────────────────── */
  library: {
    label: "Skills",
    icon: "📖",
    title: "The Qur'an skills library",
    lead: "Sixteen skill cards: adab, letters, the core tajweed rules, how to memorise, how to revise, and how to understand and live Al-Kahf. Each card has Bronze, Silver and Gold targets. These are starting targets for you, not rules from a madrasa. Your teacher always has the final word on how something is recited.",
    categories: ["Adab", "Makharij", "Tajweed", "Memorisation", "Revision", "Understanding"],
    items: [
      {
        id: "adab-recitation", name: "Adab of Recitation", category: "Adab", minutes: 5, kit: "Mushaf, wudu, a clean quiet spot",
        why: "Adab means good manners. How you come to the Qur'an shapes how much it stays with you. A calm, respectful start makes the whole session better.",
        steps: ["Make wudu before touching the mushaf", "Sit somewhere clean and quiet, facing the qiblah if you can", "Hold the mushaf with care and never put it on the floor", "Begin with the ta'awwudh and the basmalah, the way your teacher taught you", "Recite at a calm pace, not rushing to finish", "Close the mushaf and put it back on a high, clean shelf"],
        points: ["Slow and clear beats fast and messy", "No phone, no TV, no snacks while reciting", "If you yawn, pause and wait, then carry on", "Finish with a short du'a in your own words"],
        targets: { bronze: "Wudu and a calm start every session this week", silver: "Every session starts properly and has no distractions", gold: "A whole month of proper starts, without Mum reminding you" },
        watch: "etiquette of reciting the Quran for kids",
      },
      {
        id: "makharij-map", name: "The Makharij Map", category: "Makharij", minutes: 10, kit: "Mushaf or letter chart, a mirror",
        why: "Makharij are the places in your mouth and throat where each letter comes from. Get the place right and the letter sounds right. This is the base of all tajweed.",
        steps: ["Learn the five main areas: the open space of the mouth and throat (al-jawf), the throat (al-halq), the tongue (al-lisan), the lips (ash-shafatan) and the nose (al-khayshum)", "Pick one area for the week", "Say each letter from that area with a sukun after an alif, slowly", "Check in the mirror: what is your tongue or lips doing?", "Compare with a teaching reciter and copy them"],
        points: ["One area per week, not all at once", "Say the letter, not the letter's name", "Throat letters come from three depths: deep, middle and near the mouth", "Ask your teacher to check the letters that are new to English speakers"],
        targets: { bronze: "Name the 5 areas from memory", silver: "Say every letter of one area cleanly with a sukun", gold: "Say every letter of all 5 areas cleanly, checked by your teacher" },
        watch: "makharij al huroof lesson for beginners",
      },
      {
        id: "heavy-light", name: "Heavy and Light Letters", category: "Makharij", minutes: 8, kit: "Mushaf or letter chart",
        why: "Some Arabic letters are always heavy (full mouth) and some are light. Mixing them up changes how the word sounds. English speakers often make heavy letters too light.",
        steps: ["Learn the seven always-heavy letters, often taught with the memory phrase 'khuss daghtin qiz'", "Say each heavy letter: the back of the tongue lifts and the mouth feels full", "Pair it with a light letter that sounds close and say both, back and forth", "Find heavy letters on the page you are memorising"],
        points: ["Heavy does not mean louder, it means fuller", "Keep the light letters light, especially next to heavy ones", "Some letters change between heavy and light depending on the vowels around them: ask your teacher"],
        targets: { bronze: "List the 7 heavy letters", silver: "Say 5 heavy and light pairs and Mum can hear the difference", gold: "Read a full page with every heavy letter clearly heavy" },
        watch: "tafkheem and tarqeeq heavy and light letters tajweed",
      },
      {
        id: "noon-izhar", name: "Noon Sakinah Rule 1: Izhar", category: "Tajweed", minutes: 10, kit: "Mushaf, coloured pencil, rule flashcards",
        why: "Noon sakinah (a noon with a sukun) and tanween follow four rules depending on the next letter. Izhar is the first: say the noon clearly. It happens before the six throat letters.",
        steps: ["Learn the six throat letters, from deep to near: hamzah, haa, 'ayn, haa (the sharp one), ghayn and khaa", "When a noon sakinah or tanween comes before one of them, say the noon clearly with no extra nasal sound", "Find 5 examples on your page and mark them lightly in pencil", "Read each example slowly, then at normal speed"],
        points: ["Clear means clear: no humming", "Spot the next letter before you reach the noon", "Tanween sounds like a hidden noon, so the same rules apply"],
        targets: { bronze: "Name the 6 izhar letters", silver: "Find 5 izhar examples on your page", gold: "Read every izhar on a page correctly, teacher-checked" },
        watch: "izhar noon sakinah tanween tajweed lesson",
      },
      {
        id: "noon-idgham", name: "Noon Sakinah Rule 2: Idgham", category: "Tajweed", minutes: 10, kit: "Mushaf, coloured pencil",
        why: "Idgham means merging. The noon sakinah or tanween blends into the next letter. Its six letters are often taught with the memory word 'yarmaloon'.",
        steps: ["Learn the six letters: yaa, raa, meem, laam, waw and noon", "With ghunnah (a nasal sound) before four of them: yaa, noon, meem and waw", "Without ghunnah before two of them: laam and raa", "Find examples of both kinds on your page", "Read them along with a teaching reciter and copy the merge"],
        points: ["Idgham happens across two words", "There are special cases inside a single word: ask your teacher", "Listen for the hum on the 'with ghunnah' ones"],
        targets: { bronze: "Say the 6 idgham letters and which 2 have no ghunnah", silver: "Find 3 with-ghunnah and 2 without-ghunnah examples", gold: "Read every idgham on a page correctly, teacher-checked" },
        watch: "idgham with ghunnah and without ghunnah tajweed",
      },
      {
        id: "noon-iqlab", name: "Noon Sakinah Rule 3: Iqlab", category: "Tajweed", minutes: 6, kit: "Mushaf",
        why: "Iqlab means changing. Before the letter baa, the noon sakinah or tanween turns into a soft meem sound with ghunnah. Many mushafs mark it with a small meem.",
        steps: ["Learn the one letter: baa", "Look for the small meem sign above or below the noon or tanween in your mushaf", "Close your lips gently and make the meem sound with ghunnah", "Then say the baa"],
        points: ["Lips close softly, not pressed hard", "Hold the ghunnah, don't rush through it", "It is the easiest rule to spot, so get it right every time"],
        targets: { bronze: "Say what iqlab is and its one letter", silver: "Find 3 iqlab examples in Al-Kahf", gold: "Every iqlab correct across a full page" },
        watch: "iqlab tajweed rule explained",
      },
      {
        id: "noon-ikhfa", name: "Noon Sakinah Rule 4: Ikhfa", category: "Tajweed", minutes: 10, kit: "Mushaf, coloured pencil",
        why: "Ikhfa means hiding. Before the remaining fifteen letters, the noon is half-hidden: not fully clear and not fully merged, with ghunnah. It is the most common rule on most pages.",
        steps: ["Learn that ikhfa letters are every letter not used by izhar, idgham or iqlab (15 in all)", "Start the noon sound with the tongue not touching the top of the mouth, getting ready for the next letter", "Hold the nasal hum, then say the next letter", "Find 5 examples and read them with a teaching reciter"],
        points: ["The mouth gets ready for the NEXT letter", "Heavy next letter: fuller ikhfa. Light next letter: lighter ikhfa", "Your teacher will show you how long they hold the ghunnah"],
        targets: { bronze: "Say all 4 noon sakinah rules and one letter for each", silver: "Sort 20 flashcard examples into the 4 rules with 16 right", gold: "Read a full page with every noon sakinah rule correct" },
        watch: "ikhfa noon sakinah tajweed for beginners",
      },
      {
        id: "meem-sakinah", name: "Meem Sakinah Rules", category: "Tajweed", minutes: 8, kit: "Mushaf",
        why: "A meem with a sukun has three rules of its own. They use your lips, so they are easy to feel and check.",
        steps: ["Ikhfa shafawi: before baa, the meem is hidden with ghunnah", "Idgham shafawi: before another meem, they merge with ghunnah", "Izhar shafawi: before every other letter, say the meem clearly", "Be extra careful to keep it clear before faa and waw", "Find one example of each on your page"],
        points: ["Shafawi means 'of the lips'", "Lips close softly for the hidden and merged kinds", "Keep a clear meem quick and clean"],
        targets: { bronze: "Name the 3 meem sakinah rules", silver: "Find one example of each in Al-Kahf", gold: "Every meem sakinah correct across a page" },
        watch: "meem sakinah rules ikhfa shafawi idgham shafawi izhar shafawi",
      },
      {
        id: "qalqalah", name: "Qalqalah: The Echo", category: "Tajweed", minutes: 6, kit: "Mushaf",
        why: "Five letters bounce with a small echo when they have a sukun. They are often taught with the memory phrase 'qutbu jad'. Without the echo, these letters can sound swallowed.",
        steps: ["Learn the 5 letters: qaaf, taa (the heavy one), baa, jeem and daal", "When one has a sukun, let it bounce with a short echo", "In the middle of a word: a small bounce. When you stop on it at the end: a bigger bounce", "Find qalqalah letters on your page, especially at the ends of ayat"],
        points: ["A bounce, not an extra vowel: don't add 'uh'", "Stronger when you stop on it", "Many ayat of Al-Kahf end on qalqalah letters, so listen for them"],
        targets: { bronze: "Name the 5 qalqalah letters", silver: "Bounce each one cleanly with a sukun", gold: "Every qalqalah right on a page, including the stops" },
        watch: "qalqalah letters tajweed for kids",
      },
      {
        id: "madd-basics", name: "Madd Basics: Stretching", category: "Tajweed", minutes: 8, kit: "Mushaf",
        why: "Madd means stretching a vowel sound. Getting the length steady makes your recitation sound calm and correct.",
        steps: ["Learn the three madd letters: alif, waw and yaa when they make a long vowel", "Natural madd: stretch for 2 counts, about the time of two finger bends", "Notice the wavy madd sign in your mushaf: it means a longer stretch", "Ask your teacher how many counts they want for the longer madds, then keep to it every time", "Read a line tapping the counts on the table"],
        points: ["Same length every time is more important than very long", "Don't stretch letters that don't have a madd", "Breath control helps: take a good breath before long ayat"],
        targets: { bronze: "Steady 2-count natural madd on one line", silver: "Natural and longer madds steady across half a page", gold: "Every madd on a page at your teacher's counts" },
        watch: "madd tabee natural madd tajweed beginners",
      },
      {
        id: "chunk-repeat", name: "Chunk and Repeat", category: "Memorisation", minutes: 15, kit: "Mushaf, one reciter's audio, pencil",
        why: "Small chunks, many repeats. This is how most huffaz memorise: a little every day, said correctly many times, so it sticks for good.",
        steps: ["Choose today's chunk: usually 2 ayat, or 1 if they are long", "Listen 3 times, finger following the words", "Read it 5 times looking at the mushaf", "Recite it 3 times with your eyes closed", "If you slip, look, fix it, then do 3 clean ones", "Recite it once more just before bed"],
        points: ["Correct from day one: a mistake memorised is hard to fix later", "Same mushaf every time: your eyes remember where words sit on the page", "Short sessions every day beat one long one a week"],
        targets: { bronze: "2 ayat a day, 4 days this week", silver: "8 new ayat this week, all recited clean on Friday", gold: "4 weeks in a row of 8 to 10 clean new ayat" },
        watch: "how to memorize quran fast and never forget for kids",
      },
      {
        id: "link-ayat", name: "Linking Ayat", category: "Memorisation", minutes: 10, kit: "Mushaf",
        why: "Lots of people know each ayah on its own but freeze between them. Linking trains the jump from the end of one ayah to the start of the next.",
        steps: ["Recite yesterday's last ayah and keep going straight into today's first", "Do the joining point 5 times on its own", "Recite the whole week's ayat together", "Once a week, recite your whole memorised part without stopping"],
        points: ["Practise the joins on purpose: they are where mistakes hide", "Learn the first word of each ayah really well", "If you get stuck, look at one word only, then carry on"],
        targets: { bronze: "This week's ayat joined with 1 look", silver: "This week's ayat joined with no looks", gold: "Everything you know so far, joined with no looks" },
        watch: "quran memorization linking verses technique",
      },
      {
        id: "listen-reciter", name: "Listening to One Reciter", category: "Memorisation", minutes: 10, kit: "Audio of one reciter, chosen with Mum, headphones",
        why: "Listening plants the sound in your ear before you memorise. Sticking to one reciter means one rhythm and one way of reading to copy.",
        steps: ["Choose one reciter with your teacher or Mum (teaching recitations, like the slow 'muallim' style, are great for learners)", "Listen to the next chunk before you memorise it", "Follow every word in the mushaf with your finger", "Listen again in quiet moments: in the car, while tidying up"],
        points: ["One reciter for the whole surah", "Listen and follow along, not just in the background", "Use a saved audio file or app Mum set up, so you are not scrolling video sites"],
        targets: { bronze: "Listen to every new chunk before you memorise it", silver: "Listen to every new chunk 3 times, following along", gold: "Can tell where the reciter does each tajweed rule" },
        watch: "Mahmoud Khalil Al Husary muallim surah al kahf",
      },
      {
        id: "revision-cycle", name: "The Revision Cycle", category: "Revision", minutes: 15, kit: "Mushaf, revision log",
        why: "Memorising is easy. Keeping it is the real work. A three-part cycle (new, recent, old) protects everything you have learned. Many teachers call these sabaq, sabqi and manzil.",
        steps: ["NEW: today's chunk, recited many times", "RECENT: the last 7 days of new ayat, every day", "OLD: everything older, split into pieces so you go through all of it every 1 to 2 weeks", "Write each day in your revision log: what you revised and any slips", "The ayah that slipped goes back into tomorrow's new pile"],
        points: ["Never skip revision for new: if time is short, do revision", "Recite old parts to someone else at least once a week", "A slip is information, not failure"],
        targets: { bronze: "Revised 15 days this month", silver: "Revised 22 days, and all old parts covered", gold: "Revised 28 days, with fewer than 3 slips in old parts" },
        watch: "sabaq sabqi manzil quran revision method",
      },
      {
        id: "friday-kahf", name: "Friday Al-Kahf Reading", category: "Revision", minutes: 30, kit: "Mushaf, wudu",
        why: "Reading Surat Al-Kahf on Friday is a well-known practice taught by many scholars. For you it is also a weekly read-through of the surah you are memorising.",
        steps: ["Make wudu and sit somewhere quiet", "Read the whole surah from the mushaf, all 110 ayat", "Recite the parts you have memorised from memory, then open the mushaf for the rest", "If 30 minutes is too long, split it into two sittings on the same day", "Afterwards, write one line: which story stood out today?"],
        points: ["Steady pace with tajweed, not a race", "Ask your teacher what timing they teach for the Friday reading", "Over the year you will hear the whole surah about 50 times"],
        targets: { bronze: "Read Al-Kahf on 2 Fridays this month", silver: "Every Friday this month", gold: "Every Friday, with your memorised part done without looking" },
        watch: "surah al kahf full recitation slow for learners",
      },
      {
        id: "story-lesson", name: "The Four Stories and One Lesson a Week", category: "Understanding", minutes: 15, kit: "A notebook, Mum or your teacher",
        why: "Al-Kahf is easier to memorise and much more meaningful when you know the shape of it. Its four famous stories are often taught as four tests: faith, wealth, knowledge and power.",
        steps: ["The People of the Cave (about ayat 9 to 26): young people who held on to their faith. Theme: protecting your faith", "The owner of the two gardens (about ayat 32 to 44): a man proud of his wealth. Theme: being grateful, not proud", "Musa and Al-Khidr (about ayat 60 to 82): a journey to learn. Theme: humility and patience when seeking knowledge", "Dhul-Qarnayn (about ayat 83 to 98): a powerful ruler who helped people. Theme: using strength to serve", "Each week, pick one small action from the story you are memorising, and live it"],
        points: ["Ask your teacher for meanings and lessons: don't guess at tafsir", "One small action you actually do beats a big plan", "Retell each story in your own words to Mum"],
        targets: { bronze: "Name the 4 stories in order", silver: "Retell 2 stories in your own words with their rough ayah ranges", gold: "Retell all 4, and live one lesson each week for a month" },
        watch: "four stories of surah al kahf explained for kids",
      },
    ],
  },

  /* ── Programmes ───────────────────────────────────────────────────────── */
  programmes: [
    {
      id: "hifz-al-kahf",
      icon: "🧠",
      label: "Hifz of Al-Kahf",
      kicker: "PROGRAMME 1 · ABOUT 11 MONTHS",
      title: "Memorise Surat Al-Kahf, all 110 ayat",
      intro: "A realistic pace for a 12-year-old with a busy week: about 2 ayat a day, 4 days a week, with Fridays to review and weekends to fix. That is around 8 to 10 new ayat a week, so the whole surah in roughly 11 to 12 months, with time to spare for long ayat and harder weeks. Many teachers recommend starting with the first ten ayat.",
      rules: [
        "New ayat only Monday to Thursday. Friday, Saturday and Sunday are for reading, fixing and listening.",
        "Long ayat count double: on those days, memorise just one.",
        "If revision is slipping, stop new ayat for a week and fix it. Keeping beats racing.",
        "Recite your new week to Mum or your teacher every Thursday or Friday.",
        "During Ramadan or a sick week, switch to revision only. That is still progress.",
      ],
      blocks: [
        {
          name: "Stage 1: The first ten",
          when: "Weeks 1 to 2",
          items: [
            { name: "Ayat 1 to 10", dose: "1 to 2 ayat a day", cue: "Listen 3, read 5, recite 3. Correct from day one." },
            { name: "Linking", dose: "5 min a day", cue: "Join every new ayah to the one before it." },
          ],
        },
        {
          name: "Stage 2: The People of the Cave",
          when: "About weeks 3 to 5",
          items: [
            { name: "Ayat 11 to 26", dose: "8 to 10 ayat a week", cue: "Know the story first, then the words fall into place." },
            { name: "Recent revision", dose: "Every evening", cue: "The last 7 days, from memory." },
          ],
        },
        {
          name: "Stage 3: The gardens and the middle",
          when: "About weeks 6 to 12",
          items: [
            { name: "Ayat 27 to 59", dose: "8 to 10 ayat a week", cue: "Ayat 32 to 44 are the two gardens. Picture the scene as you recite." },
            { name: "Old revision", dose: "2 to 3 evenings a week", cue: "Ayat 1 to 26 split into 3 pieces." },
          ],
        },
        {
          name: "Stage 4: Musa and Al-Khidr",
          when: "About weeks 13 to 20",
          items: [
            { name: "Ayat 60 to 82", dose: "6 to 8 ayat a week", cue: "Some ayat here are long. One a day is fine." },
            { name: "Joining test", dose: "Every Friday", cue: "Recite from ayah 1 to where you are, no looking." },
          ],
        },
        {
          name: "Stage 5: Dhul-Qarnayn and the close",
          when: "About weeks 21 to 30, then a buffer",
          items: [
            { name: "Ayat 83 to 110", dose: "8 to 10 ayat a week", cue: "Ayat 83 to 98 are Dhul-Qarnayn. The final ayat close the surah." },
            { name: "Full recitation", dose: "Once to your teacher", cue: "All 110 ayat. Then keep it alive with revision." },
          ],
        },
      ],
      redFlags: [
        "You feel scared or upset about making mistakes. Stop and tell Mum.",
        "Your voice hurts or goes croaky after reciting. Rest your voice and tell Mum.",
        "You are getting headaches or can't focus in long sessions. Make them shorter and tell Mum.",
        "Revision keeps slipping three weeks in a row. Tell Mum so you can slow the pace together.",
      ],
    },
    {
      id: "tajweed-foundations",
      icon: "🎙️",
      label: "Tajweed Foundations",
      kicker: "PROGRAMME 2 · 12 WEEKS",
      title: "Tajweed foundations: one rule at a time",
      intro: "Twelve weeks, one focus each week, always practised on the page of Al-Kahf you are memorising. By the end you will know the makharij map, the heavy letters, all the noon and meem sakinah rules, qalqalah and basic madd, and you will be able to spot them on any page. Your teacher checks and corrects; this programme just gives you the order.",
      rules: [
        "One rule per week. Don't add a new one until you can spot the last one.",
        "Practise rules on your Al-Kahf page, not random pages.",
        "Use the rule names your teacher uses. Some teachers explain things a little differently, and that is normal.",
        "Counts and special cases: ask your teacher.",
      ],
      blocks: [
        {
          name: "Weeks 1 to 3: Letters",
          when: "Wednesday evenings plus 2 min daily",
          items: [
            { name: "Makharij map", dose: "One area a week", cue: "Five areas, letter with a sukun, check in the mirror." },
            { name: "Heavy and light letters", dose: "5 min, 3 times a week", cue: "Full mouth for the 7 heavy letters." },
          ],
        },
        {
          name: "Weeks 4 to 7: Noon sakinah and tanween",
          when: "Tuesday rule hunt",
          items: [
            { name: "Izhar", dose: "Week 4", cue: "Six throat letters: say it clear." },
            { name: "Idgham", dose: "Week 5", cue: "Six letters, four with ghunnah, two without." },
            { name: "Iqlab", dose: "Week 6", cue: "Before baa, it becomes meem with ghunnah." },
            { name: "Ikhfa", dose: "Week 7", cue: "Fifteen letters: half-hidden with a hum." },
          ],
        },
        {
          name: "Weeks 8 to 10: Meem, qalqalah and madd",
          when: "Tuesday rule hunt",
          items: [
            { name: "Meem sakinah", dose: "Week 8", cue: "Three rules, all with the lips." },
            { name: "Qalqalah", dose: "Week 9", cue: "Five letters bounce on a sukun." },
            { name: "Madd basics", dose: "Week 10", cue: "Two steady counts; longer ones at your teacher's count." },
          ],
        },
        {
          name: "Weeks 11 to 12: Put it together",
          when: "Any evening slot",
          items: [
            { name: "Rule-spotting page", dose: "Twice a week", cue: "Mark every rule you can find on one page." },
            { name: "Teacher check", dose: "Once", cue: "Read one page to your teacher and write down their corrections." },
          ],
        },
      ],
      redFlags: [
        "Your throat feels sore from practising throat letters. Stop, drink water and tell Mum.",
        "An online video says something different from your teacher. Don't worry: ask your teacher.",
        "You feel embarrassed to recite in front of others. Tell Mum, and you can start with just her.",
      ],
    },
    {
      id: "revision-engine",
      icon: "🔁",
      label: "Revision Engine",
      kicker: "PROGRAMME 3 · ALWAYS ON",
      title: "The revision engine: new, recent, old",
      intro: "The engine that keeps everything you memorise. It runs every day alongside hifz and never stops, even after you finish Al-Kahf. Three gears: new (today's ayat), recent (the last week) and old (everything else, rotated).",
      rules: [
        "Revision comes before new. On a short day, revise and skip new.",
        "Every day: new plus recent. Most days: one piece of old.",
        "Write it in the log: date, what you revised, slips.",
        "Once a week, recite to a listener: Mum or your teacher.",
        "Every Friday, the Al-Kahf reading counts as a full read-through.",
      ],
      blocks: [
        {
          name: "Daily",
          when: "19:15 evening slot",
          items: [
            { name: "New", dose: "Today's ayat, 3 times", cue: "From memory, before bed." },
            { name: "Recent", dose: "Last 7 days, once", cue: "From memory, look only to fix." },
            { name: "Old", dose: "One piece, about 5 to 8 ayat", cue: "Rotate so every piece comes round every 1 to 2 weeks." },
          ],
        },
        {
          name: "Weekly",
          when: "Thursday or Friday",
          items: [
            { name: "Recite to a listener", dose: "The week's new ayat", cue: "Mum follows in the mushaf and marks slips." },
            { name: "Friday Al-Kahf", dose: "Whole surah", cue: "Memorised parts from memory, the rest from the mushaf." },
          ],
        },
        {
          name: "Monthly",
          when: "Last Saturday of the month",
          items: [
            { name: "Benchmark tests", dose: "About 30 min", cue: "Ayat count, mistakes per page, rules spotted, days revised." },
            { name: "Fix list", dose: "Top 3 weak ayat", cue: "They go into next week's new pile." },
          ],
        },
      ],
      redFlags: [
        "You are skipping revision to get more new ayat done. Tell Mum and slow down.",
        "Revision makes you anxious or you dread it. Talk to Mum: it should feel calm.",
        "You have missed a whole week. Tell Mum, then restart with recent only. No guilt.",
      ],
    },
  ],

  /* ── Experts ──────────────────────────────────────────────────────────── */
  experts: {
    title: "What a Qur'an teacher is really looking for",
    lead: "A good teacher is not just counting how much you know. They are listening for these five things, and they notice the small ones.",
    corners: [
      { icon: "🤲", name: "Adab", lookFor: ["Arrives with wudu and a ready mushaf", "Sits still and listens when corrected", "Recites calmly, not rushing to be finished", "Respects the mushaf: never on the floor, put away properly"] },
      { icon: "👄", name: "Clean letters", lookFor: ["Throat letters clear and from the right depth", "Heavy letters full, light letters light", "No English-style letters swapped in", "Clear vowels, not mumbled"] },
      { icon: "🎼", name: "Tajweed", lookFor: ["Noon and meem sakinah rules done without thinking", "Qalqalah bounces, especially when stopping", "Madd lengths steady and consistent", "Stops at sensible places"] },
      { icon: "🧠", name: "Strong hifz", lookFor: ["Smooth joins between ayat", "Old parts as strong as new ones", "Self-corrects quickly without panicking", "Honest about which parts are weak"] },
      { icon: "🌱", name: "Understanding and character", lookFor: ["Knows the story and theme of what they recite", "Asks about meanings instead of guessing", "Tries to live what they learn", "Makes du'a and stays humble"] },
    ],
    redCards: [
      "Racing through to finish quickly",
      "Memorising new ayat while old ones fall apart",
      "Memorising mistakes because you didn't check against the mushaf",
      "Switching between lots of reciters",
      "Learning tajweed from random videos instead of your teacher",
      "Showing off how much you know",
      "Reciting with no wudu, or while distracted by a screen",
    ],
  },

  /* ── Benchmarks ───────────────────────────────────────────────────────── */
  benchmarks: [
    { id: "ayat-memorised", icon: "🧠", test: "Ayat of Al-Kahf memorised", how: "Recite from ayah 1 to as far as you know it, to Mum following in the mushaf. Count the ayat you recite with no more than one look. Starting target; reset each month.", unit: "ayat (0 to 110)", better: "higher", bronze: 10, silver: 26, gold: 44 },
    { id: "page-mistakes", icon: "📄", test: "Mistakes on a one-page recitation", how: "Recite one memorised page. Mum marks any wrong word, missed word or clear tajweed slip.", unit: "mistakes", better: "lower", bronze: 8, silver: 4, gold: 1 },
    { id: "rules-spotted", icon: "🔍", test: "Tajweed rules spotted on a page", how: "Take a fresh page of Al-Kahf and a pencil. 10 minutes: mark and name every rule you can find. Mum checks them with an answer key from your teacher if possible.", unit: "correct rules", better: "higher", bronze: 10, silver: 20, gold: 30 },
    { id: "days-revised", icon: "📅", test: "Days revised this month", how: "Count the days in your revision log with a revision session.", unit: "days", better: "higher", bronze: 15, silver: 22, gold: 28 },
    { id: "rule-flashcards", icon: "🃏", test: "Noon and meem sakinah flashcards", how: "Mum shows 20 example cards. Name the rule for each.", unit: "right out of 20", better: "higher", bronze: 12, silver: 16, gold: 20 },
    { id: "joins", icon: "🔗", test: "Joins without a look", how: "Mum says the last word of an ayah you know; you continue into the next one. 10 tries.", unit: "right out of 10", better: "higher", bronze: 5, silver: 8, gold: 10 },
    { id: "friday-reads", icon: "📖", test: "Friday Al-Kahf readings this month", how: "Count the Fridays you read the whole surah.", unit: "Fridays", better: "higher", bronze: 2, silver: 3, gold: 4 },
    { id: "stories-retold", icon: "🗺️", test: "Stories retold in your own words", how: "Tell Mum each of the four stories in your own words with its rough ayah range. No tafsir needed, just the story.", unit: "stories (0 to 4)", better: "higher", bronze: 1, silver: 2, gold: 4 },
  ],

  ladder: [
    { icon: "📗", name: "Reader", what: "Read any page of the mushaf fluently, with clean letters and basic tajweed", when: "Now to the first few months" },
    { icon: "🔟", name: "The First Ten", what: "Ayat 1 to 10 of Al-Kahf memorised and strong", when: "About 2 weeks in" },
    { icon: "🕳️", name: "Cave Keeper", what: "Ayat 1 to 26 memorised, the People of the Cave story retold", when: "About month 2" },
    { icon: "🌳", name: "Half Way", what: "Ayat 1 to 59 memorised and revised in rotation", when: "About month 5 to 6" },
    { icon: "🧭", name: "The Journey", what: "Ayat 1 to 82 memorised, including Musa and Al-Khidr", when: "About month 8 to 9" },
    { icon: "🏔️", name: "Whole Surah", what: "All 110 ayat recited to your teacher, and still strong a month later", when: "About month 11 to 12" },
  ],
  ladderNote: "These are starting targets for a 12-year-old, not rules. Some weeks will be slower, and Ramadan or sick weeks are revision-only. That is fine. After each monthly test, Mum and your teacher reset the targets so Silver is hard but possible. Keeping what you have memorised always matters more than speed.",

  /* ── Season ───────────────────────────────────────────────────────────── */
  season: {
    goals: [
      { icon: "🧠", goal: "Memorise all 110 ayat of Surat Al-Kahf", measure: "Recited in full to your teacher" },
      { icon: "🎙️", goal: "Know the core tajweed rules and use them", measure: "One memorised page with 1 mistake or fewer" },
      { icon: "🌱", goal: "Understand and live the four stories", measure: "Retell all 4 and keep a lesson-of-the-week log" },
    ],
    phases: [
      { icon: "🌱", name: "Foundations", months: "January to February", aim: "Adab, makharij, heavy letters and the first ten ayat" },
      { icon: "🕳️", name: "The Cave", months: "March to April", aim: "People of the Cave memorised and noon sakinah rules learnt" },
      { icon: "🌳", name: "The Gardens", months: "May to June", aim: "Ayat 27 to 59, meem sakinah, qalqalah and madd" },
      { icon: "🧭", name: "The Journey", months: "July to September", aim: "Musa and Al-Khidr memorised, with old revision rotating" },
      { icon: "🏔️", name: "The Wall", months: "October to December", aim: "Dhul-Qarnayn and the close, then the full recitation" },
    ],
    phaseForMonth: ["Foundations", "Foundations", "The Cave", "The Cave", "The Gardens", "The Gardens", "The Journey", "The Journey", "The Journey", "The Wall", "The Wall", "The Wall"],
    months: [
      { month: "January", focus: "Adab and the makharij map. Start ayat 1 to 10.", libraryId: "adab-recitation" },
      { month: "February", focus: "Heavy and light letters. Ayat 1 to 10 strong.", libraryId: "heavy-light" },
      { month: "March", focus: "Izhar and idgham. People of the Cave begins.", libraryId: "noon-izhar" },
      { month: "April", focus: "Iqlab and ikhfa. Finish the cave story to ayah 26.", libraryId: "noon-ikhfa" },
      { month: "May", focus: "Meem sakinah. The two gardens, about ayat 32 to 44.", libraryId: "meem-sakinah" },
      { month: "June", focus: "Qalqalah and madd. Reach ayah 59.", libraryId: "qalqalah" },
      { month: "July", focus: "Set up the full revision engine. Musa and Al-Khidr begins.", libraryId: "revision-cycle" },
      { month: "August", focus: "Linking long ayat. Keep going through the journey.", libraryId: "link-ayat" },
      { month: "September", focus: "Finish Musa and Al-Khidr to ayah 82.", libraryId: "listen-reciter" },
      { month: "October", focus: "Dhul-Qarnayn, about ayat 83 to 98.", libraryId: "chunk-repeat" },
      { month: "November", focus: "The closing ayat, 99 to 110.", libraryId: "madd-basics" },
      { month: "December", focus: "Full recitation to your teacher and retell all four stories.", libraryId: "story-lesson" },
    ],
  },

  /* ── Heroes ───────────────────────────────────────────────────────────── */
  heroes: {
    title: "People of the Qur'an",
    lead: "Companions and scholars whose love for the Qur'an is remembered to this day. These are the widely taught facts as the traditional biographies report them, kept simple. Ask your teacher to tell you more.",
    people: [
      {
        id: "zayd-ibn-thabit", name: "Zayd ibn Thabit", emoji: "✍️", country: "Arabia", known: "Companion · scribe of the revelation", born: "About 611 CE · Madinah (then Yathrib)", colour: "#34d399",
        tagline: "Too young for the army, so he became the Qur'an's scribe.",
        childhood: "As the traditional biographies report, Zayd was a boy of about eleven when the Prophet ﷺ arrived in Madinah. He was quick to learn and had already memorised parts of the Qur'an.",
        hardship: ["His father died when he was young.", "As the biographies report, he wanted to join the Muslims at the Battle of Badr but was sent home for being too young."],
        overcame: ["He put his energy into learning instead, and is reported to have learnt another script quickly when the Prophet ﷺ asked him to.", "He became one of the main scribes who wrote down the revelation.", "Later, as widely taught, the caliph Abu Bakr gave him the huge job of gathering the written Qur'an into one collection."],
        lesson: "Being told 'you are too young' for one thing can open the door to something even greater. Use the time to learn.",
        challenge: "Write out the ayat you memorise this week neatly by hand, like a scribe.",
      },
      {
        id: "ibn-masud", name: "Abdullah ibn Mas'ud", emoji: "🐑", country: "Arabia", known: "Companion · reciter and teacher", born: "Year not recorded · Makkah", colour: "#60a5fa",
        tagline: "A young shepherd who became one of the great teachers of the Qur'an.",
        childhood: "As the traditional biographies report, Abdullah was a poor young shepherd in Makkah, looking after other people's flocks. He was among the early Muslims.",
        hardship: ["He was poor and had no powerful tribe to protect him.", "As the biographies report, he recited the Qur'an aloud in public in Makkah and was beaten for it.", "He was small and thin, and some people laughed at him."],
        overcame: ["He stayed close to the Prophet ﷺ and learnt a great deal of the Qur'an directly from him.", "As widely taught, the Prophet ﷺ named him among four people to learn the Qur'an from.", "He became a teacher of many students."],
        lesson: "Where you start and how you look don't decide your worth. What you carry in your heart does.",
        challenge: "Recite your strongest part to Mum this week with full confidence.",
      },
      {
        id: "ubayy-ibn-kab", name: "Ubayy ibn Ka'b", emoji: "📜", country: "Arabia", known: "Companion · master reciter", born: "Year not recorded · Madinah (then Yathrib)", colour: "#fbbf24",
        tagline: "One of the finest reciters among the companions.",
        childhood: "Ubayy was from Madinah. As the traditional biographies report, he was one of the few people there who could read and write before Islam reached the city.",
        hardship: ["The Qur'an came down over many years, so he had to keep learning, revising and writing for a long time.", "Being known as a top reciter meant people relied on him to get it right."],
        overcame: ["He became one of the scribes of the revelation.", "As widely taught, the Prophet ﷺ named him among the four to learn the Qur'an from.", "He later led people in prayer and taught recitation."],
        lesson: "Skill you already have, like reading, becomes great when you use it for something that matters.",
        challenge: "Learn one tajweed rule so well this week that you could teach it to someone.",
      },
      {
        id: "al-shafii", name: "Imam al-Shafi'i", emoji: "📚", country: "Gaza, then Makkah and beyond", known: "Scholar · founder of a school of law", born: "767 CE · Gaza", colour: "#a78bfa",
        tagline: "An orphan with no money for paper who became one of the great imams.",
        childhood: "As the traditional biographies report, al-Shafi'i's father died when he was a baby, and his mother took him to Makkah. He memorised the Qur'an as a young boy.",
        hardship: ["His family was poor.", "As the biographies report, he could not always afford paper, so he wrote on whatever he could find, such as bones and scraps."],
        overcame: ["He kept learning, memorising and asking questions.", "He travelled to Madinah to study with Imam Malik.", "He became one of the most respected scholars in Islamic history."],
        lesson: "Not having the right gear is never the real problem. Wanting to learn is what counts.",
        challenge: "Do every session this week with just your mushaf. No excuses.",
      },
      {
        id: "al-nawawi", name: "Imam al-Nawawi", emoji: "🕯️", country: "Syria", known: "Scholar · author of a famous book on Qur'an manners", born: "1233 CE · Nawa, Syria", colour: "#f472b6",
        tagline: "The boy who ran from playtime to recite.",
        childhood: "As the traditional biographies report, when Yahya al-Nawawi was a boy in Nawa, other children tried to make him play, but he cried and kept reciting the Qur'an. A scholar noticed and encouraged his father to let him study.",
        hardship: ["He grew up in a small village far from the big centres of learning.", "He lived a very simple life with little money."],
        overcame: ["He moved to Damascus to study and worked very hard.", "He wrote famous books, including one on the manners of carrying the Qur'an that students still read.", "He died young, yet his books are still taught worldwide."],
        lesson: "Protect your Qur'an time, even when something more fun is calling you.",
        challenge: "Do your 07:10 session every weekday this week, before anything else.",
      },
      {
        id: "ibn-al-jazari", name: "Ibn al-Jazari", emoji: "🎼", country: "Syria", known: "Scholar · master of tajweed and the readings", born: "1350 CE · Damascus", colour: "#fb923c",
        tagline: "The scholar who put tajweed into a short poem students still learn.",
        childhood: "As the traditional biographies report, Ibn al-Jazari grew up in Damascus, memorised the Qur'an young and loved learning recitation.",
        hardship: ["Learning the different readings properly meant studying with many teachers.", "As the biographies report, he travelled widely, including to Egypt, to learn from them."],
        overcame: ["He became one of the most important scholars of tajweed and the readings.", "He wrote a short poem of tajweed rules, often called the Muqaddimah, that students around the world still memorise."],
        lesson: "Turn hard things into short things you can remember. Small and clear is powerful.",
        challenge: "Make your own one-line rhyme for one tajweed rule this week.",
      },
    ],
  },

  /* ── Watch ────────────────────────────────────────────────────────────── */
  watch: {
    lead: "Good listening helps your recitation a lot. Watch with Mum, use the search phrases below, and stick to recitation and tajweed teaching. Videos are a helper; your teacher is the authority.",
    worthIt: [
      { icon: "🎧", title: "Your chosen reciter for Al-Kahf", why: "One voice and one rhythm to copy for the whole surah.", how: "Search: \"Mahmoud Khalil Al Husary surah al kahf muallim\" or the reciter your teacher picks" },
      { icon: "👄", title: "Makharij lessons", why: "See where each letter comes from, mouth and throat.", how: "Search: \"makharij al huroof lesson for beginners\"" },
      { icon: "🔤", title: "Noon sakinah and tanween rules", why: "Short, clear lessons for the four rules you practise most.", how: "Search: \"noon sakinah and tanween rules tajweed beginners\"" },
      { icon: "💋", title: "Meem sakinah rules", why: "Three lip rules shown clearly.", how: "Search: \"meem sakinah rules tajweed\"" },
      { icon: "🏀", title: "Qalqalah and madd", why: "Hear the bounce and the stretch done properly.", how: "Search: \"qalqalah and madd tajweed lesson for kids\"" },
      { icon: "🧠", title: "Memorisation methods", why: "How huffaz plan new, recent and old revision.", how: "Search: \"sabaq sabqi manzil quran memorization method\"" },
      { icon: "🗺️", title: "The four stories, for kids", why: "The shape of Al-Kahf before you memorise each story.", how: "Search: \"four stories of surah al kahf for kids\" with Mum, then ask your teacher" },
    ],
    zeroValue: [
      { icon: "🌀", title: "'Secret meaning' and number-code videos", why: "Often made up. Meanings come from your teacher and trusted scholars." },
      { icon: "🗣️", title: "Argument and debate clips", why: "They raise questions without answering them well. Bring questions to your teacher instead." },
      { icon: "📱", title: "Reaction videos and shorts", why: "Lots of scrolling, very little learning." },
      { icon: "🤖", title: "AI-voiced or edited recitations", why: "They can be wrong. Only use real, well-known reciters." },
    ],
    rules: [
      "Watch with Mum, on the MacBook, from saved links or searches she has okayed.",
      "No comments, no chats and no messaging anyone on video sites.",
      "If a video disagrees with your teacher, follow your teacher and ask them about it.",
      "Listening is part of a session, not extra screen time. Close it when the session ends.",
      "Screens off at 20:00, Qur'an videos included.",
    ],
  },

  /* ── Family ───────────────────────────────────────────────────────────── */
  family: {
    role: [
      { icon: "📖", text: "Follows in the mushaf when you recite and marks slips gently" },
      { icon: "🧑‍🏫", text: "Finds and books the teacher, and sits nearby for online lessons" },
      { icon: "🎧", text: "Chooses the reciter and the safe audio with you" },
      { icon: "📅", text: "Runs the monthly tests on the last Saturday" },
      { icon: "🌱", text: "Talks with you about the lesson of the week on Sunday" },
      { icon: "🤲", text: "Makes du'a for you, and with you" },
    ],
    always: [
      "Wudu and a respectful start before reciting",
      "Revision before new ayat",
      "Ask your teacher for meanings, rulings and tajweed questions",
      "Online lessons only with a teacher Mum has booked, in a shared room, with Mum nearby",
      "Tell Mum if anyone online asks you to chat privately, keep a secret or move to another app",
    ],
    never: [
      "Never message or chat with strangers on Qur'an apps or video sites",
      "Never share your name, address, photos or school details online",
      "Never guess at the meaning of an ayah or give rulings to others",
      "Never push through a sore throat or voice: rest it",
      "Never put the mushaf on the floor or in the bathroom",
    ],
    askFirst: [
      "Joining any online class, app or group",
      "Switching to a new reciter or teacher",
      "Changing your memorisation pace",
      "Downloading any Qur'an app or audio",
    ],
  },
};

export default os;
