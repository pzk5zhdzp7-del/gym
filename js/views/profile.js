// Profil: Körperdaten, Trainingseinstellungen, Datensicherung
import { state, save, exportData, importData, resetAll } from '../store.js';
import { targets, dayMacros, GOALS, ACTIVITY } from '../nutrition.js';
import { esc, n0, WEEKDAYS, WEEK_ORDER, rerender } from '../ui.js';

export function viewProfile() {
  const p = state.profile;
  const t = targets();
  const num = (key, label, decimal = false) => `<label class="field"><span>${label}</span><input type="text" inputmode="${decimal ? 'decimal' : 'numeric'}" data-profile="${key}" data-num value="${String(p[key]).replace('.', decimal ? ',' : '.')}"></label>`;
  const toggle = (attr, key, on, label, hint = '') => `<label class="check-row"><span class="grow">${label}${hint ? `<div class="small muted">${hint}</div>` : ''}</span><input type="checkbox" class="switch" ${attr}="${key}" ${on ? 'checked' : ''}></label>`;

  const dayBtns = WEEK_ORDER.map((wd) => `<button class="${state.trainingDays.includes(wd) ? 'on' : ''}" data-action="toggle-day" data-day="${wd}">${WEEKDAYS[wd]}</button>`).join('');

  return `
    <div class="list">
      <label class="field"><span>Dein Name</span><input type="text" data-profile="name" value="${esc(p.name)}" placeholder="optional" autocomplete="off"></label>
    </div>

    <h2>Training</h2>
    <div class="list">
      <div class="days">${dayBtns}</div>
      ${toggle('data-setting', 'voice', state.settings.voice, 'Sprachansage im Training', 'Sagt Übung, Ziel und Gewicht an.')}
      ${toggle('data-setting', 'warmup', state.settings.warmup, 'Aufwärmen', '5 Min Cardio, ein paar Mobilisationsübungen und ein Aufwärmsatz.')}
      ${toggle('data-setting', 'cooldown', state.settings.cooldown, 'Dehnen zum Schluss', 'Ca. 5 Min, passend zum Trainingstag.')}
      ${toggle('data-setting', 'cardio', state.settings.cardio, 'Cardio am Ende', '10 Min locker auf Laufband, Rad oder Crosstrainer.')}
    </div>
    <p class="small muted">Wähle die Tage, an denen du meistens trainierst. Klappt es mal nicht, geht der Plan einfach mit der nächsten Einheit weiter.</p>

    <h2>Körperdaten & Ziel</h2>
    <div class="list">
      <label class="field"><span>Geschlecht</span><select data-profile="sex">
        <option value="f" ${p.sex === 'f' ? 'selected' : ''}>weiblich</option>
        <option value="m" ${p.sex === 'm' ? 'selected' : ''}>männlich</option></select></label>
      ${num('age', 'Alter')}
      ${num('height', 'Größe (cm)')}
      ${num('weight', 'Gewicht (kg)', true)}
      <label class="field"><span>Alltag</span><select data-profile="activity">
        ${ACTIVITY.map((a) => `<option value="${a.value}" ${p.activity === a.value ? 'selected' : ''}>${a.label}</option>`).join('')}</select></label>
      <label class="field"><span>Ziel</span><select data-profile="goal">
        ${Object.entries(GOALS).map(([k, g]) => `<option value="${k}" ${p.goal === k ? 'selected' : ''}>${g.label}</option>`).join('')}</select></label>
      ${num('proteinPerKg', 'Eiweiß (g pro kg Körpergewicht)', true)}
    </div>
    <div class="card"><div class="flex between"><span>Tagesbedarf</span><b>${n0(t.kcal)} kcal · ${t.protein} g Eiweiß</b></div></div>

    <h2>Ernährungsplan</h2>
    <div class="list">
      ${toggle('data-profile-bool', 'vegetarian', p.vegetarian, 'Nur vegetarische Gerichte')}
      ${toggle('data-profile-bool', 'leftovers', p.leftovers, 'Reste-Modus', 'Mittags gibt\'s das Abendessen vom Vortag, so kochst du nur halb so oft.')}
    </div>
    <p class="small muted">Diese beiden Optionen gelten ab dem nächsten neuen Wochenplan.</p>

    <h2>Daten</h2>
    <div class="list">
      <button class="row" data-action="export"><span class="grow">Backup exportieren</span><span class="chev">›</span></button>
      <label class="row"><span class="grow">Backup importieren</span><input type="file" accept="application/json,.json" data-import style="display:none"><span class="chev">›</span></label>
      <button class="row" data-action="reset" style="color:#dc2626"><span class="grow">Alle Daten löschen</span></button>
    </div>
    <p class="small muted center">Alle Daten bleiben auf diesem Gerät. Ein Backup ab und zu schadet nicht.</p>`;
}

// Kalorienziel geändert: Portionen im bestehenden Plan neu anpassen
function refitPlanTarget() {
  if (!state.mealPlan) return;
  const { kcal } = targets();
  state.mealPlan.kcal = kcal;
  for (const day of state.mealPlan.days) {
    day.scale = 1;
    const base = dayMacros(day).kcal;
    day.scale = Math.round(Math.max(0.7, Math.min(1.6, kcal / base)) * 20) / 20;
  }
}

export const profileActions = {
  'toggle-day'(el) {
    const d = Number(el.dataset.day);
    const days = new Set(state.trainingDays);
    if (days.has(d)) days.delete(d);
    else days.add(d);
    state.trainingDays = [...days].sort();
    save();
    rerender();
  },
  async export() {
    const json = exportData();
    const name = `gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Gym-Backup' }); return; } catch { /* abgebrochen */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset() {
    if (!confirm('Wirklich alle Daten (Trainings, Gewichte, Profil) löschen?')) return;
    resetAll();
    location.hash = '#/';
    location.reload();
  },
};

// Gibt true zurück, wenn das change-Event hier behandelt wurde
export function profileChange(el) {
  if (el.dataset.profile) {
    const key = el.dataset.profile;
    if (key === 'name' || key === 'sex' || key === 'goal') {
      state.profile[key] = key === 'name' ? el.value.trim() : el.value;
    } else {
      const v = parseFloat(String(el.value).replace(',', '.'));
      if (!(v > 0)) { rerender(); return true; }
      state.profile[key] = v;
    }
    refitPlanTarget();
    save();
    rerender();
  } else if (el.dataset.profileBool) {
    state.profile[el.dataset.profileBool] = el.checked;
    save();
  } else if (el.dataset.setting) {
    state.settings[el.dataset.setting] = el.checked;
    save();
  } else if (el.hasAttribute('data-import') && el.files[0]) {
    el.files[0].text().then((txt) => {
      try {
        importData(txt);
        alert('Backup importiert.');
        rerender();
      } catch (err) {
        alert(`Import fehlgeschlagen: ${err.message}`);
      }
    });
  } else {
    return false;
  }
  return true;
}
