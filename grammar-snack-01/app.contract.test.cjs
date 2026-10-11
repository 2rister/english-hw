const assert=require('node:assert/strict');
const fs=require('node:fs');
const {test}=require('node:test');

const app=fs.readFileSync(__dirname+'/app.js','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const normalise=Function(`return (${app.match(/const normalise=(.+);\n  const withoutTerminalPunctuation/)[1]})`)();
const withoutTerminalPunctuation=Function('normalise',`return (${app.match(/const withoutTerminalPunctuation=(.+);\n  const matches/)[1]})`)(normalise);
const matches=Function('normalise','withoutTerminalPunctuation',`return (${app.match(/const matches=([\s\S]+?);\n  function load/)[1]})`)(normalise,withoutTerminalPunctuation);

test('theory errors use distinct durable events without consuming mastery-answer slots',()=>{
  assert.match(app,/itemId:id,type:'theory',q:strip\(item\.q\),wrong:option,expected:item\.answer,feedback:item\.why/);
  assert.doesNotMatch(app,/type:'theory',q:strip\(item\.q\),wrong:\[\]/);
  assert.match(app,/phase:'theory'/);
  assert.match(app,/state\.current\?\.phase==='theory'/);
});

test('failed writes are handled and accessible recovery controls exist',()=>{
  assert.match(app,/saveQueue\.enqueue\(\)\.catch\(error=>\(\{saved:false,error\}\)\)/);
  assert.match(app,/label\.htmlFor=input\.id/);
  assert.match(app,/retry\.textContent='Try again'/);
  assert.match(app,/back\.href='\.\.\/tutoring\/#catalog'/);
  assert.match(html,/\.visually-hidden\{/);
});

test('accepts normal learner typography and contractions without accepting a wrong verb form',()=>{
  assert.equal(matches('Mia doesn’t play tennis on Mondays', 'Mia does not play tennis on Mondays.'),true);
  assert.equal(matches("Mia doesn't play tennis on Mondays;", 'Mia does not play tennis on Mondays.'),true);
  assert.equal(matches('  Mia\u200B doesn’t\u00A0play tennis on Mondays  ', 'Mia does not play tennis on Mondays.'),true);
  assert.equal(matches("Mia doesn't plays tennis on Mondays", 'Mia does not play tennis on Mondays.'),false);
  assert.equal(matches('doesn’t normally cook / is making', 'does not normally cook; is making'),true);
});

test('accepts either the missing words or the complete sentence for a completion prompt',()=>{
  const prompt='Complete: I ___ (not / understand) this instruction.';
  assert.equal(matches('do not understand', 'do not understand', prompt),true);
  assert.equal(matches("I don't understand this instruction", 'do not understand', prompt),true);
  assert.equal(matches('I do not understand this instruction', 'do not understand', prompt),true);
  assert.equal(matches('I do not understands this instruction', 'do not understand', prompt),false);
  assert.match(app,/Type the missing words, or the full sentence/);
});
