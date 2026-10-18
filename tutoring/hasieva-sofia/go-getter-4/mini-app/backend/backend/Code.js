function verifyPersonalTutoring() {
  const props = PropertiesService.getScriptProperties();
  const book = SpreadsheetApp.openById(props.getProperty('TUTORING_SHEET_ID'));
  const bot = tutoringTelegram_('getMe');
  console.log(JSON.stringify({ok: true, sheets: book.getSheets().map(function(s) {return s.getName();}), botAvailable: !!bot.id}));
}

function installPersonalTutoringReminder() {
  enableTutoringReminders();
}

function personalTutoringReminderText_(day) {
  const campaign = {
    '2026-10-12':'Monday says: one tiny English mission first, then the rest of the week can panic. 👟',
    '2026-10-13':'Your sneakers are ready. Your verbs are asking if they can come too. Five minutes, team effort. 👟',
    '2026-10-14':'Midweek brain check: still there? Excellent. Feed it one English mini-mission. 🍪',
    '2026-10-15':'A little English now is easier than negotiating with Future You tomorrow. Just one mission. 😄',
    '2026-10-16':'Friday plan: one short English mission, then celebrate your excellent time management. 😎',
    '2026-10-17':'Weekend homework has shrunk to one tiny mission. It is small, polite, and waiting by the door. 👟',
    '2026-10-18':'Give Monday one less thing to complain about: do a mini-mission today. Your future self owes you a snack. 😄'
  };
  return campaign[day] || 'Hi Sonya! It’s time for a little English practice. Open Street Style and complete one short mission. 👟';
}

function sendPersonalTutoringReminderAtSix() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('TUTORING_REMINDERS_ENABLED') !== 'true') return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
  var now = new Date();
  var day = Utilities.formatDate(now, 'Europe/Moscow', 'yyyy-MM-dd');
  if (Utilities.formatDate(now, 'Europe/Moscow', 'HH:mm') !== '17:59' ||
      props.getProperty('TUTORING_REMINDER_SENT_DAY') === day ||
      props.getProperty('TUTORING_LEARNER_LAST_PRACTICE_DAY') === day) return;
  var learnerId = props.getProperty('TUTORING_LEARNER_ID');
  if (!/^[1-9]\d+$/.test(learnerId || '')) throw new Error('Learner is not configured');
  var result = tutoringTelegram_('sendMessage', {
    chat_id: Number(learnerId),
    text: personalTutoringReminderText_(day),
    disable_web_page_preview: true,
    reply_markup: {inline_keyboard: [[{text:'Open Street Style',web_app:{url:'https://2rister.github.io/english-hw/street-style-week/'}}]]}
  });
  props.setProperty('TUTORING_REMINDER_SENT_DAY', day);
  props.setProperty('TUTORING_REMINDER_MESSAGE_ID', String(result.message_id));
  } finally {
    lock.releaseLock();
  }
}

function installPersonalTutoringSixPmTrigger() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('TUTORING_LEARNER_ID') === null) throw new Error('Learner is not configured');
  ScriptApp.getProjectTriggers().filter(function(t) {
    return t.getHandlerFunction() === 'sendPersonalTutoringReminderAtSix';
  }).forEach(function(t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendPersonalTutoringReminderAtSix').timeBased().everyMinutes(1).create();
  props.setProperty('TUTORING_REMINDERS_ENABLED', 'true');
}

function doGet(e) {
  if (e && e.parameter && e.parameter.tutoring === '1') {
    const bridge = HtmlService.createTemplateFromFile('TutoringBridge');
    bridge.channel = /^[a-f0-9-]{36}$/.test(e.parameter.channel || '') ? e.parameter.channel : '';
    return bridge.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutput('Personal tutoring backend is running.')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
