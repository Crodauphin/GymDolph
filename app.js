/* ═══════════════════════════════════════════
   GYM DOLPH v0.4 — APP LOGIC
═══════════════════════════════════════════ */

let state = {
  currentView: 'home',
  activeDay: 0,
  workoutDay: null,
  workoutChecks: {}, setLogs: {}, cardioChecks: {},
  timerInterval: null, timerSeconds: 0, timerRunning: false,
  restInterval: null, restTotal: 60, restRemaining: 0,
  modalTarget: null,
  history: [], streak: 0,
  currentWeekKey: null, weekSessions: {},
  modifyTarget: null,
  calYear: 0, calMonth: 0,
};
const MAX_SECS = 90 * 60;

// ── WEEK KEY ─────────────────────────────
function getWeekKey(d) {
  d = d || new Date();
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const sow  = new Date(jan4);
  sow.setDate(jan4.getDate() - ((jan4.getDay()+6)%7));
  const wk = Math.floor((d - sow)/(7*86400000)) + 1;
  return `${d.getFullYear()}-W${String(wk).padStart(2,'0')}`;
}

// ── STORAGE ──────────────────────────────
function save() {
  localStorage.setItem('gymdolph_history',      JSON.stringify(state.history));
  localStorage.setItem('gymdolph_streak',       state.streak);
  localStorage.setItem('gymdolph_weekKey',      state.currentWeekKey);
  localStorage.setItem('gymdolph_weekSessions', JSON.stringify(state.weekSessions));
}
function load() {
  try {
    state.history  = JSON.parse(localStorage.getItem('gymdolph_history')  || '[]');
    state.streak   = parseInt(localStorage.getItem('gymdolph_streak')     || '0');
    const savedWk  = localStorage.getItem('gymdolph_weekKey') || '';
    const thisWk   = getWeekKey();
    state.currentWeekKey = thisWk;
    if (savedWk === thisWk) {
      state.weekSessions = JSON.parse(localStorage.getItem('gymdolph_weekSessions') || '{}');
    } else {
      state.weekSessions = {};
      save();
    }
  } catch(e) { state.weekSessions = {}; state.currentWeekKey = getWeekKey(); }
}

// ── INIT ─────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  load();
  registerSW();
  buildHomeDayCards();
  updateBannerDate();
  document.getElementById('streak-count').textContent = state.streak;
  const now = new Date();
  state.calYear = now.getFullYear(); state.calMonth = now.getMonth();
  ['modify-modal','set-modal','info-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) this.style.display = 'none';
    });
  });
  setTimeout(() => {
    document.getElementById('splash').classList.add('fade-out');
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
    }, 500);
  }, 1800);
});
function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// ── UTILS ─────────────────────────────────
function getActiveDay() { return state.activeDay; }
function pad2(n) { return String(n).padStart(2,'0'); }
function formatDuration(s) { return `${Math.floor(s/60)}m ${pad2(s%60)}s`; }
function todayStr() { return new Date().toISOString().slice(0,10); }
function updateBannerDate() {
  document.getElementById('banner-date').textContent =
    new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
}

// ── VIEW SWITCHING ────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  state.currentView = name;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const nb = document.getElementById('nav-'+name);
  if (nb) nb.classList.add('active');
  if (name === 'history')  renderHistory();
  if (name === 'home')     buildHomeDayCards();
  if (name === 'calendar') renderCalendar();
  if (name === 'stats')    renderStats();
}

// ── HOME ──────────────────────────────────
function buildHomeDayCards() {
  const container = document.getElementById('day-cards');
  container.innerHTML = '';
  PROGRAM.forEach((day, idx) => {
    const sess    = state.weekSessions[day.id];
    const isDone  = !!sess;
    const isActive= idx === state.activeDay;
    let extra = '';
    if (day.type==='rest')       extra=' rest-day';
    if (day.type==='stretch')    extra=' special-day';
    if (day.type==='cardio_day') extra=' special-day';
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
      state.activeDay = idx; save();
      isDone ? reopenSession(day, sess) : startWorkout(idx);
    });
    container.appendChild(card);
  });
}
function blockSummary(day) {
  if (day.type==='rest')        return 'Full rest — recovery & sleep';
  if (day.type==='stretch')     return '60 min · no mat or props needed';
  if (day.type==='cardio_day')  return '60 min · 3 cardio blocks';
  const wu = day.blocks.find(b=>b.type==='warmup');
  const cd = day.blocks.find(b=>b.type==='cardio');
  const lt = day.blocks.filter(b=>b.type!=='warmup'&&b.type!=='cardio');
  return `Warm-up ${wu?wu.duration:'—'} · Lifting ${lt.reduce((a,b)=>a+parseInt(b.duration),0)} min · Cardio ${cd?cd.duration:'—'}`;
}

// ── START WORKOUT ─────────────────────────
function startWorkout(dayIndex) {
  const day = PROGRAM[dayIndex];
  if (!day) return;
  if (day.type==='rest') { renderRestDayView(day); showView('workout'); return; }
  state.workoutDay    = day;
  state.workoutChecks = {}; state.setLogs = {}; state.cardioChecks = {};
  state.timerSeconds  = 0;  state.timerRunning = false;
  document.getElementById('wd-day-label').textContent  = day.id;
  document.getElementById('wd-focus').textContent      = day.name;
  document.getElementById('timer-display').textContent = '00:00';
  document.getElementById('timer-sub').textContent     = '';
  document.getElementById('timer-toggle').textContent  = '▶';
  if (day.type==='stretch') { renderStretchView(day); }
  else                      { renderWorkoutBlocks(day); }
  updateProgress(); showView('workout'); setTimeout(startTimer, 400);
}

// ── REOPEN SESSION ────────────────────────
function reopenSession(day, sess) {
  if (day.type==='rest') { renderRestDayView(day); showView('workout'); return; }
  state.workoutDay    = day;
  state.workoutChecks = JSON.parse(JSON.stringify(sess.checks       || {}));
  state.setLogs       = JSON.parse(JSON.stringify(sess.setLogs      || {}));
  state.cardioChecks  = JSON.parse(JSON.stringify(sess.cardioChecks || {}));
  state.timerSeconds  = sess.duration || 0;
  state.timerRunning  = false;
  document.getElementById('wd-day-label').textContent  = day.id;
  document.getElementById('wd-focus').textContent      = day.name + ' ✏';
  document.getElementById('timer-display').textContent =
    `${pad2(Math.floor(state.timerSeconds/60))}:${pad2(state.timerSeconds%60)}`;
  document.getElementById('timer-sub').textContent     = '';
  document.getElementById('timer-toggle').textContent  = '▶';
  if (day.type==='stretch') { renderStretchView(day); }
  else                      { renderWorkoutBlocks(day); }
  setTimeout(() => {
    Object.entries(state.workoutChecks).forEach(([id,chk]) => {
      const el = document.getElementById('excheck-'+id);
      if (el&&chk) { el.classList.add('checked'); el.textContent='✓'; }
    });
    Object.entries(state.cardioChecks).forEach(([id,chk]) => {
      const el = document.getElementById('cardiocheck-'+id);
      if (el&&chk) { el.classList.add('checked'); el.textContent='✓'; }
    });
    Object.entries(state.setLogs).forEach(([exId,sets]) => {
      sets.forEach((s,i) => {
        const chip = document.getElementById(`setchip-${exId}-${i}`);
        if (chip&&s) { chip.classList.add('logged'); chip.textContent=`${s.weight}kg × ${s.reps}`; }
      });
    });
    updateProgress();
  }, 60);
  showView('workout');
}

// ── REST DAY ──────────────────────────────
function renderRestDayView(day) {
  document.getElementById('wd-day-label').textContent  = day.id;
  document.getElementById('wd-focus').textContent      = day.name;
  document.getElementById('timer-display').textContent = '';
  document.getElementById('timer-sub').textContent     = '';
  document.getElementById('workout-blocks').innerHTML  = `
    <div class="rest-day-view">
      <div class="rest-day-emojis"><span>😴</span><span>💤</span><span>🛌</span><span>💤</span><span>😴</span></div>
      <div class="rest-day-title">FULL REST DAY</div>
      <div class="rest-day-sub">Your muscles grow during recovery.<br>Sleep well · eat well · hydrate.</div>
    </div>`;
  document.getElementById('workout-progress-bar').style.width = '100%';
  document.getElementById('progress-label').textContent = 'Rest day';
}

// ── STRETCH VIEW ──────────────────────────
function renderStretchView(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';
  day.stretchPhases.forEach(phase => {
    const block = document.createElement('div');
    block.className = 'stretch-block';
    let html = '';
    phase.moves.forEach(m => {
      const chk = state.workoutChecks[m.id];
      html += `
        <div class="stretch-row">
          <div class="ex-check ${chk?'checked':''}" id="excheck-${m.id}"
            onclick="toggleExercise('${m.id}',this)">${chk?'✓':''}</div>
          <div class="stretch-info">
            <div class="stretch-name">${m.name}</div>
            <div class="stretch-detail">${m.detail}</div>
            ${m.note?`<div class="stretch-note">${m.note}</div>`:''}
          </div>
        </div>`;
    });
    block.innerHTML = `
      <div class="stretch-block-header">
        <span class="block-icon">${phase.icon}</span>
        <span class="stretch-block-title">${phase.title}</span>
        <span class="block-duration">${phase.duration}</span>
      </div>${html}`;
    container.appendChild(block);
  });
  updateProgress();
}

// ── WORKOUT BLOCKS ────────────────────────
function renderWorkoutBlocks(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';
  day.blocks.forEach(block => {
    const blockEl = document.createElement('div');
    blockEl.className = 'workout-block'; blockEl.id = 'block-'+block.id;
    let exHTML = '';
    if (block.type==='cardio') {
      block.exercises.forEach(ex => {
        const info = getExInfo(ex.name);
        exHTML += `
          <div class="cardio-row">
            <div class="cardio-check" id="cardiocheck-${ex.id}" onclick="toggleCardio('${ex.id}',this)"></div>
            <div style="flex:1">
              <div class="cardio-label">${ex.name}</div>
              <div class="cardio-sub">${ex.prescription}</div>
              ${ex.note?`<div class="cardio-sub" style="color:var(--pink2);font-style:italic">${ex.note}</div>`:''}
            </div>
            ${info?`<button class="ex-info-btn" onclick="openInfoModal('${escQ(ex.name)}')">ⓘ</button>`:''}
          </div>`;
      });
    } else {
      block.exercises.forEach(ex => {
        let chips = '';
        if (block.type!=='warmup') {
          for (let s=0;s<ex.sets;s++) {
            chips += `<div class="set-chip" id="setchip-${ex.id}-${s}"
              onclick="openSetModal('${day.id}','${block.id}','${ex.id}',${s})">Set ${s+1}</div>`;
          }
        }
        const info = getExInfo(ex.name);
        exHTML += `
          <div class="exercise-row" id="exrow-${ex.id}">
            <div class="ex-check" id="excheck-${ex.id}" onclick="toggleExercise('${ex.id}',this)"></div>
            <div class="ex-info">
              <div class="ex-name-row">
                <span class="ex-name">${ex.name}</span>
                ${info?`<button class="ex-info-btn" onclick="openInfoModal('${escQ(ex.name)}')">ⓘ</button>`:''}
              </div>
              <div class="ex-prescription">${ex.prescription}</div>
              ${ex.note?`<div class="ex-prescription" style="color:var(--pink2);font-style:italic">⚠ ${ex.note}</div>`:''}
              ${chips?`<div class="ex-sets">${chips}</div>`:''}
            </div>
          </div>`;
      });
    }
    blockEl.innerHTML = `
      <div class="block-header">
        <span class="block-icon">${block.icon}</span>
        <span class="block-title">${block.title}</span>
        <span class="block-duration">${block.duration}</span>
      </div>${exHTML}`;
    container.appendChild(blockEl);
  });
}
function escQ(s) { return s.replace(/'/g,"\\'"); }
function getExInfo(name) {
  return EX_INFO[name.toLowerCase().trim()] || null;
}

// ── EXERCISE INFO MODAL ───────────────────
function openInfoModal(name) {
  const info = getExInfo(name);
  if (!info) return;
  document.getElementById('info-modal-title').textContent = name;
  document.getElementById('info-muscles').textContent = '💪 ' + info.muscles;
  document.getElementById('info-cues').innerHTML =
    info.cues.map(c=>`<div class="info-cue-row">• ${c}</div>`).join('');
  const noteEl = document.getElementById('info-note');
  noteEl.textContent = info.note || '';
  noteEl.style.display = info.note ? 'block' : 'none';
  const ytEl = document.getElementById('info-yt-link');
  ytEl.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(info.yt)}`;
  document.getElementById('info-modal').style.display = 'flex';
}
function closeInfoModal() {
  document.getElementById('info-modal').style.display = 'none';
}

// ── TOGGLE ────────────────────────────────
function toggleExercise(exId, el) {
  state.workoutChecks[exId] = !state.workoutChecks[exId];
  el.classList.toggle('checked', state.workoutChecks[exId]);
  el.textContent = state.workoutChecks[exId] ? '✓' : '';
  updateProgress();
}
function toggleCardio(exId, el) {
  state.cardioChecks[exId] = !state.cardioChecks[exId];
  el.classList.toggle('checked', state.cardioChecks[exId]);
  el.textContent = state.cardioChecks[exId] ? '✓' : '';
  updateProgress();
}

// ── SET MODAL ─────────────────────────────
function openSetModal(dayId, blockId, exId, setIndex) {
  state.modalTarget = {dayId, blockId, exId, setIndex};
  const block = state.workoutDay.blocks.find(b=>b.id===blockId);
  const ex    = block.exercises.find(e=>e.id===exId);
  document.getElementById('modal-ex-name').textContent = `${ex.name} — Set ${setIndex+1}`;
  const prev = (state.setLogs[exId]||[])[setIndex];
  document.getElementById('modal-weight').value = prev?prev.weight:'';
  document.getElementById('modal-reps').value   = prev?prev.reps:ex.reps;
  document.getElementById('set-modal').style.display = 'flex';
  setTimeout(()=>document.getElementById('modal-weight').focus(),100);
}
function closeModal() {
  document.getElementById('set-modal').style.display='none'; state.modalTarget=null;
}
function confirmSet() {
  const {exId,setIndex} = state.modalTarget;
  const weight = parseFloat(document.getElementById('modal-weight').value)||0;
  const reps   = parseInt(document.getElementById('modal-reps').value)||0;
  if (!state.setLogs[exId]) state.setLogs[exId]=[];
  state.setLogs[exId][setIndex] = {weight,reps};
  const chip = document.getElementById(`setchip-${exId}-${setIndex}`);
  if (chip) { chip.classList.add('logged'); chip.textContent=`${weight}kg × ${reps}`; }
  closeModal(); startRestTimer(60); updateProgress();
}

// ── PROGRESS BAR ──────────────────────────
function updateProgress() {
  if (!state.workoutDay) return;
  let total=0, done=0;
  if (state.workoutDay.type==='stretch') {
    state.workoutDay.stretchPhases.forEach(p=>p.moves.forEach(m=>{
      total++; if(state.workoutChecks[m.id]) done++;
    }));
  } else {
    state.workoutDay.blocks.forEach(b=>b.exercises.forEach(ex=>{
      total++;
      if(b.type==='cardio'){if(state.cardioChecks[ex.id])done++;}
      else{if(state.workoutChecks[ex.id])done++;}
    }));
  }
  const pct = total>0?(done/total*100):0;
  document.getElementById('workout-progress-bar').style.width = pct+'%';
  document.getElementById('progress-label').textContent = `${done} / ${total} done`;
}

// ── TIMER ─────────────────────────────────
function toggleTimer() { state.timerRunning ? pauseTimer() : startTimer(); }
function startTimer() {
  if (state.timerRunning) return;
  state.timerRunning = true;
  document.getElementById('timer-toggle').textContent = '⏸';
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    const m=Math.floor(state.timerSeconds/60), s=state.timerSeconds%60;
    document.getElementById('timer-display').textContent=`${pad2(m)}:${pad2(s)}`;
    const sub=document.getElementById('timer-sub');
    if(state.timerSeconds>=MAX_SECS){sub.textContent='🛑 90 MIN LIMIT';sub.style.color='var(--pink)';}
    else if(state.timerSeconds>=MAX_SECS-300){sub.textContent='⚠ 5 min left';sub.style.color='var(--pink2)';}
    else{sub.textContent='';}
  },1000);
}
function pauseTimer() {
  state.timerRunning=false;
  document.getElementById('timer-toggle').textContent='▶';
  clearInterval(state.timerInterval);
}
function resetTimer() {
  pauseTimer(); state.timerSeconds=0;
  document.getElementById('timer-display').textContent='00:00';
  document.getElementById('timer-sub').textContent='';
}

// ── REST TIMER ────────────────────────────
function startRestTimer(s) {
  state.restTotal=s; state.restRemaining=s;
  const ov=document.getElementById('rest-overlay');
  const cd=document.getElementById('rest-countdown');
  const rg=document.getElementById('ring-fg');
  ov.style.display='flex'; cd.textContent=s; rg.style.strokeDashoffset=0;
  clearInterval(state.restInterval);
  state.restInterval=setInterval(()=>{
    state.restRemaining--;
    cd.textContent=state.restRemaining;
    rg.style.strokeDashoffset=276.46*(1-state.restRemaining/state.restTotal);
    if(state.restRemaining<=0) skipRest();
  },1000);
}
function skipRest() {
  clearInterval(state.restInterval);
  document.getElementById('rest-overlay').style.display='none';
}

// ── FINISH WORKOUT ────────────────────────
function finishWorkout() {
  pauseTimer();
  const day = state.workoutDay;
  if (!day) { showView('home'); return; }
  let exercises=[];
  if (day.type==='stretch') {
    day.stretchPhases.forEach(p=>p.moves.forEach(m=>{
      exercises.push({id:m.id,name:m.name,checked:!!state.workoutChecks[m.id],weight:''});
    }));
  } else {
    day.blocks.forEach(b=>b.exercises.forEach(ex=>{
      const isC=b.type==='cardio';
      const chk=isC?!!state.cardioChecks[ex.id]:!!state.workoutChecks[ex.id];
      const sets=state.setLogs[ex.id]||[];
      exercises.push({id:ex.id,name:ex.name,checked:chk,
        weight:sets.length?sets.map(s=>`${s.weight}kg×${s.reps}`).join(', '):'',
        setLogs:sets});
    }));
  }
  const duration=state.timerSeconds;
  state.weekSessions[day.id]={
    checks:JSON.parse(JSON.stringify(state.workoutChecks)),
    setLogs:JSON.parse(JSON.stringify(state.setLogs)),
    cardioChecks:JSON.parse(JSON.stringify(state.cardioChecks)),
    exercises, duration
  };
  const existing=state.history.findIndex(h=>h.dayId===day.id&&h.weekKey===state.currentWeekKey);
  const record={
    id:        existing>=0?state.history[existing].id:Date.now(),
    dayId:     day.id, dayName:day.name,
    date:      todayStr(), weekKey:state.currentWeekKey,
    dateStr:   new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}),
    duration,  durationStr:formatDuration(duration),
    setLogs:   JSON.parse(JSON.stringify(state.setLogs)),
    checks:    JSON.parse(JSON.stringify(state.workoutChecks)),
    exercises,
  };
  if(existing>=0) state.history[existing]=record; else state.history.unshift(record);
  const today=todayStr();
  const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
  const lastDates=[...new Set(state.history.map(h=>h.date))].sort().reverse();
  if(lastDates[0]===today&&(lastDates[1]===yesterday||state.streak===0))
    if(state.history.filter(h=>h.date===today).length===1) state.streak++;
  save(); buildHomeDayCards(); showView('home');
  document.getElementById('streak-count').textContent=state.streak;
}

// ── HISTORY ───────────────────────────────
function renderHistory() {
  const c=document.getElementById('history-list'); c.innerHTML='';
  if(!state.history.length){
    c.innerHTML=`<div class="history-empty">No workouts recorded yet.<br>Complete your first session!</div>`;
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
      <div class="hc-focus">${done} exercises · ${sets} sets logged</div>
      <div class="hc-duration">⏱ ${h.durationStr}</div>
      <div class="hc-actions">
        <button class="hc-modify-btn" onclick="openModifyModal(${h.id})">✏ Modify</button>
      </div>`;
    c.appendChild(card);
  });
}

// ── MODIFY MODAL ──────────────────────────
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
        value="${ex.weight||''}" placeholder="kg/notes" />`;
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
  if(r&&r.exercises){
    r.exercises.forEach((ex,idx)=>{ const w=document.getElementById(`mweight-${idx}`); if(w) ex.weight=w.value; });
    const nc={}; r.exercises.forEach(ex=>{ nc[ex.id]=ex.checked; }); r.checks=nc;
    if(r.weekKey===state.currentWeekKey&&state.weekSessions[r.dayId]){
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

// ═══════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════
function calPrev() { state.calMonth--; if(state.calMonth<0){state.calMonth=11;state.calYear--;} renderCalendar(); }
function calNext() { state.calMonth++; if(state.calMonth>11){state.calMonth=0;state.calYear++;} renderCalendar(); }

function renderCalendar() {
  const yr=state.calYear, mo=state.calMonth;
  document.getElementById('cal-month-label').textContent =
    new Date(yr,mo,1).toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase();
  document.getElementById('cal-streak-num').textContent = state.streak;

  const grid=document.getElementById('cal-grid'); grid.innerHTML='';
  // Day headers
  ['M','T','W','T','F','S','S'].forEach(d=>{
    const h=document.createElement('div'); h.className='cal-day-hdr'; h.textContent=d;
    grid.appendChild(h);
  });

  // Build set of dates with sessions
  const sessionDates={};
  state.history.forEach(h=>{
    sessionDates[h.date] = sessionDates[h.date] || [];
    sessionDates[h.date].push(h.dayId);
  });

  // First day of month (0=Sun)
  const firstDow = new Date(yr,mo,1).getDay(); // 0=Sun
  const startOffset = firstDow===0 ? 6 : firstDow-1; // Monday-based
  const daysInMonth = new Date(yr,mo+1,0).getDate();
  const today = todayStr();

  // Empty cells before
  for(let i=0;i<startOffset;i++){
    const e=document.createElement('div'); e.className='cal-cell empty'; grid.appendChild(e);
  }

  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${yr}-${pad2(mo+1)}-${pad2(d)}`;
    const cell=document.createElement('div');
    cell.className='cal-cell';
    const days=sessionDates[dateStr]||[];
    let dotColor='';
    if(days.length){
      // Determine colour by day type
      const dayTypes=days.map(id=>{const p=PROGRAM.find(p=>p.id===id); return p?p.type:'';});
      if(dayTypes.includes('training'))         dotColor='var(--green)';
      else if(dayTypes.some(t=>t==='cardio_day'||t==='stretch')) dotColor='var(--pink)';
      else                                       dotColor='var(--header)';
    }
    cell.innerHTML=`
      <div class="cal-day-num ${dateStr===today?'cal-today':''}">${d}</div>
      ${dotColor?`<div class="cal-dot" style="background:${dotColor}"></div>`:'<div class="cal-dot-empty"></div>'}`;
    grid.appendChild(cell);
  }
  // Tail empty cells to complete last row
  const total=startOffset+daysInMonth;
  const tail=(7-total%7)%7;
  for(let i=0;i<tail;i++){
    const e=document.createElement('div'); e.className='cal-cell empty'; grid.appendChild(e);
  }
}

// ═══════════════════════════════════════════
//  PROGRESS / STATS
// ═══════════════════════════════════════════
function renderStats() {
  // Populate exercise picker with exercises that have weight data
  const picker=document.getElementById('stats-exercise-picker');
  const exerciseNames=new Set();
  state.history.forEach(h=>{
    (h.exercises||[]).forEach(ex=>{
      if(ex.setLogs&&ex.setLogs.some(s=>s.weight>0)) exerciseNames.add(ex.name);
    });
  });
  picker.innerHTML='';
  if(exerciseNames.size===0){
    picker.innerHTML='<option>No data yet — log some sets!</option>';
  } else {
    [...exerciseNames].sort().forEach(name=>{
      const o=document.createElement('option'); o.value=name; o.textContent=name; picker.appendChild(o);
    });
  }
  renderProgressChart();
  renderVolumeChart();
}

function renderProgressChart() {
  const picker=document.getElementById('stats-exercise-picker');
  const name=picker.value;
  const canvas=document.getElementById('stats-canvas');
  const empty=document.getElementById('stats-empty');
  if(!name||name.startsWith('No data')){
    canvas.style.display='none'; empty.style.display='block'; return;
  }
  // Collect max weight per session date for this exercise
  const points=[];
  [...state.history].reverse().forEach(h=>{
    (h.exercises||[]).forEach(ex=>{
      if(ex.name===name&&ex.setLogs&&ex.setLogs.length){
        const maxW=Math.max(...ex.setLogs.filter(s=>s).map(s=>s.weight||0));
        if(maxW>0) points.push({date:h.date,w:maxW});
      }
    });
  });
  if(!points.length){ canvas.style.display='none'; empty.style.display='block'; return; }
  empty.style.display='none'; canvas.style.display='block';
  drawLineChart(canvas, points.map(p=>p.date), points.map(p=>p.w),
    name, 'kg', '#77FD01', 'rgba(119,253,1,0.15)');
}

function renderVolumeChart() {
  const canvas=document.getElementById('volume-canvas');
  // Count total sets per week for last 8 weeks
  const weeks=[];
  for(let i=7;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i*7);
    weeks.push(getWeekKey(d));
  }
  const labels=weeks.map(w=>w.replace(/.*-W/,'W'));
  const values=weeks.map(wk=>{
    return state.history.filter(h=>h.weekKey===wk)
      .reduce((a,h)=>a+Object.values(h.setLogs||{}).reduce((b,s)=>b+s.length,0),0);
  });
  drawBarChart(canvas, labels, values, 'Sets per week', '#EB47CE');
}

// ── CANVAS CHARTS ─────────────────────────
function drawLineChart(canvas, labels, values, title, unit, lineColor, fillColor) {
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || canvas.parentElement.offsetWidth || 340;
  const H = 180;
  canvas.width  = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  const ctx = canvas.getContext('2d'); ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);

  const pad={top:28,right:16,bottom:36,left:40};
  const cw=W-pad.left-pad.right, ch=H-pad.top-pad.bottom;
  const minV=Math.min(...values)*0.9, maxV=Math.max(...values)*1.05;
  const range=maxV-minV||1;

  const x=(i)=>pad.left+i/(labels.length-1||1)*cw;
  const y=(v)=>pad.top+ch-(v-minV)/range*ch;

  // Fill
  ctx.beginPath(); ctx.moveTo(x(0),y(values[0]));
  values.forEach((v,i)=>ctx.lineTo(x(i),y(v)));
  ctx.lineTo(x(labels.length-1),pad.top+ch);
  ctx.lineTo(x(0),pad.top+ch); ctx.closePath();
  ctx.fillStyle=fillColor; ctx.fill();

  // Line
  ctx.beginPath(); ctx.moveTo(x(0),y(values[0]));
  values.forEach((v,i)=>ctx.lineTo(x(i),y(v)));
  ctx.strokeStyle=lineColor; ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();

  // Dots
  values.forEach((v,i)=>{
    ctx.beginPath(); ctx.arc(x(i),y(v),3.5,0,Math.PI*2);
    ctx.fillStyle=lineColor; ctx.fill();
  });

  // X labels (show first, last, and a couple mid)
  ctx.fillStyle='rgba(160,180,224,0.8)'; ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='center';
  const step=Math.max(1,Math.floor(labels.length/4));
  labels.forEach((l,i)=>{
    if(i===0||i===labels.length-1||i%step===0)
      ctx.fillText(l.slice(-5),x(i),H-8);
  });

  // Y labels
  ctx.textAlign='right';
  [0,0.5,1].forEach(t=>{
    const v=minV+range*t;
    ctx.fillText(Math.round(v)+unit, pad.left-4, y(v)+4);
  });

  // Title
  ctx.fillStyle='rgba(160,180,224,0.6)'; ctx.font='11px Rajdhani,sans-serif';
  ctx.textAlign='left'; ctx.fillText(title,pad.left,16);
}

function drawBarChart(canvas, labels, values, title, barColor) {
  const dpr=window.devicePixelRatio||1;
  const W=canvas.offsetWidth||canvas.parentElement.offsetWidth||340;
  const H=160;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);

  const pad={top:24,right:10,bottom:28,left:34};
  const cw=W-pad.left-pad.right, ch=H-pad.top-pad.bottom;
  const maxV=Math.max(...values,1);
  const bw=cw/labels.length*0.6;
  const gap=cw/labels.length;

  values.forEach((v,i)=>{
    const bx=pad.left+i*gap+(gap-bw)/2;
    const bh=v/maxV*ch;
    const by=pad.top+ch-bh;
    // Bar
    ctx.fillStyle=barColor+'99';
    ctx.beginPath();
    const r=4; ctx.roundRect?ctx.roundRect(bx,by,bw,bh,r):ctx.rect(bx,by,bw,bh);
    ctx.fill();
    ctx.strokeStyle=barColor; ctx.lineWidth=1.5; ctx.stroke();
    // Value label
    if(v>0){
      ctx.fillStyle='rgba(190,255,137,0.9)'; ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='center';
      ctx.fillText(v,bx+bw/2,by-4);
    }
  });

  // X labels
  ctx.fillStyle='rgba(160,180,224,0.7)'; ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='center';
  labels.forEach((l,i)=>ctx.fillText(l,pad.left+i*gap+gap/2,H-6));

  // Title
  ctx.fillStyle='rgba(160,180,224,0.6)'; ctx.font='11px Rajdhani,sans-serif';
  ctx.textAlign='left'; ctx.fillText(title,pad.left,15);
}

// ── SETTINGS ─────────────────────────────
function clearHistory() {
  if(confirm('Clear all workout history? This cannot be undone.')){
    state.history=[]; state.streak=0; state.weekSessions={};
    document.getElementById('streak-count').textContent='0';
    save(); renderHistory(); buildHomeDayCards();
  }
}
function exportData() {
  const blob=new Blob([JSON.stringify(state.history,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url;
  a.download=`gymdolph-export-${todayStr()}.json`; a.click(); URL.revokeObjectURL(url);
}
