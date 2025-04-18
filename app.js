// Globale Variablen
let currentProfile = null;
let allProfiles = JSON.parse(localStorage.getItem('allProfiles')) || {};
let entries = [];
const trainingDays = [2, 3, 4, 0]; // Di, Mi, Do, So
const muscleGroups = {
  0: "Sonntag: Rücken und Bizeps",
  2: "Dienstag: Brust und Schultern",
  3: "Mittwoch: Beine",
  4: "Donnerstag: Bizeps und Trizeps"
};

// Start
window.addEventListener('DOMContentLoaded', () => {
  if (!currentProfile) renderProfileSelection();
});

// Profilverwaltung
function renderProfileSelection() {
  document.body.innerHTML = `
    <div class="profile-select-screen">
      <h2>Wähle ein Profil</h2>
      <div id="profile-buttons"></div>
      <div class="input-group">
        <input id="new-profile-name" placeholder="Neues Profilname" class="profile-input" />
      </div>
      <button onclick="createProfile()">Profil erstellen</button>
    </div>
  `;

  const list = document.getElementById('profile-buttons');
  Object.keys(allProfiles).forEach(name => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.onclick = () => loadProfile(name);
    list.appendChild(btn);

    const delBtn = document.createElement('button');
    delBtn.textContent = '🗑';
    delBtn.style.marginLeft = '10px';
    delBtn.classList.add('delete-profile-btn');
    delBtn.onclick = (e) => {
      e.stopPropagation();
      delete allProfiles[name];
      localStorage.setItem('allProfiles', JSON.stringify(allProfiles));
      renderProfileSelection();
    };
    list.appendChild(delBtn);
    list.appendChild(document.createElement('br'));
  });
}

function createProfile() {
  const name = document.getElementById('new-profile-name').value.trim();
  if (!name || allProfiles[name]) return alert("Ungültig oder bereits vorhanden.");
  allProfiles[name] = { entries: [] };
  localStorage.setItem('allProfiles', JSON.stringify(allProfiles));
  loadProfile(name);
}

function loadProfile(name) {
  currentProfile = name;
  entries = allProfiles[name].entries || [];
  renderApp();
}

// App-Inhalt
function renderApp() {
  document.body.innerHTML = `
    <div class="header">
      <button onclick="backToProfiles()" class="back-button">Zurück</button>
      <h1 id="current-date"></h1>
      <div class="workout-day" id="muscle-groups"></div>
    </div>
    <div id="entries-container"></div>
    <button id="add-entry">+ Neue Übung</button>
  `;
  document.getElementById("add-entry").onclick = addEntry;
  updateDateAndMuscles();
  renderEntries();
}

function backToProfiles() {
  saveEntries();
  currentProfile = null;
  renderProfileSelection();
}

function updateDateAndMuscles() {
  const today = new Date();
  document.getElementById("current-date").textContent = today.toLocaleDateString("de-DE");
  const day = today.getDay();
  document.getElementById("muscle-groups").textContent = muscleGroups[day] || "Kein Training geplant";
}

function addEntry() {
  entries.push({ exercise: "", weight: "", reps: "", date: new Date().toISOString() });
  saveEntries();
  renderEntries();
}

function saveEntries() {
  if (!currentProfile) return;
  allProfiles[currentProfile].entries = entries;
  localStorage.setItem('allProfiles', JSON.stringify(allProfiles));
}

function renderEntries() {
  const container = document.getElementById('entries-container');
  container.innerHTML = '';

  entries.forEach((entry, i) => {
    const block = document.createElement('div');
    block.className = 'entry-block';
    block.innerHTML = `
      <div class="input-group">
        <label>Übung</label>
        <input type="text" value="${entry.exercise}" onchange="updateEntry(${i}, 'exercise', this.value)">
      </div>
      <div class="input-group weight-reps-group">
        <div style="flex:1">
          <label>Gewicht</label>
          <div class="weight-input-container">
            <input type="number" value="${entry.weight}" onchange="updateEntry(${i}, 'weight', this.value)">
            <span class="kg-label">kg</span>
          </div>
        </div>
        <div style="flex:1">
          <label>Wiederholungen</label>
          <input type="number" value="${entry.reps}" onchange="updateEntry(${i}, 'reps', this.value)">
        </div>
      </div>
      <button onclick="deleteEntry(${i})">🗑 Löschen</button>
    `;
    container.appendChild(block);
  });
}

function updateEntry(index, field, value) {
  entries[index][field] = value;
  saveEntries();
}

function deleteEntry(i) {
  entries.splice(i, 1);
  saveEntries();
  renderEntries();
}
