const MAX_SECS = 90 * 60;
const NOTIF_MILESTONES = [10*60, 50*60, 70*60];

let state = {
  currentView: 'home',
  activeDay: 0,
  workoutDay: null,
  workoutChecks: {}, setLogs: {}, cardioChecks: {},
  sessionStartEpoch: null,
  _pausedElapsed: 0,
  timerInterval: null,
  timerRunning: false,
  restInterval: null, restTotal: 60, restRemaining: 0,
  restPreferredDuration: 60,
  modalTarget: null,
  history: [], streak: 0,
  currentWeekKey: null, weekSessions: {},
  modifyTarget: null,
  calYear: 0, calMonth: 0,
  ytLinks: {}, infoModalName: null,
  doneDayTarget: null,
  unsavedCallback: null,
  scrollPositions: {},
  notifPermission: false,
  notifiedMilestones: {},
  bodyStats: [],  // v0.8: [{date, weight, bf}]
};

// ── WEEK KEY ────────────────────────────────
function getWeekKey(d) {
  d = d ? new Date(d) : new Date();
  const day = d.getDay() || 7;
  const thu = new Date(d); thu.setDate(d.getDate() - day + 4);
  const jan1 = new Date(thu.getFullYear(), 0, 1);
  const wk = Math.ceil(((thu - jan1) / 86400000 + 1) / 7);
  return `${thu.getFullYear()}-W${String(wk).padStart(2,'0')}`;
}

// ── STORAGE ─────────────────────────────────
function save() {
  localStorage.setItem('gymdolph_history',      JSON.stringify(state.history));
  localStorage.setItem('gymdolph_streak',       state.streak);
  localStorage.setItem('gymdolph_weekKey',      state.currentWeekKey);
  localStorage.setItem('gymdolph_weekSessions', JSON.stringify(state.weekSessions));
  localStorage.setItem('gymdolph_ytlinks',      JSON.stringify(state.ytLinks || {}));
  localStorage.setItem('gymdolph_bodystats',    JSON.stringify(state.bodyStats || []));
  // Always persist in-progress session as long as workoutDay is set
  if (state.workoutDay) {
    localStorage.setItem('gymdolph_inprogress', JSON.stringify({
      dayId:             state.workoutDay.id,
      sessionStartEpoch: state.sessionStartEpoch,
      pausedElapsed:     state._pausedElapsed,
      timerRunning:      state.timerRunning,
      workoutChecks:     state.workoutChecks,
      setLogs:           state.setLogs,
      cardioChecks:      state.cardioChecks,
      weekKey:           state.currentWeekKey,
    }));
  } else {
    localStorage.removeItem('gymdolph_inprogress');
  }
}
function load() {
  try {
    state.history   = JSON.parse(localStorage.getItem('gymdolph_history')   || '[]');
    state.streak    = parseInt(localStorage.getItem('gymdolph_streak')      || '0');
    state.ytLinks   = JSON.parse(localStorage.getItem('gymdolph_ytlinks')   || '{}');
    state.bodyStats = JSON.parse(localStorage.getItem('gymdolph_bodystats') || '[]');
    const savedWk   = localStorage.getItem('gymdolph_weekKey') || '';
    const thisWk    = getWeekKey();
    state.currentWeekKey = thisWk;
    if (savedWk === thisWk) {
      state.weekSessions = JSON.parse(localStorage.getItem('gymdolph_weekSessions') || '{}');
      // v0.8: restore in-progress session if it exists for this week
      const inprog = localStorage.getItem('gymdolph_inprogress');
      if (inprog) {
        const d = JSON.parse(inprog);
        if (d.weekKey === thisWk) restoreInProgress(d);
      }
    } else {
      const inprog = localStorage.getItem('gymdolph_inprogress');
      if (inprog) {
        const d = JSON.parse(inprog);
        if (d.weekKey !== thisWk) setTimeout(() => showWeekResetWarning(d), 1200);
      }
      state.weekSessions = {};
      save();
    }
  } catch(e) {
    state.weekSessions = {}; state.currentWeekKey = getWeekKey(); state.ytLinks = {};
  }
}

// v0.8: restore in-progress session silently on load
function restoreInProgress(d) {
  const day = PROGRAM.find(p => p.id === d.dayId);
  if (!day) return;
  state.workoutDay        = day;
  state.workoutChecks     = d.workoutChecks || {};
  state.setLogs           = d.setLogs       || {};
  state.cardioChecks      = d.cardioChecks  || {};
  state.sessionStartEpoch = d.sessionStartEpoch || null;
  state._pausedElapsed    = d.pausedElapsed || 0;
  state.timerRunning      = false;
  // Show header pill so user knows a session is live
  updateHeaderTimer();
  document.getElementById('header-timer-pill').classList.add('visible');
  setHeaderTimerIcon(false);
}

// ── INIT ────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  load();
  buildHomeDayCards();
  updateBannerDate();
  document.getElementById('streak-count').textContent = state.streak;
  const now = new Date();
  state.calYear = now.getFullYear(); state.calMonth = now.getMonth();
  history.pushState({page:'home'}, '');
  window.addEventListener('popstate', handlePopState);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  // Only show timer pill if a session was actually restored from storage
  if (!state.workoutDay) {
    document.getElementById('header-timer-pill').classList.remove('visible');
  }
  setTimeout(() => {
    document.getElementById('splash').classList.add('fade-out');
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
    }, 500);
  }, 1800);
});

// ── BACK INTERCEPT ──────────────────────────
function handlePopState() {
  history.pushState({page: state.currentView}, '');
  if (state.currentView === 'workout') handleBackFromWorkout();
  else if (state.currentView !== 'home') showView('home');
}

// ── UTILS ───────────────────────────────────
function pad2(n) { return String(n).padStart(2,'0'); }
function formatDuration(s) { return `${Math.floor(s/60)}m ${pad2(s%60)}s`; }
function todayStr() { return new Date().toISOString().slice(0,10); }
function updateBannerDate() {
  document.getElementById('banner-date').textContent =
    new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
}
function getElapsedSecs() {
  if (state.sessionStartEpoch) return Math.floor((Date.now() - state.sessionStartEpoch) / 1000);
  return state._pausedElapsed || 0;
}

// ── VIEW SWITCHING ──────────────────────────
function showView(name) {
  // Auto-save in-progress session to history whenever navigating away from workout
  if (state.currentView === 'workout' && name !== 'workout' && state.workoutDay) {
    autoSaveSessionToHistory();
  }
  const outgoing = document.querySelector('.view.active');
  if (outgoing) {
    const scroll = outgoing.querySelector('.view-scroll');
    if (scroll) state.scrollPositions[state.currentView] = scroll.scrollTop;
  }
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  state.currentView = name;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-'+name);
  if (nb) nb.classList.add('active');
  // Header progress bar: only in workout view
  const hw = document.getElementById('header-progress-wrap');
  if (name === 'workout') {
    hw.classList.add('visible');
    updateProgress();
  } else {
    hw.classList.remove('visible');
  }
  // Body stats button: hide on history and settings
  const bsb = document.getElementById('body-stats-btn-wrap');
  if (bsb) bsb.style.display = (name === 'history' || name === 'settings' || name === 'calendar') ? 'none' : 'flex';
  if (name === 'history')  renderHistory();
  if (name === 'home')     buildHomeDayCards();
  if (name === 'calendar') renderCalendar();
  if (name === 'stats')    renderStats();
  // If navigating back to workout, rebuild blocks to restore state
  if (name === 'workout' && state.workoutDay) rebuildWorkoutView();
  setTimeout(() => {
    const incoming = document.getElementById('view-'+name);
    const scroll = incoming && incoming.querySelector('.view-scroll');
    if (scroll && state.scrollPositions[name] != null) scroll.scrollTop = state.scrollPositions[name];
  }, 30);
}

// ── REBUILD WORKOUT VIEW (restores all state) ──
function rebuildWorkoutView() {
  const day = state.workoutDay;
  if (!day) return;
  document.getElementById('wd-day-label').textContent = day.id;
  document.getElementById('wd-focus').textContent = day.name + (state.weekSessions[day.id] ? ' ✏' : '');
  const finBtn = document.getElementById('finish-btn');
  finBtn.textContent = day.type==='rest' ? '✓ Rested' : '✓ FINISH WORKOUT';
  finBtn.className = 'finish-btn' + (day.type==='rest' ? ' rest-finish' : '');
  if (day.type==='rest')         renderRestDayView(day);
  else if (day.type==='stretch') renderStretchView(day);
  else                           renderWorkoutBlocks(day);
  // State is baked directly into rendered HTML — just update progress
  updateProgress();
}

// ── HOME ────────────────────────────────────
function buildHomeDayCards() {
  const container = document.getElementById('day-cards');
  container.innerHTML = '';
  PROGRAM.forEach((day, idx) => {
    const sess   = state.weekSessions[day.id];
    const isDone = !!sess;
    let extra = '';
    if (day.type==='rest')       extra = ' rest-day';
    if (day.type==='stretch')    extra = ' special-day';
    if (day.type==='cardio_day') extra = ' special-day';
    const isActive = idx === state.activeDay;
    const card = document.createElement('div');
    card.className = 'day-card'+(isDone?' done':'')+(isActive?' active-day':'')+extra;
    card.innerHTML = `
      <div class="day-badge">${day.id}</div>
      <div class="day-info">
        <div class="day-name">${day.name}</div>
        <div class="day-meta">${blockSummary(day)}</div>
      </div>
      <div class="day-check">${isDone?'✓':''}</div>`;
    card.addEventListener('click', () => {
      state.activeDay = idx;
      // If this day has an active in-progress session, always go straight in
      if (state.workoutDay && state.workoutDay.id === day.id) {
        showView('workout');
      } else if (isDone) {
        // Finished session — show review/reset modal
        openDoneDayModal(day, sess);
      } else {
        startWorkout(idx);
      }
    });
    container.appendChild(card);
  });
}
function blockSummary(day) {
  if (day.type==='rest')       return 'Full rest — recovery & sleep';
  if (day.type==='stretch')    return '60 min · no mat or props needed';
  if (day.type==='cardio_day') return '60 min · 3 cardio blocks';
  return 'Warm-up 10 min · Main 40 min · Secondary 20 min · Cardio 20 min · 1.5h total';
}

// ── DONE DAY MODAL ──────────────────────────
function openDoneDayModal(day, sess) {
  state.doneDayTarget = {day, sess};
  document.getElementById('done-day-modal-title').textContent = `✓ ${day.id} — ${day.name}`;
  document.getElementById('done-day-modal-sub').textContent   = 'This session was completed this week. What would you like to do?';
  document.getElementById('done-day-modal').style.display = 'flex';
}
function closeDoneDayModal() {
  document.getElementById('done-day-modal').style.display = 'none';
  state.doneDayTarget = null;
}
function doneDayAction(action) {
  const {day, sess} = state.doneDayTarget || {};
  closeDoneDayModal();
  if (!day) return;
  if (action === 'review') {
    state.workoutDay        = day;
    state.workoutChecks     = JSON.parse(JSON.stringify(sess.checks       || {}));
    state.setLogs           = JSON.parse(JSON.stringify(sess.setLogs      || {}));
    state.cardioChecks      = JSON.parse(JSON.stringify(sess.cardioChecks || {}));
    state.sessionStartEpoch = sess.sessionStartEpoch || null;
    document.getElementById('header-timer-pill').classList.add('visible');
    showView('workout');
  } else if (action === 'reset') {
    confirmResetSession(day);
  }
}
function confirmResetSession(day) {
  showUnsavedModal(
    `Reset ${day.id} — ${day.name}? All ticks, weights and reps will be cleared. This cannot be undone.`,
    () => resetSession(day)
  );
}
function resetSession(day) {
  // Clear all checks and logs for this day
  state.workoutChecks = {};
  state.setLogs       = {};
  state.cardioChecks  = {};
  state.sessionStartEpoch = null;
  state._pausedElapsed    = 0;
  // Remove from weekSessions so tick clears on home screen
  delete state.weekSessions[day.id];
  // Remove this week's history entry for this day
  state.history = state.history.filter(
    h => !(h.dayId === day.id && h.weekKey === state.currentWeekKey)
  );
  // Set as active workout day with blank state so user can restart
  state.workoutDay = day;
  recalcStreak();
  save();
  buildHomeDayCards();
  document.getElementById('streak-count').textContent = state.streak;
  document.getElementById('header-timer-pill').classList.remove('visible');
  localStorage.removeItem('gymdolph_inprogress');
}
function unmarkSession(day) {
  // v0.8: only remove the completion tick — history record is kept intact
  delete state.weekSessions[day.id];
  recalcStreak();
  save(); buildHomeDayCards();
  document.getElementById('streak-count').textContent = state.streak;
}
function recalcStreak() {
  const dates = new Set(state.history.map(h=>h.date));
  let streak = 0;
  const d = new Date();
  while (dates.has(d.toISOString().slice(0,10))) { streak++; d.setDate(d.getDate()-1); }
  state.streak = streak;
  const el = document.getElementById('cal-streak-num');
  if (el) el.textContent = streak;
}

// ── START WORKOUT ────────────────────────────
function startWorkout(dayIndex) {
  const day = PROGRAM[dayIndex];
  if (!day) return;
  // v0.8: if there's already an in-progress session for a different day, warn
  if (state.workoutDay && state.workoutDay.id !== day.id &&
      (state.sessionStartEpoch || state._pausedElapsed)) {
    if (!confirm(`You have an unfinished ${state.workoutDay.name} session. Start ${day.name} instead? The previous session will be discarded.`)) return;
  }
  state.workoutDay     = day;
  state.workoutChecks  = {}; state.setLogs = {}; state.cardioChecks = {};
  state.notifiedMilestones = {};
  state.sessionStartEpoch  = Date.now();
  state._pausedElapsed     = 0;
  save();
  const finBtn = document.getElementById('finish-btn');
  finBtn.textContent = day.type==='rest' ? '✓ Rested' : '✓ FINISH WORKOUT';
  finBtn.className = 'finish-btn' + (day.type==='rest' ? ' rest-finish' : '');
  if (day.type==='rest')         renderRestDayView(day);
  else if (day.type==='stretch') renderStretchView(day);
  else                           renderWorkoutBlocks(day);
  updateProgress();
  showView('workout');
  startTimerTick();
  requestNotifPermission();
  document.getElementById('header-timer-pill').classList.add('visible');
  setHeaderTimerIcon(true);
}

// ── REST DAY ─────────────────────────────────
function renderRestDayView(day) {
  document.getElementById('wd-day-label').textContent = day.id;
  document.getElementById('wd-focus').textContent = day.name;
  document.getElementById('workout-blocks').innerHTML = `
    <div class="rest-day-view">
      <div class="rest-day-emojis"><span>😴</span><span>💤</span><span>🛌</span><span>💤</span><span>😴</span></div>
      <div class="rest-day-title">FULL REST DAY</div>
      <div class="rest-day-sub">Your muscles grow during recovery.<br>Sleep well · eat well · hydrate.</div>
    </div>`;
}

// ── STRETCH VIEW ─────────────────────────────
function renderStretchView(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';
  day.stretchPhases.forEach(phase => {
    const block = document.createElement('div');
    block.className = 'stretch-block';
    let h = '';
    phase.moves.forEach(m => {
      const chk = state.workoutChecks[m.id];
      h += `<div class="stretch-row" onclick="handleExRowClick(event,'${m.id}')">
        <div class="ex-check ${chk?'checked':''}" id="excheck-${m.id}"
          onclick="event.stopPropagation();toggleExercise('${m.id}',this)">${chk?'✓':''}</div>
        <div class="stretch-info">
          <div class="stretch-name">${m.name}</div>
          <div class="stretch-detail">${m.detail}</div>
          ${m.note?`<div class="stretch-note">${m.note}</div>`:''}
        </div></div>`;
    });
    block.innerHTML = `<div class="stretch-block-header">
      <span class="block-icon">${phase.icon}</span>
      <span class="stretch-block-title">${phase.title}</span>
      <span class="block-duration">${phase.duration}</span></div>${h}`;
    container.appendChild(block);
  });
}

// ── WORKOUT BLOCKS ────────────────────────────
function getMostUsedSetValue(exName) {
  const allSets = [];
  let found = 0;
  for (let i=0; i<state.history.length && found<10; i++) {
    const ex = (state.history[i].exercises||[]).find(e=>e.name===exName);
    if (ex && ex.setLogs && ex.setLogs.length) {
      ex.setLogs.filter(s=>s&&s.weight>0).forEach(s=>allSets.push(s));
      found++;
    }
  }
  if (!allSets.length) return null;
  const wFreq = {};
  allSets.forEach(s=>{ wFreq[s.weight]=(wFreq[s.weight]||0)+1; });
  const topW = parseFloat(Object.entries(wFreq).sort((a,b)=>b[1]-a[1])[0][0]);
  const rFreq = {};
  allSets.filter(s=>s.weight===topW).forEach(s=>{ rFreq[s.reps]=(rFreq[s.reps]||0)+1; });
  const topR = parseInt(Object.entries(rFreq).sort((a,b)=>b[1]-a[1])[0][0]);
  return { weight: Math.round(topW), reps: Math.round(topR) };
}
function renderWorkoutBlocks(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';
  day.blocks.forEach(block => {
    const blockEl = document.createElement('div');
    blockEl.className = 'workout-block';
    let exHTML = '';
    if (block.type==='cardio') {
      block.exercises.forEach(ex => {
        const chk = !!state.cardioChecks[ex.id];
        exHTML += `<div class="cardio-row" onclick="handleCardioRowClick(event,'${ex.id}')">
          <div class="cardio-check ${chk?'checked':''}" id="cardiocheck-${ex.id}"
            onclick="event.stopPropagation();toggleCardio('${ex.id}',this)">${chk?'✓':''}</div>
          <div style="flex:1">
            <div class="cardio-label">${ex.name}</div>
            <div class="cardio-sub">${ex.prescription}</div>
            ${ex.note?`<div class="cardio-sub" style="color:var(--pink2);font-style:italic">${ex.note}</div>`:''}
          </div>
          ${getExInfo(ex.name)?`<button class="ex-info-btn" onclick="openInfoModal(this.dataset.n)" data-n="${ex.name}">i</button>`:''}
        </div>`;
      });
    } else {
      block.exercises.forEach(ex => {
        const chk = !!state.workoutChecks[ex.id];
        const hint = getMostUsedSetValue(ex.name);
        const hintText = hint ? `${hint.weight}kg × ${hint.reps}` : '';
        let chips = '';
        if (block.type!=='warmup') {
          for (let s=0;s<ex.sets;s++) {
            const logged = state.setLogs[ex.id] && state.setLogs[ex.id][s] && state.setLogs[ex.id][s].weight != null ? state.setLogs[ex.id][s] : null;
            const chipLabel = logged ? `${logged.weight}kg × ${logged.reps}` : `Set ${s+1}`;
            const chipClass = logged ? 'set-chip logged' : 'set-chip';
            chips += `<div class="${chipClass}" id="setchip-${ex.id}-${s}"
              onclick="openSetModal('${day.id}','${block.id}','${ex.id}',${s})">${chipLabel}</div>`;
          }
          if (hintText) chips += `<span class="set-hint">${hintText}</span>`;
        }
        exHTML += `<div class="exercise-row" id="exrow-${ex.id}"
            onclick="handleExRowClick(event,'${ex.id}')">
          <div class="ex-check ${chk?'checked':''}" id="excheck-${ex.id}"
            onclick="event.stopPropagation();toggleExercise('${ex.id}',this)">${chk?'✓':''}</div>
          <div class="ex-info">
            <div class="ex-name-row">
              <span class="ex-name">${ex.name}</span>
              ${getExInfo(ex.name)?`<button class="ex-info-btn" onclick="openInfoModal(this.dataset.n)" data-n="${ex.name}">i</button>`:''}
            </div>
            <div class="ex-prescription">${ex.prescription}</div>
            ${ex.note?`<div class="ex-prescription" style="color:var(--pink2);font-style:italic">⚠ ${ex.note}</div>`:''}
            ${chips?`<div class="ex-sets-row">${chips}</div>`:''}
          </div>
        </div>`;
      });
    }
    blockEl.innerHTML = `<div class="block-header">
      <span class="block-icon">${block.icon}</span>
      <span class="block-title">${block.title}</span>
      <span class="block-duration">${block.duration}</span></div>${exHTML}`;
    container.appendChild(blockEl);
  });
}

// ── TOGGLES ──────────────────────────────────
// Row-level click — delegate to checkbox unless user clicked a chip or info btn
function handleExRowClick(event, exId) {
  if (event.target.closest('.set-chip') || event.target.closest('.ex-info-btn')) return;
  const el = document.getElementById('excheck-' + exId);
  if (el) toggleExercise(exId, el);
}
function handleCardioRowClick(event, exId) {
  if (event.target.closest('.ex-info-btn')) return;
  const el = document.getElementById('cardiocheck-' + exId);
  if (el) toggleCardio(exId, el);
}
function toggleExercise(exId, el) {
  state.workoutChecks[exId] = !state.workoutChecks[exId];
  el.classList.toggle('checked', state.workoutChecks[exId]);
  el.textContent = state.workoutChecks[exId] ? '✓' : '';
  updateProgress(); save();
}
function toggleCardio(exId, el) {
  state.cardioChecks[exId] = !state.cardioChecks[exId];
  el.classList.toggle('checked', state.cardioChecks[exId]);
  el.textContent = state.cardioChecks[exId] ? '✓' : '';
  updateProgress(); save();
}

// ── SET MODAL ────────────────────────────────
function openSetModal(dayId, blockId, exId, setIndex) {
  const scroll = document.getElementById('workout-scroll');
  if (scroll) state.scrollPositions['workout'] = scroll.scrollTop;
  state.modalTarget = {dayId, blockId, exId, setIndex};
  const block = state.workoutDay.blocks.find(b=>b.id===blockId);
  const ex    = block.exercises.find(e=>e.id===exId);
  document.getElementById('modal-ex-name').textContent = `${ex.name} — Set ${setIndex+1}`;
  const prev = (state.setLogs[exId]||[])[setIndex];
  const hint = getMostUsedSetValue(ex.name);
  if (prev) {
    document.getElementById('modal-weight').value = prev.weight;
    document.getElementById('modal-reps').value   = prev.reps;
    document.getElementById('modal-prefill-hint').textContent = '';
  } else if (hint) {
    document.getElementById('modal-weight').value = hint.weight;
    document.getElementById('modal-reps').value   = hint.reps;
    document.getElementById('modal-prefill-hint').textContent = `Most used: ${hint.weight}kg × ${hint.reps}`;
  } else {
    document.getElementById('modal-weight').value = '';
    document.getElementById('modal-reps').value   = ex.reps;
    document.getElementById('modal-prefill-hint').textContent = '';
  }
  document.getElementById('set-modal').style.display = 'flex';
  setTimeout(()=>document.getElementById('modal-weight').focus(), 100);
}
function closeModal() {
  document.getElementById('set-modal').style.display = 'none';
  state.modalTarget = null;
}
function confirmSet() {
  const {exId, setIndex} = state.modalTarget;
  const weight = parseFloat(document.getElementById('modal-weight').value)||0;
  const reps   = parseInt(document.getElementById('modal-reps').value)||0;
  if (!state.setLogs[exId]) state.setLogs[exId] = [];
  state.setLogs[exId][setIndex] = {weight, reps};
  const chip = document.getElementById(`setchip-${exId}-${setIndex}`);
  if (chip) { chip.classList.add('logged'); chip.textContent=`${weight}kg × ${reps}`; }
  closeModal();
  save();
  startRestTimer(state.restPreferredDuration||60);
  updateProgress();
  setTimeout(() => {
    const scroll = document.getElementById('workout-scroll');
    if (scroll && state.scrollPositions['workout']!=null) scroll.scrollTop = state.scrollPositions['workout'];
  }, 50);
}

// ── PROGRESS ─────────────────────────────────
function updateProgress() {
  if (!state.workoutDay) return;
  const day = state.workoutDay;
  let total=0, done=0;
  if (day.type==='rest') { total=1; done=1; }
  else if (day.type==='stretch') {
    day.stretchPhases.forEach(p=>p.moves.forEach(m=>{ total++; if(state.workoutChecks[m.id]) done++; }));
  } else {
    day.blocks.forEach(b=>b.exercises.forEach(ex=>{
      total++;
      if(b.type==='cardio'){if(state.cardioChecks[ex.id])done++;}
      else{if(state.workoutChecks[ex.id])done++;}
    }));
  }
  const pct = total>0 ? (done/total*100) : 0;
  // In-page bar
  const ipb = document.getElementById('workout-progress-bar');
  if (ipb) ipb.style.width = pct+'%';
  const ipl = document.getElementById('progress-label');
  if (ipl) ipl.textContent = day.type==='rest' ? 'Rest day' : `${done} / ${total} done`;
  // Header bar
  document.getElementById('header-progress-bar').style.width = pct+'%';
  document.getElementById('header-progress-label').textContent =
    day.type==='rest' ? 'Rest day' : `${done} / ${total}`;
}

// ── WALL-CLOCK TIMER ─────────────────────────
function updateHeaderTimer() {
  const secs = getElapsedSecs();
  const display = `${pad2(Math.floor(secs/60))}:${pad2(secs%60)}`;
  document.getElementById('header-timer-display').textContent = display;
}
function startTimerTick() {
  clearInterval(state.timerInterval);
  state.timerRunning = true;
  setHeaderTimerIcon(true);
  state.timerInterval = setInterval(() => {
    const secs = getElapsedSecs();
    updateHeaderTimer();
    NOTIF_MILESTONES.forEach(ms => {
      if (secs >= ms && !state.notifiedMilestones[ms]) {
        state.notifiedMilestones[ms] = true;
        const labels = {600:'10 min in 💪', 3000:'50 min — keep going! 🔥', 4200:'70 min — almost there! 🏁'};
        fireNotif('Gym Dolph', labels[ms]);
      }
    });
    save();
  }, 1000);
}
function toggleTimer() {
  if (state.timerRunning) pauseTimer(); else resumeTimer();
}
function pauseTimer() {
  if (!state.timerRunning) return;
  state._pausedElapsed = getElapsedSecs();
  state.sessionStartEpoch = null;
  state.timerRunning = false;
  clearInterval(state.timerInterval);
  setHeaderTimerIcon(false);
  save();
}
function resumeTimer() {
  if (state.timerRunning) return;
  state.sessionStartEpoch = Date.now() - state._pausedElapsed * 1000;
  startTimerTick();
}
function setHeaderTimerIcon(running) {
  document.getElementById('htt-play').style.display  = running ? 'none'  : 'block';
  document.getElementById('htt-pause').style.display = running ? 'block' : 'none';
}

// ── NOTIFICATIONS ─────────────────────────────
function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission==='granted') { state.notifPermission=true; return; }
  if (Notification.permission!=='denied') {
    Notification.requestPermission().then(p => { state.notifPermission = p==='granted'; });
  }
}
function fireNotif(title, body) {
  if (!state.notifPermission) return;
  try { new Notification(title, {body}); } catch(e){}
}

// ── REST TIMER ────────────────────────────────
function setRestDuration(s) {
  state.restPreferredDuration = s;
  [30,60,120].forEach(v => {
    const btn = document.getElementById(`rdb-${v}`);
    if (btn) btn.classList.toggle('active', v===s);
  });
  if (document.getElementById('rest-overlay').style.display!=='none') startRestTimer(s);
}
function startRestTimer(s) {
  const dur = (s!==undefined) ? s : (state.restPreferredDuration||60);
  state.restTotal=dur; state.restRemaining=dur;
  [30,60,120].forEach(v=>{ const b=document.getElementById(`rdb-${v}`); if(b) b.classList.toggle('active',v===dur); });
  document.getElementById('rest-countdown').textContent = dur;
  document.getElementById('ring-fg').style.strokeDashoffset = 0;
  document.getElementById('rest-overlay').style.display = 'flex';
  clearInterval(state.restInterval);
  state.restInterval = setInterval(() => {
    state.restRemaining--;
    document.getElementById('rest-countdown').textContent = state.restRemaining;
    document.getElementById('ring-fg').style.strokeDashoffset = 276.46*(1-state.restRemaining/state.restTotal);
    document.getElementById('widget-countdown').textContent = state.restRemaining;
    document.getElementById('widget-ring-fg').style.strokeDashoffset = 295.31*(1-state.restRemaining/state.restTotal);
    if (state.restRemaining<=0) skipRest();
  }, 1000);
}
function collapseRestToWidget() {
  document.getElementById('rest-overlay').style.display = 'none';
  const w = document.getElementById('rest-widget');
  w.classList.add('visible');
  makeDraggable(w);
}
function skipRest() {
  clearInterval(state.restInterval);
  document.getElementById('rest-overlay').style.display = 'none';
  document.getElementById('rest-widget').classList.remove('visible');
}

// ── DRAGGABLE ─────────────────────────────────
function makeDraggable(el) {
  let startX, startY, origX, origY;
  function onStart(e) {
    const t = e.touches ? e.touches[0] : e;
    startX=t.clientX; startY=t.clientY;
    const r=el.getBoundingClientRect(); origX=r.left; origY=r.top;
    el.style.right='auto'; el.style.bottom='auto';
    el.style.left=origX+'px'; el.style.top=origY+'px';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, {passive:false});
    document.addEventListener('touchend', onEnd);
  }
  function onMove(e) {
    if (e.cancelable) e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    el.style.left=(origX+t.clientX-startX)+'px';
    el.style.top=(origY+t.clientY-startY)+'px';
  }
  function onEnd() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
  }
  el.addEventListener('mousedown', onStart);
  el.addEventListener('touchstart', onStart, {passive:false});
}

// ── AUTO-SAVE SESSION TO HISTORY (called on any navigation away from workout) ──
// Saves current state silently without closing the session.
// The session remains "in progress" — workoutDay stays set,
// timer keeps running, user can return and continue.
function autoSaveSessionToHistory() {
  const day = state.workoutDay;
  if (!day) return;
  let exercises = [];
  if (day.type === 'rest') {
    exercises = [];
  } else if (day.type === 'stretch') {
    day.stretchPhases.forEach(p => p.moves.forEach(m => {
      exercises.push({id:m.id, name:m.name, checked:!!state.workoutChecks[m.id], weight:'', setLogs:[]});
    }));
  } else {
    day.blocks.forEach(b => b.exercises.forEach(ex => {
      const isC = b.type === 'cardio';
      const chk = isC ? !!state.cardioChecks[ex.id] : !!state.workoutChecks[ex.id];
      const sets = state.setLogs[ex.id] || [];
      exercises.push({id:ex.id, name:ex.name, checked:chk,
        weight: sets.filter(s=>s&&s.weight>0).map(s=>`${s.weight}kg×${s.reps}`).join(', '),
        setLogs: sets});
    }));
  }
  const duration = getElapsedSecs();
  // Upsert into history (keyed by dayId + weekKey — same slot as Finish Workout would use)
  const existing = state.history.findIndex(h => h.dayId===day.id && h.weekKey===state.currentWeekKey);
  const record = {
    id:         existing >= 0 ? state.history[existing].id : Date.now(),
    dayId:      day.id, dayName: day.name,
    date:       todayStr(), weekKey: state.currentWeekKey,
    dateStr:    new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}),
    duration,   durationStr: formatDuration(duration),
    setLogs:    JSON.parse(JSON.stringify(state.setLogs)),
    checks:     JSON.parse(JSON.stringify(state.workoutChecks)),
    exercises,
    inProgress: true,  // flag so history can show "in progress" if desired
  };
  if (existing >= 0) state.history[existing] = record;
  else state.history.unshift(record);
  save();
}

// ── FINISH WORKOUT ────────────────────────────
function finishWorkout() {
  pauseTimer();
  const day = state.workoutDay;
  if (!day) { showView('home'); return; }
  let exercises = [];
  if (day.type==='rest') {
    exercises = [];
  } else if (day.type==='stretch') {
    day.stretchPhases.forEach(p=>p.moves.forEach(m=>{
      exercises.push({id:m.id, name:m.name, checked:!!state.workoutChecks[m.id], weight:'', setLogs:[]});
    }));
  } else {
    day.blocks.forEach(b=>b.exercises.forEach(ex=>{
      const isC=b.type==='cardio';
      const chk=isC?!!state.cardioChecks[ex.id]:!!state.workoutChecks[ex.id];
      const sets=state.setLogs[ex.id]||[];
      exercises.push({id:ex.id, name:ex.name, checked:chk,
        weight:sets.filter(s=>s&&s.weight>0).map(s=>`${s.weight}kg×${s.reps}`).join(', '),
        setLogs:sets});
    }));
  }
  const duration = getElapsedSecs();
  state.weekSessions[day.id] = {
    checks:    JSON.parse(JSON.stringify(state.workoutChecks)),
    setLogs:   JSON.parse(JSON.stringify(state.setLogs)),
    cardioChecks: JSON.parse(JSON.stringify(state.cardioChecks)),
    sessionStartEpoch: state.sessionStartEpoch,
    exercises, duration
  };
  const existing = state.history.findIndex(h=>h.dayId===day.id && h.weekKey===state.currentWeekKey);
  const record = {
    id:       existing>=0 ? state.history[existing].id : Date.now(),
    dayId:    day.id, dayName:day.name,
    date:     todayStr(), weekKey:state.currentWeekKey,
    dateStr:  new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}),
    duration, durationStr:formatDuration(duration),
    setLogs:  JSON.parse(JSON.stringify(state.setLogs)),
    checks:   JSON.parse(JSON.stringify(state.workoutChecks)),
    exercises,
  };
  if (existing>=0) state.history[existing]=record; else state.history.unshift(record);
  const today=todayStr(), yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  const lastDates=[...new Set(state.history.map(h=>h.date))].sort().reverse();
  if (lastDates[0]===today && (lastDates[1]===yesterday || state.streak===0))
    if (state.history.filter(h=>h.date===today).length===1) state.streak++;
  state.workoutDay = null; state.sessionStartEpoch = null; state._pausedElapsed = 0;
  localStorage.removeItem('gymdolph_inprogress');
  save();
  buildHomeDayCards();
  document.getElementById('streak-count').textContent = state.streak;
  document.getElementById('header-timer-pill').classList.remove('visible');
  document.getElementById('header-progress-wrap').classList.remove('visible');
  showView('home');
}

// ── BACK FROM WORKOUT ────────────────────────
function handleBackFromWorkout() {
  // Session is auto-saved on every navigation — just go home, no warning needed
  showView('home');
}

// ── UNSAVED MODAL ─────────────────────────────
function showUnsavedModal(msg, onContinue, confirmLabel, cancelLabel) {
  document.getElementById('unsaved-sub').textContent = msg;
  state.unsavedCallback = onContinue || null;
  const confirmBtn = document.getElementById('unsaved-confirm-btn');
  const cancelBtn  = document.getElementById('unsaved-cancel-btn');
  if (confirmBtn) confirmBtn.textContent = confirmLabel || 'Confirm';
  if (cancelBtn)  cancelBtn.textContent  = cancelLabel  || 'Cancel';
  document.getElementById('unsaved-modal').style.display = 'flex';
}
function unsavedAction(action) {
  document.getElementById('unsaved-modal').style.display = 'none';
  const cb = state.unsavedCallback;
  state.unsavedCallback = null;
  if (action === 'save') {
    // 'save' = confirm the action described in the modal
    // If a resetSession callback is pending, run it directly
    // If it's a navigation-away save, call finishWorkout first
    if (cb) {
      cb();
    } else {
      finishWorkout();
    }
  } else {
    // Discard = cancel, do nothing
    // (for navigation-away: also clean up session state)
    if (!cb) {
      // Was a navigation-away modal — discard session
      state.workoutDay = null; state.sessionStartEpoch = null; state._pausedElapsed = 0;
      localStorage.removeItem('gymdolph_inprogress');
      clearInterval(state.timerInterval);
      state.timerRunning = false;
      document.getElementById('header-timer-pill').classList.remove('visible');
      document.getElementById('header-progress-wrap').classList.remove('visible');
    }
  }
}

// ── WEEK RESET WARNING ────────────────────────
function showWeekResetWarning(d) {
  const day = PROGRAM.find(p=>p.id===d.dayId);
  if (!day) return;
  state.workoutDay    = day;
  state.workoutChecks = d.workoutChecks || {};
  state.setLogs       = d.setLogs       || {};
  state.cardioChecks  = d.cardioChecks  || {};
  state.sessionStartEpoch = null;
  state._pausedElapsed = d.pausedElapsed || 0;
  const savedWeek = state.currentWeekKey;
  state.currentWeekKey = d.weekKey;
  showUnsavedModal(
    `Last week you had an unfinished ${day.name} session. Save it to history before the week resets?`,
    () => { state.currentWeekKey = savedWeek; }
  );
}

// ── BODY STATS MODAL ─────────────────────────
function openBodyStatsModal() {
  const last = state.bodyStats.length ? state.bodyStats[0] : null;
  document.getElementById('bsm-weight').value = last ? last.weight : '';
  document.getElementById('bsm-bf').value     = last ? (last.bf||'') : '';
  document.getElementById('body-stats-hint').textContent =
    last ? `Last logged: ${last.weight}kg${last.bf?' · '+last.bf+'% BF':''} (${last.date})` : '';
  document.getElementById('body-stats-modal').style.display = 'flex';
  setTimeout(()=>document.getElementById('bsm-weight').focus(), 100);
}
function closeBodyStatsModal() {
  document.getElementById('body-stats-modal').style.display = 'none';
}
function saveBodyStats() {
  const weight = parseFloat(document.getElementById('bsm-weight').value);
  const bf     = parseFloat(document.getElementById('bsm-bf').value);
  if (!weight) { closeBodyStatsModal(); return; }
  const entry = { date: todayStr(), weight, bf: isNaN(bf)?null:bf };
  // Replace today's entry if it exists
  state.bodyStats = state.bodyStats.filter(e=>e.date!==entry.date);
  state.bodyStats.unshift(entry);
  save();
  closeBodyStatsModal();
  if (state.currentView==='stats') renderStats();
}

// ── HISTORY ──────────────────────────────────
function renderHistory() {
  const c=document.getElementById('history-list'); c.innerHTML='';
  if (!state.history.length) {
    c.innerHTML='<div class="history-empty">No workouts recorded yet.<br>Complete your first session!</div>';
    return;
  }
  state.history.forEach(h=>{
    const card=document.createElement('div'); card.className='history-card';
    const done=Object.values(h.checks||{}).filter(Boolean).length;
    const sets=Object.values(h.setLogs||{}).reduce((a,s)=>a+s.length,0);
    card.innerHTML=`
      <div class="hc-top">
        <span class="hc-day">${h.dayId} — ${h.dayName}</span>
        <span class="hc-date">${h.dateStr}</span>
      </div>
      <div class="hc-focus">${done} exercises · ${sets} sets · ${h.durationStr||'—'}</div>
      <div class="hc-actions">
        <button class="hc-modify-btn" onclick="openModifyModal(${h.id})">✏ Modify</button>
      </div>`;
    c.appendChild(card);
  });
}

// ── MODIFY MODAL ─────────────────────────────
function openModifyModal(recordId) {
  const record=state.history.find(r=>r.id===recordId); if(!record) return;
  state.modifyTarget=recordId;
  document.getElementById('modify-modal-title').textContent=`✏ ${record.dayId} — ${record.dayName}`;
  const body=document.getElementById('modify-modal-body'); body.innerHTML='';
  (record.exercises||[]).forEach((ex,idx)=>{
    const row=document.createElement('div'); row.className='modify-ex-row';
    row.innerHTML=`
      <div class="modify-ex-check ${ex.checked?'checked':''}" id="mcheck-${idx}"
        onclick="toggleModifyCheck(${recordId},${idx},this)">${ex.checked?'✓':''}</div>
      <div class="modify-ex-name">${ex.name}</div>
      <input class="modify-weight-input" type="text" id="mweight-${idx}"
        value="${ex.weight||''}" placeholder="kg/notes"/>`;
    body.appendChild(row);
  });
  document.getElementById('modify-modal').style.display='flex';
}
function toggleModifyCheck(recordId,idx,el) {
  const r=state.history.find(r=>r.id===recordId); if(!r||!r.exercises[idx]) return;
  r.exercises[idx].checked=!r.exercises[idx].checked;
  el.classList.toggle('checked',r.exercises[idx].checked);
  el.textContent=r.exercises[idx].checked?'✓':'';
}
function saveModify() {
  const r=state.history.find(r=>r.id===state.modifyTarget);
  if(r&&r.exercises) {
    r.exercises.forEach((ex,idx)=>{ const w=document.getElementById(`mweight-${idx}`); if(w) ex.weight=w.value; });
    const nc={}; r.exercises.forEach(ex=>{ nc[ex.id]=ex.checked; }); r.checks=nc;
    if(r.weekKey===state.currentWeekKey&&state.weekSessions[r.dayId]) {
      state.weekSessions[r.dayId].exercises=JSON.parse(JSON.stringify(r.exercises));
      state.weekSessions[r.dayId].checks=nc;
    }
  }
  save(); closeModifyModal();
  if(state.currentView==='history') renderHistory();
  buildHomeDayCards();
}
function closeModifyModal() {
  document.getElementById('modify-modal').style.display='none'; state.modifyTarget=null;
}

// ── INFO MODAL ────────────────────────────────
function getExInfo(name) { return EX_INFO[name.toLowerCase().trim()]||null; }
function openInfoModal(elOrName) {
  const name=(typeof elOrName==='string')?elOrName:elOrName.dataset.n;
  const info=getExInfo(name); if(!info) return;
  state.infoModalName=name;
  document.getElementById('info-modal-title').textContent=name;
  document.getElementById('info-muscles').textContent='💪 '+info.muscles;
  document.getElementById('info-cues').innerHTML=info.cues.map(c=>`<div class="info-cue-row">• ${c}</div>`).join('');
  const noteEl=document.getElementById('info-note');
  noteEl.textContent=info.note||''; noteEl.style.display=info.note?'block':'none';
  const customYt=state.ytLinks&&state.ytLinks[name];
  document.getElementById('info-yt-link').href=customYt
    ?(customYt.startsWith('http')?customYt:`https://www.youtube.com/results?search_query=${encodeURIComponent(customYt)}`)
    :`https://www.youtube.com/results?search_query=${encodeURIComponent(info.yt)}`;
  document.getElementById('info-yt-edit').style.display='none';
  document.getElementById('info-yt-edit-toggle').style.display='block';
  document.getElementById('info-yt-input').value=customYt||'';
  document.getElementById('info-modal').style.display='flex';
}
function closeInfoModal() { document.getElementById('info-modal').style.display='none'; state.infoModalName=null; }
function handleInfoOverlayClick(e) { if(e.target===document.getElementById('info-modal')) closeInfoModal(); }
function toggleYtEdit() {
  const info=getExInfo(state.infoModalName), custom=state.ytLinks&&state.ytLinks[state.infoModalName];
  document.getElementById('info-yt-input').value=custom||(info?info.yt:'');
  document.getElementById('info-yt-edit').style.display='block';
  document.getElementById('info-yt-edit-toggle').style.display='none';
}
function cancelYtEdit() {
  document.getElementById('info-yt-edit').style.display='none';
  document.getElementById('info-yt-edit-toggle').style.display='block';
}
function saveYtLink() {
  const val=document.getElementById('info-yt-input').value.trim();
  if(!state.ytLinks) state.ytLinks={};
  if(val) state.ytLinks[state.infoModalName]=val; else delete state.ytLinks[state.infoModalName];
  save();
  document.getElementById('info-yt-link').href=val?(val.startsWith('http')?val:`https://www.youtube.com/results?search_query=${encodeURIComponent(val)}`):'#';
  cancelYtEdit();
}

// ── CALENDAR ─────────────────────────────────
function calPrev() { state.calMonth--; if(state.calMonth<0){state.calMonth=11;state.calYear--;} renderCalendar(); }
function calNext() { state.calMonth++; if(state.calMonth>11){state.calMonth=0;state.calYear++;} renderCalendar(); }
function renderCalendar() {
  const yr=state.calYear, mo=state.calMonth;
  document.getElementById('cal-month-label').textContent=
    new Date(yr,mo,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase();
  document.getElementById('cal-streak-num').textContent=state.streak;
  const grid=document.getElementById('cal-grid'); grid.innerHTML='';
  ['M','T','W','T','F','S','S'].forEach(d=>{
    const h=document.createElement('div'); h.className='cal-day-hdr'; h.textContent=d; grid.appendChild(h);
  });
  const sessionDates={};
  state.history.forEach(h=>{ sessionDates[h.date]=sessionDates[h.date]||[]; sessionDates[h.date].push(h.dayId); });
  const firstDow=new Date(yr,mo,1).getDay();
  const startOffset=firstDow===0?6:firstDow-1;
  const daysInMonth=new Date(yr,mo+1,0).getDate();
  const today=todayStr();
  for(let i=0;i<startOffset;i++){ const e=document.createElement('div');e.className='cal-cell empty';grid.appendChild(e); }
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${yr}-${pad2(mo+1)}-${pad2(d)}`;
    const cell=document.createElement('div'); cell.className='cal-cell';
    const days=sessionDates[ds]||[];
    let dotColor='';
    if(days.length){
      const types=days.map(id=>{const p=PROGRAM.find(p=>p.id===id);return p?p.type:'';});
      if(types.includes('training'))                         dotColor='var(--green)';
      else if(types.some(t=>t==='cardio_day'||t==='stretch')) dotColor='var(--pink)';
      else                                                     dotColor='var(--header)';
    }
    cell.innerHTML=`<div class="cal-day-num ${ds===today?'cal-today':''}">${d}</div>
      ${dotColor?`<div class="cal-dot" style="background:${dotColor}"></div>`:'<div class="cal-dot-empty"></div>'}`;
    grid.appendChild(cell);
  }
  const tail=(7-(startOffset+daysInMonth)%7)%7;
  for(let i=0;i<tail;i++){ const e=document.createElement('div');e.className='cal-cell empty';grid.appendChild(e); }
}

// ── STATS ─────────────────────────────────────
function renderStats() {
  renderBodyStatsSummary();
  renderBodyWeightChart();
  const picker=document.getElementById('stats-exercise-picker');
  const names=new Set();
  state.history.forEach(h=>{ (h.exercises||[]).forEach(ex=>{ if(ex.setLogs&&ex.setLogs.some(s=>s&&s.weight>0)) names.add(ex.name); }); });
  picker.innerHTML='';
  if(!names.size) picker.innerHTML='<option>No data yet — log some sets!</option>';
  else [...names].sort().forEach(n=>{ const o=document.createElement('option');o.value=n;o.textContent=n;picker.appendChild(o); });
  renderProgressChart(); renderVolumeChart();
}
function renderBodyStatsSummary() {
  const el=document.getElementById('body-stats-summary');
  if (!state.bodyStats.length) { el.innerHTML=''; return; }
  const latest=state.bodyStats[0];
  el.innerHTML=`
    <div class="body-stat-card">
      <div class="body-stat-label">BODY WEIGHT</div>
      <div><span class="body-stat-value">${latest.weight}</span><span class="body-stat-unit">kg</span></div>
      <div class="body-stat-date">${latest.date}</div>
    </div>
    ${latest.bf!=null?`<div class="body-stat-card">
      <div class="body-stat-label">BODY FAT</div>
      <div><span class="body-stat-value">${latest.bf}</span><span class="body-stat-unit">%</span></div>
      <div class="body-stat-date">${latest.date}</div>
    </div>`:''}`;
}
function renderBodyWeightChart() {
  const canvas=document.getElementById('body-weight-canvas');
  if (!state.bodyStats.length) { canvas.style.display='none'; return; }
  canvas.style.display='block';
  const sorted=[...state.bodyStats].reverse();
  drawLineChart(canvas, sorted.map(e=>e.date), sorted.map(e=>e.weight),
    'Body Weight','kg','#77FD01','rgba(119,253,1,0.12)');
}
function renderProgressChart() {
  const picker=document.getElementById('stats-exercise-picker');
  const name=picker.value;
  const canvas=document.getElementById('stats-canvas'), empty=document.getElementById('stats-empty');
  if(!name||name.startsWith('No data')){ canvas.style.display='none'; empty.style.display='block'; return; }
  const points=[];
  [...state.history].reverse().forEach(h=>{ (h.exercises||[]).forEach(ex=>{
    if(ex.name===name&&ex.setLogs&&ex.setLogs.length){
      const mw=Math.max(...ex.setLogs.filter(s=>s).map(s=>s.weight||0));
      if(mw>0) points.push({date:h.date,w:mw});
    }
  }); });
  if(!points.length){ canvas.style.display='none'; empty.style.display='block'; return; }
  empty.style.display='none'; canvas.style.display='block';
  drawLineChart(canvas,points.map(p=>p.date),points.map(p=>p.w),name,'kg','#77FD01','rgba(119,253,1,0.15)');
}
function renderVolumeChart() {
  const canvas=document.getElementById('volume-canvas');
  const weeks=[]; for(let i=7;i>=0;i--){ const d=new Date();d.setDate(d.getDate()-i*7);weeks.push(getWeekKey(d)); }
  const labels=weeks.map(w=>w.replace(/.*-W/,'W'));
  const values=weeks.map(wk=>state.history.filter(h=>h.weekKey===wk).reduce((a,h)=>a+Object.values(h.setLogs||{}).reduce((b,s)=>b+s.length,0),0));
  drawBarChart(canvas,labels,values,'Sets per week','#EB47CE');
}
function drawLineChart(canvas,labels,values,title,unit,lineColor,fillColor){
  const dpr=window.devicePixelRatio||1,W=canvas.offsetWidth||340,H=180;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
  const p={top:28,right:16,bottom:36,left:40};
  const cw=W-p.left-p.right,ch=H-p.top-p.bottom;
  const mn=Math.min(...values)*0.9,mx=Math.max(...values)*1.05,rng=mx-mn||1;
  const x=i=>p.left+i/(labels.length-1||1)*cw, y=v=>p.top+ch-(v-mn)/rng*ch;
  ctx.beginPath();ctx.moveTo(x(0),y(values[0]));values.forEach((v,i)=>ctx.lineTo(x(i),y(v)));
  ctx.lineTo(x(labels.length-1),p.top+ch);ctx.lineTo(x(0),p.top+ch);ctx.closePath();
  ctx.fillStyle=fillColor;ctx.fill();
  ctx.beginPath();ctx.moveTo(x(0),y(values[0]));values.forEach((v,i)=>ctx.lineTo(x(i),y(v)));
  ctx.strokeStyle=lineColor;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();
  values.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),3.5,0,Math.PI*2);ctx.fillStyle=lineColor;ctx.fill();});
  ctx.fillStyle='rgba(160,180,224,0.8)';ctx.font='10px Exo 2,sans-serif';ctx.textAlign='center';
  const step=Math.max(1,Math.floor(labels.length/4));
  labels.forEach((l,i)=>{if(i===0||i===labels.length-1||i%step===0)ctx.fillText(l.slice(-5),x(i),H-8);});
  ctx.textAlign='right';[0,.5,1].forEach(t=>{const v=mn+rng*t;ctx.fillStyle='rgba(160,180,224,0.8)';ctx.fillText(Math.round(v)+unit,p.left-4,y(v)+4);});
  ctx.fillStyle='rgba(160,180,224,0.6)';ctx.font='11px Rajdhani,sans-serif';ctx.textAlign='left';ctx.fillText(title,p.left,16);
}
function drawBarChart(canvas,labels,values,title,barColor){
  const dpr=window.devicePixelRatio||1,W=canvas.offsetWidth||340,H=160;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
  const p={top:24,right:10,bottom:28,left:34};
  const cw=W-p.left-p.right,ch=H-p.top-p.bottom,mx=Math.max(...values,1);
  const bw=cw/labels.length*0.6,gap=cw/labels.length;
  values.forEach((v,i)=>{
    const bx=p.left+i*gap+(gap-bw)/2,bh=v/mx*ch,by=p.top+ch-bh;
    ctx.fillStyle=barColor+'99';ctx.beginPath();
    ctx.roundRect?ctx.roundRect(bx,by,bw,bh,4):ctx.rect(bx,by,bw,bh);
    ctx.fill();ctx.strokeStyle=barColor;ctx.lineWidth=1.5;ctx.stroke();
    if(v>0){ctx.fillStyle='rgba(190,255,137,0.9)';ctx.font='10px Exo 2,sans-serif';ctx.textAlign='center';ctx.fillText(v,bx+bw/2,by-4);}
  });
  ctx.fillStyle='rgba(160,180,224,0.7)';ctx.font='10px Exo 2,sans-serif';ctx.textAlign='center';
  labels.forEach((l,i)=>ctx.fillText(l,p.left+i*gap+gap/2,H-6));
  ctx.fillStyle='rgba(160,180,224,0.6)';ctx.font='11px Rajdhani,sans-serif';ctx.textAlign='left';ctx.fillText(title,p.left,15);
}

// ── LUNG WIDGET — bouncing screensaver + drag + pinch-scale ────
(function(){
  const el = document.getElementById('lung-widget');
  if (!el) return;

  // ── CONSTANTS ──
  const BASE_SPEED   = 0.55;   // px/frame cruise speed
  const MAX_THROW    = 18;     // px/frame max throw speed
  const FRICTION     = 0.96;   // speed decay per frame after throw
  const BREATH_PERIOD = 4200;  // ms for one full breath cycle (inhale + exhale)
  const BREATH_MIN   = 1.0;    // minimum scale multiplier
  const BREATH_MAX   = 1.28;   // maximum scale multiplier (28% bigger)

  // ── STATE ──
  let posX, posY;
  let velX = BASE_SPEED * 0.8;
  let velY = BASE_SPEED * 0.6;
  let userScale = 1;   // set by pinch/wheel
  let rafId = null;
  let bouncing = false;

  // Drag
  let isDragging = false;
  let dragStartX, dragStartY, elStartX, elStartY;
  let prevDragX, prevDragY, prevDragT;   // for momentum
  let throwVelX = 0, throwVelY = 0;

  // Pinch
  let lastPinchDist = null;
  let pinching = false;

  // Breathing
  let breathStart = null;

  function getBreathScale(now) {
    if (!breathStart) breathStart = now;
    const t = ((now - breathStart) % BREATH_PERIOD) / BREATH_PERIOD; // 0..1
    // Smooth sine: 0 = exhale (small), 0.5 = inhale (big)
    const s = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2; // 0..1
    return BREATH_MIN + s * (BREATH_MAX - BREATH_MIN);
  }

  function getRadius() { return 18 * userScale; }

  function applyTransform(breathScale) {
    el.style.left = posX + 'px';
    el.style.top  = posY + 'px';
    el.style.transform = `translate(-50%,-50%) scale(${userScale * (breathScale||1)})`;
  }

  // ── BOUNCE + BREATH LOOP ──
  function bounceLoop(now) {
    if (!bouncing) return;

    const breath = getBreathScale(now);

    if (!isDragging && !pinching) {
      const r    = getRadius();
      const maxX = window.innerWidth  - r;
      const maxY = window.innerHeight - r;
      const minX = r;
      const minY = r;

      // If throw momentum still active, decay toward BASE_SPEED direction
      const speed = Math.sqrt(velX*velX + velY*velY);
      if (speed > BASE_SPEED + 0.05) {
        // Friction decay
        velX *= FRICTION;
        velY *= FRICTION;
        // Clamp to avoid completely stopping
        const s2 = Math.sqrt(velX*velX + velY*velY);
        if (s2 < BASE_SPEED) {
          const norm = BASE_SPEED / s2;
          velX *= norm; velY *= norm;
        }
      }

      posX += velX;
      posY += velY;

      if (posX >= maxX) { posX = maxX; velX = -Math.abs(velX); }
      if (posX <= minX) { posX = minX; velX =  Math.abs(velX); }
      if (posY >= maxY) { posY = maxY; velY = -Math.abs(velY); }
      if (posY <= minY) { posY = minY; velY =  Math.abs(velY); }
    }

    applyTransform(breath);
    rafId = requestAnimationFrame(bounceLoop);
  }

  function startBounce() {
    if (bouncing) return;
    bouncing = true;
    breathStart = null;
    requestAnimationFrame(t => { breathStart = t; bounceLoop(t); });
  }
  function stopBounce() {
    bouncing = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // ── DRAG ──
  el.addEventListener('mousedown',  onDragStart, {passive:false});
  el.addEventListener('touchstart', onDragStart, {passive:false});

  function onDragStart(e) {
    if (e.touches && e.touches.length === 2) return;
    isDragging = true;
    throwVelX = throwVelY = 0;
    const t = e.touches ? e.touches[0] : e;
    dragStartX = t.clientX; dragStartY = t.clientY;
    elStartX   = posX;      elStartY   = posY;
    prevDragX  = t.clientX; prevDragY  = t.clientY;
    prevDragT  = performance.now();
    e.preventDefault(); e.stopPropagation();
  }

  document.addEventListener('mousemove', onMove, {passive:false});
  document.addEventListener('touchmove',  onMove, {passive:false});

  function onMove(e) {
    // Pinch
    if (e.touches && e.touches.length === 2) {
      pinching = true;
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (lastPinchDist !== null) {
        const ratio = dist / lastPinchDist;
        userScale = Math.max(0.3, Math.min(8, userScale * ratio));
      }
      lastPinchDist = dist;
      if (e.cancelable) e.preventDefault();
      return;
    }
    if (!isDragging) return;
    const t  = e.touches ? e.touches[0] : e;
    const now = performance.now();
    const dt  = Math.max(1, now - prevDragT);

    // Track velocity for throw (px/ms → px/frame @60fps)
    throwVelX = ((t.clientX - prevDragX) / dt) * 16.67;
    throwVelY = ((t.clientY - prevDragY) / dt) * 16.67;

    prevDragX = t.clientX; prevDragY = t.clientY; prevDragT = now;

    posX = elStartX + (t.clientX - dragStartX);
    posY = elStartY + (t.clientY - dragStartY);
    if (e.cancelable) e.preventDefault();
  }

  document.addEventListener('mouseup',  onEnd);
  document.addEventListener('touchend', onEnd);

  function onEnd(e) {
    if (e.type === 'touchend' && (!e.touches || e.touches.length === 0)) {
      lastPinchDist = null; pinching = false;
    }
    if (isDragging) {
      isDragging = false;
      // Apply throw momentum, clamped to MAX_THROW
      const throwSpeed = Math.sqrt(throwVelX*throwVelX + throwVelY*throwVelY);
      if (throwSpeed > 0.3) {
        const clamped = Math.min(throwSpeed, MAX_THROW);
        const norm    = clamped / throwSpeed;
        velX = throwVelX * norm;
        velY = throwVelY * norm;
      }
      // Friction will decay it back to BASE_SPEED naturally in bounceLoop
    }
  }

  // Mouse wheel scale
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    userScale = Math.max(0.3, Math.min(8, userScale + (e.deltaY < 0 ? 0.12 : -0.12)));
  }, {passive:false});

  // ── SHOW / HIDE ──
  function showLung() {
    posX = window.innerWidth  * 0.5 + (Math.random()-0.5) * 60;
    posY = window.innerHeight * 0.72;
    const angle = (Math.PI * 0.2) + Math.random() * (Math.PI * 0.6);
    velX = Math.cos(angle) * BASE_SPEED * (Math.random() > 0.5 ? 1 : -1);
    velY = -Math.abs(Math.sin(angle) * BASE_SPEED);
    el.style.display = 'block';
    startBounce();
  }
  function hideLung() {
    el.style.display = 'none';
    stopBounce();
  }

  const origStart    = window.startRestTimer;
  const origSkip     = window.skipRest;
  const origCollapse = window.collapseRestToWidget;

  window.startRestTimer       = function(s) { origStart(s);    showLung(); };
  window.skipRest             = function()  { origSkip();      hideLung(); };
  window.collapseRestToWidget = function()  { origCollapse();  hideLung(); };
})();

// ── SETTINGS ──────────────────────────────────
function clearHistory() {
  if(confirm('Clear all workout history? This cannot be undone.')){
    state.history=[]; state.streak=0; state.weekSessions={};
    document.getElementById('streak-count').textContent='0';
    save(); renderHistory(); buildHomeDayCards();
  }
}
function exportData() {
  const obj={history:state.history,streak:state.streak,weekKey:state.currentWeekKey,
    weekSessions:state.weekSessions,ytLinks:state.ytLinks||{},bodyStats:state.bodyStats||[]};
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download=`gymdolph-export-${todayStr()}.json`;a.click();URL.revokeObjectURL(url);
}
function importData() { document.getElementById('import-file-input').click(); }
function handleImportFile(e) {
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
    try{
      const data=JSON.parse(ev.target.result);
      if(Array.isArray(data)){
        if(!confirm(`Import ${data.length} session(s)? Replaces current data.`)) return;
        state.history=data;
      }else{
        if(!confirm(`Import ${(data.history||[]).length} session(s)? Replaces current data.`)) return;
        state.history=data.history||[]; state.streak=data.streak||0;
        state.weekSessions=data.weekSessions||{};
        state.ytLinks=data.ytLinks||{};
        state.bodyStats=data.bodyStats||[];
        if(data.weekKey) state.currentWeekKey=data.weekKey;
      }
      document.getElementById('streak-count').textContent=state.streak;
      save(); renderHistory(); buildHomeDayCards();
      alert('Import successful!');
    }catch(err){alert('Import failed: invalid JSON file.');}
    e.target.value='';
  };
  reader.readAsText(file);
}