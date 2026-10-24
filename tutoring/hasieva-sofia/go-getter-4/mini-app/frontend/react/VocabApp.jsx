import FinishScene from './FinishScene.jsx';
import SuccessCelebration from "./SuccessCelebration.jsx";
import {roundOutcome} from "./block-result.mjs";
import Answer from "./VocabAnswer.jsx";
import {ActionButton, AudioControl, Reveal, ResultEntrance, MotionConfig} from "./VocabMotion.jsx";
import { stories, storyParts, storyProgress, repairWords } from "./story-practice.mjs";
import { taskStatus, vocabTaskStatus, vocabStatus, statusLabel } from './learning-status.mjs';
import { useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { createVocabController } from "./vocab-controller.mjs";
import { summary, wordStats, gap, mask } from "./vocab-ports.mjs";
const dayNotes = [
  "Day 1 · Find your gaps. Start with short rounds of 9 words. Check all 81 words at your own pace, with breaks. Review difficult spellings after each answer.",
  "Day 2 · Build confidence. Review your mistakes, then try the words in new sentences. Take short rounds and do one mini dictation on paper.",
  "Day 3 · Check yourself. Practise difficult words first. Then take the mixed dictation: answers appear at the end. Finish with a short dictation on paper."
];
function Head({ title, copy, children, compact=false }) {
  return <section className={"vocab-hero"+(compact?" is-compact":"")}>{children}<h1>{title}</h1><p className="vocab-intro">{copy}</p></section>;
}
function AudioButton({ controller:c, snapshot:s, item, context=false, variant=0 }) {
  return <AudioControl controller={c} snapshot={s} target={`${item.id}:${context}:${variant}`}
    play={()=>c.play(item,context,variant)} label="Listen"
    ariaLabel={context?"Listen to the sentence":"Listen to the word or phrase"} />;
}
function Library({ controller: c, snapshot: s }) {
  const status = vocabStatus(s.state, !window.TUTORING?.authenticated || s.message.confirmed);
  return <><Head title="Words that stay." copy="Listen. Recall. Write. Your space for words that stay with you."><div className="vocab-orbit">Aa</div></Head><button type="button" className="vocab-unit" data-learning-status={status} onClick={() => c.go("unit-2")}><span className="vocab-unit-number">02</span><div><p className="vocab-eyebrow">GO GETTER 4 / UNIT 2</p><h2>Home &amp; Housework</h2><p>81 words and phrases · 3 days of practice · dictation and new contexts</p></div><span className="vocab-cta">{statusLabel[status] || "Open"} →</span></button><p className="vocab-note">Models help you learn. Independent answers show what you remember.</p></>;
}
function Home({ controller:c, snapshot:s }) {
  const rounds=storyProgress(s.bank,s.state.events),independentUnlocked=rounds.some(round=>round.passed);
  const known = !window.TUTORING?.authenticated || s.message.confirmed;
  const story = taskStatus(rounds.every(round=>round.passed), s.state.session?.storyId || s.state.events.some(event=>event.mode==='exam'&&event.hinted), known);
  const repair = repairWords(s.state.events).length ? 'in-progress' : undefined;
  const independent = vocabTaskStatus(s.state, 'exam', 25, known, false);
  const statuses = [vocabTaskStatus(s.state,'listen',81,known), vocabTaskStatus(s.state,'context',81,known), repair, vocabTaskStatus(s.state,'letters',81,known), vocabTaskStatus(s.state,'exam',81,known,false), vocabTaskStatus(s.state,'paper',9,known)];
  const stats = summary(s.bank, s.state.events), options = [["Listen and write", stats.checked < 81 ? "Try the next unchecked words. No translation before you answer." : "A short mixed round, starting with difficult words.", () => c.start("listen", true)], ["Words in context", "Listen to new sentences and write the complete missing word or phrase.", () => c.start("context")], ["My difficult words", stats.weak ? `${stats.weak} words were incorrect in your latest independent attempt.` : "Practise the spelling. Remember every word in a phrase.", () => c.start("listen")], ["Build the spelling", "Complete the missing letters. This is supported practice, not an independent check.", () => c.start("letters")], ["Dictation · all 81", "Random order. No hints. Check your answers after the final word.", () => c.start("exam")], ["Paper dictation", "Take a blank sheet. Listen to 9 words or phrases, then check your own work.", () => c.start("paper")]];
  return <><button className="back-button" onClick={()=>c.go("")}>← All sets</button>
    <Head title="Home & Housework" copy="Practise spelling, one short round at a time." compact />
    {s.state.session && <ActionButton className="vocab-resume" data-learning-status="in-progress" onClick={()=>c.go("practice")}>Resume your exercise →</ActionButton>}
    <section className="story-plan" aria-labelledby="storyPlanTitle">
      <h2 id="storyPlanTitle">25-word story practice</h2>
      <p className="story-plan-copy">Listen and fill 25 gaps. First letters help you learn.</p>
      <div className="vocab-actions">
        <ActionButton className="vocab-action is-main" data-learning-status={story} disabled={s.saving} onClick={()=>c.start("exam",false,{story:true})}><strong>1 · Story gaps · 25</strong>{statusLabel[story]&&<span className="learning-status-label">{statusLabel[story]}</span>}<span>{rounds.filter(round=>round.passed).length} / {rounds.length} stories cleared · reach 85% to open the next.</span></ActionButton>
        <ActionButton className="vocab-action" data-learning-status={repair} disabled={s.saving} onClick={()=>c.start("listen",false,{repair:true})}><strong>2 · Repair my spellings</strong>{statusLabel[repair]&&<span className="learning-status-label">{statusLabel[repair]}</span>}<span>Recall difficult words without a model.</span></ActionButton>
        <ActionButton className="vocab-action" data-learning-status={independentUnlocked ? independent : undefined} disabled={s.saving||!independentUnlocked} onClick={()=>c.start("exam",false,{limit:25})}><strong>3 · Independent check · 25</strong>{independentUnlocked&&statusLabel[independent]&&<span className="learning-status-label">{statusLabel[independent]}</span>}<span>{independentUnlocked?"No first letters, hints or word list.":"Locked · reach 85% in a story first."}</span></ActionButton>
      </div>
      <p className="vocab-note">Story → repair → a 10–20 minute break → independent check. Aim for 25/25 twice, with a break between rounds.</p>
    </section>
    <Reveal label="My progress"><section className="vocab-stats">{[[stats.checked+"/81","checked by listening"],[stats.written+"/81","latest answer correct"],[stats.context+"/81","correct in context"],[stats.retained+"/81","confirmed on different days"]].map(([value,label])=><div className="vocab-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</section><p className="vocab-note">First-letter practice and answers with hints do not raise independent scores. Confirmation on different days does not yet measure long-term retention.</p></Reveal>
    <Reveal label="More practice"><nav className="vocab-days" aria-label="Practice focus">{["1 · Discover","2 · Practise","3 · Check"].map((label,index)=><ActionButton key={label} className="secondary" aria-pressed={s.state.day===index+1} disabled={s.saving} onClick={()=>c.day(index+1)}>{label}</ActionButton>)}</nav><p className="vocab-day-note">{dayNotes[s.state.day-1]}</p><div className="vocab-actions">{options.map(([title,copy,action],index)=><ActionButton key={title} className="vocab-action" data-learning-status={statuses[index]} disabled={s.saving} onClick={action}><strong>{title}</strong><span>{copy}</span>{statusLabel[statuses[index]]&&<span className="learning-status-label">{statusLabel[statuses[index]]}</span>}</ActionButton>)}</div><ActionButton className="secondary" onClick={()=>c.go("words")}>My 81 words →</ActionButton><p className="vocab-note">Four practice stories cover all 81 words and phrases. Work in short rounds and take breaks.</p></Reveal>
  </>;
}
function StoryParagraph({ parts, session }) {
  return <p className="story-text">{parts.map((part,index) => part.text ? <span key={index}>{part.text}</span> : <span key={index} className={"story-gap" + (part.number === session.index + 1 ? " is-current" : "")} data-gap-number={part.number}><sup>{part.number}</sup>{session.results[part.number-1]?.answer || part.cue}</span>)}</p>;
}
function StoryPractice({ controller:c, snapshot:s, item }) {
  const session=s.state.session,story=stories.find(story=>story.id===session.storyId);
  if (!story) return <p role="alert">This practice story is unavailable. Return to the plan and start a new round.</p>;
  const paragraphs=storyParts(story,s.bank),paragraph=Math.floor(session.index/5);
  return <><div className="vocab-session-head"><button className="back-button" onClick={()=>c.pause()}>← Pause</button><span>Gap {session.index+1} / 25 · Story practice</span></div>
    <div className="vocab-progress" role="progressbar" aria-label="Story progress" aria-valuemin={0} aria-valuemax={25} aria-valuenow={session.index}><span style={{transform:`scaleX(${session.index/25})`}} /></div>
    <section className="vocab-exercise"><h1>{story.title}</h1>
      <p className="story-instruction">Write the highlighted word. First letters are clues.</p>
      <StoryParagraph parts={paragraphs[paragraph]} session={session}/>
      <p className="story-current">Gap {session.index+1}: <strong>{paragraphs[paragraph].find(part=>part.number===session.index+1)?.cue}</strong></p>
      <div className="answer-workspace"><AudioControl controller={c} snapshot={s} target={`story:${story.id}:${paragraph}`} play={()=>c.playStory(story.id,paragraph)} label="Listen to this paragraph"/>
        {s.playing?.startsWith(`story:${story.id}:`) && s.playing!==`story:${story.id}:${paragraph}` && <ActionButton className="secondary audio-stop-near" preserveInput onClick={()=>c.stop()}>Stop audio</ActionButton>}
        <Answer key={session.id} controller={c} snapshot={s} item={item}/>
      </div>
      <Reveal label="Read the whole story · 25 gaps" className="story-overview"><AudioControl controller={c} snapshot={s} target={`story:${story.id}:all`} play={()=>c.playStory(story.id)} label="Listen to the whole story"/>{paragraphs.map((parts,index)=><StoryParagraph key={index} parts={parts} session={session}/>)}</Reveal>
      <p className="vocab-note">First-letter scores are guided practice, separate from independent spelling.</p>
    </section></>;
}
function Practice({ controller: c, snapshot: s }) {
  const session = s.state.session;
  useEffect(() => {
    if (!session) c.go("unit-2");
  }, [c, session]);
  if (!session) return null;
  if (session.index >= session.ids.length) return <Results controller={c} snapshot={s} />;
  const item = s.bank.items.find((word) => word.id === session.ids[session.index]);
  if (!item) return <p role="alert">This saved word is no longer in the set. Return to the plan and start a new round.</p>;
  if (session.storyId) return <StoryPractice controller={c} snapshot={s} item={item} />;
  const labels = { listen: "Listen and write", context: "In a new context", letters: "Build the spelling", exam: "Independent dictation", paper: "Paper dictation" }, result = session.feedback;
  return <><div className="vocab-session-head"><button className="back-button" onClick={() => c.pause()}>← Pause</button><span>{session.index + 1} / {session.ids.length} · {labels[session.mode]}</span></div><div className="vocab-progress"><span style={{ transform: `scaleX(${session.index / session.ids.length})` }} /></div><section className="vocab-exercise"><p className="vocab-eyebrow">UNIT 2 / YOUR TURN</p><h1>{session.mode === "paper" ? "Listen and write on paper." : session.mode === "context" ? "Which word fits here?" : "Listen. Recall. Write."}</h1>{session.mode === "context" && <><p className="vocab-context">{gap(item, session.variant)}</p><p className="vocab-note">{item.meaning}</p></>}{session.mode === "letters" && <><p>{item.meaning}</p><p className="vocab-mask">{mask(item)}</p></>}<AudioButton controller={c} snapshot={s} item={item} context={session.mode === "context"} variant={session.variant} />{session.mode === "paper" ? <><p className="vocab-note">Write the full word or phrase. Model answers appear after all nine items.</p><button className="primary" disabled={s.saving} onClick={() => c.next()}>Written · next →</button></> : result ? <><div role="status" className={"vocab-feedback" + (result.correct ? "" : " is-wrong")}><strong>{result.correct ? result.hinted ? "Correct with support." : "Correct on your own." : "Let’s review this one."}</strong><p>{item.english}</p>{!result.correct && <><p>Your answer: {result.answer}</p><p>{item.tip}</p></>}{(!result.correct || result.hinted) && <><p>{item.meaning}</p><p>{item.contexts[session.variant]}</p></>}</div><button className="primary" disabled={s.saving} onClick={() => c.next()}>Next →</button></> : <Answer key={session.id} controller={c} snapshot={s} item={item} />}</section></>;
}
function PaperRow({ controller: c, id, item, initial }) {
  const [checked, setChecked] = useState(initial), [pending, setPending] = useState(false);
  return <label className="vocab-paper-row"><input type="checkbox" checked={checked} disabled={pending} onChange={async (event) => {
    const previous = checked, value = event.target.checked;
    setChecked(value);
    setPending(true);
    const saved = await c.paperAnswer(id, value);
    if (!saved) setChecked(previous);
    setPending(false);
  }} /><span>{item.english}</span></label>;
}
function Results({ controller:c, snapshot:s }) {
  const session=s.state.session,outcome=roundOutcome(session),correct=outcome.correct;
  const [finishReady,setFinishReady]=useState(false);
  const [paperWasSaved]=useState(Boolean(session.paperSaved));
  const errors=session.results.filter(event=>event.correct===false);
  const paper=session.mode==="paper",selfCheck=paper&&!session.paperSaved;
  const scoreLabel=paper?"Self-check saved.":`${correct} / ${outcome.total} ${session.storyId?"answers correct with first-letter clues":outcome.supported?"answers correct with support":"independent answers correct"}`;
  return <ResultEntrance>{paper&&!selfCheck&&<FinishScene animated={!paperWasSaved}/>} {selfCheck?<><h1 className="result-title">Now check your paper.</h1><p className="vocab-intro">Tick only answers with no mistakes, including every word in a phrase.</p><div>{session.ids.map(id=>{const item=s.bank.items.find(word=>word.id===id);return <PaperRow key={id} controller={c} id={id} item={item} initial={Boolean(session.paperAnswers[id])}/>;})}</div><p className="vocab-note">This is your own self-check, separate from verified spelling.</p><ActionButton className="primary" disabled={s.saving||s.paperPending>0} onClick={()=>c.paperSave()}>Save self-check</ActionButton></>:<>
    {!paper?<SuccessCelebration key={session.id} outcome={outcome} label={scoreLabel} sessionId={session.id} completedNow={s.completedNow} onComplete={setFinishReady}/>:<h1 className={paper?"result-title":"result-score"} aria-label={scoreLabel}>{paper?scoreLabel:<><span>{correct} / {outcome.total}</span><small>{session.storyId?"answers correct with first-letter clues":outcome.supported?"answers correct with support":"independent answers correct"}</small></>}</h1>}
    {!paper&&<p className="block-outcome" role="status">{outcome.passed?`${outcome.percent}% · Block cleared.${session.storyId?" The next story and independent check are unlocked.":""}`:`${outcome.percent}% · Reach 85% to clear this block. Repair your mistakes, then try it again.`}</p>}
    <p className="vocab-intro">{paper?"Your paper self-check has been recorded.":session.storyId?"First-letter clues were provided. Repair mistakes without a model, then check independently after a break.":"Your independent answers for this round. Review mistakes after a break."}</p>
    {errors.length>0&&<><h2 className="result-section-title">Words to revisit</h2><ul className="vocab-result-list">{errors.map(event=>{const item=s.bank.items.find(word=>word.id===event.itemId);return <li key={event.requestId}><strong>{item.english}</strong><span>Your answer: {event.answer}</span><p>{item.tip}</p></li>;})}</ul></>}
    <div className="result-actions">{!paper&&finishReady&&<ActionButton className="primary" disabled={s.saving} onClick={()=>outcome.passed?c.start(session.mode,false,session.storyId?{story:true}:session.mode==="exam"&&outcome.total===25?{limit:25}:{}):c.start(session.mode,false,{retry:true})}>{outcome.passed?"Continue":"Try again"}</ActionButton>}{errors.length>0&&<ActionButton className="secondary" disabled={s.saving} onClick={()=>c.start("listen",false,{repair:true})}>Repair these spellings →</ActionButton>}
      <ActionButton className={paper?"primary":"secondary"} disabled={s.saving} onClick={()=>c.clear("unit-2")}>Back to the practice plan →</ActionButton></div>
    {session.mode==="exam"&&<p className="vocab-note">This round measures practice, not a guaranteed score on paper.</p>}
  </>}</ResultEntrance>;
}
function Words({ controller: c, snapshot: s }) {
  const session = s.state.session;
  if (session?.mode === "exam" && session.index < session.ids.length) return <><Head title="Finish the dictation first." copy="The word list is closed during a test. Continue, or end this round without a final score." /><button className="primary" onClick={() => c.go("practice")}>Continue dictation →</button><button className="secondary" disabled={s.saving} onClick={() => c.clear("words")}>End round and open word list</button></>;
  return <><button className="back-button" onClick={() => c.go("unit-2")}>← Unit 2</button><Head title="My 81 words." copy="Listen, notice the spelling and read the examples. Browsing the word list does not increase your score." /><div className="vocab-words">{s.bank.items.map((item) => {
    const stats = wordStats(s.state.events, item.id);
    return <article className="vocab-word" key={item.id}><strong>{item.english}</strong><p>{item.meaning}</p><p>{item.contexts[0]}</p><AudioButton controller={c} snapshot={s} item={item} /><small>{stats.listen.lastCorrect === true ? "Latest independent answer correct" : stats.listen.lastCorrect === false ? "Let’s practise the spelling" : "Not checked by listening yet"}</small></article>;
  })}</div></>;
}
function VocabApp({ controller: c }) {
  const s = useSyncExternalStore(c.subscribe, c.getSnapshot);
  useEffect(() => {
    c.boot();
    return () => c.dispose();
  }, [c]);
  useEffect(() => {
    const status = document.querySelector("#saveStatus");
    status.textContent = s.message.text;
    status.dataset.confirmed = String(s.message.confirmed);
  }, [s.message]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [s.hash]);
  if (s.loading) return <Head title="Vocab Space" copy="Loading your words and saved progress…" />;
  if (s.error) return <><h1>Could not open Vocab Space</h1><p className="vocab-error" role="alert">{s.error}</p><button className="secondary" onClick={() => location.reload()}>Try again</button></>;
  return s.hash === "practice" ? <Practice controller={c} snapshot={s} /> : s.hash === "words" ? <Words controller={c} snapshot={s} /> : s.hash === "unit-2" ? <Home controller={c} snapshot={s} /> : <Library controller={c} snapshot={s} />;
}
async function startApp() {
  try { await window.TUTORING?.sessionReady; if (window.TUTORING?.preview) throw new Error('Vocab tutor preview is not available here. This view never opens a separate learner profile.'); }
  catch (error) { const root=document.querySelector('#app'); root.setAttribute('role','alert'); root.textContent=error.message; return; }
const controller = createVocabController({ tg: window.Telegram?.WebApp, tutoring: window.TUTORING }), root = document.querySelector("#app");
root.dataset.renderer = "react";
createRoot(root).render(<MotionConfig reducedMotion="user"><VocabApp controller={controller} /></MotionConfig>);

}
startApp();
