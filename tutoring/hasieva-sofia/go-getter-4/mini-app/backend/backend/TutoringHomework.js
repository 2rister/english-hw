/** Personal tutoring: authenticated, per-user storage; never uses the eHW sender. */
const TUTORING_UNITS = ['street-style'];
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
  book.insertSheet('Results').appendRow(['Key','Telegram ID','Unit','Day','Completed','Evidence','Private delivery']);
  props.setProperty('TUTORING_SHEET_ID',book.getId());
  return book;
}

function tutoringReport_(user, dayId, day, state) {
  const answers = Array.isArray(day.answers) ? day.answers : [];
  const closed = answers.filter(function (a) { return !a.production && !a.speaking; });
  const measured = closed.filter(function (a) { return typeof a.firstTry === 'boolean'; });
  const firstTry = closed.filter(function (a) { return a.firstTry === true; }).length;
  const lines = ['Личный тьюторинг · Street Style',String(user.first_name || 'Learner') + ' · ' + dayId,
    'Завершено дней: ' + Object.keys(state.days || {}).filter(function (id) { return state.days[id].complete; }).length + '/7',
    'Практика: ' + day.correct + '/' + day.index + ' (после повторных попыток)',
    'С первого раза (новые ответы): ' + firstTry + '/' + measured.length + ' · подсказки: ' + closed.filter(function (a) { return a.recovered; }).length];
  answers.forEach(function (a) {
    if (a.production) lines.push('\nПисьмо · ожидает проверки:\n' + String(a.text || '[текст не сохранён в старой версии]'));
    if (a.speaking) lines.push('\nУстная практика: самоотчёт ученицы; аудио не загружено.');
    if (a.wrong && a.wrong.length) lines.push('\n' + String(a.q).slice(0,180) + '\nПопытки: ' + a.wrong.join(' → '));
  });
  if (Object.keys(state.days || {}).filter(function (id) { return state.days[id].complete; }).length === 7) lines.push('\nНедельный маршрут завершён.');
  return lines.join('\n');
}

function tutoringDeliver_(sheet, user, state) {
  const destination = PropertiesService.getScriptProperties().getProperty('TUTORING_TEACHER_CHAT_ID');
  if (!/^[1-9]\d+$/.test(destination || '')) return 'pending';
  const rows = sheet.getDataRange().getValues();
  let status = 'sent';
  for (let i=1;i<rows.length;i++) {
    if (String(rows[i][1]) !== String(user.id) || rows[i][2] !== 'street-style' || rows[i][6] === 'sent') continue;
    const day = JSON.parse(rows[i][5]);
    const text = tutoringReport_(user,rows[i][3],day,state);
    // One compact message avoids partial delivery when a later chunk fails.
    const report = text.length > 3900 ? text.slice(0,3770) + '\n…Полный текст сохранён в приватной таблице.' : text;
    try {
      tutoringTelegram_('sendMessage',{chat_id:Number(destination),text:report,disable_web_page_preview:true});
      sheet.getRange(i+1,7).setValue('sent');
    } catch (err) { status = 'pending'; sheet.getRange(i+1,7).setValue('pending'); }
  }
  return status;
}

/** Called only via the HtmlService bridge; identity is verified on every request. */
function tutoringCall(request) {
  const user = tutoringUser_(request && request.initData);
  if (TUTORING_UNITS.indexOf(request.unit) < 0) throw new Error('Unknown unit');
  if (['load','save'].indexOf(request.action) < 0) throw new Error('Unknown action');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const book = tutoringWorkbook_(), sheet = book.getSheetByName('Progress');
    const rows = sheet.getDataRange().getValues();
    let row = rows.findIndex(function (r,i) { return i>0 && String(r[0]) === String(user.id) && r[1] === request.unit; });
    const previous = row < 0 ? null : JSON.parse(rows[row][4]);
    const revision = row < 0 ? 0 : Number(rows[row][2]);
    if (request.action === 'load') {
      if (String(user.id) === PropertiesService.getScriptProperties().getProperty('TUTORING_TEACHER_CHAT_ID')) tutoringFlushPending_(book);
      return {ok:true,state:previous,revision:revision};
    }
    if (request.revision !== revision) return {ok:false,conflict:true,revision:revision};
    const state = request.state, serial = JSON.stringify(state);
    if (!state || !state.days || Array.isArray(state.days) || serial.length > 45000) throw new Error('Invalid progress');
    Object.keys(state.days).forEach(function (id) {
      if (!/^day[1-7]$/.test(id) || typeof state.days[id] !== 'object') throw new Error('Invalid day');
    });
    const resultSheet = book.getSheetByName('Results');
    const results = resultSheet.getDataRange().getValues();
    Object.keys(state.days).forEach(function (id) {
      const day = state.days[id];
      if (!day.complete || !day.completedAt) return;
      const key = user.id + '|' + request.unit + '|' + id + '|' + day.completedAt;
      if (!results.some(function (r) { return r[0] === key; })) resultSheet.appendRow([key,String(user.id),request.unit,id,new Date(),JSON.stringify(Object.assign({},day,{_learnerName:String(user.first_name || 'Learner').slice(0,60)})),'pending']);
    });
    const values = [String(user.id),request.unit,revision+1,new Date(),serial];
    if (row < 0) sheet.appendRow(values); else sheet.getRange(row+1,1,1,5).setValues([values]);
    SpreadsheetApp.flush();
    const activityProps = PropertiesService.getScriptProperties();
    if (String(user.id) === activityProps.getProperty('TUTORING_LEARNER_ID') && JSON.stringify(state.days) !== JSON.stringify(previous && previous.days || {}))
      activityProps.setProperty('TUTORING_LEARNER_LAST_PRACTICE_DAY',Utilities.formatDate(new Date(),'Europe/Moscow','yyyy-MM-dd'));
    const delivery = tutoringDeliver_(resultSheet,user,state);
    try { tutoringQueueCompletions_(user,state,previous); } catch (err) { Logger.log(JSON.stringify({notification:'queue_error',error:String(err.message).slice(0,180)})); }
    return {ok:true,saved:true,revision:revision+1,delivery:delivery};
  } finally { lock.releaseLock(); }
}

function tutoringFlushPending_(book) {
  const results = book.getSheetByName('Results');
  const rows = results.getDataRange().getValues();
  const users = {};
  rows.slice(1).forEach(function (row) {
    if (row[6] !== 'sent') users[String(row[1])] = JSON.parse(row[5])._learnerName || 'Learner';
  });
  const progress = book.getSheetByName('Progress').getDataRange().getValues();
  Object.keys(users).slice(0,5).forEach(function (id) {
    const snapshot = progress.find(function (row) { return String(row[0]) === id && row[1] === 'street-style'; });
    if (snapshot) tutoringDeliver_(results,{id:Number(id),first_name:users[id]},JSON.parse(snapshot[4]));
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
    if (hour >= 8 && hour < 22) tutoringFlushNotifications_();
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
