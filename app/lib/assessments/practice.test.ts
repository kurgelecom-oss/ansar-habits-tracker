import {describe,expect,it} from 'vitest';
import {practicePaper,practiceSourceStatus} from './practice';
import {assessmentScopeFilter} from './service';

describe('parent practice fixtures',()=>{
 it('describes fictional rehearsal without exposing learner curriculum status',()=>{
  const status=practiceSourceStatus();
  expect(status).toContain('Fictional sample papers');
  expect(status).toContain('No learner curriculum or progress is inferred');
  expect(status).toContain('Send labelled practice report');
 });
 it('selects only the requested attempt scope while background expiry remains global',()=>{
  expect(assessmentScopeFilter('practice')).toEqual({method:'eq',args:['paper_snapshot->>is_practice','true']});
  expect(assessmentScopeFilter('learner')).toEqual({method:'or',args:['paper_snapshot->>is_practice.eq.false,paper_snapshot->>is_practice.is.null']});
  expect(assessmentScopeFilter()).toBeNull();
 });
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
