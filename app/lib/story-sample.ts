import type { Story } from './story';

/**
 * The approval sample (tk, 18 Oct 2026). The text is the Kawthar Weekly email
 * sent on Mon 12 Oct 2026, unchanged; the questions are new. Shown only at
 * /story/preview. It is a draft, so it can never lock the board.
 */
export const SAMPLE_STORY: Story = {
  weekStart: '2026-10-19',
  status: 'draft',
  topic: 'Taharah and bulugh',
  kicker: 'This week · The night everything changes',
  headline: 'He thought he had broken something in the night. He had been handed a key.',
  deck: 'A boy who keeps a 400-year-old fire burning, the morning he became a man, and the ninety seconds that should never be skipped.',
  image: {
    src: '/story/sample-hammam.jpg',
    alt: 'The brick vaults and stone floors of an old hammam in Bukhara',
    credit: 'Ancient hammam, Bukhara. Photo: Davide Mauro, CC BY-SA 4.0, Wikimedia Commons',
  },
  lenses: [
    { title: "1 · The Qur'an alone", body: "The Qur'an states the obligation and the reason for it in the same verse: wa in kuntum junuban fattahharu, \"and if you are in a state of full impurity, then take a full bath\", and the verse closes by saying that Allah does not intend hardship for you, but intends to purify you and to complete His favour upon you (5:6). The word the Qur'an uses for the end of childhood is the word for the dream itself: \"and when your children reach the age of puberty\" (24:59). The night that changes your standing is named in the Book, and the washing attached to it is introduced as a favour being completed, not a stain being scrubbed." },
    { title: '2 · The prophetic evidence', body: "Abu Sa'id al-Khudri narrates the ruling in four words, innama al-ma'u min al-ma'i: the bath becomes obligatory only with the emission itself (Sahih Muslim 343a; sahih). A dream on its own changes nothing. The water answers the water. And 'Aisha describes the method without a trace of embarrassment: he washed his hands, made wudu as for prayer, worked his fingers through the roots of his hair, poured three handfuls over his head, then poured water over all of him (Sahih al-Bukhari 248; sahih)." },
    { title: '3 · Ibn Taymiyyah & Ibn al-Qayyim', body: "Ibn al-Qayyim answers the obvious question, why the whole body and not a part: the fluid is drawn from the whole body, which is why the Qur'an calls man's origin an extract (32:8), so the washing follows it everywhere (I'lam al-Muwaqqi'in 2/77–78). Had the same washing been attached to urine, the burden on the ummah would have been crushing. The law is measured, not arbitrary. Ibn Taymiyyah: nothing could be verified to a named work, so nothing is attributed to him here." },
  ],
  story: {
    title: "The Men's Column",
    pull: 'He had braced all morning for a charge sheet. He had been handed a key.',
    paragraphs: [
      'The furnace under the Hammam-i Bozori Kord in Bukhara had not been allowed to go out in four hundred years, and in the winter of 1911 the person responsible for that was a fifteen-year-old called Mirzo.',
      'He worked the golkhan, the stokehold, a low brick room dug in under the floor of the bathhouse, where the fire sat and the flues ran out from it like the fingers of a hand. Above his head, through two feet of stone, men walked to the hot rooms. Mirzo never saw them. He saw saxaul wood, ash, the iron door, and the long rake. He could tell you the state of that fire with his eyes shut, by sound alone. He slept on straw beside it because the fire had to be fed at the second hour and again before fajr.',
      'The master of the hammam was Usto Jalil, who was sixty and had hands like the handles of tools. He had one rule about the stokehold: the men above you are bathing. You are keeping the water hot. Those are the same job. Mirzo liked that. It was the only thing anyone had ever said that made the ash in his hair feel like a rank.',
      'In the third week of the cold he woke before the call, in the dark, on the straw, and he knew without any doubt that something had happened to him in the night that he had no word for.',
      'His first thought was that he was ill. His second was worse: that he had done something, somehow, while asleep, and that it was the kind of thing a person is in trouble for. He had no mother to ask. He had no father to ask. He had Usto Jalil, who paid him on Thursdays and had a voice that could be heard in the street.',
      'So he did what boys do. He said nothing, fed the fire, and went up and prayed fajr with the men as though it were an ordinary morning. The entire time he was in it he felt like a man who has climbed a wall into somebody\'s garden.',
      'Usto Jalil found him at mid-morning, sitting on the edge of the cistern doing nothing, which in that hammam was practically a shout. The old man did not ask him what was wrong. He came back five minutes later with two objects: the long iron key to the men\'s chamber, the warm room Mirzo had kept hot for two years and never once been inside, and the ledger, open, with a stub of chalk. One column had the names of the men. The other, shorter, had the names of the boys.',
      '"Write your name in the first column," said Usto Jalil, "and rub it out of the second."',
      '"You think something is wrong with you. Nothing is wrong with you. What happened to you last night happens to every male Allah has ever made, and it is not a sin, and it is not an illness, and you did not do it. It is the sign. From this morning your salah is written down the way a man\'s is written down. Your sawm too. And so is everything else. That is why your name moves columns. Because the record changed owner."',
      'Then he taught him the washing, in about ninety seconds, the way you would teach someone to bank a fire. Intention first. Wash the hands. Then wudu, exactly as for prayer. Then work water through the roots of the hair until the scalp is wet. Then three pours over the head. Then water over all of you, right side, left side, and nothing left dry. "Water that does not arrive has not washed anything. A flue you forget to clean is the flue that burns the building down."',
      'Mirzo asked the question that had been eating him. What if it is only the dream, and there is nothing to see? "Then there is nothing to do," said Usto Jalil. "The water answers the water. No fluid, no ghusl." And then: "Your fajr this morning does not count. Wash, and pray it again, now. Not as a punishment. As a man pays a debt he signed in his sleep."',
      'Three weeks later a boy called Davron, seventeen, came down into the stokehold and did not leave. He had been through the same night two years earlier and nobody had told him anything. He had decided he was unclean in some permanent way. He had gone on praying, which was the brave part, but for two years the way a man eats in a house he thinks he was not invited to. He had never once performed ghusl, because he did not know it existed.',
      'Mirzo had known all of this for twenty-one days. He told him anyway. Intention, hands, wudu, the roots of the hair, three over the head, all of you, nothing left dry. It is not a sin and it is not an illness and you did not do it. Two years of a believer treating himself as a trespasser in his own deen, and ninety seconds of plain speech to undo it.',
    ],
  },
  lesson: 'The night your childhood ends, Allah does not hand you a stain to hide. He hands you the washing, the record, and a place in the men\'s column. The only thing that can turn that dignity into shame is nobody telling you.',
  questions: [
    { id: 'q1', section: 'The story', prompt: 'Mirzo expected to be told off. What did Usto Jalil bring him instead?', options: ['A broom and a list of extra jobs', 'The key to the men\'s chamber and the ledger', 'A letter for his family', 'Nothing: he sent him home'], answer: 1, why: 'He braced for a charge sheet and was handed a key.' },
    { id: 'q2', section: "1 · The Qur'an alone", prompt: 'How does Surah al-Ma\'idah (5:6) present the full bath?', options: ['As a punishment for a sin', 'As something only for old men', 'As Allah purifying you and completing His favour, not a hardship', 'As optional'], answer: 2, why: 'The verse closes: Allah does not intend hardship, He intends to purify you and complete His favour.' },
    { id: 'q3', section: '2 · The prophetic evidence', prompt: '"The water answers the water." What does that mean for ghusl?', options: ['Ghusl is needed only when there is actual emission, not for a dream alone', 'Every dream needs ghusl', 'You must use cold water', 'Wudu is enough'], answer: 0, why: 'Sahih Muslim 343a: the bath is obligatory only with the emission itself.' },
    { id: 'q4', section: 'The story', prompt: 'Which is the order Usto Jalil taught?', options: ['Pour over the head, then wudu, then intention', 'Intention, hands, wudu, roots of the hair, three pours over the head, then the whole body', 'Wash the whole body, then make intention', 'Wudu only, then pray'], answer: 1, why: 'It matches \'Aisha\'s description in Sahih al-Bukhari 248.' },
    { id: 'q5', section: '3 · Ibn Taymiyyah & Ibn al-Qayyim', prompt: 'Why the whole body, according to Ibn al-Qayyim?', options: ['Because it is a custom', 'Because the fluid is drawn from the whole body, so the washing follows it everywhere', 'Because bathhouses were cheap', 'He did not say'], answer: 1, why: "I'lam al-Muwaqqi'in 2/77–78." },
    { id: 'q6', section: 'The story', prompt: 'Davron prayed for two years without ever doing ghusl. What does the story say caused that?', options: ['He was lazy', 'He did not care about prayer', 'Nobody told him: silence', 'The hammam was closed'], answer: 2, why: 'Two years as a trespasser, and ninety seconds of plain speech to undo it.' },
  ],
  reflection: 'In one or two sentences, in your own words: why did Mirzo\'s name move columns in the ledger?',
};
