import {SpaceAPI,telegram,uuid} from './api.js';
import {Sound} from './audio.js';
import {SpaceScene} from './scene.js';

const api=new SpaceAPI(), sound=new Sound(), scene=new SpaceScene(document.querySelector('#space'));
const screen=document.querySelector('#screen'), hud=document.querySelector('#hud');
const storage='orbital:'+ (telegram?.initDataUnsafe?.user?.id||'practice');
const colors=['amber','blue','green','red','violet','white'];
let roster=[], astronaut=0, otherName='', state=null, selected=null, pending=null;
let running=false, remaining=0, deadline=0, tick, paused=false, busy=false, afterFeedback=null;
let flightOffset=0, flightDistance=180;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='primary')=>`<button class="${cls}" type="button" data-action="${action}">${label}</button>`;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function persist() { try { localStorage.setItem(storage,JSON.stringify({state,pending,selected,remaining,astronaut,otherName})); } catch {} }
function saved() { try { return JSON.parse(localStorage.getItem(storage)||'null'); } catch { return null; } }
function status(text) { document.querySelector('#connection').textContent=text; }
function haptic(type) { try { telegram?.HapticFeedback?.notificationOccurred(type); } catch {} }
function view(stage,html) {
  document.body.dataset.stage=String(stage); screen.innerHTML=html;screen.classList.add('entering');
  hud.hidden=stage==='welcome';document.querySelector('#pause').hidden=!['1','2'].includes(String(stage));
}
function setupTelegram() {
  if (!api.authenticated) return;
  telegram.expand(); telegram.setHeaderColor?.('#070b11');telegram.setBackgroundColor?.('#070b11');
  if (telegram.isVersionAtLeast?.('8.0')) { telegram.requestFullscreen?.();telegram.disableVerticalSwipes?.(); }
  telegram.enableClosingConfirmation?.();
  const safe=()=>{for (const key of ['top','bottom','left','right']) {
    document.documentElement.style.setProperty('--tg-safe-area-inset-'+key,(telegram.safeAreaInset?.[key]||0)+'px');
    document.documentElement.style.setProperty('--tg-content-safe-area-inset-'+key,(telegram.contentSafeAreaInset?.[key]||0)+'px');
  }};
  safe();telegram.onEvent?.('safeAreaChanged',safe);telegram.onEvent?.('contentSafeAreaChanged',safe);
  telegram.BackButton?.onClick(()=>pause());
}
function welcome(message='') {
  stopTimer();scene.set(0);state=null;selected=null;pending=null;
  const all=[...roster,{id:'other',name:otherName||'Other',color:'white'}], pupil=all[astronaut]||all[0];
  const image='./assets/astronaut-'+pupil.color+'.webp';
  view('welcome',`<section class="welcome"><p class="eyebrow">Learn Core / Gateway B1 / Unit 1</p>
    <h1 class="title">Beyond<span>Earth.</span></h1><p class="hint">43 words. Two stages. One mission.</p>
    <div class="carousel">${button('‹','previous','arrow')}<img class="astronaut" src="${image}" onerror="this.onerror=null;this.src='./assets/astronaut.jpg'" alt="Astronaut in a ${esc(pupil.color)} suit">${button('›','next','arrow')}</div>
    <h2 class="name">${esc(pupil.name)}</h2><p class="hint">Choose your astronaut</p>
    <div class="actions">${button('Launch mission →','launch')}${button(sound.enabled?'Sound on · ♫':'Sound off · ♫','sound','secondary')}
    ${!api.authenticated?button('Open in Telegram ↗','telegram','secondary'):''}</div>
    <p class="hint">${esc(message || (api.authenticated?'Complete both stages → grade 5. Mission failed → grade 2.':'Browser practice. Grades are recorded when you open from Telegram.'))}</p></section>`);
  document.querySelector('#sound').textContent=sound.enabled?'Sound on':'Sound off';
}
function modal(title,content,actions) {
  document.querySelector('.modal')?.remove();const el=document.createElement('div');el.className='modal';
  el.innerHTML=`<section class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2>${content}<div class="actions">${actions}</div></section>`;
  document.body.append(el);document.querySelector('#screen').inert=true;el.querySelector('button')?.focus();
}
function closeModal() { document.querySelector('.modal')?.remove();screen.inert=false; }
function askName() {
  modal('Your astronaut',`<label for="nameInput">Your name</label><input class="field" id="nameInput" autocomplete="name" maxlength="60" placeholder="First and last name" value="${esc(otherName)}">`,button('Continue →','name-save')+button('Back','modal-close','secondary'));
  document.querySelector('#nameInput').focus();
}
function instruction() {
  modal('Flight briefing',`<p><strong>Stage 1:</strong> read the definition. Three words approach your rocket. You have <strong>5 seconds</strong>.</p>
    <p>Swipe left / up / right to pick a lane. You can also tap a word. The answer locks when the timer ends.</p>
    <p><strong>Stage 2:</strong> complete each sentence. Tap one answer within <strong>20 seconds</strong>.</p>
    <p>Three hearts for the whole mission. Lose them all and start again. Attempts are unlimited.</p>`,button('Ready for launch →','start')+button('Back','modal-close','secondary'));
}
async function launch() {
  await sound.unlock().catch(()=>{});
  if (astronaut===roster.length && !otherName) { askName();return; }
  instruction();
}
async function start() {
  closeModal(); const pupil=roster[astronaut]||{id:'other',name:otherName};
  pending={action:'start',attempt:uuid(),student:pupil.id,name:pupil.name,requestId:uuid()};
  state=null; persist();await runPending();
}
async function runPending() {
  if (busy || !pending) return;busy=true;stopTimer();closeModal();
  view(state?.question?.stage||1,`<section class="result"><p class="eyebrow">Mission control</p><h1 class="title">Connecting.</h1><p class="checking">${state?'Checking your answer…':'Preparing your flight…'}</p></section>`);
  try {
    const request=pending, previous=state?.question?.stage;state=await api.call(request.action,request);pending=null;persist();
    updateHud();status(state.practice?'Practice mode':'Mission connected');
    if (state.feedback && request.action==='answer') await feedback(previous);
    else if (state.status!=='active') await result();
    else showQuestion();
  } catch(error) { connectionError(error); }
  finally { busy=false; }
}
function connectionError(error) {
  persist();modal('Signal lost',`<p>${esc(error.message)}</p><p>Your selected answer is kept. The timer is stopped while we reconnect.</p>`,button('Retry connection','retry')+button('Exit mission','quit','secondary'));
}
function updateHud() {
  document.querySelector('#stage').textContent=state?.status==='active'?'Stage '+state.question.stage:'Mission result';
  document.querySelector('#progress').textContent=state?(state.status==='active'?`${state.index%43+1} / 43`:`${state.index} / 86`):'';
  const lives=state?.lives??3, hearts=document.querySelector('#hearts');
  hearts.textContent='♥'.repeat(lives)+'♡'.repeat(3-lives);hearts.setAttribute('aria-label',`${lives} lives remaining`);
  document.querySelector('#sound').textContent=sound.enabled?'♫ On':'♫ Off';
}
function showQuestion(restoredTime) {
  closeModal();paused=false;selected=null;
  const q=state.question;scene.set(q.stage);scene.choose(1);updateHud();
  view(q.stage,`<section class="mission ${q.stage===1?'stage-one':'stage-two'}">
    <p class="eyebrow">${q.stage===1?'Word navigation':'Context navigation'}</p>
    <h1 class="prompt">${esc(q.prompt).replace(/_{2,}/g,'<span class="blank">______</span>')}</h1>
    <div class="timer" role="timer"><span id="seconds"></span><progress id="timebar" max="${q.seconds}" value="${q.seconds}"></progress></div>
    <div class="lanes">${q.options.map((o,i)=>`<button type="button" class="lane" data-lane="${i}" aria-pressed="false">${esc(o.text)}</button>`).join('')}</div>
    <p class="hint">${q.stage===1?'← Swipe left · ↑ Centre · Swipe right →<br>Or tap a word · answer locks at zero':'Choose the word that fits the whole sentence.'}</p></section>`);
  if (q.stage===1) {
    const lanes=document.querySelector('.lanes'), end=scene.approachY()-lanes.offsetHeight;
    flightOffset=end-lanes.getBoundingClientRect().top;
    flightDistance=Math.max(15,Math.min(180,end-document.querySelector('.timer').getBoundingClientRect().bottom-16));
  }
  telegram?.BackButton?.show();remaining=restoredTime??q.seconds*1000;startTimer();if (document.hidden) pause();
}
function startTimer() {
  deadline=performance.now()+remaining;running=true;
  tick=setInterval(()=>{
    remaining=Math.max(0,deadline-performance.now());drawTimer();
    if (remaining===0) submit(selected===null?null:state.question.options[selected].id);
  },50);drawTimer();
}
function drawTimer() {
  const seconds=document.querySelector('#seconds'), bar=document.querySelector('#timebar');
  if (seconds) seconds.textContent=(remaining/1000).toFixed(1)+' s';if (bar) bar.value=remaining/1000;
  document.querySelector('.timer')?.classList.toggle('urgent',remaining<1500);
  if (state?.question?.stage===1) {
    const lanes=document.querySelector('.lanes');
    if (lanes) lanes.style.transform=`translateY(${flightOffset-flightDistance*remaining/(state.question.seconds*1000)}px)`;
  }
}
function stopTimer() { clearInterval(tick);running=false; }
function select(index) {
  if (!running || busy || paused || !state?.question) return;
  selected=index;scene.choose(index);sound.effect('select');
  document.querySelectorAll('.lane').forEach((el,i)=>{el.classList.toggle('selected',i===index);el.setAttribute('aria-pressed',String(i===index));});
  persist();if (state.question.stage===2) submit(state.question.options[index].id);
}
async function submit(option) {
  if (!running || pending) return;stopTimer();
  pending={action:'answer',attempt:state.attempt,question:state.question.id,option,requestId:uuid()};
  persist();await runPending();
}
async function feedback(previousStage) {
  const f=state.feedback; sound.effect(f.correct?'correct':'wrong');haptic(f.correct?'success':'error');
  if (!f.correct && state.status==='failed') { scene.explode();sound.effect('explode');await delay(1100);await result();return; }
  view(previousStage,`<section class="result"><p class="eyebrow">${f.correct?'Trajectory confirmed':'Course correction'}</p>
    <h1 class="title">${esc(f.answer)}</h1><p class="feedback ${f.correct?'correct':'wrong'}">${esc(f.explanation)}</p>
    ${button(state.status==='completed'?'Mission result →':'Continue →','continue')}</section>`);
  afterFeedback=async()=>{
    if (state.status!=='active') { await result();return; }
    if (previousStage===1 && state.question.stage===2) await stageTwo();
    showQuestion();
  };
  if (f.correct) { await delay(700); if (afterFeedback) { const next=afterFeedback;afterFeedback=null;await next(); } }
}
async function stageTwo() {
  scene.boost();sound.effect('boost');view(2,`<section class="result stage-intro"><p class="eyebrow">Jump sequence initiated</p><h1 class="title">Stage 2</h1><p>Put the words into context.</p></section>`);
  await delay(2100);
}
async function result() {
  stopTimer();paused=false;telegram?.BackButton?.hide();telegram?.disableClosingConfirmation?.();
  const win=state.status==='completed';if (win) sound.effect('win');
  view('result',`<section class="result"><p class="eyebrow">${win?'Destination reached':'Mission lost'}</p>
    <h1 class="title">${win?'Mission<br>complete.':'Start<br>again.'}</h1><p>${esc(state.name)}</p>
    <p class="score">${state.grade}</p><p>${win?'Completed':'Not completed'} · ${state.index} / 86 answers</p>
    <p class="hint" id="receipt">${receipt()}</p><div class="actions">${button('Start again →','restart')}${button('Choose astronaut','home','secondary')}
    ${state.delivery==='pending'?button('Retry sending result','delivery','secondary'):''}</div></section>`);
  persist();
}
function receipt() {
  if (state.practice) return 'Practice result. Open in Telegram to record your grade.';
  if (state.delivery==='sent') return `Grade saved. Report sent to your teacher through the bot.${state.bestGrade===5?' Final assignment grade: 5.':''}`;
  return 'Grade saved. Bot delivery is pending. Tap Retry sending result.';
}
function pause() {
  if (!running || !state || state.status!=='active' || paused) return;
  stopTimer();paused=true;persist();sound.suspend();
  modal('Flight paused','<p>Your timer is stopped. Resume when you are ready.</p>',button('Resume flight','resume')+button('End attempt','quit','secondary'));
}
async function resume() { closeModal();paused=false;await sound.unlock().catch(()=>{});if (remaining>0) startTimer();else showQuestion(); }
async function quit() {
  closeModal();stopTimer();
  if (!state && pending?.action==='start') { await runPending();if (!state) return; }
  if (!state) { welcome();return; }
  pending={action:'abort',attempt:state.attempt,requestId:uuid()};persist();await runPending();
}
async function bootstrap() {
  setupTelegram();welcome('Connecting to mission control…');
  try {
    const config=await api.call('config');roster=config.roster;
    if (!roster.length) roster=colors.map((color,i)=>({id:'demo'+i,name:'Explorer '+(i+1),color}));
    const old=saved();astronaut=Math.min(old?.astronaut||0,roster.length);otherName=old?.otherName||'';
    if (old?.pending) { state=old.state;pending=old.pending;await runPending();return; }
    if (old?.state?.delivery==='pending') { state=await api.call('resume',{attempt:old.state.attempt});await result();return; }
    if (old?.state?.status==='active') {
      state=await api.call('resume',{attempt:old.state.attempt});remaining=old.remaining>0?old.remaining:state.question.seconds*1000;
      if (state.status!=='active') { await result();return; }
      view(state.question.stage,`<section class="result"><h1 class="title">Welcome<br>back.</h1><p>Your mission is saved.</p></section>`);
      modal('Resume mission','<p>Continue your saved flight or end this attempt and start again.</p>',button('Resume flight','restore')+button('End attempt','quit','secondary'));return;
    }
    welcome();
  } catch(error) { welcome(error.message);modal('Connection unavailable',`<p>${esc(error.message)}</p>`,button('Retry','reload')+button('Open in Telegram','telegram','secondary')); }
}
async function action(name) {
  if (name==='previous'||name==='next') { astronaut=(astronaut+(name==='next'?1:roster.length))%(roster.length+1);welcome(); }
  if (name==='launch') await launch();if (name==='start') await start();
  if (name==='name-save') { const value=document.querySelector('#nameInput').value.trim();if (value.length<2 || value.length>60 || /[<>\x00-\x1f]/.test(value)) { document.querySelector('#nameInput').setCustomValidity('Enter your name using letters, spaces and normal punctuation.');document.querySelector('#nameInput').reportValidity();return; } otherName=value;closeModal();welcome();instruction(); }
  if (name==='modal-close') closeModal();if (name==='retry') await runPending();
  if (name==='pause') pause();if (name==='resume') await resume();if (name==='quit') await quit();
  if (name==='restore') { closeModal();await sound.unlock().catch(()=>{});showQuestion(remaining); }
  if (name==='continue' && afterFeedback) { const next=afterFeedback;afterFeedback=null;await next(); }
  if (name==='restart') { telegram?.enableClosingConfirmation?.();await start(); }
  if (name==='home') { welcome();persist(); }
  if (name==='sound') { await sound.unlock().catch(()=>{});sound.set(!sound.enabled);updateHud();if (!state) welcome(); }
  if (name==='delivery') { state=await api.call('resume',{attempt:state.attempt});await result(); }
  if (name==='reload') location.reload();
  if (name==='telegram') { const url='https://t.me/CheckUphw_bot?start=space84';telegram?.openTelegramLink?telegram.openTelegramLink(url):location.assign(url); }
}
document.addEventListener('click',event=>{
  const lane=event.target.closest('[data-lane]');if (lane) select(Number(lane.dataset.lane));
  const target=event.target.closest('[data-action]');if (target) action(target.dataset.action).catch(connectionError);
});
document.addEventListener('keydown',event=>{
  if (event.key==='Enter' && document.querySelector('#nameInput')) { action('name-save').catch(connectionError);return; }
  const lane={ArrowLeft:0,ArrowUp:1,ArrowRight:2,'1':0,'2':1,'3':2}[event.key];
  if (lane!==undefined && running) { event.preventDefault();select(lane); }
});
let pointer;
screen.addEventListener('pointerdown',event=>{if (running) pointer={x:event.clientX,y:event.clientY};});
screen.addEventListener('pointerup',event=>{
  if (!pointer || !running || state.question.stage!==1) { pointer=null;return; }
  const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;
  if (Math.max(Math.abs(dx),Math.abs(dy))<28) return;
  select(Math.abs(dx)>Math.abs(dy)?(dx<0?0:2):1);
});
document.addEventListener('visibilitychange',()=>{if (document.hidden) { if (running) pause();sound.suspend(); }});
window.addEventListener('pagehide',persist);
setInterval(()=>{if (running) persist();},1000);
bootstrap();
