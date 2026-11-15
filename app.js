'use strict';

// ---------- Konstanten ----------
const STORE_KEY = 'trackone_v2';
const DEFAULT_SETS = 3;

const PRESETS = {
  push: ['Bankdrücken', 'Schrägbankdrücken', 'Brustpresse', 'Butterfly', 'Schulterdrücken', 'Seitheben', 'Trizepsdrücken am Kabel', 'Dips'],
  pull: ['Latzug', 'Rudern am Kabel', 'Rudermaschine', 'Klimmzüge', 'Reverse Butterfly', 'Face Pulls', 'Bizeps-Curls', 'Hammer-Curls'],
  legs: ['Beinpresse', 'Kniebeugen', 'Beinstrecker', 'Beinbeuger', 'Rumänisches Kreuzheben', 'Adduktoren', 'Abduktoren', 'Wadenheben']
};

// ---------- Zustand ----------
let db = load();
let current = null;     // Name des aktiven Profils
let editPlan = null;    // Plan, der gerade bearbeitet wird
let editSetup = false;  // true = Ersteinrichtung nach Profilerstellung
let notice = '';
let timerEnd = 0;
let timerId = null;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORE_KEY));
    if (data && data.profiles) return data;
  } catch (e) { /* ignorieren */ }
  return { profiles: {} };
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  } catch (e) { /* ignorieren */ }
}

const profile = () => db.profiles[current];

// ---------- Hilfsfunktionen ----------
function esc(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function show(html, keepScroll) {
  document.getElementById('app').innerHTML = html;
  if (!keepScroll) window.scrollTo(0, 0);
}

function fmtDate(iso, full) {
  return new Date(iso).toLocaleDateString('de-DE',
    full ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { day: '2-digit', month: '2-digit' });
}

function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ---------- Profile ----------
function renderProfiles(keepScroll) {
  current = null;
  const rows = Object.keys(db.profiles).map(name => `
    <div class="row">
      <button class="row-main" data-act="open-profile" data-name="${esc(name)}">${esc(name)}</button>
      <button class="link danger" data-act="delete-profile" data-name="${esc(name)}">Löschen</button>
    </div>`).join('');

  show(`
    <header class="top"><h1>TrackOne</h1></header>
    <h2>Profil wählen</h2>
    ${rows || '<p class="muted">Noch kein Profil vorhanden.</p>'}
    <h2>Neues Profil</h2>
    <input id="new-profile-name" type="text" placeholder="Name" maxlength="30" autocomplete="off">
    <button class="primary" data-act="create-profile">Profil erstellen</button>
  `, keepScroll);
}

function createProfile() {
  const name = document.getElementById('new-profile-name').value.trim();
  if (!name) return alert('Bitte einen Namen eingeben.');
  if (db.profiles[name]) return alert('Dieses Profil gibt es schon.');
  db.profiles[name] = { plan: null, next: 0, last: {}, history: [], drafts: {} };
  save();
  current = name;
  renderPlanChoice();
}

// ---------- Planauswahl ----------
function renderPlanChoice() {
  show(`
    <header class="top">
      <button class="link" data-act="to-profiles">Zurück</button>
      <h1>Trainingsplan</h1>
      <span></span>
    </header>
    <p class="muted">Plan für ${esc(current)} auswählen.</p>
    <button class="choice" data-act="choose-plan" data-type="ppl">
      <strong>Push / Pull / Legs / Rest</strong>
      <span>Vier Tage im Wechsel, danach beginnt es von vorn.</span>
    </button>
    <button class="choice" data-act="choose-plan" data-type="custom">
      <strong>Eigener Plan</strong>
      <span>Tage und Übungen selbst festlegen.</span>
    </button>
  `);
}

function pplPlan() {
  return {
    days: [
      { name: 'Push', preset: 'push', rest: false, exercises: [] },
      { name: 'Pull', preset: 'pull', rest: false, exercises: [] },
      { name: 'Legs', preset: 'legs', rest: false, exercises: [] },
      { name: 'Rest', preset: null, rest: true, exercises: [] }
    ]
  };
}

function customPlan() {
  return { days: [{ name: 'Tag 1', preset: null, rest: false, exercises: [] }] };
}

// ---------- Plan-Editor ----------
function startEditor(plan, setup) {
  editPlan = copy(plan);
  editSetup = setup;
  renderEditor();
}

function chipsFor(day) {
  const base = day.preset ? PRESETS[day.preset] : [];
  return base.concat(day.exercises.filter(x => !base.includes(x)));
}

function renderEditor(keepScroll) {
  const days = editPlan.days.map((d, i) => `
    <section class="card">
      <div class="day-head">
        <input type="text" class="day-name" data-field="day-name" data-day="${i}" value="${esc(d.name)}" maxlength="20" aria-label="Name des Tages">
        <label class="check">
          <input type="checkbox" data-field="day-rest" data-day="${i}" ${d.rest ? 'checked' : ''}> Ruhetag
        </label>
      </div>
      ${d.rest ? '<p class="muted">An diesem Tag steht kein Training an.</p>' : `
        <p class="muted">Maschinen und Übungen auswählen</p>
        <div class="chips">
          ${chipsFor(d).map(x => `<button class="chip${d.exercises.includes(x) ? ' on' : ''}" data-act="toggle-ex" data-day="${i}" data-name="${esc(x)}">${esc(x)}</button>`).join('')}
        </div>
        <div class="add-row">
          <input type="text" data-field="new-ex" data-day="${i}" placeholder="Eigene Übung" maxlength="40" autocomplete="off">
          <button class="secondary" data-act="add-ex" data-day="${i}">Hinzufügen</button>
        </div>`}
      ${editPlan.days.length > 1 ? `<button class="link danger" data-act="remove-day" data-day="${i}">Tag entfernen</button>` : ''}
    </section>`).join('');

  show(`
    <header class="top">
      <button class="link" data-act="editor-cancel">Abbrechen</button>
      <h1>Plan bearbeiten</h1>
      <span></span>
    </header>
    ${days}
    <button class="secondary" style="width:100%" data-act="add-day">Tag hinzufügen</button>
    <button class="primary" data-act="save-plan">Plan speichern</button>
  `, keepScroll);
}

function addExercise(dayIndex) {
  const input = document.querySelector(`[data-field="new-ex"][data-day="${dayIndex}"]`);
  const name = input ? input.value.trim() : '';
  if (!name) return;
  const day = editPlan.days[dayIndex];
  if (!day.exercises.includes(name)) day.exercises.push(name);
  renderEditor(true);
}

function savePlan() {
  const days = editPlan.days;
  days.forEach((d, i) => { d.name = d.name.trim() || `Tag ${i + 1}`; });

  if (!days.some(d => !d.rest)) return alert('Mindestens ein Trainingstag ist nötig.');
  const empty = days.find(d => !d.rest && d.exercises.length === 0);
  if (empty) return alert(`„${empty.name}“ hat noch keine Übungen.`);

  const p = profile();
  p.plan = { days: copy(days) };
  p.drafts = {};
  if (editSetup || p.next >= days.length) p.next = 0;
  save();
  renderWorkout();
}

// ---------- Training ----------
function getDraft(p, day) {
  if (!p.drafts) p.drafts = {};
  if (!p.drafts[p.next]) p.drafts[p.next] = {};
  const draft = p.drafts[p.next];
  day.exercises.forEach(name => {
    if (!draft[name]) {
      const last = p.last[name];
      const count = last ? last.sets.length : DEFAULT_SETS;
      draft[name] = Array.from({ length: count }, () => ({ w: '', r: '' }));
    }
  });
  return draft;
}

function exerciseCard(p, name, i, sets) {
  const last = p.last[name];
  const lastSets = last ? last.sets : [];

  const rows = sets.map((s, j) => {
    const ref = lastSets[j];
    const weightHint = ref ? ref.w : (lastSets.length ? lastSets[lastSets.length - 1].w : '');
    const repsHint = ref ? ref.r : '';
    return `
      <div class="set-row">
        <span class="set-no">${j + 1}</span>
        <input type="number" inputmode="decimal" step="0.5" min="0" data-field="w" data-ex="${i}" data-set="${j}" value="${esc(s.w)}" placeholder="${esc(weightHint !== '' ? weightHint : '–')}">
        <input type="number" inputmode="numeric" min="0" data-field="r" data-ex="${i}" data-set="${j}" value="${esc(s.r)}" placeholder="${esc(repsHint !== '' ? repsHint : '–')}">
      </div>`;
  }).join('');

  return `
    <section class="card">
      <div class="card-head">
        <h3>${esc(name)}</h3>
        ${last ? `<button class="link" data-act="same-as-last" data-ex="${i}">Wie letztes Mal</button>` : ''}
      </div>
      <p class="muted">${last ? 'Zuletzt am ' + fmtDate(last.date) : 'Noch nicht trainiert'}</p>
      <div class="set-head"><span></span><span>Gewicht (kg)</span><span>Wiederholungen</span></div>
      ${rows}
      <div class="set-actions">
        <button class="link" data-act="add-set" data-ex="${i}">Satz hinzufügen</button>
        ${sets.length > 1 ? `<button class="link" data-act="remove-set" data-ex="${i}">Satz entfernen</button>` : ''}
      </div>
    </section>`;
}

function renderWorkout(keepScroll) {
  const p = profile();
  const days = p.plan.days;
  if (p.next >= days.length) p.next = 0;
  const day = days[p.next];

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  const steps = days.map((d, i) =>
    `<button class="step${i === p.next ? ' on' : ''}" data-act="pick-day" data-day="${i}">${esc(d.name)}</button>`).join('');

  let body;
  if (day.rest) {
    body = `
      <section class="card">
        <p>Heute steht kein Training an.</p>
        <button class="primary" data-act="finish-rest">Ruhetag abschließen</button>
      </section>`;
  } else {
    const draft = getDraft(p, day);
    body = day.exercises.map((name, i) => exerciseCard(p, name, i, draft[name])).join('') +
      '<button class="primary" data-act="finish">Training abschließen</button>';
  }

  const timer = day.rest ? '' : `
    <div class="timer">
      <div class="timer-inner">
        <span id="timer-text">Pausentimer</span>
        <button data-act="timer" data-sec="60">60 s</button>
        <button data-act="timer" data-sec="90">90 s</button>
        <button data-act="timer" data-sec="120">2 min</button>
        <button data-act="timer-stop">Stopp</button>
      </div>
    </div>`;

  const note = notice ? `<p class="notice">${esc(notice)}</p>` : '';
  notice = '';

  show(`
    <header class="top">
      <button class="link" data-act="to-profiles">Profile</button>
      <span class="who">${esc(current)}</span>
      <span class="top-actions">
        <button class="link" data-act="history">Verlauf</button>
        <button class="link" data-act="edit-plan">Plan</button>
      </span>
    </header>
    <p class="date">${esc(today)}</p>
    <div class="steps">${steps}</div>
    ${note}
    <h1 class="day-title">${esc(day.name)}</h1>
    <p class="muted">Tag ${p.next + 1} von ${days.length}</p>
    ${body}
    ${timer}
  `, keepScroll);

  if (timerEnd) tickTimer();
}

function advance(p) {
  p.next = (p.next + 1) % p.plan.days.length;
  save();
  notice = `Gespeichert. Als Nächstes: ${p.plan.days[p.next].name}.`;
  renderWorkout();
}

function finishWorkout() {
  const p = profile();
  const day = p.plan.days[p.next];
  const draft = getDraft(p, day);
  const iso = new Date().toISOString();
  const log = [];

  day.exercises.forEach(name => {
    const lastSets = p.last[name] ? p.last[name].sets : [];
    const sets = [];
    draft[name].forEach((s, j) => {
      if (s.r === '') return; // Sätze ohne Wiederholungen zählen nicht
      const ref = lastSets[j] || lastSets[lastSets.length - 1];
      const w = s.w !== '' ? s.w : (ref ? ref.w : '');
      sets.push({ w, r: s.r });
    });
    if (sets.length) log.push({ exercise: name, sets });
  });

  if (!log.length) return alert('Trage mindestens einen Satz mit Wiederholungen ein.');

  log.forEach(l => { p.last[l.exercise] = { date: iso, sets: l.sets }; });
  p.history.unshift({ date: iso, day: day.name, log });
  p.history = p.history.slice(0, 200);
  delete p.drafts[p.next];
  advance(p);
}

// ---------- Verlauf ----------
function renderHistory() {
  const p = profile();
  const items = p.history.slice(0, 50).map(h => `
    <section class="card">
      <div class="card-head">
        <h3>${esc(h.day)}</h3>
        <span class="muted">${fmtDate(h.date, true)}</span>
      </div>
      ${h.log.map(l => `
        <p class="log"><strong>${esc(l.exercise)}</strong><br>
        <span class="muted">${l.sets.map(s => s.w !== '' ? `${esc(s.w)} kg × ${esc(s.r)}` : esc(s.r)).join(', ')}</span></p>`).join('')}
    </section>`).join('');

  show(`
    <header class="top">
      <button class="link" data-act="back-workout">Zurück</button>
      <h1>Verlauf</h1>
      <span></span>
    </header>
    ${items || '<p class="muted">Noch keine Trainings gespeichert.</p>'}
  `);
}

// ---------- Pausentimer ----------
function paintTimer(text) {
  const el = document.getElementById('timer-text');
  if (el) el.textContent = text || 'Pausentimer';
}

function tickTimer() {
  const left = Math.ceil((timerEnd - Date.now()) / 1000);
  if (left <= 0) {
    clearInterval(timerId);
    timerId = null;
    timerEnd = 0;
    if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
    paintTimer('Pause vorbei');
    return;
  }
  const m = Math.floor(left / 60);
  const s = String(left % 60).padStart(2, '0');
  paintTimer(`Pause: ${m}:${s}`);
}

function startTimer(seconds) {
  clearInterval(timerId);
  timerEnd = Date.now() + seconds * 1000;
  timerId = setInterval(tickTimer, 250);
  tickTimer();
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  timerEnd = 0;
  paintTimer();
}

// ---------- Ereignisse ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;

  const act = el.dataset.act;
  const dayIndex = Number(el.dataset.day);
  const exIndex = Number(el.dataset.ex);
  const p = current ? profile() : null;
  const day = p && p.plan ? p.plan.days[p.next] : null;

  switch (act) {
    case 'create-profile':
      createProfile();
      break;
    case 'open-profile':
      current = el.dataset.name;
      if (profile().plan) renderWorkout(); else renderPlanChoice();
      break;
    case 'delete-profile':
      if (confirm(`Profil „${el.dataset.name}“ mit allen Daten löschen?`)) {
        delete db.profiles[el.dataset.name];
        save();
        renderProfiles(true);
      }
      break;
    case 'to-profiles':
      renderProfiles();
      break;

    case 'choose-plan':
      startEditor(el.dataset.type === 'ppl' ? pplPlan() : customPlan(), true);
      break;
    case 'toggle-ex': {
      const d = editPlan.days[dayIndex];
      const pos = d.exercises.indexOf(el.dataset.name);
      if (pos >= 0) d.exercises.splice(pos, 1); else d.exercises.push(el.dataset.name);
      renderEditor(true);
      break;
    }
    case 'add-ex':
      addExercise(dayIndex);
      break;
    case 'add-day':
      editPlan.days.push({ name: `Tag ${editPlan.days.length + 1}`, preset: null, rest: false, exercises: [] });
      renderEditor(true);
      break;
    case 'remove-day':
      editPlan.days.splice(dayIndex, 1);
      renderEditor(true);
      break;
    case 'save-plan':
      savePlan();
      break;
    case 'editor-cancel':
      if (p && p.plan) renderWorkout(); else renderPlanChoice();
      break;

    case 'edit-plan':
      startEditor(p.plan, false);
      break;
    case 'pick-day':
      p.next = dayIndex;
      save();
      renderWorkout(true);
      break;
    case 'add-set':
      getDraft(p, day)[day.exercises[exIndex]].push({ w: '', r: '' });
      save();
      renderWorkout(true);
      break;
    case 'remove-set': {
      const sets = getDraft(p, day)[day.exercises[exIndex]];
      if (sets.length > 1) sets.pop();
      save();
      renderWorkout(true);
      break;
    }
    case 'same-as-last': {
      const name = day.exercises[exIndex];
      getDraft(p, day)[name] = p.last[name].sets.map(s => ({ w: s.w, r: s.r }));
      save();
      renderWorkout(true);
      break;
    }
    case 'finish':
      finishWorkout();
      break;
    case 'finish-rest':
      advance(p);
      break;
    case 'history':
      renderHistory();
      break;
    case 'back-workout':
      renderWorkout();
      break;

    case 'timer':
      startTimer(Number(el.dataset.sec));
      break;
    case 'timer-stop':
      stopTimer();
      break;
  }
});

document.addEventListener('input', e => {
  const field = e.target.dataset.field;
  if (!field) return;

  if (field === 'day-name' && editPlan) {
    editPlan.days[Number(e.target.dataset.day)].name = e.target.value;
  } else if ((field === 'w' || field === 'r') && current) {
    const p = profile();
    const name = p.plan.days[p.next].exercises[Number(e.target.dataset.ex)];
    p.drafts[p.next][name][Number(e.target.dataset.set)][field] = e.target.value;
    save();
  }
});

document.addEventListener('change', e => {
  if (e.target.dataset.field === 'day-rest' && editPlan) {
    editPlan.days[Number(e.target.dataset.day)].rest = e.target.checked;
    renderEditor(true);
  }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'new-profile-name') createProfile();
  else if (e.target.dataset && e.target.dataset.field === 'new-ex') addExercise(Number(e.target.dataset.day));
});

// ---------- Start ----------
window.addEventListener('DOMContentLoaded', () => renderProfiles());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
