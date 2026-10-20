(function(root){
  'use strict';
  function createRevisionedSaveQueue(options){
    let tail=Promise.resolve();
    async function flush(){
      for(let attempt=0;attempt<5;attempt++){
        const result=await options.save(options.getState(),options.getRevision());
        if(result.conflict){
          const latest=await options.load();
          options.setRevision(latest.revision);
          options.mergeState(latest.state);
          continue;
        }
        options.setRevision(result.revision);
        options.onSaved(result);
        return result;
      }
      throw new Error('Progress changed in another session. Please try saving again.');
    }
    function enqueue(){
      const job=tail.then(flush);
      tail=job.catch(function(error){options.onError(error);});
      return job;
    }
    return {enqueue};
  }
  function mergeGrammarState(local,remote){
    if(!remote)return local;
    const merged={...remote,...local,variantIndex:Math.max(Number(remote.variantIndex)||0,Number(local.variantIndex)||0)};
    merged.theoryStep=Math.max(Number(local.theoryStep)||0,Number(remote.theoryStep)||0);
    merged.theoryDone=Boolean(local.theoryDone||remote.theoryDone);
    merged.current=!local.current||(local.current.phase==='theory'&&remote.current?.variantId)?remote.current:local.current;
    const history=new Map([...(remote.history||[]),...(local.history||[])].map(item=>[item.id,item]));
    merged.history=[...history.values()];
    if(local.current&&remote.current&&local.current.id===remote.current.id){
      const mergeRows=(older,newer)=>{
        const rows=new Map((older||[]).map(item=>[item.id,item]));
        (newer||[]).forEach(item=>{
          const previous=rows.get(item.id);
          if(!previous){rows.set(item.id,item);return;}
          const wrong=[...new Set([...(previous.wrong||[]),...(item.wrong||[])])];
          rows.set(item.id,{...previous,...item,wrong,
            ...(typeof previous.correct==='boolean'||typeof item.correct==='boolean'?{correct:Boolean(previous.correct||item.correct)}:{}),
            ...(typeof previous.firstTry==='boolean'||typeof item.firstTry==='boolean'?{firstTry:previous.firstTry!==false&&item.firstTry!==false&&wrong.length===0}:{})});
        });
        return [...rows.values()];
      };
      merged.current={...remote.current,...local.current,
        index:Math.max(Number(remote.current.index)||0,Number(local.current.index)||0),
        correct:Math.max(Number(remote.current.correct)||0,Number(local.current.correct)||0),
        complete:Boolean(remote.current.complete||local.current.complete),
        answers:mergeRows(remote.current.answers,local.current.answers),
        errorEvents:mergeRows(remote.current.errorEvents,local.current.errorEvents)};
      const farther=Number(remote.current.index)>Number(local.current.index)?remote.current:local.current;
      merged.current.flight=farther.flight;
    }
    return merged;
  }
  root.createRevisionedSaveQueue=createRevisionedSaveQueue;
  root.mergeGrammarState=mergeGrammarState;
  if(typeof module!=='undefined'&&module.exports)module.exports={createRevisionedSaveQueue,mergeGrammarState};
})(typeof globalThis!=='undefined'?globalThis:this);
