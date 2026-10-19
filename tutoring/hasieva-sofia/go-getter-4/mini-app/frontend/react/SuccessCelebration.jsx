import {useCallback, useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform} from 'motion/react';
import FinishScene from './FinishScene.jsx';
import ConfettiRain from './ConfettiRain.jsx';
import {randomEffect} from './block-result.mjs';

let lastEffect;
const celebrated = new Set();
const ease = [0.23, 1, 0.32, 1];
const point = (percent, radius) => {
  const angle = (-120 + percent * 2.4) * Math.PI / 180;
  return [160 + Math.sin(angle) * radius, 166 - Math.cos(angle) * radius];
};

function FinishEffect({kind,onComplete}) {
  if (kind==='confetti') return <ConfettiRain onComplete={onComplete}/>;
  const wave = kind === 'wave', count = wave ? 4 : 32;
  return createPortal(<div className={'finish-effects finish-'+kind} aria-hidden="true" data-celebration-effect={kind}>
    {Array.from({length:count}, (_,i) => {
      const angle = i * 2.39996, spread = 18 + (i % 8) * 3;
      const x = Math.cos(angle) * spread, y = Math.sin(angle) * spread;
      const firework = kind === 'fireworks';
      const origin = firework ? (i % 2 ? '28%' : '72%') : '50%';
      const start = 'translate(-50%, -50%) scale(0.95)';
      const end = wave ? `translate(-50%, -50%) scale(${2.5+i*.3})` : `translate(${x}vw, ${y}vh) rotate(${i*29}deg)`;
      return <motion.i key={i} className="finish-particle" style={{left:origin, '--particle-color':i%3===0?'#ff52ba':i%3===1?'#65f7f0':'#ffe898'}}
        initial={{opacity:0,transform:start}} animate={{opacity:[0,1,0],transform:[start,end]}}
        transition={{delay:2.35+(i%(wave?4:6))*.07,duration:wave?1.4:1.8,ease:'linear'}}>
        {kind==='stars'?'✦':null}
      </motion.i>;
    })}
  </div>, document.body);
}

export default function SuccessCelebration({outcome, label, sessionId, completedNow, onComplete, effectKind}) {
  const reduce = useReducedMotion(), [effect,setEffect] = useState(null), [accelerating,setAccelerating] = useState(false), [racing,setRacing] = useState(false);
  const jitter = useMotionValue(0);
  const finishRound = useCallback(() => {setEffect(null);setRacing(false);onComplete(true);}, [onComplete]);
  const value = useMotionValue(completedNow===sessionId&&!reduce&&!celebrated.has(sessionId)?0:outcome.percent), count = useTransform(value, latest => Math.floor(latest));
  const energy = useTransform(value, latest => Math.min(1,latest/100));
  const vibrationSize = useTransform(value, latest => `${latest>=80?2+(latest-80)/10:0.1+latest/100*1.4}px`);
  const vibrationPeriod = useTransform(value, latest => `${latest>=80?80:220-latest}ms`);
  const arcadeBlur = useTransform(value, latest => latest>=80?'blur(0.65px)':'blur(0px)');
  const arc = useTransform(value, latest => `${latest} 100`);
  const needle = useTransform([value,jitter], ([latest,vibration]) => {
    const shown=Math.max(0,Math.min(100,latest+vibration*(0.15+latest/100*1.8)));
    const a=point(shown-37.5,4), tip=point(shown,91), b=point(shown+37.5,4);
    return `M${a[0]} ${a[1]} L${tip[0]} ${tip[1]} L${b[0]} ${b[1]}Z`;
  });
  useEffect(() => {
    if (completedNow !== sessionId || celebrated.has(sessionId)) { onComplete(true);return; }
    onComplete(false);
    celebrated.add(sessionId);
    if (reduce) { onComplete(true);return; }
    if (outcome.passed) {
      lastEffect = effectKind || randomEffect(lastEffect);
      setEffect(lastEffect);
    }
    setAccelerating(true);setRacing(true);
    value.set(0);
    const playback = animate(value, outcome.percent, {duration:2.2,delay:0.2,ease:[0.55,0,0.85,0.6]});
    const vibration = animate(jitter, [0,-0.35,0.45,-0.55,0.4,-0.25,0], {duration:0.15,repeat:15,ease:'linear'});
    const settled = setTimeout(() => { setAccelerating(false);jitter.set(0); }, 2400);
    const timer = outcome.passed&&lastEffect==='confetti'?null:setTimeout(finishRound, outcome.passed?4500:3500);
    return () => { playback.stop();vibration.stop();clearTimeout(settled);clearTimeout(timer);setAccelerating(false);setRacing(false);setEffect(null);jitter.set(0);value.set(outcome.percent); };
  }, [completedNow, sessionId, outcome.percent, outcome.passed, reduce, value, jitter, onComplete, finishRound, effectKind]);
  return <><FinishScene animated={completedNow===sessionId}/>{effect&&!reduce&&<FinishEffect kind={effect} onComplete={finishRound}/>}<section className="finish-dashboard" data-block-passed={String(outcome.passed)} data-score-percent={outcome.percent}>
    <AnimatePresence>{accelerating&&!reduce&&<motion.div className="finish-speed" aria-hidden="true" style={{opacity:energy}} initial={false} exit={{opacity:0}} transition={{duration:0.18,ease}}>
      {Array.from({length:12},(_,i)=>{const angle=(i-5.5)*5;return <motion.i key={i} style={{left:`${5+i*8}%`,background:i%3===0?'#ff52ba':'#65f7f0'}}
        initial={{opacity:0,transform:`translateY(80px) rotate(${angle}deg) scaleY(0.6)`}}
        animate={{opacity:[0,0.7,0],transform:[`translateY(80px) rotate(${angle}deg) scaleY(0.6)`,`translateY(-230px) rotate(${angle}deg) scaleY(1.3)`]}}
        transition={{duration:0.5+i%3*.03,repeat:Infinity,delay:i*.025,ease:'linear'}}/>;})}
    </motion.div>}</AnimatePresence>
    <div className="finish-topline"><span>{outcome.passed?"ROUND CLEAR":"KEEP GOING"}</span><span>{outcome.supported?'GUIDED PRACTICE':'INDEPENDENT CHECK'}</span></div>
    <motion.div style={{"--vibration-size":vibrationSize,"--vibration-period":vibrationPeriod}} className={"finish-dial"+(accelerating&&!reduce?" is-accelerating":"")+(racing&&!reduce?" is-finishing":"")}>
      <motion.svg style={{filter:racing&&!reduce?arcadeBlur:"none"}} viewBox="0 0 320 260" aria-hidden="true" className="finish-gauge">
        <defs><linearGradient id="finishGaugeColor"><stop stopColor="#65f7f0"/><stop offset=".7" stopColor="#65f7f0"/><stop offset="1" stopColor="#ff52ba"/></linearGradient></defs>
        <path d="M64.737 221 A110 110 0 1 1 255.263 221" fill="none" stroke="#30333f" strokeWidth="10"/>
        <motion.path d="M64.737 221 A110 110 0 1 1 255.263 221" fill="none" stroke="url(#finishGaugeColor)" strokeWidth="10" pathLength="100" strokeDasharray={arc}/>
        {Array.from({length:21},(_,i)=>{const a=point(i*5,i%5?122:120),b=point(i*5,i%5?127:132);return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={i>=17?'#ff52ba':'#858997'} strokeWidth={i%5?1:2}/>;})}
        {[0,25,50,75,100].map(n=>{const p=point(n,146);return <text key={n} x={p[0]} y={p[1]} textAnchor="middle" dominantBaseline="middle" className="finish-tick">{n}</text>;})}
        <motion.path className="finish-needle" d={needle} fill="#ff52ba"/><circle className="finish-pivot" cx="160" cy="166" r="7" fill="#f5f8ff"/>
      </motion.svg>
      <h1 className="finish-score" aria-label={label}><motion.span aria-hidden="true">{count}</motion.span><span aria-hidden="true">%</span></h1>
    </motion.div>
    <p className="finish-score-detail">{outcome.total>0?<>{outcome.correct} / {outcome.total} {outcome.supported?'correct with support':'correct independently'}</>:'Practice result'}</p>
    <p className="finish-clear">{!outcome.passed?'TRY AGAIN':outcome.percent===100?'PERFECT RUN':'BLOCK COMPLETE'} <span>{outcome.passPercent||85}% TO PASS</span></p>
  </section></>;
}
