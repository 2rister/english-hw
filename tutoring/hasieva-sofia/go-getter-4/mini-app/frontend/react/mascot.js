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

const app=document.querySelector('#app');
export function mountHalloweenBoot(){
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

export function mountCatalogMiso(){
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


const scriptURL=document.currentScript.src;
export const assetURL=path=>new URL(path,scriptURL).href;
