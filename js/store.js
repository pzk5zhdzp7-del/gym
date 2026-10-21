// Alle Daten liegen lokal im Browser (localStorage). Export/Import als JSON-Backup.
const KEY = 'gym-app-v1';

function mondayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DEFAULTS = {
  profile: {
    name: '',
    sex: 'f',
    age: 28,
    height: 168,
    weight: 62,
    activity: 1.55,
    goal: 'maintain',
    proteinPerKg: 1.6,
    vegetarian: false,
    leftovers: false,
  },
  settings: { voice: true, cooldown: true, warmup: true, cardio: false },
  trainingDays: [1, 3, 5], // 0 = Sonntag … 6 = Samstag
  programStart: null, // Montag, an dem der aktuelle Zyklus begonnen hat
  choice: {}, // { ua1: 'rdl-bb' } = gewählte Variante je Platz im Plan
  lifts: {}, // { hipthrust: { weight: 40, phase: 'hyp' } } = Arbeitsgewicht je Übung
  failStreak: {},
  history: [],
  liftLog: [], // Gewichtssteigerungen
  weights: [],
  measures: [], // { date, waist, hips, glutes, thigh, arm }
  activeWorkout: null,
  mealPlan: null,
  shopping: { weekStart: null, checked: {}, custom: [] },
  customExercises: [], // eigene Übungen (siehe custom.js)
  customRecipes: [], // eigene Rezepte (siehe recipes.js)
  customIngredients: {},
  recipeOff: [], // abgewählte Rezepte, kommen nicht in den Wochenplan
  sync: {}, // { db, code, name, member } = gemeinsamer Ernährungsplan (siehe sync.js)
  syncQueue: [],
};

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function fill(data) {
  const s = {
    ...clone(DEFAULTS),
    ...data,
    profile: { ...DEFAULTS.profile, ...data.profile },
    settings: { ...DEFAULTS.settings, ...data.settings },
  };
  if (!s.programStart) s.programStart = mondayIso();
  return s;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return fill(raw ? JSON.parse(raw) : {});
  } catch {
    return fill({});
  }
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Speichern fehlgeschlagen', e);
  }
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (typeof data !== 'object' || !data.profile || !data.lifts) throw new Error('Keine gültige Sicherung');
  Object.keys(state).forEach((k) => delete state[k]);
  Object.assign(state, fill(data));
  save();
}

export function resetAll() {
  localStorage.removeItem(KEY);
}

export { mondayIso };

// Bittet iOS/Safari, die Daten nicht automatisch zu löschen
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}
