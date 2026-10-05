/* ════════════════════════════════════════════════════════════════════════════
   LANGUAGES OS — Turkish & Quranic Arabic, v1.

   ORDER MATTERS. Turkish comes FIRST: it is the current language. Quranic
   Arabic comes SECOND and starts properly once the Turkish basics are solid
   (Mum decides when). Until then the Friday Arabic slot is a gentle preview.

   Accuracy: only very common, certainly-correct Turkish words. Arabic is
   letters, harakat, joining and high-frequency Quranic WORDS in
   transliteration with meanings. No verses are quoted. Heroes keep to the
   well-documented record; uncertain dates are left out or marked "century".

   Benchmarks are STARTING targets for a 12-year-old, not norms.
   ══════════════════════════════════════════════════════════════════════════ */

import type { ZoneOS } from "./types";

const os: ZoneOS = {
  id: "languages",
  name: "Turkish & Quranic Arabic",
  shortName: "Languages",
  icon: "🗣️",
  accent: "#fb923c",
  accentSoft: "rgba(251, 146, 60, 0.14)",
  kicker: "ANSAR OS · THE LANGUAGE LAB",
  intro:
    "This is your language lab. Turkish comes first: a little every day, out loud, until you can chat with family without switching to English. Once your Turkish basics are solid, Quranic Arabic joins in: the 28 letters, the little vowel marks, how letters join, and the words you will meet again and again when you read the Qur'an. Short sessions, every day, spoken out loud. Languages are learned with your mouth and ears, not just your eyes.",

  /* ── The week ─────────────────────────────────────────────────────────── */
  week: [
    {
      day: "Monday", theme: "Word Monday", headline: "Ten new Turkish words before breakfast is even cold.",
      sessions: [
        { id: "mon-words", icon: "🌅", title: "Morning Word Drop", start: "07:45", minutes: 10, what: ["Say yesterday's 10 words out loud from memory", "Learn 5 new words from this week's set", "Say each new word in a tiny sentence"], libraryId: "tr-family-home" },
        { id: "mon-shadow", icon: "🎧", title: "Shadowing Session", start: "14:00", minutes: 20, what: ["Play a short Turkish kids' clip (2–3 min)", "Pause after each line and copy it out loud", "Replay the whole clip and speak along with it"], libraryId: "sp-shadowing" },
      ],
      tip: "Say it out loud. A word you only read is a word you will forget.",
    },
    {
      day: "Tuesday", theme: "Grammar Tuesday", headline: "One Turkish ending, learned properly, unlocks hundreds of words.",
      sessions: [
        { id: "tue-numbers", icon: "🔢", title: "Number Sprint", start: "07:45", minutes: 10, what: ["Count 1–20 in Turkish against the clock", "Then the tens: on, yirmi, otuz… up to yüz", "Say your age and today's date out loud"], libraryId: "tr-numbers" },
        { id: "tue-harmony", icon: "🎶", title: "Vowel Harmony Lab", start: "14:00", minutes: 20, what: ["Sort 20 words into -ler or -lar", "Make each one plural out loud", "Write five and check the last vowel"], libraryId: "tr-vowel-harmony" },
      ],
      tip: "Look at the LAST vowel of the word. That one vowel chooses the ending.",
    },
    {
      day: "Wednesday", theme: "Speak-it Wednesday", headline: "Today you say whole sentences, not single words.",
      sessions: [
        { id: "wed-greet", icon: "👋", title: "Manners Warm-up", start: "07:45", minutes: 10, what: ["Greet Mum in Turkish: Günaydın!", "Run the greetings card once out loud", "Use one polite phrase at breakfast for real"], libraryId: "tr-greetings" },
        { id: "wed-order", icon: "🧩", title: "Verb-Last Sentences", start: "14:00", minutes: 20, what: ["Build 10 sentences with the verb at the end", "Say each one out loud three times", "Swap in a new person: ben, sen, biz"], libraryId: "tr-word-order" },
      ],
      tip: "In Turkish the action waits for the end. Say who, then what, then do.",
    },
    {
      day: "Thursday", theme: "Where Thursday", headline: "Evde, okulda, parkta: say where everything is.",
      sessions: [
        { id: "thu-colours", icon: "🎨", title: "Days & Colours", start: "07:45", minutes: 10, what: ["Say the seven days in order, Monday first", "Name the colour of five things around you", "Say what day it is today in Turkish"], libraryId: "tr-days-colours" },
        { id: "thu-where", icon: "📍", title: "In / At Endings", start: "14:00", minutes: 20, what: ["Learn -de / -da and -te / -ta", "Say where 10 things in the house are", "Ask Mum: Top nerede? (Where is the ball?)"], libraryId: "tr-locative" },
      ],
      tip: "The house is your textbook today. Name where things are as you walk past them.",
    },
    {
      day: "Friday", theme: "Letters Friday", headline: "Turkish to start, then a first look at the Arabic letters.",
      sessions: [
        { id: "fri-sounds", icon: "🔤", title: "Turkish Sound Check", start: "07:45", minutes: 10, what: ["Read the alphabet aloud, slowly", "Drill the six special letters: ç ğ ı ö ş ü", "Read five words with them in"], libraryId: "tr-alphabet" },
        { id: "fri-arabic", icon: "✍️", title: "Arabic Letter Preview", start: "14:00", minutes: 20, what: ["Only once Mum says your Turkish basics are solid; until then, do another Shadowing Session", "Learn one shape family, e.g. ba, ta, tha", "Name each letter out loud and trace it with your finger"], libraryId: "ar-letters" },
      ],
      tip: "Turkish first, Arabic second. The Arabic slot grows only when Turkish is steady.",
    },
    {
      day: "Saturday", theme: "Family Table", headline: "Thirty minutes of real Turkish with real family.",
      sessions: [
        { id: "sat-family", icon: "🫖", title: "Family Conversation", start: "11:30", minutes: 30, what: ["Turkish-only for 30 minutes with Mum or anyone in the family who speaks it", "Answer the 10 questions, then ask them back", "Write down 3 new words you heard"], libraryId: "sp-ten-questions" },
      ],
      tip: "Mistakes are the price of the ticket. Keep talking, don't switch to English.",
    },
    {
      day: "Sunday", theme: "Rest & Listen", headline: "Match day. No sessions, just let Turkish play in the background.",
      sessions: [],
      tip: "If there's a Turkish cartoon on the car speaker or at home, listen for words you know. That's it.",
    },
  ],

  /* ── The library ──────────────────────────────────────────────────────── */
  library: {
    label: "Lessons",
    icon: "📚",
    title: "The Language Library",
    lead: "Every card is one small skill with Bronze, Silver and Gold targets. Turkish cards first, Arabic cards second. Master a card, then move on.",
    categories: [
      "Turkish sounds & alphabet",
      "Turkish everyday words",
      "Turkish grammar",
      "Speaking & listening",
      "Arabic letters",
      "Arabic harakat & reading",
      "Quranic words",
    ],
    items: [
      {
        id: "tr-alphabet", name: "The Turkish Alphabet (29 letters)", category: "Turkish sounds & alphabet", minutes: 10, kit: "Alphabet chart, your voice",
        why: "Turkish is written the way it sounds. Learn the 29 letters properly and you can read almost any Turkish word out loud, even ones you don't know yet.",
        steps: [
          "Read the alphabet in order: a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z",
          "Notice there is no q, w or x",
          "Learn the six special letters: ç = 'ch', ş = 'sh', ğ = soft g that stretches the vowel before it, ı = undotted i, ö and ü = rounded-lip vowels",
          "Also remember c = 'j' (as in cami, mosque) and every letter is always said",
          "Read these words: çocuk (child), şeker (sugar), dağ (mountain), kız (girl), göz (eye), üzüm (grapes)",
        ],
        points: ["C is always 'j', never 'k' or 's'", "Make ö and ü with round lips, like you are about to whistle", "ı and i are different letters: kız is not kiz"],
        targets: { bronze: "Read the alphabet aloud in order", silver: "Read 20 new words with no mistakes on ç ş ğ ı ö ü", gold: "Read a short kids' paragraph aloud smoothly" },
        watch: "Turkish alphabet pronunciation for beginners",
      },
      {
        id: "tr-greetings", name: "Greetings & Manners", category: "Turkish everyday words", minutes: 10, kit: "This card, a family member",
        why: "Good manners in Turkish open every door. These are the phrases you will use every single day.",
        steps: [
          "Merhaba (hello) · Günaydın (good morning) · İyi geceler (good night)",
          "Nasılsın? (how are you?) → İyiyim, teşekkürler (I'm good, thanks)",
          "Lütfen (please) · Teşekkür ederim (thank you) · Evet (yes) · Hayır (no)",
          "Hoş geldin (welcome) → Hoş bulduk (said back when you arrive)",
          "Afiyet olsun (enjoy your meal) · Görüşürüz (see you)",
        ],
        points: ["Use one phrase for real today, not just in practice", "Hoş geldin always gets Hoş bulduk back", "Smile, it helps the sounds come out relaxed"],
        targets: { bronze: "Say all 12 phrases with the card", silver: "Say them all from memory", gold: "Use five of them naturally at home in one day" },
        watch: "basic Turkish greetings for kids",
      },
      {
        id: "tr-numbers", name: "Numbers 1 to 100", category: "Turkish everyday words", minutes: 10, kit: "A timer, a dice or two",
        why: "Numbers come up all day: ages, times, prices, scores. Turkish numbers are very regular, so a few words build them all.",
        steps: [
          "1–10: bir, iki, üç, dört, beş, altı, yedi, sekiz, dokuz, on",
          "Tens: on, yirmi, otuz, kırk, elli, altmış, yetmiş, seksen, doksan, yüz (100)",
          "Build the rest by joining: on bir (11), yirmi beş (25), kırk iki (42)",
          "Roll two dice, add them, say the total in Turkish",
          "Say your age: On iki yaşındayım (I am 12 years old)",
        ],
        points: ["Ten then one: on bir, never bir on", "Watch the ı in altı, kırk and altmış", "Speed comes after accuracy"],
        targets: { bronze: "Count 1–20 with no mistakes", silver: "Say any number to 100 that Mum calls out", gold: "Count 1–20 in under 12 seconds, clean" },
        watch: "Turkish numbers 1 to 100 pronunciation",
      },
      {
        id: "tr-family-home", name: "Family & Home Words", category: "Turkish everyday words", minutes: 10, kit: "Sticky notes, a pen",
        why: "The words for the people and things around you are the ones you will use most. Label your world and you see them 50 times a day.",
        steps: [
          "Family: anne (mum), baba (dad), kardeş (brother or sister), abla (older sister), abi (older brother), dede (grandpa)",
          "Grandmas: anneanne (mum's mum), babaanne (dad's mum)",
          "Home: ev (house), oda (room), kapı (door), masa (table), mutfak (kitchen), bahçe (garden)",
          "Things: su (water), ekmek (bread), kitap (book), kalem (pen), top (ball), araba (car)",
          "Stick a label on five real things and say the word every time you pass",
        ],
        points: ["Say the word, then touch the thing", "Add 'benim' for 'my': benim odam (my room)", "Five new words a day beats 50 on Sunday"],
        targets: { bronze: "25 words from memory", silver: "50 words from memory", gold: "Name everything in the kitchen in Turkish" },
        watch: "Turkish family words for beginners",
      },
      {
        id: "tr-days-colours", name: "Days & Colours", category: "Turkish everyday words", minutes: 10, kit: "Coloured pencils or objects",
        why: "Days help you plan and talk about your week. Colours help you describe anything you can see.",
        steps: [
          "Days: Pazartesi (Mon), Salı (Tue), Çarşamba (Wed), Perşembe (Thu), Cuma (Fri), Cumartesi (Sat), Pazar (Sun)",
          "Notice Cumartesi is built on Cuma, and Pazartesi on Pazar",
          "Colours: kırmızı (red), mavi (blue), yeşil (green), sarı (yellow), siyah (black), beyaz (white)",
          "Point at five things and say the colour first, then the thing: kırmızı top (red ball)",
          "Say: Bugün Pazartesi (today is Monday)",
        ],
        points: ["Colour goes BEFORE the thing, like English", "Cuma is Friday, the day of Jumu'ah", "Say today's day every morning"],
        targets: { bronze: "Say the seven days in order", silver: "Days plus six colours from memory", gold: "Describe 10 things around you with a colour" },
        watch: "Turkish days of the week and colours",
      },
      {
        id: "tr-vowel-harmony", name: "Vowel Harmony: -ler / -lar", category: "Turkish grammar", minutes: 20, kit: "Paper, pen, the word list",
        why: "Vowel harmony is the secret engine of Turkish. Endings change their vowel to match the word. Master the plural and you understand how every other ending works.",
        steps: [
          "Find the LAST vowel in the word",
          "If it is e, i, ö or ü → add -ler: ev → evler, kedi → kediler, göz → gözler",
          "If it is a, ı, o or u → add -lar: kitap → kitaplar, kız → kızlar, top → toplar, okul → okullar",
          "Sort a list of 20 words into two columns",
          "Say each plural out loud",
        ],
        points: ["Only the LAST vowel counts", "Front vowels (e i ö ü) go with -ler, back vowels (a ı o u) go with -lar", "Say it out loud; the wrong one will start to sound wrong"],
        targets: { bronze: "10 out of 20 plurals right", silver: "18 out of 20 right", gold: "20 out of 20, said aloud without writing" },
        watch: "Turkish vowel harmony explained simply",
      },
      {
        id: "tr-locative", name: "In / At: -de / -da", category: "Turkish grammar", minutes: 20, kit: "Your house",
        why: "Turkish sticks 'in' and 'at' onto the end of the word. Learn this one ending and you can say where anything is.",
        steps: [
          "Same rule as the plural: last vowel e i ö ü → -de, a ı o u → -da",
          "evde (at home), bahçede (in the garden), odada (in the room), okulda (at school)",
          "After a hard sound (ç f h k p s ş t) the d becomes t: parkta (in the park), mutfakta (in the kitchen), kitapta (in the book)",
          "Ask 'nerede?' (where?): Top nerede? → Top bahçede.",
          "Say where 10 things in the house are",
        ],
        points: ["Vowel harmony again, same last-vowel rule", "Hard sound at the end → t instead of d", "Annem mutfakta = My mum is in the kitchen"],
        targets: { bronze: "5 correct 'where' sentences", silver: "10 correct, including two with -te/-ta", gold: "Answer 10 'nerede?' questions from Mum instantly" },
        watch: "Turkish locative case de da te ta for beginners",
      },
      {
        id: "tr-word-order", name: "Verb Last + -iyorum", category: "Turkish grammar", minutes: 20, kit: "Paper, pen",
        why: "Turkish puts the verb at the END of the sentence. Add -iyorum ('I am …ing') and you can say what you are doing right now.",
        steps: [
          "Order: who → what → verb. Ben su içiyorum (I am drinking water)",
          "Learn six verbs: geliyorum (I'm coming), gidiyorum (I'm going), okuyorum (I'm reading), yazıyorum (I'm writing), oynuyorum (I'm playing), konuşuyorum (I'm speaking)",
          "Futbol oynuyorum (I'm playing football). Kitap okuyorum (I'm reading a book)",
          "For 'we', -iyoruz: Parkta futbol oynuyoruz (we're playing football in the park)",
          "Useful one: Anlamıyorum (I don't understand)",
        ],
        points: ["The verb always waits at the end", "You can drop 'ben': the ending already says 'I'", "Say what you're doing as you do it"],
        targets: { bronze: "5 correct sentences with the card", silver: "10 sentences from memory", gold: "Narrate what you're doing for 1 minute in Turkish" },
        watch: "Turkish present continuous iyor for beginners",
      },
      {
        id: "sp-shadowing", name: "Shadowing (Listen & Repeat)", category: "Speaking & listening", minutes: 20, kit: "MacBook, headphones on low volume, a short Turkish kids' clip Mum has approved",
        why: "Shadowing means copying a speaker straight after them, sound for sound. It trains your ear and your mouth at the same time, and it is how you start to sound Turkish rather than just knowing words.",
        steps: [
          "Pick a 2–3 minute clip (a cartoon scene or a slow Turkish story for kids)",
          "Listen once all the way through. Don't worry about understanding",
          "Play one line, pause, and copy it out loud exactly, including the music of it",
          "Do the whole clip line by line",
          "Play it again and speak along at the same time",
        ],
        points: ["Copy the tune, not just the words", "Same clip all week; repetition is the point", "Headphones low, your ears matter"],
        targets: { bronze: "Shadow a 1-minute clip line by line", silver: "Speak along with a 2-minute clip", gold: "Say a whole 2-minute clip from memory with the right tune" },
        watch: "Rafadan Tayfa TRT Çocuk",
      },
      {
        id: "sp-ten-questions", name: "The 10 Questions", category: "Speaking & listening", minutes: 30, kit: "A family member who speaks Turkish",
        why: "Most first conversations use the same few questions. Answer these 10 without thinking and you can hold a real chat with family.",
        steps: [
          "Adın ne? → Benim adım Ansar. · Nasılsın? → İyiyim, teşekkürler.",
          "Kaç yaşındasın? → On iki yaşındayım. · Nerede yaşıyorsun? → Melbourne'da yaşıyorum.",
          "Ne yapıyorsun? → Kitap okuyorum. · Bu ne? → Bu bir top.",
          "Acıktın mı? → Evet, acıktım. · Susadın mı? → Hayır, susamadım.",
          "If you get stuck: Tekrar eder misiniz? (Could you repeat that?) · Yavaş konuşur musunuz? (Could you speak slowly?)",
        ],
        points: ["Answer, then ask the same question back", "Getting stuck is normal; use the rescue phrases", "No English for the whole session"],
        targets: { bronze: "Answer 5 of the 10", silver: "Answer all 10 and ask 5 back", gold: "A 5-minute Turkish chat with no English" },
        watch: "simple Turkish conversation for beginners slow",
      },
      {
        id: "ar-letters", name: "The 28 Arabic Letters", category: "Arabic letters", minutes: 20, kit: "Letter chart, finger for tracing",
        why: "Arabic has 28 letters, but many share one shape and only differ by dots. Learn them in shape families and they come much faster.",
        steps: [
          "Arabic is read right to left",
          "Shape families: ب ت ث (ba, ta, tha: one dot below, two above, three above) · ج ح خ (jim, ha, kha)",
          "د ذ (dal, dhal) · ر ز (ra, zay) · س ش (sin, shin) · ص ض (sad, dad) · ط ظ (ta, za) · ع غ (ayn, ghayn)",
          "Then: ا (alif), ف (fa), ق (qaf), ك (kaf), ل (lam), م (mim), ن (nun), ه (ha), و (waw), ي (ya)",
          "One family per session: name it, trace it, find it on the chart",
        ],
        points: ["Count the dots and check above or below", "There are two different 'h' sounds (ح and ه) and two 't' sounds (ت and ط); a teacher helps you hear them", "Learn the sound with a teacher's voice, not only from the page"],
        targets: { bronze: "Name 10 letters", silver: "Name all 28 in order", gold: "Name all 28 mixed up in under 60 seconds" },
        watch: "Arabic alphabet for kids with pronunciation",
      },
      {
        id: "ar-joining", name: "Joining & the Six Non-Joiners", category: "Arabic letters", minutes: 20, kit: "Paper, pencil, letter chart",
        why: "Arabic letters change shape depending on where they sit in a word: start, middle, end or alone. Knowing which letters refuse to join is the key to reading real words.",
        steps: [
          "Most letters have four shapes: alone, start, middle, end",
          "Six letters never join to the letter after them: ا د ذ ر ز و (alif, dal, dhal, ra, zay, waw)",
          "They still join to the letter before them, then leave a small gap",
          "Look at a written word and find the gaps: each gap comes after one of the six",
          "Write ب in all four positions, then try ك and ه",
        ],
        points: ["A gap inside a word means one of the six came just before it", "Dots stay with their letter even when the shape shrinks", "Say the six as a chant: alif, dal, dhal, ra, zay, waw"],
        targets: { bronze: "Name the six non-joiners", silver: "Spot every letter in a 3-letter joined word", gold: "Spot every letter in 10 joined words in a row" },
        watch: "Arabic letter forms beginning middle end",
      },
      {
        id: "ar-harakat", name: "Harakat: Short Vowels, Sukun & Shadda", category: "Arabic harakat & reading", minutes: 20, kit: "A Qaida book (beginner reading book) or chart",
        why: "The little marks above and below letters tell you which vowel to say. They turn letters into sounds you can actually read.",
        steps: [
          "Fatha (a short line above) = 'a': بَ ba",
          "Kasra (a short line below) = 'i': بِ bi",
          "Damma (a small curl above) = 'u': بُ bu",
          "Sukun (a small circle above) = no vowel, stop the sound",
          "Shadda (a small 'w' shape above) = say the letter twice, pressed: رَبّ rabb",
        ],
        points: ["Fatha above, kasra below, damma the little curl", "Read slowly; speed comes from accuracy", "Practise with a teacher so the sounds are right from day one"],
        targets: { bronze: "Read 10 single letters with each short vowel", silver: "Read 20 two-letter syllables correctly", gold: "Read 30 syllables with sukun and shadda, no mistakes" },
        watch: "Arabic harakat fatha kasra damma for kids",
      },
      {
        id: "ar-long-tanween", name: "Long Vowels & Tanween", category: "Arabic harakat & reading", minutes: 20, kit: "Qaida book or chart",
        why: "Long vowels stretch a sound and tanween adds an 'n' at the end. With these you can read most simple words.",
        steps: [
          "Long a: fatha then alif → بَا baa",
          "Long u: damma then waw → بُو buu · Long i: kasra then ya → بِي bii",
          "Tanween is a doubled mark at the end of a word: 'an', 'in', 'un'",
          "With 'al-' (the): some letters keep the l (al-kitab, the book), sun letters swallow it (an-nas, the people)",
          "Read 10 short words slowly, then a second time a bit faster",
        ],
        points: ["Hold a long vowel for about two counts", "Tanween only sits on the last letter", "Point at each letter as you read"],
        targets: { bronze: "Read 10 long-vowel syllables", silver: "Read 10 words with tanween", gold: "Read a full Qaida page with a teacher, few corrections" },
        watch: "Arabic long vowels madd and tanween for beginners",
      },
      {
        id: "qw-set1", name: "Quranic Words 1: Big Words", category: "Quranic words", minutes: 15, kit: "Word cards (Arabic on one side, meaning on the other)",
        why: "A small number of words come up again and again in the Qur'an. Knowing them means you start to understand what you recite, not just say it.",
        steps: [
          "Allah (الله) · rabb (رب) = Lord · ilah (إله) = god",
          "ar-rahman (الرحمن) = the Most Merciful · ar-rahim (الرحيم) = the Most Kind",
          "yawm (يوم) = day · kitab (كتاب) = book · nas (ناس) = people",
          "ard (أرض) = earth · sama' (سماء) = sky · jannah (جنة) = garden, Paradise · nar (نار) = fire",
          "Do the cards Arabic side up; say the meaning, then flip to check",
        ],
        points: ["Learn the meaning AND the shape of the word", "Listen out for these words when you hear recitation", "Five cards a session, keep reviewing old ones"],
        targets: { bronze: "Recognise 5 words", silver: "Recognise all 12", gold: "Spot 5 of them in a page of the mushaf" },
        watch: "most common words in the Quran for beginners",
      },
      {
        id: "qw-set2", name: "Quranic Words 2: Little Words", category: "Quranic words", minutes: 15, kit: "Word cards",
        why: "Tiny words like 'from', 'in' and 'he said' are the glue of every sentence. They are short, they appear everywhere, and they are quick to learn.",
        steps: [
          "min (من) = from · fi (في) = in · 'ala (على) = on · ila (إلى) = to · ma'a (مع) = with",
          "la (لا) = no, not · inna (إن) = indeed",
          "qala (قال) = he said · qul (قل) = say!",
          "huwa (هو) = he · hum (هم) = they · alladhina (الذين) = those who",
          "Mix with set 1 cards and test yourself both ways",
        ],
        points: ["Short words still need a careful look; من and في are easy to mix up at first", "Say the Arabic, then the meaning, then the Arabic again", "Old cards stay in the pile until you know them cold"],
        targets: { bronze: "Recognise 5 words", silver: "Recognise all 12", gold: "Recognise all 24 from sets 1 and 2, mixed" },
        watch: "Quranic Arabic high frequency words for kids",
      },
    ],
  },

  /* ── Programmes ───────────────────────────────────────────────────────── */
  programmes: [
    {
      id: "turkish-daily", icon: "🔥", label: "Turkish Engine", kicker: "PROGRAMME 1 · EVERY WEEKDAY",
      title: "The Turkish Daily Engine",
      intro: "Two short hits a day: 10 minutes after breakfast, 20 minutes after lunch. Listen, repeat, speak. The secret isn't long sessions; it's never missing one.",
      rules: [
        "Every session is out loud. Silent study doesn't count",
        "New words get reviewed the next day, then after three days, then after a week",
        "Same listening clip all week; repetition beats variety",
        "If you miss a day, do the next one. Never try to catch up by doubling",
      ],
      blocks: [
        { name: "Morning drop", when: "Weekdays 07:45 · 10 min", items: [
          { name: "Review yesterday's words", dose: "2 min", cue: "Out loud, from memory, before you look" },
          { name: "New words", dose: "5 words · 5 min", cue: "Each one in a tiny sentence" },
          { name: "One real use", dose: "1 phrase", cue: "Use it with Mum at breakfast" },
        ] },
        { name: "Afternoon lab", when: "Weekdays 14:00 · 20 min", items: [
          { name: "Listen", dose: "5 min", cue: "One short clip, no subtitles first time" },
          { name: "Repeat (shadow)", dose: "8 min", cue: "Line by line, copy the tune" },
          { name: "Speak", dose: "7 min", cue: "Say 5 of your own sentences with today's grammar card" },
        ] },
      ],
      redFlags: [
        "Your ears ring or hurt after headphones (turn the volume down and tell Mum)",
        "A video, app or website asks you to chat with strangers or share your name or location",
        "You feel stuck and upset most days for a week: tell Mum, the plan needs changing, not you",
        "You get headaches or sore eyes from the screen",
      ],
    },
    {
      id: "quranic-arabic", icon: "🕌", label: "Arabic Foundations", kicker: "PROGRAMME 2 · STARTS WHEN TURKISH IS SOLID",
      title: "Quranic Arabic Foundations",
      intro: "This starts once Mum agrees your Turkish basics are solid (you can answer the 10 Questions and know about 100 words). Then it's letters, harakat, joining and the most common Quranic words, one small step at a time, with a teacher checking your sounds.",
      rules: [
        "Turkish stays daily. Arabic is added, never swapped in",
        "Learn sounds from a qualified teacher or recording Mum chooses, not from guessing",
        "One letter family or one mark per session; don't rush",
        "Handle the mushaf with respect and clean hands",
      ],
      blocks: [
        { name: "Stage 1: Letters", when: "Weeks 1–6 · Fri 14:00 · 20 min", items: [
          { name: "Shape family", dose: "1 family per session", cue: "Name, trace, find" },
          { name: "Mixed letter flash", dose: "2 min", cue: "Name as many as you can in 60 s" },
          { name: "Non-joiners chant", dose: "1 min", cue: "Alif, dal, dhal, ra, zay, waw" },
        ] },
        { name: "Stage 2: Harakat & reading", when: "Weeks 7–14 · 2 × 20 min", items: [
          { name: "Short vowels", dose: "10 syllables", cue: "Fatha a, kasra i, damma u" },
          { name: "Sukun & shadda", dose: "10 syllables", cue: "Stop the sound / say it twice" },
          { name: "Qaida reading", dose: "Half a page", cue: "Slow, finger on each letter" },
        ] },
        { name: "Stage 3: Quranic words", when: "Week 15 onwards · 10 min added", items: [
          { name: "Word cards", dose: "5 new + review", cue: "Arabic side up, meaning out loud" },
          { name: "Spot the word", dose: "1 page", cue: "Find words you know in the mushaf" },
        ] },
      ],
      redFlags: [
        "You're being taught sounds by someone online whom Mum hasn't checked",
        "Arabic practice is pushing Turkish out of the week",
        "You feel embarrassed to read aloud: tell Mum, every reader started slow",
      ],
    },
    {
      id: "family-conversation", icon: "🫖", label: "Family Talk", kicker: "PROGRAMME 3 · SATURDAY 11:30",
      title: "Conversation with Family",
      intro: "Thirty minutes of Turkish with Mum or any family member who speaks it. This is where all the words and grammar turn into real talking.",
      rules: [
        "Turkish only for the full 30 minutes",
        "The grown-up speaks slowly and doesn't switch to English to rescue you",
        "Use the rescue phrases: Tekrar eder misiniz? Yavaş konuşur musunuz?",
        "Video calls with relatives only with Mum there and Mum's account",
      ],
      blocks: [
        { name: "Saturday chat", when: "Sat 11:30 · 30 min", items: [
          { name: "Warm-up greetings", dose: "3 min", cue: "Hoş geldin / Hoş bulduk, Nasılsın?" },
          { name: "The 10 Questions", dose: "10 min", cue: "Answer, then ask back" },
          { name: "Show and tell", dose: "10 min", cue: "Describe something in the room: colour, where it is, what it does" },
          { name: "New word hunt", dose: "5 min", cue: "Write 3 words you heard but didn't know" },
          { name: "Goodbye", dose: "2 min", cue: "Görüşürüz! Teşekkür ederim." },
        ] },
      ],
      redFlags: [
        "Someone you don't know joins a call or messages you",
        "The chat turns into a test that makes you anxious: tell Mum to keep it fun",
      ],
    },
  ],

  /* ── What a teacher looks for ─────────────────────────────────────────── */
  experts: {
    title: "What a language teacher is really looking for",
    lead: "Teachers don't care how many words you can tick on an app. They listen for whether you can actually understand and be understood.",
    corners: [
      { icon: "👂", name: "Listening", lookFor: ["Understands a slow sentence first time", "Picks out known words in fast speech", "Asks for a repeat instead of guessing"] },
      { icon: "🗣️", name: "Speaking", lookFor: ["Speaks in short full sentences, not single words", "Keeps going after a mistake", "Clear special sounds: ç ş ğ ı ö ü"] },
      { icon: "🧩", name: "Grammar sense", lookFor: ["Verb at the end", "Right ending by vowel harmony, most of the time", "Uses a new ending in a new sentence"] },
      { icon: "📖", name: "Reading", lookFor: ["Reads Turkish words aloud correctly even when new", "Names Arabic letters by shape and dots", "Reads harakat slowly and correctly"] },
      { icon: "🔁", name: "Habit", lookFor: ["A little every day", "Reviews old words, not just new ones", "Uses the language outside lessons"] },
    ],
    redCards: [
      "Only learning on an app and never speaking",
      "Switching to English the moment it gets hard",
      "Collecting new words without reviewing old ones",
      "Mumbling so mistakes can't be heard",
      "Rushing Arabic before letters and harakat are solid",
    ],
  },

  /* ── Benchmarks ───────────────────────────────────────────────────────── */
  benchmarks: [
    { id: "tr-words", icon: "📚", test: "Turkish words known", how: "Mum shows the word cards; count words you translate correctly from memory", unit: "words", better: "higher", bronze: 50, silver: 100, gold: 200 },
    { id: "tr-sentences-60", icon: "⏱️", test: "Turkish sentences said aloud in 1 minute", how: "Full, correct sentences about anything; Mum counts", unit: "sentences", better: "higher", bronze: 5, silver: 8, gold: 12 },
    { id: "tr-count-20", icon: "🔢", test: "Count 1–20 in Turkish", how: "Timed, must be clean; best of 2", unit: "seconds", better: "lower", bronze: 30, silver: 20, gold: 12 },
    { id: "tr-ten-questions", icon: "❓", test: "The 10 Questions answered", how: "Mum asks in Turkish, mixed order", unit: "/10", better: "higher", bronze: 5, silver: 8, gold: 10 },
    { id: "tr-listening-week", icon: "🎧", test: "Minutes of Turkish listening this week", how: "Add up shadowing, cartoons and family talk", unit: "minutes", better: "higher", bronze: 60, silver: 100, gold: 150 },
    { id: "ar-letters-60", icon: "🔤", test: "Arabic letters named in 60 s", how: "Mixed-order chart, Mum checks", unit: "letters", better: "higher", bronze: 10, silver: 20, gold: 28 },
    { id: "ar-syllables", icon: "✍️", test: "Syllables with harakat read correctly", how: "30 syllables from the Qaida, teacher or Mum checks", unit: "/30", better: "higher", bronze: 15, silver: 22, gold: 28 },
    { id: "qw-recognised", icon: "🕌", test: "Quranic words recognised", how: "50 cards, Arabic side up, say the meaning", unit: "/50", better: "higher", bronze: 15, silver: 25, gold: 40 },
  ],

  ladder: [
    { icon: "🌱", name: "Sounds", what: "Read Turkish aloud correctly; greetings and numbers", when: "First month" },
    { icon: "🧱", name: "Survival Turkish", what: "100 words, the 10 Questions, -ler/-lar and -de/-da", when: "Months 2–4" },
    { icon: "💬", name: "Family chatter", what: "5-minute Turkish chat with no English; verb-last sentences", when: "Months 5–8" },
    { icon: "🔤", name: "Arabic letters", what: "28 letters, joining, the six non-joiners (Turkish keeps going daily)", when: "Once Turkish basics are solid" },
    { icon: "📖", name: "Reading with harakat", what: "Read a Qaida page with a teacher; 50 Quranic words", when: "The following months" },
    { icon: "🌍", name: "Two-language kid", what: "Watch a Turkish cartoon and follow it; recognise common words when hearing recitation", when: "The long road" },
  ],
  ladderNote: "These are starting targets for a 12-year-old, not national norms. After your first honest test, Mum resets them so Silver is hard but possible this month. Judge yourself against last month's you, nobody else.",

  /* ── The season ───────────────────────────────────────────────────────── */
  season: {
    goals: [
      { icon: "🗣️", goal: "Hold a 5-minute Turkish chat with family", measure: "Saturday chat with no English, Mum confirms" },
      { icon: "📚", goal: "Know 200 Turkish words", measure: "Word-card test on the last Saturday of the month" },
      { icon: "🔤", goal: "Read Arabic letters and harakat, and know 25 Quranic words", measure: "Letters in 60 s + Quranic word cards" },
    ],
    phases: [
      { icon: "🌱", name: "Turkish Foundations", months: "January – April", aim: "Sounds, greetings, numbers, family words, plurals" },
      { icon: "💬", name: "Turkish Speaking", months: "May – August", aim: "Where-endings, verb-last sentences, the 10 Questions, family chats" },
      { icon: "🔤", name: "Arabic Letters", months: "September – October", aim: "Letters and joining, Turkish still daily" },
      { icon: "📖", name: "Arabic Reading", months: "November – December", aim: "Harakat, long vowels and the first Quranic words" },
    ],
    phaseForMonth: [
      "Turkish Foundations", "Turkish Foundations", "Turkish Foundations", "Turkish Foundations",
      "Turkish Speaking", "Turkish Speaking", "Turkish Speaking", "Turkish Speaking",
      "Arabic Letters", "Arabic Letters",
      "Arabic Reading", "Arabic Reading",
    ],
    months: [
      { month: "January", focus: "The 29 letters and the six special sounds", libraryId: "tr-alphabet" },
      { month: "February", focus: "Greetings and manners, used for real at home", libraryId: "tr-greetings" },
      { month: "March", focus: "Numbers to 100, days and colours", libraryId: "tr-numbers" },
      { month: "April", focus: "Vowel harmony: -ler / -lar", libraryId: "tr-vowel-harmony" },
      { month: "May", focus: "Family and home words: label the house", libraryId: "tr-family-home" },
      { month: "June", focus: "Where things are: -de / -da / -te / -ta", libraryId: "tr-locative" },
      { month: "July", focus: "Verb last and -iyorum", libraryId: "tr-word-order" },
      { month: "August", focus: "The 10 Questions and longer family chats", libraryId: "sp-ten-questions" },
      { month: "September", focus: "The 28 Arabic letters in shape families", libraryId: "ar-letters" },
      { month: "October", focus: "Joining and the six non-joiners", libraryId: "ar-joining" },
      { month: "November", focus: "Harakat: fatha, kasra, damma, sukun, shadda", libraryId: "ar-harakat" },
      { month: "December", focus: "Long vowels, tanween and the first Quranic words", libraryId: "qw-set1" },
    ],
  },

  /* ── Heroes ───────────────────────────────────────────────────────────── */
  heroes: {
    title: "People who opened the world with language",
    lead: "Travellers, scholars and writers who learned, used and loved Turkish and Arabic. Real people, real struggles, one thing you can copy this week.",
    people: [
      {
        id: "ibn-battuta", name: "Ibn Battuta", emoji: "🧭", country: "Morocco", known: "Traveller · The Rihla", born: "1304 · Tangier, Morocco", colour: "#f59e0b",
        tagline: "Left home at 21 for Hajj and kept travelling for nearly 30 years.",
        childhood: "Ibn Battuta grew up in Tangier in a family of Islamic scholars and judges. He studied Islamic law as a boy, and his Arabic and religious learning became his passport later on.",
        hardship: ["He set out for Makkah alone at 21 and wrote that leaving his parents was painful.", "He fell ill early in the journey and kept going.", "He was robbed and lost almost everything more than once.", "Ships carrying his belongings were wrecked off the coast of India."],
        overcame: ["Because he knew Arabic and Islamic law, he found work as a judge (qadi) in Delhi and in the Maldives.", "He kept travelling: across North Africa, the Middle East, India, and much further.", "Back in Morocco he dictated his travels, and the book, the Rihla, is still read today."],
        lesson: "Knowing a language well can take you places you never imagined, and help you when everything else is lost.",
        challenge: "Learn how to say 'Where is…?' (… nerede?) and use it five times this week.",
      },
      {
        id: "evliya-celebi", name: "Evliya Çelebi", emoji: "📜", country: "Ottoman Empire (Türkiye)", known: "Traveller · The Seyahatname", born: "1611 · Istanbul", colour: "#ef4444",
        tagline: "A hafiz who spent about 40 years travelling and writing it all down.",
        childhood: "Evliya grew up in Istanbul; his father was a goldsmith at the Ottoman palace. He studied hard as a boy and memorised the whole Qur'an, becoming a hafiz.",
        hardship: ["Travel in his time meant months on horseback, bad roads and real danger.", "He travelled through wars and hard places, far from home for years.", "Writing everything down by hand on the road took huge patience."],
        overcame: ["His beautiful Qur'an recitation brought him to the attention of Sultan Murad IV.", "He wrote his Seyahatname, the 'Book of Travels', in ten volumes.", "He wrote down words and phrases of the languages he heard, a real language collector."],
        lesson: "Writing things down is how you keep them. Evliya collected words the way you can collect yours.",
        challenge: "Keep a word notebook this week. Write 3 new Turkish words you hear every day.",
      },
      {
        id: "sibawayh", name: "Sibawayh", emoji: "📘", country: "Persia (Iran) · Basra (Iraq)", known: "Grammarian · al-Kitab", born: "8th century · near Shiraz, Persia", colour: "#38bdf8",
        tagline: "Arabic wasn't his first language. He wrote its most famous grammar book.",
        childhood: "Sibawayh was Persian, so Arabic was a language he had to learn. As a young man he went to Basra, a great city of learning, to study.",
        hardship: ["The well-known story says he was corrected in front of a class for a grammar mistake in Arabic.", "He was learning in a language that wasn't his mother tongue, next to native speakers."],
        overcame: ["Instead of giving up, he decided to master Arabic grammar.", "He studied with the great scholar al-Khalil ibn Ahmad.", "His book, simply called 'al-Kitab' (The Book), became the foundation of Arabic grammar studied for over a thousand years."],
        lesson: "Being corrected isn't the end. It can be the start of becoming the expert.",
        challenge: "When Mum corrects your Turkish this week, say the right version out loud three times.",
      },
      {
        id: "mehmet-akif", name: "Mehmet Akif Ersoy", emoji: "🇹🇷", country: "Türkiye", known: "Poet · İstiklal Marşı", born: "1873 · Istanbul", colour: "#dc2626",
        tagline: "The vet who wrote the words of Türkiye's national anthem.",
        childhood: "Mehmet Akif learned Arabic from his father, a teacher, and became a hafiz. He also learned Persian and loved poetry.",
        hardship: ["His father died when he was a teenager and the family home burned down.", "He had to choose a school that would get him a job quickly, so he trained as a vet instead of following poetry full-time."],
        overcame: ["He worked as a vet and kept writing poetry; his poems were collected in the book Safahat.", "In 1921 his poem was chosen as İstiklal Marşı, the national anthem.", "He gave the prize money to charity."],
        lesson: "You can do your duties AND keep up the thing you love. Little by little, it adds up.",
        challenge: "Learn the meaning of one short Turkish poem or song line this week and say it to Mum.",
      },
      {
        id: "halide-edib", name: "Halide Edib Adıvar", emoji: "✒️", country: "Türkiye", known: "Writer · Teacher", born: "1884 · Istanbul", colour: "#a78bfa",
        tagline: "Wrote books in both Turkish and English and taught English literature.",
        childhood: "Halide's mother died when she was very young, and she was partly raised by her grandmother. She studied at the American College for Girls in Istanbul and learned English there.",
        hardship: ["She lost her mother as a small child.", "In her time, few girls in Istanbul got the education she fought for.", "She lived for years far away from Türkiye."],
        overcame: ["She became the first Turkish Muslim woman to graduate from the American College for Girls (1901).", "She wrote novels in Turkish and books in English, including her memoirs.", "She later became a professor of English literature at Istanbul University."],
        lesson: "Two languages give you two doors to the world. Keep both open.",
        challenge: "Tell a short story about your day in Turkish, then the same story in English. Notice the words you're missing.",
      },
    ],
  },

  /* ── What to watch ────────────────────────────────────────────────────── */
  watch: {
    lead: "Watching in Turkish is the easiest way to hear lots of the language. Pick short, slow, kid-friendly clips and use them actively.",
    worthIt: [
      { icon: "📺", title: "Rafadan Tayfa (TRT Çocuk)", why: "A Turkish cartoon about a gang of neighbourhood kids. Everyday Istanbul Turkish, clear voices.", how: "One short clip for shadowing; same clip all week" },
      { icon: "🧔", title: "Nasreddin Hoca stories", why: "Short funny folk stories everyone in Türkiye knows. Great for listening and retelling.", how: "Listen, then retell the story to Mum in your own Turkish words" },
      { icon: "🔤", title: "Turkish pronunciation lessons for beginners", why: "Shows exactly how ç ş ğ ı ö ü are made.", how: "Watch once, then copy each sound 5 times" },
      { icon: "🕌", title: "Arabic alphabet and harakat lessons for kids", why: "Hear each letter from a trained voice before you practise it.", how: "Pause after each letter and repeat it out loud" },
      { icon: "📖", title: "Qaida lessons with a teacher", why: "Step-by-step reading, the same order as your Qaida book.", how: "Follow along with your finger on the page" },
    ],
    zeroValue: [
      { icon: "🌀", title: "Endless Shorts or Reels 'learning' clips", why: "Random bits with no review. Feels like learning, sticks for nothing." },
      { icon: "🔊", title: "Fast adult dramas", why: "Too fast and too grown-up to learn from yet." },
      { icon: "💬", title: "Language-exchange or chat apps", why: "Built for chatting with strangers. Not for you." },
      { icon: "📑", title: "Reading the subtitles only", why: "If you only read English subtitles, your ears learn nothing." },
    ],
    rules: [
      "Mum approves every channel and clip before you use it",
      "Watch on the MacBook with headphones at low volume",
      "Short and active: pause, repeat, speak. No autoplay",
      "Never comment, chat or share anything about yourself online",
      "Screens off at 20:00, language clips included",
    ],
  },

  /* ── Mum's corner ─────────────────────────────────────────────────────── */
  family: {
    role: [
      { icon: "🗣️", text: "Speaks Turkish with him, slowly" },
      { icon: "✅", text: "Decides when Turkish is solid enough to start Arabic" },
      { icon: "📺", text: "Approves every clip, channel and app" },
      { icon: "🧑‍🏫", text: "Chooses the Quranic Arabic teacher" },
      { icon: "📏", text: "Runs the monthly test and resets targets" },
      { icon: "🎉", text: "Celebrates effort, not perfect grammar" },
    ],
    always: [
      "Answer in Turkish when he speaks Turkish, even if it's broken",
      "Repeat his sentence back correctly instead of saying 'wrong'",
      "Keep sessions short and at the same times",
      "Turkish stays daily even after Arabic starts",
    ],
    never: [
      "Laugh at a mistake or an accent",
      "Use language practice as a punishment",
      "Let him use chat or language-exchange apps with strangers",
      "Rush into Arabic before Turkish basics are solid",
    ],
    askFirst: [
      "A new app, website or YouTube channel",
      "Video calls with anyone, including relatives overseas",
      "Online Arabic or Turkish tutors",
      "Changing the weekly times",
    ],
  },
};

export default os;
