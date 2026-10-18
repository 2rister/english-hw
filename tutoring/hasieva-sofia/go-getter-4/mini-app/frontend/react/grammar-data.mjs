const normalise = (value) => String(value || "").toLowerCase().trim().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
const matches = (value, answer) => {
  const expected = normalise(answer), actual = normalise(value);
  if (!expected.includes(";")) return actual === expected;
  return actual.split(/\s*[;,/]\s*/).map(normalise).join(";") === expected.split(";").map(normalise).join(";");
};
function parseBank(text) {
  return text.split(/^### Variant /m).slice(1).map((chunk) => {
    const lines = chunk.split("\n");
    const id = lines.shift().trim().slice(0, 2);
    const items = lines.filter((line) => /^\|\s*\d+\s*\|/.test(line)).map((line) => {
      const c = line.split("|").slice(1, -1).map((x) => x.trim());
      return { id: c[0], type: c[1], prompt: c[2], answer: c[3], feedback: c[4] };
    });
    return { id, items };
  }).filter((v) => v.items.length === 20);
}
function strip(text) {
  return String(text).replace(/\*\*/g, "");
}
function choices(item) {
  const hit = String(item.prompt || item.q || "").match(/\*\*\(([^)]+)\)\*\*/);
  return hit ? hit[1].split("/").map((x) => x.trim()) : null;
}
const theory = [
  { title: "1 · Meaning", text: "Present Simple = habits, facts and timetables. Present Continuous = now, around now, or a temporary situation.", q: "Every day, Mia **(walks / is walking)** to college.", answer: "walks", why: "Every day shows a habit, so use Present Simple." },
  { title: "2 · Form", text: "Simple: she works / she does not work / Does she work? Continuous: she is working / she is not working / Is she working?", q: "Look! She **(works / is working)** now.", answer: "is working", why: "Look! and now show an action in progress." },
  { title: "3 · State verbs", text: "Know, need, want, understand, believe and own usually describe a state. Use Present Simple: I understand.", q: "I **(know / am knowing)** the answer.", answer: "know", why: "Know is usually a state verb, not an action now." },
  { title: "4 · Special always", text: "He is always leaving his towel here! can show an annoying temporary behaviour.", q: "He **(always leaves / is always leaving)** his wet towel here this week!", answer: "is always leaving", why: "Always + Continuous can show annoying behaviour around now." },
  { title: "5 · Choose by meaning", text: "Do not choose only by a time word. Ask: Is this a routine, a state, or something happening/temporary now?", q: "My dad usually drives, but today he **(takes / is taking)** the train.", answer: "is taking", why: "Usually is a habit; today is a temporary change." }
];
export {
  choices,
  matches,
  parseBank,
  strip,
  theory
};
