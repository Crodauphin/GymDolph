/* ═══════════════════════════════════════════
   FITTRACK v0.1 — APP LOGIC
═══════════════════════════════════════════ */

// ── STATE ────────────────────────────────
let state = {
  currentView: 'home',
  activeDay: 0,         // index in PROGRAM
  workoutDay: null,     // PROGRAM entry being worked out
  workoutChecks: {},    // { exId: bool }
  setLogs: {},          // { exId: [{weight, reps}] }
  cardioChecks: {},     // { 'cN': bool }
  workoutStartTime: null,
  timerInterval: null,
  timerSeconds: 0,
  timerRunning: false,
  restInterval: null,
  restTotal: 60,
  restRemaining: 0,
  modalTarget: null,    // { dayId, blockId, exId, setIndex }
  history: [],          // workout history
  streak: 0,
};

// ── STORAGE ──────────────────────────────
function save() {
  localStorage.setItem('fittrack_history', JSON.stringify(state.history));
  localStorage.setItem('fittrack_streak', state.streak);
  localStorage.setItem('fittrack_activeDay', state.activeDay);
}
function load() {
  try {
    state.history = JSON.parse(localStorage.getItem('fittrack_history') || '[]');
    state.streak  = parseInt(localStorage.getItem('fittrack_streak') || '0');
    state.activeDay = parseInt(localStorage.getItem('fittrack_activeDay') || '0');
  } catch(e) { /* noop */ }
}

// ── INIT ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  load();
  registerSW();
  buildHomeDayCards();
  updateBannerDate();
  document.getElementById('streak-count').textContent = state.streak;

  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      document.getElementById('app').style.display = 'flex';
    }, 500);
  }, 1800);
});

// ── SERVICE WORKER ────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
}

// ── UTILS ─────────────────────────────────
function getActiveDay() { return state.activeDay; }

function updateBannerDate() {
  const el = document.getElementById('banner-date');
  const d  = new Date();
  const opts = { weekday:'long', month:'long', day:'numeric' };
  el.textContent = d.toLocaleDateString('en-US', opts);
}

function pad2(n) { return String(n).padStart(2,'0'); }

function formatDuration(seconds) {
  const m = Math.floor(seconds/60);
  const s = seconds % 60;
  return `${m}m ${pad2(s)}s`;
}

// ── VIEW SWITCHING ────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  state.currentView = name;

  // update nav
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-'+name);
  if (nb) nb.classList.add('active');

  if (name === 'history') renderHistory();
  if (name === 'home') buildHomeDayCards();
}

// ── HOME — DAY CARDS ──────────────────────
function buildHomeDayCards() {
  const container = document.getElementById('day-cards');
  container.innerHTML = '';

  // Mark days done based on history (today's date)
  const today = todayStr();
  const doneDays = new Set(state.history.filter(h => h.date === today).map(h => h.dayId));

  PROGRAM.forEach((day, idx) => {
    const card  = document.createElement('div');
    const isDone   = doneDays.has(day.id);
    const isActive = idx === state.activeDay;
    card.className = 'day-card' + (isDone?' done':'') + (isActive?' active-day':'');
    card.innerHTML = `
      <div class="day-badge">${day.id}</div>
      <div class="day-info">
        <div class="day-name">${day.name}</div>
        <div class="day-meta">${blockSummary(day)}</div>
      </div>
      <div class="day-check">${isDone?'✓':''}</div>
    `;
    card.addEventListener('click', () => {
      state.activeDay = idx;
      save();
      buildHomeDayCards();
    });
    container.appendChild(card);
  });
}

function blockSummary(day) {
  const warmup = day.blocks.find(b=>b.type==='warmup');
  const cardio  = day.blocks.find(b=>b.type==='cardio');
  const blocks  = day.blocks.filter(b=>b.type!=='warmup'&&b.type!=='cardio');
  const total = blocks.reduce((a,b)=>a+ parseInt(b.duration),0);
  return `Warm-up ${warmup?warmup.duration:'—'} · Lifting ${total} min · Cardio ${cardio?cardio.duration:'—'}`;
}

function todayStr() {
  return new Date().toISOString().slice(0,10);
}

// ── START WORKOUT ─────────────────────────
function startWorkout(dayIndex) {
  const day = PROGRAM[dayIndex];
  if (!day) return;

  state.workoutDay    = day;
  state.workoutChecks = {};
  state.setLogs       = {};
  state.cardioChecks  = {};
  state.workoutStartTime = Date.now();
  state.timerSeconds  = 0;
  state.timerRunning  = false;

  document.getElementById('wd-day-label').textContent = day.id;
  document.getElementById('wd-focus').textContent     = day.name;
  document.getElementById('timer-display').textContent = '00:00';
  document.getElementById('timer-toggle').textContent  = '▶';

  renderWorkoutBlocks(day);
  updateProgress();
  showView('workout');

  // auto-start timer
  setTimeout(() => { startTimer(); }, 400);
}

// ── RENDER WORKOUT BLOCKS ─────────────────
function renderWorkoutBlocks(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';

  day.blocks.forEach(block => {
    const blockEl = document.createElement('div');
    blockEl.className = 'workout-block';
    blockEl.id = 'block-' + block.id;

    let exHTML = '';
    if (block.type === 'cardio') {
      block.exercises.forEach(ex => {
        exHTML += `
          <div class="cardio-row">
            <div class="cardio-check" id="cardiocheck-${ex.id}"
              onclick="toggleCardio('${ex.id}', this)"></div>
            <div>
              <div class="cardio-label">${ex.name}</div>
              <div class="cardio-sub">${ex.prescription}</div>
            </div>
          </div>`;
      });
    } else {
      block.exercises.forEach(ex => {
        // build set chips
        let setChips = '';
        if (block.type !== 'warmup') {
          for (let s = 0; s < ex.sets; s++) {
            setChips += `<div class="set-chip" id="setchip-${ex.id}-${s}"
              onclick="openSetModal('${day.id}','${block.id}','${ex.id}',${s})">
              Set ${s+1}
            </div>`;
          }
        }
        exHTML += `
          <div class="exercise-row" id="exrow-${ex.id}">
            <div class="ex-check" id="excheck-${ex.id}"
              onclick="toggleExercise('${ex.id}', this)"></div>
            <div class="ex-info">
              <div class="ex-name">${ex.name}</div>
              <div class="ex-prescription">${ex.prescription}</div>
              ${setChips ? `<div class="ex-sets">${setChips}</div>` : ''}
            </div>
          </div>`;
      });
    }

    blockEl.innerHTML = `
      <div class="block-header">
        <span class="block-icon">${block.icon}</span>
        <span class="block-title">${block.title}</span>
        <span class="block-duration">${block.duration}</span>
      </div>
      ${exHTML}
    `;
    container.appendChild(blockEl);
  });
}

// ── TOGGLE EXERCISE ───────────────────────
function toggleExercise(exId, el) {
  state.workoutChecks[exId] = !state.workoutChecks[exId];
  if (state.workoutChecks[exId]) {
    el.classList.add('checked');
    el.textContent = '✓';
  } else {
    el.classList.remove('checked');
    el.textContent = '';
  }
  updateProgress();
}

function toggleCardio(exId, el) {
  state.cardioChecks[exId] = !state.cardioChecks[exId];
  if (state.cardioChecks[exId]) {
    el.classList.add('checked');
    el.textContent = '✓';
  } else {
    el.classList.remove('checked');
    el.textContent = '';
  }
  updateProgress();
}

// ── SET MODAL ─────────────────────────────
function openSetModal(dayId, blockId, exId, setIndex) {
  state.modalTarget = { dayId, blockId, exId, setIndex };
  const block = state.workoutDay.blocks.find(b=>b.id===blockId);
  const ex    = block.exercises.find(e=>e.id===exId);

  document.getElementById('modal-ex-name').textContent =
    `${ex.name} — Set ${setIndex+1}`;

  // Pre-fill from previous log
  const prev = (state.setLogs[exId] || [])[setIndex];
  document.getElementById('modal-weight').value = prev ? prev.weight : '';
  document.getElementById('modal-reps').value   = prev ? prev.reps   : ex.reps;

  document.getElementById('set-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('modal-weight').focus(), 100);
}

function closeModal() {
  document.getElementById('set-modal').style.display = 'none';
  state.modalTarget = null;
}

function confirmSet() {
  const { exId, setIndex } = state.modalTarget;
  const weight = parseFloat(document.getElementById('modal-weight').value) || 0;
  const reps   = parseInt(document.getElementById('modal-reps').value)    || 0;

  if (!state.setLogs[exId]) state.setLogs[exId] = [];
  state.setLogs[exId][setIndex] = { weight, reps };

  // Update chip UI
  const chip = document.getElementById(`setchip-${exId}-${setIndex}`);
  if (chip) {
    chip.classList.add('logged');
    chip.textContent = `${weight}kg × ${reps}`;
  }

  closeModal();
  startRestTimer(60);
  updateProgress();
}

// ── PROGRESS ──────────────────────────────
function updateProgress() {
  if (!state.workoutDay) return;
  let total = 0, done = 0;

  state.workoutDay.blocks.forEach(block => {
    block.exercises.forEach(ex => {
      total++;
      if (block.type === 'cardio') {
        if (state.cardioChecks[ex.id]) done++;
      } else {
        if (state.workoutChecks[ex.id]) done++;
      }
    });
  });

  const pct = total > 0 ? (done / total * 100) : 0;
  document.getElementById('workout-progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${done} / ${total} done`;
}

// ── WORKOUT TIMER ─────────────────────────
function toggleTimer() {
  if (state.timerRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  document.getElementById('timer-toggle').textContent = '⏸';
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    const m = Math.floor(state.timerSeconds / 60);
    const s = state.timerSeconds % 60;
    document.getElementById('timer-display').textContent =
      `${pad2(m)}:${pad2(s)}`;
  }, 1000);
}

function pauseTimer() {
  state.timerRunning = false;
  document.getElementById('timer-toggle').textContent = '▶';
  clearInterval(state.timerInterval);
}

function resetTimer() {
  pauseTimer();
  state.timerSeconds = 0;
  document.getElementById('timer-display').textContent = '00:00';
}

// ── REST TIMER ────────────────────────────
function startRestTimer(seconds) {
  state.restTotal     = seconds;
  state.restRemaining = seconds;

  const overlay   = document.getElementById('rest-overlay');
  const countdown = document.getElementById('rest-countdown');
  const ring      = document.getElementById('ring-fg');
  const circumference = 276.46;

  overlay.style.display = 'flex';
  countdown.textContent = seconds;
  ring.style.strokeDashoffset = 0;

  clearInterval(state.restInterval);
  state.restInterval = setInterval(() => {
    state.restRemaining--;
    countdown.textContent = state.restRemaining;
    const progress = 1 - (state.restRemaining / state.restTotal);
    ring.style.strokeDashoffset = circumference * progress;

    if (state.restRemaining <= 0) {
      skipRest();
    }
  }, 1000);
}

function skipRest() {
  clearInterval(state.restInterval);
  document.getElementById('rest-overlay').style.display = 'none';
}

// ── FINISH WORKOUT ────────────────────────
function finishWorkout() {
  pauseTimer();
  const duration = state.timerSeconds;

  const record = {
    id:       Date.now(),
    dayId:    state.workoutDay.id,
    dayName:  state.workoutDay.name,
    date:     todayStr(),
    dateStr:  new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }),
    duration: duration,
    durationStr: formatDuration(duration),
    setLogs:  JSON.parse(JSON.stringify(state.setLogs)),
    checks:   JSON.parse(JSON.stringify(state.workoutChecks)),
  };

  state.history.unshift(record);

  // Update streak
  const lastDates = [...new Set(state.history.map(h=>h.date))].sort().reverse();
  const today     = todayStr();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
  if (lastDates[0] === today) {
    if (lastDates[1] === yesterday || state.streak === 0) {
      // Increment only if new day workout
      const todayCount = state.history.filter(h=>h.date===today).length;
      if (todayCount === 1) state.streak++;
    }
  }

  // Auto-advance active day
  state.activeDay = (state.activeDay + 1) % PROGRAM.length;

  save();
  showView('home');
}

// ── HISTORY ───────────────────────────────
function renderHistory() {
  const container = document.getElementById('history-list');
  container.innerHTML = '';

  if (state.history.length === 0) {
    container.innerHTML = `<div class="history-empty">No workouts recorded yet.<br>Complete your first session!</div>`;
    return;
  }

  state.history.forEach(h => {
    const card = document.createElement('div');
    card.className = 'history-card';

    // count exercises done
    const totalChecked = Object.values(h.checks || {}).filter(Boolean).length;
    // count sets logged
    const totalSets = Object.values(h.setLogs || {}).reduce((a,s)=>a+s.length,0);

    card.innerHTML = `
      <div class="hc-top">
        <span class="hc-day">${h.dayId} — ${h.dayName}</span>
        <span class="hc-date">${h.dateStr}</span>
      </div>
      <div class="hc-focus">${totalChecked} exercises · ${totalSets} sets logged</div>
      <div class="hc-duration">⏱ ${h.durationStr}</div>
    `;
    container.appendChild(card);
  });
}

// ── SETTINGS ─────────────────────────────
function clearHistory() {
  if (confirm('Clear all workout history? This cannot be undone.')) {
    state.history = [];
    state.streak  = 0;
    document.getElementById('streak-count').textContent = '0';
    save();
    renderHistory();
  }
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.history, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `fittrack-export-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
