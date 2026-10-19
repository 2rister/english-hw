/**
 * Data-only core for Learn Core's timed space missions.
 * A game supplies questions, stage timing and its own UI/checkpoint adapter.
 */
export const COSMO_ENGINE_VERSION='1.0.0';

export function shuffle(items,random=Math.random){
  const result=items.slice();
  for(let index=result.length-1;index>0;index--){
    const swap=Math.floor(random()*(index+1));[result[index],result[swap]]=[result[swap],result[index]];
  }
  return result;
}

export function createMissionOrder(questions,random=Math.random){
  const stages=[...new Set(questions.map(question=>question.stage))].sort((left,right)=>left-right);
  return stages.flatMap(stage=>shuffle(questions.filter(question=>question.stage===stage),random).map(question=>({...question,options:shuffle(question.options,random)})));
}

export function stageSeconds(question,timing){
  const seconds=timing?.[`stage${question?.stage}`];
  if(!Number.isFinite(seconds)||seconds<=0)throw new Error(`Missing positive duration for stage ${question?.stage}`);
  return seconds;
}

export function optionIdAt(question,index){
  return Number.isInteger(index)&&question?.options?.[index] ? question.options[index].id : null;
}

export function isLockedStage(question){return question?.stage===1;}
