export const PASS_PERCENT = 85;
export const EFFECTS = ['confetti', 'stars', 'fireworks', 'wave'];

export function roundOutcome(session) {
  const ids = new Set(session.ids), first = new Map();
  for (const event of session.results) if (ids.has(event.itemId) && !first.has(event.itemId)) first.set(event.itemId, event);
  const supported = Boolean(session.storyId) || session.mode === 'letters';
  const correct = [...first.values()].filter(event => event.correct === true && (supported || !event.hinted)).length;
  const total = ids.size, complete = total > 0 && session.index >= session.ids.length && first.size === total;
  return {correct, total, percent: total ? Math.floor(correct * 100 / total) : 0, supported,
    passed: complete && session.mode !== 'paper' && correct * 100 >= total * PASS_PERCENT};
}

export function randomEffect(previous, random = Math.random) {
  const choices = EFFECTS.filter(effect => effect !== previous);
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}
