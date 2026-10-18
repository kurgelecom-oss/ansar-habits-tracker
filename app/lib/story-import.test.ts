import { describe, expect, it } from 'vitest';
import { codeBlockText, FALLBACK_IMAGE, validateStory } from './story-import';
import { SAMPLE_STORY } from './story-sample';

const { weekStart: _w, status: _s, ...written } = SAMPLE_STORY;

describe('validateStory', () => {
  it('accepts a well-formed story and publishes it for that Monday', () => {
    const s = validateStory({ ...written, image: { src: 'https://cdn.example/x.png', alt: 'x' } }, '2026-10-26');
    expect(typeof s).toBe('object');
    expect(s).toMatchObject({ weekStart: '2026-10-26', status: 'published' });
  });
  it('uses the fallback image when the image is missing or not https', () => {
    expect((validateStory({ ...written, image: { src: '/local.jpg', alt: 'x' } }, '2026-10-26') as any).image).toEqual(FALLBACK_IMAGE);
  });
  it('rejects a non-Monday, a bad answer index and missing lenses', () => {
    expect(validateStory(written, '2026-10-27')).toMatch(/not a Monday/);
    expect(validateStory({ ...written, questions: written.questions.map(q => ({ ...q, answer: 9 })) }, '2026-10-26')).toMatch(/answer/);
    expect(validateStory({ ...written, lenses: [] }, '2026-10-26')).toMatch(/lenses/);
  });
});

describe('codeBlockText', () => {
  it('joins the chunks of the first code block', () => {
    expect(codeBlockText([{ type: 'paragraph' }, { type: 'code', code: { rich_text: [{ plain_text: '{"a":' }, { plain_text: '1}' }] } }])).toBe('{"a":1}');
  });
});
