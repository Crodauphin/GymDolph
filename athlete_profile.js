// Gym Dolph — Layer 2: Identity + Constraints
// Albin's name, gym, health constraints, and default-theme flag.
// This file is specific to Gym Dolph. Girly Gym Dolph has its own athlete_profile.js.
// Never copy this file to Girly Gym Dolph.

const USER_NAME = 'Albin';

const USER_GYM = 'Ivanhoe Aquatic & Fitness Centre, Heidelberg, Melbourne VIC';

// Default theme for this app. Engine reads this on first run; the live
// choice is then stored in the synced app-state. GGD's file sets 'bright'.
const DEFAULT_THEME = 'dark';

// Concise athlete profile the AI coach reads (Layer 2). Keep factual + current.
const ATHLETE_PROFILE = `36yo male, 181cm. Goal: functional hybrid / alpine-athlete build (not hypertrophy) — strong on long hikes, mountaineering, trail running, cycling endurance. Framework: Training for the New Alpinism — primary compounds 4×4 stopping 1–2 reps short of failure, 3–5 min rest; accessories 3×8–10; add load only when all sets are clean. Primary aerobic base is the daily bike commute (Zone 2, 120–135bpm). Physio scapula warm-up every session. Targets: visceral fat down, ~86kg at 14–16% over six months, first unassisted pull-up then build reps.`;

const AI_CONSTRAINTS = `HEALTH CONSTRAINTS (non-negotiable, apply to every suggestion):
- Lower back: spondylolisthesis. NO axial loading, NO lumbar hyperextension, NO barbell back squats, NO conventional deadlifts, NO good mornings. Hip hinge (RDL) only with PT supervision.
- Left shoulder: inflammation. NO heavy overhead lifting, NO Arnold press, NO dips. Light-moderate dumbbell/machine shoulder press permitted with lumbar extension monitoring.
If a request or a logged set conflicts with these, say so and offer a compliant alternative. Never suggest a forbidden movement.`;
