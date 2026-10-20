import GrammarSpace from './GrammarSpace.jsx';
import GrammarFinish from './GrammarFinish.jsx';
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { createGrammarController } from "./grammar-controller.mjs";
import { theory, choices, strip } from "./grammar-data.mjs";
function Response({ item, answer, disabled }) {
  const [value, setValue] = useState(""), options = choices(item);
  return options ? <div className="choice-list">{options.map((option) => <button key={option} className="secondary choice" disabled={disabled} onClick={() => answer(option)}>{option}</button>)}</div> : <form onSubmit={(event) => {
    event.preventDefault();
    answer(value.trim());
  }}><label className="visually-hidden" htmlFor="grammar-answer">Your answer</label><input id="grammar-answer" className="answer-input" autoComplete="off" placeholder={item.answer.includes(";") ? "Type both answers: use ;, , or /" : "Type the complete answer"} value={value} disabled={disabled} onChange={(event) => setValue(event.target.value)} /><button className="primary" disabled={disabled}>Check</button></form>;
}
function GrammarPath({ s, open }) {
  const state=s.state, current=state.current, history=state.history||[], best=history.length?Math.max(...history.map(attempt=>attempt.score||0)):null;
  const step=state.theoryDone?theory.length:Math.min(state.theoryStep||0,theory.length), passed=best!==null&&best>=90;
  return <section className="snack-card grammar-path" aria-label="Grammar learning path">
    <p className="snack-kicker">Grammar Snack · Topic 01</p><h1>Present Simple<br/><span>vs Present Continuous</span></h1>
    <p>Your learning path</p><progress aria-label="Topic stages completed" max="3" value={Number(state.theoryDone)+Number(history.length>0)+Number(passed)}/>
    <ol className="grammar-stages">
      <li data-status={state.theoryDone?'done':'current'}><span className="snack-kicker">01 · {state.theoryDone?'Completed':'Available now'}</span><h2>Learn the rules</h2><p>{step} of {theory.length} quick checks completed</p>
        <ol className="grammar-checks">{theory.map((item,index)=><li key={item.title}><span>{item.title}</span><strong>{index<step?'Done':index===step?'Next':'Locked'}</strong></li>)}</ol>
        {!state.theoryDone&&<button className="primary" onClick={()=>open(false)}>{step?'Continue learning':'Start learning'}</button>}</li>
      <li data-status={!state.theoryDone?'locked':history.length?'done':'current'}><span className="snack-kicker">02 · {!state.theoryDone?'Locked':history.length?'Completed':'Available now'}</span><h2>Grammar Orbit</h2><p>{!state.theoryDone?'Complete all five rule checks to unlock your flight.':current?.variantId&&!current.complete?`${current.index} of 20 sectors completed. Resume your mission.`:'20 sectors · 20 seconds to choose each course'}</p><button className="primary" disabled={!state.theoryDone} onClick={()=>open(true)}>{!state.theoryDone?'Flight locked':current?.variantId&&!current.complete?'Resume mission':history.length?'Fly again':'Start mission'}</button></li>
      <li data-status={passed?'done':history.length?'current':'locked'}><span className="snack-kicker">03 · {passed?'Completed':history.length?'Keep practising':'Locked'}</span><h2>Topic mastery</h2><p>{best===null?'Finish a mission to reveal your result.':`Best first-try score: ${best}% · Target: 90%`}</p><p>{history.length} completed {history.length===1?'mission':'missions'}</p>{history.length>0&&<ul>{history.slice(-5).reverse().map(attempt=><li key={attempt.id}>Mission {attempt.variantId} · {attempt.score}%</li>)}</ul>}</li>
    </ol><a href="../tutoring/#catalog">← All learning</a>
  </section>;
}
function GrammarApp({ controller: c }) {
  const [pathVisible,setPathVisible]=useState(location.hash!=="#practice");
  const showPath=()=>{location.hash="path";setPathVisible(true);};
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot), current = s.state.current;
  const initialFinished=useRef(current?.complete?current.id:null), initialTheoryDone=useRef(Boolean(s.state.theoryDone));
  useEffect(() => {
    c.boot();
    return () => c.dispose();
  }, [c]);
  useEffect(() => {
    document.querySelector("#scorePill").textContent = current?.phase !== "theory" && current ? `${current.correct}/${current.index}` : "—";
  }, [s]);
  if (window.TUTORING?.gated) return null;
  const error = s.error && <p role="status" className="vocab-error">{s.error} <button className="secondary" onClick={() => s.variants.length ? c.save() : c.boot()}>Try again</button> <a href="../tutoring/#catalog">Back to My Learning</a></p>;
  if (s.loading) return <section className="snack-card"><p role="status">Opening your Grammar Snack…</p></section>;
  if (!s.variants.length) return <section className="snack-card"><h1>Grammar Snack</h1>{error}</section>;
  if (pathVisible) return <><GrammarPath s={s} open={mission=>{if(mission&&(!current?.variantId||current.complete))c.startAttempt();location.hash="practice";setPathVisible(false);}}/>{error}</>;
  if (current?.complete) return <section className="snack-card"><GrammarFinish key={current.id} current={current} fresh={initialFinished.current!==current.id} onContinue={()=>current.score>=90?showPath():c.startAttempt()}><p className="snack-kicker">Variant {current.variantId} complete</p><h1>{current.score>=90?'Mastery reached':'Repair, then retry'}</h1><p className="report-note">Check the save status for tutor delivery. Review the rules behind your mistakes before your next attempt.</p>{error}</GrammarFinish></section>;
  if (current?.variantId) {
    const variant = s.variants.find((v) => v.id === current.variantId), item2 = variant?.items[s.shown];
    if (!item2) return <section className="snack-card">{error || <p role="alert">This saved test version is unavailable. Return to My Learning and contact your tutor.</p>}</section>;
    return <><GrammarSpace current={current} item={item2} shown={s.shown} feedback={s.feedback} disabled={s.advancing} onAnswer={c.answer} onCheckpoint={c.checkpointFlight} onOverview={showPath}/>{error}</>;
  }
  const item = theory[s.theoryIndex];
  return <section className="snack-card"><button className="secondary" onClick={showPath}>← Learning path</button><p className="snack-kicker">Grammar Snack 01 · B1</p><h1>Present Simple<br /><span>vs Present Continuous</span></h1>{!item || s.state.theoryDone && !s.advancing ? <GrammarFinish current={current||{id:"theory-restored",phase:"theory"}} fresh={!initialTheoryDone.current} onContinue={()=>c.startAttempt()}><p>You finished five quick checks. Your final mission has 20 grammar challenges. Choose a course or type the answer; mistakes trigger a meteor hit and a repair. First-try answers determine your final score.</p></GrammarFinish> : <><p className="task-meta">Quick check {s.theoryIndex + 1} / {theory.length}</p><div className="theory-step"><strong>{item.title}</strong><span>{item.text}</span></div><h2>{strip(item.q)}</h2><Response key={"theory:" + s.theoryIndex} item={item} answer={c.answerTheory} disabled={s.advancing} /><div aria-live="polite" className={s.feedback ? `feedback-box ${s.feedback.wrong ? "wrong" : ""}` : void 0}>{s.feedback?.text}</div></>}{error}</section>;
}
const controller = createGrammarController({ tutoring: window.TUTORING, storage: localStorage, request: fetch, createQueue: window.createRevisionedSaveQueue, mergeState: window.mergeGrammarState });
const root = document.querySelector("#app");
root.dataset.renderer = "react";
createRoot(root).render(<GrammarApp controller={controller} />);
