const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(`${__dirname}/backend/Code.js`, 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);

const days = Array.from({ length: 7 }, (_, i) => `2026-10-${String(i + 12).padStart(2, '0')}`);
const messages = days.map(day => context.personalTutoringReminderText_(day));
assert.equal(new Set(messages).size, 7, 'each campaign date has its own message');
assert.ok(messages.every(message => /English|verbs|mission/i.test(message)));
assert.equal(
  context.personalTutoringReminderText_('2026-10-19'),
  'Hi Sonya! It’s time for a little English practice. Open Street Style and complete one short mission. 👟',
  'the previous reminder returns after the campaign week'
);

console.log('PASS: seven unique dated learner reminders; prior copy resumes after 2026-10-18.');
