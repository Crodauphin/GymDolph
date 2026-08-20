/* ══════════════════════════════════════════════════════════════════════════
   App_Config-GitHub.js  ·  Layer 2a  ·  PER-USER INFRASTRUCTURE

   ⚠️ THIS FILE IS IDENTICAL IN BOTH REPOS. Copy it like any engine file.

   It is NOT "Albin's config" or "Emily's config" — it holds a row for every
   user, and the app works out which row applies from its own URL at runtime.
   That is the whole point: a file that is meant to be the same everywhere
   cannot be clobbered by copying it to the wrong place.

   OWNED BY CODING THREADS ONLY.
   No athlete content here — no name, no constraints, no gym list, no program.
   Those live in Athlete_Profile-GitHub.js / Gym_Program-GitHub.js, which are
   owned by the "Fitness Profile & Program" thread and ARE per-user.

   ── Adding a user ────────────────────────────────────────────────────────
   The key is the FIRST PATH SEGMENT of the app's URL, lowercased:
       https://crodauphin.github.io/GymDolph/        → 'gymdolph'
       https://crodauphin.github.io/GirlyGymDolph/   → 'girlygymdolph'
   Add a row, upload this file to that user's repo, done. A URL with no row
   here gets NO Drive backup — deliberately, and it says so on screen.
   The Drive folder id is not a secret; it is useless without that user's
   own Google account (drive.file scope).
══════════════════════════════════════════════════════════════════════════ */

window.APP_CONFIGS = {

  gymdolph: {
    theme:       'dark',
    driveFolder: '14l1-IRGbunMd30zTSQcb09Wd-gQVBzlG',   // "Gym Dolph - App / JSON backup"
    backupFile:  'gymdolph-backup.json',
  },

  girlygymdolph: {
    theme:       'bright',
    driveFolder: '1-RMMlwBMIQF8A5OZtVluZN81p9O35KVA',   // GGD JSON backup
    backupFile:  'girlygymdolph-backup.json',
  },

};

// Resolve this app's row once, here, so every consumer reads the same answer.
// A distinct backupFile per user is deliberate belt-and-braces: even if a
// folder id were ever wrong, two apps still cannot overwrite each other's backup.
window.APP_KEY    = (location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
window.APP_CONFIG = window.APP_CONFIGS[window.APP_KEY] || null;

// Back-compat for the pre-paint theme block and anything still reading the old
// global. Undefined when there is no row — callers must handle that.
window.DEFAULT_THEME = window.APP_CONFIG ? window.APP_CONFIG.theme : undefined;
