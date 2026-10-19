import {useCallback, useState} from 'react';
import {createRoot} from 'react-dom/client';
import SuccessCelebration from './SuccessCelebration.jsx';

function CelebrationPreview() {
  const [run,setRun] = useState(1), [ready,setReady] = useState(false), [percent,setPercent] = useState(88);
  const complete = useCallback(value => setReady(value), []);
  const outcome = {percent,passed:percent>=85,correct:percent,total:100,supported:false};
  function replay(next=percent) {setPercent(next);setReady(false);setRun(value=>value+1);}
  return <main className="shell vocab-shell preview-shell">
    <p className="vocab-kicker">MOTION PREVIEW · NO PROGRESS SAVED</p>
    <h1 className="preview-title">A finish worth feeling.</h1>
    <p>Speedometer + full-screen confetti rain. The same animation used after a completed Vocab block.</p>
    <SuccessCelebration key={run} outcome={outcome} label={`${percent}% correct`} sessionId={`demo-${run}`} completedNow={`demo-${run}`} onComplete={complete} effectKind="confetti"/>
    <div className="preview-action" aria-live="polite">{ready?<button className="primary" onClick={()=>replay()}>{outcome.passed?'Continue':'Try again'}</button>:<p>Finishing your run…</p>}</div>
    <fieldset className="preview-controls"><legend>Try a result</legend>{[84,85,88,100].map(value=><button type="button" className="secondary" key={value} aria-pressed={percent===value} onClick={()=>replay(value)}>{value}%</button>)}</fieldset>
    <button type="button" className="secondary" onClick={()=>replay()}>Replay animation ↻</button>
    <p className="report-note">85% unlocks Continue. Below 85%, Try again appears. Reduced Motion shows the result immediately.</p>
    <a href="../tutoring/#catalog">Back to My Learning →</a>
  </main>;
}
createRoot(document.querySelector('#app')).render(<CelebrationPreview/>);
