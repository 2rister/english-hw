import {PASS_PERCENT} from './block-result.mjs';
import stories from '../../../../../../vocab-space/stories.json' with {type:'json'};

export {stories};

export function storyParts(story, bank) {
  let number = 0;
  return story.paragraphs.map(paragraph => paragraph.split(/(\{[^}]+\})/).filter(Boolean).map(text => {
    if (!text.startsWith('{')) return {text};
    const word = text.slice(1, -1), item = bank.items.find(item => item.english === word);
    if (!item) throw Error('Unknown practice word: ' + word);
    const cue = [...word].map((letter, index) => index === 0 || !/[a-z]/i.test(letter) ? letter : '_').join(' ');
    return {itemId:item.id, number:++number, cue};
  }));
}

export function storyProgress(bank, events) {
  const attempts = new Map();
  for (const event of events) {
    if (!event.sessionId || event.mode !== 'exam' || !event.hinted) continue;
    if (!attempts.has(event.sessionId)) attempts.set(event.sessionId, new Map());
    const first = attempts.get(event.sessionId);
    if (!first.has(event.itemId)) first.set(event.itemId, event);
  }
  return stories.map(story => {
    const ids = storyParts(story, bank).flat().filter(part => part.itemId).map(part => part.itemId);
    const passed = [...attempts.values()].some(attempt => attempt.size === ids.length && ids.every(id => attempt.has(id)) &&
      ids.filter(id => attempt.get(id).correct === true).length * 100 >= ids.length * PASS_PERCENT);
    return {storyId: story.id, ids, passed};
  });
}

export function chooseStory(bank, events) {
  const rounds = storyProgress(bank, events);
  const next = rounds.find(round => !round.passed);
  if (next) return next;
  const exposure = round => events.filter(event => round.ids.includes(event.itemId)).length;
  return rounds.sort((a,b) => exposure(a)-exposure(b))[0];
}

export function repairWords(events) {
  const unresolved = new Set();
  for (const event of events) {
    if (event.correct === false) unresolved.add(event.itemId);
    else if (event.correct === true && !event.hinted && ['listen','context','exam'].includes(event.mode)) unresolved.delete(event.itemId);
  }
  return [...unresolved];
}
