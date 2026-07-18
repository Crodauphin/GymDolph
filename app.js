const APP_VERSION = '0.9.10';
// v0.9.8: default icon + display label per block type, used whenever a block
// doesn't author its own `icon`/`typeLabel` override. Cardio keeps its own
// hardcoded bike emoji (rendered separately, not through this map).
const BLOCK_TYPE_ICON  = { warmup: '🔥', main: '💪', secondary: '🎯' };
const BLOCK_TYPE_LABEL = { warmup: 'WARM UP', main: 'MAIN', secondary: 'SECONDARY' };
// ── THEME (v0.9.7) — read live tokens so canvas/charts follow the theme ──
function themeColor(name, fb){ try { const v=getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v||fb||'#888'; } catch(e){ return fb||'#888'; } }
function themeRGBA(rgbVar, a){ try { const c=getComputedStyle(document.documentElement).getPropertyValue(rgbVar).trim(); return c?('rgba('+c+','+a+')'):('rgba(160,180,224,'+a+')'); } catch(e){ return 'rgba(160,180,224,'+a+')'; } }
function headFont(){ return (themeColor('--font-head','Sofia Sans Condensed')||'Sofia Sans Condensed').replace(/['"]/g,'') || 'Sofia Sans Condensed'; }
function applyTheme(t){
  const theme = (t==='bright') ? 'bright' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem('gymdolph_theme', theme); } catch(e){}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', themeColor('--bg', '#071D5F'));
  // Logos are theme-driven (both pairs bundled in both apps)
  const lm = document.getElementById('logo-main-img');
  const ls = document.getElementById('logo-secondary-img');
  if (lm) lm.src = 'logo-main-' + theme + '.png';
  if (ls) ls.src = 'logo-secondary-' + theme + '.png';
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
  lastManualRestDuration: null, // v0.9.8: persisted last manual rest pick (localStorage)
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
  milestoneProgress: {},
  _editingHistoryId: null,
  _pendingWeekReset: false,
  _lastWeekInprog: null,
  _cardioDropdownOpen: false,
};

// ── SESSION HELPERS ──────────────────────────
function getSession(dayId) {
  if (!state.sessions[dayId]) {
    state.sessions[dayId] = { setLogs: {}, workoutChecks: {}, cardioChecks: {}, cardioLogs: {}, cardioChoice: {}, cardioSelected: {}, commuteChecked: false, commuteLog: null, activeLog: {}, yogaSessionLog: {duration:null, style:null}, _cardioDefaultsApplied: false, touched: false };
  }
  if (state.sessions[dayId].cardioSelected === undefined) state.sessions[dayId].cardioSelected = {};
  if (state.sessions[dayId].activeLog === undefined) state.sessions[dayId].activeLog = {};
  if (state.sessions[dayId].yogaSessionLog === undefined) state.sessions[dayId].yogaSessionLog = {duration:null, style:null};
  if (state.sessions[dayId].commuteChecked === undefined) state.sessions[dayId].commuteChecked = false;
  if (state.sessions[dayId].commuteLog === undefined) state.sessions[dayId].commuteLog = null;
  if (state.sessions[dayId]._cardioDefaultsApplied === undefined) state.sessions[dayId]._cardioDefaultsApplied = false;
  return state.sessions[dayId];
}
function isSessionTouched(dayId) {
  const s = state.sessions[dayId];
  if (!s) return false;
  return s.touched ||
    Object.keys(s.setLogs).length > 0 ||
    Object.keys(s.workoutChecks).some(k => s.workoutChecks[k]) ||
    Object.keys(s.cardioChecks).some(k => s.cardioChecks[k]) ||
    Object.keys(s.cardioSelected||{}).some(k => s.cardioSelected[k]) ||
    !!s.commuteChecked;
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
// ── PERSISTENCE (v0.9.8 split) ──────────────────────────────────
// saveSession() — HOT PATH. Writes only what in-workout interactions mutate:
// the sessions map, timer state, and active day. Called on every set log,
// checkbox tick, and cardio toggle, so it must stay cheap — it deliberately
// does NOT serialize history/weekSessions/bodyStats (which grow over months
// and were making every tap re-stringify a multi-KB blob on the UI thread).
function saveSession() {
  localStorage.setItem('gymdolph_sessions', JSON.stringify(state.sessions || {}));
  localStorage.setItem('gymdolph_timer', JSON.stringify({
    timerStartEpoch: state.timerStartEpoch,
    timerPausedAt:   state.timerPausedAt,
    timerRunning:    state.timerRunning,
    notifiedMilestones: state.notifiedMilestones,
  }));
  if (state.workoutDay) {
    localStorage.setItem('gymdolph_activedayid', state.workoutDay.id);
  } else {
    localStorage.removeItem('gymdolph_activedayid');
  }
}
// save() — FULL WRITE. Everything, including the slow-growing blobs. Called on
// structural changes (finish workout, history edits, body stats, imports) and
// flushed on visibilitychange as a safety net, so nothing is ever lost even if
// a hot path only ran saveSession().
function save() {
  localStorage.setItem('gymdolph_history',      JSON.stringify(state.history));
  localStorage.setItem('gymdolph_streak',       state.streak);
  localStorage.setItem('gymdolph_weekKey',      state.currentWeekKey);
  localStorage.setItem('gymdolph_weekSessions', JSON.stringify(state.weekSessions));
  localStorage.setItem('gymdolph_ytlinks',      JSON.stringify(state.ytLinks || {}));
  localStorage.setItem('gymdolph_bodystats',    JSON.stringify(state.bodyStats || []));
  localStorage.setItem('gymdolph_milestones',   JSON.stringify(state.milestoneProgress || {}));
  saveSession();
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
  // Gym_Program-GitHub.js file + its own future writes. Only the API key (same owner,
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

// ── PROGRAM LAYER (v0.9.7) — Layer 3: window.PROGRAM (Gym_Program-GitHub.js) ──
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
    state.milestoneProgress = JSON.parse(localStorage.getItem('gymdolph_milestones') || '{}');
    state.milestoneProgress = migrateMilestoneKeys(state.milestoneProgress);
    // v0.9.8: persisted "remember last selected rest duration" preference —
    // survives app restarts, used as the suggested default ahead of the
    // generic block-type default (but behind a curated per-exercise override).
    const lastRest = localStorage.getItem('gymdolph_lastManualRest');
    state.lastManualRestDuration = lastRest ? parseInt(lastRest) : null;
    // Migrate: collapse old timestamp-keyed entries (date like "2026-06-18_1781774869145") to plain date
    state.bodyStats = state.bodyStats.map(e => {
      if (e.date && e.date.includes('_')) e.date = e.date.split('_')[0];
      return e;
    });
    // Deduplicate: if multiple entries share the same date after migration, merge them (keep all non-null values)
    const bsMap = {};
    state.bodyStats.forEach(e => {
      if (!bsMap[e.date]) bsMap[e.date] = { date: e.date, weight: null, bf: null, muscle: null, phase: null };
      if (e.weight != null) bsMap[e.date].weight = e.weight;
      if (e.bf     != null) bsMap[e.date].bf     = e.bf;
      if (e.muscle != null) bsMap[e.date].muscle  = e.muscle;
      if (e.phase  != null) bsMap[e.date].phase   = e.phase;
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

    // v0.9.10: repair any pre-fix record dates, then recompute the streak from
    // the corrected dates rather than trusting the stored (possibly wrong) count.
    migrateHistoryDates();
    cleanupPhantomRecords();     // one-time: drop future-dated empty records
    autoCloseFinishedWeeks();    // sweep passive days of a week that has now closed
    recalcStreak();
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
          // v0.9.8 fix: on small/older devices a large keyboard could push the
          // modal-box's top edge above y=0 with nothing to scroll it back into
          // view. The overlay + box are now scrollable (see style.css), and we
          // additionally scroll the overlay to the bottom here so the box (and
          // its LOG button) is guaranteed visible above the keyboard.
          el.style.paddingBottom = Math.max(0, keyboardH) + 'px';
          requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
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
// v0.9.9: local Y-M-D key. toISOString() is UTC — in Melbourne (UTC+10) any
// time before 10am local rolls the date back a day, so the calendar's "today"
// landed on yesterday. All date *keys* (history dates, calendar cells, streak)
// must use local time; genuine timestamps (exportedAt, Drive lastBackup) stay UTC.
function localDateStr(d) { d = d ? new Date(d) : new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function todayStr() { return localDateStr(); }

// ── v0.9.10: a history record's date is DERIVED, never stamped from the clock ──
// Every record already carries `weekKey` (ISO year-week) + `dayId` (D1..D7, which
// occupy slots 0..6 = Mon..Sun of PROGRAM). Those two facts fully determine the
// calendar day the session belongs to. Reading `todayStr()` at save time instead
// dated a record by *when Finish was tapped* — so logging Mon..Sat all on Saturday
// produced six records dated Saturday, and recalcStreak() (which counts unique
// dates) reported a streak of 1. Same root cause as "re-opening an approved day
// moves it to today" and "I can't retroactively validate a day".
// Returns null when it can't be resolved; callers fall back to todayStr().
function dateForWeekDay(weekKey, dayId) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(weekKey || '');
  const idx = PROGRAM.findIndex(d => d.id === dayId);
  if (!m || idx < 0) return null;
  const year = +m[1], week = +m[2];
  const jan4 = new Date(year, 0, 4);                       // Jan 4 is always in ISO week 1
  const week1Mon = new Date(year, 0, 4 - ((jan4.getDay() || 7) - 1));
  const d = new Date(week1Mon);
  d.setDate(week1Mon.getDate() + (week - 1) * 7 + idx);
  return localDateStr(d);
}
// The date a record should carry. An existing record keeps the date it already has —
// re-opening or re-saving a finished day must never re-stamp it.
function recordDateFor(dayId, weekKey, existingRec) {
  if (existingRec && existingRec.date) return existingRec.date;
  return dateForWeekDay(weekKey, dayId) || todayStr();
}
// The long display string, derived from the record's own date rather than `new Date()`.
function recordDateStr(iso) {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d) ? new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})
                  : d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
}
// One-time, idempotent repair of history saved before v0.9.10, when `date` was the
// clock at Finish rather than the day the session belongs to. Recomputes `date` (and
// its display string) from the record's own weekKey + dayId. Records with no weekKey,
// or whose dayId is no longer in PROGRAM, are left exactly as they are.
function migrateHistoryDates() {
  try {
    if (localStorage.getItem('gymdolph_dateMigration') === 'v1') return;
    let changed = 0;
    state.history.forEach(r => {
      const correct = dateForWeekDay(r.weekKey, r.dayId);
      if (correct && correct !== r.date) {
        r.date = correct;
        r.dateStr = recordDateStr(correct);
        changed++;
      }
    });
    localStorage.setItem('gymdolph_dateMigration', 'v1');
    if (changed) {
      localStorage.setItem('gymdolph_history', JSON.stringify(state.history));
      console.info(`[v0.9.10] repaired dates on ${changed} history record(s)`);
    }
  } catch (e) { console.warn('migrateHistoryDates failed', e); }
}

// One-time (v2): remove "phantom" records — a record that is BOTH future-dated AND
// empty (0 logged sets). These arose when tapping into a day that hadn't happened yet
// wrote an empty record, which the date fix then placed on that day's real (future)
// calendar cell. A future day can't have been done, so an empty future record is never
// legitimate. Records with any real set-logs are never touched, whatever their date.
function cleanupPhantomRecords() {
  try {
    if (localStorage.getItem('gymdolph_cleanup') === 'v2') return;
    const today = todayStr();
    const before = state.history.length;
    state.history = state.history.filter(r => {
      const empty = !setCount(r);
      return !(r.date > today && empty);
    });
    localStorage.setItem('gymdolph_cleanup', 'v2');
    const removed = before - state.history.length;
    if (removed) {
      localStorage.setItem('gymdolph_history', JSON.stringify(state.history));
      console.info(`[v0.9.10] removed ${removed} phantom (future + empty) record(s)`);
    }
  } catch (e) { console.warn('cleanupPhantomRecords failed', e); }
}

// Count logged sets on a record, tolerating both the array and object setLogs shapes
// used across app versions.
function setCount(rec) {
  if (!rec) return 0;
  let n = 0;
  (rec.exercises || []).forEach(ex => {
    const sl = ex && ex.setLogs;
    if (Array.isArray(sl)) n += sl.filter(Boolean).length;
    else if (sl && typeof sl === 'object') n += Object.keys(sl).length;
  });
  // older records kept a top-level setLogs map instead of per-exercise
  if (!n && rec.setLogs && typeof rec.setLogs === 'object') n += Object.keys(rec.setLogs).length;
  return n;
}

// End-of-week auto-close (runs on app open). When the calendar week has rolled over
// since the last open, sweep the JUST-CLOSED week and auto-tick only the two days
// where "nothing logged" is itself the valid outcome: the Active Day (cardio_day) as
// "no activity", and the Rest day. A skipped TRAINING day is deliberately left blank —
// it stays visibly missed and breaks the streak, rather than being silently faked.
// Only ever writes days whose date is already in the past, and never duplicates a day
// that already has a record. Idempotent: opening the app repeatedly closes a week once.
function autoCloseFinishedWeeks() {
  try {
    const today = todayStr();
    const curWk = getWeekKey(new Date());
    // the week immediately before the current one
    const prevDate = new Date(); prevDate.setDate(prevDate.getDate() - 7);
    const closedWk = getWeekKey(prevDate);
    if (closedWk === curWk) return;

    let added = 0;
    PROGRAM.forEach(day => {
      if (!day) return;
      if (day.type !== 'cardio_day' && day.type !== 'rest') return;   // passive days only
      const dt = dateForWeekDay(closedWk, day.id);
      if (!dt || dt >= today) return;                                  // never today/future
      // A day already carrying a real (non-empty) record is genuinely logged — leave it.
      // An existing EMPTY record for a passive day is fine to leave as-is too (it's
      // already effectively closed); only a totally absent day needs auto-closing.
      const exists = state.history.some(h => h.weekKey === closedWk && h.dayId === day.id);
      if (exists) return;
      const label = day.type === 'cardio_day' ? 'No activity' : 'Rest';
      state.history.unshift({
        id: Date.now() + added,
        dayId: day.id, dayName: day.name,
        date: dt, weekKey: closedWk, dateStr: recordDateStr(dt),
        duration: 0, durationStr: '0m', setLogs: {}, checks: {}, exercises: [],
        autoTicked: true, autoLabel: label,
      });
      added++;
    });
    if (added) {
      localStorage.setItem('gymdolph_history', JSON.stringify(state.history));
      console.info(`[v0.9.10] auto-closed ${added} passive day(s) in ${closedWk}`);
    }
  } catch (e) { console.warn('autoCloseFinishedWeeks failed', e); }
}
function updateBannerDate() {
  document.getElementById('banner-date').textContent =
    new Date().toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
}
// getTimerSecs() defined in GLOBAL TIMER HELPERS at top

// ── VIEW SWITCHING ──────────────────────────
// Settings: add a discreet (?) toggle to each section that has descriptive help.
// Status lines stay visible; only .settings-help text hides until (?) is tapped.
function enhanceSettingsHelp() {
  document.querySelectorAll('#view-settings .settings-group').forEach(function(group){
    if (!group.querySelector('.settings-help')) return;        // no help → no button
    const label = group.querySelector('.settings-label');
    if (!label || label.dataset.helpReady) return;             // idempotent
    label.dataset.helpReady = '1';
    const btn = document.createElement('button');
    btn.className = 'settings-help-btn';
    btn.type = 'button';
    btn.textContent = '?';
    btn.setAttribute('aria-label', 'Show help for this section');
    btn.onclick = function(){ group.classList.toggle('show-help'); };
    // wrap label + button in a row
    const row = document.createElement('div');
    row.className = 'settings-label-row';
    label.parentNode.insertBefore(row, label);
    row.appendChild(label);
    row.appendChild(btn);
  });
}
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
  if (name === 'settings') enhanceSettingsHelp();
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
  // v0.9.9: no exercises to guide/coach on Rest and Active (free-choice) days — hide the row.
  const guideRow = document.getElementById('guide-actions-row');
  if (guideRow) guideRow.style.display = (day.type==='rest' || day.type==='cardio_day') ? 'none' : 'flex';
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
// ── Day-card summary (v0.9.10) ──
// Was a single hardcoded string returned for EVERY training day
// ('Warm-up 10 min · Main 40 min · Secondary 20 min · Cardio 20 min'), which was
// simply false on Wed (10/35/25) and Thu (10/25/25) — and its 'Cardio 20 min' was
// invented outright: cardioPool items are {id, name, pinned, logFields} and carry no
// duration at all. Now derived from block.duration, which every block already has.
//
// Cardio is shown WITHOUT a number, deliberately. Its real length varies every
// session (a commute is ~70 min both ways; end-of-session cardio is "about 20,
// sometimes less, sometimes more"; an active day is unpredictable by definition).
// A figure that's wrong most days is decoration, not information — and inventing one
// would have quietly padded the total. So the total means what it says: minutes of
// structured, authored work. No schema addition; contract unchanged.
function durationMins(s) {
  if (!s) return 0;
  s = String(s).trim();
  let m;
  if ((m = /^(\d+)\s*h\s*(\d+)?/i.exec(s))) return (+m[1]) * 60 + (+(m[2] || 0));
  if ((m = /^(\d+)\s*min/i.exec(s)))        return +m[1];
  if ((m = /^(\d+)$/.exec(s)))              return +m[1];
  return 0;                                  // unparseable ('Free', '-') → omit, never guess
}
const BLOCK_SUMMARY_LABEL = { warmup:'Warm-up', main:'Main', secondary:'Secondary' };

function blockSummary(day) {
  if (!day) return '';
  if (day.type === 'rest')       return 'Full rest — recovery & sleep';
  if (day.type === 'cardio_day') return 'Active day — log what you did';

  const parts = (day.blocks || []).map(b => {
    const mins = durationMins(b.duration);
    if (!mins) return null;                  // nothing authored → omit it, don't fabricate
    return { label: b.bodyPart || b.typeLabel || BLOCK_SUMMARY_LABEL[b.type] || 'Block', mins };
  }).filter(Boolean);

  // No block carries a duration (e.g. the Yoga day's Mobility block) → fall back to
  // the day-level label rather than showing nothing.
  if (!parts.length) {
    const dm = durationMins(day.duration);
    return dm ? `${dm} min` : (day.duration || '');
  }

  const total  = parts.reduce((a, p) => a + p.mins, 0);
  const line   = parts.map(p => `${p.label} ${p.mins}`).join(' · ');
  const cardio = (day.commute === false) ? '' : ' · + Cardio';
  return `${total} min — ${line}${cardio}`;
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
function closeMenu(){document.getElementById('nav-menu').classList.remove('open');document.getElementById('menu-backdrop').classList.remove('open');}
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
    s.cardioSelected= JSON.parse(JSON.stringify(sess.cardioSelected || {}));
    s.cardioLogs    = JSON.parse(JSON.stringify(sess.cardioLogs || {}));
    s._cardioDefaultsApplied = true; // selections already resolved — don't re-apply the commute default
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
  const today = localDateStr(d);
  // If today has no session yet, start counting from yesterday
  if (!dates.has(today)) d.setDate(d.getDate()-1);
  while (dates.has(localDateStr(d))) { streak++; d.setDate(d.getDate()-1); }
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
  state._cardioDropdownOpen = false;
  const container = document.getElementById('workout-blocks');
  container.innerHTML = `
    <div class="rest-day-view">
      <div class="rest-day-emojis"><span>😴</span><span>💤</span><span>🛌</span><span>💤</span><span>😴</span></div>
      <div class="rest-day-title">FULL REST DAY</div>
      <div class="rest-day-sub">Your muscles grow during recovery.<br>Sleep well · eat well · hydrate.</div>
    </div>`;
  appendCardioSection(day, container);
}

// ── STRETCH VIEW ─────────────────────────────
// Stretch days use the v0.9.7 `blocks` schema; fall back to legacy `stretchPhases`.
function stretchGroups(day){ return (day.blocks || day.stretchPhases || []); }
function stretchMoves(day){
  const out = [];
  stretchGroups(day).forEach(g => (g.exercises || g.moves || []).forEach(m => out.push(m)));
  return out;
}
// v0.9.9 (#5) ── YOGA / MOBILITY SESSION LOG (modal) ────────────────────────
// Same interaction as cardio's LOG chip → modal: tap the row's chip, pick
// duration + style, confirm — collapses back to a logged summary chip.
let _yogaModalCtx = null;
function openYogaModal(dayId){
  _yogaModalCtx = {dayId};
  const day = state.workoutDay;
  const cfg = (day && day.yogaLog) || {};
  const durs   = cfg.durationOptions || [15,30,60];
  const styles = cfg.styleOptions || ['Combination','Balance','Stretch','Strength'];
  const sess = getSession(dayId);
  const log = sess.yogaSessionLog || {duration:null, style:null};
  document.getElementById('yoga-modal-name').textContent = 'Yoga session';
  const durChips = durs.map(d=>
    `<button type="button" class="act-chip${log.duration===d?' on':''}" onclick="pickYogaModalDuration(${d},this)">${d} min</button>`
  ).join('');
  const styleChips = styles.map(s=>{
    const safe = s.replace(/'/g,"\\'");
    return `<button type="button" class="act-chip${log.style===s?' on':''}" onclick="pickYogaModalStyle('${safe}',this)">${s}</button>`;
  }).join('');
  document.getElementById('yoga-modal-fields').innerHTML =
    `<div class="yg-log-label" style="margin-top:0">Duration</div><div class="act-chips">${durChips}</div>`
    + `<div class="yg-log-label">Style</div><div class="act-chips compact">${styleChips}</div>`;
  document.getElementById('yoga-modal').dataset.duration = log.duration || '';
  document.getElementById('yoga-modal').dataset.style = log.style || '';
  document.getElementById('yoga-modal').style.display = 'flex';
}
function pickYogaModalDuration(d, btn){
  const modal = document.getElementById('yoga-modal');
  const cur = modal.dataset.duration;
  modal.dataset.duration = (String(d)===cur) ? '' : String(d);
  btn.parentElement.querySelectorAll('.act-chip').forEach(c=>c.classList.remove('on'));
  if (modal.dataset.duration) btn.classList.add('on');
}
function pickYogaModalStyle(s, btn){
  const modal = document.getElementById('yoga-modal');
  const cur = modal.dataset.style;
  modal.dataset.style = (s===cur) ? '' : s;
  btn.parentElement.querySelectorAll('.act-chip').forEach(c=>c.classList.remove('on'));
  if (modal.dataset.style) btn.classList.add('on');
}
function closeYogaModal(){
  document.getElementById('yoga-modal').style.display = 'none';
  _yogaModalCtx = null;
}
function confirmYogaLog(){
  if (!_yogaModalCtx) return;
  const {dayId} = _yogaModalCtx;
  const modal = document.getElementById('yoga-modal');
  const duration = modal.dataset.duration ? parseInt(modal.dataset.duration,10) : null;
  const style = modal.dataset.style || null;
  const sess = getSession(dayId);
  sess.yogaSessionLog = {duration, style};
  sess.touched = true;
  saveSession();
  if (typeof updateProgress === 'function') updateProgress();
  closeYogaModal();
  const day = state.workoutDay;
  if (day && day.id===dayId) renderStretchView(day);
}
function renderStretchView(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';
  state._cardioDropdownOpen = false;
  const sess = getSession(day.id);
  // v0.9.9 (#5): Yoga/Mobility session log — presence-driven on `day.yogaLog`.
  // Rendered as a normal tappable row (see below, block.logType==='session') with
  // a LOG chip that opens a modal — same interaction as cardio duration/difficulty.
  // v0.9.7 schema: stretch days use `blocks` -> `exercises` (same as other days).
  // Fallback to legacy `stretchPhases` -> `moves` if an old-format day is present.
  const groups = (day.blocks || day.stretchPhases || []);
  groups.forEach(group => {
    const moves = (group.exercises || group.moves || []);
    const block = document.createElement('div');
    block.className = 'stretch-block';
    let h = '';
    if (group.logType === 'session' && day.yogaLog) {
      // v0.9.9 (#5): single session-level row — tap LOG SESSION to open the
      // duration+style modal, same interaction as tapping a cardio item's LOG chip.
      moves.forEach(m => {
        const log = sess.yogaSessionLog || {};
        const hasLog = !!(log.duration || log.style);
        const chk = sess.workoutChecks[m.id];
        const logLabel = hasLog ? [log.duration?`${log.duration} min`:null, log.style||null].filter(Boolean).join(' · ') : 'LOG SESSION';
        const logClass = hasLog ? 'set-chip logged' : 'set-chip';
        h += `<div class="stretch-row" onclick="handleExRowClick(event,'${m.id}')">
          <div class="ex-check ${chk?'checked':''}" id="excheck-${m.id}"
            onclick="event.stopPropagation();toggleExercise('${m.id}',this)">${chk?'✓':''}</div>
          <div class="stretch-info">
            <div class="stretch-name">Yoga</div>
            <div class="ex-sets-row">
              <div class="${logClass}" onclick="event.stopPropagation();openYogaModal('${day.id}')">${logLabel}</div>
            </div>
          </div></div>`;
      });
    } else {
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
    }
    block.innerHTML = `<div class="stretch-block-header">
      <span class="block-icon">${group.icon ?? BLOCK_TYPE_ICON[group.type] ?? ''}</span>
      <span class="block-title">${(group.bodyPart || group.typeLabel || BLOCK_TYPE_LABEL[group.type] || '').toUpperCase()}</span>
      <span class="block-duration">${group.duration||''}</span></div>${group.note?`<div class="block-note">⚠ ${group.note}</div>`:''}${h}`;
    container.appendChild(block);
  });
  appendCardioSection(day, container);
}

// ── WORKOUT BLOCKS ────────────────────────────
// Recommended rest between sets, by block type (Training for the New Alpinism protocol)
// v0.9.8: priority — per-exercise `restSeconds` override, then the persisted
// last-manually-picked duration, then the generic block-type default.
function restHintFor(blockType, ex) {
  if (ex && ex.restSeconds != null) {
    return ex.restSeconds < 60 ? `${ex.restSeconds}s` : `${Math.round(ex.restSeconds/60)} min`;
  }
  if (state.lastManualRestDuration != null) {
    const d = state.lastManualRestDuration;
    return d < 60 ? `${d}s` : `${Math.round(d/60)} min`;
  }
  if (blockType === 'main') return '3–5 min';
  if (blockType === 'prehab') return '60–90s';
  return '60s';
}
// Normalise an exercise name for matching. History has stored the *same* movement
// under punctuation/case variants over time — e.g. "Lat pulldown — cable" (em-dash),
// "Lat pulldown - cable" (hyphen), "Lat Pull-Down (Cable)". An exact `===` match on
// the display name silently misses all but one spelling, which is why previous weight
// failed to appear most of the time. Fold dashes to a space, drop bracketed qualifiers,
// lowercase, and collapse whitespace so the variants converge.
function normExName(name) {
  return String(name || '')
    .replace(/[\u2012-\u2015\u2212]/g, '-')   // figure/en/em dash, minus → hyphen
    .replace(/\([^)]*\)/g, ' ')               // drop "(Cable)", "(flat)", etc.
    .replace(/[-–—/]/g, ' ')                  // hyphen & slash → space
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')              // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

// Normalise a record's setLogs for one exercise to a flat array of {weight,reps},
// tolerating both shapes history has used: an array, or an object map keyed by index,
// and matching the exercise by normalised name (see normExName).
function setLogsFor(rec, exName) {
  const key = normExName(exName);
  const ex = (rec.exercises || []).find(e => normExName(e.name) === key);
  if (!ex || !ex.setLogs) return [];
  const sl = ex.setLogs;
  const arr = Array.isArray(sl) ? sl : Object.values(sl);
  return arr.filter(s => s && s.weight > 0);
}

// What to prefill / hint when a set modal opens for an exercise done before.
// Returns the LAST session's heaviest set (what Albin actually wants to see — "what
// did I lift last time"), plus the date, and separately the most-used weight for
// context. history[0] is the most recent record. Shape-tolerant (see setLogsFor):
// the old version guarded on `setLogs.length`, which is undefined on the object shape,
// so any session that stored setLogs as an object was silently skipped — which is why
// the hint failed to appear most of the time.
function getMostUsedSetValue(exName) {
  let last = null;                       // {weight, reps, date} from the most recent session
  const allSets = [];
  let sessionsSeen = 0;
  for (let i = 0; i < state.history.length && sessionsSeen < 10; i++) {
    const sets = setLogsFor(state.history[i], exName);
    if (!sets.length) continue;
    sessionsSeen++;
    if (!last) {
      const top = sets.reduce((a, s) => (s.weight > a.weight ? s : a), sets[0]);
      last = { weight: top.weight, reps: top.reps, date: state.history[i].date };
    }
    sets.forEach(s => allSets.push(s));
  }
  if (!allSets.length) return null;

  const wFreq = {};
  allSets.forEach(s => { wFreq[s.weight] = (wFreq[s.weight] || 0) + 1; });
  const topW = parseFloat(Object.entries(wFreq).sort((a, b) => b[1] - a[1])[0][0]);
  const rFreq = {};
  allSets.filter(s => s.weight === topW).forEach(s => { rFreq[s.reps] = (rFreq[s.reps] || 0) + 1; });
  const topR = parseInt(Object.entries(rFreq).sort((a, b) => b[1] - a[1])[0][0]);

  return {
    weight: last ? last.weight : Math.round(topW),   // prefill the LAST weight, not the mode
    reps:   last ? last.reps   : Math.round(topR),
    lastWeight: last ? last.weight : null,
    lastReps:   last ? last.reps   : null,
    lastDate:   last ? last.date   : null,
    mostUsed:   Math.round(topW),
  };
}
function renderWorkoutBlocks(day) {
  const container = document.getElementById('workout-blocks');
  container.innerHTML = '';
  state._cardioDropdownOpen = false;
  day.blocks.forEach(block => {
    const blockEl = document.createElement('div');
    blockEl.className = 'workout-block';
    let exHTML = '';
    if (block.type==='cardio') {
      const sess = getSession(day.id);
      if (!sess.cardioChoice) sess.cardioChoice = {};
      const chosen = sess.cardioChoice[block.id];
      block.exercises.forEach(ex => {
        const isSel = chosen === ex.id;
        const log = (sess.cardioLogs||{})[ex.id];
        const logLabel = log ? formatCardioLog(log) : 'LOG CARDIO';
        const logClass = log ? 'set-chip logged' : 'set-chip';
        const safeName = ex.name.replace(/'/g,"\\'");
        exHTML += `<div class="exercise-row cardio-opt ${isSel?'cardio-selected':(chosen?'cardio-dimmed':'')}"
            onclick="selectCardio('${block.id}','${ex.id}')">
          <div class="ex-check cardio-radio ${isSel?'checked':''}" id="cardiocheck-${ex.id}">${isSel?'✓':''}</div>
          <div class="ex-info">
            <div class="ex-name-row">
              <span class="ex-name">${ex.name}</span>
            </div>
            <div class="ex-prescription">${ex.prescription}</div>
            ${ex.note?`<div class="ex-prescription" style="color:var(--pink2);font-style:italic">${ex.note}</div>`:''}
            ${isSel?`<div class="ex-sets-row">
              <div class="${logClass}" onclick="event.stopPropagation();openCardioModal('${day.id}','${ex.id}','${safeName}')">
                ${logLabel}
              </div>
            </div>`:''}
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
            <div class="ex-prescription">${ex.sets} × ${ex.reps}</div>
            ${ex.note?`<div class="ex-prescription" style="color:var(--pink2);font-style:italic">⚠ ${ex.note}</div>`:''}
            ${chips?`<div class="ex-sets-row">${chips}</div>`:''}
            ${(block.type!=='warmup' && ex.sets>1)?`<div class="set-rest-hint">⏱ Rest ${restHintFor(block.type, ex)} between sets</div>`:''}
          </div>
        </div>`;
      });
    }
    blockEl.innerHTML = `<div class="block-header">
      <span class="block-icon">${block.icon ?? BLOCK_TYPE_ICON[block.type] ?? ''}</span>
      <span class="block-title">${(block.bodyPart || block.typeLabel || BLOCK_TYPE_LABEL[block.type] || '').toUpperCase()}</span>
      <span class="block-duration">${block.duration}</span></div>${block.note?`<div class="block-note">⚠ ${block.note}</div>`:''}${exHTML}`;
    container.appendChild(blockEl);
  });
  // v0.9.8: unified CARDIO section — presence-driven, appended whenever this day
  // has any cardio to offer (gym pool and/or commute).
  appendCardioSection(day, container);
  // v0.9.9 (#7): active-day capture — Saturday's free-choice day logs what you did.
  if (day.type==='cardio_day') appendActiveDayCapture(day, container);
}

// v0.9.9 (#7) ── ACTIVE-DAY CAPTURE ─────────────────────────────────────────
// Saturday's "Active Day" (a cardio_day with no blocks) had no way to record what
// you actually did. This adds a multi-select chip grid plus a minutes field per
// pick, saved into the day's history record on FINISH WORKOUT. The activity list
// is a generic engine default; a day may override it with `day.activities`.
const ACTIVE_DAY_ACTIVITIES_DEFAULT = [
  {id:'run',      label:'Run',       icon:'🏃'},
  {id:'swim',     label:'Swim',      icon:'🏊'},
  {id:'hike',     label:'Hike',      icon:'🥾'},
  {id:'parkrun',  label:'Parkrun',   icon:'🏅'},
  {id:'trailrun', label:'Trail run', icon:'🏔️'},
  {id:'cycle',    label:'Cycle',     icon:'🚴'},
  {id:'climb',    label:'Climb',     icon:'🧗'},
  {id:'yoga',     label:'Yoga',      icon:'🧘'},
  {id:'sauna',    label:'Sauna',     icon:'🧖'},
  {id:'other',    label:'Other',     icon:'✨', free:true},
  {id:'nothing',  label:'Rest / Nothing', icon:'😴', rest:true},
];
function activeDayActivities(day){
  const a = day && day.activities;
  if (Array.isArray(a) && a.length) {
    return a.map(x => typeof x === 'string'
      ? {id:x.toLowerCase().replace(/[^a-z0-9]+/g,''), label:x, icon:'✨'} : x);
  }
  return ACTIVE_DAY_ACTIVITIES_DEFAULT;
}
function appendActiveDayCapture(day, container){
  const sess = getSession(day.id);
  if (!sess.activeLog) sess.activeLog = {};
  const acts = activeDayActivities(day);
  const wrap = document.createElement('div');
  wrap.className = 'workout-block act-block';
  const chips = acts.map(a=>{
    const on = !!sess.activeLog[a.id];
    return `<button class="act-chip${a.rest?' rest':''}${on?' on':''}" onclick="toggleActiveActivity('${day.id}','${a.id}')">`
      + `<span class="act-emoji">${a.icon||''}</span>${a.label}</button>`;
  }).join('');
  const selected = acts.filter(a=>sess.activeLog[a.id] && !a.rest);
  const restOn = acts.some(a=>a.rest && sess.activeLog[a.id]);
  const esc = s => String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const mins = selected.map(a=>{
    const rec = sess.activeLog[a.id] || {};
    const v = (rec.mins!=null && rec.mins!=='') ? rec.mins : '';
    const labelCell = a.free
      ? `<input class="act-text-input" type="text" placeholder="What did you do?" value="${esc(rec.text)}" oninput="setActiveText('${day.id}','${a.id}',this.value)">`
      : `<span class="act-min-label"><span class="act-emoji">${a.icon||''}</span>${a.label}</span>`;
    return `<div class="act-min-row">`
      + labelCell
      + `<span class="act-min-field"><input class="act-min-input" type="number" inputmode="numeric" min="0" `
      + `placeholder="0" value="${v}" oninput="setActiveMins('${day.id}','${a.id}',this.value)"><span class="act-min-unit">min</span></span>`
      + `</div>`;
  }).join('');
  let tail;
  if (mins)        tail = `<div class="act-mins">${mins}</div>`;
  else if (restOn) tail = `<div class="act-hint">Logged as a rest day — nothing to time.</div>`;
  else             tail = '';
  wrap.innerHTML = `<div class="block-header">`
    + `<span class="block-icon">🏔️</span>`
    + `<span class="block-title">WHAT DID YOU DO?</span>`
    + `<span class="block-duration"></span></div>`
    + `<div class="act-chips">${chips}</div>`
    + tail;
  container.appendChild(wrap);
}
function toggleActiveActivity(dayId, actId){
  const sess = getSession(dayId);
  if (!sess.activeLog) sess.activeLog = {};
  const acts = activeDayActivities(state.workoutDay || {});
  const meta = acts.find(a=>a.id===actId) || {};
  if (sess.activeLog[actId]) {
    delete sess.activeLog[actId];
  } else {
    if (meta.rest) {
      sess.activeLog = {};                                   // "Rest / Nothing" clears everything else
    } else {
      acts.forEach(a=>{ if (a.rest) delete sess.activeLog[a.id]; }); // a real activity clears "Rest / Nothing"
    }
    sess.activeLog[actId] = {mins:''};
  }
  sess.touched = true;
  saveSession();
  const day = state.workoutDay;
  if (day && day.id===dayId) { renderWorkoutBlocks(day); updateProgress(); }
}
function setActiveMins(dayId, actId, val){
  const sess = getSession(dayId);
  if (!sess.activeLog || !sess.activeLog[actId]) return;
  const n = parseInt(val,10);
  sess.activeLog[actId].mins = (isNaN(n) || n<0) ? '' : n;
  sess.touched = true;
  saveSession();
  updateProgress();
}
function setActiveText(dayId, actId, val){
  const sess = getSession(dayId);
  if (!sess.activeLog || !sess.activeLog[actId]) return;
  sess.activeLog[actId].text = val;
  sess.touched = true;
  saveSession();
}

// v0.9.8 — resolve which cardioPool items apply to a given day:
// training days with commute get the full pool (commute pinned first);
// training days without commute (Sat) get the gym pool only, no commute;
// non-training days with commute get commute only; everything else gets none.
// v0.9.8.2: commute defaults to ON — a day shows Bike Commute unless it
// explicitly opts out with `commute: false`. The previous opt-in design
// (`day.commute` truthy required to show it) failed silently whenever a new
// or restructured day forgot to set the flag — the day still rendered fine,
// just quietly missing the one cardio option that matters most day-to-day.
// Opt-out only needs setting on the two days that genuinely have none
// (a free-choice active day, a full rest day) — everything else needs
// nothing at all, so a forgotten flag now fails toward "still shows commute"
// rather than toward "silently loses it".
function cardioItemsForDay(day) {
  const pool = (window.PROGRAM && window.PROGRAM.cardioPool) || [];
  if (!pool.length) return [];
  const noCommute = day.commute === false;
  if (day.type === 'training' || day.type === 'stretch') {
    return noCommute ? pool.filter(item => item.id !== 'commute') : pool;
  }
  return noCommute ? [] : pool.filter(item => item.id === 'commute');
}
// Apply cardio one-time setup for a freshly opened day. v0.9.8.1: commute is no
// longer auto-checked — it's just pinned visible (checked or not) so nothing
// needs pre-selecting here. Kept as a hook in case future defaults are needed.
function applyCardioDefaults(day) {
  const sess = getSession(day.id);
  sess._cardioDefaultsApplied = true;
  return sess;
}
// Appends the CARDIO block to whichever container the calling view already
// rendered into (training/rest/stretch all call this the same way).
function appendCardioSection(day, container) {
  const items = cardioItemsForDay(day);
  if (!items.length) return;
  applyCardioDefaults(day);
  const wrap = document.createElement('div');
  wrap.id = 'cardio-pool-wrap';
  container.appendChild(wrap);
  refreshCardioPoolBlock(day);
}

// Re-rendered into its own wrapper (#cardio-pool-wrap) on every toggle so picking
// multiple items doesn't rebuild the rest of the day's blocks or lose scroll position.
function refreshCardioPoolBlock(day) {
  const wrap = document.getElementById('cardio-pool-wrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  wrap.appendChild(buildCardioPoolBlockEl(day));
}
function buildCardioPoolBlockEl(day) {
  const blockEl = document.createElement('div');
  blockEl.className = 'workout-block';
  const sess = getSession(day.id);
  if (!sess.cardioSelected) sess.cardioSelected = {};
  const items = cardioItemsForDay(day);
  const multiMode = items.length > 1; // dropdown only makes sense with >1 option
  const isOpen = multiMode && !!state._cardioDropdownOpen;

  // Same visual treatment as a normal exercise row — no extra background/colour
  // tint on selection, just the checkbox fill (matches the rest of the day page).
  const rowHTML = (item) => {
    const isSel = !!sess.cardioSelected[item.id];
    if (!isSel) {
      return `<div class="exercise-row" onclick="toggleCardioPoolItem('${item.id}')">
        <div class="ex-check" id="cardiopoolcheck-${item.id}"></div>
        <div class="ex-info">
          <div class="ex-name-row"><span class="ex-name">${item.name}</span></div>
          ${item.prescription?`<div class="ex-prescription">${item.prescription}</div>`:''}
        </div>
      </div>`;
    }
    const log = (sess.cardioLogs||{})[item.id];
    const logLabel = log ? formatCardioLog(log) : 'LOG CARDIO';
    const logClass = log ? 'set-chip logged' : 'set-chip';
    const safeName = item.name.replace(/'/g,"\\'");
    return `<div class="exercise-row" onclick="toggleCardioPoolItem('${item.id}')">
      <div class="ex-check checked" id="cardiopoolcheck-${item.id}">✓</div>
      <div class="ex-info">
        <div class="ex-name-row"><span class="ex-name">${item.name}</span></div>
        ${item.prescription?`<div class="ex-prescription">${item.prescription}</div>`:''}
        <div class="ex-sets-row">
          <div class="${logClass}" onclick="event.stopPropagation();openCardioModal('${day.id}','${item.id}','${safeName}')">
            ${logLabel}
          </div>
        </div>
      </div>
    </div>`;
  };

  if (!multiMode) {
    // Single option available (rest/stretch commute-only day) — no dropdown,
    // just a direct toggle row, visible whether checked or not.
    blockEl.innerHTML = `<div class="block-header">
      <span class="block-icon">\ud83d\udeb4</span>
      <span class="block-title">CARDIO</span>
      <span class="block-duration"></span></div>${rowHTML(items[0])}`;
    return blockEl;
  }

  // Dropdown picker — every available item (commute pinned first), tap to toggle.
  // Stays open across taps so multiple items can be picked in one go.
  let dropdownHTML = '';
  if (isOpen) {
    dropdownHTML = `<div class="cardio-dropdown">${items.map(item => {
      const isSel = !!sess.cardioSelected[item.id];
      return `<div class="cardio-dropdown-item ${isSel?'checked':''}" onclick="toggleCardioPoolItem('${item.id}')">
        <div class="ex-check ${isSel?'checked':''}">${isSel?'✓':''}</div>
        <span class="ex-name">${item.name}</span>
      </div>`;
    }).join('')}
    <div class="cardio-dropdown-done" onclick="toggleCardioDropdown()">DONE</div>
    </div>`;
  }

  // Bike commute is pinned visible (checked or not) only while nothing else has
  // been picked — the moment another cardio option is selected, commute drops
  // out of view entirely (not just unchecked). It stays in the dropdown to re-add.
  const commuteItem = items.find(i => i.id === 'commute');
  const otherSelected = items.filter(i => i.id !== 'commute' && sess.cardioSelected[i.id]);
  const commuteSelected = !!(commuteItem && sess.cardioSelected[commuteItem.id]);
  let rowsHTML = '';
  if (commuteItem && (otherSelected.length === 0 || commuteSelected)) rowsHTML += rowHTML(commuteItem);
  otherSelected.forEach(item => { rowsHTML += rowHTML(item); });

  const selectedCount = items.filter(i => sess.cardioSelected[i.id]).length;
  const summary = selectedCount
    ? `${selectedCount} selected`
    : `<span style="color:var(--green)">Alternative exercises</span>`;
  blockEl.innerHTML = `<div class="block-header cardio-pool-header" onclick="toggleCardioDropdown()">
    <span class="block-icon">\ud83d\udeb4</span>
    <span class="block-title">CARDIO</span>
    <span class="block-duration">${summary} ${isOpen?'\u25b4':'\u25be'}</span></div>${dropdownHTML}${rowsHTML}`;
  return blockEl;
}
function toggleCardioDropdown() {
  state._cardioDropdownOpen = !state._cardioDropdownOpen;
  if (state.workoutDay) refreshCardioPoolBlock(state.workoutDay);
}
function toggleCardioPoolItem(itemId) {
  if (!state.workoutDay) return;
  const s = getSession(state.workoutDay.id);
  if (!s.cardioSelected) s.cardioSelected = {};
  const turningOn = !s.cardioSelected[itemId];
  s.cardioSelected[itemId] = turningOn;
  // Picking any other cardio option clears the Bike commute row if it was
  // checked — commute stays visible (pinned, unchecked) to re-add any time.
  if (turningOn && itemId !== 'commute' && s.cardioSelected['commute']) {
    s.cardioSelected['commute'] = false;
  }
  s.touched = true;
  refreshCardioPoolBlock(state.workoutDay);
  updateTimerPlayPrompt(state.workoutDay.id);
  updateProgress(); saveSession();
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
  updateProgress(); saveSession();
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
  updateProgress(); saveSession();
}
// v1.0: single-select cardio per block. Picking an option swaps the choice;
// tapping the chosen option again clears it. Only the chosen option shows the LOG chip.
function selectCardio(blockId, exId) {
  if (!state.workoutDay) return;
  const s = getSession(state.workoutDay.id);
  if (!s.cardioChoice) s.cardioChoice = {};
  s.cardioChoice[blockId] = (s.cardioChoice[blockId] === exId) ? null : exId;
  s.touched = true;
  renderWorkoutBlocks(state.workoutDay);
  updateTimerPlayPrompt(state.workoutDay.id);
  updateProgress(); saveSession();
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
    let txt = '';
    if (hint.lastWeight != null) {
      txt = `Last: ${hint.lastWeight}kg × ${hint.lastReps}`;
      if (hint.mostUsed != null && hint.mostUsed !== hint.lastWeight) txt += ` · usually ${hint.mostUsed}kg`;
    } else if (hint.mostUsed != null) {
      txt = `Most used: ${hint.mostUsed}kg`;
    }
    document.getElementById('modal-prefill-hint').textContent = txt;
  } else {
    document.getElementById('modal-weight').value = '';
    document.getElementById('modal-reps').value   = ex.reps;
    document.getElementById('modal-prefill-hint').textContent = '';
  }
  // v0.9.9 (#8): start the rest timer the moment a Set is tapped, running quietly in the
  // background as the corner widget (in its original location) so the entry modal behaves
  // as before — you fill weight/reps, then LOG SET materialises the full rest overlay with
  // its duration choices (see confirmSet), timer already mid-count. Not for cardio blocks.
  // Rest-duration priority: 1) per-exercise restSeconds override  2) your last manual pick  3) block default.
  const isCardioBlock = (block && block.type === 'cardio') || blockId === 'cardio';
  if (!isCardioBlock) {
    const restDefaults = {warmup:30, main:180, secondary:60, cardio:0};
    const restLabels   = {warmup:'warm-up', main:'main compound · 3–5 min protocol', secondary:'accessory'};
    const hasOverride   = ex && ex.restSeconds != null;
    const hasRemembered = !hasOverride && state.lastManualRestDuration != null;
    let suggestedDur, suggestedLbl;
    if (hasOverride)        { suggestedDur = ex.restSeconds;               suggestedLbl = ex.name || ''; }
    else if (hasRemembered) { suggestedDur = state.lastManualRestDuration; suggestedLbl = 'your last pick'; }
    else                    { suggestedDur = restDefaults[blockId] !== undefined ? restDefaults[blockId] : 60; suggestedLbl = restLabels[blockId] || ''; }
    state.restPreferredDuration = suggestedDur;
    state._restCoachCtx = {dayId, blockId, exId, setIndex};
    resetRestCoachUI();
    const lbl = document.getElementById('rest-suggested-label');
    if (lbl) lbl.textContent = suggestedLbl ? `Suggested: ${suggestedDur<60?suggestedDur+'s':Math.round(suggestedDur/60)+' min'} · ${suggestedLbl}` : '';
    startRestTimer(suggestedDur);
    collapseRestToWidget();          // run in the background as the corner widget while entering reps
    const rw = document.getElementById('rest-widget'); // materialise in its original (default) corner
    if (rw) { rw.style.left = ''; rw.style.top = ''; rw.style.right = ''; rw.style.bottom = ''; }
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
  // v0.9.8: auto-tick the exercise once every set has a logged value — order-
  // independent, so logging sets out of sequence still ticks correctly once complete.
  if (ex && ex.sets > 0 && !sess.workoutChecks[exId]) {
    const logs = sess.setLogs[exId] || [];
    let allLogged = logs.length >= ex.sets;
    if (allLogged) {
      for (let i = 0; i < ex.sets; i++) {
        if (!logs[i] || logs[i].reps == null) { allLogged = false; break; }
      }
    }
    if (allLogged) {
      sess.workoutChecks[exId] = true;
      const checkEl = document.getElementById(`excheck-${exId}`);
      if (checkEl) { checkEl.classList.add('checked'); checkEl.textContent = '✓'; }
      runSilentCheck(exId);
    }
  }
  closeModal(); saveSession();
  // v0.9.9 (#8): the rest timer already started (in the background corner widget) when this
  // Set was tapped. Logging the set now materialises the full rest overlay — with its
  // duration choices — at the current, already-counting remaining time, rather than
  // restarting the timer. Cardio sets never started a timer (widget not visible), so this
  // is a no-op for them.
  {
    const overlay = document.getElementById('rest-overlay');
    const widget  = document.getElementById('rest-widget');
    if (overlay && widget && widget.classList.contains('visible')) {
      overlay.style.display = 'flex';
      widget.classList.remove('visible');
    }
  }
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
    day.blocks.forEach(b=>{
      if(b.type==='cardio'){
        total++;
        const choice=(sess.cardioChoice||{})[b.id];
        if(choice && (sess.cardioLogs||{})[choice]) done++;
      } else {
        b.exercises.forEach(ex=>{
          total++;
          if(sess.workoutChecks[ex.id])done++;
        });
      }
    });
    // v0.9.8: CARDIO section counts as one block on training days — done once
    // >=1 selected item (gym option or commute) is logged.
    if (day.type==='training' && cardioItemsForDay(day).length) {
      total++;
      const selected = Object.keys(sess.cardioSelected||{}).filter(id=>sess.cardioSelected[id]);
      if (selected.length && selected.some(id=>(sess.cardioLogs||{})[id])) done++;
    }
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
  mEl.style.whiteSpace = 'pre-line'; mEl.style.textAlign = '';
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
  const prev = state.history.find(h => h.dayId===day.id && h.weekKey===state.currentWeekKey);
  const recDate = recordDateFor(day.id, state.currentWeekKey, prev);
  // Future-guard: never write an empty auto-record for a day that hasn't happened yet.
  // (This is the current-week rest day; if its resolved date is still ahead, skip.)
  if (recDate > todayStr()) return;
  const record = {
    id: Date.now(), dayId: day.id, dayName: day.name,
    date: recDate, weekKey: state.currentWeekKey,
    dateStr: recordDateStr(recDate),
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

// ── AUDIO (shared context — v0.9.8 fix) ─────────
// Browsers (esp. iOS Safari, Chrome) suspend a freshly-created AudioContext
// unless it's created/resumed inside a direct user-gesture handler. The old
// code called `new AudioContext()` at the moment each tone played (often from
// a setInterval tick, not a tap), so the context stayed suspended and no sound
// ever came out. Fix: keep one shared context, unlock it on the first tap
// anywhere in the app, and resume() it defensively before every tone.
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  if (_audioCtx.state === 'suspended') { try { _audioCtx.resume(); } catch(e){} }
  return _audioCtx;
}
['pointerdown','touchstart','click'].forEach(evt => {
  document.addEventListener(evt, () => { getAudioCtx(); }, {once:true, passive:true});
});

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
  // Synthesised tone via Web Audio (shared, unlocked context — see getAudioCtx)
  try {
    const ctx = getAudioCtx();
    if (ctx) {
      const freq = color === 'green' ? 523 : 440;
      [0, 0.35, 0.7].forEach(offset => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
        osc.start(ctx.currentTime + offset); osc.stop(ctx.currentTime + offset + 0.25);
      });
    }
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
  if (n.includes('treadmill') || n.includes('running')) return [{key:'duration',label:'Duration (min)'},{key:'speed',label:'Speed (km/h)'},{key:'incline',label:'Incline (%)'}];
  if (n.includes('stairmaster') || n.includes('skierg') || n.includes('rowing') || n.includes('bike') || n.includes('recumbent') || n.includes('upright') || n.includes('elliptical'))
    return [{key:'duration',label:'Duration (min)'},{key:'difficulty',label:'Difficulty level'}];
  return [{key:'duration',label:'Duration (min)'}];
}
function formatCardioLog(log) {
  const parts = [];
  if (log.durationIn != null || log.durationBack != null) {
    if (log.durationIn != null)   parts.push(log.durationIn + ' min in');
    if (log.durationBack != null) parts.push(log.durationBack + ' min back');
    return parts.length ? parts.join(' · ') : 'LOGGED';
  }
  if (log.duration) parts.push(log.duration + ' min');
  if (log.speed)    parts.push(log.speed + ' km/h');
  if (log.incline)  parts.push(log.incline + '% incline');
  if (log.difficulty) parts.push('lvl ' + log.difficulty);
  if (log.hr)       parts.push(log.hr + ' bpm avg');
  return parts.length ? parts.join(' · ') : 'LOGGED';
}

// ── CARDIO MODAL ─────────────────────────
// v0.9.8: commute is now just another cardioPool entry — special-cased here by
// id (not name, since "Bike commute" would otherwise match the bike keyword and
// pull in fields it doesn't need). Commute logs duration each way, not HR.
let _cardioModalCtx = null;
function cardioLogFields(exId, exName) {
  if (exId === 'commute') return [{key:'durationIn',label:'Duration in (min)'},{key:'durationBack',label:'Duration back (min)'}];
  return getCardioFields(exName);
}
function openCardioModal(dayId, exId, exName) {
  _cardioModalCtx = {dayId, exId, exName};
  const sess = getSession(dayId);
  const saved = (sess.cardioLogs||{})[exId] || {};
  const fields = cardioLogFields(exId, exName);
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
  const fields = cardioLogFields(exId, exName);
  const log = {};
  fields.forEach(f => {
    const v = parseFloat(document.getElementById('cmi-' + f.key)?.value);
    if (!isNaN(v)) log[f.key] = v;
  });
  sess.cardioLogs[exId] = log;
  sess.touched = true;
  saveSession();
  if (typeof updateProgress === 'function') updateProgress();
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
  // v0.9.8: remember this as a lasting preference — survives app restarts,
  // and is suggested ahead of the generic block-type default next time.
  state.lastManualRestDuration = s;
  try { localStorage.setItem('gymdolph_lastManualRest', String(s)); } catch(e){}
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
      const ctx = getAudioCtx();
      if (ctx) {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 659; osc.type = 'sine'; // E5 — bright, distinct
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(); osc.stop(ctx.currentTime + 0.5);
      }
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
  if (!el) return;
  // v0.9.10 — idempotence guard. This is called from two places that both fire
  // repeatedly on a live element that is never destroyed:
  //   · collapseRestToWidget()  — every single set, all session long
  //   · ensureHRWidgetInteractions() — already had its own `_hrWidgetInteractionsBound` flag
  // Each call built FRESH closures for onStart/onMove/onEnd, so addEventListener
  // could not dedupe them (it only ignores an identical type+callback+capture
  // triple). Result: after 30 sets, #rest-widget carried 30 mousedown and 30
  // touchstart handlers, each firing on every tap. Guarding on the element itself
  // fixes both call sites and any future one, rather than repeating the flag.
  if (el.dataset.dragBound === '1') return;
  el.dataset.dragBound = '1';
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
    if (!moved && onTap) {
      // Suppress the browser's synthesized 'click' that follows touchend — it
      // would otherwise land on whatever the tap opened (e.g. the HR focus
      // overlay's tap-to-close backdrop) and instantly dismiss it.
      if (e.cancelable && e.type === 'touchend') e.preventDefault();
      onTap();
    }
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

// HR widget: tap → open HR Display (drag handled by makeDraggableWidget)
function hrWidgetTap() {
  openHRFocus();
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
      const chk = isC ? ((sess.cardioChoice||{})[b.id]===ex.id) : !!sess.workoutChecks[ex.id];
      const sets = sess.setLogs[ex.id] || [];
      exercises.push({id:ex.id, name:ex.name, checked:chk,
        sets: ex.sets || 1,
        weight: sets.filter(s=>s&&s.weight>0).map(s=>`${s.weight}kg×${s.reps}`).join(', '),
        setLogs: sets});
    }));
  }
  const duration = getTimerSecs();
  const existing = state.history.findIndex(h => h.dayId===day.id && h.weekKey===state.currentWeekKey);
  const recDate  = recordDateFor(day.id, state.currentWeekKey, existing >= 0 ? state.history[existing] : null);
  const record = {
    id:        existing >= 0 ? state.history[existing].id : Date.now(),
    dayId:     day.id, dayName: day.name,
    date:      recDate, weekKey: state.currentWeekKey,
    dateStr:   recordDateStr(recDate),
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
      const chk=isC?((sess.cardioChoice||{})[b.id]===ex.id):!!sess.workoutChecks[ex.id];
      const sets=sess.setLogs[ex.id]||[];
      exercises.push({id:ex.id, name:ex.name, checked:chk,
        weight:sets.filter(s=>s&&s.weight>0).map(s=>`${s.weight}kg×${s.reps}`).join(', '),
        setLogs:sets});
    }));
  }
  // v0.9.8: unified CARDIO section (gym pool + commute) — record every selected
  // item, with its log if present. Applies on any day that had a CARDIO section
  // (training, and rest/stretch days with commute).
  cardioItemsForDay(day).forEach(item=>{
    if (!(sess.cardioSelected||{})[item.id]) return;
    const log = (sess.cardioLogs||{})[item.id];
    exercises.push({id:item.id, name:item.name, checked:true,
      weight: log ? formatCardioLog(log) : '', setLogs:[]});
  });

  // v0.9.9 (#7): active-day activities (Saturday) — record each picked activity + minutes.
  // v0.9.9 (#5): yoga session log — pushed as a single summary entry.
  if (day.type==='stretch' && day.yogaLog && sess.yogaSessionLog && (sess.yogaSessionLog.duration || sess.yogaSessionLog.style)) {
    const yl = sess.yogaSessionLog;
    const parts = [yl.duration?`${yl.duration} min`:null, yl.style||null].filter(Boolean);
    exercises.push({id:'yoga_session', name:'Yoga', checked:true, weight: parts.join(' · '), setLogs:[]});
  }
  if (day.type==='cardio_day') {
    const al = sess.activeLog || {};
    activeDayActivities(day).forEach(a=>{
      const rec = al[a.id]; if (!rec) return;
      const m = rec.mins;
      const nm = a.free ? ((rec.text||'').trim() || a.label) : a.label;
      exercises.push({id:'act_'+a.id, name:nm, checked:true,
        weight:(m!=null && m!=='') ? `${m} min` : '', setLogs:[]});
    });
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
        activeLog: JSON.parse(JSON.stringify(sess.activeLog || {})),
        yogaSessionLog: JSON.parse(JSON.stringify(sess.yogaSessionLog || {duration:null,style:null})),
        exercises,
      };
    }
    state._editingHistoryId = null;
  } else {
    state.weekSessions[day.id] = {
      checks:      JSON.parse(JSON.stringify(sess.workoutChecks || {})),
      setLogs:     JSON.parse(JSON.stringify(sess.setLogs || {})),
      cardioChecks:JSON.parse(JSON.stringify(sess.cardioChecks || {})),
      cardioSelected: JSON.parse(JSON.stringify(sess.cardioSelected || {})),
      cardioLogs:     JSON.parse(JSON.stringify(sess.cardioLogs || {})),
      commuteChecked: !!sess.commuteChecked,
      commuteLog:     sess.commuteLog ? JSON.parse(JSON.stringify(sess.commuteLog)) : null,
      activeLog:      JSON.parse(JSON.stringify(sess.activeLog || {})),
      yogaSessionLog: JSON.parse(JSON.stringify(sess.yogaSessionLog || {duration:null,style:null})),
      exercises, duration
    };
    const existing = state.history.findIndex(h=>h.dayId===day.id && h.weekKey===state.currentWeekKey);
    const recDate  = recordDateFor(day.id, state.currentWeekKey, existing>=0 ? state.history[existing] : null);
    const record = {
      id:       existing>=0 ? state.history[existing].id : Date.now(),
      dayId:    day.id, dayName:day.name,
      date:     recDate, weekKey:state.currentWeekKey,
      dateStr:  recordDateStr(recDate),
      duration, durationStr:formatDuration(duration),
      setLogs:  JSON.parse(JSON.stringify(sess.setLogs || {})),
      checks:   JSON.parse(JSON.stringify(sess.workoutChecks || {})),
      activeLog: JSON.parse(JSON.stringify(sess.activeLog || {})),
      yogaSessionLog: JSON.parse(JSON.stringify(sess.yogaSessionLog || {duration:null,style:null})),
      exercises,
    };
    if (existing>=0) state.history[existing]=record; else state.history.unshift(record);
    // v0.9.10: one way to compute the streak, not two. The old inline heuristic
    // (increment if today is the newest date and yesterday is the one before it)
    // disagreed with recalcStreak() and double-counted or missed days whenever a
    // session was logged for a day other than today.
    recalcStreak();
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
function showPhaseInfo(){
  appAlert('PHASE ANGLE (°)',
    'A measure of cellular health derived from bioelectrical impedance. The machine sends a weak electrical current through your body and measures how well your cell membranes resist it — healthier, better-hydrated cells resist more, producing a higher angle.\n\n'
    + 'A higher phase angle means denser muscle, better cell membrane integrity, and stronger overall cellular function. It rises with consistent resistance training, good protein intake, sleep, and an anti-inflammatory diet — and drops with poor recovery, dehydration, or excess body fat.');
  const m = document.getElementById('app-dialog-msg'); if (m) m.style.textAlign = 'left';
}
function openBodyStatsModal(editDate) {
  const targetDate = editDate || todayStr();
  const existing = state.bodyStats.find(e => e.date === targetDate);
  document.getElementById('bsm-weight').value = existing && existing.weight!=null ? existing.weight : '';
  document.getElementById('bsm-bf').value     = existing && existing.bf!=null     ? existing.bf     : '';
  document.getElementById('bsm-muscle').value = existing && existing.muscle!=null ? existing.muscle : '';
  document.getElementById('bsm-phase').value  = existing && existing.phase!=null  ? existing.phase  : '';
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
  const phase  = parseFloat(document.getElementById('bsm-phase').value);
  const hasAny = !isNaN(weight) || !isNaN(bf) || !isNaN(muscle) || !isNaN(phase);
  if (!hasAny) { closeBodyStatsModal(); return; }
  const targetDate = document.getElementById('body-stats-modal').dataset.editDate || todayStr();
  const entry = {
    date:   targetDate,
    weight: isNaN(weight) ? null : weight,
    bf:     isNaN(bf)     ? null : bf,
    muscle: isNaN(muscle) ? null : muscle,
    phase:  isNaN(phase)  ? null : phase,
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
  const latestPhase  = state.bodyStats.find(e => e.phase  != null);

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
    ${latestMuscle ? card('MUSCLE MASS', 'kg', 'muscle', latestMuscle) : emptyCard('MUSCLE MASS','kg','muscle')}
    ${latestPhase  ? card('PHASE ANGLE', '°', 'phase', latestPhase)    : emptyCard('PHASE ANGLE','°','phase')}`;
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
  // v0.9.9: restore the structured cardio state saved with the record so that
  // editing a past workout no longer wipes the cardio block (duration / distance /
  // difficulty / commute legs). Older pre-v0.9.9 records didn't store structured
  // cardio, so for those we fall back to reconstructing selections from the saved
  // `exercises` tick state (tick-only, no numeric fields — the best we can do).
  const hasSavedCardio = !!(record.cardioSelected || record.cardioLogs ||
    record.cardioChecks || record.commuteLog || record.commuteChecked !== undefined);
  const reconSelected = {};
  if (!hasSavedCardio) {
    (record.exercises||[]).forEach(ex=>{
      if (!ex.checked) return;
      if (window.PROGRAM.cardioPool && window.PROGRAM.cardioPool.some(p=>p.id===ex.id)) {
        reconSelected[ex.id] = true;
      }
    });
  }
  state.sessions[day.id] = {
    setLogs:        JSON.parse(JSON.stringify(record.setLogs || {})),
    workoutChecks:  JSON.parse(JSON.stringify(record.checks  || {})),
    cardioChecks:   JSON.parse(JSON.stringify(record.cardioChecks || {})),
    cardioChoice:   {},
    cardioSelected: hasSavedCardio ? JSON.parse(JSON.stringify(record.cardioSelected || {})) : reconSelected,
    cardioLogs:     JSON.parse(JSON.stringify(record.cardioLogs || {})),
    commuteChecked: !!record.commuteChecked,
    commuteLog:     record.commuteLog ? JSON.parse(JSON.stringify(record.commuteLog)) : null,
    activeLog:      JSON.parse(JSON.stringify(record.activeLog || {})),
    yogaSessionLog: JSON.parse(JSON.stringify(record.yogaSessionLog || {duration:null,style:null})),
    _cardioDefaultsApplied: true, // selections already resolved — don't re-apply the commute default
    touched:        true,
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
// EX_INFO: generic exercise cue/muscle/video reference (restored from retired data.js).
const EX_INFO = {
  'bench press': {
    muscles: 'Pectorals · Anterior deltoid · Triceps',
    cues: ['Retract scapulae before unracking', 'Bar path: slight diagonal, not straight down', 'Feet flat, drive through heels', 'Touch chest lightly, press explosively'],
    note: null, yt: 'bench press proper form tutorial'
  },
  'incline chest press (plate load)': {
    muscles: 'Upper pectorals · Anterior deltoid · Triceps',
    cues: ['Keep slight incline — avoid steep angle', 'Elbows at ~45° from torso', 'Full stretch at bottom, squeeze at top', 'Control the eccentric (lowering)'],
    note: '⚠ Left shoulder: reduce ROM if any pinch', yt: 'incline chest press machine form'
  },
  'pec fly / rear delt machine': {
    muscles: 'Pectorals (fly) · Rear deltoids · Rhomboids (rear setting)',
    cues: ['Fly: slight elbow bend, arc like hugging a tree', 'Rear delt: lead with elbows back, not hands', 'Keep chest tall throughout', 'No jerking — slow controlled movement'],
    note: null, yt: 'pec deck fly rear delt machine form'
  },
  'cable crossover (compact)': {
    muscles: 'Pectorals (inner & lower) · Anterior deltoid',
    cues: ['Low-to-high: pull from low pulley upward', 'Lean slightly forward, brace core', 'Arms slightly bent throughout', 'Squeeze chest hard at the cross point'],
    note: null, yt: 'cable crossover low to high chest form'
  },
  'seated dip machine': {
    muscles: 'Triceps (all 3 heads) · Lower pectorals',
    cues: ['Grip neutral, elbows close to body', 'Push through full extension, squeeze triceps', 'Lower slowly — 2–3 seconds down', 'Keep torso upright, avoid leaning forward'],
    note: '⚠ Left shoulder: if any pinch, reduce range', yt: 'seated dip machine triceps form'
  },
  'cable tricep pushdown': {
    muscles: 'Triceps (lateral & medial head)',
    cues: ['Elbows pinned to sides throughout', 'Push straight down, full extension', 'Resist the cable on the way back up', 'Keep upper body still — no swinging'],
    note: null, yt: 'cable tricep pushdown form tutorial'
  },
  'overhead tricep extension (cable)': {
    muscles: 'Triceps (long head emphasis)',
    cues: ['Face away from stack, arms overhead', 'Elbows forward and close together', 'Lower until 90° bend, press to full extension', 'Keep core braced, no lumbar arch'],
    note: '⚠ Left shoulder: stop if overhead position causes pain', yt: 'overhead cable tricep extension form'
  },
  'bag extension machine': {
    muscles: 'Triceps (all heads)',
    cues: ['Control the lowering phase', 'Full extension at top, squeeze', 'Elbows stay fixed — only forearms move', 'Choose weight that allows clean reps'],
    note: null, yt: 'tricep extension machine form'
  },
  'barbell row (smith machine)': {
    muscles: 'Latissimus dorsi · Rhomboids · Rear deltoids · Biceps',
    cues: ['Hip hinge: push hips back, keep back flat', 'Pull bar to lower chest/upper abs', 'Lead with elbows, not hands', 'Smith machine guides path — still brace core'],
    note: '⚠ Spondylolisthesis: neutral spine is critical — no rounding', yt: 'smith machine barbell row form'
  },
  'lat pull-down (cable)': {
    muscles: 'Latissimus dorsi · Teres major · Biceps',
    cues: ['Pull to chin — never behind neck', 'Lean back slightly, chest up', 'Drive elbows toward hips, not floor', 'Controlled return — stretch the lats'],
    note: null, yt: 'lat pulldown cable form tutorial'
  },
  'low row machine': {
    muscles: 'Latissimus dorsi · Mid-back · Biceps',
    cues: ['Chest against pad, back straight', 'Pull handles to lower chest', 'Squeeze shoulder blades at contraction', 'Slow eccentric — 2–3 seconds out'],
    note: null, yt: 'seated low row machine form'
  },
  't-bar row (plate load)': {
    muscles: 'Mid-back · Lats · Rhomboids · Biceps',
    cues: ['Chest on pad, neutral spine', 'Pull to upper abdomen', 'Lead with elbows wide and up', 'No jerking the weight up'],
    note: '⚠ Spondylolisthesis: prefer chest-supported version', yt: 't-bar row chest supported form'
  },
  'high row (plate load)': {
    muscles: 'Upper lats · Rear deltoids · Teres major',
    cues: ['Arms start high, pull down and back', 'Think: drive elbows toward back pockets', 'Keep torso stable throughout', 'Full stretch at top before each rep'],
    note: null, yt: 'high row machine form tutorial'
  },
  'barbell curl (curl bench)': {
    muscles: 'Biceps brachii · Brachialis',
    cues: ['Elbows stay pinned to sides', 'Curl to shoulder height, full contraction', 'Lower slowly — 2–3 seconds', 'No swinging — strict form'],
    note: null, yt: 'barbell curl strict form tutorial'
  },
  'bicep curl machine': {
    muscles: 'Biceps brachii (peak contraction)',
    cues: ['Chest pad supports — no cheating possible', 'Full extension at bottom for max stretch', 'Squeeze at top for 1 second', 'Control the weight down'],
    note: null, yt: 'bicep curl machine form'
  },
  'dumbbell hammer curl': {
    muscles: 'Brachialis · Brachioradialis · Biceps',
    cues: ['Neutral grip (thumbs up) throughout', 'Curl straight up — no rotation', 'Elbows stay at sides', 'Alternate arms or simultaneous'],
    note: null, yt: 'dumbbell hammer curl form'
  },
  'assisted chin-up (narrow grip)': {
    muscles: 'Lats · Biceps · Lower trapezius',
    cues: ['Palms facing you, hands shoulder-width', 'Start from dead hang, retract scapulae first', 'Pull chest toward bar', 'Lower fully — no half reps'],
    note: null, yt: 'assisted chin up form tutorial'
  },
  'barbell squat (power rack)': {
    muscles: 'Quadriceps · Glutes · Hamstrings · Core',
    cues: ['Bar on upper traps, not neck', 'Brace core like a punch is coming', 'Knees track over toes throughout', 'Descend to parallel, drive through heels'],
    note: '⚠ Spondylolisthesis: brace hard, avoid butt wink (pelvis tuck at bottom)', yt: 'barbell squat proper form spondylolisthesis safe'
  },
  'hack squat machine': {
    muscles: 'Quadriceps · Glutes',
    cues: ['Feet shoulder-width, toes slightly out', 'Back flat against pad throughout', 'Descend to 90°, push through full foot', 'Keep knees tracking over toes'],
    note: null, yt: 'hack squat machine form tutorial'
  },
  'seated leg press': {
    muscles: 'Quadriceps · Glutes · Hamstrings',
    cues: ['Feet shoulder-width, mid-platform', 'Lower until 90° knee bend — no more', 'Push through heels, not toes', 'Never lock knees at extension'],
    note: '⚠ Spondylolisthesis: keep lower back flat on pad — never let it peel off', yt: 'seated leg press form lower back safe'
  },
  'leg extension machine': {
    muscles: 'Quadriceps (all 4 heads)',
    cues: ['Shin pad just above ankle', 'Extend to full lockout, squeeze quads', 'Lower slowly — 3 seconds', 'No jerking the weight up'],
    note: null, yt: 'leg extension machine form'
  },
  'seated leg curl': {
    muscles: 'Hamstrings · Gastrocnemius',
    cues: ['Pad rests on lower calves', 'Curl fully — heels toward glutes', 'Squeeze hamstrings at peak contraction', 'Control return — 2–3 seconds'],
    note: null, yt: 'seated leg curl machine form'
  },
  'hip thrust machine': {
    muscles: 'Glutes (maximum activation) · Hamstrings',
    cues: ['Drive through heels, not toes', 'Squeeze glutes hard at top', 'Avoid hyperextending lower back at top', 'Keep chin tucked throughout'],
    note: '⚠ Spondylolisthesis: stop at neutral hip — no hyperextension', yt: 'hip thrust machine form glutes'
  },
  'inner / outer thigh machine': {
    muscles: 'Adductors (inner) · Abductors / TFL (outer)',
    cues: ['Slow controlled movement both directions', 'Keep torso upright, no leaning', 'Full range of motion each rep', 'Breathe out on exertion'],
    note: null, yt: 'inner outer thigh machine form'
  },
  'link hip abduction': {
    muscles: 'Gluteus medius · TFL · Hip abductors',
    cues: ['Stand tall, slight knee bend on stance leg', 'Lift leg to side — no hip hiking', 'Control the return slowly', 'Keep pelvis level throughout'],
    note: null, yt: 'cable hip abduction machine form'
  },
  'seated calf raise': {
    muscles: 'Soleus (deep calf) · Gastrocnemius',
    cues: ['Ball of foot on platform edge', 'Full stretch at bottom — feel the pull', 'Rise as high as possible, pause at top', 'Slow and controlled — calves respond to TUT'],
    note: null, yt: 'seated calf raise form tutorial'
  },
  'shoulder press machine': {
    muscles: 'Deltoids (anterior & medial) · Trapezius · Triceps',
    cues: ['Seat height: handles at shoulder level', 'Press to near-full extension — not locked out', 'Lower slowly to shoulder height', 'Keep lower back against pad'],
    note: '⚠ Left shoulder: use machine over free bar for safer path', yt: 'shoulder press machine form'
  },
  'standing lateral raise machine': {
    muscles: 'Medial deltoid · Supraspinatus',
    cues: ['Slight forward lean at hips', 'Lead with elbows, not wrists', 'Raise to shoulder height only — no higher', 'Slow on the way down'],
    note: '⚠ Left shoulder: reduce weight, stop if any pain', yt: 'lateral raise machine form medial deltoid'
  },
  'rear delt fly (pec fly machine)': {
    muscles: 'Posterior deltoid · Rhomboids · Mid-trapezius',
    cues: ['Arms start in front, move laterally back', 'Lead with elbows, slight bend maintained', 'Squeeze shoulder blades together at end', 'No jerking — strict controlled motion'],
    note: null, yt: 'rear delt fly pec deck machine form'
  },
  'dumbbell lateral raises': {
    muscles: 'Medial deltoid',
    cues: ['Slight elbow bend — "hugging a barrel"', 'Lead with pinky-side of hand', 'Raise to shoulder level only', 'Lower 3 seconds — the eccentric builds the muscle'],
    note: '⚠ Left shoulder: very light weight, stop at first sign of pain', yt: 'dumbbell lateral raise perfect form'
  },
  'abdominal machine (crunch)': {
    muscles: 'Rectus abdominis · Obliques',
    cues: ["Round the upper spine — don't just hip flex", 'Exhale hard at the crunch', 'Pause at full contraction', 'Slow return — keep tension on abs'],
    note: '⚠ Spondylolisthesis: machine guides ROM safely — avoid hip flexor dominance', yt: 'ab crunch machine form core'
  },
  'rotary torso machine': {
    muscles: 'Obliques · Transverse abdominis',
    cues: ['Rotate only to comfortable range', 'Keep hips square and still', 'Slow and controlled both ways', 'Breathe out on rotation'],
    note: '⚠ Spondylolisthesis: machine-guided rotation is safest — never twist aggressively', yt: 'rotary torso machine obliques form'
  },
  'leg raise (station)': {
    muscles: 'Lower rectus abdominis · Hip flexors',
    cues: ['Hang fully, brace core before lifting', 'Raise legs to 90° or as far as comfortable', "Lower slowly — don't just drop", 'Posterior pelvic tilt at the top activates lower abs'],
    note: '⚠ Spondylolisthesis: if lower back arches excessively, bend knees instead', yt: 'hanging leg raise form lower abs'
  },
  'back extension (bodyweight only)': {
    muscles: 'Erector spinae · Glutes · Hamstrings',
    cues: ['Bodyweight only — no added weight', 'Rise until body is straight — not hyperextended', 'Squeeze glutes at top', 'Lower slowly and controlled'],
    note: '⚠ Spondylolisthesis: STOP at neutral position — no extension beyond straight', yt: 'back extension machine safe form lower back'
  },
  'recumbent bike': {
    muscles: 'Cardiovascular · Quadriceps · Hamstrings',
    cues: ['Back fully supported throughout', 'Seat distance: slight knee bend at bottom', 'Moderate cadence 70–90 RPM', 'Zero spinal compression — ideal for back'],
    note: null, yt: 'recumbent bike proper form cardio'
  },
  'cross trainer': {
    muscles: 'Full body cardiovascular · Glutes · Quads · Core',
    cues: ['Arms active — push and pull', 'Upright posture, eyes forward', 'Resist the temptation to lean on handles', 'Smooth gliding motion — no jerking'],
    note: null, yt: 'elliptical cross trainer proper form'
  },
  'upright bike': {
    muscles: 'Cardiovascular · Quadriceps · Hamstrings · Glutes',
    cues: ['Seat height: near-full leg extension at bottom', 'Slight forward lean at higher efforts', 'Stay seated — especially for spondylolisthesis', 'Cadence 80–100 RPM on easy, 70–80 on hard'],
    note: null, yt: 'upright exercise bike proper form'
  },
};

function getExInfo(name) { return EX_INFO[name.toLowerCase().trim()]||null; }

// Hybrid cue resolution (C): program overrides on the exercise win per-field;
// otherwise fall back to the engine EX_INFO baseline (matched by name).
// `cues` on the exercise fully replace baseline cues (no merge).
function resolveExInfo(ex) {
  const base = (ex && ex.name) ? getExInfo(ex.name) : null;
  if (!ex) return base;
  const hasOverride = ex.cues || ex.muscles || ex.guideNote || ex.yt;
  if (!hasOverride) return base;
  return {
    cues:    ex.cues      || (base && base.cues)    || null,
    muscles: ex.muscles   || (base && base.muscles) || null,
    yt:      ex.yt        || (base && base.yt)       || '',
    note:    ex.guideNote || (base && base.note)     || null
  };
}

// Resolve a video target for an exercise: custom saved > direct yt property > EX_INFO default
function guideVideoTarget(name, ex) {
  const custom = state.ytLinks && state.ytLinks[name];
  if (custom) return custom;
  if (ex && ex.yt) return ex.yt;
  const info = getExInfo(name);
  return info ? (info.yt || '') : '';
}

function guideShortDesc(ex, blockType) {
  const info = resolveExInfo(ex);
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
  const guideBlocks = day.blocks.slice();
  // v0.9.8: append the unified CARDIO section (gym pool + commute, same set the
  // workout view offers) so cues/video links stay reachable outside day.blocks.
  const cardioItems = cardioItemsForDay(day);
  if (cardioItems.length) {
    guideBlocks.push({ title: 'CARDIO', type: 'cardio', exercises: cardioItems.map(item => ({
      id: item.id, name: item.name, prescription: item.prescription,
      muscles: item.muscles, cues: item.cues, yt: item.yt
    })) });
  }
  guideBlocks.forEach(block => {
    const label = (block.bodyPart || block.typeLabel || BLOCK_TYPE_LABEL[block.type] || block.title || '').toUpperCase();
    html += `<div class="guide-section-label">${label}</div>`;
    (block.exercises||[]).forEach(ex => {
      const rid = 'gx-' + ex.id;
      const vid = guideVideoTarget(ex.name, ex);
      const info = resolveExInfo(ex);
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
  renderMilestones();
}
// v0.9.9 (#6) ── MILESTONE EVOLUTION ────────────────────────────────────────
// Presence-driven: renders only if the program authors `milestones` (any app
// without one shows nothing). Each ladder is a list of steps; tapping a step
// marks it achieved (dated) after confirm, tapping again un-marks it. The
// first un-achieved step is highlighted as CURRENT. Hybrid auto-nudge: a step
// may carry an optional machine-checkable `auto` field —
//   auto: { field:'weight'|'bf'|'muscle', max: N }   (met when latest ≤ N)
//   auto: { field:'weight'|'bf'|'muscle', min: N }   (met when latest ≥ N)
// — checked against the most recent body-stats entry. When met and the step
// isn't ticked yet, it glows with a "looks achieved — tap to confirm" hint.
// Confirmation is always manual; nothing self-ticks. Steps without `auto`
// are manual-only (e.g. visceral fat isn't tracked in body stats).
// Migration: milestone ladder keys were renamed 'pullup'->'performance' and
// 'bodyComp'->'bodycomp' (progress is generic across athletes, not pull-up-
// specific — Emily's performance milestone won't be pull-ups). Remaps any
// progress saved under the old key format so it isn't silently orphaned by
// the rename. Used both on localStorage load and on Drive/file import, since
// an older backup could still carry the old key format.
function migrateMilestoneKeys(mp) {
  if (!mp || typeof mp !== 'object') return mp || {};
  const remapped = {};
  let changed = false;
  for (const k in mp) {
    let nk = k;
    if (k.startsWith('pullup:'))   { nk = 'performance:' + k.slice(7); changed = true; }
    if (k.startsWith('bodyComp:')) { nk = 'bodycomp:'    + k.slice(9); changed = true; }
    remapped[nk] = mp[k];
  }
  return changed ? remapped : mp;
}
const MILESTONE_LADDERS = [
  {key:'performance', title:'PROGRESSION',     icon:'🐬', cardLabel:''},
  {key:'bodycomp',    title:'BODY COMPOSITION', icon:'📉', cardLabel:''},
];
// Default badge emoji per ladder, by step index (a step may override with its own `icon`).
const MILESTONE_BADGES = {
  performance: ['🐟','🐠','🐬','🦈','🐳'],   // sea beings — escalating
  bodycomp:    ['🔥','⚖️','🏅'],
};
// v0.9.9: turns a static authored timeline ("6 months", "Week 6", "3-6 months") into
// a vague, always-up-to-date projection ("In 4 months") measured from the program's
// milestones.startDate. Unparseable/qualitative timelines (e.g. "Weeks ahead") are
// left exactly as authored — never forced into a number that isn't there.
function parseTimelineTarget(tl){
  if (!tl) return null;
  const s = String(tl).trim();
  if (/^now$/i.test(s)) return {unit:'weeks', value:0};
  let m;
  if ((m = s.match(/^week\s+(\d+)/i)))            return {unit:'weeks',  value:+m[1]};
  if ((m = s.match(/^month\s+(\d+)/i)))           return {unit:'months', value:+m[1]};
  if ((m = s.match(/^(\d+)\s*-\s*(\d+)\s*months?/i))) return {unit:'months', value:+m[2]}; // range → upper bound
  if ((m = s.match(/^(\d+)\s*months?/i)))         return {unit:'months', value:+m[1]};
  if ((m = s.match(/^(\d+)\s*weeks?/i)))          return {unit:'weeks',  value:+m[1]};
  return null;
}
function milestoneTimelineText(tl, startDate){
  const parsed = parseTimelineTarget(tl);
  if (!parsed || !startDate) return tl || '';       // can't compute — show authored text as-is
  if (parsed.value === 0) return '';                // "Now" — it's current, nothing to project
  const base = new Date(startDate + 'T00:00:00');
  const elapsedDays = (Date.now() - base.getTime()) / 86400000;
  const elapsedUnits = parsed.unit === 'weeks' ? elapsedDays/7 : elapsedDays/30.44;
  const remaining = parsed.value - elapsedUnits;
  if (remaining <= 0.5) return 'Due now';
  const rounded = Math.max(1, Math.round(remaining));
  const label = parsed.unit === 'weeks' ? (rounded===1?'week':'weeks') : (rounded===1?'month':'months');
  return `In ${rounded} ${label}`;
}
function milestoneAutoMet(step){
  if (!step || !step.auto || !step.auto.field) return false;
  const latest = (state.bodyStats && state.bodyStats.length) ? state.bodyStats[0] : null;
  if (!latest) return false;
  const v = latest[step.auto.field];
  if (v == null || v === '') return false;
  if (step.auto.max != null) return Number(v) <= Number(step.auto.max);
  if (step.auto.min != null) return Number(v) >= Number(step.auto.min);
  return false;
}
function renderMilestones(){
  const section = document.getElementById('milestones-section');
  const body    = document.getElementById('milestones-body');
  if (!section || !body) return;
  const ms = window.PROGRAM && window.PROGRAM.milestones;
  const ladders = MILESTONE_LADDERS.filter(l => Array.isArray(ms && ms[l.key]) && ms[l.key].length);
  if (!ladders.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  const prog = state.milestoneProgress || {};
  const startDate = ms.startDate || null;
  body.innerHTML = ladders.map(l=>{
    const steps = ms[l.key];
    let currentIdx = steps.findIndex((_,i)=>!prog[`${l.key}:${i}`]);
    if (currentIdx === -1) currentIdx = steps.length - 1; // ladder complete — centre the last badge
    const cards = steps.map((st,i)=>{
      const id    = `${l.key}:${i}`;
      const done  = prog[id];
      const isCur = !done && i === currentIdx;
      const nudge = !done && milestoneAutoMet(st);
      const badge = st.icon || (MILESTONE_BADGES[l.key]||[])[i] || '🏔️';
      const target = st.target || '';
      const topLabel = st.metric || l.cardLabel || '';
      const timelineText = milestoneTimelineText(st.timeline, startDate);
      const meta = done ? '' : (nudge ? 'Looks achieved — tap to confirm' : timelineText);
      return `<div class="ms-card${done?' done':''}${isCur?' current':''}${nudge?' nudge':''}"
          data-idx="${i}" onclick="toggleMilestone('${l.key}',${i})">
        ${topLabel ? `<div class="ms-card-toplabel">${topLabel}</div>` : ''}
        <div class="ms-badge">${badge}</div>
        <div class="ms-text">
          <div class="ms-card-target">${target}</div>
          ${meta ? `<div class="ms-card-meta">${meta}</div>` : ''}
        </div>
        ${done ? `<div class="ms-stamp"><span class="ms-stamp-tick">✓</span><span class="ms-stamp-date">${done.date}</span></div>` : ''}
      </div>`;
    }).join('');
    return `<div class="ms-ladder">
      <div class="ms-ladder-title"><span>${l.icon}</span>${l.title}</div>
      <div class="ms-carousel" id="ms-carousel-${l.key}" data-current="${currentIdx}">${cards}</div>
    </div>`;
  }).join('');
  // Centre each carousel on the milestone currently being chased.
  ladders.forEach(l=>{
    const car = document.getElementById(`ms-carousel-${l.key}`);
    if (!car) return;
    const cur = car.querySelector(`.ms-card[data-idx="${car.dataset.current}"]`);
    if (cur) requestAnimationFrame(()=>{
      car.scrollLeft = cur.offsetLeft - (car.clientWidth - cur.clientWidth)/2;
    });
  });
}
function toggleMilestone(ladderKey, idx){
  const ms = window.PROGRAM && window.PROGRAM.milestones;
  const step = ms && Array.isArray(ms[ladderKey]) ? ms[ladderKey][idx] : null;
  if (!step) return;
  const id = `${ladderKey}:${idx}`;
  const prog = state.milestoneProgress || (state.milestoneProgress = {});
  const label = (step.metric ? step.metric + ' — ' : '') + (step.target || '');
  if (prog[id]) {
    appConfirm('UNDO MILESTONE', `Un-mark "${label}" (achieved ${prog[id].date})?`, ()=>{
      delete prog[id]; save(); renderMilestones();
    }, 'UNDO', 'KEEP');
  } else {
    appConfirm('MILESTONE ACHIEVED?', `Mark "${label}" as achieved today?`, ()=>{
      prog[id] = {date: todayStr()}; save(); renderMilestones();
    }, 'ACHIEVED ✓', 'NOT YET');
  }
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
  const cutoffStr = localDateStr(cutoff);

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
  const phChip = chip('PHASE',   metricTrend('phase'),  false);

  el.style.display = 'block';
  el.innerHTML = `<div style="font-family:var(--font-head),sans-serif;font-size:10px;letter-spacing:1px;color:var(--text-dim);margin-bottom:6px;">LAST 3 MONTHS</div><div>${wChip}${bfChip}${mChip}${phChip}</div>`;
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
  const phases  = entries.map(e=>e.phase);
  const hasBf   = bfs.some(v=>v!=null);
  const hasMuscle = muscles.some(v=>v!=null);
  const hasPhase = phases.some(v=>v!=null);
  drawDualLineChart(canvas, labels, weights, hasBf ? bfs : null, false, hasMuscle ? muscles : null, hasPhase ? phases : null);
}
function drawDualLineChart(canvas, labels, weights, bfs, tall, muscles, phases) {
  if (!canvas) return;
  if (!canvas.offsetParent && !tall) return; // not visible yet
  const dpr=window.devicePixelRatio||1, W=canvas.offsetWidth||340, H=tall?320:200;
  canvas.width=W*dpr; canvas.height=H*dpr;
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr); ctx.clearRect(0,0,W,H);
  const hasBfR = bfs && bfs.some(v=>v!=null);
  const hasPhR = phases && phases.some(v=>v!=null);
  const p={top:28,right:(hasBfR&&hasPhR)?62:((hasBfR||hasPhR||muscles)?44:16),bottom:36,left:44};
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

  // Phase angle line (amber, own right-side scale, dashed) — scale (5–10°) differs from weight/bf
  if(phases && phases.some(v=>v!=null)){
    const phVals=phases.filter(v=>v!=null);
    const phMin=Math.min(...phVals)-0.3, phMax=Math.max(...phVals)+0.3, phRng=phMax-phMin||1;
    const yph=v=>p.top+ch-(v-phMin)/phRng*ch;
    ctx.beginPath(); let sp=false;
    phases.forEach((v,i)=>{if(v==null)return; if(!sp){ctx.moveTo(xPos(i),yph(v));sp=true;}else ctx.lineTo(xPos(i),yph(v));});
    ctx.strokeStyle=themeColor('--chart-phase'); ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([]);
    phases.forEach((v,i)=>{if(v==null)return;ctx.beginPath();ctx.arc(xPos(i),yph(v),2.5,0,Math.PI*2);ctx.fillStyle=themeColor('--chart-phase');ctx.fill();});
    ctx.fillStyle=themeRGBA('--chart-phase-rgb',0.8); ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='right';
    [0,.5,1].forEach(t=>{const v=phMin+phRng*t; ctx.fillText((Math.round(v*10)/10)+'°',W-4,yph(v)+4);});
  }


  // X axis labels
  ctx.fillStyle=themeRGBA('--text-dim-rgb',0.8); ctx.font='10px Exo 2,sans-serif'; ctx.textAlign='center';
  const step=Math.max(1,Math.floor(n/4));
  labels.forEach((l,i)=>{if(i===0||i===n-1||i%step===0) ctx.fillText(l.slice(-5),xPos(i),H-8);});

  // Legend
  ctx.font='10px '+headFont()+',sans-serif'; ctx.textAlign='left';
  let lx=p.left;
  ctx.fillStyle=themeColor('--chart-weight'); ctx.fillText('● Weight',lx,14); lx+=58;
  if(bfs&&bfs.some(v=>v!=null)){ctx.fillStyle=themeColor('--chart-bf'); ctx.fillText('● Body fat',lx,14); lx+=62;}
  if(muscles&&muscles.some(v=>v!=null)){ctx.fillStyle=themeColor('--chart-muscle'); ctx.fillText('● Muscle',lx,14); lx+=58;}
  if(phases&&phases.some(v=>v!=null)){ctx.fillStyle=themeColor('--chart-phase'); ctx.fillText('● Phase',lx,14);}
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
      e.phase!=null  ? e.phase+'° phase'     : null,
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
  const ph = recentFor('phase',  '°',   'PHASE');

  if (!w && !bf && !m && !ph) { el.innerHTML=''; return; }

  el.innerHTML = `<div style="display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);margin-bottom:8px">
    ${w}${bf}${m}${ph}
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
  const phases  = entries.map(e=>e.phase);
  const hasBf   = bfs.some(v=>v!=null);
  const hasMuscle = muscles.some(v=>v!=null);
  const hasPhase = phases.some(v=>v!=null);
  requestAnimationFrame(()=> drawDualLineChart(canvas, labels, weights, hasBf ? bfs : null, true, hasMuscle ? muscles : null, hasPhase ? phases : null));
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
  // v0.9.9 (#3): the intent:// scheme is Android-only. On iOS (Safari and Bluefy) and on
  // desktop it isn't understood, so the guide-video link silently did nothing — every video
  // was dead on Emily's iPhone. Only wrap in intent:// on Android (keeps Albin's "open in the
  // YouTube app" behaviour); everywhere else return the plain https URL, which opens the
  // YouTube app or the browser normally.
  if (!/Android/i.test(navigator.userAgent)) return fullUrl;
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

// v0.9.8: detect iOS in-app browsers (Bluefy, and WKWebView-based browsers
// generally) that Google has blocked from completing OAuth since 2019.
// Real mobile Safari always carries a "Version/x.x Safari" token; in-app
// WebViews (including Bluefy) strip it, so its absence on iOS is a reliable tell.
function isIOSInAppBrowser() {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  if (!isIOS) return false;
  if (/Bluefy/i.test(ua)) return true;
  const looksLikeRealSafari = /Version\/[\d.]+.*Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return !looksLikeRealSafari;
}

// ── GOOGLE DRIVE SYNC (v0.9) ──────────────────
// Steps: console.cloud.google.com → New Project → Enable Drive API →
//        Credentials → Create OAuth2 Client ID (Web application) →
//        Add your GitHub Pages URL to Authorised JavaScript origins.
const GYMDOLPH_CLIENT_ID = '1073159142976-jk3anq5bq70khcvenpa7g1ndptmijffk.apps.googleusercontent.com';
const DRIVE_SCOPE        = 'https://www.googleapis.com/auth/drive.file';
// Per-app, set in App_Config-GitHub.js (Layer 2a, coding-owned) — never hardcoded
// here, and never in the content-owned profile/program files. Falls back to
// Albin's historic values only so an app without a config file still boots.
const DRIVE_FOLDER_ID    = (typeof USER_DRIVE_FOLDER_ID !== 'undefined' && USER_DRIVE_FOLDER_ID)
  ? USER_DRIVE_FOLDER_ID : '14l1-IRGbunMd30zTSQcb09Wd-gQVBzlG';
const BACKUP_FILENAME    = (typeof USER_BACKUP_FILENAME !== 'undefined' && USER_BACKUP_FILENAME)
  ? USER_BACKUP_FILENAME : 'gymdolph-backup.json';

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
  if (isIOSInAppBrowser()) {
    // v0.9.8 fix — Google blocks OAuth inside WKWebView in-app browsers
    // (Bluefy included) since 2019; a same-tab redirect here always comes
    // back access_denied. Hand the flow to Safari instead — it lands back on
    // this same GitHub Pages URL and shows a "copy token" panel there so the
    // user can relay it back into this app manually (no shared storage
    // between browsers on static hosting).
    window.open(authUrl, '_blank');
    driveToast('Complete sign-in in Safari, then paste the token below');
    return;
  }
  // Store flag so we handle redirect on return
  sessionStorage.setItem('gd_auth_pending', '1');
  location.href = authUrl;
}

// Handle OAuth2 redirect — called on DOMContentLoaded
function driveHandleRedirect() {
  if (!location.hash) return;
  const params = new URLSearchParams(location.hash.slice(1));
  if (params.get('state') !== 'drive_auth') return; // not our redirect
  const wasPending = !!sessionStorage.getItem('gd_auth_pending');
  sessionStorage.removeItem('gd_auth_pending');
  const token  = params.get('access_token');
  const expiresIn = parseInt(params.get('expires_in') || '3600');
  // Clean hash from URL without reload
  history.replaceState(null, '', location.pathname);
  if (!token) return;
  applyDriveToken(token, expiresIn);
  // v0.9.8: if this tab never set the pending flag, we most likely landed
  // here via the iOS/Bluefy Safari relay (opened via window.open from a
  // different browser), not a same-tab redirect — surface the token so the
  // user can copy it back into Bluefy's Settings themselves.
  if (!wasPending) showDriveTokenRelayPanel(token);
}

// Shared token application — used by the normal redirect flow and by a
// manually pasted token (v0.9.8 Bluefy/iOS relay).
function applyDriveToken(token, expiresIn) {
  driveState.token  = token;
  driveState.expiry = Date.now() + (expiresIn || 3600) * 1000;
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

// v0.9.8: manual relay UI (iOS/Bluefy) — a small dialog shown in Safari after
// completing sign-in there, with the token visible to copy back into Bluefy.
function showDriveTokenRelayPanel(token) {
  const el  = document.getElementById('app-dialog');
  const tEl = document.getElementById('app-dialog-title');
  const mEl = document.getElementById('app-dialog-msg');
  const bEl = document.getElementById('app-dialog-btns');
  if (!el || !tEl || !mEl || !bEl) return;
  tEl.textContent = 'DRIVE SIGN-IN COMPLETE';
  mEl.innerHTML = `<div style="margin-bottom:10px">If you started this from Bluefy (or another in-app browser), copy the token below and paste it into Settings &rarr; Google Drive &rarr; "Signed in via Safari?" back on that app.</div>
    <textarea id="drive-relay-token-text" readonly onclick="this.select()"
      style="width:100%;min-height:70px;background:rgba(var(--header-rgb),.15);border:1px solid var(--border);
      border-radius:var(--radius-sm);color:var(--text);font-size:12px;padding:8px;font-family:monospace;
      resize:none;box-sizing:border-box;">${token}</textarea>`;
  bEl.innerHTML = `<button class="modal-btn cancel" onclick="copyDriveRelayToken()">COPY</button>
    <button class="modal-btn confirm" onclick="closeAppDialog()">DONE</button>`;
  el.style.display = 'flex';
}
function copyDriveRelayToken() {
  const ta = document.getElementById('drive-relay-token-text');
  if (!ta) return;
  ta.select();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value);
    else document.execCommand('copy');
    driveToast('Token copied ✓');
  } catch(e) { driveToast('Copy failed — select & copy manually', true); }
}

// v0.9.8: paste-token panel toggle + apply (Bluefy/iOS relay, other side)
function toggleDriveTokenPaste(force) {
  const panel = document.getElementById('drive-token-paste-panel');
  if (!panel) return;
  const show = (force !== undefined) ? force : (panel.style.display === 'none');
  panel.style.display = show ? '' : 'none';
}
function driveApplyPastedToken() {
  const input = document.getElementById('drive-paste-token-input');
  if (!input) return;
  const raw = input.value.trim();
  if (!raw) { driveToast('Paste your token first', true); return; }
  let token = raw, expiresIn = 3600;
  if (raw.includes('access_token=')) {
    // Accept either the full Safari address-bar link or just the #fragment
    const hashPart = raw.includes('#') ? raw.split('#').slice(1).join('#') : raw;
    const p = new URLSearchParams(hashPart);
    token = p.get('access_token') || raw;
    expiresIn = parseInt(p.get('expires_in') || '3600');
  }
  input.value = '';
  toggleDriveTokenPaste(false);
  applyDriveToken(token, expiresIn);
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
    weekSessions:state.weekSessions,ytLinks:state.ytLinks||{},bodyStats:state.bodyStats||[],
    milestoneProgress:state.milestoneProgress||{}};
  const filename = `gymdolph-export-${todayStr()}.json`;
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  // v0.9.8 fix: `<a download>` on a blob: URL is silently ignored by Safari/
  // WKWebView on iOS (Bluefy included) — tapping Export did nothing there.
  // Use the Web Share API with a real File on iOS instead, which surfaces
  // the native "Save to Files" / AirDrop sheet. Android/desktop keep the
  // original anchor-download approach, which already works fine there.
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    try {
      const file = new File([blob], filename, {type:'application/json'});
      if (navigator.canShare && navigator.canShare({files:[file]})) {
        navigator.share({files:[file], title: filename}).catch(()=>{});
        return;
      }
    } catch(e){}
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;
  a.download=filename;a.click();URL.revokeObjectURL(url);
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
          state.milestoneProgress=migrateMilestoneKeys(data.milestoneProgress||{});
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
//   Athlete_Profile-GitHub.js  → name + gym + athlete profile + health constraints
//   app-state pointer          → current training phase (resolved against Gym_Program-GitHub.js)
//   Gym_Program-GitHub.js      → current program (this week's structure)
// Identity comes ONLY from Athlete_Profile-GitHub.js, so one app can never give the
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

// ── EXPORT PROGRAM (v0.9.7) — serialise live program to a ready-to-commit Gym_Program-GitHub.js ──
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
    a.href = url; a.download = 'Gym_Program-GitHub.js';
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
  if (kind === 'nokey')   return "🔑 Add your Anthropic API key in Settings → AI to enable coaching. Your workout logging works fine without it.";
  if (kind === 'auth')    return "🔑 That key didn't work. Check it in Settings → AI, then try again.";
  if (kind === 'network') return "📡 No connection — coaching needs internet. Your workout logging still works offline.";
  if (kind === 'rate')    return "⏳ Claude is busy right now. Wait a few seconds and tap again.";
  return "⚠ Something went wrong talking to Claude. Try again in a moment.";
}

// Shared API helper — ALL AI calls go through here.
// Returns { ok:true, text } or { ok:false, kind, message }
async function callClaude(systemPrompt, messages, maxTokens) {
  const key = getApiKey();
  if (!key) return { ok:false, kind:'nokey', message: aiErrorText('nokey') };
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
  sess.aiChecked[exId] = true; saveSession();

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

// (hrWidgetTap is defined once, above — kept out of this block so the tap
// callback passed to makeDraggableWidget below stays the real implementation)

// Attaches the widget's drag/tap handler exactly once, however the widget
// first becomes visible — real Bluetooth connect, or the Settings > Test
// Zones simulator. Both paths call this instead of makeDraggableWidget
// directly, so tapping the widget always works regardless of which path lit it up.
let _hrWidgetInteractionsBound = false;
function ensureHRWidgetInteractions() {
  if (_hrWidgetInteractionsBound) return;
  const pill = document.getElementById('hr-pill');
  if (!pill) return;
  makeDraggableWidget(pill, hrWidgetTap, true);
  _hrWidgetInteractionsBound = true;
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
    ensureHRWidgetInteractions();
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
    HR.intentionalDisconnect = false;
    HR._reconnectAttempts = 0;
    HR.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: ['battery_service']
    });
    // Guard against stacking a second listener if the browser returns the same
    // BluetoothDevice object on a reconnect (would otherwise fire onHRDisconnected
    // twice per real disconnect).
    HR.device.removeEventListener('gattserverdisconnected', onHRDisconnected);
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

  // If user intentionally disconnected (long-press or sheet/focus button), tear down
  // immediately. The flag is deliberately NOT cleared here — the async
  // 'gattserverdisconnected' event this same disconnect() call triggers would
  // otherwise land here a second time, see the flag already reset, and fall into
  // the "unexpected disconnect" branch below — silently scheduling a reconnect
  // a few seconds later (the widget reappearing after an explicit disconnect).
  // It's cleared only in connectHR(), on the next deliberate reconnect.
  if (HR.intentionalDisconnect || !HR.device) {
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
  ensureHRWidgetInteractions();
  updateHRPill(bpm);
  updateHRSheetUI();
}

// ── HR FOCUS OVERLAY (v0.9.6) ────────────────────
let _hrFocusOpenedAt = 0;
function openHRFocus() {
  closeMenu(); // no-op if the menu was already closed (e.g. widget tap)
  _hrFocusOpenedAt = Date.now();
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
  // Ignore the ghost 'click' the browser synthesizes right after the touchend
  // that opened this overlay — without this, the overlay closes instantly.
  if (Date.now() - _hrFocusOpenedAt < 400) return;
  const overlay = document.getElementById('hr-focus-overlay');
  if (overlay) overlay.style.display = 'none';
  if (!state.timerRunning) releaseWakeLock();
}
function updateHRFocusOverlay(bpm, zoneKey) {
  const overlay = document.getElementById('hr-focus-overlay');
  if (!overlay || overlay.style.display === 'none') return;
  const bpmEl  = document.getElementById('hr-focus-bpm');
  const zoneEl = document.getElementById('hr-focus-zone');
  const discBtn = document.getElementById('hr-focus-disconnect-btn');
  if (bpmEl)  bpmEl.textContent  = bpm > 0 ? bpm : '--';
  if (zoneEl) zoneEl.textContent = bpm > 0 ? getHRZone(bpm) : '—';
  if (discBtn) discBtn.style.display = (bpm > 0) ? 'block' : 'none';
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
  // First ever launch: dark splash. After the user has a stored theme, match it.
  var splashTheme = 'dark';
  try { splashTheme = localStorage.getItem('gymdolph_theme') || 'dark'; } catch(e){}
  if (splashTheme !== 'bright') splashTheme = 'dark';
  fetch('splash-anim-' + splashTheme + '.json')
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
