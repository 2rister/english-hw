const assert=require('node:assert/strict');
const fs=require('node:fs');
const {test}=require('node:test');

const app=fs.readFileSync(__dirname+'/app.js','utf8');
const html=fs.readFileSync(__dirname+'/index.html','utf8');

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
