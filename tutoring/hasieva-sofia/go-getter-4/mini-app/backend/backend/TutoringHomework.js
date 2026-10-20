/** Personal tutoring: authenticated, per-user storage; never uses the eHW sender. */
const TUTORING_UNITS = ['street-style','grammar-snack-01'];
const TUTORING_URL = 'https://2rister.github.io/english-hw/tutoring/';

function tutoringTelegram_(method, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('TG_TOKEN');
  if (!token) throw new Error('Bot is not configured');
  const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload || {}), muteHttpExceptions: true
  });
  const result = JSON.parse(response.getContentText());
  if (!result.ok) throw new Error('Telegram: ' + String(result.description || 'request failed').slice(0,180));
  return result.result;
}

function tutoringUser_(raw) {
  if (typeof raw !== 'string' || raw.length > 12000) throw new Error('Open this app through Telegram');
  const fields = {};
  raw.split('&').forEach(function (part) {
    const at = part.indexOf('=');
    if (at < 0) throw new Error('Invalid Telegram login');
    const key = decodeURIComponent(part.slice(0,at));
    if (Object.prototype.hasOwnProperty.call(fields,key)) throw new Error('Duplicate login field');
    fields[key] = decodeURIComponent(part.slice(at+1).replace(/\+/g,' '));
  });
  const hash = fields.hash; delete fields.hash;
  const check = Object.keys(fields).sort().map(function (key) { return key + '=' + fields[key]; }).join('\n');
  const token = PropertiesService.getScriptProperties().getProperty('TG_TOKEN');
  const secret = Utilities.computeHmacSha256Signature(Utilities.newBlob(token).getBytes(),Utilities.newBlob('WebAppData').getBytes());
  const expected = Utilities.computeHmacSha256Signature(Utilities.newBlob(check).getBytes(),secret)
    .map(function (b) { return ('0' + ((b+256)%256).toString(16)).slice(-2); }).join('');
  let difference = expected.length ^ String(hash || '').length;
  for (let i=0;i<expected.length;i++) difference |= expected.charCodeAt(i) ^ String(hash || '').charCodeAt(i);
  if (difference) throw new Error('Telegram login could not be verified');
  const age = Date.now()/1000 - Number(fields.auth_date);
  if (!Number.isFinite(age) || age < -60 || age > 86400) throw new Error('Please close and reopen the app');
  const user = JSON.parse(fields.user || '{}');
  if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new Error('Invalid Telegram user');
  // Username is taken only from verified Telegram data. The destination is always a positive private ID.
  if (String(user.username || '').toLowerCase() === 'nebutton') {
    const props = PropertiesService.getScriptProperties();
    const bound = props.getProperty('TUTORING_TEACHER_CHAT_ID');
    if (bound && bound !== String(user.id)) throw new Error('Teacher account is already bound');
    if (!bound) props.setProperty('TUTORING_TEACHER_CHAT_ID',String(user.id));
  }
  const learnerProps = PropertiesService.getScriptProperties();
  const learnerHandle = learnerProps.getProperty('TUTORING_LEARNER_USERNAME');
  let learnerId = learnerProps.getProperty('TUTORING_LEARNER_ID');
  if (learnerHandle && String(user.username || '').toLowerCase() === learnerHandle.toLowerCase()) {
    if (learnerId && learnerId !== String(user.id)) throw new Error('Learner account is already bound');
    if (!learnerId) { learnerId = String(user.id); learnerProps.setProperty('TUTORING_LEARNER_ID',learnerId); }
  }
  if (learnerId === String(user.id)) user.first_name = learnerProps.getProperty('TUTORING_LEARNER_NAME') || user.first_name;
  return user;
}

function tutoringWorkbook_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('TUTORING_SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  const book = SpreadsheetApp.create('Learn Core · Personal tutoring');
  book.getSheets()[0].setName('Progress').appendRow(['Telegram ID','Unit','Revision','Updated','State']);
  book.insertSheet('Results').appendRow(['Key','Telegram ID','Unit','Day','Completed','Evidence','Private delivery','Teacher message ID']);
  props.setProperty('TUTORING_SHEET_ID',book.getId());
  return book;
}

function tutoringRecoverySheet_(book) {
  let sheet = book.getSheetByName('Recovery');
  if (!sheet) sheet = book.insertSheet('Recovery').appendRow(['Telegram ID','Unit','Revision','Saved','State']);
  return sheet;
}

function tutoringAppendRecovery_(book, user, unit, revision, serial) {
  tutoringRecoverySheet_(book).appendRow([String(user.id),unit,revision,new Date(),serial]);
}

function tutoringGrammarReport_(user, attempt) {
  const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
  const events = Array.isArray(attempt.errorEvents) ? attempt.errorEvents : [];
  const lines = ['Личный тьюторинг · Grammar Snack 01',String(user.first_name || 'Learner') + ' · вариант ' + String(attempt.variantId || '—'),
    attempt.complete ? 'Статус: тест завершён.' : 'Статус: в процессе — актуальный сохранённый разбор.',
    'Результат: ' + Number(attempt.correct || 0) + '/' + Math.max(Number(attempt.index || 0),answers.length) + (attempt.complete ? ' · ' + Number(attempt.score || 0) + '%' : '')];
  let errorNumber = 0;
  const reportErrors = events.slice(), seen = {};
  reportErrors.forEach(function (event) {
    const wrongs = Array.isArray(event.wrong) ? event.wrong : [event.wrong];
    wrongs.forEach(function (wrong) {
      const key = JSON.stringify([event.q || '',wrong || '',event.expected || '']);
      seen[key] = (seen[key] || 0) + 1;
    });
  });
  answers.forEach(function (answer) {
    (Array.isArray(answer.wrong) ? answer.wrong : []).forEach(function (wrong) {
      const key = JSON.stringify([answer.q || '',wrong || '',answer.expected || '']);
      if (seen[key]) { seen[key]--; return; }
      reportErrors.push({q:answer.q,wrong:wrong,expected:answer.expected,feedback:answer.feedback});
    });
  });
  reportErrors.slice(0,25).forEach(function (event) {
    if (!event.wrong || (Array.isArray(event.wrong) && !event.wrong.length)) return;
    errorNumber++;
    // Compact bounded fields keep five theory checks plus twenty test items in one Telegram message.
    lines.push('\n' + errorNumber + '. ' + String(event.q || '').slice(0,48));
    lines.push('✗ ' + String(Array.isArray(event.wrong) ? event.wrong[0] : event.wrong).slice(0,20) + ' → ✓ ' + String(event.expected || '').slice(0,24));
    if (event.feedback) lines.push('Почему: ' + String(event.feedback).slice(0,30));
  });
  if (reportErrors.length > 25) lines.push('\nПоказаны 25 ошибок из ' + reportErrors.length + '; полный контекст сохранён в Recovery.');
  return lines.join('\n');
}

function tutoringGrammarErrorReport_(user, event, variantId) {
  return ['Grammar Snack · новая ошибка',String(user.first_name || 'Learner') + ' · вариант ' + String(variantId || '—'),
    'Задание: ' + String(event.q || '').slice(0,300),
    'Её ответ: ' + String(event.wrong || '').slice(0,160),
    'Правильно: ' + String(event.expected || '').slice(0,180),
    'Почему: ' + String(event.feedback || 'Check the meaning and the verb form.').slice(0,260)].join('\n');
}

function tutoringReport_(user, dayId, day, state, unit) {
  if (unit === 'grammar-snack-01') return tutoringGrammarReport_(user,day);
  const answers = Array.isArray(day.answers) ? day.answers : [];
  const closed = answers.filter(function (a) { return !a.production && !a.speaking; });
  const measured = closed.filter(function (a) { return typeof a.firstTry === 'boolean'; });
  const firstTry = closed.filter(function (a) { return a.firstTry === true; }).length;
  const lines = ['Личный тьюторинг · Street Style',String(user.first_name || 'Learner') + ' · ' + dayId,
    day.complete ? 'Статус: завершено.' : 'Статус: в процессе — это актуальный сохранённый разбор.',
    'Завершено дней: ' + Object.keys(state.days || {}).filter(function (id) { return state.days[id].complete; }).length + '/7',
    'Практика: ' + day.correct + '/' + day.index + ' (после повторных попыток)',
    'С первого раза (новые ответы): ' + firstTry + '/' + measured.length + ' · подсказки: ' + closed.filter(function (a) { return a.recovered; }).length];
  answers.forEach(function (a) {
    if (a.production) lines.push('\nПисьмо · ожидает проверки:\n' + String(a.text || '[текст не сохранён в старой версии]'));
    if (a.speaking) lines.push('\nУстная практика: самоотчёт ученицы; аудио не загружено.');
    if (a.wrong && a.wrong.length) {
      lines.push('\nЗадание: ' + String(a.q).slice(0,180) + '\nЕё попытки: ' + a.wrong.join(' → '));
      if (typeof a.expected === 'string' && a.expected.trim()) {
        const expected = a.expected.slice(0,200), chosen = String(a.wrong[0]).slice(0,120);
        lines.push('Правильный ответ: ' + expected);
        lines.push('Разбор: I chose “' + chosen + '” because ___. The correct answer is “' + expected + '” because ___.');
        lines.push('Своя фраза: I can use “' + expected + '” in this sentence: ___.');
      }
    }
  });
  if (Object.keys(state.days || {}).filter(function (id) { return state.days[id].complete; }).length === 7) lines.push('\nНедельный маршрут завершён.');
  return lines.join('\n');
}

function tutoringUpsertProgressReports_(sheet, rows, user, state, unit) {
  const supersede = [];
  if ((rows[0] || []).length < 8) sheet.getRange(1,8).setValue('Teacher message ID');
  if (unit === 'grammar-snack-01') {
    const attempt = state.current;
    if (!attempt) return {rows:supersede};
    const key = user.id + '|grammar-snack-01|' + String(attempt.id || attempt.variantId || 'current');
    attempt.errorEvents = Array.isArray(attempt.errorEvents) ? attempt.errorEvents : [];
    rows.forEach(function (row,i) {
      if (i === 0 || String(row[1]) !== String(user.id) || row[2] !== 'grammar-snack-01-error' || row[6] === 'sent' || row[6] === 'superseded') return;
      try {
        const legacy = JSON.parse(row[5]);
        if (legacy && legacy.id && !attempt.errorEvents.some(function (event) { return event.id === legacy.id; })) attempt.errorEvents.push(legacy);
        supersede.push(i+1);
        } catch (err) { supersede.push(i+1); }
    });
    const evidence = JSON.stringify(Object.assign({},attempt,{_learnerName:String(user.first_name || 'Learner').slice(0,60)}));
    const index = rows.findIndex(function (row,i) { return i > 0 && row[0] === key; });
    if (index < 0) sheet.appendRow([key,String(user.id),'grammar-snack-01',String(attempt.variantId || '—'),attempt.complete ? new Date() : '',evidence,'pending','']);
    else if (rows[index][5] !== evidence) sheet.getRange(index+1,5,1,3).setValues([[attempt.complete ? new Date() : rows[index][4],evidence,'pending']]);
    return {rows:supersede};
  }
  Object.keys(state.days).forEach(function (dayId) {
    const day = state.days[dayId];
    if (!Array.isArray(day.answers) || !day.answers.length) return;
    const key = user.id + '|street-style|' + dayId;
    const evidence = JSON.stringify(Object.assign({},day,{_learnerName:String(user.first_name || 'Learner').slice(0,60)}));
    const index = rows.findIndex(function (row,i) { return i > 0 && row[0] === key; });
    if (index < 0) {
      sheet.appendRow([key,String(user.id),'street-style',dayId,day.complete ? new Date() : '',evidence,'pending','']);
    } else if (rows[index][5] !== evidence) {
      sheet.getRange(index+1,5,1,3).setValues([[day.complete ? new Date() : rows[index][4],evidence,'pending']]);
    }
  });
  return {rows:supersede};
}

function tutoringMarkSuperseded_(sheet, rowNumbers) {
  rowNumbers.forEach(function (rowNumber) { sheet.getRange(rowNumber,7).setValue('superseded'); });
}

function tutoringDeliver_(sheet, user, state, unit) {
  const destination = PropertiesService.getScriptProperties().getProperty('TUTORING_TEACHER_CHAT_ID');
  if (!/^[1-9]\d+$/.test(destination || '')) return 'pending';
  const rows = sheet.getDataRange().getValues();
  let status = 'sent';
  for (let i=1;i<rows.length;i++) {
    if (String(rows[i][1]) !== String(user.id) || (rows[i][2] !== unit && rows[i][2] !== unit + '-error') || rows[i][6] === 'sent' || rows[i][6] === 'superseded') continue;
    if (rows[i][2] === 'grammar-snack-01-error') continue;
    const day = JSON.parse(rows[i][5]);
    const text = tutoringReport_(user,rows[i][3],day,state,rows[i][2]);
    // Grammar Snack is compacted at source so all recorded errors fit in one Telegram message.
    const report = unit === 'grammar-snack-01' ? text : (text.length > 3900 ? text.slice(0,3770) + '\n…Полный текст сохранён в приватной таблице.' : text);
    try {
      const messageId = Number(rows[i][7]);
      let sent, replacement = false;
      if (messageId) {
        try { sent = tutoringTelegram_('editMessageText',{chat_id:Number(destination),message_id:messageId,text:report,disable_web_page_preview:true}); }
        catch (err) {
          const message = String(err && err.message || '');
          if (/message is not modified/i.test(message)) sent = {message_id:messageId};
          else {
            if (!/message to edit not found|message can't be edited|message is not editable/i.test(message)) throw err;
            sent = tutoringTelegram_('sendMessage',{chat_id:Number(destination),text:report,disable_web_page_preview:true}); replacement = true;
          }
        }
      } else sent = tutoringTelegram_('sendMessage',{chat_id:Number(destination),text:report,disable_web_page_preview:true});
      if ((!messageId || replacement) && sent && Number.isSafeInteger(sent.message_id)) sheet.getRange(i+1,8).setValue(sent.message_id);
      sheet.getRange(i+1,7).setValue('sent');
    } catch (err) {
      status = 'pending'; sheet.getRange(i+1,7).setValue('pending');
      Logger.log(JSON.stringify({event:'private_report_delivery_failed',unit:unit,kind:String(err && err.message || '').indexOf('Telegram:') === 0 ? 'telegram_api_rejected' : 'transport_or_response_error'}));
    }
  }
  return status;
}

/** Called only via the HtmlService bridge; identity is verified on every request. */
// The shareable browser link token. Anyone who has the link can read the learner's progress; it can
// only ever reach the read-only preview branch, never load or save. Kept in the private project (this
// file is deployed to Apps Script and is never part of the published site).
const TUTORING_PREVIEW_LINK = 'misopreview-43c98fc37e2bb86a57f5a2c5d69d38bf8534d94b';

// A browser link for the tutor preview. The token is derived from the bot token, never stored, and
// rotates daily; the current one is only ever handed to the bound tutor account. It grants nothing
// but the read-only preview below.
function tutoringPreviewToken_(offsetDays) {
  const token = PropertiesService.getScriptProperties().getProperty('TG_TOKEN');
  if (!token) throw new Error('Bot is not configured');
  const day = Utilities.formatDate(new Date(Date.now() - (offsetDays || 0) * 86400000), 'Europe/Moscow', 'yyyy-MM-dd');
  const raw = Utilities.computeHmacSha256Signature(Utilities.newBlob('tutor-preview:' + day).getBytes(), Utilities.newBlob(token).getBytes());
  return raw.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function tutoringPreviewTokenValid_(candidate) {
  const given = String(candidate || '');
  let constantMatch = given.length === TUTORING_PREVIEW_LINK.length ? 0 : 1;
  for (let i = 0; i < TUTORING_PREVIEW_LINK.length; i++) constantMatch |= TUTORING_PREVIEW_LINK.charCodeAt(i) ^ given.charCodeAt(i % (given.length || 1));
  if (!constantMatch) return true;
  if (given.length !== 64) return false;
  for (let offset = 0; offset <= 7; offset++) {
    const expected = tutoringPreviewToken_(offset);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ given.charCodeAt(i);
    if (!difference) return true;
  }
  return false;
}

// Union two progress states the way the client does: a completed day can never be lost, attempt
// history is unioned by timestamp, and counters keep the larger value.
function tutoringUnionState_(a, b) {
  if (!a) return b;
  if (!b) return a;
  const merged = Object.assign({}, a, b, {
    xp: Math.max(Number(a.xp) || 0, Number(b.xp) || 0),
    badges: Array.from(new Set([].concat(a.badges || [], b.badges || []))),
    days: {}
  });
  Object.keys(a.days || {}).concat(Object.keys(b.days || {})).forEach(function (id) {
    if (merged.days[id]) return;
    const from = (a.days || {})[id] || {}, to = (b.days || {})[id] || {};
    const weight = function (day) { return (day.complete ? 1000000 : 0) + (Number(day.index) || 0) * 1000 + ((day.answers || []).length); };
    const richer = weight(to) >= weight(from) ? to : from, other = richer === to ? from : to;
    const runs = [].concat(other.runs || [], richer.runs || []).filter(function (run, index, list) {
      return list.findIndex(function (other) { return other.at === run.at; }) === index;
    });
    merged.days[id] = Object.assign({}, other, richer, {drafts:Object.assign({}, other.drafts || {}, richer.drafts || {}), runs:runs});
  });
  return merged;
}

function tutoringStateWeight_(state) {
  let weight = Number(state && state.xp) || 0;
  Object.keys((state && state.days) || {}).forEach(function (id) {
    const day = state.days[id] || {};
    weight += (day.complete ? 1000000 : 0) + (Number(day.index) || 0) * 1000 + ((day.answers || []).length) * 10 + ((day.runs || []).length);
  });
  return weight;
}

// Every accepted revision is snapshotted in Recovery, so a Progress row that lost a finished day can
// be rebuilt from the learner's own history instead of asking her to redo the work.
function tutoringHistory_(book, id, unit) {
  const sheet = book.getSheetByName('Recovery');
  if (!sheet) return {snapshots:0, richest:null};
  const rows = sheet.getDataRange().getValues();
  let count = 0, richest = null;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) !== String(id) || rows[i][1] !== unit) continue;
    let state = null;
    try { state = JSON.parse(rows[i][4]); } catch (error) { state = null; }   // a corrupt snapshot must not break loading
    if (!state || !state.days) continue;
    count++;
    if (!richest || tutoringStateWeight_(state) > tutoringStateWeight_(richest.state)) richest = {revision:Number(rows[i][2]) || 0, saved:rows[i][3], state:state};
  }
  return {snapshots:count, richest:richest};
}

// The state to serve: the Progress row, made at least as rich as the best snapshot in her history.
// The evidence tab proves what she actually answered even when the state lost the day, so progress is
// counted as the union of the two: the state's own record and the Results rows for her.
// The evidence tab proves what she actually answered even when the state lost the day, so progress is
// counted as the union of the two: the state's own record and the Results rows for her.
// A plain inventory of the workbook, so the tutor can see what the sheet actually holds instead of
// trusting one number: every Progress row and every Results row, whatever unit they belong to.
function tutoringWorkbookInventory_(book) {
  const digest = function (sheetName) {
    const sheet = book.getSheetByName(sheetName);
    if (!sheet) return [];
    const rows = sheet.getDataRange().getValues();
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].join('').trim()) continue;
      const raw = rows[i].map(function (cell) { return String(cell === null || cell === undefined ? '' : cell); });
      const shown = raw.map(function (text) { return text.length > 120 ? text.slice(0, 120) + '…' : text; });
      out.push({raw:raw, shown:shown});
    }
    return out;
  };
  const summarise = function (rows) {
    return rows.map(function (entry) {
      const row = entry.shown, raw = entry.raw;
      if (raw.length === 5) {
        let summary = null;
        try {
          const seen = JSON.parse(String(raw[4]));
          const done = Object.keys(seen.days || {}).filter(function (day) { return (seen.days[day] || {}).complete; });
          summary = {xp:Number(seen.xp) || 0, completedDays:done.length,
            days:Object.keys(seen.days || {}).map(function (day) { return day + ':' + (((seen.days[day] || {}).answers) || []).length; }).join(',')};
        } catch (error) { summary = 'unreadable'; }
        return {unit:raw[1], id:String(raw[0]), revision:raw[2], updated:String(raw[3]).slice(0,24), summary:summary};
      }
      return {unit:raw[2], id:String(raw[1]), day:raw[3], completed:String(raw[4]).slice(0,24), evidenceLines:String(raw[5] || '').split('\n').filter(function (line) { return line.trim(); }).length};
    });
  };
  return {progress:summarise(digest('Progress')), results:summarise(digest('Results')),
    recoveryRows:digest('Recovery').length, notifications:digest('Notifications').length};
}

function tutoringEvidenceFor_(book, id, unit) {
  const sheet = book.getSheetByName('Results');
  if (!sheet) return {};
  const rows = sheet.getDataRange().getValues();
  const counts = {};
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) !== String(id) || rows[i][2] !== unit) continue;
    const text = String(rows[i][5] || '');
    const answers = text ? text.split('\n').filter(function (line) { return line.trim(); }).length : 0;
    counts[String(rows[i][3])] = Math.max(Number(counts[String(rows[i][3])]) || 0, answers);
  }
  return counts;
}

function tutoringHealedState_(book, id, unit, previous) {
  const history = tutoringHistory_(book, id, unit);
  const richest = history.richest;
  if (!richest || (previous && tutoringStateWeight_(previous) >= tutoringStateWeight_(richest.state))) {
    return {state:previous, recovered:0, history:{snapshots:history.snapshots, richestRevision:richest ? richest.revision : null}};
  }
  const days = Object.keys(richest.state.days || {}).filter(function (dayId) {
    return (richest.state.days[dayId] || {}).complete && !(((previous || {}).days || {})[dayId] || {}).complete;
  });
  return {state:tutoringUnionState_(previous, richest.state), recovered:days.length,
    history:{snapshots:history.snapshots, richestRevision:richest.revision}};
}

// One pass for the tutor view: every Progress row of the unit with a small digest of its state, and
// every evidence row, whoever it belongs to.
function tutoringDiagnosticsFor_(progressRows, book, unit) {
  const progress = [];
  for (let i = 1; i < progressRows.length; i++) {
    if (progressRows[i][1] !== unit) continue;
    let summary = null;
    try {
      const seen = JSON.parse(progressRows[i][4]);
      const done = Object.keys(seen.days || {}).filter(function (day) { return (seen.days[day] || {}).complete; });
      summary = {xp:Number(seen.xp) || 0, completedDays:done.length,
        answers:Object.keys(seen.days || {}).reduce(function (n, day) { return n + (((seen.days[day] || {}).answers) || []).length; }, 0)};
    } catch (error) { summary = null; }
    progress.push({id:String(progressRows[i][0]), revision:Number(progressRows[i][2]) || 0, updated:String(progressRows[i][3]), summary:summary});
  }
  const evidence = [];
  const sheet = book.getSheetByName('Results');
  if (sheet) {
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][2] !== unit) continue;
      const text = String(rows[i][5] || '');
      evidence.push({id:String(rows[i][1]), day:String(rows[i][3]), completed:String(rows[i][4]),
        answers:text ? text.split('\n').filter(function (line) { return line.trim(); }).length : 0});
    }
  }
  return {progress:progress, evidence:evidence};
}

// Browser bearer credentials are random; only their keyed digests are persisted.
function tutoringBrowserDigest_(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('Browser sign-in expired. Open a fresh browser link from Telegram.');
  const key = PropertiesService.getScriptProperties().getProperty('TG_TOKEN');
  return Utilities.computeHmacSha256Signature(value, key).map(function (b) { return ('0' + ((b+256)%256).toString(16)).slice(-2); }).join('');
}
function tutoringBrowserSecret_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g,''); }
function tutoringBrowserAuth_(request) {
  const props = PropertiesService.getScriptProperties();
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const bound = props.getProperty('TUTORING_LEARNER_ID');
    if (request.action === 'browserLink') {
      const user = tutoringUser_(request.initData);
      if (!bound || String(user.id) !== bound) throw new Error('Only the enrolled learner can connect a browser.');
      const code = tutoringBrowserSecret_();
      props.setProperty('TUTORING_HANDOFF_' + tutoringBrowserDigest_(code),JSON.stringify({id:bound,expires:Date.now()+600000}));
      return {ok:true,code:code,expiresIn:600};
    }
    const exchange = request.action === 'browserExchange';
    const digest = tutoringBrowserDigest_(exchange ? request.browserCode : request.browserSession);
    const property = (exchange ? 'TUTORING_HANDOFF_' : 'TUTORING_SESSION_') + digest;
    const raw = props.getProperty(property);
    const session = raw ? JSON.parse(raw) : null;
    if (!session || session.expires < Date.now() || session.id !== bound) {
      if (raw) props.deleteProperty(property);
      throw new Error('Browser sign-in expired. Open a fresh browser link from Telegram.');
    }
    if (exchange) {
      props.deleteProperty(property);
      const token = tutoringBrowserSecret_();
      props.setProperty('TUTORING_SESSION_' + tutoringBrowserDigest_(token),JSON.stringify({id:bound,expires:Date.now()+2592000000}));
      return {ok:true,browserSession:token,userId:Number(bound)};
    }
    if (request.action === 'browserRevoke') props.deleteProperty(property);
    return {id:Number(bound),first_name:props.getProperty('TUTORING_LEARNER_NAME') || 'Learner'};
  } finally { lock.releaseLock(); }
}

function tutoringCall(request) {
  if (!request) throw new Error('Missing request');
  if (['browserLink','browserExchange','browserRevoke','browserIdentity'].indexOf(request.action) >= 0) {
    if (request.previewToken) throw new Error('Preview access is read-only');
    const result = tutoringBrowserAuth_(request);
    return request.action === 'browserIdentity' ? {ok:true,userId:result.id} : result;
  }
  const hasToken = Boolean(request && request.previewToken);
  const tokenValid = hasToken && tutoringPreviewTokenValid_(request.previewToken);
  if (hasToken && !tokenValid) throw new Error('Preview link is not valid any more');
  if (tokenValid && request.action !== 'preview') throw new Error('Preview access is read-only');
  const tokenPreview = tokenValid && request.action === 'preview';
  const user = tokenPreview ? null : request.browserSession ? tutoringBrowserAuth_(request) : tutoringUser_(request.initData);
  if (TUTORING_UNITS.indexOf(request.unit) < 0) throw new Error('Unknown unit');
  if (['load','save','preview','deviceDump'].indexOf(request.action) < 0) throw new Error('Unknown action');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const book = tutoringWorkbook_(), sheet = book.getSheetByName('Progress');
    const rows = sheet.getDataRange().getValues();
    // The tutor opens the same Mini App with ?preview=1 to read the learner's progress. It is
    // read-only by construction: this branch never writes the learner's row, and the client keeps its
    // save path closed. Only the bound tutor account can ask for it.
    if (request.action === 'preview') {
      const previewProps = PropertiesService.getScriptProperties();
      const teacherId = previewProps.getProperty('TUTORING_TEACHER_CHAT_ID');
      const isTeacher = Boolean(user) && Boolean(teacherId) && String(user.id) === String(teacherId);
      if (!isTeacher && !tokenPreview) throw new Error('Preview is only available to the tutor account');
      const learnerId = previewProps.getProperty('TUTORING_LEARNER_ID');
      if (!learnerId) throw new Error('No learner account is bound yet');
      const learnerRow = rows.findIndex(function (r,i) { return i>0 && String(r[0]) === String(learnerId) && r[1] === request.unit; });
      tutoringFlushPending_(book);
      const healed = learnerRow < 0 ? {state:null, recovered:0, history:{snapshots:0, richestRevision:null}}
        : tutoringHealedState_(book, learnerId, request.unit, JSON.parse(rows[learnerRow][4]));
      const diagnostics = tutoringDiagnosticsFor_(rows, book, request.unit);
      return {ok:true,preview:true,readOnly:true,
        learner:{id:Number(learnerId),name:previewProps.getProperty('TUTORING_LEARNER_NAME')||''},
        recovered:healed.recovered, history:healed.history, progressRow:learnerRow<0?null:JSON.parse(rows[learnerRow][4]),
        state:healed.state,
        revision:learnerRow<0?0:Number(rows[learnerRow][2]),
        rowsForUnit:diagnostics.progress, resultsRows:diagnostics.evidence, evidenceByDay:tutoringEvidenceFor_(book,learnerId,request.unit),
        sheet:{id:book.getId(), name:(function () { try { return book.getName(); } catch (error) { return ''; } })()},
        sheets:book.getSheets().map(function (sh) { return {name:sh.getName ? sh.getName() : (sh.name || ''), rows:sh.getLastRow ? sh.getLastRow() : (sh.rows ? sh.rows.length : 0)}; }),
        deviceDumps:(function () {
          const dumpSheet = book.getSheetByName('DeviceDumps');
          let count = 0, latest = null;
          if (dumpSheet) {
            const dumpRows = dumpSheet.getDataRange().getValues();
            for (let i = 1; i < dumpRows.length; i++) {
              if (String(dumpRows[i][0]) !== String(learnerId)) continue;
              count++;
              latest = {saved:String(dumpRows[i][2]), dump:String(dumpRows[i][3])};
            }
          }
          return {count:count, latest:latest};
        })(),
        // only the Telegram-side tutor gets the browser link; a token request never extends itself
        browserToken:isTeacher?TUTORING_PREVIEW_LINK:undefined};
    }
    if (request.action === 'deviceDump') {
      // On open, the learner's whole device storage is snapshotted to the private workbook, so a day
      // that never synced can be untangled from what the device still holds.
      const dump = String(request.dump || '');
      if (dump.length > 45000) throw new Error('Device dump too large');
      const dumpSheet = book.getSheetByName('DeviceDumps') || book.insertSheet('DeviceDumps').appendRow(['Telegram ID','Unit','Saved','Dump']);
      dumpSheet.appendRow([String(user.id), request.unit, new Date(), dump]);
      SpreadsheetApp.flush();
      return {ok:true, saved:dump.length};
    }
    let row = rows.findIndex(function (r,i) { return i>0 && String(r[0]) === String(user.id) && r[1] === request.unit; });
    const previous = row < 0 ? null : JSON.parse(rows[row][4]);
    const revision = row < 0 ? 0 : Number(rows[row][2]);
    if (request.action === 'load') {
      if (String(user.id) === PropertiesService.getScriptProperties().getProperty('TUTORING_TEACHER_CHAT_ID')) tutoringFlushPending_(book);
      const healed = tutoringHealedState_(book, user.id, request.unit, previous);
      return {ok:true,state:healed.state,revision:revision,recovered:healed.recovered,history:healed.history,
        evidenceByDay:tutoringEvidenceFor_(book,user.id,request.unit)};
    }
    if (request.revision !== revision) return {ok:false,conflict:true,revision:revision};
    const state = request.state;
    if (!state || JSON.stringify(state).length > 45000) throw new Error('Invalid progress');
    if (request.unit === 'street-style') {
      if (!state.days || Array.isArray(state.days)) throw new Error('Invalid progress');
      Object.keys(state.days).forEach(function (id) {
      if (!/^day[1-7]$/.test(id) || typeof state.days[id] !== 'object') throw new Error('Invalid day');
      });
    }
    if (request.unit === 'grammar-snack-01') {
      if (state.kind !== 'grammar-snack-01' || !state.current || !Array.isArray(state.current.answers) || state.current.answers.length > 20 || (state.current.errorEvents && (!Array.isArray(state.current.errorEvents) || state.current.errorEvents.length > 60))) throw new Error('Invalid grammar progress');
    }
    const resultSheet = book.getSheetByName('Results');
    const results = resultSheet.getDataRange().getValues();
    const migration = tutoringUpsertProgressReports_(resultSheet,results,user,state,request.unit) || {rows:[]};
    const serial = JSON.stringify(state);
    if (serial.length > 45000) throw new Error('Invalid progress');
    const values = [String(user.id),request.unit,revision+1,new Date(),serial];
    if (row < 0) sheet.appendRow(values); else sheet.getRange(row+1,1,1,5).setValues([values]);
    tutoringAppendRecovery_(book,user,request.unit,revision+1,serial);
    SpreadsheetApp.flush();
    if (migration.rows.length) { tutoringMarkSuperseded_(resultSheet,migration.rows); SpreadsheetApp.flush(); }
    const activityProps = PropertiesService.getScriptProperties();
    if (request.unit === 'street-style' && String(user.id) === activityProps.getProperty('TUTORING_LEARNER_ID') && JSON.stringify(state.days) !== JSON.stringify(previous && previous.days || {}))
      activityProps.setProperty('TUTORING_LEARNER_LAST_PRACTICE_DAY',Utilities.formatDate(new Date(),'Europe/Moscow','yyyy-MM-dd'));
    const delivery = tutoringDeliver_(resultSheet,user,state,request.unit);
    if (request.unit === 'street-style') try { tutoringQueueCompletions_(user,state,previous); } catch (err) { Logger.log(JSON.stringify({notification:'queue_error',error:String(err.message).slice(0,180)})); }
    return {ok:true,saved:true,revision:revision+1,delivery:delivery};
  } finally { lock.releaseLock(); }
}

function tutoringFlushPending_(book) {
  const results = book.getSheetByName('Results');
  const rows = results.getDataRange().getValues();
  const users = {};
  rows.slice(1).forEach(function (row) {
    const unit = row[2] === 'grammar-snack-01-error' ? 'grammar-snack-01' : row[2];
    if (row[6] !== 'sent') users[String(row[1]) + '|' + unit] = {id:String(row[1]),unit:unit,name:JSON.parse(row[5])._learnerName || 'Learner'};
  });
  const progress = book.getSheetByName('Progress').getDataRange().getValues();
  Object.keys(users).slice(0,5).forEach(function (key) {
    const record = users[key];
    const snapshotIndex = progress.findIndex(function (row) { return String(row[0]) === record.id && row[1] === record.unit; });
    if (snapshotIndex < 0) return;
    const snapshot = progress[snapshotIndex], state = JSON.parse(snapshot[4]);
    if (record.unit === 'grammar-snack-01') {
      const migration = tutoringUpsertProgressReports_(results,rows,{id:Number(record.id),first_name:record.name},state,record.unit) || {rows:[]};
      const serial = JSON.stringify(state);
      book.getSheetByName('Progress').getRange(snapshotIndex+1,5).setValue(serial);
      tutoringAppendRecovery_(book,{id:Number(record.id)},record.unit,Number(snapshot[2]),serial);
      SpreadsheetApp.flush();
      if (migration.rows.length) { tutoringMarkSuperseded_(results,migration.rows); SpreadsheetApp.flush(); }
    }
    tutoringDeliver_(results,{id:Number(record.id),first_name:record.name},state,record.unit);
  });
}

/** Owner-run setup: same bot, separate private destination; no webhook replacement. */
function configureTutoring() {
  const props = PropertiesService.getScriptProperties();
  const bot = tutoringTelegram_('getMe');
  try {
    const updates = tutoringTelegram_('getUpdates',{limit:100,timeout:0});
    updates.forEach(function (update) {
      const m = update.message || update.edited_message;
      if (m && m.from && String(m.from.username || '').toLowerCase() === 'nebutton' && m.chat.type === 'private')
        if (!props.getProperty('TUTORING_TEACHER_CHAT_ID')) props.setProperty('TUTORING_TEACHER_CHAT_ID',String(m.chat.id));
    });
  } catch (err) { /* Existing webhook stays intact; verified Mini App login can bind the teacher. */ }
  tutoringTelegram_('setChatMenuButton',{menu_button:{type:'web_app',text:'My learning',web_app:{url:TUTORING_URL}}});
  Logger.log(JSON.stringify({bot:bot.username,teacherReady:!!props.getProperty('TUTORING_TEACHER_CHAT_ID'),app:TUTORING_URL}));
}

/** Owner-only registration; actual ID is accepted only from Telegram verification. */
function configureTutoringLearner() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('TUTORING_LEARNER_USERNAME','sonic_xxy');
  props.setProperty('TUTORING_LEARNER_NAME','Софья Хасиева');
  const rows = tutoringWorkbook_().getSheetByName('Progress').getDataRange().getValues().slice(1);
  for (const row of rows.slice(-10)) {
    if (String(row[0]) === '908765432109876') continue;
    let chat; try { chat = tutoringTelegram_('getChat',{chat_id:Number(row[0])}); } catch (err) { continue; }
    if (chat.type !== 'private' || String(chat.username || '').toLowerCase() !== 'sonic_xxy') continue;
    const bound = props.getProperty('TUTORING_LEARNER_ID');
    if (bound && bound !== String(chat.id)) throw new Error('Learner account already bound');
    props.setProperty('TUTORING_LEARNER_ID',String(chat.id)); break;
  }
  Logger.log(JSON.stringify({profileConfigured:true,learnerReady:!!props.getProperty('TUTORING_LEARNER_ID'),teacherReady:!!props.getProperty('TUTORING_TEACHER_CHAT_ID')}));
}

/** Pure reminder policy; opening the app alone does not count as practice. */
function tutoringReminderPlan_(state, date, sentDate, practiceDate, joinedDate) {
  if (sentDate === date) return {skip:'already_sent'};
  const days = state && state.days || {};
  const next = [1,2,3,4,5,6,7].find(number => !days['day'+number] || !days['day'+number].complete);
  if (!next) return {skip:'unit_complete'};
  if (practiceDate === date) return {skip:'practised_today'};
  const jokes = [
    'Hey Sonya! Your clothes look great. Let’s give your English some style too. 😎',
    'Hey Sonya! Your phone has many apps. Today, let’s open the one that makes you smarter. 😄',
    'Hey Sonya! Your English words are waiting. They are very polite, but they miss you. 🙂',
    'Hey Sonya! Time for a little English. Your future self says thank you. Your sofa says stay. 😄',
    'Hey Sonya! A good outfit needs the right words. Let’s find them today. 👟',
    'Hey Sonya! Your brain called. It would like some English before more funny videos. 😄',
    'Hey Sonya! Today’s mission: a little English, a little style, and no exams. 😎'
  ];
  const number = Math.floor(Date.parse(date+'T00:00:00Z') / 86400000);
  const started = Boolean(days['day'+next] && days['day'+next].index);
  const gap = Math.floor((Date.parse(date+'T00:00:00Z')-Date.parse((practiceDate || joinedDate || date)+'T00:00:00Z'))/86400000);
  const type = gap >= 2 ? 'return_after_break' : started ? 'continue' : 'start';
  const greeting = gap >= 2 ? 'Hey Sonya! We haven’t seen your English for a little while. Let’s come back with one small task. 🙂' : jokes[number % jokes.length];
  return {type:type,day:next,text:greeting+'\n\n'+(started?'Continue':'Open')+' Street Style, Day '+next+'. One short mission today.'};
}

/** Server timer: private learner only, one accepted notification per Moscow date. */
function sendTutoringReminder() {
  const props = PropertiesService.getScriptProperties(), now = new Date();
  if (props.getProperty('TUTORING_REMINDERS_ENABLED') !== 'true') return;
  const id = props.getProperty('TUTORING_LEARNER_ID'), hour = Number(Utilities.formatDate(now,'Europe/Moscow','H'));
  if (!/^[1-9]\d+$/.test(id || '')) return;
  const lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return;
  try {
    if (hour >= 8 && hour < 22) { tutoringFlushNotifications_(); tutoringFlushPending_(tutoringWorkbook_()); }
    if (hour !== 19 || Number(Utilities.formatDate(now,'Europe/Moscow','m')) >= 30) return;
    const date = Utilities.formatDate(now,'Europe/Moscow','yyyy-MM-dd');
    const rows = tutoringWorkbook_().getSheetByName('Progress').getDataRange().getValues();
    const row = rows.slice(1).find(value => String(value[0]) === id && value[1] === 'street-style');
    const plan = tutoringReminderPlan_(row ? JSON.parse(row[4]) : null,date,props.getProperty('TUTORING_REMINDER_SENT_DAY'),props.getProperty('TUTORING_LEARNER_LAST_PRACTICE_DAY'),props.getProperty('TUTORING_LEARNER_JOINED_DAY'));
    if (plan.skip) { Logger.log(JSON.stringify({reminder:'skipped',reason:plan.skip})); return; }
    const result = tutoringSendLearner_(plan.text,TUTORING_URL.replace('/tutoring/','/street-style-week/'),'Open Street Style');
    props.setProperty('TUTORING_REMINDER_SENT_DAY',date);
    props.setProperty('TUTORING_REMINDER_MESSAGE_ID',String(result.message_id));
    Logger.log(JSON.stringify({reminder:'accepted',type:plan.type,day:plan.day,date:date}));
  } finally { lock.releaseLock(); }
}

/** Owner-run, idempotent schedule installation; does not send a message now. */
function enableTutoringReminders() {
  const props = PropertiesService.getScriptProperties();
  if (!/^[1-9]\d+$/.test(props.getProperty('TUTORING_LEARNER_ID') || '')) throw new Error('Bind the learner first');
  const existing = ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'sendTutoringReminder');
  if (!existing.length) ScriptApp.newTrigger('sendTutoringReminder').timeBased().everyMinutes(15).create();
  existing.slice(1).forEach(trigger => ScriptApp.deleteTrigger(trigger));
  props.setProperty('TUTORING_REMINDERS_ENABLED','true');
  Logger.log(JSON.stringify({enabled:true,time:'19:00 Europe/Moscow',windowMinutes:30,triggerCount:1}));
}

function pauseTutoringReminders() {
  PropertiesService.getScriptProperties().setProperty('TUTORING_REMINDERS_ENABLED','false');
  ScriptApp.getProjectTriggers().filter(trigger => trigger.getHandlerFunction() === 'sendTutoringReminder').forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log('Tutoring reminders paused');
}

/** Messages are sent only to the enrolled Telegram-verified private learner. */
function tutoringSendLearner_(text, url, button) {
  const id = PropertiesService.getScriptProperties().getProperty('TUTORING_LEARNER_ID');
  if (!/^[1-9]\d+$/.test(id || '')) throw new Error('Learner is not bound');
  return tutoringTelegram_('sendMessage',{chat_id:Number(id),text:String(text).slice(0,3900),disable_web_page_preview:true,
    reply_markup:{inline_keyboard:[[{text:button || 'Open Street Style',web_app:{url:url || TUTORING_URL.replace('/tutoring/','/street-style-week/')}}]]}});
}

function tutoringNotificationsSheet_() {
  const book = tutoringWorkbook_();
  let sheet = book.getSheetByName('Notifications');
  if (!sheet) sheet = book.insertSheet('Notifications').appendRow(['Event key','Telegram ID','Type','Payload','Created','Delivery','Sent','Message ID']);
  return sheet;
}

function tutoringEventText_(type, detail) {
  if (type === 'day_complete') {
    const jokes = ['Mission complete! Your brain can take a break now. 😎','Day finished! Those English words are now part of your style. 👟','Nice work! Your English is stronger. The sofa can have you back now. 😄'];
    return jokes[(Number(detail.day)-1)%jokes.length]+'\n\nStreet Style, Day '+detail.day+' is done. See you for the next mission!';
  }
  if (type === 'unit_complete') return 'Seven days done! Your English has a new outfit. Looking good! 👟\n\nYou finished Street Style. Great work, Sonya! Your tutor will check your writing.';
  if (type === 'feedback') return 'Your tutor has left you a message. Good news: there is no surprise exam. 😄\n\n'+detail.text;
  if (type === 'new_unit') return 'New unit, new words! Your English adventure has a new chapter. 🚀\n\n'+detail.title+' is ready. Tap below to start.';
  throw new Error('Unknown notification type');
}

function tutoringQueueEvent_(key, type, detail) {
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('TUTORING_LEARNER_ID');
  if (!/^[1-9]\d+$/.test(id || '')) throw new Error('Learner is not bound');
  const sheet = tutoringNotificationsSheet_(), rows = sheet.getDataRange().getValues();
  if (!rows.some(row => row[0] === key)) sheet.appendRow([key,id,type,JSON.stringify(detail),new Date(),'pending','','']);
}

function tutoringQueueCompletions_(user, state, previous) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('TUTORING_NOTIFICATIONS_ENABLED') !== 'true' || String(user.id) !== props.getProperty('TUTORING_LEARNER_ID')) return;
  const complete = value => Object.keys(value && value.days || {}).filter(key => value.days[key].complete).length;
  const weekly = complete(state) === 7 && complete(previous) < 7;
  Object.keys(state.days).forEach(key => {
    const day = state.days[key], before = previous && previous.days && previous.days[key];
    if (!day.complete || !day.completedAt || before && before.complete) return;
    const type = weekly ? 'unit_complete' : 'day_complete';
    tutoringQueueEvent_(user.id+'|'+type+'|'+(weekly?'street-style':key),type,{day:Number(key.slice(3))});
  });
  tutoringFlushNotifications_();
}

function tutoringFlushNotifications_() {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('TUTORING_NOTIFICATIONS_ENABLED') !== 'true') return {sent:0};
  const id = props.getProperty('TUTORING_LEARNER_ID'), sheet = tutoringNotificationsSheet_();
  let sent = 0;
  sheet.getDataRange().getValues().slice(1).forEach((row,index) => {
    if (String(row[1]) !== id || row[5] === 'sent' || sent >= 5) return;
    try {
      const detail = JSON.parse(row[3]);
      const result = tutoringSendLearner_(tutoringEventText_(row[2],detail),detail.url,row[2] === 'new_unit' ? 'Open new unit' : row[2] === 'feedback' ? 'Open my learning' : 'Open Street Style');
      sheet.getRange(index+2,6).setValue('sent'); sheet.getRange(index+2,7).setValue(new Date()); sheet.getRange(index+2,8).setValue(result.message_id); sent++;
    } catch (err) { Logger.log(JSON.stringify({notification:'pending',type:row[2],error:String(err.message).slice(0,180)})); }
  });
  return {sent:sent};
}

/** Owner fills a real approved announcement; absent content sends nothing. */
function tutoringAnnouncement_(type) {
  const props = PropertiesService.getScriptProperties(), field = type === 'feedback' ? 'TUTORING_READY_FEEDBACK' : 'TUTORING_READY_UNIT';
  const raw = props.getProperty(field); if (!raw) { Logger.log('No ready '+type+'; nothing sent'); return; }
  const detail = JSON.parse(raw);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(detail.id || '')) throw new Error('Announcement needs a stable ID');
  if (type === 'feedback' && (typeof detail.text !== 'string' || !detail.text.trim() || detail.text.length > 2500)) throw new Error('Real feedback text required');
  if (type === 'new_unit') {
    if (!detail.title || String(detail.title).length > 120 || !/^https:\/\/2rister\.github\.io\/english-hw\/[a-z0-9-]+\/$/.test(detail.url || '')) throw new Error('Published unit title and URL required');
    if (UrlFetchApp.fetch(detail.url,{muteHttpExceptions:true}).getResponseCode() !== 200) throw new Error('Unit page is not published');
  }
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try { tutoringQueueEvent_(props.getProperty('TUTORING_LEARNER_ID')+'|'+type+'|'+detail.id,type,detail); Logger.log(JSON.stringify(tutoringFlushNotifications_())); }
  finally { lock.releaseLock(); }
}

function notifyTutoringFeedback() { tutoringAnnouncement_('feedback'); }
function notifyTutoringNewUnit() { tutoringAnnouncement_('new_unit'); }

/** Activation does not congratulate old work or send made-up announcements. */
function enableTutoringNotifications() {
  const props = PropertiesService.getScriptProperties();
  if (!/^[1-9]\d+$/.test(props.getProperty('TUTORING_LEARNER_ID') || '')) throw new Error('Bind learner first');
  if (!props.getProperty('TUTORING_LEARNER_JOINED_DAY')) props.setProperty('TUTORING_LEARNER_JOINED_DAY',Utilities.formatDate(new Date(),'Europe/Moscow','yyyy-MM-dd'));
  tutoringNotificationsSheet_(); props.setProperty('TUTORING_NOTIFICATIONS_ENABLED','true');
  enableTutoringReminders();
  Logger.log(JSON.stringify({notificationsEnabled:true,types:7,retroactiveMessages:false}));
}

function pauseTutoringNotifications() {
  PropertiesService.getScriptProperties().setProperty('TUTORING_NOTIFICATIONS_ENABLED','false');
  pauseTutoringReminders();
  Logger.log('All tutoring notifications paused');
}
