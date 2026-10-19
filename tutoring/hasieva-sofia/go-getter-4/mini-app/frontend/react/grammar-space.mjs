import {createMissionOrder,optionIdAt} from '../../../../../../shared/cosmo-engine/cosmo-engine.js';
import {choices,strip} from './grammar-data.mjs';

export const COURSE_MS=20000;
export function alternativeCourse(item){
  if(item.type==='correction')return strip(item.prompt).replace(/^Correct:\s*/,'');
  const swap={is:'are',are:'is',am:'is',do:'does',does:'do'};
  if(/\b(is|are|am|do|does)\b/i.test(item.answer))return item.answer.replace(/\b(is|are|am|do|does)\b/i,word=>{
    const value=swap[word.toLowerCase()];return /^[A-Z]/.test(word)?value[0].toUpperCase()+value.slice(1):value;
  });
  const word=item.answer;
  return /ies$/.test(word)?word.slice(0,-3)+'y':/(ches|shes|sses|xes|oes)$/.test(word)?word.slice(0,-2):/s$/.test(word)?word.slice(0,-1):word+'s';
}
export function flightQuestion(item,seed) {
  let state=2166136261;
  for(const char of String(seed)+':'+item.id)state=Math.imul(state^char.charCodeAt(0),16777619)>>>0;
  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const options=(choices(item)||[item.answer,alternativeCourse(item)]).map((text,index)=>({id:item.id+':'+index,text}));
  return createMissionOrder([{id:item.id,stage:2,options}],random)[0];
}

export function flightAnswer(question,index) {
  const id=optionIdAt(question,index);
  return question.options.find(option=>option.id===id)?.text||null;
}

export function flightStats(current) {
  const answers=current.answers||[],hits=answers.filter(answer=>answer.firstTry===false).length;
  let streak=0;
  for(let index=answers.length-1;index>=0;index--){if(!answers[index].correct||!answers[index].firstTry)break;streak++;}
  return {hull:Math.max(0,100-hits*5),hits,streak};
}
