import { useEffect, useState, useSyncExternalStore } from "react";
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
function GrammarApp({ controller: c }) {
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot), current = s.state.current;
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
  if (current?.complete) return <section className="snack-card"><p className="snack-kicker">Variant {current.variantId} complete</p><div className="score">{current.score}%</div><h1>{current.score >= 90 ? "Mastery reached" : "Not yet — repair, then retry"}</h1><p>{current.score >= 90 ? "You reached 18/20 or more. Check the save status for tutor delivery." : "You need 18/20. Your next attempt uses a different equivalent test, not the same questions again."}</p><p className="report-note">Wrong responses are retained with the task, your response, the correct answer and the rule. Check the save status above for server confirmation.</p><button className="primary" onClick={() => current.score >= 90 ? location.assign("../tutoring/#catalog") : c.startAttempt()}>{current.score >= 90 ? "Back to My Learning" : "Try a new version →"}</button>{error}</section>;
  if (current?.variantId) {
    const variant = s.variants.find((v) => v.id === current.variantId), item2 = variant?.items[s.shown];
    if (!item2) return <section className="snack-card">{error || <p role="alert">This saved test version is unavailable. Return to My Learning and contact your tutor.</p>}</section>;
    return <section className="snack-card"><div className="task-meta">Variant {variant.id} · {s.shown + 1} / 20 · {item2.type}</div><h2>{strip(item2.prompt)}</h2><p className="report-note">Say your answer first. Your tutor receives a saved error with this sentence and the rule.</p><Response key={current.id + ":" + s.shown} item={item2} answer={c.answer} disabled={s.advancing} /><div id="feedback" aria-live="polite" className={s.feedback ? `feedback-box ${s.feedback.wrong ? "wrong" : ""}` : void 0}>{s.feedback?.text}</div>{error}</section>;
  }
  const item = theory[s.theoryIndex];
  return <section className="snack-card"><p className="snack-kicker">Grammar Snack 01 · B1</p><h1>Present Simple<br /><span>vs Present Continuous</span></h1>{!item || s.state.theoryDone && !s.advancing ? <><p>You finished five quick checks. Now take a 20-item mastery test.</p><button className="primary" onClick={() => c.startAttempt()}>Start mastery test →</button></> : <><p className="task-meta">Quick check {s.theoryIndex + 1} / {theory.length}</p><div className="theory-step"><strong>{item.title}</strong><span>{item.text}</span></div><h2>{strip(item.q)}</h2><Response key={"theory:" + s.theoryIndex} item={item} answer={c.answerTheory} disabled={s.advancing} /><div aria-live="polite" className={s.feedback ? `feedback-box ${s.feedback.wrong ? "wrong" : ""}` : void 0}>{s.feedback?.text}</div></>}{error}</section>;
}
const controller = createGrammarController({ tutoring: window.TUTORING, storage: localStorage, request: fetch, createQueue: window.createRevisionedSaveQueue, mergeState: window.mergeGrammarState });
const root = document.querySelector("#app");
root.dataset.renderer = "react";
createRoot(root).render(<GrammarApp controller={controller} />);
