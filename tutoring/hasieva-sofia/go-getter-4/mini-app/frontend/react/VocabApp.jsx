import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { createVocabController } from "./vocab-controller.mjs";
import { summary, wordStats, gap, mask } from "./vocab-ports.mjs";
const dayNotes = [
  "День 1 · Найди пробелы. Начни с коротких блоков по 9 слов. Уже знакомые слова пройдут быстро, а трудные разберём после ответа. Постепенно проверь все 81 единицу — можно в несколько заходов с перерывами.",
  "День 2 · Закрепи. Вернись к ошибкам, затем попробуй слова в новых предложениях. Чередуй короткие блоки и сделай один мини-диктант на чистом листе.",
  "День 3 · Проверь себя. Сначала разогрей трудные места. Затем пройди смешанный диктант: образцы откроются только в конце. После него проверь письмо рукой на чистом листе."
];
function Head({ title, copy, children }) {
  return <section className="vocab-hero">{children}<p className="vocab-eyebrow">VOCAB SPACE / UNIT 02</p><h1>{title}</h1><p className="vocab-intro">{copy}</p></section>;
}
function AudioButton({ controller: c, snapshot: s, item, context = false, variant = 0 }) {
  return <button type="button" className="vocab-play" aria-label={context ? "Послушать предложение" : "Послушать слово или выражение"} disabled={s.playing === `${item.id}:${context}:${variant}`} onClick={() => c.play(item, context, variant)}>▶ Послушать</button>;
}
function Library({ controller: c }) {
  return <><Head title="Words that stay." copy="Услышать. Вспомнить. Написать. Твоё пространство для слов, которые остаются с тобой."><div className="vocab-orbit">Aa</div></Head><button type="button" className="vocab-unit" onClick={() => c.go("unit-2")}><span className="vocab-unit-number">02</span><div><p className="vocab-eyebrow">GO GETTER 4 / UNIT 2</p><h2>Home &amp; Housework</h2><p>81 слово и выражение · 3 дня подготовки · диктант и новые контексты</p></div><span className="vocab-cta">Открыть →</span></button><p className="vocab-note">Образец помогает учиться. Самостоятельный ответ показывает, что ты запомнила.</p></>;
}
function Home({ controller: c, snapshot: s }) {
  const stats = summary(s.bank, s.state.events), options = [["Слушаю и пишу", stats.checked < 81 ? "Следующие непроверенные слова. Без русского перевода перед ответом." : "Короткий смешанный блок: сначала трудные слова.", () => c.start("listen", true)], ["Слова в контексте", "Новые предложения: услышь и напиши пропущенную единицу целиком.", () => c.start("context")], ["Мои трудные слова", stats.weak ? `Сейчас ${stats.weak} слов с ошибкой в последней самостоятельной попытке.` : "Повтори написание и не теряй служебные слова.", () => c.start("listen")], ["Собираю написание", "Пропущенные буквы — опора для обучения. Это не самостоятельная проверка.", () => c.start("letters")], ["Диктант · все 81", "Случайный порядок. Без подсказок. Проверка только после последнего ответа.", () => c.start("exam")], ["Диктант на бумаге", "Возьми чистый лист. 9 единиц на слух, затем честная самопроверка.", () => c.start("paper")]];
  return <><button className="back-button" onClick={() => c.go("")}>← Все наборы</button><Head title="Home & Housework" copy="Три дня, чтобы слова стало легче вспомнить и написать под английскую диктовку." /><section className="vocab-stats">{[[stats.checked + "/81", "проверено на слух"], [stats.written + "/81", "последний ответ верный"], [stats.context + "/81", "получилось в контексте"], [stats.retained + "/81", "подтверждено в разные дни"]].map(([value, label]) => <div className="vocab-stat" key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>{s.state.session && <button className="vocab-resume" onClick={() => c.go("practice")}>Продолжить незавершённое упражнение →</button>}<nav className="vocab-days" aria-label="План подготовки">{["1 · Разобраться", "2 · Закрепить", "3 · Проверить"].map((label, index) => <button key={label} className="secondary" aria-pressed={s.state.day === index + 1} disabled={s.saving} onClick={() => c.day(index + 1)}>{label}</button>)}</nav><p className="vocab-day-note">{dayNotes[s.state.day - 1]}</p><div className="vocab-actions">{options.map(([title, copy, action], index) => <button key={title} className={"vocab-action" + (index === (s.state.day === 3 ? 4 : s.state.day === 2 ? 1 : 0) ? " is-main" : "")} disabled={s.saving} onClick={action}><strong>{title}</strong><span>{copy}</span></button>)}</div><button className="secondary" onClick={() => c.go("words")}>Мои 81 слово →</button><p className="vocab-note">Работай небольшими блоками с перерывами. Правильные ответы после подсказки не повышают самостоятельный результат. Для последнего показателя нужны серверные подтверждения в разные дни; три дня ещё не проверяют долговременное сохранение.</p></>;
}
function Answer({ controller: c, snapshot: s, item }) {
  const session = s.state.session, [value, setValue] = useState(session.draft || ""), pasted = useRef(Boolean(session.pasted));
  return <><form onSubmit={(event) => {
    event.preventDefault();
    c.submitAnswer(value, pasted.current);
  }}><label className="vocab-input-label" htmlFor="answer">Напиши по-английски целиком</label><input id="answer" name="answer" type="text" className="answer-input" autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="done" maxLength={240} value={value} disabled={s.saving} onPaste={() => {
    pasted.current = true;
    c.draft(value, true);
  }} onChange={(event) => {
    setValue(event.target.value);
    c.draft(event.target.value);
  }} /><button type="submit" className="primary" disabled={s.saving}>{session.mode === "exam" ? "Записать ответ →" : "Проверить"}</button></form>{session.mode !== "exam" && <><button className="secondary" disabled={session.hinted || s.saving} onClick={() => c.hint()}>Нужна подсказка</button><div className="vocab-feedback" hidden={!session.hinted}><strong>{item.english}</strong><p>{item.meaning}</p><p>{item.tip}</p></div></>}<p className="vocab-note">{session.mode === "exam" ? "Ответы и результат появятся после завершения. Можно повторить аудио." : "Можно слушать ещё раз. Пробелы между словами и the / of — часть ответа."}</p></>;
}
function Practice({ controller: c, snapshot: s }) {
  const session = s.state.session;
  useEffect(() => {
    if (!session) c.go("unit-2");
  }, [c, session]);
  if (!session) return null;
  if (session.index >= session.ids.length) return <Results controller={c} snapshot={s} />;
  const item = s.bank.items.find((word) => word.id === session.ids[session.index]);
  if (!item) return <p role="alert">Сохранённое слово отсутствует в этом наборе. Вернись к плану и открой новый блок.</p>;
  const labels = { listen: "Слушаю и пишу", context: "В новом контексте", letters: "Собираю написание", exam: "Самостоятельный диктант", paper: "Диктант на бумаге" }, result = session.feedback;
  return <><div className="vocab-session-head"><button className="back-button" onClick={() => c.pause()}>← Пауза</button><span>{session.index + 1} / {session.ids.length} · {labels[session.mode]}</span></div><div className="vocab-progress"><span style={{ width: `${session.index / session.ids.length * 100}%` }} /></div><section className="vocab-exercise"><p className="vocab-eyebrow">UNIT 2 / YOUR TURN</p><h1>{session.mode === "paper" ? "Слушай и пиши на листе." : session.mode === "context" ? "Какое слово здесь нужно?" : "Услышь. Вспомни. Напиши."}</h1>{session.mode === "context" && <><p className="vocab-context">{gap(item, session.variant)}</p><p className="vocab-note">{item.meaning}</p></>}{session.mode === "letters" && <><p>{item.meaning}</p><p className="vocab-mask">{mask(item)}</p></>}<AudioButton controller={c} snapshot={s} item={item} context={session.mode === "context"} variant={session.variant} />{session.mode === "paper" ? <><p className="vocab-note">Запиши слово или выражение целиком. Образцы откроются после всех девяти ответов.</p><button className="primary" disabled={s.saving} onClick={() => c.next()}>Записала · дальше →</button></> : result ? <><div role="status" className={"vocab-feedback" + (result.correct ? "" : " is-wrong")}><strong>{result.correct ? result.hinted ? "Верно с опорой." : "Получилось самостоятельно." : "Разберём это место."}</strong><p>{item.english}</p>{!result.correct && <><p>Твой ответ: {result.answer}</p><p>{item.tip}</p></>}{(!result.correct || result.hinted) && <><p>{item.meaning}</p><p>{item.contexts[session.variant]}</p></>}</div><button className="primary" disabled={s.saving} onClick={() => c.next()}>Дальше →</button></> : <Answer key={session.id + ":" + session.index} controller={c} snapshot={s} item={item} />}</section></>;
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
  const session = s.state.session, independent = session.results.filter((event) => !event.hinted), correct = independent.filter((event) => event.correct).length, errors = session.results.filter((event) => !event.correct);
  return <><Head title={session.mode === "paper" ? "Теперь проверь на листе." : "Один шаг ближе."} copy={session.mode === "paper" ? "Открой образцы только сейчас. Отметь ответы без единой ошибки, включая все слова фразы." : "Смотрим на самостоятельные ответы. Исправления и подсказки учитываются отдельно."} />{session.mode === "paper" && !session.paperSaved ? <><div>{session.ids.map((id) => {
    const item = s.bank.items.find((word) => word.id === id);
    return <PaperRow key={id} controller={c} id={id} item={item} initial={Boolean(session.paperAnswers[id])} />;
  })}</div><p className="vocab-note">Это твоя самопроверка. Она не подтверждает сервером умение писать и не заменяет проверку преподавателем.</p><button className="primary" disabled={s.saving || s.paperPending > 0} onClick={() => c.paperSave()}>Сохранить самопроверку</button></> : <><h2>{session.mode === "paper" ? "Самопроверка сохранена." : `${correct} / ${independent.length} самостоятельных ответов верны`}</h2>{session.mode === "exam" && <p className="vocab-note">Это результат текущего прогона, а не гарантия результата на бумаге. Вернись к ошибкам после перерыва.</p>}{errors.length > 0 && <ul className="vocab-result-list">{errors.map((event) => {
    const item = s.bank.items.find((word) => word.id === event.itemId);
    return <li key={event.requestId}>{event.answer} → {item.english}. {item.tip}</li>;
  })}</ul>}<button className="primary" disabled={s.saving} onClick={() => c.clear("unit-2")}>К плану подготовки →</button></>}</>;
}
function Words({ controller: c, snapshot: s }) {
  const session = s.state.session;
  if (session?.mode === "exam" && session.index < session.ids.length) return <><Head title="Сначала закончи диктант." copy="Во время контрольного прогона словарь закрыт. Можно продолжить или завершить прогон без итогового результата." /><button className="primary" onClick={() => c.go("practice")}>Продолжить диктант →</button><button className="secondary" disabled={s.saving} onClick={() => c.clear("words")}>Завершить прогон и открыть словарь</button></>;
  return <><button className="back-button" onClick={() => c.go("unit-2")}>← Unit 2</button><Head title="Мои 81 слово." copy="Слушай, замечай написание и читай примеры. Просмотр словаря сам по себе не повышает результат." /><div className="vocab-words">{s.bank.items.map((item) => {
    const stats = wordStats(s.state.events, item.id);
    return <article className="vocab-word" key={item.id}><strong>{item.english}</strong><p>{item.meaning}</p><p>{item.contexts[0]}</p><AudioButton controller={c} snapshot={s} item={item} /><small>{stats.listen.lastCorrect === true ? "Последний самостоятельный ответ верный" : stats.listen.lastCorrect === false ? "Вернёмся к написанию" : "Ещё не проверено на слух"}</small></article>;
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
  if (s.loading) return <Head title="Vocab Space" copy="Открываем слова и твой сохранённый прогресс…" />;
  if (s.error) return <><h1>Не удалось открыть Vocab Space</h1><p className="vocab-error" role="alert">{s.error}</p><button className="secondary" onClick={() => location.reload()}>Попробовать ещё раз</button></>;
  return s.hash === "practice" ? <Practice controller={c} snapshot={s} /> : s.hash === "words" ? <Words controller={c} snapshot={s} /> : s.hash === "unit-2" ? <Home controller={c} snapshot={s} /> : <Library controller={c} />;
}
const controller = createVocabController({ tg: window.Telegram?.WebApp }), root = document.querySelector("#app");
root.dataset.renderer = "react";
createRoot(root).render(<VocabApp controller={controller} />);
