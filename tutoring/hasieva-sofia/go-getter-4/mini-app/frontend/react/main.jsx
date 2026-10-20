import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { createQuestController } from "./controller.mjs";
const routeLocation = { get hash() {
  return location.hash;
}, set hash(value) {
  location.hash = value;
}, catalogStart: document.body.dataset.start === "catalog" };
async function startApp() {
  try { await window.TUTORING?.sessionReady; }
  catch (error) {
    const root = document.querySelector('#app');
    root.setAttribute('role','alert'); root.textContent = error.message;
    return;
  }
const controller = createQuestController({ data: window.QUEST_DATA, tutoring: window.TUTORING, storage: window.localStorage, location: routeLocation, events: window });
const root = document.querySelector("#app");
root.dataset.renderer = "react";
createRoot(root).render(<App controller={controller} />);

}
startApp();
