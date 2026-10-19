import {useEffect,useSyncExternalStore} from 'react';
import {createRoot} from 'react-dom/client';
import {createGrammarController} from './grammar-controller.mjs';
import GrammarSpace from './GrammarSpace.jsx';
import GrammarFinish from './GrammarFinish.jsx';
const controller=createGrammarController({
  tutoring:{preview:true,saving(){},setStatus(){},call:async()=>({revision:0,state:{theoryDone:true,theoryStep:5}})},
  storage:{getItem:()=>null,setItem(){}},request:fetch,
  createQueue:window.createRevisionedSaveQueue,mergeState:window.mergeGrammarState
});
function MissionPreview(){
  const s=useSyncExternalStore(controller.subscribe,controller.getSnapshot),current=s.state.current;
  useEffect(()=>{let active=true;controller.boot().then(()=>{if(active)controller.startAttempt();});return()=>{active=false;controller.dispose();};},[]);
  if(!current)return <p role="status">{s.error||'Preparing your mission preview…'}</p>;
  if(current.complete)return <section className="snack-card"><GrammarFinish current={current} fresh onContinue={()=>current.score>=90?location.assign("../tutoring/#catalog"):controller.startAttempt()}><h1>Mission complete</h1><p>Preview only. No progress was saved.</p></GrammarFinish></section>;
  const variant=s.variants.find(value=>value.id===current.variantId),item=variant?.items[s.shown];
  return item?<GrammarSpace current={current} item={item} shown={s.shown} feedback={s.feedback} disabled={s.advancing} onAnswer={controller.answer} onCheckpoint={controller.checkpointFlight}/>:null;
}
createRoot(document.querySelector('#app')).render(<MissionPreview/>);
