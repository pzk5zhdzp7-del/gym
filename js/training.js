import { SESSIONS, ROTATION, WARMUP, getExercise } from './data/exercises.js';
import { MOBILITY, getMobility } from './data/mobility.js';
import { state, save, mondayIso } from './store.js';
import { soreBlock } from './soreness.js';

/* ---------- Periodisierung ---------- */

// Ein Zyklus = 6 Wochen: 3× Aufbau, 2× Kraft, 1× Deload
export const PHASES = {
  hyp: {
    name: 'Aufbau', color: '#db2777',
    desc: 'Muskelaufbau und Straffen: mittlere Gewichte, 8–15 Wiederholungen, kurze Pausen. Schaffst du überall das obere Ende, gibt es mehr Gewicht.',
  },
  str: {
    name: 'Kraft', color: '#7c3aed',
    desc: 'Schwerere Gewichte bei den Grundübungen (5–8 Wiederholungen), längere Pausen. Macht dich stärker, damit du im nächsten Aufbau mehr bewegst.',
  },
  deload: {
    name: 'Deload', color: '#16a34a',
    desc: 'Entlastungswoche: etwas leichtere Gewichte und weniger Sätze. Muskeln, Sehnen und Gelenke erholen sich, danach geht es stärker weiter.',
  },
};
export const CYCLE = ['hyp', 'hyp', 'hyp', 'str', 'str', 'deload'];
const DAY = 86400000;

// Wiederholungsbereiche je Übungsart und Phase
const RANGES = {
  compound: { hyp: [8, 12], str: [5, 8], deload: [8, 10] },
  iso: { hyp: [12, 15], str: [10, 12], deload: [12, 15] },
};
const REST = {
  compound: { hyp: 90, str: 150, deload: 90 },
  iso: { hyp: 60, str: 75, deload: 60 },
  core: { hyp: 45, str: 45, deload: 45 },
};

export function dateOnly(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function phaseInfo(date = new Date()) {
  const start = dateOnly(state.programStart);
  const weekIdx = Math.max(0, Math.floor((dateOnly(date) - start) / DAY / 7));
  const w = weekIdx % CYCLE.length;
  const key = CYCLE[w];
  const first = CYCLE.indexOf(key);
  const weeks = CYCLE.filter((k) => k === key).length;
  return { key, ...PHASES[key], cycle: Math.floor(weekIdx / CYCLE.length) + 1, cycleWeek: w + 1, weekInPhase: w - first + 1, weeks };
}

export function restartCycle() {
  state.programStart = mondayIso();
  save();
}

/* ---------- Übungen & Gewichte ---------- */

export function slotExercise(slot) {
  const id = state.choice[slot.id];
  return getExercise(slot.options.includes(id) ? id : slot.options[0]);
}

export function repRange(ex, phase) {
  if (ex.kind === 'core') return [ex.min, ex.max];
  return RANGES[ex.kind][phase];
}

export function roundTo(v, inc) {
  return Math.max(0, Math.round(Math.round(v / inc) * inc * 100) / 100);
}

function roundDown(v, inc) {
  return Math.max(0, Math.round(Math.floor(v / inc + 1e-9) * inc * 100) / 100);
}

export function e1rm(kg, reps) {
  return kg * (1 + reps / 30);
}

export function hasWeight(ex) {
  return !ex.bw && ex.type !== 'hold';
}

// Vorgeschlagenes Arbeitsgewicht für diese Phase (null = noch unbekannt)
export function workingWeight(ex, phase) {
  if (!hasWeight(ex)) return null;
  const lift = state.lifts[ex.id];
  if (!lift || lift.weight == null) return null;
  let w = lift.weight;
  if (!ex.assist && lift.e1 && lift.phase && lift.phase !== phase && phase !== 'deload' && ex.kind !== 'core') {
    // Phasenwechsel: Gewicht über die geschätzte Maximalkraft auf den neuen Bereich umrechnen
    const [min] = repRange(ex, phase);
    w = roundDown(lift.e1 / (1 + (min + 2) / 30), ex.inc);
  }
  if (phase === 'deload') w = ex.assist ? roundTo(w * 1.15 + ex.inc / 2, ex.inc) : roundDown(w * 0.85, ex.inc);
  return w;
}

export function lastEntry(exId) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const e = (state.history[i].entries || []).find((x) => x.exId === exId);
    if (e && e.sets.length) return { ...e, phase: state.history[i].phase };
  }
  return null;
}

// Doppelprogression: gleiches Gewicht → +1 Wdh. pro Satz bis ans obere Ende,
// danach steigt das Gewicht und die Wiederholungen starten wieder unten.
export function setTargets(ex, weight, last, phase, sets) {
  const [min, max] = repRange(ex, phase);
  const sameLoad = last && last.phase === phase && (!hasWeight(ex) || (last.kgs && Math.max(...last.kgs) === weight));
  if (phase === 'deload' || !sameLoad) return Array(sets).fill(min);
  const step = ex.type === 'hold' ? 5 : 1;
  return Array.from({ length: sets }, (_, i) => {
    const done = last.sets[i] ?? last.sets[last.sets.length - 1];
    const prevTarget = last.targets?.[i];
    const t = prevTarget && done < prevTarget ? prevTarget : done + step;
    return Math.max(min, Math.min(max, t));
  });
}

/* ---------- Training zusammenstellen ---------- */

function warmupSteps(area) {
  const steps = [];
  WARMUP.forEach((w, i) => {
    if (w.area !== 'all' && w.area !== area) return;
    steps.push({ t: 'warm', i, sec: w.sec, reps: w.reps, sect: 'Aufwärmen' });
  });
  return steps;
}

function mobilitySteps(items, sect) {
  const steps = [];
  for (const m of items) {
    for (let s = 0; s < m.sets; s++) {
      for (const side of m.side ? ['links', 'rechts'] : [null]) {
        steps.push({ t: 'mob', id: m.id, s, side, sec: m.sec, reps: m.reps, sect });
      }
    }
  }
  return steps;
}

// 4 Dehnübungen pro Cool-down, passend zum Trainingstag und rotierend
export function cooldownItems(area) {
  const list = MOBILITY.filter((m) => m.area === area || m.area === 'all');
  const n = Math.min(4, list.length);
  const offset = (state.history.filter((h) => h.kind !== 'mobility').length * n) % list.length;
  return Array.from({ length: n }, (_, i) => list[(offset + i) % list.length]);
}

export function buildEntry(slot, phase, ex = slotExercise(slot)) {
  const sets = phase === 'deload' ? Math.max(2, slot.sets - 1) : slot.sets;
  const [min, max] = repRange(ex, phase);
  const weight = workingWeight(ex, phase);
  const last = lastEntry(ex.id);
  return {
    exId: ex.id,
    slotId: slot.id,
    type: ex.type || 'reps',
    sets,
    min,
    max,
    weight,
    rest: REST[ex.kind][phase],
    targets: setTargets(ex, weight, last, phase, sets),
    last: last ? { sets: last.sets, kgs: last.kgs } : null,
    logged: [],
  };
}

// Ab mittlerem Muskelkater: andere Variante des Platzes ohne diese Muskeln, sonst auslassen
function soreChoice(slot, date, skipped, swapped) {
  const ex = slotExercise(slot);
  const sore = soreBlock(ex.muscles, ex.muscles2, date);
  if (!sore.length) return ex;
  const alt = slot.options.map(getExercise).find((o) => o && !soreBlock(o.muscles, o.muscles2, date).length);
  if (alt) swapped.push({ from: ex.name, to: alt.name, muscles: sore });
  else skipped.push({ name: ex.name, muscles: sore });
  return alt || null;
}

export function buildWorkout(key, phase = phaseInfo().key, date = new Date()) {
  const session = SESSIONS[key];
  const skipped = [];
  const swapped = [];
  const entries = session.slots
    .map((slot) => [slot, soreChoice(slot, date, skipped, swapped)])
    .filter(([, ex]) => ex)
    .map(([slot, ex]) => buildEntry(slot, phase, ex));
  const steps = state.settings.warmup ? warmupSteps(session.area) : [];

  entries.forEach((e, ei) => {
    const ex = getExercise(e.exId);
    // Ein Aufwärmsatz vor der ersten schweren Übung
    if (ei === 0 && state.settings.warmup && hasWeight(ex)) steps.push({ t: 'wset', e: ei, sect: 'Aufwärmsatz' });
    for (let s = 0; s < e.sets; s++) {
      steps.push({ t: 'set', e: ei, s, sect: `Übung ${ei + 1} von ${entries.length}` });
      steps.push({ t: 'rest', sec: e.rest, sect: `Übung ${ei + 1} von ${entries.length}` });
    }
  });
  // Keine Pause nach dem letzten Satz
  if (steps.length && steps[steps.length - 1].t === 'rest') steps.pop();

  if (state.settings.cardio) steps.push({ t: 'cardio', sec: 600, sect: 'Cardio' });
  if (state.settings.cooldown) steps.push(...mobilitySteps(cooldownItems(session.area), 'Cool-down'));

  return { kind: 'strength', session: key, phase, started: null, entries, skipped, swapped, steps, pos: 0, stepStart: null };
}

export function buildMobilityWorkout() {
  const steps = mobilitySteps(MOBILITY, 'Beweglichkeit');
  return { kind: 'mobility', session: null, phase: phaseInfo().key, started: null, entries: [], steps, pos: 0, stepStart: null };
}

export function estimateMinutes(w) {
  let sec = 0;
  for (const st of w.steps) {
    if (st.t === 'rest') sec += st.sec;
    else if (st.t === 'set') sec += getExercise(w.entries[st.e].exId).side ? 70 : 45;
    else if (st.t === 'wset') sec += 60;
    else sec += st.sec ? st.sec + 5 : 30;
  }
  return Math.max(5, Math.round(sec / 60 / 5) * 5);
}

export function nextSessionKey() {
  const last = [...state.history].reverse().find((h) => h.kind !== 'mobility');
  if (!last) return ROTATION[0];
  return ROTATION[(ROTATION.indexOf(last.session) + 1) % ROTATION.length];
}

export function startWorkout(w) {
  w.started = Date.now();
  w.stepStart = Date.now();
  state.activeWorkout = w;
  save();
  return w;
}

/* ---------- Auswerten ---------- */

export function bestE1(exId) {
  let best = null;
  for (const h of state.history) {
    for (const e of h.entries || []) {
      if (e.exId !== exId) continue;
      e.sets.forEach((r, i) => {
        const v = e.kgs ? e1rm(e.kgs[i], r) : r;
        best = Math.max(best ?? 0, v);
      });
    }
  }
  return best;
}

export function finishWorkout() {
  const w = state.activeWorkout;
  if (!w) return null;
  const changes = [];
  const records = [];
  const entries = [];

  for (const e of w.entries) {
    const done = e.logged.filter((v) => v != null);
    if (!done.length) continue;
    const ex = getExercise(e.exId);
    const reps = done.map((v) => v.reps);
    const weighted = hasWeight(ex);
    const kgs = weighted ? done.map((v) => v.kg) : null;

    // Bestleistung: geschätzte Maximalkraft (bzw. Wiederholungen/Sekunden ohne Gewicht)
    const score = weighted && !ex.assist ? Math.max(...reps.map((r, i) => e1rm(kgs[i], r))) : Math.max(...reps);
    const prev = bestE1(ex.id);
    if (prev !== null && score > prev + 0.01 && !ex.assist) records.push({ exId: ex.id, score, prev, weighted, best: weighted ? `${fmtKg(Math.max(...kgs))} × ${Math.max(...reps)}` : Math.max(...reps) });
    entries.push({ exId: ex.id, slotId: e.slotId, type: e.type, sets: reps, kgs, targets: e.targets.slice(0, done.length) });

    if (!weighted) continue;
    const workKg = ex.assist ? Math.min(...kgs) : Math.max(...kgs);
    const lift = state.lifts[ex.id] || {};
    if (w.phase === 'deload') {
      if (lift.weight == null) state.lifts[ex.id] = { weight: ex.assist ? workKg : roundTo(workKg / 0.85, ex.inc), phase: 'hyp', e1: score };
      continue;
    }
    let next = workKg;
    const allCap = done.length >= e.sets && reps.every((r) => r >= e.max);
    const allBelow = reps.every((r) => r < e.min);
    if (allCap) {
      next = ex.assist ? Math.max(0, workKg - ex.inc) : workKg + ex.inc;
      state.failStreak[ex.id] = 0;
    } else if (allBelow && lift.weight != null) {
      state.failStreak[ex.id] = (state.failStreak[ex.id] || 0) + 1;
      if (state.failStreak[ex.id] >= 2) {
        if (ex.assist) next = workKg + ex.inc;
        else {
          next = roundTo(workKg * 0.9, ex.inc);
          if (next >= workKg) next = Math.max(0, workKg - ex.inc);
        }
        state.failStreak[ex.id] = 0;
      }
    } else {
      state.failStreak[ex.id] = 0;
    }
    next = Math.round(next * 100) / 100;
    if (next !== workKg) {
      const up = ex.assist ? next < workKg : next > workKg;
      changes.push({ exId: ex.id, from: workKg, to: next, up });
      if (up) state.liftLog.push({ date: new Date().toISOString(), exId: ex.id, from: workKg, to: next });
    }
    state.lifts[ex.id] = { weight: next, phase: w.phase, e1: weighted && !ex.assist ? Math.max(...reps.map((r, i) => e1rm(kgs[i], r))) : null };
  }

  const mobilityDone = w.steps.filter((st, i) => st.t === 'mob' && i < w.pos).length;
  const duration = Math.round((Date.now() - w.started) / 1000);
  const saved = entries.length || (w.kind === 'mobility' && mobilityDone);
  const volume = entries.reduce((a, e) => a + (e.kgs ? e.sets.reduce((b, r, i) => b + r * e.kgs[i], 0) : 0), 0);
  if (saved) {
    state.history.push({
      date: new Date().toISOString(),
      kind: w.kind,
      session: w.session,
      phase: w.phase,
      duration,
      mobility: mobilityDone,
      entries,
    });
  }
  state.activeWorkout = null;
  save();
  return { saved: !!saved, changes, records, duration, volume, sets: entries.reduce((a, e) => a + e.sets.length, 0), kind: w.kind, mobility: mobilityDone };
}

export function fmtKg(v) {
  return `${Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 })} kg`;
}

/* ---------- Statistik ---------- */

export function startOfWeek(d) {
  const date = dateOnly(d);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function strengthHistory() {
  return state.history.filter((h) => h.kind !== 'mobility');
}

export function workoutsThisWeek() {
  const start = startOfWeek(new Date());
  return strengthHistory().filter((h) => new Date(h.date) >= start).length;
}

function entryVolume(e) {
  return e.kgs ? e.sets.reduce((a, r, i) => a + r * e.kgs[i], 0) : 0;
}

// Sätze und bewegte Kilos pro Woche für die letzten n Wochen (älteste zuerst)
export function weeklyStats(n = 8) {
  const start = startOfWeek(new Date());
  return Array.from({ length: n }, (_, i) => {
    const from = new Date(start.getTime() - (n - 1 - i) * 7 * DAY);
    const to = new Date(from.getTime() + 7 * DAY);
    const hs = strengthHistory().filter((h) => new Date(h.date) >= from && new Date(h.date) < to);
    const sets = hs.reduce((a, h) => a + h.entries.reduce((b, e) => b + e.sets.length, 0), 0);
    const volume = hs.reduce((a, h) => a + h.entries.reduce((b, e) => b + entryVolume(e), 0), 0);
    return { from, sets, volume };
  });
}

// Wochen in Folge mit mindestens einem Training (aktuelle Woche zählt, wenn schon trainiert)
export function weekStreak() {
  let streak = 0;
  const start = startOfWeek(new Date());
  for (let i = 0; i < 520; i++) {
    const from = new Date(start.getTime() - i * 7 * DAY);
    const to = new Date(from.getTime() + 7 * DAY);
    const any = strengthHistory().some((h) => new Date(h.date) >= from && new Date(h.date) < to);
    if (any) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function exerciseHistory(exId) {
  const out = [];
  for (const h of state.history) {
    const e = (h.entries || []).find((x) => x.exId === exId);
    if (!e) continue;
    const best = e.kgs ? Math.max(...e.sets.map((r, i) => e1rm(e.kgs[i], r))) : Math.max(...e.sets);
    out.push({ date: h.date, sets: e.sets, kgs: e.kgs, best, top: e.kgs ? Math.max(...e.kgs) : null, type: e.type });
  }
  return out;
}

// Alle Übungen, die schon trainiert wurden oder gerade im Plan sind
export function planExercises() {
  const ids = [];
  for (const key of ROTATION) for (const slot of SESSIONS[key].slots) ids.push(slotExercise(slot).id);
  return [...new Set(ids)].map(getExercise);
}

/* ---------- Kalender ---------- */

// Plant die kommenden Trainingstage (Rotation) ab heute
export function calendarDays(from, days) {
  const today = dateOnly(new Date());
  const trainedToday = strengthHistory().some((h) => dateOnly(h.date).getTime() === today.getTime());
  let idx = ROTATION.indexOf(nextSessionKey());
  const firstDay = state.history.length ? dateOnly(state.history[0].date) : today;
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * DAY);
    const done = state.history.filter((h) => dateOnly(h.date).getTime() === d.getTime());
    const strength = done.find((h) => h.kind !== 'mobility');
    const mobility = done.some((h) => h.kind === 'mobility');
    const isTrainingDay = state.trainingDays.includes(d.getDay());
    let planned = null;
    const upcoming = d > today || (d.getTime() === today.getTime() && !trainedToday);
    if (isTrainingDay && upcoming) {
      planned = ROTATION[idx];
      idx = (idx + 1) % ROTATION.length;
    }
    out.push({
      date: d,
      isToday: d.getTime() === today.getTime(),
      past: d < today,
      missed: isTrainingDay && d < today && d >= firstDay && !strength,
      isTrainingDay,
      planned,
      done: strength ? strength.session : null,
      mobility,
      phase: phaseInfo(d).key,
    });
  }
  return out;
}

export { MOBILITY, getMobility };
