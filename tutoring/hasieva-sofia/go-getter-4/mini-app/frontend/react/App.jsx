import { mountEntrySync } from './entry-sync.mjs';
import SuccessCelebration from './SuccessCelebration.jsx';
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { assetURL, mountCatalogMiso, mountHalloweenBoot } from "./mascot.js";
import { daySeen, weeklyItems, reviewErrors } from "./progress.mjs";
import { dayStatus, grammarStatus, vocabStatus, taskStatus, statusLabel } from './learning-status.mjs';
import { openStore } from './vocab-ports.mjs';
const go = (hash) => {
  location.hash = hash;
};
const moment = (value) => new Date(value).toLocaleString(void 0, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const mark = (value) => value.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
function PreviewPanel({ snapshot: s }) {
  const d = s.diagnostics;
  if (!s.preview || !d) return null;
  const rows = d.rowsForUnit || [], row = rows.find((row2) => String(row2.id) === String(d.learnerId));
  const bits = [row ? `Progress row updated ${moment(row.updated)}` : "Progress row not found"];
  if (row?.summary) bits.push(`${row.summary.completedDays} of 7 days marked complete · ${row.summary.answers} answers saved`);
  bits.push(`${d.history?.snapshots || 0} history snapshots`);
  if (rows.length > 1) bits.push(`${rows.length} rows for this unit`);
  if (d.resultsRows?.length) bits.push(`Results: ${d.resultsRows.map((row2) => `${row2.day} ${row2.answers}`).join(" · ")}`);
  if (d.recovered) bits.push(`restored ${d.recovered} days from history`);
  const url = s.browserToken ? `${location.origin}${location.pathname}?preview=${encodeURIComponent(s.browserToken)}` : null;
  return <div className="preview-panel"><p className="preview-note">{bits.join(" · ")}</p>{url && <p className="preview-link"><span>Open this same view in a browser:</span> <a href={url}>{url.replace(/^https?:\/\//, "")}</a> <CopyButton text={url} /></p>}</div>;
}
function CopyButton({ text, id, children = "Copy link" }) {
  const [label, setLabel] = useState(children);
  return <button id={id} className="text-button" type="button" onClick={async () => {
    try {
      await navigator.clipboard.writeText(text);
      setLabel("Copied!");
    } catch {
      setLabel("Select the text below");
    }
  }}>{label}</button>;
}
function Catalog({ controller: c, snapshot: s }) {
  const miso = useRef(null);
  const [modules, setModules] = useState({});
  const progress = weeklyItems(c.data, s.state, s.evidence);
  const personal = c.tutoring.authenticated && !s.preview;
  useEffect(() => {
    if (s.preview) return;
    let disposed = false, latest = 0;
    async function refresh() {
      let store, revision = ++latest;
      try {
        const known = !personal || c.tutoring.entrySyncPending === false;
        const grammar = JSON.parse(localStorage.getItem('grammar-snack-01-v1' + (personal ? ':' + c.tutoring.userId : '')) || '{}');
        store = await openStore(personal ? `telegram:${c.tutoring.userId}` : 'preview');
        const vocab = await store.load();
        if (!disposed && revision === latest) setModules({ grammar: grammarStatus(grammar, known), vocab: vocabStatus(vocab, known) });
      } catch { if (!disposed && revision === latest) setModules({}); }
      finally { store?.close(); }
    }
    void refresh();
    window.addEventListener('learning-progress-ready', refresh);
    return () => { disposed = true; window.removeEventListener('learning-progress-ready', refresh); };
  }, [c, personal, s.preview, s.restored]);
  useEffect(() => {
    mountCatalogMiso();
    const node = miso.current;
    return () => node?.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
  }, []);
  return <><section className="catalog-head"><p className="section-note">{s.preview ? "Sonya’s profile · Read-only preview" : personal ? "Sonya’s profile" : "Device-only practice"}</p><h1>{personal ? "Sonya’s learning." : s.preview ? "Sonya’s learning preview." : "Practise here."}<br /><span>One unit at a time.</span></h1>
    <button ref={miso} id="catalogMiso" className="catalog-miso" type="button" aria-label="Tap Miso while he studies"><span className="catalog-miso__stage"><picture><source type="image/webp" srcSet={assetURL("assets/mascot/study/miso-studying-book-840.webp")} /><img className="catalog-miso__base" src={assetURL("assets/mascot/study/miso-studying-book.png")} width="1084" height="1451" decoding="async" alt="Miso, focused on his book" /></picture>{[0, 1, 2].map((i) => <img key={i} className="catalog-miso__reaction" alt="" aria-hidden="true" decoding="async" />)}</span></button><p>Choose a unit and pick up where you left off.</p></section>
    {!personal&&!s.preview&&<section className="privacy-note" aria-label="Connect your personal profile"><div><strong>This is device-only practice.</strong><p>These results belong to this browser. Sonya’s saved learning progress is available after connecting her profile.</p><p>Open this app in Telegram, choose <strong>Continue in browser</strong>, then open the private browser link on this device.</p></div></section>}
    {s.preview&&<p className="preview-note">Read-only preview. Practice here does not change Sonya’s saved progress.</p>}
    <PreviewPanel snapshot={s} /><section aria-labelledby="unitsTitle"><div className="section-heading"><div><p className="section-note">Your collection</p><h2 id="unitsTitle">Learning units</h2></div></div><div id="unitGrid" className="unit-grid">
    {c.tutoring.units.map((unit, index) => {
    const waiting = c.tutoring.authenticated && !s.restored && !unit.independent && !s.preview;
    const status = !unit.available || waiting ? undefined : unit.id === 'street-style' ? taskStatus(c.data.days.every(day => s.state.days[day.id]?.complete), Object.values(s.state.days).some(day => dayStatus(day) !== 'not-started'), s.restored) : unit.id === 'grammar-snack-01' ? modules.grammar : unit.id === 'vocab-space' ? modules.vocab : undefined;
    const action = waiting ? "Connecting…" : unit.available ? unit.independent ? "Open →" : Object.values(s.state.days).some((day) => day.index || day.complete) ? "Continue →" : "Start →" : "Coming soon";
    return <button key={unit.id} className="unit-card" data-learning-status={status} disabled={!unit.available || waiting} onClick={() => unit.href ? location.assign(unit.href) : go("home")}><span className="unit-number">{unit.number || String(index + 1).padStart(2, "0")}</span><span className="unit-copy"><small>{unit.subtitle}</small><strong>{unit.title}</strong><span>{unit.description}</span><span className="unit-progress">{unit.id === "street-style" ? `${progress.done} of ${progress.total} challenges done` : ""}</span>{statusLabel[status] && <small className="learning-status-label">{statusLabel[status]}</small>}</span><span className="unit-action">{action}</span></button>;
  })}
    </div></section><p className="catalog-footer">Your next unit will appear here when it is ready.</p></>;
}
function Home({ controller: c, snapshot: s }) {
  const progress = weeklyItems(c.data, s.state, s.evidence), next = c.data.days.findIndex((day) => !s.state.days[day.id]?.complete), connected = c.tutoring?.authenticated || s.preview;
  return <><button className="back-button" id="catalogButton" onClick={() => go("catalog")}>← All units</button><section className="hero" aria-labelledby="homeTitle"><div className="hero-copy"><h1 id="homeTitle">Wear the words.<br /><span>Own the week.</span></h1><p>Complete one 20 to 25 minute mission each day. {connected ? "Your tutor receives your results privately." : "Your work stays on this device."}</p></div><div className="week-pass" aria-label="Weekly progress"><div className="pass-row"><span>ACCESS</span><strong>ALL AREAS</strong></div><div className="pass-code">WEEK / 01</div><div className="progress-copy"><strong id="overallLabel">Route complete</strong><span id="overallPercent">{progress.pct}%</span></div><div className="progress-track"><span id="overallBar" style={{ transform: `scaleX(${progress.pct / 100})` }} /></div><div className="pass-name">SPEAK / WRITE / REMEMBER</div></div></section><PreviewPanel snapshot={s} />
    <section className="route-section" aria-labelledby="routeTitle"><div className="section-heading"><div><p className="section-note">Weekly call sheet</p><h2 id="routeTitle">Your seven fittings</h2></div></div><div className="day-grid" id="dayGrid">{c.data.days.map((day, index) => {
    const saved = s.state.days[day.id], done = Boolean(saved?.complete), seen = daySeen(day, s.state, s.evidence), mistakes = (saved?.answers || []).filter((answer) => answer.correct === false).length;
    const status = dayStatus(saved, s.restored || s.preview, seen);
    return <article key={day.id} className={`day-card ${done ? "done" : ""}`}><button className="day-open" data-learning-status={status} onClick={() => go(`day-${index + 1}`)}><span className="day-number">{String(index + 1).padStart(2, "0")}</span><h3>{day.title}</h3><p>{day.short}</p>{statusLabel[status] && <span className="learning-status-label">{statusLabel[status]}</span>}</button><div className="day-actions"><span className="day-status">{done ? "Completed" : status === 'in-progress' ? `Finish this${seen ? ` · ${seen} of ${day.questions.length} done` : ''}` : statusLabel[status] || 'Loading progress…'}</span>{(done || index === next || mistakes > 0 || seen >= day.questions.length) && <button className="day-retry" data-learning-status={status} onClick={() => go(`${!done && !mistakes ? "day" : "review"}-${index + 1}`)}>{done ? "Try again" : index === next ? status === 'in-progress' ? 'Continue' : "Start" : "Run for a score"} <span aria-hidden="true">→</span></button>}</div></article>;
  })}</div></section>
    <section className="badge-section"><div className="section-heading"><div><p className="section-note">Proof of practice</p><h2>Patch rail</h2></div></div><div className="badge-grid" id="badgeGrid">{c.data.badges.map((badge) => {
    const earned = s.state.badges.includes(badge.id);
    return <div key={badge.id} className={`badge ${earned ? "earned" : ""}`}><span className="badge-icon">{earned ? mark(badge.name) : "LOCK"}</span><strong>{badge.name}</strong><small>{badge.desc}</small></div>;
  })}</div></section>
    <section className="privacy-note"><span className="privacy-mark" aria-hidden="true">{connected ? "PRIVATE" : "LOCAL"}</span><div><strong>{connected ? "Your personal learning space" : "Private by design"}</strong><p>{connected ? "Your progress and writing are saved for your tutor. Audio stays on this device." : "No account. No audio upload. Your answers stay in this browser."}</p></div></section></>;
}
function Recorder() {
  const resource = useRef({ active: true }), [label, setLabel] = useState("● Start recording"), [disabled, setDisabled] = useState(false), [source, setSource] = useState(""), [recording, setRecording] = useState(false);
  useEffect(() => {
    const r = resource.current;
    r.active = true;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setLabel("Recorder unavailable: practise aloud");
      setDisabled(true);
    }
    return () => {
      r.active = false;
      if (r.recorder) {
        r.recorder.onstop = null;
        r.recorder.ondataavailable = null;
        if (r.recorder.state === "recording") r.recorder.stop();
      }
      r.stream?.getTracks().forEach((track) => track.stop());
      if (r.url) URL.revokeObjectURL(r.url);
    };
  }, []);
  async function record() {
    const r = resource.current;
    if (r.recorder?.state === "recording") {
      r.recorder.stop();
      setRecording(false);
      setLabel("● Record again");
      return;
    }
    setDisabled(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!r.active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      r.stream = stream;
      r.recorder = new MediaRecorder(stream);
      const chunks = [];
      r.recorder.ondataavailable = (e) => chunks.push(e.data);
      r.recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!r.active) return;
        if (r.url) URL.revokeObjectURL(r.url);
        r.url = URL.createObjectURL(new Blob(chunks, { type: r.recorder.mimeType }));
        setSource(r.url);
        setRecording(false);
      };
      r.recorder.start();
      setLabel("■ Stop recording");
      setRecording(true);
      setDisabled(false);
    } catch {
      if (r.active) {
        r.stream?.getTracks().forEach((track) => track.stop());
        setLabel("Microphone blocked: practise aloud");
        setDisabled(true);
      }
    }
  }
  return <><button className={`secondary ${recording ? "recording" : ""}`} id="recordButton" disabled={disabled} onClick={record}>{label}</button><audio id="playback" controls className={source ? "" : "hidden"} src={source || void 0} /></>;
}
function Production({ controller: c, snapshot: s, item }) {
  const writing = item.type === "writing", prompts = writing ? item.checks : item.prompts;
  const [text, setText] = useState(s.state.days[s.session.day.id]?.drafts?.[s.session.index] || ""), [checks, setChecks] = useState(prompts.map(() => false));
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const checklist = <div className="checklist">{prompts.map((prompt, index) => <label className="check-item" key={index}><input type="checkbox" data-check={index} checked={checks[index]} onChange={(event) => setChecks(checks.map((value, i) => i === index ? event.target.checked : value))} /><span>{prompt}</span></label>)}</div>;
  return writing ? <><p className="prompt-note">Write freely. This task uses a self-check because good writing can have many correct answers.</p><textarea className="writing-box" id="writingBox" placeholder="Write here…" maxLength={4e3} value={text} onChange={(event) => {
    setText(event.target.value);
    c.draft(event.target.value);
  }} />{checklist}<div className="actions"><span className="prompt-note" id="wordCount">{words} words · aim for {item.minWords}+</span><button className="primary" id="nextButton" disabled={words < item.minWords || checks.some((value) => !value)} onClick={() => c.production(text, checks)}>Save &amp; continue</button></div></> : <><div className="word-chips">{prompts.map((prompt) => <span className="word-chip" key={prompt}>{prompt}</span>)}</div><div className="recorder"><p><strong>Voice Booth</strong><br /><span className="prompt-note">Record, listen, improve. The audio stays on this device and disappears when you leave the page.</span></p><Recorder />{checklist}</div><div className="actions"><button className="primary" id="nextButton" disabled={checks.some((value) => !value)} onClick={() => c.production("", checks)}>Finish mission</button></div></>;
}
function Question({ controller: c, snapshot: s }) {
  const { session } = s, item = session.items[session.index], feedback = session.feedback;
  const [value, setValue] = useState("");
  return <><div className="round-label">Challenge {session.index + 1} / {session.items.length}</div><h2 className="question">{item.q}</h2><p className="prompt-note">Say the complete answer aloud before you continue.</p><div id="interaction">
    {item.type === "mc" && <div className="options">{item.options.map((option) => <button key={option} className={`option ${session.answered && option === item.a ? "correct" : session.wrongAnswers.includes(option) ? "wrong" : ""}`} disabled={session.answered} onClick={() => c.answer(option)}>{option}</button>)}</div>}
    {item.type === "type" && <input className="answer-input" id="answerInput" autoComplete="off" autoCapitalize="sentences" placeholder="Type your answer" value={value} disabled={session.answered} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      c.answer(value);
    }
  }} />}
    {["mc", "type"].includes(item.type) && <div className="actions"><button className={`secondary ${session.answered || !session.wrongThisQuestion || !item.hint?.length ? "hidden" : ""}`} id="hintButton" onClick={() => c.hint()}>{session.hintLevel >= item.hint?.length ? "Show hint again" : "Need a hint"}</button>{item.type === "type" && !session.answered && <button className="primary" id="checkButton" onClick={() => c.answer(value)}>Check</button>}<button className={`primary ${session.answered ? "" : "hidden"}`} id="nextButton" onClick={() => c.advance()}>Continue</button></div>}
    {["writing", "speaking"].includes(item.type) && <Production key={item.q} controller={c} snapshot={s} item={item} />}</div><div id="feedback" aria-live="polite">{feedback && <div className={feedback.kind === "hint" ? "hint" : `feedback ${feedback.kind}`}><strong>{feedback.kind === "ok" ? "Correct." : feedback.kind === "hint" ? `Hint ${session.hintLevel}:` : "Not yet."}</strong> {feedback.text}</div>}</div></>;
}
function Review({ controller: c, snapshot: s }) {
  const errors = reviewErrors(c.data, s.state, s.view.dayNumber), index = Math.min(s.view.index, Math.max(errors.length - 1, 0)), error = errors[index];
  if (!error) return <><div className="round-label">Review</div><h2 className="question">Nothing to review.</h2><p className="prompt-note">Every answer in your last attempt was correct.</p><div className="review-actions"><button className="primary" id="startAttempt" onClick={() => go(`retry-${s.view.dayNumber}`)}>Try again →</button></div></>;
  return <><div className="review-head"><span className="round-label">Error {index + 1} of {errors.length}</span><span className="review-count">{index + 1}/{errors.length}</span></div><h2 className="question">{error.q}</h2><div className="review-row"><span className="review-label">You answered</span><p className="review-answer wrong">{error.wrong.join(" · ")}</p></div><div className="review-row"><span className="review-label">Correct</span><p className="review-answer ok">{error.expected}</p></div><div className="review-row"><span className="review-label">Why</span>{error.hint.length ? <ul className="review-why">{error.hint.map((line, i) => <li key={i}>{line}</li>)}</ul> : <p className="review-answer">Say the correct answer aloud and compare it with what you wrote.</p>}</div><div className="review-actions"><button className="secondary" id="prevError" disabled={index === 0} onClick={() => c.reviewAt(index - 1)}>← Previous</button>{index < errors.length - 1 ? <button className="primary" id="nextError" onClick={() => c.reviewAt(index + 1)}>Next mistake →</button> : <button className="primary" id="startAttempt" onClick={() => go(`retry-${s.view.dayNumber}`)}>Start a new attempt →</button>}</div></>;
}
function Completion({ controller: c, snapshot: s }) {
  const saved = s.state.days[c.data.days[s.view.dayNumber - 1].id] || {}, runs = saved.runs || [], fresh = s.view.kind === "complete", score = fresh ? s.view.score : Math.max(saved.score || 0, ...runs.map((run) => Number(run.score) || 0)), errors = reviewErrors(c.data, s.state, s.view.dayNumber);
  const [finishReady,setFinishReady] = useState(false);
  const shownRun = runs.find(run=>fresh?run.at===s.view.at:Number(run.score)===score);
  const finishId = `street-${s.view.dayNumber}-${s.view.at||saved.lastAttemptAt}`;
  const all = c.data.days.every((day) => s.state.days[day.id]?.complete), summary = ["Street Style Quest: weekly summary", ...c.data.days.map((day, i) => `Day ${i + 1}: ${s.state.days[day.id]?.complete ? `${s.state.days[day.id].score}%` : "not complete"}`), `Badges: ${s.state.badges.length}/${c.data.badges.length}`, `XP: ${s.state.xp}`].join("\n");
  return <div className="completion">{(!fresh||s.completion.ready)&&<SuccessCelebration key={finishId} outcome={{percent:score,correct:shownRun?.correct||0,total:shownRun?.total||0,passed:score>=70,passPercent:70,supported:true}} label={`${score}% practice score`} sessionId={finishId} completedNow={fresh&&s.completion.ready?finishId:null} onComplete={setFinishReady}/>}<h2>{score >= 70 ? "Fitting complete" : "Good practice"}</h2><p>{fresh ? score >= 70 ? "You earned today’s mastery patch." : "Repeat this fitting tomorrow to strengthen the difficult words." : `Best score ${score}%. ${errors.length ? `${errors.length} mistakes from your last attempt are waiting to be reviewed.` : "Your last attempt had no mistakes to review."}`}</p>
    {fresh ? <><p className="attempt-line">Attempt {s.view.runs} · {moment(s.view.at)}</p><p className="sync-note" id="completionSync">{s.completion.text}</p></> : <ul className="attempt-list">{runs.map((run, i) => <li key={run.at}><span>Attempt {i + 1}</span><strong>{Number(run.score) || 0}%</strong><small>{moment(run.at)}</small></li>)}</ul>}
    <div className="completion-actions">{fresh ? <>{errors.length > 0 && <button className="secondary" id="reviewMistakes" onClick={() => go(`review-${s.view.dayNumber}`)}>Review {errors.length} mistake{errors.length === 1 ? "" : "s"}</button>}<button className="primary" id="routeButton" disabled={!s.completion.ready||!finishReady} onClick={() => go("home")}>{!s.completion.ready?"Saving result…":!finishReady?"Finishing your run…":"Back to the route"}</button></> : <button className="primary" id="tryAgain" onClick={() => go(`${errors.length ? "review" : "retry"}-${s.view.dayNumber}`)}>Try again →</button>}</div>
    {fresh && all && <><CopyButton id="summaryButton" text={summary}>Copy tutor summary</CopyButton><pre className="summary-box" id="summaryBox">{summary}</pre></>}</div>;
}
function Mission({ controller: c, snapshot: s }) {
  const day = c.data.days[s.view.dayNumber - 1], review = s.view.kind === "review", errors = review ? reviewErrors(c.data, s.state, s.view.dayNumber) : [], session = s.session;
  const progress = s.view.kind === "mission" ? session.index / session.items.length : review ? errors.length ? (s.view.index + 1) / errors.length : 1 : 1;
  return <><section className="mission-head"><button className="back-button" id="backButton" onClick={() => go("home")}><span aria-hidden="true">←</span> Weekly route</button><div className="mission-number" id="missionNumber">{review ? "Review · " : ""}Day {s.view.dayNumber} of 7</div><h1 id="missionTitle">{day.title}</h1><p id="missionIntro">{review ? "Read what went wrong and why, then run this fitting again." : day.intro}</p><div className="mission-meta"><span id="missionTime">{review ? `${errors.length} MISTAKES` : `TIME · ${day.time}`}</span><span id="missionReward">{s.view.kind === "mission" ? `${session.items.length} CHALLENGES` : review ? "REVIEW" : `${s.state.days[day.id]?.runs?.length || 0} ATTEMPTS`}</span></div><div className="progress-track mission-progress"><span id="missionBar" style={{ transform: `scaleX(${progress})` }} /></div></section><section className="game-card" id="gameCard">{s.view.kind === "mission" ? <Question key={`${s.view.dayNumber}:${session.index}`} controller={c} snapshot={s} /> : review ? <Review controller={c} snapshot={s} /> : <Completion controller={c} snapshot={s} />}</section></>;
}
function App({ controller: c }) {
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot);
  useEffect(() => {
    mountHalloweenBoot();
    const stopSync = mountEntrySync({controller:c,tutoring:c.tutoring,storage:localStorage});
    return () => { stopSync(); c.dispose(); };
  }, [c]);
  useEffect(() => {
    document.querySelector("#xpValue").textContent = s.state.xp || 0;
    document.querySelector("#app").inert = Boolean(c.tutoring?.authenticated && !s.restored && s.view.kind !== "catalog" && !s.preview);
    if (s.preview) document.body.dataset.preview = "1";
  }, [c, s]);
  if (c.tutoring?.gated) return null;
  return s.view.kind === "catalog" ? <Catalog controller={c} snapshot={s} /> : s.view.kind === "home" ? <Home controller={c} snapshot={s} /> : <Mission controller={c} snapshot={s} />;
}
export {
  App as default
};
