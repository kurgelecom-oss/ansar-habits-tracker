// An invented week for the parent preview (/school/week?sample=1) and the tests. Not Ansar's data.
import type { WeekReport } from './week-story';

const day = (d: WeekReport['days'][number]['day'], maths: boolean, english: boolean, hass: boolean, rotation: boolean, logs: number, start: string | null) =>
  ({ day: d, maths, english, hass, rotation, logs, start });

export const SAMPLE_WEEK: WeekReport = {
  week: '2026-10-12', label: 'Week 12 · 12–16 Oct', call: 'YELLOW',
  callWhy: 'Two full days. Wednesday and Thursday each missed a block, and the device rule was only written down twice.',
  deviceRule: 2,
  days: [day('Mon', true, true, true, true, 6, '08:04'), day('Tue', true, true, true, true, 5, '08:11'), day('Wed', true, true, false, true, 4, '08:40'),
    day('Thu', true, false, true, false, 2, '09:15'), day('Fri', false, true, false, false, 1, null)],
  areas: [
    { area: 'English', now: 4, before: 4, note: '' }, { area: 'Mathematics', now: 4, before: 5, note: '' },
    { area: 'Science', now: 1, before: 1, note: '' }, { area: 'HASS', now: 3, before: 4, note: '' },
    { area: 'The Arts', now: 1, before: 0, note: '' }, { area: 'Health & PE', now: 3, before: 3, note: 'Training Mon and Wed, match Sunday' },
    { area: 'Technologies', now: 1, before: 1, note: '' }, { area: 'Languages', now: 0, before: 2, note: 'Thursday Duolingo slot was missed' },
  ],
  evidence: { submissions: 18, withFile: 15, unique: 13 },
  topics: [
    { area: 'Maths', topic: 'Ratios', weeks: 3, plateau: true },
    { area: 'English', topic: 'Holes, chapters 9–12', weeks: 1, plateau: false },
    { area: 'HASS', topic: 'Roman roads and the army', weeks: 2, plateau: false },
  ],
  flags: [
    { date: '2026-10-15', kind: 'Stale evidence', detail: 'Thursday Maths used the same screenshot as Tuesday.' },
    { date: '2026-10-16', kind: 'Incomplete entry', detail: 'Friday English has no topic or level.' },
  ],
  words: [
    { theme: 'Discipline', days: 4, quote: 'slow down and read the question' },
    { theme: 'Body', days: 3, quote: 'more sprint work before training' },
    { theme: 'Family', days: 2, quote: 'help Mum with dinner' },
  ],
  journals: { now: 2, before: [1, 0, 3] },
  strengths: ['Monday and Tuesday were full days, all four blocks done.', 'Maths was logged every school day.', 'Two journals, up from none two weeks ago.'],
  weaknesses: ['Thursday started at 9:15 and lost the English block.', 'No Turkish at all this week.', 'Ratios for the third week running.'],
  actions: ['Start every block by 8:05, laptop open at 8:00.', 'Do Duolingo Turkish first on Monday and Thursday.', 'Finish the ratios unit and move to percentages.'],
  sources: { tally: 31, notion: 31 },
};
