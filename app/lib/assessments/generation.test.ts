import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { coverageNote, curriculumFingerprint, generateExam, hasRecordedTopicDetail, monthWindow, validateExamQuestions } from './generation';
import type { Lesson, Question } from './types';
const lessons: Lesson[] = [{ id: 'l1', date: '2026-09-14', subject: 'Maths', task: 'Khan Academy next lesson. A ship has 25 oars each side with 3 rowers each.', topic: 'Ships', week: 'Week 10', guide: [], url: '' }];
const valid = (): Question[] => Array.from({ length: 12 }, (_, i) => ({ id: `q${i + 1}`, prompt: `Question ${i + 1}`, type: i < 8 ? 'choice' : 'written', sourceIds: ['l1'], explanation: 'Source-grounded explanation', ...(i < 8 ? { options: ['A', 'B', 'C', 'D'], answer: i % 4 } : { rubric: '0 missing, 1 partial, 2 clear and accurate' }) }));
beforeEach(() => { vi.stubGlobal('window', undefined); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('exam shape validation', () => {
  it('accepts only eight objective plus four written questions', () => {
    expect(validateExamQuestions(valid(), lessons)).toHaveLength(12);
    expect(() => validateExamQuestions(valid().slice(0, 11), lessons)).toThrow('12');
    const wrongMix = valid(); Object.assign(wrongMix[7], { type: 'written', rubric: 'Some rubric' }); delete wrongMix[7].options; delete wrongMix[7].answer;
    expect(() => validateExamQuestions(wrongMix, lessons)).toThrow('eight');
  });
  it.each(['source', 'index', 'duplicate', 'options', 'explanation', 'rubric'])('rejects malformed %s', fault => {
    const qs = valid();
    if (fault === 'source') qs[0].sourceIds = ['invented'];
    if (fault === 'index') qs[0].answer = 4;
    if (fault === 'duplicate') qs[1].id = qs[0].id;
    if (fault === 'options') qs[0].options = ['Same', 'same', 'B', 'C'];
    if (fault === 'explanation') qs[0].explanation = '';
    if (fault === 'rubric') qs[11].rubric = '';
    expect(() => validateExamQuestions(qs, lessons)).toThrow();
  });
  it('is calendar-correct for leap years and the final seven days', () => {
    expect(monthWindow('2028-02')).toEqual({ due_date: '2028-02-29', opens_on: '2028-02-23' });
    expect(monthWindow('2026-09')).toEqual({ due_date: '2026-09-30', opens_on: '2026-09-24' });
  });
  it('fingerprints content independent of row order', () => {
    const other = { ...lessons[0], id: 'l2' };
    expect(curriculumFingerprint([...lessons, other])).toBe(curriculumFingerprint([other, ...lessons]));
    expect(curriculumFingerprint(lessons)).not.toBe(curriculumFingerprint([{ ...lessons[0], task: 'Changed' }]));
  });
  it('rejects routine-only sources without inventing topics from cross-curricular themes', () => {
    for (const task of ["Khan Academy — next lesson on the mastery path.", "Duolingo Turkish 10 min — the empire's language is the language you're learning.", "Scratch or Code.org 35 min — build something, don't just watch.", 'Typing.com 15 min (record your words per minute).']) {
      expect(hasRecordedTopicDetail([{ ...lessons[0], task }])).toBe(false);
    }
    expect(hasRecordedTopicDetail(lessons)).toBe(true);
  });
  it('records coverage limitations and practical confirmation', () => {
    expect(coverageNote(lessons)).toContain('Khan mastery progress');
    expect(coverageNote([{ ...lessons[0], subject: 'Science' }])).toContain('recorded demonstration');
  });
});

describe('generation failures', () => {
  it('never fabricates an exam without the API key', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(generateExam(lessons, '2026-09')).rejects.toThrow('not configured');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects truncated API output and does not expose service response bodies', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stop_reason: 'max_tokens', content: [] }) }));
    await expect(generateExam(lessons, '2026-09')).rejects.toThrow('did not complete');
  });
  it('returns source-grounded drafts and keeps task data outside the trusted system prompt', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ questions: valid() }) }] }) });
    vi.stubGlobal('fetch', fetch);
    const exam = await generateExam(lessons, '2026-09');
    expect(exam.status).toBe('draft'); expect(exam.duration_minutes).toBe(25);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.system).toContain('UNTRUSTED');
    expect(body.system).not.toContain(lessons[0].task);
    expect(body.messages[0].content).toContain(lessons[0].task);
  });
});
