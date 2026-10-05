import { describe, expect, it } from 'vitest';
import { GATE_START, MASTERY_PASS, lockFor, schoolDaysBetween } from './gate';

const FRI = '2026-10-09', SAT = '2026-10-10', MON = '2026-10-12';
const review = (due: string, status = 'published') =>
  ({ id: `review:${due}:week`, kind: 'review' as const, title: `Friday recall · week ending ${due}`, status, due_date: due, opens_on: due });
const exam = (subject: string, status = 'published') =>
  ({ id: `exam:2026-10:${subject}`, kind: 'exam' as const, title: `${subject} exam`, status, due_date: '2026-10-31', opens_on: '2026-10-25' });
const handedIn = (paper_id: string, at: string) => ({ paper_id, status: 'submitted', submitted_at: at });

describe('the assessment lock', () => {
  it('locks on the Friday a review is due and names it', () => {
    const lock = lockFor(FRI, [review(FRI)], [], false);
    expect(lock.locked).toBe(true);
    if (lock.locked) { expect(lock.due.map(d => d.id)).toEqual([`review:${FRI}:week`]); expect(lock.message).toContain('Friday recall'); }
  });

  it('opens as soon as he hands it in, without waiting for marking', () => {
    expect(lockFor(FRI, [review(FRI)], [handedIn(`review:${FRI}:week`, '2026-10-09T03:00:00Z')], false)).toEqual({ locked: false });
  });

  it('stays locked on later days until a missed review is done', () => {
    expect(lockFor(SAT, [review(FRI)], [], false).locked).toBe(true);
    expect(lockFor(MON, [review(FRI)], [], false).locked).toBe(true);
  });

  it('is not lifted by a paper he has only started', () => {
    expect(lockFor(FRI, [review(FRI)], [{ paper_id: `review:${FRI}:week`, status: 'in_progress', submitted_at: null }], false).locked).toBe(true);
  });

  it('never locks on papers from before the rule began', () => {
    expect('2026-09-18' < GATE_START).toBe(true);
    expect(lockFor(FRI, [review('2026-09-18')], [], false)).toEqual({ locked: false });
  });

  it('does not lock on an exam a parent has not approved', () => {
    expect(lockFor('2026-10-26', [exam('maths', 'draft')], [], false)).toEqual({ locked: false });
  });

  it('spreads the month\'s exams over the school days left', () => {
    const eight = ['maths', 'english', 'hass', 'science', 'tech', 'languages', 'arts', 'pe'].map(s => exam(s));
    // Mon 26 Oct: the window's school days are Mon to Fri, 5 of them. 8 over 5 is 2 today.
    const monday = lockFor('2026-10-26', eight, [], false);
    expect(monday.locked && monday.due.length).toBe(2);
    // After two are handed in that day, the board opens.
    const done = [handedIn('exam:2026-10:maths', '2026-10-26T01:00:00Z'), handedIn('exam:2026-10:english', '2026-10-26T02:00:00Z')];
    expect(lockFor('2026-10-26', eight, done, false)).toEqual({ locked: false });
    // Friday 30 Oct with one left: it locks until that one is done.
    const lastOne = eight.slice(0, 7).map(p => handedIn(p.id, '2026-10-27T01:00:00Z'));
    const friday = lockFor('2026-10-30', eight, lastOne, false);
    expect(friday.locked && friday.due.length).toBe(1);
  });

  it('does not ask for an exam on a weekend or outside its window', () => {
    expect(lockFor('2026-10-31', [exam('maths')], [], false)).toEqual({ locked: false });   // Saturday
    expect(lockFor('2026-10-20', [exam('maths')], [], false)).toEqual({ locked: false });   // before it opens
  });

  it('is lifted for the day by a parent', () => {
    expect(lockFor(FRI, [review(FRI)], [], true)).toEqual({ locked: false });
  });

  it('locks again when an exam is marked under the pass mark, until he has corrected it', () => {
    const NOV = '2026-11-02';
    const marked = (pct: number, correction: string | null = null) =>
      ({ ...handedIn('exam:2026-10:maths', '2026-10-28T03:00:00Z'), result: { percentage: pct }, correction });
    expect(lockFor(NOV, [exam('maths')], [marked(MASTERY_PASS)], false)).toEqual({ locked: false });
    const lock = lockFor(NOV, [exam('maths')], [marked(MASTERY_PASS - 1)], false);
    expect(lock.locked).toBe(true);
    if (lock.locked) expect(lock.message).toContain('correction');
    expect(lockFor(NOV, [exam('maths')], [marked(50, 'I mixed up the denominators.')], false)).toEqual({ locked: false });
    expect(lockFor('2026-11-01', [exam('maths')], [marked(50)], false)).toEqual({ locked: false });   // a Sunday
  });

  it('never asks for a pass on a level check', () => {
    const check = { ...exam('maths'), id: 'placement:2026-10:maths' };
    expect(lockFor('2026-11-02', [check], [{ ...handedIn(check.id, '2026-10-28T03:00:00Z'), result: { percentage: 40 }, correction: null }], false)).toEqual({ locked: false });
  });

  it('counts school days', () => {
    expect(schoolDaysBetween('2026-10-26', '2026-10-31')).toBe(5);
    expect(schoolDaysBetween('2026-10-31', '2026-10-31')).toBe(0);
  });
});
