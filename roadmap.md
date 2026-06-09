# Gym Dolph — Feature Backlog & Roadmap
*Last updated: June 2026*

---

## v0.9.1 — ✅ Complete

| Feature | Status |
|---------|--------|
| PWA icon flash fix | ✅ manifest.json navy background_color + theme_color |
| Transparent logos | ✅ RGBA PNGs from v0.8 used (logo-main, logo-secondary, logo-splash) |
| Set/weight modal raised above keyboard | ✅ visualViewport resize listener |
| Timer display smoothness fix | ✅ 500ms interval |
| Timer — workout screen only | ✅ pill hidden outside workout view |
| Timer — reset button | ✅ ✕ button resets to 00:00, session stays open |
| Bodyweight exercises — reps only | ✅ bodyweight:true flag in data.js, reps-only modal |
| Shoulder CARs YouTube link | ✅ pre-set on D4 warm-up exercise |
| YouTube intent:// URI | ✅ opens YouTube app on Android, browser fallback |
| Gym equipment editor | ✅ Settings → GYM → tap card → full-screen editor, 4 categories, add/edit/delete per item, pre-filled Ivanhoe list, localStorage |
| Day card session bug fix | ✅ unticked days always reachable; startWorkout guard checks logged data not just elapsed time |

---

## v0.9.2 — Claude API Features

| Feature | Notes |
|---------|-------|
| Form Coaching Assistant | Triggered after each logged set. Optional button in rest window. Sends exercise name, prescription, muscle cues, injury context, weight/reps. Returns short coaching note inline. Session wrap-up on finish. Freeform mid-workout questions. API key stored in localStorage, input in Settings. Health constraints baked into every system prompt. |
| Natural Language Program Editor | Chat interface in Settings. Plain-English program changes (e.g. "swap Cable Crossover on D1 for Dumbbell Flyes"). Claude reads live program, returns modified data, overwrites localStorage. No GitHub redeployment needed. API key shared with coaching assistant. |

*Both features gated behind an API key input in Settings. All AI suggestions reviewed with PT and Physio before adopting.*

---

## v1.0 — Big Features & Migration

| Feature | Notes |
|---------|-------|
| Melbourne program loaded into data.js | After gym walk-through June 23, 2026. Replaces Sapporo / FitPlace24 program. Full exercise list with Ivanhoe equipment. |
| Day card summaries | Training days (Mon/Tue/Fri): Warm-up 10 · Main 40 · Secondary 20 · Cardio 20–70 min. Sat: Warm-up 10 · Main 40 · Secondary 20 · Cardio 30 min. Wed: 60 min. Sun: Full rest — recovery & sleep. |
| Cardio alternatives per day | Applies to Mon, Tue, Wed, Fri. Three-option single-select: 🚴 Bike commute / 🏃 Stairmaster or incline treadmill / ✗ No cardio today. No reason picker. Integrates with session logging and history. |
| Pull-up progression tracker | Revisit at v1.0 once Melbourne program is in. Track unassisted pull-up reps per session. Milestones: 1 rep (week 6), 3 reps (month 2), 5 reps (month 3). |
| Animated Lottie splash | Lottie JSON format. Integration via lottie-web JS library. Plays once on splash, no loop. Blocked on animation file — design in LottieFiles.com or Jitter.video first. |
| Phased program progression (4 phases) | Sets/reps targets adjust automatically by week: Weeks 1–2 (3×6, 70%) → Weeks 3–4 (3×6→4×5, 75–80%) → Weeks 5–6 (4×4, 85%) → Week 7+ (4×4, 87–90%). App tracks current week and adjusts prescription display accordingly. |
| Flutter migration | Full Dart/Flutter rewrite. Cross-platform Android + iOS. Local SQLite/Hive DB. Google Drive sync libraries. Hard reset point — current PWA codebase is not carried over. |
| Tablet-optimised layout | Optimised layout for tablet screen sizes. Detail TBD at Flutter migration phase. |

---

## Health Constraints (apply to all AI features)
- **Lower back:** spondylolisthesis — no axial loading, no lumbar hyperextension, no barbell back squats, no conventional deadlifts, no good mornings
- **Left shoulder:** no heavy overhead lifting, no Arnold press, no dips — light-moderate dumbbell/machine shoulder press permitted with lumbar monitoring
- All AI suggestions reviewed with PT (Erlina Dowling, Ivanhoe Aquatic) and Physio (PhysioLife) before adopting

---

*End of roadmap*
