import type { Answers, Paper, Result } from './types';
export class AssessmentError extends Error { constructor(message:string, public status=400){ super(message); } }
export function validateMonth(month: string): string {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new AssessmentError('Choose a valid month.');
  return month;
}
export function publicPaper(paper:Paper,reveal=false):Paper {
  return {...paper,questions:paper.questions.map(q=>{ if(reveal)return q; const {answer,explanation,rubric,...publicQuestion}=q; return publicQuestion; })};
}
export function validateAnswers(paper:Paper, input:unknown):Answers {
  if(!input || typeof input!=='object' || Array.isArray(input))throw new AssessmentError('Answers must be an object.');
  const answers:Answers={};
  for(const [id,value] of Object.entries(input)){
    const q=paper.questions.find(q=>q.id===id);
    if(!q)throw new AssessmentError('Unknown question.');
    if(q.type==='choice'){
      if(!Number.isInteger(value)|| typeof value!=='number'||value<0||value>=(q.options?.length??0))throw new AssessmentError('Choose a valid answer.');
    }else if(typeof value!=='string'||value.length>8000)throw new AssessmentError('Written answers must be at most 8,000 characters.');
    answers[id]=value as string|number;
  }
  return answers;
}
export function validateMarks(paper:Paper,input:unknown):Record<string,number>{
  if(!input||typeof input!=='object'||Array.isArray(input))throw new AssessmentError('Mark every written answer.');
  const marks=input as Record<string,number>, written=paper.questions.filter(q=>q.type==='written');
  if(Object.keys(marks).length!==written.length||written.some(q=>!Number.isInteger(marks[q.id])||marks[q.id]<0||marks[q.id]>2))throw new AssessmentError('Mark every written answer from 0 to 2.');
  return marks;
}
export function grade(paper:Paper,answers:Answers,marks?:Record<string,number>):Result {
  const objective=paper.questions.filter(q=>q.type==='choice'),written=paper.questions.filter(q=>q.type==='written');
  const objectiveCorrect=objective.filter(q=>answers[q.id]===q.answer).length;
  const writtenPending=written.filter(q=>marks?.[q.id]===undefined).length;
  const writtenPoints=written.reduce((n,q)=>n+(marks?.[q.id]??0),0),writtenTotal=written.length*2;
  const percentage=writtenPending?null:Math.round(100*(objectiveCorrect+writtenPoints)/(objective.length+writtenTotal||1));
  const gaps=paper.questions.filter(q=>q.type==='choice'?answers[q.id]!==q.answer:marks?.[q.id]!==undefined&&marks[q.id]<2).map(q=>q.prompt);
  const summary=writtenPending?`${objective.length?`${objectiveCorrect}/${objective.length} automatically marked. `:''}${writtenPending} written answers await Nihal’s review. Completion is recorded; understanding is not yet confirmed.`:percentage!>=75?'Strong understanding. Explain any missed questions in your correction.':'Revisit the gaps with Nihal, then write a correction in your own words.';
  return {objectiveCorrect,objectiveTotal:objective.length,writtenPending,writtenPoints,writtenTotal,percentage,summary,gaps};
}
