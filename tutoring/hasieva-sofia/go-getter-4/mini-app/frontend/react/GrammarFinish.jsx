import {useState} from 'react';
import SuccessCelebration from './SuccessCelebration.jsx';
export default function GrammarFinish({current,fresh,onContinue,children}) {
  const [ready,setReady]=useState(!fresh);
  const theoryBlock=current.phase==='theory';
  const score=theoryBlock?100:current.score;
  const id=current.id+(theoryBlock?'-theory':'');
  return <><SuccessCelebration key={id} outcome={{percent:score,correct:theoryBlock?5:current.correct,total:theoryBlock?5:20,passed:theoryBlock||score>=90,passPercent:90,supported:theoryBlock}} label={`${score}% ${theoryBlock?"correct with practice":"correct on the first try"}`} sessionId={id} completedNow={fresh?id:null} onComplete={setReady}/>{children}<button className="primary" disabled={!ready} onClick={onContinue}>{!ready?'Finishing your run…':theoryBlock?'Launch grammar mission →':score>=90?'Back to My Learning':'Try a new version →'}</button></>;
}
