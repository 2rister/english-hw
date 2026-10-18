import { stories, storyParts } from "./story-practice.mjs";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { createVocabController } from "./vocab-controller.mjs";
import { summary, wordStats, gap, mask } from "./vocab-ports.mjs";
const dayNotes = [
  "Day 1 · Find your gaps. Start with short rounds of 9 words. Check all 81 words at your own pace, with breaks. Review difficult spellings after each answer.",
  "Day 2 · Build confidence. Review your mistakes, then try the words in new sentences. Take short rounds and do one mini dictation on paper.",
  "Day 3 · Check yourself. Practise difficult words first. Then take the mixed dictation: answers appear at the end. Finish with a short dictation on paper."
];
function Head({ title, copy, children }) {
  return <section className="vocab-hero">{children}<p className="vocab-eyebrow">VOCAB SPACE / UNIT 02</p><h1>{title}</h1><p className="vocab-intro">{copy}</p></section>;
}
function AudioButton({ controller: c, snapshot: s, item, context = false, variant = 0 }) {
  return <button type="button" className="vocab-play" aria-label={context ? "Listen to the sentence" : "Listen to the word or phrase"} disabled={s.playing === `${item.id}:${context}:${variant}`} onClick={() => c.play(item, context, variant)}>▶ Listen</button>;
}
function Library({ controller: c }) {
  return <><Head title="Words that stay." copy="Listen. Recall. Write. Your space for words that stay with you."><div className="vocab-orbit">Aa</div></Head><button type="button" className="vocab-unit" onClick={() => c.go("unit-2")}><span className="vocab-unit-number">02</span><div><p className="vocab-eyebrow">GO GETTER 4 / UNIT 2</p><h2>Home &amp; Housework</h2><p>81 words and phrases · 3 days of practice · dictation and new contexts</p></div><span className="vocab-cta">Open →</span></button><p className="vocab-note">Models help you learn. Independent answers show what you remember.</p></>;
}
function Home({ controller: c, snapshot: s }) {
  const stats = summary(s.bank, s.state.events), options = [["Listen and write", stats.checked < 81 ? "Try the next unchecked words. No translation before you answer." : "A short mixed round, starting with difficult words.", () => c.start("listen", true)], ["Words in context", "Listen to new sentences and write the complete missing word or phrase.", () => c.start("context")], ["My difficult words", stats.weak ? `${stats.weak} words were incorrect in your latest independent attempt.` : "Practise the spelling. Remember every word in a phrase.", () => c.start("listen")], ["Build the spelling", "Complete the missing letters. This is supported practice, not an independent check.", () => c.start("letters")], ["Dictation · all 81", "Random order. No hints. Check your answers after the final word.", () => c.start("exam")], ["Paper dictation", "Take a blank sheet. Listen to 9 words or phrases, then check your own work.", () => c.start("paper")]];
  return <><button className="back-button" onClick={() => c.go("")}>← All sets</button><Head title="Home & Housework" copy="Three days to practise recalling and spelling words from English audio." /><section className="vocab-stats">{[[stats.checked + "/81", "checked by listening"], [stats.written + "/81", "latest answer correct"], [stats.context + "/81", "correct in context"], [stats.retained + "/81", "confirmed on different days"]].map(([value, label]) => <div className="vocab-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>{s.state.session && <button className="vocab-resume" onClick={() => c.go("practice")}>Resume your exercise →</button>}<nav className="vocab-days" aria-label="Practice plan">{["1 · Discover", "2 · Practise", "3 · Check"].map((label, index) => <button key={label} className="secondary" aria-pressed={s.state.day === index + 1} disabled={s.saving} onClick={() => c.day(index + 1)}>{label}</button>)}</nav><p className="vocab-day-note">{dayNotes[s.state.day - 1]}</p><section className="story-plan" aria-labelledby="storyPlanTitle"><p className="vocab-eyebrow">SPELLING / STEP BY STEP</p><h2 id="storyPlanTitle">25-word story practice</h2><p>Four new stories cover all 81 words and phrases. Each story has 25 gaps. The first letter stays; each underscore is one missing letter.</p><div className="vocab-actions"><button className="vocab-action is-main" disabled={s.saving} onClick={() => c.start("exam", false, {story:true})}><strong>1 · Story gaps · 25</strong><span>Listen, read and complete a new story. Check all answers at the end.</span></button><button className="vocab-action" disabled={s.saving} onClick={() => c.start("listen", false, {repair:true})}><strong>2 · Repair my spellings</strong><span>Recall difficult words without a model. A correct answer with help does not clear a mistake.</span></button><button className="vocab-action" disabled={s.saving} onClick={() => c.start("exam", false, {limit:25})}><strong>3 · Independent check · 25</strong><span>A fresh mixed dictation, without first letters, hints or a word list.</span></button></div><p className="vocab-note">Try one story, repair mistakes, then take a 10–20 minute break. Check again without clues. Aim for 25/25 twice, with a break between rounds. In the morning, do one short recall round.</p></section><div className="vocab-actions">{options.map(([title, copy, action], index) => <button key={title} className={"vocab-action" + (index === (s.state.day === 3 ? 4 : s.state.day === 2 ? 1 : 0) ? " is-main" : "")} disabled={s.saving} onClick={action}><strong>{title}</strong><span>{copy}</span></button>)}</div><button className="secondary" onClick={() => c.go("words")}>My 81 words →</button><p className="vocab-note">Take short rounds and breaks. Answers with hints do not count as independent success. The final score needs server confirmations on different days. Three days of practice do not measure long-term retention.</p></>;
}
function Answer({ controller: c, snapshot: s, item }) {
  const session = s.state.session, [value, setValue] = useState(session.draft || ""), pasted = useRef(Boolean(session.pasted));
  return <><form onSubmit={(event) => {
    event.preventDefault();
    c.submitAnswer(value, pasted.current);
  }}><label className="vocab-input-label" htmlFor="answer">Write the full word or phrase in English</label><input id="answer" name="answer" type="text" className="answer-input" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" maxLength={240} value={value} disabled={s.saving} onPaste={() => {
    pasted.current = true;
    c.draft(value, true);
  }} onChange={(event) => {
    setValue(event.target.value);
    c.draft(event.target.value);
  }} /><button type="submit" className="primary" disabled={s.saving}>{session.mode === "exam" ? "Save answer →" : "Check"}</button></form>{session.mode !== "exam" && <><button className="secondary" disabled={session.hinted || s.saving} onClick={() => c.hint()}>Need a hint</button><div className="vocab-feedback" hidden={!session.hinted}><strong>{item.english}</strong><p>{item.meaning}</p><p>{item.tip}</p></div></>}<p className="vocab-note">{session.mode === "exam" ? "Your answers and score appear at the end. You can replay the audio." : "You can listen again. Spaces and words like the / of are part of your answer."}</p></>;
}
function StoryParagraph({ parts, session }) {
  return <p className="story-text">{parts.map((part,index) => part.text ? <span key={index}>{part.text}</span> : <span key={index} className={"story-gap" + (part.number === session.index + 1 ? " is-current" : "")} data-gap-number={part.number}><sup>{part.number}</sup>{session.results[part.number-1]?.answer || part.cue}</span>)}</p>;
}
function StoryPractice({ controller: c, snapshot: s, item }) {
  const session=s.state.session, story=stories.find(story => story.id===session.storyId);
  if (!story) return <p role="alert">This practice story is unavailable. Return to the plan and start a new round.</p>;
  const paragraphs=storyParts(story,s.bank), paragraph=Math.floor(session.index/5);
  return <><div className="vocab-session-head"><button className="back-button" onClick={() => c.pause()}>← Pause</button><span>Gap {session.index+1} / 25 · Story practice</span></div><div className="vocab-progress"><span style={{width:`${session.index/25*100}%`}} /></div><section className="vocab-exercise"><p className="vocab-eyebrow">GUIDED DICTATION / 25 GAPS</p><h1>{story.title}</h1><p className="vocab-note">Listen and write the full word or phrase for the highlighted gap. The first letter is a clue. Answers appear only at the end.</p><button className="vocab-play" onClick={() => s.playing ? c.stop() : c.playStory(story.id,paragraph)}>{s.playing ? "■ Stop audio" : "▶ Listen to this paragraph"}</button><StoryParagraph parts={paragraphs[paragraph]} session={session} /><p className="story-current">Gap {session.index+1}: <strong>{paragraphs[paragraph].find(part => part.number===session.index+1)?.cue}</strong></p><Answer key={session.id+":"+session.index} controller={c} snapshot={s} item={item} /><details className="story-overview"><summary>Read the whole story · 25 gaps</summary><button className="secondary" disabled={Boolean(s.playing)} onClick={() => c.playStory(story.id)}>Listen to the whole story</button>{paragraphs.map((parts,index) => <StoryParagraph key={index} parts={parts} session={session} />)}</details><p className="vocab-note">First-letter clues make this guided practice. This score is separate from independent spelling.</p></section></>;
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
  return <><div className="vocab-session-head"><button className="back-button" onClick={() => c.pause()}>← Pause</button><span>{session.index + 1} / {session.ids.length} · {labels[session.mode]}</span></div><div className="vocab-progress"><span style={{ width: `${session.index / session.ids.length * 100}%` }} /></div><section className="vocab-exercise"><p className="vocab-eyebrow">UNIT 2 / YOUR TURN</p><h1>{session.mode === "paper" ? "Listen and write on paper." : session.mode === "context" ? "Which word fits here?" : "Listen. Recall. Write."}</h1>{session.mode === "context" && <><p className="vocab-context">{gap(item, session.variant)}</p><p className="vocab-note">{item.meaning}</p></>}{session.mode === "letters" && <><p>{item.meaning}</p><p className="vocab-mask">{mask(item)}</p></>}<AudioButton controller={c} snapshot={s} item={item} context={session.mode === "context"} variant={session.variant} />{session.mode === "paper" ? <><p className="vocab-note">Write the full word or phrase. Model answers appear after all nine items.</p><button className="primary" disabled={s.saving} onClick={() => c.next()}>Written · next →</button></> : result ? <><div role="status" className={"vocab-feedback" + (result.correct ? "" : " is-wrong")}><strong>{result.correct ? result.hinted ? "Correct with support." : "Correct on your own." : "Let’s review this one."}</strong><p>{item.english}</p>{!result.correct && <><p>Your answer: {result.answer}</p><p>{item.tip}</p></>}{(!result.correct || result.hinted) && <><p>{item.meaning}</p><p>{item.contexts[session.variant]}</p></>}</div><button className="primary" disabled={s.saving} onClick={() => c.next()}>Next →</button></> : <Answer key={session.id + ":" + session.index} controller={c} snapshot={s} item={item} />}</section></>;
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
function Results({ controller: c, snapshot: s }) {
  const session = s.state.session, independent = session.results.filter((event) => !event.hinted), scored = session.storyId ? session.results : independent, correct = scored.filter((event) => event.correct).length, errors = session.results.filter((event) => !event.correct);
  return <><Head title={session.mode === "paper" ? "Now check your paper." : "One step closer."} copy={session.mode === "paper" ? "Now look at the model answers. Tick only answers with no mistakes, including every word in a phrase." : session.storyId ? "First-letter clues were provided. Practise mistakes without a model, then take an independent check after a break." : "Here are your independent answers. Corrections and hints are counted separately."} />{session.mode === "paper" && !session.paperSaved ? <><div>{session.ids.map((id) => {
    const item = s.bank.items.find((word) => word.id === id);
    return <PaperRow key={id} controller={c} id={id} item={item} initial={Boolean(session.paperAnswers[id])} />;
  })}</div><p className="vocab-note">This is your own self-check. It does not count as server-verified spelling or replace a teacher’s check.</p><button className="primary" disabled={s.saving || s.paperPending > 0} onClick={() => c.paperSave()}>Save self-check</button></> : <><h2>{session.mode === "paper" ? "Self-check saved." : `${correct} / ${scored.length} ${session.storyId ? "answers correct with first-letter clues" : "independent answers correct"}`}</h2>{session.mode === "exam" && <p className="vocab-note">This score is for this round. Your score on paper may be different. Review mistakes after a break.</p>}{errors.length > 0 && <ul className="vocab-result-list">{errors.map((event) => {
    const item = s.bank.items.find((word) => word.id === event.itemId);
    return <li key={event.requestId}>{event.answer} → {item.english}. {item.tip}</li>;
  })}</ul>}{errors.length > 0 && <button className="primary" disabled={s.saving} onClick={() => c.start("listen",false,{repair:true})}>Repair these spellings →</button>}<button className="primary" disabled={s.saving} onClick={() => c.clear("unit-2")}>Back to the practice plan →</button></>}</>;
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
  return s.hash === "practice" ? <Practice controller={c} snapshot={s} /> : s.hash === "words" ? <Words controller={c} snapshot={s} /> : s.hash === "unit-2" ? <Home controller={c} snapshot={s} /> : <Library controller={c} />;
}
const controller = createVocabController({ tg: window.Telegram?.WebApp }), root = document.querySelector("#app");
root.dataset.renderer = "react";
createRoot(root).render(<VocabApp controller={controller} />);
