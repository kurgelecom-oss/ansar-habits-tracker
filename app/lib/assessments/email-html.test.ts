import { describe, expect, it } from 'vitest';
import { PALETTES, day, daysBetween, email, rowsCard, tidyTitle } from './email-html';
import { approvalHtml, dueHtml, feedbackHtml } from './delivery';
import type { Paper } from './types';

const paper = (over: Partial<Paper>): Paper => ({ id: 'p', kind: 'review', month: '2026-10', due_date: '2026-10-31', opens_on: '2026-10-01', subject: 'English', title: 'English · 2026-10 monthly assessment', status: 'draft', duration_minutes: null, questions: [], lessons: [], coverage_note: '', ...over });

describe('parent email HTML', () => {
  it('tidies repeated subjects and ISO dates', () => {
    expect(tidyTitle('English', 'English · 2026-10 monthly assessment')).toBe('October monthly assessment');
    expect(tidyTitle('All subjects', 'Friday review · week ending 2026-10-09')).toBe('Friday review · week ending Fri 9 Oct');
    expect(day('2026-10-31')).toBe('Sat 31 Oct');
    expect(daysBetween('2026-09-04', '2026-10-26')).toBe(52);
  });
  it('escapes content and stays inline-styled for Gmail', () => {
    const html = email(PALETTES.approval, { kicker: 'k', title: '<b>x</b>', sub: 's' }, [rowsCard(PALETTES.approval, 'l', [{ title: 'A & B', pill: '1' }])], 'f');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).not.toMatch(/ class=|<style|<svg|data:/);
  });
  it('gives each email type its own palette', () => {
    const today = '2026-10-26';
    expect(approvalHtml(today, [paper({})])).toContain(PALETTES.approval.accent);
    expect(feedbackHtml(today, [paper({ due_date: '2026-09-04' })])).toContain(PALETTES.feedback.accent);
    expect(dueHtml(today, [paper({ status: 'published' })])).toContain(PALETTES.due.accent);
  });
  it('flags work waiting over two weeks, oldest first', () => {
    const html = feedbackHtml('2026-10-26', [paper({ title: 'Recent', due_date: '2026-10-23' }), paper({ title: 'Old', due_date: '2026-09-04' })]);
    expect(html).toContain('52 days');
    expect(html.indexOf('Old')).toBeLessThan(html.indexOf('Recent'));
    expect(html).toContain('#C8442F');
  });
});
