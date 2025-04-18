// Globale Variablen
let entries = JSON.parse(localStorage.getItem('workoutEntries')) || [];
const trainingDays = [2, 3, 4, 0]; // Dienstag, Mittwoch, Donnerstag, Sonntag

// Initialisierung
updateDateAndMuscles();
renderEntries();

// Funktionen
function updateDateAndMuscles() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  document.getElementById('current-date').textContent = today.toLocaleDateString('de-DE');
  const muscleElement = document.getElementById('muscle-groups');
  
  muscleElement.textContent = getMuscleGroups(dayOfWeek);
  
  if (trainingDays.includes(dayOfWeek) && entries.length === 0) {
    muscleElement.classList.add('missed-training');
  } else {
    muscleElement.classList.remove('missed-training');
  }
}

function getMuscleGroups(day) {
  const groups = {
    0: "Sonntag: Rücken und Bizeps",
    2: "Dienstag: Schulter und Brust",
    3: "Mittwoch: Beine",
    4: "Donnerstag: Bizeps und Trizeps"
  };
  return groups[day] || "Kein Training geplant";
}

function saveEntries() {
  localStorage.setItem('workoutEntries', JSON.stringify(entries));
  updateDateAndMuscles();
}

function renderEntries() {
  const container = document.getElementById('entries-container');
  container.innerHTML = '';

  entries.forEach((entry, index) => {
    const entryElement = document.createElement('div');
    entryElement.className = 'entry-block';

    const previousEntry = entries.find(e => 
      e.exercise === entry.exercise && 
      new Date(e.date) < new Date(entry.date)
    );
    const isImproved = previousEntry && 
      (entry.weight > previousEntry.weight || entry.reps > previousEntry.reps);

    if (isImproved) entryElement.classList.add('improvement');

    entryElement.innerHTML = `
      <div class="input-group">
        <label>Maschine/Übung</label>
        <input type="text" value="${entry.exercise || ''}" placeholder="z.B. Beinpresse" class="exercise-input">
      </div>
      <div class="input-group">
        <label>Gewicht</label>
        <div class="weight-input-container">
          <input type="number" value="${entry.weight != null ? entry.weight : ''}" placeholder="z.B. 60" class="weight-input">
          <span class="kg-label">kg</span>
        </div>
      </div>
      <div class="input-group">
        <label>Wiederholungen</label>
        <input type="number" value="${entry.reps != null ? entry.reps : ''}" placeholder="z.B. 10" class="reps-input">
      </div>
      <button onclick="deleteEntry(${index})">Eintrag löschen</button>
    `;

    const exerciseInput = entryElement.querySelector('.exercise-input');
    const weightInput = entryElement.querySelector('.weight-input');
    const repsInput = entryElement.querySelector('.reps-input');

    exerciseInput.addEventListener('change', (e) => {
      entries[index].exercise = e.target.value;
      saveEntries();
    });

    weightInput.addEventListener('change', (e) => {
      entries[index].weight = Number(e.target.value) || 0;
      saveEntries();
    });

    repsInput.addEventListener('change', (e) => {
      entries[index].reps = Number(e.target.value) || 0;
      saveEntries();
    });

    container.appendChild(entryElement);
  });
}

document.getElementById('add-entry').addEventListener('click', () => {
  entries.push({
    date: new Date().toISOString(),
    exercise: "",
    weight: null,
    reps: null
  });
  saveEntries();
  renderEntries();
});

window.deleteEntry = (index) => {
  entries.splice(index, 1);
  saveEntries();
  renderEntries();
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
