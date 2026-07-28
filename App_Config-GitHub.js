/* ══════════════════════════════════════════════════════════════════════════
   GYM DOLPH — App_Config-GitHub.js
   Layer 2a · Per-app INFRASTRUCTURE config

   OWNED BY CODING THREADS ONLY.
   Do NOT author athlete content here (no name, no constraints, no gym list,
   no program) — that lives in Athlete_Profile-GitHub.js / Gym_Program-GitHub.js,
   which are owned by the "Fitness Profile & Program" thread.

   This file exists precisely so that coding-owned settings (theme default,
   Drive backup destination) can never be silently dropped when a content
   thread regenerates the profile or program file.

   This is Gym Dolph's copy. Girly Gym Dolph has its own App_Config-GitHub.js
   with different values. NEVER copy this file into the GGD repo.
══════════════════════════════════════════════════════════════════════════ */

// Default theme on first run. The live choice is stored in app state after that.
// GGD's copy sets 'bright'.
window.DEFAULT_THEME = 'dark';

// Google Drive backup destination — per app, never shared.
// Folder: "Gym Dolph - App / JSON backup" (Albin's Drive).
// A distinct filename per app is deliberate belt-and-braces: even if a folder
// ID were ever wrong, the two apps still cannot overwrite each other's backup.
window.USER_DRIVE_FOLDER_ID = '14l1-IRGbunMd30zTSQcb09Wd-gQVBzlG';
window.USER_BACKUP_FILENAME = 'gymdolph-backup.json';
