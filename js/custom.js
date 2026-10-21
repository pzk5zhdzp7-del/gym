// Eigene Übungen: landen in „Alle Übungen“, sind bei passenden Plätzen als Variante
// wählbar und können zusätzlich fest in eine Einheit eingeplant werden.
import { EXERCISES, SESSIONS, ARCHIVE, getExercise } from './data/exercises.js';
import { state, save } from './store.js';

export const TYPES = {
  compound: { label: 'Mit Gewicht · Grundübung (schwer, wenige Wdh.)' },
  iso: { label: 'Mit Gewicht · Isolationsübung (leichter, mehr Wdh.)' },
  bw: { label: 'Eigenes Körpergewicht (Wiederholungen)' },
  hold: { label: 'Position halten (Sekunden)' },
};

export function exerciseType(ex) {
  if (ex.type === 'hold') return 'hold';
  if (ex.bw) return 'bw';
  return ex.kind === 'compound' ? 'compound' : 'iso';
}

function fields(type, inc) {
  if (type === 'hold') return { kind: 'core', type: 'hold', bw: true, min: 20, max: 45 };
  if (type === 'bw') return { kind: 'iso', bw: true };
  return { kind: type, inc: inc > 0 ? inc : 2.5 };
}

function slotGroup(slot) {
  return getExercise(slot.options[0])?.group;
}

// Eigene Übungen in Übungsliste und Plan einhängen (idempotent)
export function applyCustomExercises() {
  const list = state.customExercises || [];
  for (let i = EXERCISES.length - 1; i >= 0; i--) if (EXERCISES[i].custom) EXERCISES.splice(i, 1);
  ARCHIVE.splice(0, ARCHIVE.length, ...list.filter((e) => e.deleted));
  for (const s of Object.values(SESSIONS)) {
    s.slots = s.slots.filter((slot) => !slot.custom);
    s.slots.forEach((slot) => { slot.options = slot.options.filter((o) => !o.startsWith('cx-')); });
  }
  const active = list.filter((e) => !e.deleted);
  EXERCISES.push(...active);
  for (const ex of active) {
    const s = SESSIONS[ex.session];
    // Als Variante wählbar, außer in der Einheit, in der sie schon fest eingeplant ist
    for (const other of Object.values(SESSIONS)) {
      if (other !== s) other.slots.forEach((slot) => { if (slotGroup(slot) === ex.group) slot.options.push(ex.id); });
    }
    if (!s) continue;
    const slot = { id: `x-${ex.id}`, sets: ex.sets || 3, options: [ex.id], custom: true };
    // Vor die Bauchübung am Ende, die bleibt der Abschluss
    const last = s.slots[s.slots.length - 1];
    if (last && getExercise(last.options[0])?.kind === 'core' && ex.kind !== 'core') s.slots.splice(s.slots.length - 1, 0, slot);
    else s.slots.push(slot);
  }
}

export function saveExercise(data) {
  const list = state.customExercises || [];
  const id = data.id || `cx-${Date.now().toString(36)}`;
  const ex = {
    id,
    custom: true,
    icon: '⭐',
    name: data.name,
    group: data.group,
    equip: data.equip || 'Eigene Übung',
    side: !!data.side,
    muscles: data.muscles,
    muscles2: [],
    setup: data.setup || '',
    steps: data.steps,
    mistakes: data.mistakes,
    tip: data.tip || '',
    session: data.session || '',
    sets: data.sets || 3,
    ...fields(data.type, data.inc),
  };
  const i = list.findIndex((e) => e.id === id);
  if (i >= 0) list[i] = ex;
  else list.push(ex);
  state.customExercises = list;
  save();
  applyCustomExercises();
  return ex;
}

export function deleteExercise(id) {
  const ex = (state.customExercises || []).find((e) => e.id === id);
  if (!ex) return;
  ex.deleted = true;
  for (const [slot, choice] of Object.entries(state.choice)) if (choice === id) delete state.choice[slot];
  save();
  applyCustomExercises();
}
