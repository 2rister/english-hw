import {useId, useState} from 'react';
import {AnimatePresence, MotionConfig, motion, useReducedMotion} from 'motion/react';

export {MotionConfig};
const ease=[0.23,1,0.32,1];

export function ActionButton({children, type='button', preserveInput=false, onPointerDown, ...props}) {
  const reduce=useReducedMotion(), [pressed,setPressed]=useState(false);
  const release=()=>setPressed(false);
  return <motion.button {...props} type={type} initial={false}
    animate={{transform:pressed&&!reduce?'scale(0.985)':'scale(1)'}}
    transition={{duration:reduce?0:0.12,ease}}
    onPointerDown={event=>{
      if (preserveInput && event.pointerType==='mouse' && event.currentTarget.ownerDocument.activeElement?.id==='answer') event.preventDefault();
      if (!props.disabled) setPressed(true);
      onPointerDown?.(event);
    }} onPointerUp={release} onPointerCancel={release} onPointerLeave={release}>{children}</motion.button>;
}

export function Reveal({label, children, className=''}) {
  const [open,setOpen]=useState(false), reduce=useReducedMotion(), id=useId();
  return <section className={'vocab-reveal '+className}>
    <ActionButton className="reveal-trigger" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>
      <span>{label}</span><motion.svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" initial={false}
        animate={{transform:`rotate(${open?180:0}deg)`}} transition={{duration:reduce?0:0.18,ease}}>
        <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </ActionButton>
    <div id={id} inert={!open} aria-hidden={!open}>
      <AnimatePresence initial={false}>{open&&<motion.div className="reveal-content" key="content"
        initial={reduce?false:{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
        exit={{height:reduce?'auto':0,opacity:reduce?1:0}} transition={{duration:reduce?0:0.2,ease}}>
        <div className="reveal-inner">{children}</div>
      </motion.div>}</AnimatePresence>
    </div>
  </section>;
}

function AudioIcon({phase}) {
  const reduce=useReducedMotion();
  return <motion.svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" initial={false}
    animate={{transform:phase==='loading'&&!reduce?'rotate(360deg)':'rotate(0deg)'}}
    transition={phase==='loading'&&!reduce?{duration:0.8,repeat:Infinity,ease:'linear'}:{duration:0}}>
    {phase==='loading'?<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="35 16" />:
      phase==='playing'?<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />:
      <path d="m8 5 11 7-11 7Z" fill="currentColor" />}
  </motion.svg>;
}

export function AudioControl({controller:c,snapshot:s,target,play,label='Listen',ariaLabel}) {
  const active=s.playing===target, phase=active?(s.audioStatus||'playing'):'idle';
  const text=phase==='loading'?'Loading audio · Cancel':phase==='playing'?'Stop audio':label;
  return <ActionButton className={'vocab-play '+(active?'is-active':'')} preserveInput
    data-audio-phase={phase} aria-label={active?text:(ariaLabel||label)} onClick={()=>active?c.stop():play()}>
    <AudioIcon phase={phase}/><span>{text}</span>
  </ActionButton>;
}

export function ResultEntrance({children}) {
  const reduce=useReducedMotion();
  return <motion.section className="vocab-results" initial={reduce?false:{opacity:0.4,transform:'translateY(8px)'}}
    animate={{opacity:1,transform:'translateY(0px)'}} transition={{duration:reduce?0:0.2,ease}}>{children}</motion.section>;
}
