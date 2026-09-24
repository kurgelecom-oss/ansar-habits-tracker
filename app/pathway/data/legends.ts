/* Legends — true childhood stories, v1. Written for a 12-year-old: what was
   hard, what they did about it, and one thing Ansar can copy this week.
   Facts kept to the well-documented record (club histories, the players' own
   interviews). If a story is ever corrected, fix it here. */

export interface Legend {
  id: string;
  name: string;
  emoji: string;
  country: string;
  known: string;
  born: string;
  tagline: string;
  childhood: string;
  hardship: string[];
  overcame: string[];
  lesson: string;
  challenge: string;
  colour: string;
}

export const LEGENDS: Legend[] = [
  {
    id: "haaland", name: "Erling Haaland", emoji: "🤖", country: "Norway", known: "Man City · Norway", born: "2000 · Leeds, England", colour: "#6cabdd",
    tagline: "The kid from a small town who wasn't the best — until he outworked everyone.",
    childhood: "Erling was born in Leeds while his dad, Alf-Inge, played there. When he was 3 the family moved home to Bryne, a small town in Norway. He played everything — football, handball, athletics, cross-country skiing. At 5 he set a world record for his age group in the standing long jump.",
    hardship: ["At Bryne he was NOT the star of his age group. Coaches remember a gangly, not-yet-strong kid.", "He grew late and fast, so for years his body didn't match his ambition.", "Bryne is a tiny club far from Europe's big academies — no one was watching."],
    overcame: ["His youth coach kept him in a group of hungry kids who trained extra on their own.", "He played lots of different sports, which built the balance and power he uses now.", "He is famous for obsessing over recovery, sleep and real food — he treats his body like a machine.", "Bryne → Molde → Salzburg → Dortmund → Man City. One step at a time."],
    lesson: "Being small or slow at 12 means nothing. What you do while you wait for your body to grow means everything.",
    challenge: "Play one different sport this week and notice what it teaches your football.",
  },
  {
    id: "yamal", name: "Lamine Yamal", emoji: "🌟", country: "Spain", known: "Barcelona · Spain", born: "2007 · Esplugues, near Barcelona", colour: "#a50044",
    tagline: "A kid from Rocafonda who did his homework at the Euros — and won them.",
    childhood: "Lamine grew up in Rocafonda, a working-class neighbourhood of Mataró — his goal celebration '304' is the end of its postcode. His dad is Moroccan and his mum is from Equatorial Guinea. He joined Barcelona's La Masia academy at 7.",
    hardship: ["His parents separated when he was young and money was tight.", "He grew up in a neighbourhood people often talk down about.", "He had to keep up with school while training at one of the hardest academies in the world."],
    overcame: ["He played on Rocafonda's street courts every day — thousands of touches no coach organised.", "At La Masia he played up age groups and kept learning, not showing off.", "At Euro 2024 he took his school work to the tournament, did it on an iPad in his hotel room, and passed his final secondary-school exams. Then he won the Euros at 17.", "He always shouts out his neighbourhood — he never forgot where he came from."],
    lesson: "School and football are not enemies. The best young players manage both.",
    challenge: "Finish your homeschool block before touching a ball tomorrow — like Lamine at the Euros.",
  },
  {
    id: "raphinha", name: "Raphinha", emoji: "🔥", country: "Brazil", known: "Barcelona · Brazil", born: "1996 · Porto Alegre, Brazil", colour: "#ffcc29",
    tagline: "Rejected again and again for being too small. He didn't stop.",
    childhood: "Raphinha grew up in Restinga, a poor favela on the edge of Porto Alegre — the same community Ronaldinho came from, and his dad knew him. He learned the game on the streets, futsal courts and in local amateur tournaments.",
    hardship: ["Growing up he sometimes had to ask people on the street for food because his family didn't have enough.", "Big local clubs like Internacional and Grêmio gave him trials and turned him away — 'too slight, too small, not physically ready'.", "He lost friends to crime in his neighbourhood.", "He was still playing amateur football at 18, when most future pros are already in academies."],
    overcame: ["He kept playing — every tournament, every street game.", "A small club, Imbituba, gave him a chance and Avaí scouted him there.", "He moved to Portugal at 19, then Rennes, Leeds, and finally Barcelona and Brazil.", "He credits his friends from Restinga as his 'second family' who kept him going."],
    lesson: "A 'no' from a club is one person's opinion on one day. Keep getting better and find the next door.",
    challenge: "Write down the one thing a coach said you need to improve. Train it 10 minutes a day this week.",
  },
  {
    id: "ronaldo", name: "Cristiano Ronaldo", emoji: "🐐", country: "Portugal", known: "Man Utd · Real Madrid · Portugal", born: "1985 · Funchal, Madeira", colour: "#febe10",
    tagline: "Left home at 12. Heart surgery at 15. Became a Real Madrid legend.",
    childhood: "Cristiano grew up poor on the island of Madeira, sharing a small home with his brother and sisters. His dad was a kit man at a local club. He was so hungry for the ball he'd skip meals to play.",
    hardship: ["At 12 he left his family and moved alone to Sporting's academy in Lisbon. He was homesick and cried on the phone to his mum.", "Other boys mocked his island accent.", "At 15 doctors found a racing-heart condition. He needed heart surgery and feared his career was over.", "He was skinny, and coaches told him to get stronger."],
    overcame: ["He was back training days after the surgery.", "He did extra sprints and strength work at night, even with weights on his ankles to make his dribbling faster.", "He turned every mocking comment into fuel, not fights.", "Man United signed him at 18. Real Madrid made him their all-time top scorer."],
    lesson: "Discipline when nobody is watching is what makes people watch later.",
    challenge: "Do one extra 10-minute session this week that nobody asked you to do — and tell Mum only afterwards.",
  },
  {
    id: "mbappe", name: "Kylian Mbappé", emoji: "🐢", country: "France", known: "Real Madrid · France", born: "1998 · Paris", colour: "#ffffff",
    tagline: "A boy from Bondy whose MUM is his manager.",
    childhood: "Kylian grew up in Bondy, a suburb of Paris. His dad coached at the local club, AS Bondy, and his mum, Fayza, was a handball player. His bedroom wall was covered in Cristiano Ronaldo posters.",
    hardship: ["Bondy is a tough suburb — many talented kids there never make it.", "Big clubs chased him from a young age, which brought pressure and distractions for a young kid.", "He had to balance France's Clairefontaine academy, school and a family that kept him humble."],
    overcame: ["His parents said no to fast money and chose the right development path — Monaco, where he'd get minutes.", "His mum, Fayza, has managed his career from the start. His family made decisions as a team.", "He debuted for Monaco at 16 and won the World Cup at 19.", "In 2024 he signed for Real Madrid — the club he dreamed of as a kid."],
    lesson: "Having your parent as your agent is a superpower — they protect the long game when you want the quick win.",
    challenge: "At Sunday's agent meeting, ask Mum: 'What's one thing I should say no to this month?'",
  },
  {
    id: "modric", name: "Luka Modrić", emoji: "🎩", country: "Croatia", known: "Real Madrid · Croatia", born: "1985 · Zadar, Croatia", colour: "#cfd8dc",
    tagline: "A war refugee called 'too small and weak' who won the Ballon d'Or.",
    childhood: "When Luka was 6, war came to Croatia. His grandfather was killed, and the family fled their home. They lived for years as refugees in a hotel in Zadar. Luka kicked a ball in the hotel car park while the city was being shelled.",
    hardship: ["He lost his home and his grandfather as a small child.", "Hajduk Split, the club he loved, rejected him as too small and too weak.", "He was loaned out to the rough Bosnian league as a teenager, where defenders tried to kick him out of games."],
    overcame: ["NK Zadar's coaches believed in his brain and his touch — he learned to be too quick to be kicked.", "He turned his small size into balance, vision and perfect first touches.", "Dinamo Zagreb → Tottenham → Real Madrid, where he won many Champions Leagues.", "In 2018 he won the Ballon d'Or — the best player in the world."],
    lesson: "If you can't be the biggest, be the smartest. Scanning and first touch beat size every day.",
    challenge: "At training this week, check your shoulder before EVERY pass you receive. Count them.",
  },
  {
    id: "messi", name: "Lionel Messi", emoji: "🪄", country: "Argentina", known: "Barcelona · Argentina", born: "1987 · Rosario, Argentina", colour: "#75aadb",
    tagline: "Injected himself every night to grow. Signed on a paper napkin.",
    childhood: "Leo grew up in Rosario, Argentina, playing with his older brothers and cousins. His grandmother took him to training and believed in him more than anyone.",
    hardship: ["Around 10 he was diagnosed with a growth-hormone problem — he wasn't growing.", "The treatment meant injections into his legs every single night. It was expensive, and local clubs couldn't pay.", "At 13 he moved to Spain. Part of his family went back to Argentina and he was homesick.", "He was so shy he barely spoke to teammates at first."],
    overcame: ["Barcelona believed in him — his first agreement was famously written on a paper napkin.", "He did his injections himself, every night, for years.", "He let his football talk for him until his confidence grew.", "Eight Ballon d'Ors and a World Cup later, the smallest kid became the greatest."],
    lesson: "Every hero had something 'wrong' with them at 12. They kept showing up.",
    challenge: "Pick the drill you hate most. Do it every day this week without complaining.",
  },
];
