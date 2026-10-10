(() => {
  'use strict';
  const DATA = window.QUEST_DATA;
  const tutoring = window.TUTORING;
  const BOOT_ASSET_URL = new URL('assets/mascot/halloween/miso-vampire-autumn-portrait.png', document.currentScript.src).href;
  // The study pose and every reaction are frames of one render batch, so the cat keeps its
  // silhouette, scale and lighting when the two layers cross-fade. See study/ASSET_NOTES.md.
  const STUDY_MISO_ASSET_URL = new URL('assets/mascot/study/miso-studying-book.png', document.currentScript.src).href;
  const STUDY_MISO_REACTION_ASSET_URLS = [
    'miso-annoyed-side-eye.png',
    'miso-annoyed-wink.png',
    'miso-annoyed-surprise.png'
  ].map(name => new URL(`assets/mascot/study/reactions/${name}`, document.currentScript.src).href);
  // WebP derivatives (one per frame, sized for the box it renders into) keep the first paint off the
  // network. The PNG masters stay in the tree as the fallback for anything without WebP. Call as
  // `url => uiAsset(url, width)`, never pass it straight to map: the index would become the width.
  const supportsWebp = (() => {
    try { return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'); }
    catch { return false; }
  })();
  const uiAsset = (url, width = 840) => supportsWebp ? url.replace(/\.png$/, `-${width}.webp`) : url;
  const KEY = 'street-style-quest-v1' + (tutoring?.authenticated ? ':' + tutoring.userId : '');
  let revision = 0, syncTimer, syncing = false, syncPending = false, syncUrgent = false, restored = !tutoring?.authenticated, retryBackoffMs = 0;
  const app = document.querySelector('#app');
  const normalise = value => value.toLowerCase().trim().replace(/[.!?]+$/,'').replace(/\s+/g,' ');
  const freshState = () => ({xp:0,days:{},badges:[],hintRecoveries:0});
  let state = load();
  let session = null;

  function load(){
    try { return {...freshState(), ...JSON.parse(localStorage.getItem(KEY) || '{}')}; }
    catch { return freshState(); }
  }
  function save(immediate=false){
    localStorage.setItem(KEY, JSON.stringify(state)); updateXP();
    if(tutoring?.authenticated){ localStorage.setItem(KEY+':pending','1'); }
    if(tutoring?.authenticated && restored){
      syncPending=true; clearTimeout(syncTimer);
      tutoring.saving(immediate ? 'sending' : 'queued');
      if(immediate){ syncUrgent=true; syncProgress(); } else syncTimer=setTimeout(syncProgress,900);
    }
  }
  function mergeProgress(remote, local){
    const merged={...freshState(),...remote,...local,days:{},badges:[...new Set([...(remote?.badges||[]),...(local?.badges||[])])],xp:Math.max(remote?.xp||0,local?.xp||0),hintRecoveries:Math.max(remote?.hintRecoveries||0,local?.hintRecoveries||0)};
    const ids=new Set([...Object.keys(remote?.days||{}),...Object.keys(local?.days||{})]);
    for(const id of ids){const fromServer=remote?.days?.[id]||{},fromDevice=local?.days?.[id]||{};const score=day=>(day.complete?1000000:0)+(Number(day.index)||0)*1000+(day.answers?.length||0);const newer=score(fromDevice)>=score(fromServer)?fromDevice:fromServer,older=newer===fromDevice?fromServer:fromDevice;merged.days[id]={...older,...newer,drafts:{...(older.drafts||{}),...(newer.drafts||{})}};}
    return merged;
  }
  function setCompletionSyncNote(message, complete){
    const note=document.querySelector('#completionSync'); if(note) note.textContent=message;
    const button=document.querySelector('#routeButton'); if(button){ button.disabled=!complete; button.textContent=complete?'Back to the route':'Saving result…'; }
  }
  async function syncProgress(){
    if(syncing || !syncPending || !restored) return;
    syncing=true; syncPending=false; tutoring.setStatus('Saving your progress…'); tutoring.saving('sending'); setCompletionSyncNote('Saving your result to your tutor…',false);
    try {
      const result=await tutoring.call('save',JSON.parse(JSON.stringify(state)),revision);
      if(result.conflict){const latest=await tutoring.call('load');state=mergeProgress(latest.state,state);revision=latest.revision;syncPending=true;syncUrgent=true;tutoring.setStatus('Progress reconnected. Saving your latest answer…');return;}
      if(!result.saved) throw new Error('Progress could not be saved.');
      revision=result.revision; retryBackoffMs=0; localStorage.setItem(KEY+':revision',String(revision)); if(!syncPending) localStorage.removeItem(KEY+':pending'); const status=result.delivery==='pending' ? 'Progress saved · tutor report waiting for delivery.' : 'Progress saved.'; tutoring.setStatus(status); tutoring.saving('done'); setCompletionSyncNote(status,true);
    } catch(error){ syncPending=true; tutoring.setStatus(error.message); tutoring.saving('error'); setCompletionSyncNote('Saved on this device. Keep the app open to retry.',true); }
    finally {
      const urgent=syncUrgent; syncUrgent=false; syncing=false;
      if(syncPending && restored){
        // Escalating backoff. The old code retried an urgent save after 0ms, so a failing bridge looped
        // as fast as the network allowed; now the first urgent retry is 400ms and every later one doubles.
        retryBackoffMs = Math.min(retryBackoffMs ? retryBackoffMs*2 : (urgent ? 400 : 15000), 30000);
        syncTimer=setTimeout(syncProgress,retryBackoffMs);
      } else retryBackoffMs=0;
    }
  }
  async function start(){
    if(tutoring?.gated) return;
    app.inert = Boolean(tutoring?.authenticated);
    updateXP(); route();
    if(tutoring?.authenticated){
      try {
        const result=await tutoring.call('load'); revision=result.revision;
        if(localStorage.getItem(KEY+':pending')){
          if(Number(localStorage.getItem(KEY+':revision') || 0)!==revision) throw new Error('Newer progress exists on another device. Your local work is kept; contact your tutor before continuing.');
        } else if(result.state) state={...freshState(),...result.state};
        restored=true; save(); tutoring.setStatus('Progress connected.');
      } catch(error){ tutoring.setStatus(error.message + ' Reopen the app to reconnect.'); }
    }
    app.inert = false;
    updateXP(); route();
  }
  function mountHalloweenBoot(){
    const storageKey = 'learncore:halloween-boot:2026';
    let dismissed = false;
    try { if(sessionStorage.getItem(storageKey)) return; } catch {}

    const previousFocus = document.activeElement;
    const overlay = document.createElement('section');
    overlay.className = 'halloween-boot';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.setAttribute('aria-labelledby','halloweenBootTitle');
    overlay.innerHTML = `
      <img class="halloween-boot-art" src="${uiAsset(BOOT_ASSET_URL, 768)}" alt="Miso in a vampire cloak in a misty autumn forest at night" decoding="async">
      <div class="halloween-boot-shade" aria-hidden="true"></div>
      <div class="halloween-boot-content">
        <p class="halloween-boot-kicker">October edition</p>
        <h1 id="halloweenBootTitle">Miso welcomes you<br>after dark.</h1>
        <p>Tonight’s quest is waiting.</p>
      </div>
      <button class="halloween-boot-enter" type="button">Enter the quest <span aria-hidden="true">→</span></button>`;

    const close = () => {
      if(dismissed) return;
      dismissed = true;
      try { sessionStorage.setItem(storageKey,'1'); } catch {}
      overlay.classList.add('is-leaving');
      window.setTimeout(()=>{
        overlay.remove();
        if(previousFocus instanceof HTMLElement) previousFocus.focus({preventScroll:true});
      },220);
    };
    overlay.querySelector('.halloween-boot-enter').addEventListener('click',close);
    overlay.addEventListener('click',event=>{ if(!event.target.closest?.('.halloween-boot-enter')) close(); });
    window.addEventListener('keydown',event=>{ if(event.key==='Escape') close(); },{once:true});
    document.body.append(overlay);
    overlay.querySelector('.halloween-boot-enter').focus({preventScroll:true});
    // Never close before the art is on screen: with a 1.4 MB PNG on a cold mobile connection the
    // artwork used to arrive after the 2s timer, so she only ever saw the dark background. The cap
    // keeps a dead network from trapping her behind the overlay.
    const art = overlay.querySelector('.halloween-boot-art');
    let closeTimer;
    const armClose = () => {
      if(closeTimer || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      closeTimer = window.setTimeout(close, 2000);
    };
    if(art.complete && art.naturalWidth) armClose();
    else {
      art.addEventListener('load', armClose, {once:true});
      art.addEventListener('error', armClose, {once:true});
      window.setTimeout(armClose, 4000);
    }
  }
  function updateXP(){ document.querySelector('#xpValue').textContent = state.xp || 0; }
  function earned(id){ return state.badges.includes(id); }
  function award(id){ if(id && !earned(id)){ state.badges.push(id); state.xp += 25; } }
  function completedCount(){ return DATA.days.filter(day => state.days[day.id]?.complete).length; }
  function shortMark(value){
    return value.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase();
  }
  function buildItems(dayNumber){
    const day=DATA.days[dayNumber-1];
    const source=DATA.days[Math.max(0,dayNumber-2)].questions;
    const sprint=source.filter(q=>['mc','type'].includes(q.type)).slice(0,6).map(q=>({...q,q:`Memory sprint · ${q.q}`}));
    return [...day.questions,...sprint];
  }
  function route(){
    tutoring?.back(location.hash);
    if(location.hash.startsWith('#day-')) renderMission(Number(location.hash.replace('#day-','')));
    else if(location.hash==='#catalog' || document.body.dataset.start==='catalog' && location.hash!=='#home') renderCatalog();
    else renderHome();
  }
  function renderCatalog(){
    app.replaceChildren(document.querySelector('#catalogTemplate').content.cloneNode(true));
    mountCatalogMiso();
    const grid=document.querySelector('#unitGrid');
    for(const [index,unit] of tutoring.units.entries()){
      const button=document.createElement('button'); button.className='unit-card'; button.disabled=!unit.available;
      const number=document.createElement('span'); number.className='unit-number'; number.textContent=unit.number || String(index+1).padStart(2,'0');
      const copy=document.createElement('span'); copy.className='unit-copy';
      const label=document.createElement('small'); label.textContent=unit.subtitle;
      const title=document.createElement('strong'); title.textContent=unit.title;
      const description=document.createElement('span'); description.textContent=unit.description;
      const progress=document.createElement('span'); progress.className='unit-progress';
      progress.textContent=unit.id==='street-style' ? `${completedCount()} of 7 days complete` : '';
      copy.append(label,title,description,progress);
      const action=document.createElement('span'); action.className='unit-action'; action.textContent=unit.available ? (Object.values(state.days).some(day=>day.index || day.complete) ? 'Continue →' : 'Start →') : 'Coming soon';
      if(tutoring?.authenticated && !restored){ button.disabled=true; action.textContent='Connecting…'; }
      button.append(number,copy,action); button.addEventListener('click',()=>{unit.href ? location.assign(unit.href) : location.hash='home';}); grid.append(button);
    }
  }

  // Miso performs a three-beat expression reel on tap and breathes while he waits. Each layer owns
  // one WAAPI timeline, so a tap during the release retargets instead of restarting, and the release
  // is the same path played back — the cat never disappears between poses.
  function mountCatalogMiso(){
    const control = document.querySelector('#catalogMiso');
    const baseImage = control?.querySelector('.catalog-miso__base');
    const reactionImages = [...(control?.querySelectorAll('.catalog-miso__reaction') || [])];
    if(!control || !baseImage || reactionImages.length !== STUDY_MISO_REACTION_ASSET_URLS.length) return;

    const reactionSources = STUDY_MISO_REACTION_ASSET_URLS.map(url => uiAsset(url));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const token = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const EASE_OUT = token('--ease-out') || 'cubic-bezier(.23,1,.32,1)';
    const CLIP = 1200;                    // the whole three-beat performance
    const HOLD = 300;                     // reading time on the punchline
    const RELEASE = 220;                  // back into the study pose
    const PRESS = { duration: 130, easing: EASE_OUT, fill: 'both' };
    const UNPRESS = { duration: 160, easing: EASE_OUT, fill: 'both' };
    // Beat order, not asset order: shock, then "who, me?", then the wink that lands and holds.
    const REEL = [2, 0, 1];
    const PUNCHLINE = reactionImages[REEL[REEL.length - 1]];
    // Each expression is fully in at its arrive point, dominant for ~200ms, then dissolves into the
    // next one over RISE. The last one settles to rest instead of leaving, so the reel never gaps.
    const ARRIVE = [0.14, 0.42, 0.70];
    const RISE = 0.10;
    const PARK = 'translateY(0) scale(1)';
    const LIFT = 'translateY(-2px) scale(1.006)';
    const LEAVE = 'translateY(1.5px) scale(.997)';

    // Every frame is in the DOM from the start, so the reel never waits on a fetch or a decode.
    reactionImages.forEach((image, index) => {
      image.src = reactionSources[index];
      image.decode?.().catch(() => {});
    });
    baseImage.decode?.().catch(() => {});

    let busy = false, queued = false, holdTimer, pressAnimation;
    let clipAnimations = [], releaseAnimations = [];

    const frameKeys = beat => {
      const arrive = ARRIVE[beat];
      const start = beat === 0 ? 0 : arrive - RISE;
      const nextStart = beat < ARRIVE.length - 1 ? ARRIVE[beat + 1] - RISE : null;
      const keys = [];
      if(start > 0) keys.push({ offset: 0, opacity: 0, transform: PARK, easing: 'linear' });
      keys.push({ offset: start, opacity: 0, transform: PARK, easing: EASE_OUT });
      keys.push({ offset: arrive, opacity: 1, transform: LIFT, easing: nextStart ? 'linear' : EASE_OUT });
      if(nextStart) keys.push({ offset: nextStart, opacity: 1, transform: PARK, easing: EASE_OUT });
      keys.push(nextStart
        ? { offset: ARRIVE[beat + 1], opacity: 0, transform: LEAVE }
        : { offset: 1, opacity: 1, transform: PARK });
      return keys;
    };

    const settle = () => {
      [...clipAnimations, ...releaseAnimations, pressAnimation].forEach(animation => animation?.cancel());
      clipAnimations = []; releaseAnimations = []; pressAnimation = undefined;
      busy = false;
      if(queued){ queued = false; window.requestAnimationFrame(react); }
    };

    const release = () => {
      if(reducedMotion.matches){ settle(); return; }
      releaseAnimations = [
        baseImage.animate(
          [{ opacity: 0, transform: 'scale(.992)' }, { opacity: 1, transform: 'scale(1)' }],
          { duration: RELEASE, easing: EASE_OUT, fill: 'both' },
        ),
        PUNCHLINE.animate(
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.006)' }],
          { duration: RELEASE, easing: EASE_OUT, fill: 'both' },
        ),
      ];
      Promise.all(releaseAnimations.map(animation => animation.finished)).then(settle, settle);
    };

    const react = () => {
      if(busy){ queued = true; return; }
      busy = true;
      window.clearTimeout(holdTimer);
      if(reducedMotion.matches){
        baseImage.style.opacity = '0';
        reactionImages.forEach(image => { image.style.opacity = image === PUNCHLINE ? '1' : '0'; });
        holdTimer = window.setTimeout(() => {
          baseImage.style.opacity = '';
          reactionImages.forEach(image => { image.style.opacity = ''; });
          settle();
        }, HOLD + RELEASE);
        return;
      }
      clipAnimations = [
        // The base holds opacity 0 to the end of the clip: without the explicit final keyframe the
        // browser fills it from the underlying value and the study pose bleeds back through the reel.
        baseImage.animate(
          [
            { opacity: 1, transform: PARK, easing: EASE_OUT },
            { offset: ARRIVE[0], opacity: 0, transform: 'translateY(1.5px) scale(.995)' },
            { offset: 1, opacity: 0, transform: 'translateY(1.5px) scale(.995)' },
          ],
          { duration: CLIP, fill: 'both' },
        ),
      ];
      REEL.forEach((assetIndex, beat) => {
        clipAnimations.push(reactionImages[assetIndex].animate(frameKeys(beat), { duration: CLIP, fill: 'both' }));
      });
      holdTimer = window.setTimeout(release, CLIP + HOLD);
    };

    const press = () => {
      if(reducedMotion.matches || pressAnimation) return;
      pressAnimation = control.animate([{ transform: 'scale(1)' }, { transform: 'scale(.982)' }], PRESS);
    };
    const unpress = () => {
      const animation = pressAnimation;
      if(!animation) return;
      pressAnimation = undefined;
      animation.reverse();
      animation.finished.then(() => animation.cancel(), () => animation.cancel());
    };

    control.addEventListener('pointerdown', press);
    control.addEventListener('pointerup', unpress);
    control.addEventListener('pointercancel', unpress);
    control.addEventListener('pointerleave', unpress);
    control.addEventListener('click', react);
  }

  function renderHome(){
    app.replaceChildren(document.querySelector('#homeTemplate').content.cloneNode(true));
    document.querySelector('#catalogButton').addEventListener('click',()=>{location.hash='catalog';});
    if(tutoring?.authenticated){
      document.querySelector('.hero-copy>p').textContent='Complete one 20 to 25 minute mission each day. Your tutor receives your results privately.';
      document.querySelector('.privacy-note').innerHTML='<span class="privacy-mark" aria-hidden="true">PRIVATE</span><div><strong>Your personal learning space</strong><p>Your progress and writing are saved for your tutor. Audio stays on this device.</p></div>';
    }
    const done = completedCount();
    const pct = Math.round(done / DATA.days.length * 100);
    document.querySelector('#overallPercent').textContent = `${pct}%`;
    document.querySelector('#overallBar').style.transform = `scaleX(${pct/100})`;
    const grid = document.querySelector('#dayGrid');
    DATA.days.forEach((day,index) => {
      const info = state.days[day.id];
      const button = document.createElement('button');
      button.className = `day-card ${info?.complete ? 'done' : ''}`;
      button.innerHTML = `<div class="day-top"><span class="day-number">${String(index+1).padStart(2,'0')}</span></div><h3>${day.title}</h3><p>${day.short}</p><span class="day-status">${info?.complete ? `Complete · ${info.score}%` : info?.index ? 'Continue fitting' : 'Start fitting'} →</span>`;
      button.addEventListener('click',()=>{ location.hash=`day-${index+1}`; });
      grid.append(button);
    });
    const badges = document.querySelector('#badgeGrid');
    DATA.badges.forEach(item => {
      const node = document.createElement('div');
      node.className = `badge ${earned(item.id) ? 'earned' : ''}`;
      node.innerHTML = `<span class="badge-icon">${earned(item.id) ? shortMark(item.name) : 'LOCK'}</span><strong>${item.name}</strong><small>${item.desc}</small>`;
      badges.append(node);
    });
    document.querySelector('#resetButton').addEventListener('click',()=>{
      if(confirm('Reset all Street Style Quest progress on this device?')){ localStorage.removeItem(KEY); state=freshState(); save(); renderHome(); updateXP(); }
    });
    updateXP();
  }

  function renderMission(dayNumber){
    const day = DATA.days[dayNumber-1];
    if(!day){ location.hash='home'; return; }
    app.replaceChildren(document.querySelector('#missionTemplate').content.cloneNode(true));
    document.querySelector('#missionNumber').textContent = `Day ${dayNumber} of 7`;
    document.querySelector('#missionTitle').textContent = day.title;
    document.querySelector('#missionIntro').textContent = day.intro;
    document.querySelector('#missionTime').textContent = `TIME · ${day.time}`;
    const items=buildItems(dayNumber);
    document.querySelector('#missionReward').textContent = `${items.length} CHALLENGES`;
    document.querySelector('#backButton').addEventListener('click',()=>{ location.hash='home'; });
    const saved = state.days[day.id] || {index:0,correct:0,attempts:0,answers:[],complete:false};
    session = {day,items,dayNumber,index:saved.complete?0:(saved.index||0),correct:saved.complete?0:(saved.correct||0),attempts:saved.complete?0:(saved.attempts||0),answers:saved.complete?[]:(saved.answers||[]),hintLevel:0,wrongThisQuestion:false,wrongAnswers:[]};
    renderQuestion();
  }

  function renderQuestion(){
    const {day,items,index} = session;
    const card = document.querySelector('#gameCard');
    const pct = Math.round(index / items.length * 100);
    document.querySelector('#missionBar').style.transform = `scaleX(${pct/100})`;
    if(index >= items.length){ completeMission(); return; }
    const item = items[index];
    card.innerHTML = `<div class="round-label">Challenge ${index+1} / ${items.length}</div><h2 class="question">${item.q}</h2><p class="prompt-note">Say the complete answer aloud before you continue.</p><div id="interaction"></div><div id="feedback"></div>`;
    session.hintLevel=0; session.wrongThisQuestion=false; session.usedHint=false; session.wrongAnswers=[];
    if(item.type==='mc') renderMC(item);
    else if(item.type==='type') renderType(item);
    else if(item.type==='writing') renderWriting(item);
    else if(item.type==='speaking') renderSpeaking(item);
  }

  function renderMC(item){
    const box=document.querySelector('#interaction');
    box.innerHTML=`<div class="options">${item.options.map(o=>`<button class="option">${o}</button>`).join('')}</div><div class="actions"><button class="secondary hidden" id="hintButton">Need a hint</button><button class="primary hidden" id="nextButton">Continue</button></div>`;
    box.querySelectorAll('.option').forEach(btn=>btn.addEventListener('click',()=>{
      if(box.querySelector('.correct')) return;
      session.attempts++;
      const ok=normalise(btn.textContent)===normalise(item.a);
      if(ok){ btn.classList.add('correct'); finishAnswer(true,item); }
      else { btn.classList.add('wrong'); session.wrongThisQuestion=true; session.wrongAnswers.push(btn.textContent); showTry(); revealHintButton(item); }
    }));
  }

  function renderType(item){
    const box=document.querySelector('#interaction');
    box.innerHTML=`<input class="answer-input" id="answerInput" autocomplete="off" autocapitalize="sentences" placeholder="Type your answer"><div class="actions"><button class="secondary hidden" id="hintButton">Need a hint</button><button class="primary" id="checkButton">Check</button><button class="primary hidden" id="nextButton">Continue</button></div>`;
    const input=box.querySelector('#answerInput');
    const check=()=>{
      if(!input.value.trim()) return;
      session.attempts++;
      const accepted=[item.a,...(item.accept||[])].map(normalise);
      const ok=accepted.includes(normalise(input.value));
      if(ok){ input.disabled=true; finishAnswer(true,item); }
      else { session.wrongThisQuestion=true; session.wrongAnswers.push(input.value.trim()); showTry(); revealHintButton(item); }
    };
    box.querySelector('#checkButton').addEventListener('click',check);
    input.addEventListener('keydown',e=>{if(e.key==='Enter')check();});
  }

  function renderWriting(item){
    const box=document.querySelector('#interaction');
    box.innerHTML=`<p class="prompt-note">Write freely. This task uses a self-check because good writing can have many correct answers.</p><textarea class="writing-box" id="writingBox" placeholder="Write here…"></textarea><div class="checklist">${item.checks.map((c,i)=>`<label class="check-item"><input type="checkbox" data-check="${i}"><span>${c}</span></label>`).join('')}</div><div class="actions"><span class="prompt-note" id="wordCount">0 words · aim for ${item.minWords}+</span><button class="primary" id="nextButton" disabled>Save & continue</button></div>`;
    const area=box.querySelector('#writingBox'), button=box.querySelector('#nextButton'), checks=[...box.querySelectorAll('[data-check]')];
    const validate=()=>{const words=area.value.trim()?area.value.trim().split(/\s+/).length:0;box.querySelector('#wordCount').textContent=`${words} words · aim for ${item.minWords}+`;button.disabled=words<item.minWords||checks.some(c=>!c.checked);};
    area.value=state.days[session.day.id]?.drafts?.[session.index] || ''; validate();
    area.addEventListener('input',()=>{
      validate(); const day=state.days[session.day.id] || {};
      state.days[session.day.id]={...day,index:session.index,correct:session.correct,attempts:session.attempts,answers:session.answers,complete:false,drafts:{...day.drafts,[session.index]:area.value.slice(0,4000)}}; save();
    }); checks.forEach(c=>c.addEventListener('change',validate));
    button.addEventListener('click',()=>{ session.attempts++; session.answers.push({q:item.q,production:true,text:area.value.trim().slice(0,4000),status:'TEACHER_PENDING',words:area.value.trim().split(/\s+/).length}); session.correct++; advance(); });
  }

  function renderSpeaking(item){
    const box=document.querySelector('#interaction');
    box.innerHTML=`<div class="word-chips">${item.prompts.map(p=>`<span class="word-chip">${p}</span>`).join('')}</div><div class="recorder"><p><strong>Voice Booth</strong><br><span class="prompt-note">Record, listen, improve. The audio stays on this device and disappears when you leave the page.</span></p><button class="secondary" id="recordButton">● Start recording</button><audio id="playback" controls class="hidden"></audio><div class="checklist">${item.prompts.map((p,i)=>`<label class="check-item"><input type="checkbox" data-check="${i}"><span>${p}</span></label>`).join('')}</div></div><div class="actions"><button class="primary" id="nextButton" disabled>Finish mission</button></div>`;
    const button=box.querySelector('#nextButton'),checks=[...box.querySelectorAll('[data-check]')];
    checks.forEach(c=>c.addEventListener('change',()=>button.disabled=checks.some(x=>!x.checked)));
    button.addEventListener('click',()=>{session.attempts++;session.correct++;session.answers.push({q:item.q,speaking:true,status:'SELF_REPORTED'});advance();});
    setupRecorder(box.querySelector('#recordButton'),box.querySelector('#playback'));
  }

  async function setupRecorder(button,audio){
    if(!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder){ button.textContent='Recorder unavailable: practise aloud'; button.disabled=true; return; }
    let recorder,chunks=[];
    button.addEventListener('click',async()=>{
      if(recorder?.state==='recording'){recorder.stop();button.textContent='● Record again';button.classList.remove('recording');return;}
      try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder=new MediaRecorder(stream);chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=()=>{audio.src=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));audio.classList.remove('hidden');stream.getTracks().forEach(t=>t.stop());};recorder.start();button.textContent='■ Stop recording';button.classList.add('recording');}
      catch{button.textContent='Microphone blocked: practise aloud';button.disabled=true;}
    });
  }

  function showTry(){ document.querySelector('#feedback').innerHTML='<div class="feedback try"><strong>Not yet.</strong> Check the job of the word and try again.</div>'; }
  function revealHintButton(item){
    const button=document.querySelector('#hintButton'); if(!item.hint?.length) return;
    button.classList.remove('hidden'); button.onclick=()=>{const hint=item.hint[Math.min(session.hintLevel,item.hint.length-1)];session.hintLevel++;session.usedHint=true;document.querySelector('#feedback').innerHTML=`<div class="hint"><strong>Hint ${session.hintLevel}:</strong> ${hint}</div>`;if(session.hintLevel>=item.hint.length)button.textContent='Show hint again';};
  }
  function finishAnswer(ok,item){
    if(ok){session.correct++;state.xp+=10;if(session.usedHint){state.hintRecoveries++;award('comeback');}document.querySelector('#feedback').innerHTML=`<div class="feedback ok"><strong>Correct.</strong> ${item.a}</div>`;document.querySelector('#checkButton')?.classList.add('hidden');const next=document.querySelector('#nextButton');next.classList.remove('hidden');next.onclick=advance;document.querySelector('#hintButton')?.classList.add('hidden');session.answers.push({q:item.q,correct:true,firstTry:!session.wrongThisQuestion && !session.usedHint,recovered:Boolean(session.usedHint),wrong:session.wrongAnswers.slice(-8).map(x=>x.slice(0,200)),expected:String(item.a).slice(0,200)});
      state.days[session.day.id]={index:session.index+1,correct:session.correct,attempts:session.attempts,answers:session.answers,complete:false}; save(true);}
  }
  function advance(){session.index++;state.days[session.day.id]={index:session.index,correct:session.correct,attempts:session.attempts,answers:session.answers,complete:false};save();renderQuestion();}

  function completeMission(){
    const total=session.items.length;
    const score=Math.round(session.correct/total*100);
    state.days[session.day.id]={index:total,correct:session.correct,attempts:session.attempts,answers:session.answers,complete:true,score,completedAt:new Date().toISOString()};
    state.xp+=30;
    if(score>=70)award(session.day.badge);
    if(completedCount()===DATA.days.length)award('week');
    save(true);
    document.querySelector('#missionBar').style.transform='scaleX(1)';
    const card=document.querySelector('#gameCard');
    card.innerHTML=`<div class="completion"><div class="completion-icon">${score>=70?'PASS':'RETRY'}</div><h2>${score>=70?'Fitting complete':'Good practice'}</h2><div class="score-ring" style="--score:${score}%"><strong>${score}%</strong></div><p>${score>=70?'You earned today’s mastery patch.':'Repeat this fitting tomorrow to strengthen the difficult words.'}</p><p class="sync-note" id="completionSync">${tutoring?.authenticated?'Saving your result to your tutor…':'Saved on this device.'}</p><button class="primary" id="routeButton" ${tutoring?.authenticated?'disabled':''}>${tutoring?.authenticated?'Saving result…':'Back to the route'}</button>${completedCount()===DATA.days.length?`<button class="secondary" id="summaryButton">Copy tutor summary</button><div class="summary-box hidden" id="summaryBox"></div>`:''}</div>`;
    card.querySelector('#routeButton').addEventListener('click',()=>location.hash='home');
    card.querySelector('#summaryButton')?.addEventListener('click',copySummary);
  }

  async function copySummary(){
    const lines=['Street Style Quest: weekly summary',...DATA.days.map((d,i)=>`Day ${i+1}: ${state.days[d.id]?.complete?`${state.days[d.id].score}%`:'not complete'}`),`Badges: ${state.badges.length}/${DATA.badges.length}`,`XP: ${state.xp}`];
    const text=lines.join('\n'); const box=document.querySelector('#summaryBox'); box.textContent=text; box.classList.remove('hidden');
    try{await navigator.clipboard.writeText(text);document.querySelector('#summaryButton').textContent='Copied!';}catch{document.querySelector('#summaryButton').textContent='Select the summary below';}
  }

  window.addEventListener('hashchange',route);
  window.addEventListener('online',()=>{if(restored && tutoring?.authenticated){syncPending=true;syncProgress();}});
  mountHalloweenBoot();
  start();
})();
