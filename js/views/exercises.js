// Übungen-Tab: Plan mit Varianten je Platz und alle Übungen mit Anleitung
import { state, save } from '../store.js';
import { EXERCISES, SESSIONS, ROTATION, MUSCLES, WARMUP, getExercise } from '../data/exercises.js';
import { TYPES, exerciseType, saveExercise, deleteExercise } from '../custom.js';
import { MOBILITY, getMobility } from '../data/mobility.js';
import {
  slotExercise, workingWeight, repRange, phaseInfo, exerciseHistory, hasWeight, fmtKg,
} from '../training.js';
import { bodyMap } from '../body.js';
import { ui, esc, kg, fmtDate, videoLink, openSheet, closeSheet, lineChart, rerender } from '../ui.js';

function loadText(ex, phase = phaseInfo().key) {
  const [min, max] = repRange(ex, phase);
  const unit = ex.type === 'hold' ? 's' : 'Wdh.';
  let txt = `${min}–${max} ${unit}${ex.side ? ' je Seite' : ''}`;
  if (hasWeight(ex)) {
    const w = workingWeight(ex, phase);
    txt += w != null ? ` · ${fmtKg(w)}${ex.assist ? ' Unterstützung' : ''}` : ' · Gewicht beim 1. Mal wählen';
  }
  return txt;
}

export function viewExercises() {
  const tabs = `
    <div class="daytabs">
      <button class="${ui.exTab === 'plan' ? 'on' : ''}" data-action="ex-tab" data-v="plan">📋 Mein Plan</button>
      <button class="${ui.exTab === 'all' ? 'on' : ''}" data-action="ex-tab" data-v="all">📚 Alle Übungen</button>
    </div>`;
  return tabs + (ui.exTab === 'all' ? library() : planList());
}

function planList() {
  const sessions = ROTATION.map((key) => {
    const s = SESSIONS[key];
    const rows = s.slots.map((slot) => {
      const ex = slotExercise(slot);
      const alts = slot.options.length - 1;
      return `<button class="row" data-action="ex-info" data-id="${ex.id}" data-slot="${slot.id}">
        <span class="icon">${ex.icon}</span>
        <div class="grow"><div>${esc(ex.name)}</div><div class="small muted">${slot.sets} Sätze · ${loadText(ex)}</div></div>
        ${alts ? `<span class="pill">${alts} Alt.</span>` : ''}<span class="chev">›</span></button>`;
    }).join('');
    return `<h2>${esc(s.name)}</h2><div class="list">${rows}</div>`;
  }).join('');
  return `
    <p class="small muted" style="margin-top:0">Die vier Einheiten laufen im Wechsel, egal an welchem Wochentag. Tippe auf eine Übung für die Anleitung. Ist ein Gerät belegt oder fehlt, kannst du dort eine Alternative wählen.</p>
    ${sessions}
    <h2>Aufwärmen</h2>
    <div class="list">${WARMUP.map((w) => `<div class="row"><div class="grow"><div>${esc(w.name)}</div><div class="small muted">${w.sec ? `${Math.round(w.sec / 60) || 1} Min` : `${w.reps}×${w.side ? ' je Seite' : ''}`} · ${w.area === 'lower' ? 'Beintage' : w.area === 'upper' ? 'Oberkörpertage' : 'immer'}</div></div></div>`).join('')}</div>`;
}

const GROUPS = [...new Set(EXERCISES.map((e) => e.group))];

function library() {
  const ex = GROUPS.map((g) => `
    <h2>${esc(g)}</h2>
    <div class="list">${EXERCISES.filter((e) => e.group === g).map((e) => `
      <button class="row" data-action="ex-info" data-id="${e.id}"><span class="icon">${e.icon}</span>
        <div class="grow"><div>${esc(e.name)}${e.custom ? ' <span class="pill">eigene</span>' : ''}</div><div class="small muted">${esc(e.equip)} · ${e.muscles.map((m) => MUSCLES[m]).join(', ')}</div></div><span class="chev">›</span></button>`).join('')}
    </div>`).join('');
  const mob = MOBILITY.map((m) => `
    <button class="row" data-action="mob-info" data-id="${m.id}"><span class="icon">🧘‍♀️</span>
      <div class="grow"><div>${esc(m.name)}</div><div class="small muted">${m.sec ? `${m.sec} s` : `${m.reps}×`}${m.side ? ' je Seite' : ''} · ${esc(m.focus)}</div></div><span class="chev">›</span></button>`).join('');
  return `
    <p class="small muted" style="margin-top:0">Fehlt dir eine Übung? Leg sie selbst an. Sie ist dann bei passenden Plätzen im Plan als Variante wählbar oder kommt fest in eine Einheit.</p>
    <button class="btn block" data-action="cx-new">＋ Eigene Übung</button>
    ${ex}<h2>Dehnen</h2><div class="list">${mob}</div>`;
}

export function exerciseSheet(id, { slotId = null, inWorkout = false } = {}) {
  const ex = getExercise(id);
  const hist = exerciseHistory(id);
  const slot = slotId ? Object.values(SESSIONS).flatMap((s) => s.slots).find((s) => s.id === slotId) : null;
  const weighted = hasWeight(ex);
  const w = workingWeight(ex, phaseInfo().key);

  const alts = slot && slot.options.length > 1 ? `
    <h2>Variante für diesen Platz</h2>
    <div class="list">${slot.options.map((o) => {
      const x = getExercise(o);
      const on = slotExercise(slot).id === o;
      return `<button class="row ${on ? 'current' : ''}" data-action="choose" data-slot="${slot.id}" data-id="${o}">
        <span class="icon">${x.icon}</span><div class="grow"><div>${esc(x.name)}</div><div class="small muted">${esc(x.equip)}</div></div>
        <span class="small">${on ? '✓ im Plan' : 'wählen'}</span></button>`;
    }).join('')}</div>` : '';

  const chart = hist.length >= 2 ? `<h2>${weighted && !ex.assist ? 'Kraft (geschätztes Maximum)' : 'Bester Satz'}</h2><div class="card">${lineChart(hist.slice(-20).map((h) => Math.round(h.best * 10) / 10))}</div>` : '';
  const recent = hist.length ? `<h2>Verlauf</h2><div class="list">${hist.slice(-5).reverse().map((h) => `
    <div class="row"><div class="grow small">${fmtDate(h.date)}</div><div class="small">${h.sets.join(' · ')} ${h.type === 'hold' ? 's' : 'Wdh.'}${h.kgs ? ` · ${kg(h.top)} kg` : ''}</div></div>`).join('')}</div>` : '';

  openSheet(`
    <div class="small muted">${ex.icon} ${esc(ex.group)} · ${esc(ex.equip)}</div>
    <h3>${esc(ex.name)}</h3>
    <div class="small muted">${loadText(ex)}</div>
    <div class="card bodycard">${bodyMap(ex.muscles, ex.muscles2)}
      <div class="small"><span class="dot m1"></span>${ex.muscles.map((m) => MUSCLES[m]).join(', ')}
      ${ex.muscles2.length ? `<br><span class="dot m2"></span><span class="muted">${ex.muscles2.map((m) => MUSCLES[m]).join(', ')}</span>` : ''}</div></div>
    ${ex.setup ? `<h2>Einstellen</h2>
    <div class="card small">${esc(ex.setup)}</div>` : ''}
    ${ex.steps.length ? `<h2>Ausführung</h2>
    <div class="card"><ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
    ${ex.mistakes.length ? `<h2>Typische Fehler</h2>
    <div class="card"><ul class="steps warn-list">${ex.mistakes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>` : ''}
    ${ex.tip ? `<div class="card note small">💡 ${esc(ex.tip)}</div>` : ''}
    ${videoLink(ex.name)}
    ${weighted && !inWorkout ? `<button class="btn secondary block" data-action="set-weight" data-id="${ex.id}" style="margin-top:12px">${w != null ? `Arbeitsgewicht ändern (${fmtKg(w)})` : 'Startgewicht festlegen'}</button>` : ''}
    ${alts}
    ${chart}
    ${recent}
    ${ex.custom && !ex.deleted && !inWorkout ? `<button class="btn secondary block" data-action="cx-edit" data-id="${ex.id}" style="margin-top:12px">Übung bearbeiten</button>
      <button class="btn ghost block" data-action="cx-delete" data-id="${ex.id}">Übung löschen</button>` : ''}
    <button class="btn block" data-action="close-sheet" style="margin-top:12px">Schließen</button>`);
}

/* ---------- Eigene Übung anlegen / bearbeiten ---------- */

function exerciseEditor(ex = null) {
  const lines = (a) => esc((a || []).join('\n'));
  const type = ex ? exerciseType(ex) : 'iso';
  const opt = (v, label, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  openSheet(`
    <form data-form="exercise" ${ex ? `data-id="${ex.id}"` : ''}>
      <h3>${ex ? 'Übung bearbeiten' : 'Eigene Übung'}</h3>
      <div class="list">
        <label class="field"><span>Name</span><input name="cx-name" value="${esc(ex?.name || '')}" autocomplete="off" placeholder="z. B. Hip Thrust an der Smith-Maschine"></label>
        <label class="field"><span>Bereich</span><select name="cx-group">${GROUPS.map((g) => opt(g, g, ex?.group || 'Po & Beine')).join('')}</select></label>
        <label class="field"><span>Art</span><select name="cx-type">${Object.entries(TYPES).map(([k, t]) => opt(k, t.label, type)).join('')}</select></label>
        <label class="field"><span>Gewichtssprung in kg (bei Gewichtsübungen)</span><input name="cx-inc" type="text" inputmode="decimal" value="${String(ex?.inc ?? 2.5).replace('.', ',')}"></label>
        <label class="check-row"><span class="grow">Wiederholungen je Seite</span><input type="checkbox" class="switch" name="cx-side" ${ex?.side ? 'checked' : ''}></label>
        <label class="field"><span>Gerät / Ort</span><input name="cx-equip" value="${esc(ex?.equip && ex.equip !== 'Eigene Übung' ? ex.equip : '')}" autocomplete="off" placeholder="z. B. Kabelzug"></label>
      </div>
      <h2>Trainierte Muskeln</h2>
      <div class="list"><div class="chips">${Object.entries(MUSCLES).map(([k, m]) => `<label><input type="checkbox" name="cx-muscle" value="${k}" ${ex?.muscles?.includes(k) ? 'checked' : ''}>${esc(m)}</label>`).join('')}</div></div>
      <h2>Anleitung</h2>
      <div class="list">
        <label class="field"><span>Einstellen / Ausgangsposition</span><textarea name="cx-setup" rows="2">${esc(ex?.setup || '')}</textarea></label>
        <label class="field"><span>Ausführung (ein Schritt pro Zeile)</span><textarea name="cx-steps" rows="4">${lines(ex?.steps)}</textarea></label>
        <label class="field"><span>Typische Fehler (einer pro Zeile)</span><textarea name="cx-mistakes" rows="2">${lines(ex?.mistakes)}</textarea></label>
        <label class="field"><span>Tipp</span><input name="cx-tip" value="${esc(ex?.tip || '')}" autocomplete="off"></label>
      </div>
      <h2>Im Plan</h2>
      <div class="list">
        <label class="field"><span>Fest einplanen</span><select name="cx-session">
          ${opt('', 'Nein, nur als Variante wählbar', ex?.session || '')}
          ${Object.entries(SESSIONS).map(([k, s]) => opt(k, `Zusätzlich in ${s.name}`, ex?.session || '')).join('')}
        </select></label>
        <label class="field"><span>Sätze</span><select name="cx-sets">${[2, 3, 4].map((n) => opt(String(n), `${n} Sätze`, String(ex?.sets || 3))).join('')}</select></label>
      </div>
      <p class="small warn" id="cx-error"></p>
      <button class="btn block" type="submit">Speichern</button>
      <button class="btn secondary block" type="button" data-action="close-sheet" style="margin-top:8px">Abbrechen</button>
    </form>`);
}

export function submitExercise(form) {
  const f = (n) => form.querySelector(`[name="cx-${n}"]`);
  const lines = (n) => f(n).value.split('\n').map((x) => x.trim()).filter(Boolean);
  const name = f('name').value.trim();
  if (!name) { form.querySelector('#cx-error').textContent = 'Bitte gib der Übung einen Namen.'; return; }
  const ex = saveExercise({
    id: form.dataset.id || undefined,
    name,
    group: f('group').value,
    type: f('type').value,
    inc: parseFloat(f('inc').value.replace(',', '.')),
    side: f('side').checked,
    equip: f('equip').value.trim(),
    muscles: [...form.querySelectorAll('[name="cx-muscle"]:checked')].map((x) => x.value),
    setup: f('setup').value.trim(),
    steps: lines('steps'),
    mistakes: lines('mistakes'),
    tip: f('tip').value.trim(),
    session: f('session').value,
    sets: Number(f('sets').value),
  });
  closeSheet();
  rerender();
  exerciseSheet(ex.id);
}

function mobInfo(id) {
  const m = getMobility(id);
  openSheet(`
    <div class="small muted">🧘‍♀️ Dehnen · ${esc(m.focus)}</div>
    <h3>${esc(m.name)}</h3>
    <div class="small muted">${m.sec ? `${m.sec} s` : `${m.reps} Wdh.`}${m.side ? ' je Seite' : ''}</div>
    <p>${esc(m.cues)}</p>
    ${videoLink(m.name)}
    <button class="btn secondary block" data-action="close-sheet" style="margin-top:12px">Schließen</button>`);
}

export const exerciseActions = {
  'ex-tab'(el) {
    ui.exTab = el.dataset.v;
    rerender();
  },
  'ex-info'(el) {
    exerciseSheet(el.dataset.id, { slotId: el.dataset.slot || null });
  },
  'mob-info'(el) {
    mobInfo(el.dataset.id);
  },
  'cx-new'() {
    exerciseEditor();
  },
  'cx-edit'(el) {
    exerciseEditor(getExercise(el.dataset.id));
  },
  'cx-delete'(el) {
    if (!confirm(`„${getExercise(el.dataset.id).name}“ löschen? Dein bisheriger Verlauf bleibt erhalten.`)) return;
    deleteExercise(el.dataset.id);
    closeSheet();
    rerender();
  },
  choose(el) {
    state.choice[el.dataset.slot] = el.dataset.id;
    save();
    exerciseSheet(el.dataset.id, { slotId: el.dataset.slot });
    rerender();
  },
  'set-weight'(el) {
    const ex = getExercise(el.dataset.id);
    const cur = state.lifts[ex.id]?.weight;
    const input = prompt(`${ex.name}: ${ex.assist ? 'Unterstützung' : 'Arbeitsgewicht'} in kg`, cur != null ? String(cur).replace('.', ',') : '');
    if (input == null) return;
    const v = parseFloat(input.replace(',', '.'));
    if (!(v >= 0 && v < 500)) return;
    // Manuell gesetzt: gilt für die aktuelle Phase
    state.lifts[ex.id] = { weight: v, phase: phaseInfo().key === 'deload' ? 'hyp' : phaseInfo().key, e1: null };
    save();
    closeSheet();
    rerender();
  },
};
