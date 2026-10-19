import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {motion,useReducedMotion} from 'motion/react';

export default function FinishScene({animated=true}) {
  const reduce=useReducedMotion();
  useEffect(()=>{
    document.body.classList.add('finish-scene');
    return ()=>document.body.classList.remove('finish-scene');
  },[]);
  return createPortal(<motion.div className="finish-backdrop" aria-hidden="true"
    initial={animated&&!reduce?{clipPath:'circle(0% at 50% 35%)'}:false}
    animate={{clipPath:'circle(150% at 50% 35%)'}}
    transition={{duration:reduce?0:0.75,ease:[0.23,1,0.32,1]}}/>,document.body);
}
