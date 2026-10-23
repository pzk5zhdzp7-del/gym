import { state } from './store.js';
import {
  buildWorkout, buildMobilityWorkout, startWorkout, calendarDays, dateOnly, nextSessionKey, phaseInfo, strengthHistory,
} from './training.js';
import { SESSIONS, MUSCLES, getExercise } from './data/exercises.js';
import { ui, closeSheet, keepAwake, unlockAudio, fmtDate } from './ui.js';
import { viewHome, homeTitle } from './views/home.js';
import { viewPlan, planActions } from './views/plan.js';
import { viewExercises, exerciseActions, submitExercise } from './views/exercises.js';
import { applyCustomExercises } from './custom.js';
import { viewProgress, progressActions, addWeight, addMeasures } from './views/progress.js';
import { viewFood, foodActions, foodChanges, addCustom, submitRecipe } from './views/food.js';
import { viewProfile, profileActions, profileChange } from './views/profile.js';
import { viewPlayer, playerActions, beginWorkout, tick } from './views/player.js';
import { start as startSync, onRemoteChange } from './sync.js';
import { refreshCustom } from './recipes.js';
import { photoActions, submitEatenOut } from './photo.js';
import { activityActions, submitActivity, configureActivity } from './activity.js';
import { sorenessActions, configureSoreness } from './soreness.js';

const $view = document.getElementById('view');
const $title = document.getElementById('title');

const routes = [
  { re: /^#\/?$/, tab: 'home', title: 'Heute', view: viewHome },
  { re: /^#\/plan$/, tab: 'plan', title: 'Plan', view: viewPlan },
  { re: /^#\/exercises$/, tab: 'exercises', title: 'Übungen', view: viewExercises },
  { re: /^#\/progress$/, tab: 'progress', title: 'Fortschritt', view: viewProgress },
  { re: /^#\/food$/, tab: 'food', title: 'Ernährung', view: viewFood },
  { re: /^#\/profile$/, tab: 'profile', title: 'Profil', view: viewProfile },
  { re: /^#\/workout$/, tab: 'home', title: 'Training', view: viewPlayer },
];

function render() {
  applyCustomExercises();
  const hash = location.hash || '#/';
  const route = routes.find((r) => r.re.test(hash)) || routes[0];
  const inWorkout = route.view === viewPlayer;
  document.body.classList.toggle('workout', inWorkout);
  keepAwake(inWorkout);
  $title.textContent = route.title;
  if (route.view === viewHome) $title.textContent = homeTitle();
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === route.tab));
  $view.innerHTML = route.view();
}
ui.render = render;

function onHome() {
  return routes[0].re.test(location.hash || '#/');
}

let lastHash = location.hash;
window.addEventListener('hashchange', () => {
  closeSheet();
  render();
  if (location.hash !== lastHash) window.scrollTo(0, 0);
  lastHash = location.hash;
});

function begin(workout) {
  startWorkout(workout);
  beginWorkout();
  location.hash = '#/workout';
}

const actions = {
  ...planActions,
  ...exerciseActions,
  ...progressActions,
  ...foodActions,
  ...photoActions,
  ...activityActions,
  ...sorenessActions,
  ...profileActions,
  ...playerActions,
  'start-workout'(el) {
    if (state.activeWorkout) { location.hash = '#/workout'; return; }
    begin(buildWorkout(el.dataset.key));
  },
  'start-mobility'() {
    if (state.activeWorkout) return;
    begin(buildMobilityWorkout());
  },
  'close-sheet'() {
    closeSheet();
  },
  'home-day'(el) {
    shiftDay(Number(el.dataset.dir));
  },
};

/* ---------- Startseite: Tage wechseln (Pfeile oder seitlich wischen) ---------- */

function shiftDay(dir) {
  const step = dir || -Math.sign(ui.homeOffset); // 0 = zurück zu heute
  if (!step) return;
  ui.homeOffset = dir ? ui.homeOffset + dir : 0;
  render();
  window.scrollTo(0, 0);
  $view.classList.remove('day-next', 'day-prev');
  void $view.offsetWidth; // Animation neu starten
  $view.classList.add(step > 0 ? 'day-next' : 'day-prev');
}

$view.addEventListener('animationend', () => $view.classList.remove('day-next', 'day-prev'));

let swipe = null;
$view.addEventListener('touchstart', (e) => {
  swipe = null;
  if (!onHome() || e.touches.length !== 1 || e.target.closest('input, select, textarea, .exnav')) return;
  const t = e.touches[0];
  swipe = { x: t.clientX, y: t.clientY, at: e.timeStamp };
}, { passive: true });

$view.addEventListener('touchend', (e) => {
  if (!swipe) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipe.x;
  const dy = t.clientY - swipe.y;
  const quick = e.timeStamp - swipe.at < 800;
  swipe = null;
  // Nach links wischen = nächster Tag, nach rechts = vorheriger
  if (quick && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) shiftDay(dx < 0 ? 1 : -1);
}, { passive: true });

$view.addEventListener('touchcancel', () => { swipe = null; });

const changeActions = { ...foodChanges };

document.addEventListener('click', (e) => {
  unlockAudio();
  // Tab „Heute“ springt immer zurück auf heute
  if (e.target.closest('.tabbar a[data-tab="home"]') && ui.homeOffset) {
    ui.homeOffset = 0;
    if (onHome()) render();
  }
  const el = e.target.closest('[data-action]');
  if (!el || el.type === 'checkbox') return;
  const fn = actions[el.dataset.action];
  if (fn) {
    e.preventDefault();
    fn(el);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.action && changeActions[el.dataset.action]) changeActions[el.dataset.action](el);
  else profileChange(el);
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  if (form.dataset.form === 'add-custom') addCustom(form);
  if (form.dataset.form === 'recipe') submitRecipe(form);
  if (form.dataset.form === 'eaten-out') submitEatenOut(form);
  if (form.dataset.form === 'activity') submitActivity(form);
  if (form.dataset.form === 'exercise') submitExercise(form);
  if (form.dataset.form === 'weight') addWeight(form);
  if (form.dataset.form === 'measure') addMeasures(form);
});

setInterval(tick, 250);

// Nach längerer Pause startet die Startseite wieder bei heute
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > 30 * 60000) ui.homeOffset = 0;
  render();
});

// Was Claude über den Plan wissen muss, um anderes Training einzuordnen
configureActivity({
  context() {
    const next = calendarDays(dateOnly(new Date()), 14).find((d) => d.planned);
    const key = next?.planned || nextSessionKey();
    const names = buildWorkout(key).entries.map((e) => getExercise(e.exId).name).join(', ');
    const when = next ? fmtDate(next.date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'demnächst';
    return `Krafttraining im Gym (Muskelaufbau und Straffen), ${state.trainingDays.length}× pro Woche, aktuell Phase „${phaseInfo().name}“. Nächstes Training: ${SESSIONS[key].name} am ${when} (${names}).`;
  },
});

// Muskelkater: welche Muskeln das letzte und das nächste Training beanspruchen
const trainingItem = (exId) => {
  const ex = getExercise(exId);
  return { name: ex.name, muscles: ex.muscles, muscles2: ex.muscles2 || [] };
};
configureSoreness({
  muscles: MUSCLES,
  lastWorkout() {
    const h = strengthHistory().slice(-1)[0];
    return h && { date: h.date, name: SESSIONS[h.session]?.name || 'Training', items: h.entries.filter((e) => getExercise(e.exId)).map((e) => trainingItem(e.exId)) };
  },
  nextWorkout() {
    const next = calendarDays(dateOnly(new Date()), 14).find((d) => d.planned);
    const key = next?.planned || nextSessionKey();
    const date = next?.date || new Date();
    const w = buildWorkout(key, phaseInfo(date).key, date);
    return { name: SESSIONS[key].name, date, skipped: w.skipped, swapped: w.swapped, items: w.entries.map((e) => trainingItem(e.exId)) };
  },
});

refreshCustom();
render();

// Änderungen aus der anderen App: neu zeichnen, aber nicht während einer Eingabe
let syncTimer = null;
onRemoteChange(() => {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    refreshCustom();
    const busy = document.activeElement?.matches('input:not([type=checkbox]):not([type=file]), select, textarea');
    const sheetOpen = !document.getElementById('sheet').classList.contains('hidden');
    if (!busy && !sheetOpen) render();
  }, 150);
});
startSync();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
