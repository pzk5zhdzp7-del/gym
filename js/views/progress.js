// Fortschritt: Statistik, Kraftwerte, Gewichtssteigerungen, Körpermaße, Verlauf
import { state, save } from '../store.js';
import { SESSIONS, getExercise } from '../data/exercises.js';
import {
  weeklyStats, weekStreak, strengthHistory, planExercises, exerciseHistory, workingWeight, phaseInfo, hasWeight, PHASES,
} from '../training.js';
import { esc, kg, fmtDate, openSheet, lineChart, barChart, rerender } from '../ui.js';
import { activityList, activityButton } from '../activity.js';
import { sorenessList } from '../soreness.js';
import { healthProgress } from '../health.js';

export const MEASURES = [
  { key: 'waist', label: 'Taille' },
  { key: 'hips', label: 'Hüfte' },
  { key: 'glutes', label: 'Po (breiteste Stelle)' },
  { key: 'thigh', label: 'Oberschenkel' },
  { key: 'arm', label: 'Oberarm' },
];

function fmtTons(v) {
  return v >= 1000 ? `${(v / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} t` : `${Math.round(v)} kg`;
}

export function viewProgress() {
  const strength = strengthHistory();
  const weeks = weeklyStats(8);
  const ups = state.liftLog;
  const phase = phaseInfo().key;
  const total = strength.reduce((a, h) => a + h.entries.reduce((b, e) => b + (e.kgs ? e.sets.reduce((c, r, i) => c + r * e.kgs[i], 0) : 0), 0), 0);

  const lifts = planExercises().filter(hasWeight).map((ex) => {
    const hist = exerciseHistory(ex.id);
    const w = workingWeight(ex, phase);
    const first = hist.find((h) => h.top != null)?.top;
    const top = hist.length ? hist[hist.length - 1].top : null;
    const gained = first != null && top != null ? (ex.assist ? first - top : top - first) : 0;
    return `<button class="row" data-action="ex-info" data-id="${ex.id}"><span class="icon">${ex.icon}</span>
      <div class="grow"><div class="flex"><span>${esc(ex.name)}</span>${gained > 0 ? `<span class="pill good">+${kg(gained)} kg</span>` : ''}</div>
      <div class="small muted">${w != null ? `${kg(w)} kg${ex.assist ? ' Unterstützung' : ''}` : 'noch nicht trainiert'}${hist.length ? ` · ${hist.length}× trainiert` : ''}</div></div><span class="chev">›</span></button>`;
  }).join('');

  const milestones = ups.slice(-6).reverse().map((l) => {
    const ex = getExercise(l.exId);
    return `<div class="row"><span class="icon">⬆️</span><div class="grow"><div>${esc(ex.name)}: ${kg(l.from)} → ${kg(l.to)} kg</div>
      <div class="small muted">${fmtDate(l.date)}</div></div></div>`;
  }).join('');

  const w = state.weights;
  const weightChart = w.length >= 2 ? lineChart(w.slice(-20).map((x) => x.kg)) : '';

  const ms = state.measures;
  const lastM = ms[ms.length - 1];
  const firstM = ms[0];
  const measureRows = MEASURES.map((m) => {
    const vals = ms.filter((x) => x[m.key] != null).map((x) => x[m.key]);
    if (!vals.length) return '';
    const diff = vals[vals.length - 1] - vals[0];
    const d = vals.length > 1 && diff !== 0 ? ` <span class="small muted">(${diff > 0 ? '+' : ''}${kg(diff)} cm)</span>` : '';
    return `<div class="row"><div class="grow">${m.label}</div><div>${kg(vals[vals.length - 1])} cm${d}</div></div>`;
  }).join('');

  const hist = state.history.slice(-15).reverse().map((h, i) => {
    const idx = state.history.length - 1 - i;
    const title = h.kind === 'mobility' ? '🧘‍♀️ Beweglichkeit' : `🏋️‍♀️ ${SESSIONS[h.session].name}`;
    const info = h.kind === 'mobility' ? `${h.mobility} Übungen` : `${h.entries.reduce((a, e) => a + e.sets.length, 0)} Sätze`;
    return `<button class="row" data-action="history" data-idx="${idx}"><div class="grow"><div>${title}</div>
      <div class="small muted">${fmtDate(h.date)} · ${Math.round(h.duration / 60)} Min · ${info}${h.phase ? ` · ${PHASES[h.phase].name}` : ''}</div></div><span class="chev">›</span></button>`;
  }).join('');

  return `
    <div class="stats">
      <div class="card"><div class="big">${strength.length}</div><div class="small muted">Trainings</div></div>
      <div class="card"><div class="big">${weekStreak()}</div><div class="small muted">Wochen in Folge</div></div>
      <div class="card"><div class="big">${ups.length}</div><div class="small muted">Gewichtssteigerungen</div></div>
      <div class="card"><div class="big">${fmtTons(total)}</div><div class="small muted">insgesamt bewegt</div></div>
    </div>
    <h2>Sätze pro Woche</h2>
    <div class="card">${barChart(weeks.map((x) => x.sets), weeks.map((x) => fmtDate(x.from, { day: 'numeric', month: 'numeric' })))}</div>
    <h2>Bewegte Kilos pro Woche</h2>
    <div class="card">${barChart(weeks.map((x) => Math.round(x.volume / 100) / 10), weeks.map((x) => fmtDate(x.from, { day: 'numeric', month: 'numeric' })))}<div class="small muted center">in Tonnen</div></div>
    <h2>Gewichte im Plan</h2>
    <div class="list">${lifts}</div>
    ${milestones ? `<h2>Letzte Steigerungen</h2><div class="list">${milestones}</div>` : ''}
    <h2>Körpergewicht</h2>
    <div class="card">
      ${weightChart || '<div class="small muted">Trage ab und zu dein Gewicht ein, um den Verlauf zu sehen. Beim Straffen sind die Maße oft aussagekräftiger als die Waage.</div>'}
      <form class="flex" data-form="weight" style="margin-top:10px">
        <input name="kg" type="text" inputmode="decimal" autocomplete="off" placeholder="${kg(state.profile.weight)} kg">
        <button class="btn small" type="submit">Eintragen</button>
      </form>
      ${w.length ? `<div class="small muted" style="margin-top:6px">Zuletzt: ${kg(w[w.length - 1].kg)} kg am ${fmtDate(w[w.length - 1].date)}</div>` : ''}
    </div>
    <h2>Körpermaße</h2>
    ${measureRows ? `<div class="list">${measureRows}</div><p class="small muted">Zuletzt gemessen am ${fmtDate(lastM.date)}${ms.length > 1 ? `, Veränderung seit ${fmtDate(firstM.date)}` : ''}.</p>` : '<p class="small muted">Alle 2–4 Wochen morgens messen, immer an der gleichen Stelle.</p>'}
    <button class="btn secondary block" data-action="measure">📏 Maße eintragen</button>
    <h2>Verlauf</h2>
    ${hist ? `<div class="list">${hist}</div>` : '<div class="empty">Noch keine Trainings. Los geht\'s! 💪</div>'}
    <h2>Anderes Training</h2>
    ${activityList() ? `<div class="list">${activityList()}</div>` : '<p class="small muted">Fußball, Joggen, Radtour? Beschreib es kurz, Claude trägt es ein.</p>'}
    ${activityButton()}
    ${healthProgress()}
    <h2>Muskelkater</h2>
    ${sorenessList()}
    <button class="btn secondary block" data-action="sore-start">😣 Muskelkater eintragen</button>`;
}

function historyDetails(idx) {
  const h = state.history[idx];
  if (!h) return;
  const rows = (h.entries || []).map((e) => {
    const ex = getExercise(e.exId);
    const sets = e.sets.map((r, i) => (e.kgs ? `${r}×${kg(e.kgs[i])}` : r)).join(' · ');
    return `<div class="row"><span class="icon">${ex.icon}</span><div class="grow"><div>${esc(ex.name)}</div>
      <div class="small muted">${sets} ${e.kgs ? 'kg' : e.type === 'hold' ? 's' : 'Wdh.'}</div></div></div>`;
  }).join('');
  openSheet(`<h3>${h.kind === 'mobility' ? 'Beweglichkeit' : SESSIONS[h.session].name}</h3>
    <div class="small muted">${fmtDate(h.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${Math.round(h.duration / 60)} Min${h.phase ? ` · ${PHASES[h.phase].name}` : ''}</div>
    ${rows ? `<div class="list" style="margin-top:12px">${rows}</div>` : ''}
    ${h.mobility ? `<p class="small muted">🧘‍♀️ ${h.mobility} Dehnübungen</p>` : ''}
    <button class="btn secondary block" data-action="delete-history" data-idx="${idx}" style="margin-top:10px">Training löschen</button>
    <button class="btn block" data-action="close-sheet" style="margin-top:8px">Schließen</button>`);
}

function measureSheet() {
  const last = state.measures[state.measures.length - 1] || {};
  openSheet(`<h3>Körpermaße</h3><p class="small muted">In Zentimetern. Leere Felder werden übersprungen.</p>
    <form data-form="measure"><div class="list">${MEASURES.map((m) => `
      <label class="field"><span>${m.label}</span><input name="${m.key}" type="text" inputmode="decimal" autocomplete="off" placeholder="${last[m.key] != null ? kg(last[m.key]) : ''}"></label>`).join('')}
    </div><button class="btn block" type="submit">Speichern</button></form>
    <button class="btn secondary block" data-action="close-sheet" style="margin-top:8px">Abbrechen</button>`);
}

export const progressActions = {
  history(el) {
    historyDetails(Number(el.dataset.idx));
  },
  'delete-history'(el) {
    if (!confirm('Dieses Training aus dem Verlauf löschen?')) return;
    state.history.splice(Number(el.dataset.idx), 1);
    save();
    document.getElementById('sheet').classList.add('hidden');
    rerender();
  },
  measure() {
    measureSheet();
  },
};

const num = (v) => parseFloat(String(v).replace(',', '.'));

export function addWeight(form) {
  const v = num(form.kg.value);
  if (!(v > 20 && v < 400)) return;
  state.weights.push({ date: new Date().toISOString(), kg: v });
  state.profile.weight = v;
  save();
  rerender();
}

export function addMeasures(form) {
  const entry = { date: new Date().toISOString() };
  let any = false;
  for (const m of MEASURES) {
    const v = num(form[m.key].value);
    if (v > 5 && v < 300) { entry[m.key] = v; any = true; }
  }
  document.getElementById('sheet').classList.add('hidden');
  if (!any) return;
  state.measures.push(entry);
  save();
  rerender();
}
