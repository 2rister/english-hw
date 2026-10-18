import {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import confetti from 'canvas-confetti';

export default function ConfettiRain({onComplete}) {
  const canvas = useRef(null);
  useEffect(() => {
    let active = true;
    const fire = confetti.create(canvas.current, {resize:true, useWorker:true});
    const timer = setTimeout(() => {
      const common = {origin:{x:0.5,y:-0.12}, angle:270, spread:165, ticks:165,
        shapes:['square','circle'], disableForReducedMotion:true};
      try {
        const background = fire({...common, particleCount:120, scalar:0.7, startVelocity:30, decay:0.91, gravity:0.8,
          colors:['#a78de0','#819bd4','#e5a0c4','#e8bf76']});
        const foreground = fire({...common, particleCount:220, scalar:1.4, startVelocity:38, decay:0.92, gravity:1.25,
          colors:['#9550ed','#ffbe32','#ff762d','#7781ff','#4b9cff','#ff4f77','#ef82cd']});
        Promise.all([background,foreground]).then(() => {if(active) onComplete();}, () => {if(active) onComplete();});
      } catch { if(active) onComplete(); }
    }, 1100);
    return () => {active=false;clearTimeout(timer);fire.reset();};
  }, [onComplete]);
  return createPortal(<div className="finish-effects finish-confetti" aria-hidden="true" data-celebration-effect="confetti">
    <canvas ref={canvas} className="finish-confetti-canvas"/>
  </div>, document.body);
}
