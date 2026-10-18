import { useRef, useState } from "react";

export default function VocabAnswer({ controller: c, snapshot: s, item }) {
  const session = s.state.session;
  const [draft, setDraft] = useState({ index: session.index, value: session.draft || "", pasted: Boolean(session.pasted) });
  const input = useRef(null), composing = useRef(false), pending = useRef(false);
  // The input stays mounted; each new word starts with its own saved draft.
  if (draft.index !== session.index) {
    setDraft({ index: session.index, value: session.draft || "", pasted: Boolean(session.pasted) });
  }
  const busy = () => s.saving || pending.current;
  return <><form aria-busy={s.saving} onSubmit={async (event) => {
    event.preventDefault();
    if (busy() || composing.current) return;
    input.current?.focus({ preventScroll: true });
    pending.current = true;
    try {
      await c.submitAnswer(draft.value, draft.pasted);
    } finally {
      pending.current = false;
    }
  }}><label className="vocab-input-label" htmlFor="answer">Write the full word or phrase in English</label><input ref={input} id="answer" name="answer" type="text" className="answer-input" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint={session.mode === "exam" ? "next" : "done"} maxLength={240} value={draft.value} aria-busy={s.saving} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={(event) => {
    if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault();
  }} onBeforeInput={(event) => { if (busy()) event.preventDefault(); }} onPaste={(event) => {
    if (busy()) return event.preventDefault();
    setDraft(previous => ({ ...previous, pasted: true }));
    c.draft(draft.value, true);
  }} onChange={(event) => {
    if (busy()) return;
    const value = event.target.value;
    setDraft(previous => ({ ...previous, value }));
    c.draft(value);
  }} /><button type="submit" className="primary" disabled={s.saving} onPointerDown={(event) => {
    // Keep the keyboard attached to the answer when Save is tapped.
    if (event.pointerType === "mouse" && event.isPrimary && event.button === 0) event.preventDefault();
  }}>{session.mode === "exam" ? "Save answer →" : "Check"}</button></form>{session.mode !== "exam" && <><button className="secondary" disabled={session.hinted || s.saving} onClick={() => c.hint()}>Need a hint</button><div className="vocab-feedback" hidden={!session.hinted}><strong>{item.english}</strong><p>{item.meaning}</p><p>{item.tip}</p></div></>}<p className="vocab-note">{session.mode === "exam" ? "Check at the end." : "You can listen again. Spaces and words like the / of are part of your answer."}</p></>;
}
