import { describe,it,expect } from 'vitest';
import { grade, publicPaper, validateAnswers, validateMarks, validateMonth } from './engine';
import type { Paper } from './types';
const paper: Paper={id:'p',kind:'exam',month:'2026-09',due_date:'2026-09-30',opens_on:'2026-09-24',subject:'Maths',title:'Maths',status:'published',duration_minutes:25,lessons:[],coverage_note:'',questions:[{id:'q1',type:'choice',prompt:'2+2',options:['4','5'],answer:0,explanation:'Add',sourceIds:[]},{id:'q2',type:'written',prompt:'Explain',rubric:'reasoning',sourceIds:[]}]};
describe('assessment integrity',()=>{
 it('does not mistake completion for mastery before written review',()=>{expect(grade(paper,{q1:0,q2:'Because'}).percentage).toBeNull();expect(grade(paper,{q1:0,q2:'Because'}).objectiveCorrect).toBe(1)});
 it('counts unanswered objective questions and combines rubric scores',()=>{const r=grade(paper,{}, {q2:1});expect(r.percentage).toBe(33);expect(r.writtenPending).toBe(0)});
 it('never exposes answer keys or rubrics before submission',()=>{const p=publicPaper(paper,false);expect(p.questions[0]).not.toHaveProperty('answer');expect(p.questions[0]).not.toHaveProperty('explanation');expect(p.questions[1]).not.toHaveProperty('rubric')});
 it('retains explanations after submission',()=>expect(publicPaper(paper,true).questions[0].answer).toBe(0));
 it('rejects unknown answers, bad choice index and oversized text',()=>{expect(()=>validateAnswers(paper,{forged:1})).toThrow();expect(()=>validateAnswers(paper,{q1:2})).toThrow();expect(()=>validateAnswers(paper,{q2:'x'.repeat(8001)})).toThrow()});
 it('requires all written marks and rejects injected choice marks',()=>{expect(()=>validateMarks(paper,{})).toThrow();expect(()=>validateMarks(paper,{q2:2,q1:1})).toThrow();expect(()=>validateMarks(paper,{q2:2})).not.toThrow()});
 it('validates calendar months instead of accepting arbitrary date text',()=>{expect(validateMonth('2026-09')).toBe('2026-09');expect(()=>validateMonth('2026-13')).toThrow();expect(()=>validateMonth('2026-1')).toThrow()});
});
