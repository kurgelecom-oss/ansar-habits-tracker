import {describe,expect,it} from 'vitest';
import {practicePaper} from './practice';

describe('parent practice fixtures',()=>{
 it('creates a deterministic published ten-minute exam with eight choices and four written prompts',()=>{
  const paper=practicePaper('exam','2026-09-20','fixed-id');
  expect(paper).toMatchObject({id:'practice-exam-fixed-id',kind:'exam',month:'2026-09',opens_on:'2026-09-20',due_date:'2026-09-20',status:'published',duration_minutes:10,is_practice:true});
  expect(paper.questions.filter(q=>q.type==='choice')).toHaveLength(8);
  expect(paper.questions.filter(q=>q.type==='written')).toHaveLength(4);
  expect(paper.questions.every(q=>q.sourceIds.length===1)).toBe(true);
 });
 it('creates a published untimed review with four written prompts',()=>{
  const paper=practicePaper('review','2026-09-20','fixed-id');
  expect(paper).toMatchObject({id:'practice-review-fixed-id',kind:'review',status:'published',duration_minutes:null,is_practice:true});
  expect(paper.questions).toHaveLength(4);
  expect(paper.questions.every(q=>q.type==='written')).toBe(true);
 });
});
