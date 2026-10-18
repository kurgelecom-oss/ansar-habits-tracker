import type { Story } from './story';

/**
 * The approval sample (tk, 18 Oct 2026): the Kawthar Weekly email of Mon 12 Oct
 * 2026, rewritten in plain words a 15-year-old reads easily (tk, 18 Oct).
 * Shown only at /story/preview. It is a draft, so it can never lock the board.
 * It is also the model the weekly routine copies for tone and shape.
 */
export const SAMPLE_STORY: Story = {
  weekStart: '2026-10-19',
  status: 'draft',
  topic: 'Taharah and bulugh',
  kicker: 'This week · The night you grow up',
  headline: 'He thought he had done something wrong. He was handed a key.',
  deck: 'A boy who looks after a 400-year-old fire, the morning he became a man, and the 90 seconds nobody should skip.',
  image: {
    src: '/story/sample-hammam.jpg',
    alt: 'The brick walls and stone floors of an old hammam in Bukhara',
    credit: 'Ancient hammam, Bukhara. Photo: Davide Mauro, CC BY-SA 4.0, Wikimedia Commons',
  },
  lenses: [
    { title: "1 · What the Qur'an says", body: "Allah says: if you are in a state of janabah (the state after a wet dream or intimacy), take a full bath. In the same verse He says He does not want to make things hard for you. He wants to make you clean and complete His blessing on you (5:6). The Qur'an even uses the word for that dream to mean growing up (24:59). So the bath is a gift, not a punishment." },
    { title: '2 · What the Prophet ﷺ taught', body: "The Prophet ﷺ said: \"The water is because of the water\" (Sahih Muslim 343a). It means you only need the full bath (ghusl) if fluid actually came out. A dream with nothing on you means no ghusl. 'Aisha described how he did it: wash the hands, make wudu like for prayer, run wet fingers through the roots of the hair, pour water over the head three times, then wash the whole body (Sahih al-Bukhari 248)." },
    { title: '3 · What the scholars explain', body: "Ibn al-Qayyim asks a good question: why wash the whole body and not just one part? His answer: that fluid comes from the whole body, so the washing covers the whole body too (I'lam al-Muwaqqi'in 2/77–78). He also points out the mercy in it: if this bath were needed every time you used the toilet, it would be far too hard. The rule is fair, not random. (Nothing on this from Ibn Taymiyyah could be checked to a named book, so nothing is quoted from him.)" },
  ],
  story: {
    title: 'The Two Columns',
    pull: 'He was ready to be told off. Instead he was handed a key.',
    paragraphs: [
      'Bukhara, winter 1911. Under the floor of an old bathhouse there was a fire that had not gone out for 400 years. The person in charge of keeping it going was a 15-year-old boy called Mirzo.',
      'He worked in the stokehold, a low brick room under the floor. Above him, men walked to the hot rooms. Mirzo never saw them. He saw wood, ash, an iron door and a long rake. He knew that fire so well he could tell how it was doing just by the sound. He slept on straw next to it, because it had to be fed in the middle of the night and again before fajr.',
      'His boss was Usto Jalil, sixty years old, with hands as hard as tool handles. He had one saying about the stokehold: "The men upstairs are bathing. You are keeping their water hot. It is the same job." Mirzo loved that. It made the ash in his hair feel like a badge.',
      'One cold night, Mirzo woke up in the dark and knew something had happened to him in his sleep. He had no word for it.',
      'First he thought he was sick. Then he thought something worse: that he had done something wrong and would be in trouble. His mother had died six years before. He had no father to ask. He only had Usto Jalil, the boss with the loudest voice in the street.',
      'So he did what most boys do. He said nothing. He fed the fire, went up, and prayed fajr with the men like it was a normal morning. The whole time, he felt like someone who had sneaked into a place he was not allowed to be.',
      'Usto Jalil found him mid-morning, sitting on the edge of the water tank, doing nothing. In that bathhouse, doing nothing was a loud signal. The old man did not ask what was wrong. He walked off and came back with two things: the big iron key to the men\'s warm room, and the bathhouse book. The book had two columns. One was for the names of the men. The other, shorter one was for the names of the boys.',
      '"Write your name in the men\'s column," said Usto Jalil, "and rub it out of the boys\' column."',
      '"You think something is wrong with you," he said. "Nothing is wrong with you. What happened last night happens to every boy Allah has ever made. It is not a sin. It is not an illness. You did not do it on purpose. It is a sign that you are now a man. From today your prayers are written down like a man\'s prayers. Your fasting too. And everything else you do. That is why your name moves to the other column."',
      'Then he taught him the full bath, ghusl, in about 90 seconds, like teaching someone to look after a fire. First the intention. Wash the hands. Make wudu like for prayer. Get water into the roots of the hair until the skin of the head is wet. Pour water over the head three times. Then wash the whole body, right side then left side, and leave nothing dry. "If the water does not reach a spot, that spot is not washed," he said.',
      'Mirzo asked what had been worrying him all morning: "What if it was only a dream and there was nothing on me?" Usto Jalil said: "Then you do nothing. No fluid, no ghusl." Then he added: "Your fajr this morning does not count, because you prayed it before your ghusl. Wash, then pray it again now. It is not a punishment. It is just fixing it."',
      'Three weeks later, a 17-year-old called Davron came down to the stokehold and hung around. Two years earlier the same thing had happened to him, and nobody had told him anything. He decided he was dirty forever. He kept praying, which was brave. But he had never once done ghusl, because he did not even know it existed.',
      'Mirzo had only known all this for 21 days. He told Davron anyway: intention, hands, wudu, the roots of the hair, three times over the head, the whole body, nothing left dry. It is not a sin and you did not do it. Two years of feeling like an outsider in his own religion, fixed by 90 seconds of someone just telling him.',
    ],
  },
  lesson: 'When you grow up, Allah does not give you something shameful to hide. He gives you a way to get clean, a fresh record, and a place among the men. The only thing that turns it into shame is nobody explaining it.',
  questions: [
    { id: 'q1', section: 'The story', prompt: 'Mirzo thought he would be told off. What did Usto Jalil bring him?', options: ['A broom and extra jobs', 'The key to the men\'s room and the bathhouse book', 'A letter for his family', 'Nothing: he sent him home'], answer: 1, why: 'He was ready to be told off. Instead he was handed a key.' },
    { id: 'q2', section: "1 · What the Qur'an says", prompt: 'How does the Qur\'an (5:6) describe the full bath?', options: ['As a punishment', 'As something only old men do', 'As Allah making you clean and completing His blessing, not making life hard', 'As optional'], answer: 2, why: 'Allah does not want to make things hard. He wants to make you clean.' },
    { id: 'q3', section: '2 · What the Prophet ﷺ taught', prompt: '"The water is because of the water." What does that mean?', options: ['You only need ghusl if fluid actually came out, not for a dream alone', 'Every dream needs ghusl', 'You must use cold water', 'Wudu is always enough'], answer: 0, why: 'Sahih Muslim 343a.' },
    { id: 'q4', section: 'The story', prompt: 'What is the right order for ghusl?', options: ['Head first, then wudu, then intention', 'Intention, hands, wudu, roots of the hair, three times over the head, then the whole body', 'Whole body first, then intention', 'Wudu only, then pray'], answer: 1, why: 'This is how \'Aisha described it (Sahih al-Bukhari 248).' },
    { id: 'q5', section: '3 · What the scholars explain', prompt: 'Why wash the whole body, according to Ibn al-Qayyim?', options: ['Because it is just a custom', 'Because the fluid comes from the whole body, so the washing covers the whole body', 'Because bathhouses were cheap', 'He did not say'], answer: 1, why: "I'lam al-Muwaqqi'in 2/77–78." },
    { id: 'q6', section: 'The story', prompt: 'Davron never did ghusl for two years. What was the real reason?', options: ['He was lazy', 'He did not care about prayer', 'Nobody ever told him', 'The bathhouse was closed'], answer: 2, why: '90 seconds of someone telling him fixed two years.' },
  ],
  reflection: 'In one or two sentences, in your own words: why did Mirzo\'s name move to the men\'s column?',
};
