import {useEffect,useMemo,useRef,useState} from 'react';
import {useReducedMotion} from 'motion/react';
import {SpaceScene} from './GrammarSpaceScene.js';
import {flightQuestion,flightStats,COURSE_MS} from './grammar-space.mjs';
import {strip} from './grammar-data.mjs';

export default function GrammarSpace({current,item,shown,feedback,disabled,onAnswer,onCheckpoint}){
  const reduce=useReducedMotion(),question=useMemo(()=>flightQuestion(item,current.id),[item,current.id]);
  const saved=current.flight?.itemId===item.id?current.flight:null;
  const [phase,setPhase]=useState(current.flight?.launched?'paused':'intro');
  const [selected,setSelected]=useState(saved?.selectedId||null),[remaining,setRemaining]=useState(saved?.remainingMs??COURSE_MS);
  const scene=useRef(null),canvas=useRef(null),phaseRef=useRef(phase),selectedRef=useRef(selected),remainingRef=useRef(remaining),deadline=useRef(0),grace=useRef(null),commitRef=useRef(null);
  phaseRef.current=phase;selectedRef.current=selected;
  const stats=flightStats(current),intro=phase==='intro';
  function checkpoint(){onCheckpoint?.({itemId:item.id,selectedId:selectedRef.current,remainingMs:remainingRef.current});}
  function commit(){
    if(phaseRef.current!=='flight'||disabled)return;
    phaseRef.current='feedback';setPhase('feedback');remainingRef.current=Math.max(0,deadline.current-performance.now());checkpoint();
    const option=question.options.find(value=>value.id===selectedRef.current);
    onAnswer(option?.text||'Time expired');
  }
  commitRef.current=commit;
  function choose(index,x){
    if(phaseRef.current!=='flight'||disabled)return;
    const bounded=Math.max(0,Math.min(question.options.length-1,index)),id=question.options[bounded].id;
    const changed=selectedRef.current!==id;selectedRef.current=id;setSelected(id);scene.current?.steer(x??(bounded+.5)/question.options.length);if(changed)checkpoint();
  }
  function pause(){if(phaseRef.current!=='flight')return;remainingRef.current=Math.max(0,deadline.current-performance.now());setRemaining(remainingRef.current);checkpoint();phaseRef.current='paused';setPhase('paused');}
  function launch(){phaseRef.current='flight';setPhase('flight');checkpoint();}
  function repair(){remainingRef.current=COURSE_MS;setRemaining(COURSE_MS);selectedRef.current=null;setSelected(null);launch();}
  useEffect(()=>{document.body.classList.add('grammar-space');return()=>document.body.classList.remove('grammar-space');},[]);
  useEffect(()=>{
    if(intro||!canvas.current)return;
    const flight=new SpaceScene(canvas.current);scene.current=flight;flight.set(1);const index=question.options.findIndex(option=>option.id===selectedRef.current);if(index>=0)flight.steer((index+.5)/question.options.length);
    return()=>{flight.destroy();scene.current=null;};
  },[intro,reduce]);
  useEffect(()=>{if(phase==='flight'&&!reduce)scene.current?.start();else if(phase==='feedback'&&!reduce)scene.current?.start();else scene.current?.stop();},[phase,intro,reduce]);
  useEffect(()=>{
    if(feedback&&phase==='feedback'){if(feedback.wrong)scene.current?.impact();else scene.current?.confirm();}
  },[feedback,phase]);
  useEffect(()=>{
    const restored=current.flight?.itemId===item.id?current.flight:null;
    selectedRef.current=restored?.selectedId||null;setSelected(selectedRef.current);remainingRef.current=restored?.remainingMs??COURSE_MS;setRemaining(remainingRef.current);
    if(phaseRef.current!=='intro'&&phaseRef.current!=='paused'){phaseRef.current='flight';setPhase('flight');}
  },[item.id]);
  useEffect(()=>{
    if(phase!=='flight')return;
    deadline.current=performance.now()+remainingRef.current;let lastSaved=Math.ceil(remainingRef.current/1000);
    const timer=setInterval(()=>{
      remainingRef.current=Math.max(0,deadline.current-performance.now());setRemaining(remainingRef.current);
      const second=Math.ceil(remainingRef.current/1000);if(second!==lastSaved){lastSaved=second;checkpoint();}
      if(remainingRef.current===0&&!grace.current)grace.current=setTimeout(()=>{grace.current=null;commitRef.current();},120);
    },100);
    const hidden=()=>{if(document.hidden)pause();};
    const key=event=>{if(event.target.closest('button')&&['Enter',' '].includes(event.key))return;const index=question.options.findIndex(option=>option.id===selectedRef.current);if(['ArrowLeft','ArrowRight','1','2','3'].includes(event.key)){event.preventDefault();choose(event.key==='ArrowLeft'?0:event.key==='ArrowRight'?question.options.length-1:Number(event.key)-1);}else if(event.key==='Enter'){event.preventDefault();commitRef.current();}};
    document.addEventListener('visibilitychange',hidden);document.addEventListener('keydown',key);window.addEventListener('pagehide',checkpoint);
    return()=>{clearInterval(timer);clearTimeout(grace.current);grace.current=null;document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',key);window.removeEventListener('pagehide',checkpoint);};
  },[phase,item.id]);
  if(intro)return <section className="grammar-intro" aria-label="Sonya's grammar mission"><img className="mission-portrait" src="assets/sonya-astronaut.webp" alt="Sonya in an astronaut suit, holding the visor of her helmet"/><div className="mission-cover"><p>SONYA · MISSION CONTROL</p><h1>Grammar<br/>Orbit</h1><p>20 sectors. 20 seconds to choose each course.<br/>Drag your rocket or tap a course. Lock it when ready.</p><button className="primary" autoFocus onClick={launch}>Start flight →</button></div></section>;
  return <section className={'grammar-flight '+(phase==='feedback'?(feedback?.wrong?'is-hit':'is-boost'):'')} aria-label="Grammar space mission" data-phase={phase}>
    <canvas ref={canvas} aria-hidden="true" className="flight-canvas"/>
    <header className="flight-hud"><span>SECTOR <strong>{shown+1}/20</strong></span><span>HULL <strong>{stats.hull}%</strong></span><button type="button" className="secondary flight-pause" disabled={phase!=='flight'} onClick={pause}>Pause</button></header>
    <div className="flight-question"><div className="task-meta">Variant {current.variantId} · {shown+1} / 20 · {item.type}</div><h2>{strip(item.prompt)}</h2><div className={'flight-timer'+(remaining<5000?' is-urgent':'')} role="timer" aria-label="Time left"><strong>{(remaining/1000).toFixed(1)}s</strong><progress max={COURSE_MS} value={remaining}/></div></div>
    <div className="flight-courses">{question.options.map((option,index)=><button type="button" className="flight-course" data-course={option.id} aria-pressed={selected===option.id} key={option.id} disabled={phase!=='flight'||disabled} onClick={()=>choose(index)}><span className="course-number" aria-hidden="true" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span>{option.text.replace(/\s*;\s*/g,' / ')}</span></button>)}</div>
    <div className="flight-steering" role="group" aria-label="Drag to steer your rocket" onPointerDown={event=>{if(phaseRef.current!=='flight')return;event.currentTarget.setPointerCapture(event.pointerId);const box=event.currentTarget.getBoundingClientRect(),x=Math.max(.1,Math.min(.9,(event.clientX-box.left)/box.width));choose(Math.min(question.options.length-1,Math.floor(x*question.options.length)),x);}} onPointerMove={event=>{if(!event.currentTarget.hasPointerCapture(event.pointerId))return;const box=event.currentTarget.getBoundingClientRect(),x=Math.max(.1,Math.min(.9,(event.clientX-box.left)/box.width));choose(Math.min(question.options.length-1,Math.floor(x*question.options.length)),x);}}><span>DRAG TO STEER · ← →</span></div>
    <div className="flight-controls"><button className="primary" disabled={!selected||phase!=='flight'||disabled} onClick={commit}>Lock course</button></div>
    {phase==='paused'&&<div className="flight-modal"><h2>Flight paused</h2><p>Your course and remaining time are kept.</p><button className="primary" autoFocus onClick={launch}>Resume flight</button></div>}
    {phase==='feedback'&&<div className={'flight-feedback '+(feedback?.wrong?'wrong':'correct')} role="status"><h2>{feedback?.wrong?'METEOR HIT':'HYPERDRIVE'}</h2><p>{feedback?.text}</p>{feedback?.wrong&&<button className="primary" autoFocus onClick={repair}>Repair course →</button>}</div>}
  </section>;
}
