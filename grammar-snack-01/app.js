(() => {
  'use strict';
  const UNIT='grammar-snack-01', BANK='../tutoring/hasieva-sofia/go-getter-4/grammar-snack-01/CONTENT_BANK.md';
  const tutoring=window.TUTORING, app=document.querySelector('#app');
  let revision=0, variants=[];
  const key='grammar-snack-01-v1'+(tutoring?.authenticated?':'+tutoring.userId:'');
  const fresh=()=>({kind:UNIT,variantIndex:0,history:[],current:null,theoryStep:0,theoryDone:false});
  let state=load();
  const normalise=value=>String(value||'').toLowerCase().trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
  const matches=(value,answer)=>{
    const expected=normalise(answer), actual=normalise(value);
    if(!expected.includes(';'))return actual===expected;
    return actual.split(/\s*[;,/]\s*/).map(normalise).join(';')===expected.split(';').map(normalise).join(';');
  };
  function load(){try{return {...fresh(),...JSON.parse(localStorage.getItem(key)||'{}')};}catch{return fresh();}}
  function persist(){localStorage.setItem(key,JSON.stringify(state)); document.querySelector('#scorePill').textContent=state.current?`${state.current.correct}/${state.current.index}`:'—';}
  const saveQueue=window.createRevisionedSaveQueue({getState:()=>structuredClone(state),getRevision:()=>revision,setRevision:value=>{revision=value;},save:(snapshot,expected)=>tutoring.call('save',snapshot,expected,UNIT),load:()=>tutoring.call('load',null,null,UNIT),mergeState:remote=>{state=window.mergeGrammarState(state,remote);persist();},onSaved:result=>tutoring.setStatus(result.delivery==='pending'?'Saved · tutor report is retrying.':'Saved · tutor report updated.'),onError:error=>tutoring.setStatus('Saved on this device. '+error.message)});
  function save(){persist();if(!tutoring?.authenticated||!state.current)return Promise.resolve();return saveQueue.enqueue();}
  function parseBank(text){
    return text.split(/^### Variant /m).slice(1).map(chunk=>{const lines=chunk.split('\n');const id=lines.shift().trim().slice(0,2);const items=lines.filter(line=>/^\|\s*\d+\s*\|/.test(line)).map(line=>{const c=line.split('|').slice(1,-1).map(x=>x.trim());return {id:c[0],type:c[1],prompt:c[2],answer:c[3],feedback:c[4]};});return {id,items};}).filter(v=>v.items.length===20);
  }
  function strip(text){return String(text).replace(/\*\*/g,'');}
  function card(){const el=document.createElement('section');el.className='snack-card';return el;}
  function startAttempt(){const variant=variants[state.variantIndex%variants.length];state.current={id:`v${variant.id}-${Date.now()}`,variantId:variant.id,index:0,correct:0,answers:[],errorEvents:[],complete:false};state.variantIndex++;save();renderTest();}
  const theory=[
    {title:'1 · Meaning',text:'Present Simple = habits, facts and timetables. Present Continuous = now, around now, or a temporary situation.',q:'Every day, Mia **(walks / is walking)** to college.',answer:'walks',why:'Every day shows a habit, so use Present Simple.'},
    {title:'2 · Form',text:'Simple: she works / she does not work / Does she work? Continuous: she is working / she is not working / Is she working?',q:'Look! She **(works / is working)** now.',answer:'is working',why:'Look! and now show an action in progress.'},
    {title:'3 · State verbs',text:'Know, need, want, understand, believe and own usually describe a state. Use Present Simple: I understand.',q:'I **(know / am knowing)** the answer.',answer:'know',why:'Know is usually a state verb, not an action now.'},
    {title:'4 · Special always',text:'He is always leaving his towel here! can show an annoying temporary behaviour.',q:'He **(always leaves / is always leaving)** his wet towel here this week!',answer:'is always leaving',why:'Always + Continuous can show annoying behaviour around now.'},
    {title:'5 · Choose by meaning',text:'Do not choose only by a time word. Ask: Is this a routine, a state, or something happening/temporary now?',q:'My dad usually drives, but today he **(takes / is taking)** the train.',answer:'is taking',why:'Usually is a habit; today is a temporary change.'}
  ];
  function renderLearn(){
    app.replaceChildren();const c=card();const step=Math.min(Number(state.theoryStep)||0,theory.length);
    c.innerHTML='<p class="snack-kicker">Grammar Snack 01 · B1</p><h1>Present Simple<br><span>vs Present Continuous</span></h1>';
    if(step===theory.length||state.theoryDone){c.insertAdjacentHTML('beforeend','<p>You finished five quick checks. Now take a 20-item mastery test.</p>');const button=document.createElement('button');button.className='primary';button.textContent='Start mastery test →';button.onclick=startAttempt;c.append(button);app.append(c);return;}
    const item=theory[step];c.insertAdjacentHTML('beforeend',`<p class="task-meta">Quick check ${step+1} / ${theory.length}</p><div class="theory-step"><strong>${item.title}</strong><span>${item.text}</span></div><h2>${strip(item.q)}</h2>`);const feedback=document.createElement('div');feedback.className='feedback-box';const list=document.createElement('div');list.className='choice-list';choices(item).forEach(option=>{const button=document.createElement('button');button.className='secondary choice';button.textContent=option;button.onclick=()=>{if(option!==item.answer){feedback.className='feedback-box wrong';feedback.textContent='Not yet. '+item.why;return;}state.theoryStep=step+1;state.theoryDone=state.theoryStep===theory.length;persist();feedback.className='feedback-box';feedback.textContent='Correct. '+item.why;setTimeout(renderLearn,300);};list.append(button);});c.append(list,feedback);app.append(c);
  }
  function choices(item){const hit=String(item.prompt||item.q||'').match(/\*\*\(([^)]+)\)\*\*/);return hit?hit[1].split('/').map(x=>x.trim()):null;}
  function renderTest(){
    const current=state.current;if(!current){renderLearn();return;} const variant=variants.find(v=>v.id===current.variantId);const item=variant.items[current.index];if(!item)return finish();
    app.replaceChildren();const c=card();const meta=document.createElement('div');meta.className='task-meta';meta.textContent=`Variant ${variant.id} · ${current.index+1} / 20 · ${item.type}`;c.append(meta);const h=document.createElement('h2');h.textContent=strip(item.prompt);c.append(h);const note=document.createElement('p');note.className='report-note';note.textContent='Say your answer first. Your tutor receives a saved error with this sentence and the rule.';c.append(note);const feedback=document.createElement('div');feedback.id='feedback';
    let advancing=false;
    const submit=value=>{if(!value||advancing)return;const correct=matches(value,item.answer);let answer=current.answers.find(a=>a.id===item.id);if(!answer){answer={id:item.id,type:item.type,q:strip(item.prompt),wrong:[],expected:item.answer,feedback:item.feedback,firstTry:true};current.answers.push(answer);}if(!correct){answer.firstTry=false;answer.wrong.push(value);current.errorEvents=current.errorEvents||[];current.errorEvents.push({id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,itemId:item.id,type:item.type,q:strip(item.prompt),wrong:value,expected:item.answer,feedback:item.feedback,at:new Date().toISOString()});save();feedback.className='feedback-box wrong';feedback.textContent=`Not yet. ${item.feedback}`;return;}advancing=true;answer.correct=true;current.correct++;current.index++;save();feedback.className='feedback-box';feedback.textContent=`Correct. ${item.feedback}`;setTimeout(renderTest,350);};
    const options=choices(item);if(options){const list=document.createElement('div');list.className='choice-list';options.forEach(option=>{const b=document.createElement('button');b.className='secondary choice';b.textContent=option;b.onclick=()=>submit(option);list.append(b);});c.append(list);}else{const input=document.createElement('input');input.className='answer-input';input.placeholder=item.answer.includes(';')?'Type both answers: use ;, , or /':'Type the complete answer';input.autocomplete='off';const b=document.createElement('button');b.className='primary';b.textContent='Check';b.onclick=()=>submit(input.value.trim());input.addEventListener('keydown',e=>{if(e.key==='Enter')b.click();});c.append(input,b);}
    c.append(feedback);app.append(c);
  }
  function finish(){const current=state.current;const score=Math.round(current.correct/20*100);if(!current.complete){current.complete=true;current.score=score;current.completedAt=new Date().toISOString();if(!state.history.some(item=>item.id===current.id))state.history.push({id:current.id,variantId:current.variantId,score,completedAt:current.completedAt});save();}app.replaceChildren();const c=card();c.innerHTML=`<p class="snack-kicker">Variant ${current.variantId} complete</p><div class="score">${score}%</div><h1>${score>=90?'Mastery reached':'Not yet — repair, then retry'}</h1><p>${score>=90?'You reached 18/20 or more. Your tutor has the sentence-by-sentence report.':'You need 18/20. Your next attempt uses a different equivalent test, not the same questions again.'}</p><p class="report-note">Every wrong response was saved with the task, your response, the correct answer and a clear rule.</p>`;const b=document.createElement('button');b.className='primary';b.textContent=score>=90?'Back to My Learning':'Try a new version →';b.onclick=score>=90?()=>location.assign('../tutoring/#catalog'):startAttempt;c.append(b);app.append(c);}
  async function boot(){try{const response=await fetch(BANK);variants=parseBank(await response.text());if(variants.length!==10)throw new Error('The practice bank is unavailable.');if(tutoring?.authenticated){const loaded=await tutoring.call('load',null,null,UNIT);revision=loaded.revision;state=loaded.state||state;await save();}if(state.current?.complete)finish();else if(state.current)renderTest();else renderLearn();}catch(error){app.textContent='Grammar Snack cannot start yet. '+error.message;}}
  boot();
})();
