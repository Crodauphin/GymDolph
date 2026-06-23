const APP_VERSION = '0.9.7';
// ── THEME (v0.9.7) — read live tokens so canvas/charts follow the theme ──
function themeColor(name, fb){ try { const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v||fb||'#888'; } catch(e){ return fb||'#888'; } }
function themeRGBA(rgbVar, a){ try { const c=getComputedStyle(document.documentElement).getPropertyValue(rgbVar).trim(); return c?('rgba('+c+','+a+')'):('rgba(160,180,224,'+a+')'); } catch(e){ return 'rgba(160,180,224,'+a+')'; } }
function headFont(){ return (themeColor('--font-head','Rajdhani')||'Rajdhani').replace(/['"]/g,'') || 'Rajdhani'; }
function applyTheme(t){
  const theme = (t==='bright') ? 'bright' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('gymdolph_theme', theme); } catch(e){}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColor('--bg', '#071D5F'));
}
function setTheme(t){ applyTheme(t); }
function initTheme(){
  let t=null; try { t=localStorage.getItem('gymdolph_theme'); } catch(e){}
  if (!t) t=(typeof DEFAULT_THEME!=='undefined' ? DEFAULT_THEME : 'dark');
  applyTheme(t);
}
const MAX_SECS = 90 * 60;
const NOTIF_MILESTONES = [10*60, 50*60, 70*60];
let _hrZoneThresholds = { recovery: 115, aerobic: 135, anaerobic: 155, vo2max: 175 };

const driveState = {
  get token()       { return localStorage.getItem('gd_token') || null; },
  set token(v)      { v ? localStorage.setItem('gd_token', v) : localStorage.removeItem('gd_token'); },
  get expiry()      { return parseInt(localStorage.getItem('gd_expiry') || '0'); },
  set expiry(v)     { localStorage.setItem('gd_expiry', String(v)); },
  get fileId()      { return localStorage.getItem('gd_fileid') || null; },
  set fileId(v)     { v ? localStorage.setItem('gd_fileid', v) : localStorage.removeItem('gd_fileid'); },
  get account()     { return localStorage.getItem('gd_account') || ''; },
  set account(v)    { v ? localStorage.setItem('gd_account', v) : localStorage.removeItem('gd_account'); },
  get lastBackup()  { return localStorage.getItem('gd_lastbackup') || null; },
  set lastBackup(v) { v ? localStorage.setItem('gd_lastbackup', v) : localStorage.removeItem('gd_lastbackup'); },
  isValid() { return !!this.token && Date.now() < this.expiry; },
};

let state = {
  currentView: 'home',
  activeDay: 0,

  // v0.9.2: multi-session map — keyed by day.id
  // Each entry: { setLogs, workoutChecks, cardioChecks, cardioLogs, touched }
  // 'touched' = true once any set logged or exercise checked or timer started
  sessions: {},

  // Active workout day currently on screen (day object, not session data)
  workoutDay: null,

  // Global timer — app-wide, survives navigation
  timerStartEpoch: null,   // wall-clock epoch when timer was last started
  timerPausedAt: 0,        // accumulated seconds before last pause
  timerInterval: null,
  timerRunning: false,
  notifiedMilestones: {},

  restInterval: null, restTotal: 60, restRemaining: 0,
  restPreferredDuration: 60,
  modalTarget: null,
  history: [], streak: 0,
  currentWeekKey: null, weekSessions: {},
  modifyTarget: null,
  deleteTarget: null,
  historySetTarget: null,
  statsPickerSelected: null,
  deloadDismissedWeek: null,
  calYear: 0, calMonth: 0,
  ytLinks: {},
  doneDayTarget: null,
  unsavedCallback: null,
  scrollPositions: {},
  notifPermission: false,
  bodyStats: [],
  _editingHistoryId: null,
  _pendingWeekReset: false,
  _lastWeekInprog: null,
};

// ── SESSION HELPERS ──────────────────────────
function getSession(dayId) {
  if (!state.sessions[dayId]) {
    state.sessions[dayId] = { setLogs: {}, workoutChecks: {}, cardioChecks: {}, touched: false };
  }
  return state.sessions[dayId];
}
function isSessionTouched(dayId) {
  const s = state.sessions[dayId];
  if (!s) return false;
  return s.touched ||
    Object.keys(s.setLogs).length > 0 ||
    Object.keys(s.workoutChecks).some(k => s.workoutChecks[k]) ||
    Object.keys(s.cardioChecks).some(k => s.cardioChecks[k]);
}
function markSessionTouched(dayId) {
  getSession(dayId).touched = true;
}

// ── GLOBAL TIMER HELPERS ─────────────────────
function getTimerSecs() {
  if (state.timerRunning && state.timerStartEpoch) {
    return state.timerPausedAt + Math.floor((Date.now() - state.timerStartEpoch) / 1000);
  }
  return state.timerPausedAt;
}

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
  // Persist sessions map
  localStorage.setItem('gymdolph_sessions', JSON.stringify(state.sessions || {}));
  // Persist global timer
  localStorage.setItem('gymdolph_timer', JSON.stringify({
    timerStartEpoch: state.timerStartEpoch,
    timerPausedAt:   state.timerPausedAt,
    timerRunning:    state.timerRunning,
    notifiedMilestones: state.notifiedMilestones,
  }));
  // Active workout day
  if (state.workoutDay) {
    localStorage.setItem('gymdolph_activedayid', state.workoutDay.id);
  } else {
    localStorage.removeItem('gymdolph_activedayid');
  }
  // Legacy inprogress key — remove, replaced by sessions map
  localStorage.removeItem('gymdolph_inprogress');
}
// ── PER-APP STORAGE NAMESPACING (v0.9.7a) ──
// localStorage is scoped to ORIGIN, not path. Gym Dolph and Girly Gym Dolph live
// on the same github.io origin, so unprefixed keys collide between the two apps.
// We namespace every key by USER_NAME so each app has isolated storage.
(function () {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (window.__gdNamespaced) return;
  window.__gdNamespaced = true;

  var who = (typeof USER_NAME !== 'undefined' && USER_NAME) ? USER_NAME : 'default';
  var NS = 'gd_' + who.toLowerCase().replace(/[^a-z0-9]/g, '') + '__';

  var raw = {
    get:    window.localStorage.getItem.bind(window.localStorage),
    set:    window.localStorage.setItem.bind(window.localStorage),
    remove: window.localStorage.removeItem.bind(window.localStorage)
  };

  // One-time setup per app. Because the two apps already collided on the shared
  // origin, the unprefixed keys may hold the OTHER person's data — so we do NOT
  // import program/history/bodystats/etc. Each app rebuilds those from its own
  // gym_program.js file + its own future writes. Only the API key (same owner,
  // safe to reuse) is carried across so AI features keep working.
  try {
    if (!raw.get(NS + '__migrated')) {
      var apik = raw.get('gymdolph_apikey');
      if (apik !== null && raw.get(NS + 'gymdolph_apikey') === null) {
        raw.set(NS + 'gymdolph_apikey', apik);
      }
      raw.set(NS + '__migrated', '1');
    }
  } catch (e) { /* non-fatal */ }

  // Route all key access through the namespace.
  var proto = Object.getPrototypeOf(window.localStorage) || Storage.prototype;
  window.localStorage.getItem    = function (k) { return raw.get(NS + k); };
  window.localStorage.setItem    = function (k, v) { return raw.set(NS + k, v); };
  window.localStorage.removeItem = function (k) { return raw.remove(NS + k); };
})();

// ── PROGRAM LAYER (v0.9.7) — Layer 3: window.PROGRAM (gym_program.js) ──
const PROGRAM_DATA = (typeof window !== 'undefined' && window.PROGRAM) ? window.PROGRAM : { days: [] };
let PROGRAM = Array.isArray(PROGRAM_DATA.days) ? PROGRAM_DATA.days.slice() : [];
function loadProgram() {
  try {
    const sp = localStorage.getItem('gymdolph_program');
    if (sp) {
      const parsed = JSON.parse(sp);
      if (Array.isArray(parsed) && parsed.length === 7) PROGRAM = parsed;
    }
  } catch(e) { PROGRAM = Array.isArray(PROGRAM_DATA.days) ? PROGRAM_DATA.days.slice() : []; }
}

// ── MIGRATION (v0.9.6d → v0.9.7) — one-time, guarded, preserve-not-reset ──
function migrateTo097() {
  try {
    if (localStorage.getItem('gymdolph_schemaVersion')) return;   // already migrated
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('gymdolph') === 0) backup[k] = localStorage.getItem(k);
    }
    if (!localStorage.getItem('gymdolph-backup-pre097')) {
      localStorage.setItem('gymdolph-backup-pre097', JSON.stringify(backup));
    }
    localStorage.setItem('gymdolph_schemaVersion', '0.9.7');
  } catch (e) { console.warn('migrateTo097 failed', e); }
}

function load() {
  migrateTo097();
  loadProgram();
  try {
    state.history   = JSON.parse(localStorage.getItem('gymdolph_history')   || '[]');
    state.streak    = parseInt(localStorage.getItem('gymdolph_streak')      || '0');
    state.ytLinks   = JSON.parse(localStorage.getItem('gymdolph_ytlinks')   || '{}');
    state.bodyStats = JSON.parse(localStorage.getItem('gymdolph_bodystats') || '[]');
    // Migrate: collapse old timestamp-keyed entries (date like "2026-06-18_1781774869145") to plain date
    state.bodyStats = state.bodyStats.map(e => {
      if (e.date && e.date.includes('_')) e.date = e.date.split('_')[0];
      return e;
    });
    // Deduplicate: if multiple entries share the same date after migration, merge them (keep all non-null values)
    const bsMap = {};
    state.bodyStats.forEach(e => {
      if (!bsMap[e.date]) bsMap[e.date] = { date: e.date, weight: null, bf: null, muscle: null };
      if (e.weight != null) bsMap[e.date].weight = e.weight;
      if (e.bf     != null) bsMap[e.date].bf     = e.bf;
      if (e.muscle != null) bsMap[e.date].muscle  = e.muscle;
    });
    state.bodyStats = Object.values(bsMap).sort((a,b) => b.date.localeCompare(a.date));

    // Load sessions map
    state.sessions = JSON.parse(localStorage.getItem('gymdolph_sessions') || '{}');

    // Load global timer
    const timerData = JSON.parse(localStorage.getItem('gymdolph_timer') || '{}');
    state.timerPausedAt      = timerData.timerPausedAt || 0;
    state.timerStartEpoch    = null;
    state.timerRunning       = false;
    state.notifiedMilestones = timerData.notifiedMilestones || {};
    if (timerData.timerRunning && timerData.timerStartEpoch) {
      state.timerPausedAt = timerData.timerPausedAt +
        Math.floor((Date.now() - timerData.timerStartEpoch) / 1000);
    }

    // Restore active workout day
    const activeDayId = localStorage.getItem('gymdolph_activedayid');
    if (activeDayId) state.workoutDay = PROGRAM.find(p => p.id === activeDayId) || null;

    // Migrate legacy inprogress if sessions map is empty
    if (!Object.keys(state.sessions).length) {
      const inprog = localStorage.getItem('gymdolph_inprogress');
      if (inprog) {
        const d = JSON.parse(inprog);
        const day = PROGRAM.find(p => p.id === d.dayId);
        if (day) {
          state.sessions[d.dayId] = {
            setLogs: d.setLogs || {}, workoutChecks: d.workoutChecks || {},
            cardioChecks: d.cardioChecks || {}, cardioLogs: d.cardioLogs || {}, touched: true,
          };
          state.workoutDay = day;
          state.timerPausedAt = d.pausedElapsed || 0;
        }
      }
    }

    const savedWk = localStorage.getItem('gymdolph_weekKey') || '';
    const thisWk  = getWeekKey();
    state.currentWeekKey = thisWk;
    if (savedWk === thisWk) {
      state.weekSessions = JSON.parse(localStorage.getItem('gymdolph_weekSessions') || '{}');
    } else if (savedWk !== '') {
      state.weekSessions = JSON.parse(localStorage.getItem('gymdolph_weekSessions') || '{}');
      state._pendingWeekReset = true;
    } else {
      state.weekSessions = {}; state.currentWeekKey = thisWk; save();
    }
  } catch(e) {
    state.sessions = {}; state.weekSessions = {};
    state.currentWeekKey = getWeekKey(); state.ytLinks = {};
  }
}

// ── INIT ────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  load();
  const _sv = document.getElementById('splash-version');
  if (_sv) _sv.textContent = (typeof USER_NAME !== 'undefined' && USER_NAME ? USER_NAME.toUpperCase() : '') + ' · v' + APP_VERSION;
  const _pn = document.getElementById('settings-profile-name');
  if (_pn) _pn.textContent = (typeof USER_NAME !== 'undefined' && USER_NAME ? USER_NAME : '—');
  driveHandleRedirect();
  // --timer-pill-left set after app is visible (see dismissSplash)
  buildHomeDayCards();
  updateBannerDate();
  document.getElementById('streak-count').textContent = state.streak;
  const now = new Date();
  state.calYear = now.getFullYear(); state.calMonth = now.getMonth();
  history.pushState({page:'home'}, '');
  window.addEventListener('popstate', handlePopState);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  loadHRAge(); // v0.9.5: restore saved age and personalise HR zones
  autoTickRestDay(); // v0.9.6: auto-complete rest days on open
  recalcStreak(); // v0.9.6: reset streak if days were skipped
  document.getElementById('streak-count').textContent = state.streak;
  // v0.9.1: raise modals above soft keyboard using visualViewport
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const keyboardH = window.innerHeight - window.visualViewport.height;
      document.querySelectorAll('#set-modal, #body-stats-modal').forEach(el => {
        if (el.style.display !== 'none') {
          el.style.paddingBottom = Math.max(0, keyboardH) + 'px';
        }
      });
    });
  }
  // Show timer pill if the global timer has accumulated time (restored from storage)
  if (getTimerSecs() > 0) {
    updateHeaderTimer();
    document.getElementById('header-timer-pill').classList.add('visible');
    setHeaderTimerIcon(false);
    } else {
    document.getElementById('header-timer-pill').classList.remove('visible');
  }
  window.dismissSplash = function() {
    const sp = document.getElementById('splash');
    if (!sp || sp.classList.contains('fade-out')) return;
    sp.classList.add('fade-out');
    setTimeout(() => {
      sp.style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      const bsw = document.getElementById('body-stats-btn-wrap'); if (bsw) bsw.style.display = 'none';
      renderDriveStatus(); renderSubHeader(); initSubHeaderParallax(); initFooterLogoAnim();
      if (state._pendingWeekReset) { setTimeout(() => showWeekResetModal(), 400); }

    }, 500);
  };
  // Splash click to skip
  const splashEl = document.getElementById('splash');
  if (splashEl) splashEl.addEventListener('click', () => { if (window.dismissSplash) window.dismissSplash(); });
  // Safety fallback: dismiss after 11s if Lottie doesn't fire complete event
  setTimeout(() => { if (window.dismissSplash) window.dismissSplash(); }, 11000);
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
// getTimerSecs() defined in GLOBAL TIMER HELPERS at top

// ── VIEW SWITCHING ──────────────────────────
function showView(name) {
  // Auto-save active workout session to history on any navigation away
  if (state.currentView === 'workout' && name !== 'workout' && state.workoutDay) {
    autoSaveSessionToHistory(state.workoutDay.id);
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
  // Timer pill: visible on ALL views when timer has been started (elapsed > 0)
  const pill = document.getElementById('header-timer-pill');
  if (getTimerSecs() > 0 || state.timerRunning) {
    pill.classList.add('visible');
  } else {
    pill.classList.remove('visible');
  }
  // Header START pill: only on workout view with untouched session + timer at 0
  updateTimerPlayPrompt(state.workoutDay ? state.workoutDay.id : null);
  // Body stats button: hide on history and settings
  const bsb = document.getElementById('body-stats-btn-wrap');
  if (bsb) bsb.style.display = 'none'; // v0.9.4: moved to sub-header chip
  if (name === 'history')  renderHistory();
  if (name === 'home')     { buildHomeDayCards(); renderSubHeader(); }
  if (name === 'calendar') renderCalendar();
  if (name === 'stats')    renderStats();
  if (name === 'settings') { renderDriveStatus(); renderAiSettings(); peReset(); loadHRAge(); }
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
  document.getElementById('wd-focus').textContent = day.name;
  const finBtn = document.getElementById('finish-btn');
  const editMode = !!state._editingHistoryId;
  finBtn.textContent = editMode ? '✓ SAVE EDITS' : (day.type==='rest' ? '✓ Rested' : '✓ FINISH WORKOUT');
  finBtn.className = 'finish-btn' + (day.type==='rest' ? ' rest-finish' : '');
  // Show/hide pulsing play prompt based on whether session is touched
  updateTimerPlayPrompt(day.id);
  if (day.type==='rest')         renderRestDayView(day);
  else if (day.type==='stretch') renderStretchView(day);
  else                           renderWorkoutBlocks(day);
  updateProgress();
}

// ── HOME ────────────────────────────────────
function buildHomeDayCards() {
  const container = document.getElementById('day-cards');
  container.innerHTML = '';
  updateDeloadNotices();
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
      <div class="day-row">
        <div class="day-badge">${day.id}</div>
        <div class="day-sep"></div>
        <div class="day-info"><div class="day-name">${day.name}</div></div>
        <div class="day-sep"></div>
        <button class="day-expand" aria-label="details">&#9660;</button>
        <div class="day-sep"></div>
        <div class="day-check">${isDone?'&#10003;':''}</div>
      </div>
      <div class="day-detail">${dayDetailHtml(day)}</div>`;
    card.querySelector('.day-row').addEventListener('click', (e) => {
      if (e.target.closest('.day-expand')) return;
      state.activeDay = idx;
      if (isDone) { openDoneDayModal(day, sess); }
      else { startWorkout(idx); }
    });
    card.querySelector('.day-expand').addEventListener('click', (e) => {
      e.stopPropagation(); card.classList.toggle('open');
    });
    container.appendChild(card);
  });
}
function blockSummary(day) {
  if (day.type==='rest')       return 'Full rest — recovery & sleep';
  if (day.type==='stretch')    return '60 min · no mat or props needed';
  if (day.type==='cardio_day') return '60 min · 3 cardio blocks';
  return 'Warm-up 10 min · Main 40 min · Secondary 20 min · Cardio 20 min';
}

// ── Day-card helpers (v0.9.4) ──
function dayFocus(day){if(day.type==='rest')return'Recovery & sleep';if(day.type==='stretch')return'Mobility & flexibility';const m=(day.blocks||[]).find(b=>b.type==='main');if(m&&m.exercises&&m.exercises.length)return m.exercises.slice(0,3).map(e=>e.name).join(' · ');return day.name;}
function dayTip(day){if(day.type==='rest')return'Let the body adapt — no training load today.';if(day.type==='stretch')return'Move slowly through range, breathe into each hold.';if(day.type==='cardio_day')return'Keep it Zone 2 — conversational pace, 120–135 bpm.';return'Main lifts 4×4 — stop 1–2 reps before failure, 3–5 min rest between heavy sets.';}
function dayDetailHtml(day){return `<div class="dd-row"><span class="dd-k">Time</span><span class="dd-v">${blockSummary(day)}</span></div><div class="dd-row"><span class="dd-k">Focus</span><span class="dd-v">${dayFocus(day)}</span></div><div class="dd-row"><span class="dd-k">Tip</span><span class="dd-v">${dayTip(day)}</span></div>`;}

// ── Sub-header chips (v0.9.4) ──
function renderSubHeader(){
  var bd=document.getElementById('banner-date'); if(bd) bd.textContent=new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
  var sc=document.getElementById('streak-count'); if(sc) sc.textContent=state.streak||0;
  var last=(state.bodyStats&&state.bodyStats.length)?state.bodyStats[0]:null;
  var w=document.getElementById('sh-weight'); if(w) w.textContent=last&&last.weight!=null?(last.weight+' kg'):'— kg';
  var bf=document.getElementById('sh-bf'); if(bf) bf.textContent=(last&&last.bf!=null)?(last.bf+'% bf'):'—% bf';
}

// ── Burger menu (v0.9.4) ──
function toggleMenu(){document.getElementById('nav-menu').classList.toggle('open');document.getElementById('menu-backdrop').classList.toggle('open');}
function menuGo(view){toggleMenu();showView(view);}

// ── Sub-header parallax — inside home scroll, positive shift = slow up (v0.9.4) ──
function initSubHeaderParallax(){
  var sc=document.querySelector('#view-home .view-scroll'); if(!sc) return;
  sc.addEventListener('scroll', function(){
    var sh=document.getElementById('sub-header'); if(!sh) return;
    var y=sc.scrollTop; var shift=Math.min(y*0.5, 50);
    sh.style.transform='translateY('+shift+'px)';
    sh.style.opacity=String(Math.max(0, 1 - y/80));
  });
}

// ── Footer logo: random playful spin (v0.9.4) ──
function initFooterLogoAnim(){
  function spin(){var img=document.querySelector('#sticky-footer-logo img'); if(!img) return;
    img.classList.add('logo-star-spin');
    img.addEventListener('animationend',function(){img.classList.remove('logo-star-spin'); setTimeout(spin,5000+Math.random()*10000);},{once:true});}
  setTimeout(spin,2000+Math.random()*3000);
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
    // Open the completed session for review (read-only view via workout screen)
    state.workoutDay = day;
    const s = state.sessions[day.id] || {};
    s.setLogs       = JSON.parse(JSON.stringify(sess.setLogs      || {}));
    s.workoutChecks = JSON.parse(JSON.stringify(sess.checks       || {}));
    s.cardioChecks  = JSON.parse(JSON.stringify(sess.cardioChecks || {}));
    s.touched       = true;
    state.sessions[day.id] = s;
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
  delete state.sessions[day.id];
  delete state.weekSessions[day.id];
  state.history = state.history.filter(
    h => !(h.dayId === day.id && h.weekKey === state.currentWeekKey)
  );
  if (state.workoutDay && state.workoutDay.id === day.id) {
    state.workoutDay = null;
  }
  recalcStreak();
  save();
  buildHomeDayCards();
  document.getElementById('streak-count').textContent = state.streak;
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
  const today = d.toISOString().slice(0,10);
  // If today has no session yet, start counting from yesterday
  if (!dates.has(today)) d.setDate(d.getDate()-1);
  while (dates.has(d.toISOString().slice(0,10))) { streak++; d.setDate(d.getDate()-1); }
  state.streak = streak;
  const el = document.getElementById('cal-streak-num');
  if (el) el.textContent = streak;
}

// ── START WORKOUT ────────────────────────────
function startWorkout(dayIndex) {
  const day = PROGRAM[dayIndex];
  if (!day) return;
  acquireWakeLock(); // B5: keep screen on during session
  // Auto-save outgoing session if switching days
  if (state.workoutDay && state.workoutDay.id !== day.id) {
    autoSaveSessionToHistory(state.workoutDay.id);
  }
  state.workoutDay = day;
  // Ensure a session slot exists (preserves existing data if resuming)
  getSession(day.id);
  save();
  const finBtn = document.getElementById('finish-btn');
  finBtn.textContent = day.type==='rest' ? '✓ Rested' : '✓ FINISH WORKOUT';
  finBtn.className = 'finish-btn' + (day.type==='rest' ? ' rest-finish' : '');
  if (day.type==='rest')         renderRestDayView(day);
  else if (day.type==='stretch') renderStretchView(day);
  else                           renderWorkoutBlocks(day);
  updateProgress();
  // Show pulsing play prompt if session is untouched
  updateTimerPlayPrompt(day.id);
  showView('workout');
  requestNotifPermission();
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
// Stretch days use the v0.9.7 `blocks` schema; fall back to legacy `stretchPhases`.
function stretchGroups(day){ return (day.blocks || day.stretchPhases || []); }
function stretchMoves(day){
  const out = [];
  stretchGroups(day).forEach(g => (g.exercises || g.moves || []).forEach(m => out.push(m)));
  return out;
}
function renderStretchView(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';
  const sess = getSession(day.id);
  // v0.9.7 schema: stretch days use `blocks` -> `exercises` (same as other days).
  // Fallback to legacy `stretchPhases` -> `moves` if an old-format day is present.
  const groups = (day.blocks || day.stretchPhases || []);
  groups.forEach(group => {
    const moves = (group.exercises || group.moves || []);
    const block = document.createElement('div');
    block.className = 'stretch-block';
    let h = '';
    moves.forEach(m => {
      const chk = sess.workoutChecks[m.id];
      const detail = m.prescription || m.detail || '';
      h += `<div class="stretch-row" onclick="handleExRowClick(event,'${m.id}')">
        <div class="ex-check ${chk?'checked':''}" id="excheck-${m.id}"
          onclick="event.stopPropagation();toggleExercise('${m.id}',this)">${chk?'✓':''}</div>
        <div class="stretch-info">
          <div class="stretch-name">${m.name}</div>
          ${detail?`<div class="stretch-detail">${detail}</div>`:''}
          ${m.note?`<div class="stretch-note">${m.note}</div>`:''}
        </div></div>`;
    });
    block.innerHTML = `<div class="stretch-block-header">
      <span class="block-icon">${group.icon||''}</span>
      <span class="stretch-block-title">${group.title||''}</span>
      <span class="block-duration">${group.duration||''}</span></div>${h}`;
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
        const sess = getSession(day.id);
        const chk = !!sess.cardioChecks[ex.id];
        const log = (sess.cardioLogs||{})[ex.id];
        const logLabel = log ? formatCardioLog(log) : 'LOG CARDIO';
        const logClass = log ? 'set-chip logged' : 'set-chip';
        exHTML += `<div class="exercise-row">
          <div class="ex-check ${chk?'checked':''}" id="cardiocheck-${ex.id}"
            onclick="toggleCardio('${ex.id}',this)">${chk?'✓':''}</div>
          <div class="ex-info">
            <div class="ex-name-row">
              <span class="ex-name">${ex.name}</span>
            </div>
            <div class="ex-prescription">${ex.prescription}</div>
            ${ex.note?`<div class="ex-prescription" style="color:var(--pink2);font-style:italic">${ex.note}</div>`:''}
            <div class="ex-sets-row">
              <div class="${logClass}" onclick="openCardioModal('${day.id}','${ex.id}','${ex.name.replace(/'/g,"\\'")}')">
                ${logLabel}
              </div>
            </div>
          </div>
        </div>`;
      });
    } else {
      block.exercises.forEach(ex => {
        const sess = getSession(day.id);
        const chk = !!sess.workoutChecks[ex.id];
        const isBodyweight = !!ex.bodyweight;
        const hint = isBodyweight ? null : getMostUsedSetValue(ex.name);
        const hintText = hint ? `${hint.weight}kg × ${hint.reps}` : '';
        let chips = '';
        if (block.type!=='warmup') {
          for (let s=0;s<ex.sets;s++) {
            const logged = sess.setLogs[ex.id] && sess.setLogs[ex.id][s] && sess.setLogs[ex.id][s].reps != null ? sess.setLogs[ex.id][s] : null;
            const chipLabel = logged
              ? (isBodyweight ? `${logged.reps} reps` : `${logged.weight}kg × ${logged.reps}`)
              : `Set ${s+1}`;
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
  if (event.target.closest('.set-chip')) return;
  const el = document.getElementById('excheck-' + exId);
  if (el) toggleExercise(exId, el);
}
function handleCardioRowClick(event, dayId, exId, blockId) {
  // no-op — kept for safety, cardio log now via modal chip
}
function toggleExercise(exId, el) {
  if (!state.workoutDay) return;
  const s = getSession(state.workoutDay.id);
  s.workoutChecks[exId] = !s.workoutChecks[exId];
  s.touched = true;
  el.classList.toggle('checked', s.workoutChecks[exId]);
  el.textContent = s.workoutChecks[exId] ? '✓' : '';
  // v0.9.5: auto-start session timer on first warm-up tick if timer not yet running
  if (s.workoutChecks[exId] && getTimerSecs() === 0 && !state.timerRunning) {
    const block = state.workoutDay.blocks.find(b => b.exercises.some(e => e.id === exId));
    if (block && block.type === 'warmup') {
      startTimerTick();
      showTimerAutoToast();
    }
  }
  updateTimerPlayPrompt(state.workoutDay.id);
  updateProgress(); save();
  if (s.workoutChecks[exId]) runSilentCheck(exId);
}
function toggleCardio(exId, el) {
  if (!state.workoutDay) return;
  const s = getSession(state.workoutDay.id);
  s.cardioChecks[exId] = !s.cardioChecks[exId];
  s.touched = true;
  el.classList.toggle('checked', s.cardioChecks[exId]);
  el.textContent = s.cardioChecks[exId] ? '✓' : '';
  updateTimerPlayPrompt(state.workoutDay.id);
  updateProgress(); save();
}

// ── SET MODAL ────────────────────────────────
function openSetModal(dayId, blockId, exId, setIndex) {
  const scroll = document.getElementById('workout-scroll');
  if (scroll) state.scrollPositions['workout'] = scroll.scrollTop;
  state.modalTarget = {dayId, blockId, exId, setIndex};
  const block = state.workoutDay.blocks.find(b=>b.id===blockId);
  const ex    = block.exercises.find(e=>e.id===exId);
  const isBodyweight = !!ex.bodyweight;
  document.getElementById('modal-ex-name').textContent = `${ex.name} — Set ${setIndex+1}`;
  // Show/hide weight field based on bodyweight flag
  const weightField = document.getElementById('modal-weight-field');
  if (weightField) weightField.style.display = isBodyweight ? 'none' : 'flex';
  const sess = state.workoutDay ? getSession(state.workoutDay.id) : {};
  const prev = ((sess.setLogs||{})[exId]||[])[setIndex];
  const hint = isBodyweight ? null : getMostUsedSetValue(ex.name);
  if (prev) {
    document.getElementById('modal-weight').value = prev.weight || '';
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
  // Focus reps for bodyweight, weight for weighted
  setTimeout(()=> {
    const focusEl = isBodyweight ? document.getElementById('modal-reps') : document.getElementById('modal-weight');
    if (focusEl) focusEl.focus();
  }, 100);
}
function closeModal() {
  const el = document.getElementById('set-modal');
  el.style.display = 'none';
  el.style.paddingBottom = '';
  state.modalTarget = null;
  state.historySetTarget = null;
}
function confirmSet() {
  // Route to history set save if that modal is active
  if (state.historySetTarget) { confirmHistorySet(); return; }
  const {dayId, blockId, exId, setIndex} = state.modalTarget;
  const block = state.workoutDay ? state.workoutDay.blocks.find(b=>b.id===blockId) : null;
  const ex = block ? block.exercises.find(e=>e.id===exId) : null;
  const isBodyweight = ex ? !!ex.bodyweight : false;
  const weight = isBodyweight ? 0 : (parseFloat(document.getElementById('modal-weight').value)||0);
  const reps   = parseInt(document.getElementById('modal-reps').value)||0;
  const sess = getSession(state.workoutDay ? state.workoutDay.id : dayId);
  if (!sess.setLogs[exId]) sess.setLogs[exId] = [];
  sess.setLogs[exId][setIndex] = {weight, reps};
  sess.touched = true;
  updateTimerPlayPrompt(state.workoutDay ? state.workoutDay.id : dayId);
  const chip = document.getElementById(`setchip-${exId}-${setIndex}`);
  if (chip) {
    chip.classList.add('logged');
    chip.textContent = isBodyweight ? `${reps} reps` : `${weight}kg × ${reps}`;
  }
  closeModal(); save();
  state._restCoachCtx = {dayId, blockId, exId, setIndex};
  resetRestCoachUI();
  // v0.9.5: default rest duration by block type
  const restDefaults = {warmup:30, main:180, secondary:60, cardio:0};
  const restLabels   = {warmup:'warm-up', main:'main compound · 3–5 min protocol', secondary:'accessory'};
  const suggestedDur = restDefaults[blockId] !== undefined ? restDefaults[blockId] : 60;
  const suggestedLbl = restLabels[blockId] || '';
  state.restPreferredDuration = suggestedDur;
  const lbl = document.getElementById('rest-suggested-label');
  if (lbl) lbl.textContent = suggestedLbl ? `Suggested: ${suggestedDur<60?suggestedDur+'s':Math.round(suggestedDur/60)+' min'} · ${suggestedLbl}` : '';
  startRestTimer(suggestedDur);
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
  const sess = day ? getSession(day.id) : {workoutChecks:{},cardioChecks:{}};
  if (day.type==='rest') { total=1; done=1; }
  else if (day.type==='stretch') {
    stretchMoves(day).forEach(m=>{ total++; if(sess.workoutChecks[m.id]) done++; });
  } else {
    day.blocks.forEach(b=>b.exercises.forEach(ex=>{
      total++;
      if(b.type==='cardio'){if(sess.cardioChecks[ex.id])done++;}
      else{if(sess.workoutChecks[ex.id])done++;}
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

// ── GLOBAL WALL-CLOCK TIMER ──────────────────
function updateHeaderTimer() {
  const secs = getTimerSecs();
  const display = `${pad2(Math.floor(secs/60))}:${pad2(secs%60)}`;
  document.getElementById('header-timer-display').textContent = display;
  // Pill visible on all views once timer has any elapsed time or is running
  const pill = document.getElementById('header-timer-pill');
  if (secs > 0 || state.timerRunning) pill.classList.add('visible');
}
function startTimerTick() {
  clearInterval(state.timerInterval);
  state.timerStartEpoch = Date.now() - state.timerPausedAt * 1000;
  state.timerRunning = true;
  acquireWakeLock();
  setHeaderTimerIcon(true);
  // Hide START pill, show timer pill
  document.getElementById('header-timer-start').classList.remove('visible');
  document.getElementById('header-timer-pill').classList.add('visible');
  // Starting the timer marks the active session as touched
  if (state.workoutDay) {
    markSessionTouched(state.workoutDay.id);
    updateTimerPlayPrompt(state.workoutDay.id);
  }
  state.timerInterval = setInterval(() => {
    const secs = getTimerSecs();
    updateHeaderTimer();
    const milestoneData = {
      600:  {time:'10 MIN', msg:'WARM-UP DONE\nTIME TO LOAD THE BAR', color:'green'},
      3000: {time:'50 MIN', msg:'KEEP GOING', color:'pink'},
      4200: {time:'70 MIN', msg:'ALMOST THERE', color:'pink'},
    };
    NOTIF_MILESTONES.forEach(ms => {
      if (secs >= ms && !state.notifiedMilestones[ms]) {
        state.notifiedMilestones[ms] = true;
        const d = milestoneData[ms];
        if (d) showMilestone(d.time, d.msg, d.color);
      }
    });
    save();
  }, 500);
  save();
}
function toggleTimer() {
  if (state.timerRunning) pauseTimer(); else resumeTimer();
}
function pauseTimer() {
  if (!state.timerRunning) return;
  state.timerPausedAt   = getTimerSecs();
  state.timerStartEpoch = null;
  state.timerRunning    = false;
  clearInterval(state.timerInterval);
  releaseWakeLock();
  setHeaderTimerIcon(false);
  if (state.workoutDay) updateTimerPlayPrompt(state.workoutDay.id);
  save();
}
function resumeTimer() {
  if (state.timerRunning) return;
  startTimerTick();
}
// ── APP DIALOG (v0.9.6) — replaces native confirm/alert ─────────
function appConfirm(title, msg, onConfirm, confirmLabel, cancelLabel) {
  const el   = document.getElementById('app-dialog');
  const tEl  = document.getElementById('app-dialog-title');
  const mEl  = document.getElementById('app-dialog-msg');
  const bEl  = document.getElementById('app-dialog-btns');
  tEl.textContent = title;
  mEl.textContent = msg;
  bEl.innerHTML = `
    <button class="modal-btn cancel" onclick="closeAppDialog()">${cancelLabel||'CANCEL'}</button>
    <button class="modal-btn confirm" id="app-dialog-ok">${confirmLabel||'OK'}</button>`;
  document.getElementById('app-dialog-ok').onclick = () => { closeAppDialog(); onConfirm(); };
  el.style.display = 'flex';
}
function appAlert(title, msg, onClose) {
  const el   = document.getElementById('app-dialog');
  const tEl  = document.getElementById('app-dialog-title');
  const mEl  = document.getElementById('app-dialog-msg');
  const bEl  = document.getElementById('app-dialog-btns');
  tEl.textContent = title;
  mEl.textContent = msg;
  bEl.innerHTML = `<button class="modal-btn confirm" onclick="closeAppDialog(${onClose?'true':''})">OK</button>`;
  if (onClose) document.querySelector('#app-dialog-btns .modal-btn').onclick = () => { closeAppDialog(); onClose(); };
  el.style.display = 'flex';
}
function closeAppDialog() {
  document.getElementById('app-dialog').style.display = 'none';
}

// ── AUTO-TICK REST DAYS (v0.9.6) ───────────────
function autoTickRestDay() {
  // JS getDay(): 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  // PROGRAM:     0=D1(Mon)...6=D7(Sun)
  const dowToProgram = { 1:0, 2:1, 3:2, 4:3, 5:4, 6:5, 0:6 };
  const todayDow = new Date().getDay();
  const progIdx = dowToProgram[todayDow];
  const day = PROGRAM[progIdx];
  if (!day || day.type !== 'rest') return;
  // Only auto-tick if not already done this week
  if (state.weekSessions[day.id]) return;
  const record = {
    id: Date.now(), dayId: day.id, dayName: day.name,
    date: todayStr(), weekKey: state.currentWeekKey,
    dateStr: new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}),
    duration: 0, durationStr: '0m', setLogs: {}, checks: {}, exercises: [],
    autoTicked: true,
  };
  state.weekSessions[day.id] = { workoutChecks:{}, setLogs:{}, cardioLog:{} };
  const existing = state.history.findIndex(h => h.dayId===day.id && h.weekKey===state.currentWeekKey);
  if (existing >= 0) state.history[existing] = record;
  else state.history.unshift(record);
  save();
  buildHomeDayCards();
}

function confirmResetTimer() {
  appConfirm('STOP TIMER', 'Stop the session timer? Your logged sets won\'t be lost.', resetTimer, 'STOP', 'CANCEL');
}
function resetTimer() {
  clearInterval(state.timerInterval);
  state.timerRunning    = false;
  state.timerPausedAt   = 0;
  state.timerStartEpoch = null;
  releaseWakeLock();
  state.notifiedMilestones = {};
  updateHeaderTimer();
  document.getElementById('header-timer-pill').classList.remove('visible');
  setHeaderTimerIcon(false);
  if (state.workoutDay) updateTimerPlayPrompt(state.workoutDay.id);
  save();
}
function setHeaderTimerIcon(running) {
  document.getElementById('htt-play').style.display  = running ? 'none'  : 'block';
  document.getElementById('htt-pause').style.display = running ? 'block' : 'none';
  const pill  = document.getElementById('header-timer-pill');
  const reset = document.getElementById('header-timer-reset');
  const paused = !running && getTimerSecs() > 0;
  if (pill) {
    pill.classList.toggle('running', running);
    pill.classList.toggle('paused', paused);
  }
  if (reset) {
    if (paused) {
      reset.style.visibility = 'visible';
      requestAnimationFrame(() => reset.classList.add('visible'));
    } else {
      reset.classList.remove('visible');
      reset.style.visibility = 'hidden';
    }
  }
  // Reposition after padding/content transition settles (~300ms)
}
function updateTimerPlayPrompt(dayId) {
  // Header START pill: visible on workout screen whenever timer hasn't been started yet
  const startPill = document.getElementById('header-timer-start');
  if (!startPill) return;
  const show = state.currentView === 'workout' &&
               !state.timerRunning && getTimerSecs() === 0;
  startPill.classList.toggle('visible', show);
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

// ── MILESTONE OVERLAY (v0.9.5) ──────────────────
let _milestoneTimeout = null;
function showMilestone(time, msg, color) {
  const ov = document.getElementById('milestone-overlay');
  const card = ov.querySelector('.milestone-card');
  const timeEl = document.getElementById('milestone-time');
  const msgEl  = document.getElementById('milestone-msg');
  if (!ov || !timeEl || !msgEl) return;
  timeEl.textContent = time;
  timeEl.className   = 'milestone-time ' + color;
  msgEl.textContent  = msg;
  card.className = 'milestone-card ' + (color === 'green' ? 'green-border' : 'pink-border');
  ov.style.display = 'flex';
  // Vibrate
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]); } catch(e){}
  // Synthesised tone via Web Audio
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freq = color === 'green' ? 523 : 440;
    [0, 0.35, 0.7].forEach(offset => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
      osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.25);
    });
  } catch(e){}
  // Auto-dismiss after 6s
  clearTimeout(_milestoneTimeout);
  _milestoneTimeout = setTimeout(dismissMilestone, 6000);
}
function dismissMilestone() {
  clearTimeout(_milestoneTimeout);
  const ov = document.getElementById('milestone-overlay');
  if (ov) ov.style.display = 'none';
}

// ── TIMER AUTO-START TOAST (v0.9.5) ─────────────
function showTimerAutoToast() {
  // Brief toast inside workout view — reuse or create
  let toast = document.getElementById('timer-auto-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'timer-auto-toast';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
      'background:rgba(7,29,95,.95);border:1px solid rgba(119,253,1,.4);border-radius:20px;' +
      'padding:8px 18px;font-family:var(--font-head),sans-serif;font-size:12px;font-weight:600;' +
      'letter-spacing:1px;color:var(--green2);z-index:800;white-space:nowrap;' +
      'transition:opacity .4s;pointer-events:none;';
    document.body.appendChild(toast);
  }
  toast.textContent = 'SESSION TIMER STARTED';
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── CARDIO LOG (v0.9.5) ─────────────────────────
function getCardioFields(exName) {
  const n = exName.toLowerCase();
  if (n.includes('stairmaster'))  return [{key:'duration',label:'Duration (min)'},{key:'speed',label:'Speed (steps/min)'}];
  if (n.includes('skierg'))       return [{key:'duration',label:'Duration (min)'},{key:'strokes',label:'Strokes/min'}];
  if (n.includes('bike') || n.includes('recumbent') || n.includes('upright')) return [{key:'duration',label:'Duration (min)'},{key:'speed',label:'Speed (km/h)'},{key:'difficulty',label:'Difficulty level'}];
  if (n.includes('treadmill') || n.includes('running')) return [{key:'duration',label:'Duration (min)'},{key:'speed',label:'Speed (km/h)'},{key:'incline',label:'Incline (%)'}];
  return [{key:'duration',label:'Duration (min)'}];
}
function formatCardioLog(log) {
  const parts = [];
  if (log.duration) parts.push(log.duration + ' min');
  if (log.speed)    parts.push(log.speed + (log.incline !== undefined ? ' km/h' : log.strokes !== undefined ? ' str/min' : ''));
  if (log.incline)  parts.push(log.incline + '% incline');
  if (log.difficulty) parts.push('lvl ' + log.difficulty);
  return parts.length ? parts.join(' · ') : 'LOGGED';
}

// ── CARDIO MODAL ─────────────────────────
let _cardioModalCtx = null;
function openCardioModal(dayId, exId, exName) {
  _cardioModalCtx = {dayId, exId, exName};
  const sess = getSession(dayId);
  const saved = (sess.cardioLogs||{})[exId] || {};
  const fields = getCardioFields(exName);
  document.getElementById('cardio-modal-name').textContent = exName;
  const fieldsEl = document.getElementById('cardio-modal-fields');
  fieldsEl.innerHTML = fields.map(f =>
    `<div class="modal-field" style="min-width:calc(50% - 6px)">
      <label>${f.label}</label>
      <input type="number" inputmode="decimal" id="cmi-${f.key}" value="${saved[f.key]||''}" placeholder="—" step="any"/>
    </div>`
  ).join('');
  document.getElementById('cardio-modal').style.display = 'flex';
  // Focus first field
  setTimeout(() => { const fi = fieldsEl.querySelector('input'); if (fi) fi.focus(); }, 100);
}
function closeCardioModal() {
  document.getElementById('cardio-modal').style.display = 'none';
  _cardioModalCtx = null;
}
function confirmCardioLog() {
  if (!_cardioModalCtx) return;
  const {dayId, exId, exName} = _cardioModalCtx;
  const sess = getSession(dayId);
  if (!sess.cardioLogs) sess.cardioLogs = {};
  const fields = getCardioFields(exName);
  const log = {};
  fields.forEach(f => {
    const v = parseFloat(document.getElementById('cmi-' + f.key)?.value);
    if (!isNaN(v)) log[f.key] = v;
  });
  sess.cardioLogs[exId] = log;
  sess.touched = true;
  save();
  // Update chip label in place
  const chips = document.querySelectorAll(`[onclick*="openCardioModal('${dayId}','${exId}'"]`);
  chips.forEach(chip => {
    chip.textContent = formatCardioLog(log);
    chip.className = 'set-chip logged';
  });
  closeCardioModal();
}

// ── REST TIMER ────────────────────────────────
function setRestDuration(s) {
  state.restPreferredDuration = s;
  [30,60,120,180,300].forEach(v => {
    const btn = document.getElementById(`rdb-${v}`);
    if (btn) btn.classList.toggle('active', v===s);
  });
  if (document.getElementById('rest-overlay').style.display!=='none') startRestTimer(s);
}
function startRestTimer(s) {
  const dur = (s!==undefined) ? s : (state.restPreferredDuration||60);
  state.restTotal=dur; state.restRemaining=dur;
  [30,60,120,180,300].forEach(v=>{ const b=document.getElementById(`rdb-${v}`); if(b) b.classList.toggle('active',v===dur); });
  document.getElementById('rest-countdown').textContent = dur;
  document.getElementById('ring-fg').style.strokeDashoffset = 0;
  document.getElementById('rest-overlay').style.display = 'flex';
  clearInterval(state.restInterval);
  state.restInterval = setInterval(() => {
    state.restRemaining--;
    document.getElementById('rest-countdown').textContent = state.restRemaining;
    document.getElementById('ring-fg').style.strokeDashoffset = 276.46*(1-state.restRemaining/state.restTotal);
    document.getElementById('widget-countdown').textContent = state.restRemaining;
    document.getElementById('widget-ring-fg').style.strokeDashoffset = 251.33*(1-state.restRemaining/state.restTotal);
    if (state.restRemaining<=0) skipRest();
  }, 1000);
}
function collapseRestToWidget() {
  document.getElementById('rest-overlay').style.display = 'none';
  const w = document.getElementById('rest-widget');
  w.classList.add('visible');
  makeDraggableWidget(w, null, false); // free 2D, no axis lock
}
function skipRest() {
  clearInterval(state.restInterval);
  // Only play feedback if timer reached zero naturally (not user-skipped)
  if (state.restRemaining <= 0) {
    try { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); } catch(e){}
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 659; osc.type = 'sine'; // E5 — bright, distinct
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    } catch(e){}
  }
  document.getElementById('rest-overlay').style.display = 'none';
  document.getElementById('rest-widget').classList.remove('visible');
}

// ── WAKE LOCK (v0.9.6) ─────────────────────────
let _wakeLock = null;
async function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { _wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}
}
function releaseWakeLock() {
  if (_wakeLock) { _wakeLock.release().catch(()=>{}); _wakeLock = null; }
}
// Re-acquire wake lock whenever page becomes visible and timer is running
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && state.timerRunning) {
    try { _wakeLock = await navigator.wakeLock.request('screen'); } catch(e){}
  }
});

// ── WIDGET DRAG WITH SNAP AXES (v0.9.5) ─────────
// Both widgets snap to horizontal/vertical axis through secondary logo centre.
// Logo: bottom:6px, right:8px, size 104px (incl padding 8px each side, img 84px)
// Logo centre: right edge = 8+8+84+8 = 108px from right → x = vw - 108 + 42 = vw - 66
//              bottom = 6+8+42 = 56px from bottom → y = vh - 56
const SNAP_THRESHOLD = 40; // px — within this distance, snap to axis
const SNAP_STRENGTH  = 0.35; // how strongly to pull toward axis while dragging

function getLogoCenter() {
  return {
    x: window.innerWidth  - 66,
    y: window.innerHeight - 56,
  };
}

function makeDraggableWidget(el, onTap, horizontalOnly) {
  let startX, startY, origX, origY, moved;
  let pinching = false, pinchStartDist = 0, pinchStartSize = 0, pinchStartX = 0, pinchStartY = 0;

  function onStart(e) {
    if (e.target.closest('.widget-skip')) return;

    // ── PINCH (2 fingers) ──
    if (e.touches && e.touches.length === 2) {
      pinching = true;
      moved = true; // prevent tap firing
      const t0 = e.touches[0], t1 = e.touches[1];
      pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      pinchStartSize = el.offsetWidth;
      // Midpoint in page coords
      pinchStartX = (t0.clientX + t1.clientX) / 2;
      pinchStartY = (t0.clientY + t1.clientY) / 2;
      // Switch to top/left so we can reposition during scale
      const r = el.getBoundingClientRect();
      el.style.right = 'auto'; el.style.bottom = 'auto';
      el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
      return;
    }

    // ── DRAG (1 finger) ──
    const t = e.touches ? e.touches[0] : e;
    startX = t.clientX; startY = t.clientY;
    const r = el.getBoundingClientRect();
    origX = r.left; origY = r.top;
    moved = false;
    el.style.right = 'auto'; el.style.bottom = 'auto';
    el.style.left = origX + 'px'; el.style.top = origY + 'px';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, {passive: false});
    document.addEventListener('touchend', onEnd);
  }

  function onMove(e) {
    if (e.cancelable) e.preventDefault();
    clearTimeout(_hrPressTimer); _hrPressTimer = null;

    // ── PINCH MOVE ──
    if (pinching && e.touches && e.touches.length === 2) {
      const t0 = e.touches[0], t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const scale = dist / pinchStartDist;
      const MIN = 60, MAX = 200;
      const newSize = Math.round(Math.min(MAX, Math.max(MIN, pinchStartSize * scale)));

      // Keep widget centred on pinch midpoint
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const nx = midX - newSize / 2;
      const ny = midY - newSize / 2;

      el.style.width  = newSize + 'px';
      el.style.height = newSize + 'px';
      el.style.borderRadius = (newSize / 2) + 'px';
      el.style.left = Math.max(0, Math.min(window.innerWidth  - newSize, nx)) + 'px';
      el.style.top  = Math.max(0, Math.min(window.innerHeight - newSize, ny)) + 'px';

      // Scale SVG ring and font inside
      const ratio = newSize / 84; // 84 is the base size
      const ring = el.querySelector('.widget-ring');
      const svg  = el.querySelector('.widget-ring svg');
      if (ring) { ring.style.width = newSize + 'px'; ring.style.height = newSize + 'px'; }
      if (svg)  { svg.style.width  = newSize + 'px'; svg.style.height  = newSize + 'px'; }
      const countdown = el.querySelector('.widget-countdown');
      if (countdown) countdown.style.fontSize = Math.round(24 * ratio) + 'px';
      return;
    }

    // ── DRAG MOVE ──
    const t = e.touches ? e.touches[0] : e;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    let nx = origX + dx;
    let ny = horizontalOnly ? origY : origY + dy;
    nx = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, nx));
    if (!horizontalOnly) ny = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, ny));
    el.style.left = nx + 'px';
    if (!horizontalOnly) el.style.top = ny + 'px';
  }

  function onEnd(e) {
    if (pinching && (!e.touches || e.touches.length < 2)) {
      pinching = false;
    }
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onEnd);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onEnd);
    if (!moved && onTap) onTap();
  }

  el.addEventListener('mousedown', onStart);
  el.addEventListener('touchstart', onStart, {passive: false});
}

// keep old makeDraggable for any other callers
function makeDraggable(el) { makeDraggableWidget(el, null, false); }

// Timer widget: tap body → reopen overlay, tap X → close (skipRest)
function expandRestFromWidget(e) {
  if (e.target.closest('.widget-skip')) return; // X handled separately
  // Re-show the rest overlay at current remaining time
  const overlay = document.getElementById('rest-overlay');
  const widget  = document.getElementById('rest-widget');
  if (!overlay || !widget) return;
  if (widget.classList.contains('visible')) {
    overlay.style.display = 'flex';
    widget.classList.remove('visible');
  }
}

// HR widget: tap → open sheet (drag handled by makeDraggableWidget)
function hrWidgetTap() {
  openHRSheet();
}

// ── AUTO-SAVE SESSION TO HISTORY (called on any navigation away from workout) ──
// Saves current state silently without closing the session.
// The session remains "in progress" — workoutDay stays set,
// timer keeps running, user can return and continue.
function autoSaveSessionToHistory(dayId) {
  const day = PROGRAM.find(p => p.id === dayId); if (!day) return;
  const sess = state.sessions[dayId]; if (!sess) return;
  let exercises = [];
  if (day.type === 'rest') {
    exercises = [];
  } else if (day.type === 'stretch') {
    stretchMoves(day).forEach(m => {
      exercises.push({id:m.id, name:m.name, checked:!!sess.workoutChecks[m.id], weight:'', setLogs:[]});
    });
  } else {
    day.blocks.forEach(b => b.exercises.forEach(ex => {
      const isC = b.type === 'cardio';
      const chk = isC ? !!sess.cardioChecks[ex.id] : !!sess.workoutChecks[ex.id];
      const sets = sess.setLogs[ex.id] || [];
      exercises.push({id:ex.id, name:ex.name, checked:chk,
        sets: ex.sets || 1,
        weight: sets.filter(s=>s&&s.weight>0).map(s=>`${s.weight}kg×${s.reps}`).join(', '),
        setLogs: sets});
    }));
  }
  const duration = getTimerSecs();
  const existing = state.history.findIndex(h => h.dayId===day.id && h.weekKey===state.currentWeekKey);
  const record = {
    id:        existing >= 0 ? state.history[existing].id : Date.now(),
    dayId:     day.id, dayName: day.name,
    date:      todayStr(), weekKey: state.currentWeekKey,
    dateStr:   new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}),
    duration,  durationStr: formatDuration(duration),
    setLogs:   JSON.parse(JSON.stringify(sess.setLogs   || {})),
    checks:    JSON.parse(JSON.stringify(sess.workoutChecks || {})),
    exercises, inProgress: true,
  };
  if (existing >= 0) state.history[existing] = record;
  else state.history.unshift(record);
  save();
}

// ── FINISH WORKOUT ────────────────────────────
function finishWorkout() {
  const day = state.workoutDay;
  if (!day) { showView('home'); return; }
  const editMode = !!state._editingHistoryId;
  const sess = getSession(day.id);

  let exercises = [];
  if (day.type==='rest') {
    exercises = [];
  } else if (day.type==='stretch') {
    stretchMoves(day).forEach(m=>{
      exercises.push({id:m.id, name:m.name, checked:!!sess.workoutChecks[m.id], weight:'', setLogs:[]});
    });
  } else {
    day.blocks.forEach(b=>b.exercises.forEach(ex=>{
      const isC=b.type==='cardio';
      const chk=isC?!!sess.cardioChecks[ex.id]:!!sess.workoutChecks[ex.id];
      const sets=sess.setLogs[ex.id]||[];
      exercises.push({id:ex.id, name:ex.name, checked:chk,
        weight:sets.filter(s=>s&&s.weight>0).map(s=>`${s.weight}kg×${s.reps}`).join(', '),
        setLogs:sets});
    }));
  }

  const duration = getTimerSecs();

  if (editMode) {
    const idx = state.history.findIndex(r => r.id === state._editingHistoryId);
    if (idx >= 0) {
      state.history[idx] = {
        ...state.history[idx],
        duration, durationStr: formatDuration(duration),
        setLogs: JSON.parse(JSON.stringify(sess.setLogs || {})),
        checks:  JSON.parse(JSON.stringify(sess.workoutChecks || {})),
        exercises,
      };
    }
    state._editingHistoryId = null;
  } else {
    state.weekSessions[day.id] = {
      checks:      JSON.parse(JSON.stringify(sess.workoutChecks || {})),
      setLogs:     JSON.parse(JSON.stringify(sess.setLogs || {})),
      cardioChecks:JSON.parse(JSON.stringify(sess.cardioChecks || {})),
      exercises, duration
    };
    const existing = state.history.findIndex(h=>h.dayId===day.id && h.weekKey===state.currentWeekKey);
    const record = {
      id:       existing>=0 ? state.history[existing].id : Date.now(),
      dayId:    day.id, dayName:day.name,
      date:     todayStr(), weekKey:state.currentWeekKey,
      dateStr:  new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}),
      duration, durationStr:formatDuration(duration),
      setLogs:  JSON.parse(JSON.stringify(sess.setLogs || {})),
      checks:   JSON.parse(JSON.stringify(sess.workoutChecks || {})),
      exercises,
    };
    if (existing>=0) state.history[existing]=record; else state.history.unshift(record);
    const today=todayStr(), yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    const lastDates=[...new Set(state.history.map(h=>h.date))].sort().reverse();
    if (lastDates[0]===today && (lastDates[1]===yesterday || state.streak===0))
      if (state.history.filter(h=>h.date===today).length===1) state.streak++;
    // Clear this day's session slot
    delete state.sessions[day.id];
  }

  // Stash summary for AI wrap-up before clearing (v0.9.3)
  const finishedDay = day;
  const setCount = exercises.reduce((n,e)=>n+(e.setLogs||[]).filter(s=>s&&s.reps!=null).length,0);
  state._lastFinished = { dayName: finishedDay.name, dayType: finishedDay.type,
    durationStr: formatDuration(duration), setCount, exercises };

  state.workoutDay = null;
  // Reset global timer on finish
  resetTimer();
  save();
  driveBackup(true);
  buildHomeDayCards();
  document.getElementById('streak-count').textContent = state.streak;
  document.getElementById('header-progress-wrap').classList.remove('visible');
  showView('home');
  if (!editMode && aiEnabled() && finishedDay.type === 'training') openSessionComplete();
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
      // Was a navigation-away modal — close the active session view
      state.workoutDay = null;
      document.getElementById('header-progress-wrap').classList.remove('visible');
    }
  }
}

// ── WEEK RESET (v0.9.1) ───────────────────────
function showWeekResetModal() {
  const msg = state._lastWeekInprog
    ? `You also had an unfinished ${state._lastWeekInprog.dayId} session last week — it will be discarded on reset.`
    : 'Your previous week\'s sessions are saved in History. Resetting clears the home screen for the new week.';
  document.getElementById('week-reset-msg').textContent = msg;
  document.getElementById('week-reset-modal').style.display = 'flex';
}

function executeWeekReset() {
  document.getElementById('week-reset-modal').style.display = 'none';
  state.weekSessions      = {};
  state.sessions          = {};
  state._pendingWeekReset = false;
  state._lastWeekInprog   = null;
  state.workoutDay        = null;
  resetTimer();
  save();
  buildHomeDayCards();
}

function dismissWeekReset() {
  document.getElementById('week-reset-modal').style.display = 'none';
  // Keep weekSessions intact (previous week cards stay ticked)
  // _pendingWeekReset stays true — modal will show again next app open until reset
}

// ── RESET SESSION BUTTON (workout screen, v0.9.1) ──
function openRefreshConfirm() {
  document.getElementById('refresh-confirm-modal').style.display = 'flex';
}
function closeRefreshConfirm() {
  document.getElementById('refresh-confirm-modal').style.display = 'none';
}
function executeRefresh() {
  closeRefreshConfirm();
  const day = state.workoutDay;
  if (!day) return;
  // Blank this day's session slot
  state.sessions[day.id] = { setLogs: {}, workoutChecks: {}, cardioChecks: {}, touched: false };
  // Also clear edit-mode flag if we were editing a history record
  state._editingHistoryId = null;
  save();
  // Re-render the workout view blank
  if (day.type === 'rest')         renderRestDayView(day);
  else if (day.type === 'stretch') renderStretchView(day);
  else                             renderWorkoutBlocks(day);
  updateProgress();
  updateTimerPlayPrompt(day.id);
  const finBtn = document.getElementById('finish-btn');
  finBtn.textContent = day.type==='rest' ? '✓ Rested' : '✓ FINISH WORKOUT';
  finBtn.className = 'finish-btn' + (day.type==='rest' ? ' rest-finish' : '');
}

function saveAndNextWeek() {
  appConfirm(
    'SAVE & NEXT WEEK',
    'Current week sessions are saved to history. Home screen resets for the new week.',
    () => {
      // Archive current week sessions to history (same as auto-archive)
      autoSaveWeekToHistory();
      // Then clear current week state
      state.weekSessions      = {};
      state.sessions          = {};
      state._pendingWeekReset = false;
      state._lastWeekInprog   = null;
      state.workoutDay        = null;
      // Advance week key by 1 week
      const parts = state.currentWeekKey.split('-W');
      const yr = parseInt(parts[0]), wk = parseInt(parts[1]);
      const newWk = wk >= 52 ? 1 : wk + 1;
      const newYr = wk >= 52 ? yr + 1 : yr;
      state.currentWeekKey = `${newYr}-W${String(newWk).padStart(2,'0')}`;
      resetTimer();
      save();
      buildHomeDayCards();
      document.getElementById('header-progress-wrap').classList.remove('visible');
    },
    'SAVE & CONTINUE',
    'CANCEL'
  );
}

function autoSaveWeekToHistory() {
  // Save any in-progress sessions from current week that aren't in history yet
  Object.keys(state.weekSessions).forEach(dayId => {
    const day = PROGRAM.find(p => p.id === dayId);
    if (!day) return;
    const existing = state.history.find(h => h.dayId === dayId && h.weekKey === state.currentWeekKey);
    if (!existing) {
      autoSaveSessionToHistory(dayId);
    }
  });
}

function openWeekResetConfirm() {
  document.getElementById('week-reset-confirm-modal').style.display = 'flex';
}
function closeWeekResetConfirm() {
  document.getElementById('week-reset-confirm-modal').style.display = 'none';
}
function executeWeekResetFromSettings() {
  closeWeekResetConfirm();
  state.weekSessions      = {};
  state.sessions          = {};
  state._pendingWeekReset = false;
  state._lastWeekInprog   = null;
  state.workoutDay        = null;
  resetTimer();
  save();
  buildHomeDayCards();
  document.getElementById('header-progress-wrap').classList.remove('visible');
}

// ── BODY STATS MODAL ─────────────────────────
function openBodyStatsModal(editDate) {
  const targetDate = editDate || todayStr();
  const existing = state.bodyStats.find(e => e.date === targetDate);
  document.getElementById('bsm-weight').value = existing && existing.weight!=null ? existing.weight : '';
  document.getElementById('bsm-bf').value     = existing && existing.bf!=null     ? existing.bf     : '';
  document.getElementById('bsm-muscle').value = existing && existing.muscle!=null ? existing.muscle : '';
  document.getElementById('body-stats-hint').textContent =
    existing ? `Editing entry for ${targetDate}` : `New entry for ${targetDate}`;
  document.getElementById('body-stats-modal').dataset.editDate = targetDate;
  document.getElementById('body-stats-modal').style.display = 'flex';
  setTimeout(()=>document.getElementById('bsm-weight').focus(), 100);
}
function closeBodyStatsModal() {
  document.getElementById('body-stats-modal').style.display = 'none';
  delete document.getElementById('body-stats-modal').dataset.editDate;
}
function saveBodyStats() {
  const weight = parseFloat(document.getElementById('bsm-weight').value);
  const bf     = parseFloat(document.getElementById('bsm-bf').value);
  const muscle = parseFloat(document.getElementById('bsm-muscle').value);
  const hasAny = !isNaN(weight) || !isNaN(bf) || !isNaN(muscle);
  if (!hasAny) { closeBodyStatsModal(); return; }
  const targetDate = document.getElementById('body-stats-modal').dataset.editDate || todayStr();
  const entry = {
    date:   targetDate,
    weight: isNaN(weight) ? null : weight,
    bf:     isNaN(bf)     ? null : bf,
    muscle: isNaN(muscle) ? null : muscle,
  };
  // One entry per day — replace if exists, otherwise add
  state.bodyStats = state.bodyStats.filter(e => e.date !== targetDate);
  state.bodyStats.unshift(entry);
  state.bodyStats.sort((a,b) => b.date.localeCompare(a.date));
  save();
  driveBackup(true);
  closeBodyStatsModal();
  renderSubHeader();
  if (state.currentView==='stats') renderStats();
}

function renderBodyStatsSummary() {
  const el = document.getElementById('body-stats-summary');
  const emptyEl = document.getElementById('body-stats-empty-state');
  if (emptyEl) emptyEl.style.display = 'none';
  if (!el) return;
  const latestWeight = state.bodyStats.find(e => e.weight != null);
  const latestBF     = state.bodyStats.find(e => e.bf     != null);
  const latestMuscle = state.bodyStats.find(e => e.muscle != null);

  function recentValues(metric) {
    return state.bodyStats.filter(e => e[metric] != null).slice(0, 3);
  }
  function miniHistory(metric, unit) {
    const vals = recentValues(metric);
    if (vals.length < 2) return '';
    return vals.map(e => `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);padding:2px 0">
      <span>${e.date}</span><span style="color:var(--text)">${e[metric]}${unit}</span></div>`).join('');
  }

  const emptyCard = (label, unit, metric) => `
    <div class="body-stat-card" onclick="openBodyStatsModal()" style="cursor:pointer;opacity:0.5">
      <div class="body-stat-label">${label}</div>
      <div><span class="body-stat-value">—</span><span class="body-stat-unit">${unit}</span></div>
      <div class="body-stat-date">not logged yet</div>
    </div>`;

  const card = (label, unit, metric, latest) => {
    return `<div class="body-stat-card" onclick="openBodyStatsModal('${latest.date}')" style="cursor:pointer">
      <div class="body-stat-label">${label}</div>
      <div><span class="body-stat-value">${latest[metric]}</span><span class="body-stat-unit">${unit}</span></div>
      <div class="body-stat-date">${latest.date}</div>
    </div>`;
  };

  el.innerHTML = `
    ${latestWeight ? card('BODY WEIGHT', 'kg', 'weight', latestWeight) : emptyCard('BODY WEIGHT','kg','weight')}
    ${latestBF     ? card('BODY FAT', '%', 'bf', latestBF)             : emptyCard('BODY FAT','%','bf')}
    ${latestMuscle ? card('MUSCLE MASS', 'kg', 'muscle', latestMuscle) : emptyCard('MUSCLE MASS','kg','muscle')}`;
}


// ── HISTORY ──────────────────────────────────
function renderHistory() {
  const c=document.getElementById('history-list'); c.innerHTML='';
  if (!state.history.length) {
    c.innerHTML='<div class="history-empty">No workouts recorded yet.<br>Complete your first session!</div>';
    return;
  }
  state.history.forEach(h=>{
    const card=document.createElement('div'); card.className='history-card history-entry';
    card.dataset.date = h.date || '';
    const done=Object.values(h.checks||{}).filter(Boolean).length;
    const sets=Object.values(h.setLogs||{}).reduce((a,s)=>a+s.length,0);
    const isCurrentWeek = h.weekKey === state.currentWeekKey;
    card.innerHTML=`
      <div class="hc-top">
        <span class="hc-day">${h.dayId} — ${h.dayName}</span>
        <span class="hc-date">${h.dateStr}</span>
      </div>
      <div class="hc-focus">${done} exercises · ${sets} sets · ${h.durationStr||'—'}</div>
      <div class="hc-actions">
        ${isCurrentWeek ? `<button class="hc-resume-btn" onclick="resumeSessionFromHistory(${h.id})">▶ Resume &amp; Edit</button>` : ''}
        <button class="hc-modify-btn" onclick="openModifyModal(${h.id})">✏ Modify</button>
      </div>`;
    c.appendChild(card);
  });
}

// ── RESUME & EDIT FROM HISTORY (v0.9.1) ──────
function resumeSessionFromHistory(recordId) {
  const record = state.history.find(r => r.id === recordId);
  if (!record) return;
  const day = PROGRAM.find(p => p.id === record.dayId);
  if (!day) return;

  // Restore session data into sessions map
  state.sessions[day.id] = {
    setLogs:       JSON.parse(JSON.stringify(record.setLogs || {})),
    workoutChecks: JSON.parse(JSON.stringify(record.checks  || {})),
    cardioChecks:  {},
    touched:       true,
  };
  state.workoutDay        = day;
  state._editingHistoryId = recordId;

  const finBtn = document.getElementById('finish-btn');
  finBtn.textContent = '✓ SAVE EDITS';
  finBtn.className   = 'finish-btn';

  if (day.type === 'rest')         renderRestDayView(day);
  else if (day.type === 'stretch') renderStretchView(day);
  else                             renderWorkoutBlocks(day);

  updateProgress();
  updateTimerPlayPrompt(day.id);
  showView('workout');
  updateHeaderTimer();
}

// ── MODIFY MODAL (#4 + #5) ────────────────────
function openModifyModal(recordId) {
  const record=state.history.find(r=>r.id===recordId); if(!record) return;
  state.modifyTarget=recordId;
  document.getElementById('modify-modal-title').textContent=`✏ ${record.dayId} — ${record.dayName}`;
  renderModifyBody(record);
  document.getElementById('modify-modal').style.display='flex';
}

function renderModifyBody(record) {
  const body=document.getElementById('modify-modal-body'); body.innerHTML='';
  // Date editor
  const dateRow=document.createElement('div');
  dateRow.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border)';
  dateRow.innerHTML=`<label style="font-size:11px;letter-spacing:1px;color:var(--text-dim);font-family:var(--font-head),sans-serif;font-weight:700;">DATE</label>
    <input type="date" id="modify-date-input" value="${record.date||''}"
      style="background:rgba(102,128,204,.12);border:1px solid var(--border);border-radius:var(--radius-sm);
      padding:6px 10px;color:var(--text);font-family:var(--font-head),sans-serif;font-size:15px;font-weight:600;outline:none;flex:1"/>`;
  body.appendChild(dateRow);
  (record.exercises||[]).forEach((ex,idx)=>{
    const setLogs=record.setLogs||{};
    const exSets=setLogs[ex.id]||[];
    // Look up set count: from exercise record, then PROGRAM, then logged count, minimum 1
    const progEx = PROGRAM.flatMap(d=>(d.blocks||[]).flatMap(b=>b.exercises||[])).find(e=>e.id===ex.id);
    const numSets = Math.max(ex.sets || (progEx&&progEx.sets) || 1, exSets.length || 0, 1);
    const isCardio = ex.type==='cardio' || ex.type==='check' || ex.bodyweight===true && !ex.sets || ex.duration && !ex.sets;
    let chips='';
    if (isCardio) {
      const logged=exSets[0];
      chips=`<div class="set-chip ${logged?'logged':''}" onclick="openHistorySetModal(${record.id},'${ex.id}',0)">${logged?`${logged.weight||0}min`:ex.duration||'Log'}</div>`;
    } else {
      for(let s=0;s<numSets;s++){
        const logged=exSets[s]&&exSets[s].weight!=null?exSets[s]:null;
        const label=logged?`${logged.weight}kg × ${logged.reps}`:`Set ${s+1}`;
        const cls=logged?'set-chip logged':'set-chip';
        chips+=`<div class="${cls}" onclick="openHistorySetModal(${record.id},'${ex.id}',${s})">${label}</div>`;
      }
    }
    const row=document.createElement('div'); row.className='modify-ex-row';
    row.innerHTML=`
      <div class="modify-ex-top">
        <div class="modify-ex-check ${ex.checked?'checked':''}" id="mcheck-${idx}"
          onclick="toggleModifyCheck(${record.id},${idx},this)">${ex.checked?'✓':''}</div>
        <div class="modify-ex-name">${ex.name}</div>
        <button class="modify-ex-delete" onclick="confirmDeleteExercise(${record.id},${idx})" title="Delete exercise">✕</button>
      </div>
      ${chips?`<div class="ex-sets-row modify-sets-row">${chips}</div>`:''}`;
    body.appendChild(row);
  });
}

// Open set-log modal for a history record (#4)
function openHistorySetModal(recordId, exId, setIndex) {
  const record=state.history.find(r=>r.id===recordId); if(!record) return;
  const ex=(record.exercises||[]).find(e=>e.id===exId); if(!ex) return;
  state.historySetTarget={recordId, exId, setIndex};
  const setLogs=record.setLogs||{};
  const prev=(setLogs[exId]||[])[setIndex];
  document.getElementById('modal-ex-name').textContent=`${ex.name} — Set ${setIndex+1}`;
  document.getElementById('modal-prefill-hint').textContent='';
  document.getElementById('modal-weight').value=prev?prev.weight:'';
  document.getElementById('modal-reps').value=prev?prev.reps:(ex.reps||'');
  document.getElementById('set-modal').style.display='flex';
  setTimeout(()=>document.getElementById('modal-weight').focus(),100);
}
function confirmHistorySet() {
  const {recordId,exId,setIndex}=state.historySetTarget||{}; if(!recordId) return;
  const record=state.history.find(r=>r.id===recordId); if(!record) return;
  const weight=parseFloat(document.getElementById('modal-weight').value)||0;
  const reps=parseInt(document.getElementById('modal-reps').value)||0;
  if(!record.setLogs) record.setLogs={};
  if(!record.setLogs[exId]) record.setLogs[exId]=[];
  record.setLogs[exId][setIndex]={weight,reps};
  closeModal();
  state.historySetTarget=null;
  renderModifyBody(record);
  save();
}

function toggleModifyCheck(recordId,idx,el) {
  const r=state.history.find(r=>r.id===recordId); if(!r||!r.exercises[idx]) return;
  r.exercises[idx].checked=!r.exercises[idx].checked;
  el.classList.toggle('checked',r.exercises[idx].checked);
  el.textContent=r.exercises[idx].checked?'✓':'';
}

function saveModify() {
  const r=state.history.find(r=>r.id===state.modifyTarget);
  if(r) {
    // Save date change
    const dateInput = document.getElementById('modify-date-input');
    if (dateInput && dateInput.value) r.date = dateInput.value;
    if(r.exercises) {
      const nc={}; r.exercises.forEach(ex=>{ nc[ex.id]=ex.checked; }); r.checks=nc;
      if(r.weekKey===state.currentWeekKey&&state.weekSessions[r.dayId]) {
        state.weekSessions[r.dayId].exercises=JSON.parse(JSON.stringify(r.exercises));
        state.weekSessions[r.dayId].checks=nc;
      }
    }
  }
  save(); closeModifyModal();
  if(state.currentView==='history') renderHistory();
  buildHomeDayCards();
}

function closeModifyModal() {
  document.getElementById('modify-modal').style.display='none';
  state.modifyTarget=null;
}

// ── DELETE EXERCISE (#5) ──────────────────────
function confirmDeleteExercise(recordId, idx) {
  state.deleteTarget={type:'exercise', recordId, idx};
  document.getElementById('delete-confirm-msg').textContent='Delete this exercise from the session? This cannot be undone.';
  document.getElementById('delete-confirm-modal').style.display='flex';
}

function executeDeleteExercise() {
  const {recordId,idx}=state.deleteTarget||{};
  const record=state.history.find(r=>r.id===recordId); if(!record) return;
  const ex=record.exercises[idx];
  if(ex&&record.setLogs) delete record.setLogs[ex.id];
  record.exercises.splice(idx,1);
  const nc={}; record.exercises.forEach(e=>{ nc[e.id]=e.checked; }); record.checks=nc;
  save(); driveBackup(true);
  closeDeleteConfirm();
  renderModifyBody(record);
}

// ── DELETE SESSION (#5) ───────────────────────
function confirmDeleteSession(recordId) {
  state.deleteTarget={type:'session', recordId};
  document.getElementById('delete-confirm-msg').textContent='Delete this entire session? This cannot be undone.';
  document.getElementById('delete-confirm-modal').style.display='flex';
}

function executeDelete() {
  const {type,recordId}=state.deleteTarget||{};
  if(type==='session') {
    const deleted = state.history.find(r=>r.id===recordId);
    const deletedDate = deleted ? deleted.date : null;
    state.history=state.history.filter(r=>r.id!==recordId);
    // Decrement streak if this was the only session on its date
    if (deletedDate && !state.history.find(h=>h.date===deletedDate)) {
      state.streak = Math.max(0, state.streak - 1);
      const sc = document.getElementById('streak-count');
      if (sc) sc.textContent = state.streak;
    }
    // Remove from weekSessions if current week
    Object.keys(state.weekSessions).forEach(k=>{
      if(state.weekSessions[k].id===recordId) delete state.weekSessions[k];
    });
    save(); driveBackup(true);
    closeDeleteConfirm(); closeModifyModal();
    renderHistory(); buildHomeDayCards();
  } else if(type==='exercise') {
    executeDeleteExercise();
  }
}

function closeDeleteConfirm() {
  document.getElementById('delete-confirm-modal').style.display='none';
  state.deleteTarget=null;
}

// ── EXERCISE GUIDE (v0.9.3 — replaces info modal) ──
function getExInfo(name) { return EX_INFO[name.toLowerCase().trim()]||null; }

// Resolve a video target for an exercise: custom saved > direct yt property > EX_INFO default
function guideVideoTarget(name, ex) {
  const custom = state.ytLinks && state.ytLinks[name];
  if (custom) return custom;
  if (ex && ex.yt) return ex.yt;
  const info = getExInfo(name);
  return info ? (info.yt || '') : '';
}

function guideShortDesc(ex, blockType) {
  const info = getExInfo(ex.name);
  if (info && info.muscles) return info.muscles.toLowerCase();
  if (ex.note) return ex.note;
  if (blockType === 'warmup') return 'Warm-up movement';
  if (blockType === 'cardio') return 'Cardio';
  return '';
}

function openGuide() {
  if (!state.workoutDay) return;
  renderGuide();
  showView('guide');
}
function closeGuide() { showView('workout'); }

function renderGuide() {
  const day = state.workoutDay;
  document.getElementById('guide-sub').textContent = day.name;
  const wrap = document.getElementById('guide-list');
  let html = '';
  day.blocks.forEach(block => {
    html += `<div class="guide-section-label">${block.title}</div>`;
    (block.exercises||[]).forEach(ex => {
      const rid = 'gx-' + ex.id;
      const vid = guideVideoTarget(ex.name, ex);
      const info = getExInfo(ex.name);
      const desc = guideShortDesc(ex, block.type);
      const cues = info && info.cues ? info.cues.map(c=>`<div class="gx-cue">• ${c}</div>`).join('')
                 : `<div class="gx-cue" style="color:var(--text-dim)">No detailed notes for this one.</div>`;
      const warn = info && info.note ? `<div class="gx-warn">${info.note}</div>` : '';
      const presc = ex.prescription + (ex.note ? ' — ' + ex.note : '');
      const vidBtn = vid
        ? `<a class="gx-vid watch" id="${rid}-vidbtn" href="${makeYtHref(vid)}"
             onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></a>`
        : `<button class="gx-vid add" id="${rid}-vidbtn"
             onclick="event.stopPropagation();guideOpenEdit('${rid}')">+</button>`;
      html += `<div class="gx" id="${rid}" data-exname="${ex.name.replace(/"/g,'&quot;')}">
        <div class="gx-row" onclick="guideToggle('${rid}')">
          <div class="gx-main">
            <div class="gx-name">${ex.name}</div>
            <div class="gx-desc">${desc}</div>
          </div>
          ${vidBtn}
          <div class="gx-divider"></div>
          <div class="gx-chev">▼</div>
        </div>
        <div class="gx-detail">
          <div class="gx-presc">${presc}</div>
          ${cues}
          ${warn}
          <button class="gx-editlink" id="${rid}-editlink"
            onclick="event.stopPropagation();guideOpenEdit('${rid}')">${vid?'✏ Edit video link':'+ Add video link'}</button>
          <div class="gx-edit" id="${rid}-edit" style="display:none">
            <input type="text" class="gx-input" id="${rid}-input" placeholder="YouTube URL or search query"/>
            <div class="gx-edit-btns">
              <button class="gx-btn cancel" onclick="event.stopPropagation();guideCancelEdit('${rid}')">Cancel</button>
              <button class="gx-btn confirm" onclick="event.stopPropagation();guideSaveLink('${rid}')">Save</button>
            </div>
          </div>
        </div>
      </div>`;
    });
  });
  wrap.innerHTML = html;
}

function guideToggle(rid) { document.getElementById(rid).classList.toggle('open'); }

function guideOpenEdit(rid) {
  const row = document.getElementById(rid);
  row.classList.add('open');
  const name = row.dataset.exname;
  document.getElementById(rid+'-input').value = (state.ytLinks && state.ytLinks[name]) || '';
  document.getElementById(rid+'-edit').style.display = 'block';
  document.getElementById(rid+'-editlink').style.display = 'none';
}

function guideCancelEdit(rid) {
  document.getElementById(rid+'-edit').style.display = 'none';
  document.getElementById(rid+'-editlink').style.display = 'block';
}

function guideSaveLink(rid) {
  const row = document.getElementById(rid);
  const name = row.dataset.exname;
  const val = document.getElementById(rid+'-input').value.trim();
  if (!state.ytLinks) state.ytLinks = {};
  if (val) state.ytLinks[name] = val; else delete state.ytLinks[name];
  save();
  renderGuide(); // re-render: button flips between + and ▶, edit panel closes
}

// ── CALENDAR ─────────────────────────────────
function calPrev() { state.calMonth--; if(state.calMonth<0){state.calMonth=11;state.calYear--;} renderCalendar(); }
function calNext() { state.calMonth++; if(state.calMonth>11){state.calMonth=0;state.calYear++;} renderCalendar(); }

function highlightHistoryDate(date) {
  // Wait for history to render, then scroll to and highlight matching entry
  requestAnimationFrame(() => {
    const rows = document.querySelectorAll('.history-entry');
    let found = null;
    rows.forEach(row => {
      row.style.outline = '';
      if (row.dataset.date === date) found = row;
    });
    if (found) {
      found.style.outline = '1px solid var(--pink)';
      found.style.borderRadius = '12px';
      found.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { found.style.outline = ''; }, 3000);
    }
  });
}
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
    if(days.length){
      cell.style.cursor='pointer';
      cell.addEventListener('click', ()=>{ showView('history'); highlightHistoryDate(ds); });
    }
    grid.appendChild(cell);
  }
  const tail=(7-(startOffset+daysInMonth)%7)%7;
  for(let i=0;i<tail;i++){ const e=document.createElement('div');e.className='cal-cell empty';grid.appendChild(e); }
}

// ── STATS ─────────────────────────────────────
function renderStats() {
  renderBodyStatsSummary();
  renderBodyStatsDualChart();
  renderBodyStatsTendency();
  renderBodyStatsHistory();
  // Build custom exercise picker
  const names=new Set();
  state.history.forEach(h=>{ (h.exercises||[]).forEach(ex=>{ if(ex.setLogs&&ex.setLogs.some(s=>s&&s.weight>0)) names.add(ex.name); }); });
  const dropdown=document.getElementById('stats-picker-dropdown');
  const label=document.getElementById('stats-picker-label');
  if (!dropdown || !label) return;
  dropdown.innerHTML='';
  if(!names.size){
    label.textContent='No data yet';
  } else {
    const sorted=[...names].sort();
    // Set default selection if none
    if(!state.statsPickerSelected||![...names].includes(state.statsPickerSelected))
      state.statsPickerSelected=sorted[0];
    label.textContent=state.statsPickerSelected;
    sorted.forEach(n=>{
      const opt=document.createElement('div');
      opt.className='stats-picker-option'+(n===state.statsPickerSelected?' selected':'');
      opt.textContent=n;
      opt.onclick=()=>{ state.statsPickerSelected=n; label.textContent=n;
        document.getElementById('stats-picker-dropdown').style.display='none';
        document.getElementById('stats-picker-arrow') && (document.querySelector('.stats-picker-arrow').textContent='▼');
        renderProgressChart(); };
      dropdown.appendChild(opt);
    });
  }
  renderProgressChart(); renderTonnageChart();
}
function toggleStatsPicker() {
  const dd=document.getElementById('stats-picker-dropdown');
  const arrow=document.querySelector('.stats-picker-arrow');
  const open=dd.style.display==='none';
  dd.style.display=open?'':'none';
  if(arrow) arrow.textContent=open?'▲':'▼';
}

function renderBodyStatsTendency() {
  const el = document.getElementById('body-stats-tendency');
  if (!el) return;
  if (state.bodyStats.length < 1) { el.style.display = 'none'; return; }

  const now = new Date();
  const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 3);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Per-metric: use last 3 months if 2+ entries, else fall back to all-time oldest vs newest
  function metricTrend(metric) {
    const all = state.bodyStats.filter(e => e[metric] != null);
    if (all.length === 0) return null; // no data at all
    const recent = all.filter(e => e.date >= cutoffStr);
    const newest = all[0]; // most recent overall
    const oldest = recent.length >= 2 ? recent[recent.length - 1] : all[all.length - 1];
    if (newest[metric] === oldest[metric]) return { val: null, fallback: false };
    const pct = ((newest[metric] - oldest[metric]) / Math.abs(oldest[metric]) * 100).toFixed(1);
    return { val: parseFloat(pct), fallback: recent.length < 2 };
  }

  function chip(label, trend, invert) {
    if (!trend) return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-family:'Exo 2',sans-serif;font-size:13px;">
      <span style="color:var(--text-dim);font-size:11px;letter-spacing:.5px;">${label}</span>
      <span style="color:var(--text-dim);font-weight:600;">--</span>
    </span>`;
    const { val, fallback } = trend;
    if (val == null) return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-family:'Exo 2',sans-serif;font-size:13px;">
      <span style="color:var(--text-dim);font-size:11px;letter-spacing:.5px;">${label}</span>
      <span style="color:var(--text-dim);font-weight:600;">--</span>
    </span>`;
    const positive = invert ? val < 0 : val > 0;
    const color = positive ? themeColor('--chart-pos') : themeColor('--chart-neg');
    const arrow = val > 0 ? '↑' : '↓';
    const note = fallback ? '<span style="font-size:9px;opacity:.5;margin-left:2px">*</span>' : '';
    return `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;font-family:'Exo 2',sans-serif;font-size:13px;">
      <span style="color:var(--text-dim);font-size:11px;letter-spacing:.5px;">${label}</span>
      <span style="color:${color};font-weight:600;">${arrow}${Math.abs(val)}%${note}</span>
    </span>`;
  }

  const wChip  = chip('WEIGHT',  metricTrend('weight'), true);
  const bfChip = chip('B-F',     metricTrend('bf'),     true);
  const mChip  = chip('M-MASS',  metricTrend('muscle'), false);

  el.style.display = 'block';
  el.innerHTML = `<div style="font-family:var(--font-head),sans-serif;font-size:10px;letter-spacing:1px;color:var(--text-dim);margin-bottom:6px;">LAST 3 MONTHS</div><div>${wChip}${bfChip}${mChip}</div>`;
}

function renderBodyWeightChart() {
  // Replaced by renderBodyStatsDualChart below
}
function renderBodyStatsDualChart(all) {
  const canvas = document.getElementById('body-weight-canvas');
  if (!canvas) return;
  if (!state.bodyStats.length) { canvas.style.display='none'; return; }
  canvas.style.display='block';
  const entries = all ? [...state.bodyStats].reverse() : [...state.bodyStats].slice(0,6).reverse();
  const labels  = entries.map(e=>e.date);
  const weights = entries.map(e=>e.weight);
  const bfs     = entries.map(e=>e.bf);
  const muscles = entries.map(e=>e.muscle);
  const hasBf   = bfs.some(v=>v!=null);
  const hasMuscle = muscles.some(v=>v!=null);
  drawDualLineChart(canvas, labels, weights, hasBf ? bfs : null, false, hasMuscle ? muscles : null);
}
function drawDualLineChart(canvas, labels, weights, bfs, tall, muscles) {
  if (!canvas) return;
  if (!canvas.offsetParent && !tall) return; // not visible yet
  const dpr=window.devicePixelRatio||1, W=canvas.offsetWidth||340, H=tall?320:200;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,W,H);
  const p={top:28,right:(bfs||muscles)?40:16,bottom:36,left:44};
  const cw=W-p.left-p.right, ch=H-p.top-p.bottom;
  const n=labels.length;
  const xPos=i=>p.left+i/(n-1||1)*cw;

  // Weight line (green, left axis) — scale includes muscle mass for shared axis
  const validW=weights.filter(v=>v!=null);
  const validM=muscles ? muscles.filter(v=>v!=null) : [];
  if(validW.length){
    const allLeft=[...validW,...validM];
    const wMin=Math.min(...allLeft)*0.95, wMax=Math.max(...allLeft)*1.03, wRng=wMax-wMin||1;
    const yw=v=>p.top+ch-(v-wMin)/wRng*ch;
    ctx.beginPath(); ctx.moveTo(xPos(0),yw(weights[0]));
    weights.forEach((v,i)=>ctx.lineTo(xPos(i),yw(v)));
    ctx.lineTo(xPos(n-1),p.top+ch); ctx.lineTo(xPos(0),p.top+ch); ctx.closePath();
    ctx.fillStyle=themeRGBA('--chart-weight-rgb',0.1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(xPos(0),yw(weights[0]));
    weights.forEach((v,i)=>ctx.lineTo(xPos(i),yw(v)));
    ctx.strokeStyle=themeColor('--chart-weight'); ctx.lineWidth=2; ctx.lineJoin='round'; ctx.stroke();
    weights.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(xPos(i),yw(v),3,0,Math.PI*2);ctx.fillStyle=themeColor('--chart-weight');ctx.fill();});
    ctx.fillStyle=themeRGBA('--chart-weight-rgb',0.7); ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='right';
    [0,.5,1].forEach(t=>{const v=wMin+wRng*t; ctx.fillText(Math.round(v*10)/10,p.left-4,yw(v)+4);});
    ctx.fillStyle=themeRGBA('--chart-weight-rgb',0.5); ctx.font='10px '+headFont()+',sans-serif'; ctx.textAlign='left';
    ctx.fillText('kg',2,p.top+ch/2);

    // Muscle mass line (pale green, thin dashed) — same left axis scale
    if(muscles && muscles.some(v=>v!=null)){
      ctx.beginPath(); let ms=false;
      muscles.forEach((v,i)=>{if(v==null)return; if(!ms){ctx.moveTo(xPos(i),yw(v));ms=true;}else ctx.lineTo(xPos(i),yw(v));});
      ctx.strokeStyle=themeColor('--chart-muscle'); ctx.lineWidth=0.75; ctx.lineJoin='round'; ctx.setLineDash([4,3]); ctx.stroke();
      ctx.setLineDash([]);
      muscles.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(xPos(i),yw(v),2,0,Math.PI*2);ctx.fillStyle=themeColor('--chart-muscle');ctx.fill();});
    }
  }

  // BF% line (pink) — own scale
  if(bfs && bfs.some(v=>v!=null)){
    const bfVals=bfs.filter(v=>v!=null);
    const bfMin=Math.min(...bfVals)*0.95, bfMax=Math.max(...bfVals)*1.05, bfRng=bfMax-bfMin||1;
    const ybf=v=>p.top+ch-(v-bfMin)/bfRng*ch;
    ctx.beginPath(); let s=false;
    bfs.forEach((v,i)=>{if(v==null)return; if(!s){ctx.moveTo(xPos(i),ybf(v));s=true;}else ctx.lineTo(xPos(i),ybf(v));});
    ctx.strokeStyle=themeColor('--chart-bf'); ctx.lineWidth=0.75; ctx.lineJoin='round'; ctx.stroke();
    bfs.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(xPos(i),ybf(v),2,0,Math.PI*2);ctx.fillStyle=themeColor('--chart-bf');ctx.fill();});
    ctx.fillStyle=themeRGBA('--chart-bf-rgb',0.7); ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='left';
    [0,.5,1].forEach(t=>{const v=bfMin+bfRng*t; ctx.fillText(Math.round(v*10)/10+'%',W-p.right+4,ybf(v)+4);});
  }


  // X axis labels
  ctx.fillStyle=themeRGBA('--text-dim-rgb',0.8); ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='center';
  const step=Math.max(1,Math.floor(n/4));
  labels.forEach((l,i)=>{if(i===0||i===n-1||i%step===0) ctx.fillText(l.slice(-5),xPos(i),H-8);});

  // Legend
  ctx.font='10px '+headFont()+',sans-serif'; ctx.textAlign='left';
  let lx=p.left;
  ctx.fillStyle=themeColor('--chart-weight'); ctx.fillText('● Weight',lx,14); lx+=60;
  if(bfs&&bfs.some(v=>v!=null)){ctx.fillStyle=themeColor('--chart-bf'); ctx.fillText('● Body fat',lx,14); lx+=65;}
  if(muscles&&muscles.some(v=>v!=null)){ctx.fillStyle=themeColor('--chart-muscle'); ctx.fillText('● Muscle mass',lx,14);}
}

function renderBodyStatsHistory() {
  const el = document.getElementById('body-stats-history');
  if (!el) return;
  if (!state.bodyStats.length) { el.innerHTML=''; return; }
  const open = el.dataset.open === '1';
  const entries = state.bodyStats.slice(0,6);
  const rows = open ? entries.map(e=>{
    const parts = [
      e.weight!=null ? e.weight+'kg'         : null,
      e.bf!=null     ? e.bf+'% b-f'          : null,
      e.muscle!=null ? e.muscle+'kg m-mass'  : null,
    ].filter(Boolean).join(' / ');
    return `
    <div class="bs-history-row">
      <span class="bs-history-date" onclick="openBodyStatsModal('${e.date}')" style="cursor:pointer">${e.date}</span>
      <span class="bs-history-vals" onclick="openBodyStatsModal('${e.date}')" style="cursor:pointer;flex:1">${parts || '—'}</span>
      <button onclick="deleteBodyStatEntry('${e.date}')" style="background:none;border:none;color:var(--pink2);font-size:16px;padding:0 4px;cursor:pointer;flex-shrink:0;">✕</button>
    </div>`;
  }).join('') : '';
  el.innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px">
      <div class="bs-history-toggle" onclick="toggleBodyStatsHistory()" style="padding:8px 0">
        <span class="bs-history-label">Body stats history</span>
        <span class="bs-history-arrow">${open?'▲':'▼'}</span>
      </div>
      <button class="bs-full-history-btn" onclick="openFullStatsChart()">Full history graph ↗</button>
    </div>
    ${open?`<div class="bs-history-list">${rows}</div>`:''}`;
}
function renderBodyStatsMetricHistory() {
  const el = document.getElementById('body-stats-metric-history');
  if (!el || !state.bodyStats.length) { if(el) el.innerHTML=''; return; }

  function recentFor(metric, unit, label) {
    const vals = state.bodyStats.filter(e => e[metric] != null).slice(0, 3);
    if (!vals.length) return '';
    const rows = vals.map(e =>
      `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
        <span style="color:var(--text-dim)">${e.date}</span>
        <span style="color:var(--text);font-weight:600">${e[metric]}${unit}</span>
       </div>`).join('');
    return `<div style="flex:1;min-width:0">
      <div style="font-family:var(--font-head),sans-serif;font-weight:700;font-size:10px;letter-spacing:1px;color:var(--text-dim);margin-bottom:4px">${label}</div>
      ${rows}
    </div>`;
  }

  const w  = recentFor('weight', 'kg',  'WEIGHT');
  const bf = recentFor('bf',     '% bf','BODY FAT');
  const m  = recentFor('muscle', 'kg',  'MUSCLE');

  if (!w && !bf && !m) { el.innerHTML=''; return; }

  el.innerHTML = `<div style="display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:8px">
    ${w}${bf}${m}
  </div>`;
}

function deleteBodyStatEntry(date) {
  appConfirm('DELETE ENTRY', `Delete body stats entry for ${date}?`, () => {
    state.bodyStats = state.bodyStats.filter(e => e.date !== date);
    save();
    if (state.currentView === 'stats') renderStats();
    renderSubHeader();
  }, 'DELETE', 'CANCEL');
}

function openFullStatsChart() {
  const overlay = document.getElementById('full-stats-overlay');
  overlay.style.display = 'flex';
  const canvas = document.getElementById('full-stats-canvas');
  if (!canvas || !state.bodyStats.length) return;
  const entries = [...state.bodyStats].reverse();
  const labels  = entries.map(e=>e.date);
  const weights = entries.map(e=>e.weight);
  const bfs     = entries.map(e=>e.bf);
  const muscles = entries.map(e=>e.muscle);
  const hasBf   = bfs.some(v=>v!=null);
  const hasMuscle = muscles.some(v=>v!=null);
  requestAnimationFrame(()=> drawDualLineChart(canvas, labels, weights, hasBf ? bfs : null, true, hasMuscle ? muscles : null));
}
function closeFullStatsChart() {
  document.getElementById('full-stats-overlay').style.display = 'none';
}
function toggleBodyStatsHistory() {
  const el=document.getElementById('body-stats-history');
  el.dataset.open = el.dataset.open==='1' ? '0' : '1';
  renderBodyStatsHistory();
}
function renderProgressChart() {
  const name=state.statsPickerSelected;
  const canvas=document.getElementById('stats-canvas'), empty=document.getElementById('stats-empty');
  if(!canvas||!empty) return;
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
  drawLineChart(canvas,points.map(p=>p.date),points.map(p=>p.w),name,'kg',themeColor('--chart-weight'),themeRGBA('--chart-weight-rgb',0.15));
}
function checkDeload() {
  const weeks=[]; for(let i=7;i>=0;i--){ const d=new Date();d.setDate(d.getDate()-i*7);weeks.push(getWeekKey(d)); }
  const values=weeks.map(wk=>
    Math.round(state.history.filter(h=>h.weekKey===wk).reduce((a,h)=>
      a+Object.values(h.setLogs||{}).reduce((b,sets)=>
        b+sets.reduce((c,s)=>c+(s&&s.weight&&s.reps?s.weight*s.reps:0),0),0),0))
  );
  const nonZero=values.filter(v=>v>0);
  return nonZero.length>=3&&nonZero[nonZero.length-1]>nonZero[nonZero.length-2]&&nonZero[nonZero.length-2]>nonZero[nonZero.length-3];
}
function dismissDeload() {
  state.deloadDismissedWeek = todayStr();
  updateDeloadNotices();
}
function updateDeloadNotices() {
  const due = checkDeload();
  const dismissed = state.deloadDismissedWeek === todayStr();
  const show = due && !dismissed;
  const msg = '⚠️ Deload week due — 3 weeks of rising load';
  const statsNotice = document.getElementById('deload-notice');
  const homeNotice  = document.getElementById('home-deload-notice');
  if (statsNotice) { statsNotice.style.display=show?'':'none'; statsNotice.textContent=msg; }
  if (homeNotice)  {
    homeNotice.style.display = show ? '' : 'none';
    homeNotice.innerHTML = show
      ? `<span>${msg}</span><button class="deload-dismiss" onclick="dismissDeload()">✕</button>`
      : '';
  }
}
function renderTonnageChart() {
  const canvas=document.getElementById('volume-canvas');
  if(!canvas) return;
  const weeks=[]; for(let i=7;i>=0;i--){ const d=new Date();d.setDate(d.getDate()-i*7);weeks.push(getWeekKey(d)); }
  const labels=weeks.map(w=>w.replace(/.*-W/,'W'));
  const currentWeek=getWeekKey(new Date());
  const values=weeks.map(wk=>
    Math.round(state.history.filter(h=>h.weekKey===wk).reduce((a,h)=>
      a+Object.values(h.setLogs||{}).reduce((b,sets)=>
        b+sets.reduce((c,s)=>c+(s&&s.weight&&s.reps?s.weight*s.reps:0),0),0),0))
  );
  updateDeloadNotices();
  const colors=weeks.map(w=>w===currentWeek?themeColor('--chart-neg'):themeColor('--chart-pos'));
  drawBarChart(canvas,labels,values,'kg lifted',colors);
}
function drawBarChart(canvas,labels,values,title,colors){
  if (!canvas) return;
  const dpr=window.devicePixelRatio||1,W=canvas.offsetWidth||340,H=170;
  canvas.width=W*dpr;canvas.height=H*dpr;canvas.style.width=W+'px';canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
  const p={top:28,right:12,bottom:28,left:50};
  const cw=W-p.left-p.right,ch=H-p.top-p.bottom,mx=Math.max(...values,1);
  const bw=cw/labels.length*0.55,gap=cw/labels.length;
  // Y axis gridlines + labels
  [0,0.25,0.5,0.75,1].forEach(t=>{
    const v=Math.round(mx*t);
    const y=p.top+ch-t*ch;
    ctx.strokeStyle=themeRGBA('--header-rgb',0.15);ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(p.left,y);ctx.lineTo(p.left+cw,y);ctx.stroke();
    ctx.fillStyle=themeRGBA('--text-dim-rgb',0.7);ctx.font='9px Exo 2,sans-serif';ctx.textAlign='right';
    ctx.fillText(v>999?Math.round(v/100)/10+'t':v,p.left-4,y+3);
  });
  // Bars
  const colorArr=Array.isArray(colors)?colors:labels.map(()=>colors||themeColor('--chart-pos'));
  values.forEach((v,i)=>{
    if(v===0) return;
    const bx=p.left+i*gap+(gap-bw)/2,bh=v/mx*ch,by=p.top+ch-bh;
    const col=colorArr[i]||themeColor('--chart-pos');
    ctx.fillStyle=col+'88';ctx.beginPath();
    ctx.roundRect?ctx.roundRect(bx,by,bw,bh,3):ctx.rect(bx,by,bw,bh);
    ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.stroke();
    // Value label above bar
    ctx.fillStyle=col;ctx.font='9px Exo 2,sans-serif';ctx.textAlign='center';
    ctx.fillText(v>999?Math.round(v/100)/10+'t':v,bx+bw/2,by-4);
  });
  // X axis labels
  ctx.fillStyle=themeRGBA('--text-dim-rgb',0.7);ctx.font='10px Exo 2,sans-serif';ctx.textAlign='center';
  labels.forEach((l,i)=>ctx.fillText(l,p.left+i*gap+gap/2,H-6));
  // Title
  ctx.fillStyle=themeRGBA('--text-dim-rgb',0.5);ctx.font='10px '+headFont()+',sans-serif';ctx.textAlign='left';ctx.fillText(title,p.left,16);
}
function drawLineChart(canvas,labels,values,title,unit,lineColor,fillColor){
  if (!canvas) return;
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
  ctx.fillStyle=themeRGBA('--text-dim-rgb',0.8);ctx.font='10px Exo 2,sans-serif';ctx.textAlign='center';
  const step=Math.max(1,Math.floor(labels.length/4));
  labels.forEach((l,i)=>{if(i===0||i===labels.length-1||i%step===0)ctx.fillText(l.slice(-5),x(i),H-8);});
  ctx.textAlign='right';[0,.5,1].forEach(t=>{const v=mn+rng*t;ctx.fillStyle=themeRGBA('--text-dim-rgb',0.8);ctx.fillText(Math.round(v)+unit,p.left-4,y(v)+4);});
  ctx.fillStyle=themeRGBA('--text-dim-rgb',0.6);ctx.font='11px '+headFont()+',sans-serif';ctx.textAlign='left';ctx.fillText(title,p.left,16);
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

function makeYtHref(urlOrQuery) {
  // Use intent:// URI to open YouTube app directly on Android
  if (!urlOrQuery) return '#';
  const fullUrl = urlOrQuery.startsWith('http')
    ? urlOrQuery
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(urlOrQuery)}`;
  // intent:// URI scheme: opens YouTube app, falls back to browser
  try {
    const u = new URL(fullUrl);
    const intentUrl = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(fullUrl)};end`;
    return intentUrl;
  } catch(e) {
    return fullUrl;
  }
}
// ── GYM EQUIPMENT (v0.9.1) ───────────────────
const GYM_EQUIPMENT_DEFAULT = [
  { cat: 'Cardio', items: [
    'Stairmaster',
    'Treadmill',
    'Upright bike',
    'Cross-trainer',
  ]},
  { cat: 'Free Weights', items: [
    'Barbells + plates',
    'Dumbbells',
    'Olympic bench press',
    'Incline bench',
    'Deadlift platforms',
  ]},
  { cat: 'Machines', items: [
    'Lat pulldown (cable)',
    'Assisted chin/dip machine',
    '5-station cable machine',
    'Plate-loaded chest press',
    'Plate-loaded shoulder press',
    'Hack squat',
    'Leg press',
    'Prone leg curl',
    'Abductor / adductor machine',
  ]},
  { cat: 'Other', items: [
    'SkiErg',
    'Swiss balls',
  ]},
];

function loadGymEquipment() {
  try {
    const saved = localStorage.getItem('gymdolph_equipment');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return JSON.parse(JSON.stringify(GYM_EQUIPMENT_DEFAULT));
}
function saveGymEquipment(data) {
  localStorage.setItem('gymdolph_equipment', JSON.stringify(data));
}

function openGymEquipment() {
  document.getElementById('gym-equipment-overlay').style.display = 'flex';
  renderGymEquipmentList();
}
function closeGymEquipment() {
  // Save any in-progress inline edits first
  commitAllInlineEdits();
  document.getElementById('gym-equipment-overlay').style.display = 'none';
}

function renderGymEquipmentList() {
  const data = loadGymEquipment();
  const container = document.getElementById('gym-equipment-list');
  container.innerHTML = '';

  data.forEach((section, catIdx) => {
    // Category header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;margin-top:' + (catIdx > 0 ? '20px' : '4px');
    header.innerHTML = `
      <div style="font-family:var(--font-head),sans-serif;font-size:11px;font-weight:700;
        letter-spacing:3px;color:var(--header)">${section.cat.toUpperCase()}</div>
      <button onclick="addEquipmentItem(${catIdx})"
        style="background:rgba(119,253,1,.12);border:1px solid rgba(119,253,1,.3);
        border-radius:20px;color:var(--green2);font-size:12px;padding:3px 10px;
        cursor:pointer;font-family:var(--font-head),sans-serif;font-weight:700;letter-spacing:1px">+ ADD</button>`;
    container.appendChild(header);

    // Items
    const list = document.createElement('div');
    list.id = `eq-cat-${catIdx}`;
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:4px';

    section.items.forEach((item, itemIdx) => {
      list.appendChild(makeEquipmentRow(catIdx, itemIdx, item));
    });
    container.appendChild(list);
  });
}

function makeEquipmentRow(catIdx, itemIdx, text) {
  const row = document.createElement('div');
  row.id = `eq-row-${catIdx}-${itemIdx}`;
  row.style.cssText = 'display:flex;align-items:center;gap:8px;background:var(--card-bg);' +
    'border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;';

  const label = document.createElement('div');
  label.style.cssText = 'flex:1;font-size:13px;color:var(--text);';
  label.textContent = text;

  const editBtn = document.createElement('button');
  editBtn.textContent = '✏';
  editBtn.style.cssText = 'background:none;border:none;color:var(--text-dim);font-size:13px;' +
    'cursor:pointer;padding:2px 4px;flex-shrink:0;';
  editBtn.onclick = () => startInlineEdit(catIdx, itemIdx, text);

  const delBtn = document.createElement('button');
  delBtn.textContent = '✕';
  delBtn.style.cssText = 'background:none;border:none;color:var(--pink2);font-size:13px;' +
    'cursor:pointer;padding:2px 4px;flex-shrink:0;opacity:.6;';
  delBtn.onclick = () => deleteEquipmentItem(catIdx, itemIdx);

  row.appendChild(label);
  row.appendChild(editBtn);
  row.appendChild(delBtn);
  return row;
}

function startInlineEdit(catIdx, itemIdx, currentText) {
  const row = document.getElementById(`eq-row-${catIdx}-${itemIdx}`);
  if (!row) return;
  row.innerHTML = '';
  row.style.cssText = 'display:flex;align-items:center;gap:8px;background:rgba(102,128,204,.2);' +
    'border:1px solid var(--green2);border-radius:var(--radius-sm);padding:6px 10px;';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.style.cssText = 'flex:1;background:none;border:none;color:var(--text);font-size:13px;' +
    'font-family:"Exo 2",sans-serif;outline:none;padding:4px 0;';
  input.dataset.catIdx = catIdx;
  input.dataset.itemIdx = itemIdx;
  input.className = 'eq-inline-input';

  const saveBtn = document.createElement('button');
  saveBtn.textContent = '✓';
  saveBtn.style.cssText = 'background:none;border:none;color:var(--green);font-size:16px;' +
    'cursor:pointer;padding:2px 4px;flex-shrink:0;font-weight:700;';
  saveBtn.onclick = () => saveInlineEdit(catIdx, itemIdx, input.value);

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = '✕';
  cancelBtn.style.cssText = 'background:none;border:none;color:var(--pink2);font-size:13px;' +
    'cursor:pointer;padding:2px 4px;flex-shrink:0;';
  cancelBtn.onclick = () => renderGymEquipmentList();

  row.appendChild(input);
  row.appendChild(saveBtn);
  row.appendChild(cancelBtn);
  setTimeout(() => input.focus(), 50);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveInlineEdit(catIdx, itemIdx, input.value);
    if (e.key === 'Escape') renderGymEquipmentList();
  });
}

function saveInlineEdit(catIdx, itemIdx, newText) {
  const val = newText.trim();
  if (!val) { renderGymEquipmentList(); return; }
  const data = loadGymEquipment();
  data[catIdx].items[itemIdx] = val;
  saveGymEquipment(data);
  renderGymEquipmentList();
}

function commitAllInlineEdits() {
  document.querySelectorAll('.eq-inline-input').forEach(input => {
    const catIdx  = parseInt(input.dataset.catIdx);
    const itemIdx = parseInt(input.dataset.itemIdx);
    const val = input.value.trim();
    if (val) {
      const data = loadGymEquipment();
      if (data[catIdx] && data[catIdx].items[itemIdx] !== undefined) {
        data[catIdx].items[itemIdx] = val;
        saveGymEquipment(data);
      }
    }
  });
}

function addEquipmentItem(catIdx) {
  const data = loadGymEquipment();
  data[catIdx].items.push('');
  saveGymEquipment(data);
  const newIdx = data[catIdx].items.length - 1;
  renderGymEquipmentList();
  // Immediately open inline edit for the new empty item
  startInlineEdit(catIdx, newIdx, '');
  // Scroll to the new item
  setTimeout(() => {
    const row = document.getElementById(`eq-row-${catIdx}-${newIdx}`);
    if (row) row.scrollIntoView({behavior:'smooth', block:'nearest'});
  }, 80);
}

function deleteEquipmentItem(catIdx, itemIdx) {
  const data = loadGymEquipment();
  data[catIdx].items.splice(itemIdx, 1);
  saveGymEquipment(data);
  renderGymEquipmentList();
}

// ── GOOGLE DRIVE SYNC (v0.9) ──────────────────
// Steps: console.cloud.google.com → New Project → Enable Drive API →
//        Credentials → Create OAuth2 Client ID (Web application) →
//        Add your GitHub Pages URL to Authorised JavaScript origins.
const GYMDOLPH_CLIENT_ID = '1073159142976-jk3anq5bq70khcvenpa7g1ndptmijffk.apps.googleusercontent.com';
const DRIVE_SCOPE        = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FOLDER_ID    = '14l1-IRGbunMd30zTSQcb09Wd-gQVBzlG'; // Gym Dolph - App / JSON backup
const BACKUP_FILENAME    = 'gymdolph-backup.json';

// Drive state persisted in localStorage
function driveDataPayload() {
  return JSON.stringify({
    version:      '0.9.3',
    exportedAt:   new Date().toISOString(),
    history:      state.history,
    streak:       state.streak,
    weekKey:      state.currentWeekKey,
    weekSessions: state.weekSessions,
    ytLinks:      state.ytLinks || {},
    bodyStats:    state.bodyStats || [],
    sessions:     state.sessions || {},
    program:      PROGRAM,
  }, null, 2);
}

function driveConnected() { return driveState.isValid(); }

// Render current Drive connection state into Settings UI
function renderDriveStatus() {
  const connected = driveConnected();
  const elDis = document.getElementById('drive-disconnected');
  const elCon = document.getElementById('drive-connected');
  if (!elDis || !elCon) return;
  elDis.style.display = connected ? 'none' : '';
  elCon.style.display = connected ? ''     : 'none';
  if (connected) {
    document.getElementById('drive-account-name').textContent = driveState.account || '';
    const lb = driveState.lastBackup;
    document.getElementById('last-backup-time').textContent =
      lb ? new Date(lb).toLocaleString('en-AU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
  }
}

// OAuth2 implicit flow — opens Google popup, stores token
function driveConnect() {
  if (!GYMDOLPH_CLIENT_ID || GYMDOLPH_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    driveToast('Client ID not set — see INSTALL.md', true); return;
  }
  const params = new URLSearchParams({
    client_id:     GYMDOLPH_CLIENT_ID,
    redirect_uri:  location.origin + location.pathname,
    response_type: 'token',
    scope:         DRIVE_SCOPE,
    include_granted_scopes: 'true',
    state:         'drive_auth',
  });
  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
  // Store flag so we handle redirect on return
  sessionStorage.setItem('gd_auth_pending', '1');
  location.href = authUrl;
}

// Handle OAuth2 redirect — called on DOMContentLoaded
function driveHandleRedirect() {
  if (!location.hash || !sessionStorage.getItem('gd_auth_pending')) return;
  sessionStorage.removeItem('gd_auth_pending');
  const params = new URLSearchParams(location.hash.slice(1));
  const token  = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '3600');
  if (!token) return;
  driveState.token  = token;
  driveState.expiry = Date.now() + expiresIn * 1000;
  // Clean hash from URL without reload
  history.replaceState(null, '', location.pathname);
  // Fetch account email
  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + token }
  }).then(r => r.json()).then(info => {
    driveState.account = info.email || '';
    renderDriveStatus();
    driveToast('Google Drive connected ✓');
    // Auto-backup immediately on first connect
    driveBackup(true);
  }).catch(() => { renderDriveStatus(); });
}

function driveDisconnect() {
  // Drive disconnect — handled via appConfirm below
  appConfirm('DISCONNECT DRIVE', 'Auto-backup will stop. Your local data is not affected.', _doDriveDisconnect, 'DISCONNECT', 'CANCEL'); }
function _doDriveDisconnect() {
  driveState.token   = null;
  driveState.expiry  = 0;
  driveState.fileId  = null;
  driveState.account = null;
  renderDriveStatus();
  driveToast('Google Drive disconnected');
}

// Find or create the backup file in specific Drive folder
async function driveGetOrCreateFileId(token) {
  if (driveState.fileId) return driveState.fileId;
  // Search within the specific folder
  const search = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and '${DRIVE_FOLDER_ID}' in parents and trashed=false&fields=files(id)`,
    { headers: { Authorization: 'Bearer ' + token } }
  );
  const data = await search.json();
  if (data.files && data.files.length > 0) {
    driveState.fileId = data.files[0].id;
    return driveState.fileId;
  }
  // Create file inside the folder
  const meta = { name: BACKUP_FILENAME, parents: [DRIVE_FOLDER_ID] };
  const create = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method:  'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body:    JSON.stringify(meta),
  });
  const file = await create.json();
  driveState.fileId = file.id;
  return driveState.fileId;
}

// Core backup — silent=true suppresses toast on auto-triggers
async function driveBackup(silent) {
  if (!driveConnected()) return;
  const token = driveState.token;
  driveSetSyncing(true);
  try {
    const fileId  = await driveGetOrCreateFileId(token);
    const payload = driveDataPayload();
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method:  'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body:    payload,
      }
    );
    driveState.lastBackup = new Date().toISOString();
    renderDriveStatus();
    if (!silent) driveToast('Backup saved to Drive ✓');
  } catch(e) {
    if (!silent) driveToast('Backup failed — check connection', true);
    console.error('Drive backup error:', e);
  } finally {
    driveSetSyncing(false);
  }
}

// Restore — always manual, always confirms
async function driveRestore() {
  if (!driveConnected()) { driveToast('Not connected to Drive', true); return; }
  appConfirm('RESTORE FROM DRIVE', 'This will replace ALL current data on this device with the last backup. This cannot be undone.', _doDriveRestore, 'RESTORE', 'CANCEL'); }
async function _doDriveRestore() {
  const token = driveState.token;
  driveSetSyncing(true);
  try {
    const fileId = await driveGetOrCreateFileId(token);
    const res    = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) throw new Error('File not found');
    const data = await res.json();
    state.history      = data.history      || [];
    state.streak       = data.streak       || 0;
    state.weekSessions = data.weekSessions || {};
    state.ytLinks      = data.ytLinks      || {};
    state.bodyStats    = data.bodyStats    || [];
    state.sessions     = data.sessions     || {};
    if (Array.isArray(data.program) && data.program.length === 7) {
      PROGRAM = data.program;
      localStorage.setItem('gymdolph_program', JSON.stringify(PROGRAM));
    }
    if (data.weekKey) state.currentWeekKey = data.weekKey;
    document.getElementById('streak-count').textContent = state.streak;
    save(); renderHistory(); buildHomeDayCards();
    driveToast('Data restored from Drive ✓');
  } catch(e) {
    driveToast('Restore failed — no backup found?', true);
    console.error('Drive restore error:', e);
  } finally {
    driveSetSyncing(false);
  }
}

// UI helpers
function driveSetSyncing(on) {
  const dot   = document.getElementById('drive-dot');
  const label = document.getElementById('drive-status-label');
  const bkBtn = document.getElementById('drive-backup-btn');
  const rsBtn = document.getElementById('drive-restore-btn');
  if (!dot) return;
  if (on) {
    dot.className   = 'drive-status-dot syncing';
    if (label) label.textContent = 'Syncing…';
    if (bkBtn) { bkBtn.disabled = true; bkBtn.dataset.orig = bkBtn.textContent; bkBtn.textContent = 'Backing up…'; }
    if (rsBtn) rsBtn.disabled = true;
  } else {
    dot.className   = 'drive-status-dot connected';
    if (label) label.textContent = 'Connected';
    if (bkBtn) { bkBtn.disabled = false; bkBtn.textContent = bkBtn.dataset.orig || 'Back Up Now'; }
    if (rsBtn) rsBtn.disabled = false;
  }
}

let _driveToastTimer;
function driveToast(msg, isError) {
  let el = document.getElementById('drive-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'drive-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className   = 'drive-toast show' + (isError ? ' error' : '');
  clearTimeout(_driveToastTimer);
  _driveToastTimer = setTimeout(() => { el.className = 'drive-toast'; }, 2800);
}

// ── SETTINGS ──────────────────────────────────
function toggleAdvanced(btn) {
  const panel = document.getElementById('advanced-panel');
  const open  = panel.style.display === 'none';
  panel.style.display = open ? '' : 'none';
  btn.textContent     = open ? 'Advanced ▾' : 'Advanced ▸';
}
function clearHistory() {
  appConfirm('CLEAR HISTORY', 'Delete all workout history? This cannot be undone.', () => {
    state.history=[]; state.streak=0; state.weekSessions={};
    document.getElementById('streak-count').textContent='0';
    save();
    driveBackup(true);
    renderHistory(); buildHomeDayCards();
  });
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
      function doImport() {
        if(Array.isArray(data)){
          state.history=data;
        }else{
          state.history=data.history||[]; state.streak=data.streak||0;
          state.weekSessions=data.weekSessions||{};
          state.ytLinks=data.ytLinks||{};
          state.bodyStats=data.bodyStats||[];
          state.sessions=data.sessions||{};
          if(data.weekKey) state.currentWeekKey=data.weekKey;
        }
        document.getElementById('streak-count').textContent=state.streak;
        save(); renderHistory(); buildHomeDayCards();
        appAlert('IMPORT SUCCESSFUL', 'Your data has been imported.');
      }
      const count = Array.isArray(data) ? data.length : (data.history||[]).length;
      appConfirm('IMPORT DATA', `Import ${count} session(s)? This will replace your current data.`, doImport, 'IMPORT', 'CANCEL');
    }catch(err){ appAlert('IMPORT FAILED', 'Invalid JSON file — no data was changed.'); }
    e.target.value='';
  };
  reader.readAsText(file);
}
// ═══════════════════════════════════════════════
// AI INFRASTRUCTURE (v0.9.3 — #25)
// ═══════════════════════════════════════════════

// Health constraints — injected into EVERY AI system prompt (coach, silent check, editor)
// AI_CONSTRAINTS, USER_NAME and USER_GYM are defined in profile.js

// ── AI COACH BINDING (v0.9.7) ──────────────────────────────────────────────
// Every AI system prompt is bound to the live athlete, assembled from:
//   athlete_profile.js  → name + gym + athlete profile + health constraints
//   app-state pointer   → current training phase (resolved against gym_program.js)
//   gym_program.js      → current program (this week's structure)
// Identity comes ONLY from athlete_profile.js, so one app can never give the
// other person's advice. Phase + optional blocks are presence-driven.
function currentPhaseInfo() {
  try {
    const phases = (typeof PROGRAM_DATA !== 'undefined' && Array.isArray(PROGRAM_DATA.phases)) ? PROGRAM_DATA.phases : [];
    if (!phases.length) return null;                         // no phases defined → omit (presence-driven)
    const wk = (typeof state !== 'undefined' && state.programWeek) ? state.programWeek : null;
    if (!wk) return null;                                    // no current-phase pointer yet
    return phases.find(ph => wk >= (ph.weekStart || 1) && wk <= (ph.weekEnd || 9999)) || null;
  } catch (e) { return null; }
}
function programSummary() {
  try {
    return PROGRAM.map(function(d){
      const t = d.type || 'training';
      const ex = (d.blocks || []).reduce(function(a,b){ return a.concat((b.exercises||[]).map(function(e){return e.name;})); }, []).slice(0,6);
      return '- ' + d.name + ' [' + t + ']' + (ex.length ? ': ' + ex.join(', ') : '');
    }).join('\n');
  } catch (e) { return '(program unavailable)'; }
}
function buildAthleteBinding() {
  let b = '';
  if (typeof USER_NAME !== 'undefined' && USER_NAME) b += 'You are coaching ' + USER_NAME + '.\n';
  if (typeof USER_GYM !== 'undefined' && USER_GYM)   b += 'Gym: ' + USER_GYM + '.\n';
  if (typeof ATHLETE_PROFILE !== 'undefined' && ATHLETE_PROFILE) b += 'Athlete profile: ' + ATHLETE_PROFILE + '\n';
  if (typeof AI_CONSTRAINTS !== 'undefined' && AI_CONSTRAINTS)   b += '\n' + AI_CONSTRAINTS + '\n';
  const ph = currentPhaseInfo();
  if (ph) b += '\nCurrent training phase: ' + ph.name + ' (' + (ph.setsReps||'') + ', ' + (ph.intensity||'') + ', focus: ' + (ph.focus||'') + ').\n';
  b += '\nCurrent program (this week):\n' + programSummary() + '\n';
  return b;
}

// ── EXPORT PROGRAM (v0.9.7) — serialise live program to a ready-to-commit gym_program.js ──
function exportProgram() {
  try {
    const base = (typeof PROGRAM_DATA !== 'undefined' && PROGRAM_DATA) ? PROGRAM_DATA : {};
    const obj = Object.assign({}, base, { days: PROGRAM });
    const header =
      '// Gym Dolph — Layer 3: Program\n' +
      '// window.PROGRAM = { ... } — exported from the app (v' + (typeof APP_VERSION!=='undefined'?APP_VERSION:'') + ').\n' +
      '// Drop straight into the repo root on GitHub. No identity, no styling.\n\n';
    const text = header + 'window.PROGRAM = ' + JSON.stringify(obj, null, 2) + ';\n';
    const blob = new Blob([text], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gym_program.js';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 150);
  } catch (e) { console.warn('exportProgram failed', e); }
}

const AI_MODEL = 'claude-sonnet-4-5';
const AI_KEY_STORE = 'gymdolph_apikey';

function getApiKey()  { return localStorage.getItem(AI_KEY_STORE) || ''; }
function aiEnabled()  { return !!getApiKey(); }

function saveApiKey() {
  const inp = document.getElementById('ai-key-input');
  const val = (inp.value || '').trim();
  const err = document.getElementById('ai-settings-error');
  if (!val.startsWith('sk-ant-') || val.length < 20) {
    err.textContent = "🔑 That doesn't look like an Anthropic key. It should start with sk-ant- and have no extra spaces.";
    err.style.display = 'block';
    return;
  }
  localStorage.setItem(AI_KEY_STORE, val);
  inp.value = ''; err.style.display = 'none';
  renderAiSettings(); updateAiGatedUI();
}

function removeApiKey() {
  appConfirm('REMOVE API KEY', 'AI features will turn off until you add a key again.', _doRemoveApiKey, 'REMOVE', 'CANCEL'); }
function _doRemoveApiKey() {
  localStorage.removeItem(AI_KEY_STORE);
  state._aiKeyShown = false;
  renderAiSettings(); updateAiGatedUI();
}

function toggleApiKeyVisibility() {
  state._aiKeyShown = !state._aiKeyShown;
  renderAiSettings();
}

function maskKey(k) {
  if (k.length <= 11) return k;
  return k.slice(0, 7) + '••••••••••••' + k.slice(-4);
}

function renderAiSettings() {
  const key = getApiKey();
  document.getElementById('ai-nokey').style.display  = key ? 'none' : 'block';
  document.getElementById('ai-haskey').style.display = key ? 'block' : 'none';
  if (key) {
    document.getElementById('ai-key-display').textContent = state._aiKeyShown ? key : maskKey(key);
    document.getElementById('ai-key-toggle').textContent  = state._aiKeyShown ? 'hide key' : 'show key';
  }
}

// Friendly error text — same wording everywhere
function aiErrorText(kind) {
  if (kind === 'auth')    return "🔑 That key didn't work. Check it in Settings → AI, then try again.";
  if (kind === 'network') return "📡 No connection — coaching needs internet. Your workout logging still works offline.";
  if (kind === 'rate')    return "⏳ Claude is busy right now. Wait a few seconds and tap again.";
  return "⚠ Something went wrong talking to Claude. Try again in a moment.";
}

// Shared API helper — ALL AI calls go through here.
// Returns { ok:true, text } or { ok:false, kind, message }
async function callClaude(systemPrompt, messages, maxTokens) {
  const key = getApiKey();
  if (!key) return { ok:false, kind:'auth', message: aiErrorText('auth') };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: maxTokens || 500,
        system: systemPrompt + '\n\n' + buildAthleteBinding(),
        messages: messages
      })
    });
    if (res.status === 401 || res.status === 403)
      return { ok:false, kind:'auth', message: aiErrorText('auth') };
    if (res.status === 429)
      return { ok:false, kind:'rate', message: aiErrorText('rate') };
    if (!res.ok)
      return { ok:false, kind:'other', message: aiErrorText('other') };
    const data = await res.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return { ok:true, text };
  } catch (e) {
    return { ok:false, kind:'network', message: aiErrorText('network') };
  }
}

// ═══════════════════════════════════════════════
// FORM COACHING ASSISTANT (v0.9.3 — #2)
// ═══════════════════════════════════════════════

const COACH_SYSTEM = `You are the form coach inside Gym Dolph, a personal workout tracker.
The lifter follows the Training for the New Alpinism protocol: primary compounds 4x4 stopping 1-2 reps before failure, accessories 3x8-10, progressive overload of +2.5kg only when all sets complete cleanly.
PT-flagged movements (require PT supervision before loading up): barbell RDL, barbell bent-over row, lat pulldown, barbell bench press, hack squat, leg press, dumbbell shoulder press.
Be concise: maximum 80 words, plain text, no greetings, no sign-offs, no markdown, no bullet lists. Speak directly like a coach between sets.`;

function findBlockOfEx(exId) {
  if (!state.workoutDay || !state.workoutDay.blocks) return null;
  return state.workoutDay.blocks.find(b => (b.exercises||[]).some(e => e.id === exId)) || null;
}
function findExById(exId) {
  const b = findBlockOfEx(exId);
  return b ? b.exercises.find(e => e.id === exId) : null;
}

function fmtSets(logs) {
  return (logs||[]).filter(s=>s&&s.reps!=null)
    .map((s,i)=>s.weight>0?`${s.weight}kg x ${s.reps}`:`${s.reps} reps`).join(', ') || 'none yet';
}

// Full history for ONE exercise only (per spec — not whole history)
function exerciseHistoryFor(name) {
  const rows = [];
  state.history.forEach(rec => {
    const found = (rec.exercises||[]).find(e => e.name === name);
    if (found && found.weight) rows.push(`${rec.date}: ${found.weight}`);
  });
  return rows.slice(0, 12).join('\n') || 'no history';
}

function todaysOtherSets(excludeExId) {
  if (!state.workoutDay) return 'none';
  const sess = getSession(state.workoutDay.id);
  const out = [];
  state.workoutDay.blocks.forEach(b => (b.exercises||[]).forEach(e => {
    if (e.id === excludeExId) return;
    const f = fmtSets((sess.setLogs||{})[e.id]);
    if (f !== 'none yet') out.push(`${e.name}: ${f}`);
  }));
  return out.join('\n') || 'none';
}

function coachContextFor(exId) {
  const ex = findExById(exId);
  if (!ex) return '';
  const sess = getSession(state.workoutDay.id);
  return `Exercise: ${ex.name}
Prescription: ${ex.prescription}${ex.note ? ' — ' + ex.note : ''}
Today's sets for this exercise: ${fmtSets((sess.setLogs||{})[ex.id])}
History for this exercise:
${exerciseHistoryFor(ex.name)}
Other sets logged today:
${todaysOtherSets(ex.id)}`;
}

// ── Rest window coach ──
function resetRestCoachUI() {
  const n = document.getElementById('rest-coach-note');
  const b = document.getElementById('rest-coach-btn');
  const l = document.getElementById('rest-coach-loading');
  if (n) { n.style.display='none'; n.innerHTML=''; }
  if (l) l.style.display='none';
  if (b) b.style.display = aiEnabled() ? 'flex' : 'none';
}

async function restCoachAsk() {
  const ctx = state._restCoachCtx;
  if (!ctx) return;
  const btn = document.getElementById('rest-coach-btn');
  const load = document.getElementById('rest-coach-loading');
  const note = document.getElementById('rest-coach-note');
  btn.style.display='none'; load.style.display='flex';
  const res = await callClaude(
    COACH_SYSTEM + '\nThe lifter just logged a set and is resting. Give one short coaching note for the next set.',
    [{role:'user', content: coachContextFor(ctx.exId)}], 300);
  load.style.display='none';
  note.style.display='block';
  note.innerHTML = res.ok
    ? `<span class="coach-tag">COACH</span>${escapeCoach(res.text)}`
    : `<span class="coach-tag">COACH</span>${res.message}`;
}

// ── Silent check (app-initiated, once per exercise per session) ──
async function runSilentCheck(exId) {
  if (!aiEnabled() || !state.workoutDay) return;
  if (state._editingHistoryId) return; // never fire while editing a past session
  const block = findBlockOfEx(exId);
  if (!block || (block.type !== 'main' && block.type !== 'secondary')) return; // warm-up & cardio: no API call
  const sess = getSession(state.workoutDay.id);
  sess.aiChecked = sess.aiChecked || {};
  if (sess.aiChecked[exId]) return; // one call per exercise per session
  sess.aiChecked[exId] = true; save();

  const sys = COACH_SYSTEM + `
You are running a SILENT background safety check on a just-completed exercise.
Respond with exactly the single word SILENT unless one of these four triggers applies:
1. Constraint breach — the movement or load conflicts with the shoulder or lower-back rules.
2. Suspicious weight jump vs history — likely typo or risky progression.
3. A PT-flagged movement loaded significantly beyond +2.5kg/week progression.
4. Reps collapsing across sets on a constraint-adjacent lift.
Do NOT speak for: progression praise, motivation, weight-increase suggestions, warm-up nagging, aesthetics.
If a trigger applies, give one short warning (max 70 words) starting directly with the issue.`;

  const res = await callClaude(sys, [{role:'user', content: coachContextFor(exId)}], 220);
  if (!res.ok) return; // errors are silent too
  const txt = res.text.trim();
  if (!txt || txt.toUpperCase().startsWith('SILENT')) return; // silence rule
  const row = document.getElementById('exrow-' + exId);
  if (!row) return;
  const holder = row.querySelector('.ex-info');
  if (!holder || holder.querySelector('.silent-warn')) return;
  const div = document.createElement('div');
  div.className = 'silent-warn';
  div.innerHTML = `<span class="coach-tag">⚠ COACH — SAFETY CHECK</span>${escapeCoach(txt)}
    <button class="dismiss" onclick="this.parentElement.remove()">dismiss</button>`;
  holder.appendChild(div);
}

// ── Freeform ask ──
function toggleAskCoach() {
  const p = document.getElementById('ask-coach-panel');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
  if (p.style.display === 'block') document.getElementById('ask-coach-input').focus();
}

async function submitAskCoach() {
  const inp = document.getElementById('ask-coach-input');
  const q = (inp.value||'').trim();
  if (!q) return;
  const load = document.getElementById('ask-coach-loading');
  const note = document.getElementById('ask-coach-note');
  const err  = document.getElementById('ask-coach-error');
  note.style.display='none'; err.style.display='none'; load.style.display='flex';
  const ctxDay = state.workoutDay
    ? `Current session: ${state.workoutDay.name}\nSets logged so far:\n${todaysOtherSets('__none__')}`
    : 'No session open right now.';
  const res = await callClaude(
    COACH_SYSTEM + '\nThe lifter asks a freeform question mid-workout. Answer it directly.',
    [{role:'user', content: ctxDay + '\n\nQuestion: ' + q}], 350);
  load.style.display='none';
  if (res.ok) {
    note.innerHTML = `<span class="coach-tag">COACH</span>${escapeCoach(res.text)}`;
    note.style.display='block';
  } else {
    err.textContent = res.message; err.style.display='block';
  }
}

// ── Session wrap-up ──
function openSessionComplete() {
  const f = state._lastFinished; if (!f) return;
  document.getElementById('session-complete-sub').textContent =
    `${f.dayName} · ${f.durationStr} · ${f.setCount} sets logged`;
  document.getElementById('wrapup-btn').style.display='flex';
  document.getElementById('wrapup-note').style.display='none';
  document.getElementById('wrapup-error').style.display='none';
  document.getElementById('wrapup-loading').style.display='none';
  document.getElementById('session-complete-modal').style.display='flex';
}
function closeSessionComplete() {
  document.getElementById('session-complete-modal').style.display='none';
}

async function sessionWrapUp() {
  const f = state._lastFinished; if (!f) return;
  const btn = document.getElementById('wrapup-btn');
  const load = document.getElementById('wrapup-loading');
  const note = document.getElementById('wrapup-note');
  const err  = document.getElementById('wrapup-error');
  btn.style.display='none'; err.style.display='none'; load.style.display='flex';
  const lines = f.exercises
    .filter(e=>e.checked || e.weight)
    .map(e=>`${e.name}: ${e.weight || 'done'}\nHistory: ${exerciseHistoryFor(e.name)}`)
    .join('\n');
  const res = await callClaude(
    COACH_SYSTEM + '\nThe session just finished. Give a short wrap-up: what was earned, what to hold, anything to flag for PT. Max 100 words.',
    [{role:'user', content:`Session: ${f.dayName} (${f.durationStr})\n${lines}`}], 400);
  load.style.display='none';
  if (res.ok) {
    note.innerHTML = `<span class="coach-tag">COACH — WRAP-UP</span>${escapeCoach(res.text)}`;
    note.style.display='block';
  } else {
    err.textContent = res.message; err.style.display='block';
    btn.style.display='flex';
  }
}

// Basic HTML escape for coach output
function escapeCoach(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ── AI UI gating ──
function updateAiGatedUI() {
  const on = aiEnabled();
  document.querySelectorAll('.ai-gated').forEach(el => {
    el.style.display = on ? (el.classList.contains('guide-entry-btn') || el.classList.contains('coach-btn') ? 'flex' : 'block') : 'none';
  });
  if (!on) {
    const p = document.getElementById('ask-coach-panel');
    if (p) p.style.display = 'none';
  }
  const lh = document.getElementById('pe-locked-hint');
  if (lh) lh.style.display = on ? 'none' : 'block';
}
window.addEventListener('DOMContentLoaded', updateAiGatedUI);

// ═══════════════════════════════════════════════
// NATURAL LANGUAGE PROGRAM EDITOR (v0.9.3 — #3)
// ═══════════════════════════════════════════════

let peHistory = [];      // conversation, cleared on settings exit
let pePendingChange = null;

const PE_SYSTEM_BASE = `You are the program editor inside Gym Dolph, a personal workout tracker.
You edit the user's 7-day training program, provided below as JSON.

SCOPE — you may do (Tier A): swap an exercise, change sets x reps, add or remove an exercise from a day. (Tier B): reorder exercises within a day, rewrite a whole day.
OUT OF SCOPE (Tier C): moving days around the week, changing a day's session type, redesigning the week structure. Politely refuse Tier C and mention it's planned for v1.0 with the Melbourne program.

RESPONSE FORMAT — respond ONLY with valid JSON, no markdown fences, no other text:
{"reply": "<short conversational reply, max 60 words>",
 "change": null OR {"summary": "<exact change in one line, e.g. D1: Cable Crossover -> Dumbbell Flyes, 3x12-15 unchanged>",
                    "days": [<the COMPLETE updated day object(s) for only the day(s) that change, same schema as input>]}}

RULES:
- Never include a change object unless the user asked for a concrete edit.
- Keep every unrelated field of a day exactly as it was (ids, colors, types, blocks, notes, bodyweight flags, yt links).
- New exercises need: id (new unique string), name, prescription, sets, reps, and note if useful.
- If a request conflicts with the health constraints, set change to null, explain why in reply, and offer a compliant alternative.
- If the request is ambiguous, ask one clarifying question (change null).`;

function peSystemPrompt() {
  return PE_SYSTEM_BASE + '\n\nCURRENT PROGRAM:\n' + JSON.stringify(PROGRAM);
}

function peReset() {
  peHistory = []; pePendingChange = null;
  const chat = document.getElementById('pe-chat');
  if (!chat) return;
  chat.innerHTML = `<div class="pe-msg claude"><span class="who">EDITOR</span>Tell me what to change in your program — swap an exercise, change sets×reps, add or remove something, or rewrite a day. I'll show you the exact change before anything is saved.</div>`;
}

function peAddMsg(cls, html) {
  const chat = document.getElementById('pe-chat');
  const d = document.createElement('div');
  d.innerHTML = html;
  chat.appendChild(d.firstElementChild);
  chat.scrollTop = chat.scrollHeight;
}

async function peSend() {
  const inp = document.getElementById('pe-input');
  const q = (inp.value||'').trim();
  if (!q) return;
  inp.value = '';
  const sendBtn = document.getElementById('pe-send');
  sendBtn.disabled = true;
  peAddMsg('user', `<div class="pe-msg user">${escapeCoach(q)}</div>`);
  peAddMsg('claude', `<div class="pe-msg claude" id="pe-thinking"><span class="who">EDITOR</span><span class="coach-dots"><span></span><span></span><span></span></span></div>`);
  peHistory.push({role:'user', content:q});

  const res = await callClaude(peSystemPrompt(), peHistory, 2000);
  const think = document.getElementById('pe-thinking');
  if (think) think.remove();
  sendBtn.disabled = false;

  if (!res.ok) {
    peAddMsg('claude', `<div class="pe-msg claude refusal"><span class="who">EDITOR</span>${res.message}</div>`);
    peHistory.pop(); // let them retry the same instruction
    return;
  }
  let parsed = null;
  try {
    parsed = JSON.parse(res.text.replace(/```json|```/g,'').trim());
  } catch(e) {
    peAddMsg('claude', `<div class="pe-msg claude refusal"><span class="who">EDITOR</span>I got a reply I couldn't read. Try rephrasing the instruction.</div>`);
    peHistory.pop();
    return;
  }
  peHistory.push({role:'assistant', content:res.text});
  const isRefusal = !parsed.change;
  peAddMsg('claude', `<div class="pe-msg claude ${isRefusal && /can't|cannot|refus|out of scope|v1\.0|constraint/i.test(parsed.reply||'') ? 'refusal' : ''}"><span class="who">EDITOR</span>${escapeCoach(parsed.reply||'')}</div>`);

  if (parsed.change && Array.isArray(parsed.change.days) && parsed.change.days.length) {
    pePendingChange = parsed.change;
    peAddMsg('change', `<div class="pe-change" id="pe-change-card">
      <div class="pc-title">CHANGE PREVIEW</div>
      <div class="pe-diff">${escapeCoach(parsed.change.summary||'')}</div>
      <div class="pe-actions">
        <button class="pe-btn cancel" onclick="peCancelChange()">Cancel</button>
        <button class="pe-btn apply" onclick="peApplyChange()">Apply</button>
      </div>
    </div>`);
  }
}

function peCancelChange() {
  pePendingChange = null;
  const card = document.getElementById('pe-change-card');
  if (card) card.remove();
}

function peApplyChange() {
  if (!pePendingChange) return;
  // sanity: every incoming day must match an existing day id and keep its type
  const valid = pePendingChange.days.every(d => {
    const cur = PROGRAM.find(p => p.id === d.id);
    return cur && d.name && d.type === cur.type && (Array.isArray(d.blocks) || Array.isArray(d.stretchPhases) || cur.type==='rest');
  });
  if (!valid) {
    peAddMsg('claude', `<div class="pe-msg claude refusal"><span class="who">EDITOR</span>That change didn't pass validation (day structure mismatch) — nothing was written. Try again.</div>`);
    peCancelChange();
    return;
  }
  // backup, then write
  localStorage.setItem('gymdolph_program_backup', JSON.stringify(PROGRAM));
  pePendingChange.days.forEach(d => {
    const idx = PROGRAM.findIndex(p => p.id === d.id);
    if (idx >= 0) PROGRAM[idx] = d;
  });
  localStorage.setItem('gymdolph_program', JSON.stringify(PROGRAM));
  if (state.workoutDay) state.workoutDay = PROGRAM.find(p => p.id === state.workoutDay.id) || null;
  buildHomeDayCards();
  const card = document.getElementById('pe-change-card');
  if (card) {
    card.querySelector('.pe-actions').outerHTML = '<div class="pe-applied">✓ Applied — previous program backed up</div>';
    card.id = '';
  }
  pePendingChange = null;
  peAddMsg('claude', `<div class="pe-msg claude"><span class="who">EDITOR</span>Done. "Restore previous program" below brings the old version back if it doesn't feel right.</div>`);
  driveBackup(true);
}

function peRestore() {
  const bk = localStorage.getItem('gymdolph_program_backup');
  if (!bk) { appAlert('NO BACKUP', 'No previous program saved yet — backups are created the first time you apply a change.'); return; }
  appConfirm('RESTORE PROGRAM', 'Swap back to the previous program?', _doRestoreProgram, 'RESTORE', 'CANCEL'); }
function _doRestoreProgram() {
  try {
    const restored = JSON.parse(bk);
    localStorage.setItem('gymdolph_program_backup', JSON.stringify(PROGRAM)); // enable undo of the restore
    PROGRAM = restored;
    localStorage.setItem('gymdolph_program', JSON.stringify(PROGRAM));
    if (state.workoutDay) state.workoutDay = PROGRAM.find(p => p.id === state.workoutDay.id) || null;
    buildHomeDayCards();
    appAlert('PROGRAM RESTORED', 'Previous program restored. Tap restore again to undo.');
    driveBackup(true);
  } catch(e) { appAlert('RESTORE FAILED', 'Backup data could not be read.'); }
}

// Enter key sends in program editor (v0.9.3)
window.addEventListener('DOMContentLoaded', () => {
  const pi = document.getElementById('pe-input');
  if (pi) pi.addEventListener('keydown', e => { if (e.key === 'Enter') peSend(); });
});


// ══════════════════════════════════════════
// HR MONITOR — Polar BLE (v0.9.5)
// Standard BLE Heart Rate Service (0x180D)
// Compatible with Polar H9/H10 and any
// standard Heart Rate Service BLE device
// ══════════════════════════════════════════

const HR = {
  device: null,
  characteristic: null,
  current: 0,
  connected: false,
  sessionReadings: [],
  sessionStart: null,
  intentionalDisconnect: false,
  _reconnectAttempts: 0,
  _reconnectTimer: null,
};

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// ── HR ZONE PERSONALISATION ──────────────
// Zones based on % of max HR (220 - age):
// Recovery:   50–60% max HR
// Aerobic:    60–75% max HR
// Anaerobic:  75–90% max HR
// VO2 Max:    90%+ max HR
// _hrZoneThresholds declared at top of file

// Exponential BPM → scroll duration. Slow at low HR, fast near VO2 max.
// target: 'widget' scrolls 1 cycle, 'focus' scrolls 8 cycles — scaled so the
// per-cycle visual speed matches between the two.
function scrollDurForBpm(bpm, target) {
  const max = _hrZoneThresholds.vo2max ? (_hrZoneThresholds.vo2max / 0.90) : 184; // recover max HR
  const restBpm = max * 0.45;
  const topBpm  = 170; // speed maxes out here
  let f = (bpm - restBpm) / (topBpm - restBpm);
  f = Math.max(0, Math.min(1, f));
  const eased = Math.pow(f, 2.2); // stays slow longer, then ramps up
  const slow = 6.0, fast = 2.0;   // per-cycle seconds
  const perCycle = slow + (fast - slow) * eased;
  const cycles = target === 'focus' ? 8 : 1;
  return (perCycle * cycles).toFixed(2) + 's';
}

function calcHRZones(age) {
  const max = 220 - age;
  return {
    max,
    recovery:   Math.round(max * 0.50),
    aerobic:    Math.round(max * 0.60),
    anaerobic:  Math.round(max * 0.75),
    vo2max:     Math.round(max * 0.90),
  };
}

function hrZonesToggle() {
  const panel = document.getElementById('hr-zones-panel');
  const arrow = document.getElementById('hr-zones-arrow');
  if (!panel) return;
  const open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

function updateHRZoneSettings() {
  const age = parseInt(document.getElementById('hr-age-input')?.value);
  // Update summary row
  const ageDisplay = document.getElementById('hr-zones-age-display');
  if (ageDisplay) ageDisplay.textContent = (age && age >= 10 && age <= 90) ? '· age ' + age : '';
  const table = document.getElementById('hr-zone-table');
  if (!age || age < 10 || age > 90) {
    if (table) table.innerHTML = '';
    return;
  }
  // Save age
  localStorage.setItem('gymdolph_hr_age', age);
  const z = calcHRZones(age);
  // Update live thresholds
  _hrZoneThresholds = { recovery: z.recovery, aerobic: z.aerobic, anaerobic: z.anaerobic, vo2max: z.vo2max };
  // Render zone table
  if (table) {
    const rows = [
      ['Resting',    '< ' + z.recovery,              'rgba(160,180,224,.5)'],
      ['Recovery',   z.recovery  + '–' + (z.aerobic-1),   themeColor('--zone-recovery')],
      ['Aerobic',    z.aerobic   + '–' + (z.anaerobic-1), themeColor('--zone-aerobic')],
      ['Anaerobic',  z.anaerobic + '–' + (z.vo2max-1),    themeColor('--zone-anaerobic')],
      ['VO2 Max',    z.vo2max + '+',                  themeColor('--zone-vo2')],
    ];
    table.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-top:4px;">' +
      rows.map(([name, range, colour]) =>
        `<span style="color:${colour};font-family:var(--font-head),sans-serif;font-weight:700;font-size:13px;letter-spacing:1px;">${name}</span>` +
        `<span style="color:var(--text-dim);font-family:var(--font-head),sans-serif;font-weight:600;font-size:13px;">${range} bpm</span>`
      ).join('') +
      `<span style="color:var(--text-dim);grid-column:1/-1;margin-top:6px;font-size:11px;">Max HR: ${z.max} bpm · based on 220 − age</span>` +
      '</div>';
  }
}

function loadHRAge() {
  const saved = localStorage.getItem('gymdolph_hr_age');
  if (saved) {
    const inp = document.getElementById('hr-age-input');
    if (inp) inp.value = saved;
    updateHRZoneSettings();
  }
}

function getHRZoneKey(bpm) {
  const t = _hrZoneThresholds;
  if (bpm < t.recovery)   return null; // resting
  if (bpm < t.aerobic)    return 'zone-recovery';
  if (bpm < t.anaerobic)  return 'zone-aerobic';
  if (bpm < t.vo2max)     return 'zone-anaerobic';
  return 'zone-vo2max';
}

function getHRZone(bpm) {
  const key = getHRZoneKey(bpm);
  const names = {
    null: 'Resting',
    'zone-recovery': 'Recovery',
    'zone-aerobic': 'Aerobic',
    'zone-anaerobic': 'Anaerobic',
    'zone-vo2max': 'VO2 Max',
  };
  return names[key] || 'Resting';
}

// All same smooth sine style — only amplitude varies
// ViewBox 0 0 64 56, midline y=28, two reps of 32px for seamless loop
const ECG_PATHS = {
  // Recovery ±6 — very gentle, fully smooth, no kinks
  'zone-recovery':
    'M 0,28 C 8,28 8,22 16,22 C 24,22 24,34 32,34 C 40,34 40,28 48,28 C 56,28 56,22 64,22',
  // Aerobic ±11
  'zone-aerobic':
    'M 0,28 C 8,28 8,17 16,17 C 24,17 24,39 32,39 C 40,39 40,28 48,28 C 56,28 56,17 64,17',
  // Anaerobic ±17
  'zone-anaerobic':
    'M 0,28 C 8,28 8,11 16,11 C 24,11 24,45 32,45 C 40,45 40,28 48,28 C 56,28 56,11 64,11',
  // VO2 max ±22
  'zone-vo2max':
    'M 0,28 C 8,28 8,6 16,6 C 24,6 24,50 32,50 C 40,50 40,28 48,28 C 56,28 56,6 64,6',
};

// ── ECG ANIMATION ────────────────────────
// CSS scrolls the SVG at constant speed (no JS phase = no seam stutter).
// JS only lerps amplitude between zones — path is redrawn at ~10fps,
// invisible because CSS scroll hides any single-frame redraw.
let _ecgAnimTimeout = null;
let _currentZoneKey = null;
let _ecgRafId       = null;
let _ecgAmp         = 0;
let _ecgTargetAmp   = 0;
let _ecgLastTs      = 0;

const ZONE_AMP = {
  null:            0,
  'zone-recovery': 6,
  'zone-aerobic':  12,
  'zone-anaerobic':18,
  'zone-vo2max':   23,
};
const ZONE_COLOUR = {
  'zone-recovery':  '#7EC8E3',
  'zone-aerobic':   '#BEFF89',
  'zone-anaerobic': '#BEFF89',
  'zone-vo2max':    '#FF6B6B',
};

// Build 4-cycle sine path, width=128, mid=28
function buildSinePath(amp) {
  const cycles = 4, w = 128, steps = 64;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const t = (i / steps) * Math.PI * 2 * cycles;
    const y = 28 - Math.sin(t) * amp;
    d += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ',' + y.toFixed(1);
  }
  return d;
}

// Wide path for the focus overlay — 16 cycles over 512 units, seamless loop
function buildSinePathWide(amp) {
  // 16 cycles, 32 steps per cycle = 512 steps total (clean multiple → perfect loop)
  const cycles = 16, w = 512, stepsPerCycle = 32, steps = cycles * stepsPerCycle;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const t = (i / steps) * Math.PI * 2 * cycles;
    const y = 28 - Math.sin(t) * amp;
    d += (i === 0 ? 'M ' : ' L ') + x.toFixed(2) + ',' + y.toFixed(2);
  }
  return d;
}

function ecgAmpFrame(ts) {
  const trace = document.getElementById('hr-ecg-trace');
  const focusTrace = document.getElementById('hr-focus-ecg-trace');
  if (!trace) { _ecgRafId = null; return; }
  const dt = Math.min((ts - (_ecgLastTs || ts)) / 1000, 0.1);
  _ecgLastTs = ts;
  _ecgAmp += (_ecgTargetAmp - _ecgAmp) * Math.min(2.5 * dt, 1);
  if (Math.abs(_ecgTargetAmp - _ecgAmp) > 0.1) {
    trace.setAttribute('d', buildSinePath(_ecgAmp));
    if (focusTrace) focusTrace.setAttribute('d', buildSinePathWide(_ecgAmp));
    _ecgRafId = requestAnimationFrame(ecgAmpFrame);
  } else {
    _ecgAmp = _ecgTargetAmp;
    trace.setAttribute('d', buildSinePath(_ecgAmp));
    if (focusTrace) focusTrace.setAttribute('d', buildSinePathWide(_ecgAmp));
    _ecgRafId = null;
  }
}

function startECGLerp() {
  if (_ecgRafId) return;
  _ecgLastTs = 0;
  _ecgRafId = requestAnimationFrame(ecgAmpFrame);
}

function stopECGLoop() {
  if (_ecgRafId) { cancelAnimationFrame(_ecgRafId); _ecgRafId = null; }
}

function triggerECGBurst() {
  // Brief amplitude overshoot for zone-transition feel
  _ecgAmp = Math.min(_ecgTargetAmp * 1.4, 26);
  startECGLerp();
}

function scheduleECGBurst() {
  clearTimeout(_ecgAnimTimeout);
  const delay = 5000 + Math.random() * 9000;
  _ecgAnimTimeout = setTimeout(() => {
    const pill = document.getElementById('hr-pill');
    if (pill && pill.classList.contains('visible')) triggerECGBurst();
    scheduleECGBurst();
  }, delay);
}

// ── HR WIDGET INTERACTION ────────────────
// Long press (600ms) = disconnect. Tap = nothing.
let _hrPressTimer = null;

function hrWidgetPointerDown(e) {
  if (e.button !== undefined && e.button !== 0) return;
  _hrPressTimer = setTimeout(() => {
    _hrPressTimer = null;
    disconnectHR();
  }, 600);
}

function hrWidgetPointerUp() {
  clearTimeout(_hrPressTimer);
  _hrPressTimer = null;
}

function hrWidgetTap(e) {
  // No-op — kept as onclick stub so drag detection still works
}

function updateHRPill(bpm) {
  const pill   = document.getElementById('hr-pill');
  const bpmEl  = document.getElementById('hr-pill-bpm');
  const zoneEl = document.getElementById('hr-pill-zone');
  if (!pill || !bpmEl) return;
  bpmEl.textContent = bpm;
  if (zoneEl) zoneEl.textContent = getHRZone(bpm);
  const zoneKey     = getHRZoneKey(bpm);
  const zoneChanged = zoneKey !== _currentZoneKey;
  ['zone-recovery','zone-aerobic','zone-anaerobic','zone-vo2max'].forEach(z =>
    pill.classList.toggle(z, z === zoneKey));
  // Widget scroll speed scales exponentially with BPM (slow at rest, fast at VO2 max)
  document.documentElement.style.setProperty('--ecg-widget-dur', scrollDurForBpm(bpm, 'widget'));
  // Update focus overlay if open
  updateHRFocusOverlay(bpm, zoneKey);
  _currentZoneKey   = zoneKey;
  _ecgTargetAmp     = ZONE_AMP[zoneKey] ?? 0;
  if (!pill.classList.contains('visible')) {
    pill.classList.add('visible');
    // Set initial path immediately
    const trace = document.getElementById('hr-ecg-trace');
    if (trace) trace.setAttribute('d', buildSinePath(_ecgTargetAmp));
    _ecgAmp = _ecgTargetAmp;
    makeDraggableWidget(pill, hrWidgetTap, true);
    scheduleECGBurst();
  } else if (zoneChanged) {
    triggerECGBurst(); // amplitude swell marks transition
  } else {
    startECGLerp(); // normal BPM update, just lerp if needed
  }
}
function openHRSheet() {
  const sheet = document.getElementById('hr-sheet');
  const backdrop = document.getElementById('hr-sheet-backdrop');
  if (!sheet || !backdrop) return;
  sheet.style.display = 'block';
  backdrop.style.display = 'block';
  updateHRSheetUI();
}
function closeHRSheet() {
  document.getElementById('hr-sheet').style.display = 'none';
  document.getElementById('hr-sheet-backdrop').style.display = 'none';
}

function updateHRSheetUI() {
  const bpm = HR.current;
  const zone = HR.connected && bpm > 0 ? getHRZone(bpm) : '—';
  const isHigh = bpm >= 160;

  const bpmEl   = document.getElementById('hr-sheet-bpm');
  const zoneEl  = document.getElementById('hr-sheet-zone');
  const devEl   = document.getElementById('hr-sheet-device');
  const btn     = document.getElementById('hr-sheet-btn');
  const hint    = document.getElementById('hr-sheet-hint');

  if (bpmEl) {
    bpmEl.textContent = HR.connected && bpm > 0 ? bpm : '--';
    bpmEl.classList.toggle('zone-high', isHigh);
  }
  if (zoneEl) zoneEl.textContent = zone;
  if (devEl)  devEl.textContent  = HR.connected ? (HR.device?.name || 'Connected') : '';

  if (btn) {
    if (HR.connected) {
      btn.textContent = 'Disconnect';
      btn.className = 'hr-sheet-btn connected';
    } else {
      btn.textContent = 'Connect Polar';
      btn.className = 'hr-sheet-btn';
    }
    btn.disabled = false;
  }

  if (hint) {
    if (!navigator.bluetooth && isIOS()) {
      hint.innerHTML = 'iPhone: open this app in <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055" target="_blank" style="color:var(--green2)">Bluefy</a> to enable Bluetooth.';
    } else if (!navigator.bluetooth) {
      hint.textContent = 'Use Chrome or Edge to enable Bluetooth.';
    } else {
      hint.textContent = '';
    }
    // Hide connect btn on unsupported browsers (not Bluefy on iOS)
    if (btn && !navigator.bluetooth) btn.style.display = 'none';
    else if (btn) btn.style.display = 'block';
  }

  // Sync settings status
  const dot = document.getElementById('hr-settings-dot');
  const lbl = document.getElementById('hr-settings-label');
  if (dot) dot.style.background = HR.connected ? 'var(--green)' : 'var(--text-dim)';
  if (lbl) lbl.textContent = HR.connected ? `Polar · ${HR.device?.name || 'connected'}` : 'Polar · not connected';
}

// ── CONNECT / DISCONNECT ─────────────────
async function toggleHRConnection() {
  if (HR.connected) {
    disconnectHR();
  } else {
    await connectHR();
  }
}

async function connectHR() {
  if (!navigator.bluetooth) return;
  const btn = document.getElementById('hr-sheet-btn');
  try {
    if (btn) { btn.textContent = 'Scanning…'; btn.disabled = true; }
    HR.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: ['battery_service']
    });
    HR.device.addEventListener('gattserverdisconnected', onHRDisconnected);
    const server = await HR.device.gatt.connect();
    const service = await server.getPrimaryService('heart_rate');
    HR.characteristic = await service.getCharacteristic('heart_rate_measurement');
    await HR.characteristic.startNotifications();
    HR.characteristic.addEventListener('characteristicvaluechanged', onHRData);
    HR.connected = true;
    HR.sessionStart = Date.now();
    HR.sessionReadings = [];
    HR.intentionalDisconnect = false;
    HR._reconnectAttempts = 0;
    if (btn) { btn.disabled = false; }
    updateHRSheetUI();
  } catch(e) {
    if (btn) { btn.textContent = 'Connect Polar'; btn.disabled = false; }
    if (e.name !== 'NotFoundError') console.warn('HR connect error:', e);
  }
}

function disconnectHR() {
  HR.intentionalDisconnect = true;
  clearTimeout(HR._reconnectTimer);
  HR._reconnectAttempts = 0;
  if (HR.device && HR.device.gatt.connected) {
    HR.device.gatt.disconnect();
  }
  onHRDisconnected();
}

function onHRDisconnected() {
  HR.connected = false;
  HR.current   = 0;

  // If user intentionally disconnected (long-press or sheet button), tear down immediately
  if (HR.intentionalDisconnect || !HR.device) {
    HR.intentionalDisconnect = false;
    _teardownHRWidget();
    return;
  }

  // Unexpected disconnect — attempt silent reconnect (up to 5 tries, 6s apart)
  const MAX_ATTEMPTS = 5;
  if (HR._reconnectAttempts >= MAX_ATTEMPTS) {
    HR._reconnectAttempts = 0;
    _teardownHRWidget();
    return;
  }

  // Show reconnecting state in widget zone label without hiding the pill
  HR._reconnectAttempts++;
  const zoneEl = document.getElementById('hr-pill-zone');
  if (zoneEl) zoneEl.textContent = 'Reconnecting…';
  updateHRSheetUI();

  HR._reconnectTimer = setTimeout(async () => {
    if (HR.intentionalDisconnect || !HR.device) return;
    try {
      const server = await HR.device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      HR.characteristic = await service.getCharacteristic('heart_rate_measurement');
      await HR.characteristic.startNotifications();
      HR.characteristic.addEventListener('characteristicvaluechanged', onHRData);
      HR.connected = true;
      HR._reconnectAttempts = 0;
      updateHRSheetUI();
    } catch(e) {
      // Retry will be triggered by next gattserverdisconnected event or fall through
      onHRDisconnected();
    }
  }, 6000);
}

function _teardownHRWidget() {
  _currentZoneKey  = null;
  _ecgTargetAmp    = 0;
  clearTimeout(_ecgAnimTimeout);
  clearTimeout(HR._reconnectTimer);
  stopECGLoop();
  const trace = document.getElementById('hr-ecg-trace');
  if (trace) trace.setAttribute('d', buildSinePath(0));
  _ecgAmp = 0;
  const pill = document.getElementById('hr-pill');
  if (pill) pill.classList.remove('visible','zone-recovery','zone-aerobic','zone-anaerobic','zone-vo2max');
  updateHRSheetUI();
}

// ── DATA ─────────────────────────────────
function onHRData(event) {
  const value = event.target.value;
  const flags = value.getUint8(0);
  const hr16  = flags & 0x1;
  const bpm   = hr16 ? value.getUint16(1, true) : value.getUint8(1);
  HR.current  = bpm;
  HR.sessionReadings.push({ t: Date.now(), bpm });
  updateHRPill(bpm);
  updateHRSheetUI();
}

// ── ECG RANDOM BURST ANIMATION ───────────
// ── HR ZONE TEST (settings) ───────────────────────
function simulateHR(bpm) {
  if (bpm === 0) {
    HR.current = 0;
    _teardownHRWidget();
    return;
  }
  HR.current = bpm;
  const pill = document.getElementById('hr-pill');
  if (pill && !pill.classList.contains('visible')) pill.classList.add('visible');
  updateHRPill(bpm);
  updateHRSheetUI();
}

// ── HR FOCUS OVERLAY (v0.9.6) ────────────────────
function openHRFocus() {
  toggleMenu();
  const overlay = document.getElementById('hr-focus-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  acquireWakeLock();
  // Sync current HR state into overlay immediately
  updateHRFocusOverlay(HR.current || 0, _currentZoneKey);
  const focusTrace = document.getElementById('hr-focus-ecg-trace');
  if (focusTrace) focusTrace.setAttribute('d', buildSinePathWide(_ecgAmp));
}
function closeHRFocus() {
  const overlay = document.getElementById('hr-focus-overlay');
  if (overlay) overlay.style.display = 'none';
  if (!state.timerRunning) releaseWakeLock();
}
function updateHRFocusOverlay(bpm, zoneKey) {
  const overlay = document.getElementById('hr-focus-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  const bpmEl  = document.getElementById('hr-focus-bpm');
  const zoneEl = document.getElementById('hr-focus-zone');
  if (bpmEl)  bpmEl.textContent  = bpm > 0 ? bpm : '--';
  if (zoneEl) zoneEl.textContent = bpm > 0 ? getHRZone(bpm) : '—';
  ['zone-recovery','zone-aerobic','zone-anaerobic','zone-vo2max'].forEach(z =>
    overlay.classList.toggle(z, z === zoneKey));
  // Scroll speed scales exponentially with BPM
  document.documentElement.style.setProperty('--ecg-scroll-dur', scrollDurForBpm(bpm, 'focus'));
}

// ── SETTINGS ENTRY POINT ─────────────────
function openHRFromSettings() {
  closeHRSheet(); // reset
  openHRSheet();
}

// ── Lottie splash animation init (v0.9.4) ──
window.addEventListener('DOMContentLoaded', function() {
  fetch('splash-anim.json')
    .then(function(r){ return r.json(); })
    .then(function(data){
      const c = document.getElementById('splash-lottie');
      if (c && window.lottie) {
        const anim = lottie.loadAnimation({
          container: c, renderer: 'svg', loop: false, autoplay: true,
          animationData: data,
          rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
        });
        anim.addEventListener('complete', function() { if (window.dismissSplash) window.dismissSplash(); });
      }
    })
    .catch(function(){ /* safety timeout handles this case */ });
});
