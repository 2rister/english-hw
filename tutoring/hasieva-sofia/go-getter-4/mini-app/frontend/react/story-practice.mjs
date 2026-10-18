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

export function chooseStory(bank, events) {
  const rounds = stories.map(story => ({storyId:story.id, ids:storyParts(story,bank).flat().filter(part => part.itemId).map(part => part.itemId)}));
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
