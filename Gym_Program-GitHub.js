// Gym Dolph — Layer 3: Program
// window.PROGRAM = { … }
// Melbourne Training Program — Ivanhoe Aquatic & Fitness Centre.
// Clinicians referred to generically ("PT" / "Physio/Osteo") per project rule.
// ⚠️  This program is maintained in the Melbourne Training Roadmap thread only.
//     If another thread proposes changes, remind Albin to update it there.
//
// v0.9.10 content updates (from Melbourne Training Roadmap thread):
//   - D1: skull crusher added to triceps secondary; bench press weight updated to 60kg (incl 20kg bar); cable fly pulley height cue added
//   - D2: barbell bent-over row removed; face pull added to warm-up; seated cable row cue updated (neutral grip, straight bar, no lumbar hinging)
//   - D3: barbell RDL replaced with hack squat (50kg, pt:true); prone leg curl replaced with leg extension (40kg) + leg curl machine (35kg); abductor/adductor stays; box pistol squat progression added to secondary (pt:true); day duration corrected to 70 min
//   - D4: dumbbell shoulder press starting weight updated to 10kg DBs
//   - D4 commute: free to push, Zone 2 not required (unchanged)
//   - D5: yoga-day commute — free to push, no HR restriction noted in commute cardio cue
//   - D6: active day Walk option added; Darebin Trail Walk noted (log presets flagged to coding thread — schema addition needed)
//   - Milestones: weekly consistency ladder added (3 tiers, derived from history, not tappable);
//     the two weekly steps previously in `performance` (Volume, Crushing it) removed from positions 6-7
//   - Weight updates: hammer curl 10-12kg; bench press 60kg
//   - Hygiene: day duration corrected on D1/D2/D3; prescription strings retained (engine reads them for now until opt-b ships); title fields retained
//   - schemaVersion bumped to 0.9.10
//   - ⚠️  #7 (yoga-day HR exception on commute cardio) and #8 (Darebin walk log presets) flagged to coding thread — schema additions needed
//
// v0.9.11 content updates (from Melbourne Training Roadmap thread) — additive items only:
//   - D7: commute:false added (bug fix — Full Rest was wrongly offering a bike commute)
//   - D2: eccentric pull-up marked bodyweight:true (removes weight-entry chips + stale PREVIOUS PERF line)
//   - D6: Darebin Trail walk presets added (presetsLabel + presets: Long 8.5km/105min, Short 5km/60min); placeholder note removed
//   - ⏸️  HELD — NOT yet applied pending Albin's confirmation the v0.9.11 engine is live:
//       #1 remove all 43 `prescription:` strings (12 need `each:` field to preserve "each side"/"each position" wording)
//       #2 yoga entry: replace `prescription:` with `detail: 'Log duration + style'`
//   - schemaVersion NOT bumped — flagging for Albin's confirmation, not assumed
//   - ⚠️  Program_Schema-Contract.md reissue required (new fields: each, presetsLabel, presets;
//     also logFields camelCase reconciliation and prescription removal) — coding-thread job, not yet received

window.PROGRAM = {
  schemaVersion: '0.9.10',
  meta: {
    title: 'Melbourne Program',
    framework: 'Training for the New Alpinism (House & Johnston)',
    gym: 'Ivanhoe Aquatic & Fitness Centre, Heidelberg VIC',
    protocol: '4x4 primary compounds; stop 1-2 reps before failure; 3-5 min rest',
    note: 'No phased progression — one target program. Start conservatively and progress at your own pace. Foam roll thoracic done at home, not in gym warm-up.'
  },

  milestones: {
    startDate: '2026-07-04',
    weekly: [
      { metric: 'Consistency',    target: '4 gym days',                        icon: '📅', repeats: 'weekly', requires: { training: 4 } },
      { metric: 'Consistency +',  target: '4 gym days + yoga',                 icon: '🔥', repeats: 'weekly', requires: { training: 4, stretch: 1 } },
      { metric: 'Consistency ++', target: '4 gym days + yoga + active day',    icon: '🏆', repeats: 'weekly', requires: { training: 4, stretch: 1, cardio_day: 1 } }
    ],
    performance: [
      { target: 'Eccentric 3x2 x 10s lowering (current)', timeline: 'Now',    metric: 'Pull-ups' },
      { target: 'Eccentric 3x2 x 15s lowering',        timeline: 'Weeks ahead', metric: 'Pull-ups' },
      { target: 'First unassisted pull-up attempt',    timeline: 'Week 6',    metric: 'Pull-ups' },
      { target: '3 unassisted reps',                   timeline: 'Month 2',   metric: 'Pull-ups' },
      { target: '5 unassisted reps',                   timeline: 'Month 3',   metric: 'Pull-ups' }
    ],
    bodycomp: [
      { target: '6.7 -> 7.5+ degrees', timeline: '3-6 months', metric: 'Phase angle', auto: { field: 'phase', min: 7.5 } },
      { target: '92.3kg -> ~85kg',      timeline: '6 months',   metric: 'Body weight',  auto: { field: 'weight', max: 85 } },
      { target: '20.9% -> 14-16%',      timeline: '6 months',   metric: 'Body fat %',   auto: { field: 'bf', max: 16 } }
    ]
  },

  cardioPool: [
    { id: 'commute', name: 'Bike commute', pinned: true,  logFields: ['durationIn', 'durationBack'],
      note: 'Zone 2 on gym days — keep HR 120-135 bpm after training. Free to push on yoga day (D5) and Thu (D4).' },
    { id: 'stairs',  name: 'Stairmaster',      pinned: false, logFields: ['duration', 'difficulty'] },
    { id: 'skierg',  name: 'SkiErg',            pinned: false, logFields: ['duration', 'difficulty'] },
    { id: 'rowing',  name: 'Rowing machine',    pinned: false, logFields: ['duration'] },
    { id: 'tread',   name: 'Incline treadmill', pinned: false, logFields: ['duration', 'speed', 'incline'] },
    { id: 'upbike',  name: 'Upright / racing bike', pinned: false, logFields: ['duration', 'difficulty'] },
    { id: 'ellip',   name: 'Elliptical',        pinned: false, logFields: ['duration', 'difficulty'] },
    { id: 'recbike', name: 'Recumbent bike',    pinned: false, logFields: ['duration', 'difficulty'] }
  ],

  days: [

    // ── D1 · Mon · Chest + Triceps ──────────────────────────────────────────
    {
      id: 'D1', name: 'Chest + Triceps', type: 'training', duration: '70 min',
      blocks: [
        { id: 'warmup', type: 'warmup', bodyPart: '', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Shoulder Big 3', prescription: '1 x 20 each position', sets: 1, reps: 20, weight: '1kg each hand', bodyweight: false,
              note: 'Osteo prescription. 3 positions: Y (arms overhead diagonal), T (arms out to sides), W (elbows bent, arms wide). 20 reps each. Lie face down, towel under forehead.',
              muscles: 'mid-traps, lower traps, rhomboids, scapula stabilisers, rotator cuff',
              cues: ['Lie face down, towel under forehead — do not lift head from floor', '1kg dumbbell in each hand throughout', 'Position 1 — Y: arms overhead at diagonal, thumbs up, lift slowly', 'Position 2 — T: arms straight out to sides, thumbs up, lift slowly', 'Position 3 — W: elbows bent, pull elbows back and down, squeeze shoulder blades', '20 reps per position, slow and controlled'],
              yt: 'shoulder big 3 prone Y T W exercise' },
            { id: 'w2', name: 'Face pull — cable rope', prescription: '3 x 12', sets: 3, reps: 12, weight: '12kg', restSeconds: 30,
              muscles: 'rear delts, rotator cuff, upper back',
              cues: ['Rope attachment at chest height', 'Pull to forehead, elbows high and wide', '4 second hold at peak', 'Do not let lower back arch'],
              yt: 'face pull cable rope technique' },
            { id: 'w3', name: 'GHjt external rotation', prescription: '2 x 10', sets: 2, reps: 10, weight: '5kg', restSeconds: 30,
              muscles: 'rotator cuff (infraspinatus, teres minor)',
              cues: ['Elbow pinned to side at 90 degrees', 'Small controlled range — very light', 'Slow on the return'],
              yt: 'cable GHjt external rotation technique' },
            { id: 'w4', name: 'Seated shoulder external rotation', prescription: '3 x 10', sets: 3, reps: 10, weight: '0.1-1kg DB', restSeconds: 30,
              note: 'Osteo prescription. Seated on bench, elbow on knee, hand pointing up. Lower weight toward floor slowly, return.',
              muscles: 'rotator cuff (infraspinatus, teres minor)',
              cues: ['Sit on bench, elbow on knee, hand pointing upward', 'Keep shoulder down and neck long', 'Lower dumbbell toward floor slowly, palm facing down', 'Return to start — very light, controlled movement'],
              yt: 'seated shoulder external rotation dumbbell technique' }
          ]
        },
        { id: 'main', type: 'main', bodyPart: 'Chest', duration: '40 min',
          exercises: [
            { id: 'm1', name: 'Barbell bench press (flat)', prescription: '4 x 4', sets: 4, reps: 4, weight: '60kg (incl 20kg bar)', pt: true,
              muscles: 'pectorals, triceps, anterior delts',
              cues: ['Feet flat, natural arch, lumbar in contact with bench throughout', 'Bar to mid-chest, elbows ~45 degrees out', 'Brace hard before unracking', 'Do not let lower back lift off the bench', '60kg total includes the 20kg Olympic bar — load 20kg in plates'],
              yt: 'barbell bench press technique' },
            { id: 'm2', name: 'Incline dumbbell press', prescription: '3 x 6', sets: 3, reps: 6, weight: '20kg DBs',
              muscles: 'upper chest, anterior delts, triceps',
              cues: ['Bench ~30 degrees — not too steep', 'Press up and slightly together', 'Control the descent, brief pause at bottom'],
              yt: 'incline dumbbell press technique' },
            { id: 'm3', name: 'Cable chest fly', prescription: '3 x 10', sets: 3, reps: 10, weight: '15kg each side',
              muscles: 'pectorals, anterior delts',
              cues: ['Slight bend in elbows throughout', 'Wide arc — open the chest fully', 'Slow return, feel the stretch',
                'Pulley height changes emphasis: high-to-low hits lower pecs (upper chest feeling), mid-height is mid-chest standard, low-to-high hits upper pecs. Default: mid-height. Rotate to vary stimulus across sessions.'],
              yt: 'cable chest fly technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', bodyPart: 'Triceps', duration: '20 min',
          exercises: [
            { id: 's1', name: 'Tricep cable pushdown', prescription: '3 x 8', sets: 3, reps: 8, weight: '15-17.5kg',
              muscles: 'triceps (all heads)',
              cues: ['Elbows pinned to sides throughout', 'Full extension at bottom, squeeze', 'Slow controlled return'],
              yt: 'tricep cable pushdown technique' },
            { id: 's2', name: 'Overhead tricep cable extension', prescription: '3 x 8', sets: 3, reps: 8, weight: '12.5-15kg',
              muscles: 'triceps long head',
              cues: ['Elbows close to head, do not flare', 'Full range — feel the stretch at top', 'Keep lumbar neutral — no arch'],
              yt: 'overhead tricep cable extension technique' },
            { id: 's3', name: 'Skull crusher', prescription: '3 x 8', sets: 3, reps: 8, weight: '20kg bar',
              muscles: 'triceps (all heads, emphasis long head)',
              cues: ['EZ-bar or dumbbells — EZ-bar preferred for wrist comfort', 'Lower bar to forehead, elbows tracking straight up — do not flare', 'Keep ribs down throughout — no lumbar arch', 'Slow lowering, press explosively back up', 'Left shoulder: stop if any anterior shoulder discomfort'],
              yt: 'skull crusher EZ bar technique' }
          ]
        }
      ]
    },

    // ── D2 · Tue · Back + Biceps ────────────────────────────────────────────
    {
      id: 'D2', name: 'Back + Biceps', type: 'training', duration: '70 min',
      blocks: [
        { id: 'warmup', type: 'warmup', bodyPart: '', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Shoulder Big 3', prescription: '1 x 20 each position', sets: 1, reps: 20, weight: '1kg each hand', bodyweight: false,
              note: 'Osteo prescription. 3 positions: Y (arms overhead diagonal), T (arms out to sides), W (elbows bent, arms wide). 20 reps each. Lie face down, towel under forehead.',
              muscles: 'mid-traps, lower traps, rhomboids, scapula stabilisers, rotator cuff',
              cues: ['Lie face down, towel under forehead — do not lift head from floor', '1kg dumbbell in each hand throughout', 'Position 1 — Y: arms overhead at diagonal, thumbs up, lift slowly', 'Position 2 — T: arms straight out to sides, thumbs up, lift slowly', 'Position 3 — W: elbows bent, pull elbows back and down, squeeze shoulder blades', '20 reps per position, slow and controlled'],
              yt: 'shoulder big 3 prone Y T W exercise' },
            { id: 'w2', name: 'Face pull — cable rope', prescription: '3 x 12', sets: 3, reps: 12, weight: '12kg', restSeconds: 30,
              muscles: 'rear delts, rotator cuff, upper back',
              cues: ['Rope attachment at chest height', 'Pull to forehead, elbows high and wide', '4 second hold at peak', 'Do not let lower back arch'],
              yt: 'face pull cable rope technique' },
            { id: 'w3', name: 'Cable high row — activation', prescription: '2 x 10', sets: 2, reps: 10, weight: '8-10kg', restSeconds: 30,
              muscles: 'lats, upper back, rear delts',
              cues: ['Very light — this is activation, not strength', 'Pull elbows wide and back', 'Squeeze shoulder blades together at end'],
              yt: 'cable high row activation technique' },
            { id: 'w4', name: 'GHjt external rotation', prescription: '2 x 10', sets: 2, reps: 10, weight: '5kg', restSeconds: 30,
              muscles: 'rotator cuff (infraspinatus, teres minor)',
              cues: ['Elbow pinned to side at 90 degrees', 'Small controlled range', 'Slow on the return'],
              yt: 'cable GHjt external rotation technique' }
          ]
        },
        { id: 'main', type: 'main', bodyPart: 'Back', duration: '40 min',
          exercises: [
            { id: 'm1', name: 'Lat pulldown — cable', prescription: '4 x 4', sets: 4, reps: 4, weight: '40-45kg', pt: true,
              muscles: 'lats, biceps, mid-back',
              cues: ['Pull bar to upper chest, lean back slightly', 'No lumbar hyperextension at end range', 'Drive elbows down and back, squeeze lats'],
              yt: 'lat pulldown cable technique' },
            { id: 'm2', name: 'Seated cable row (low row)', prescription: '3 x 8', sets: 3, reps: 8, weight: '35kg',
              muscles: 'mid-back, lats, rhomboids',
              cues: ['Straight bar, neutral grip (palms facing each other), shoulder-width', 'Slight lean forward to start, pull bar to lower abdomen', 'Brace hard — do not hinge or round through lower back during the row', 'Neutral spine throughout — spondylolisthesis: no lumbar flexion under load', 'Arms close to body, squeeze shoulder blades at end'],
              yt: 'seated cable row neutral grip technique' },
            { id: 'm3', name: 'Single-arm dumbbell row', prescription: '3 x 6', sets: 3, reps: 6, weight: '22kg', pt: true,
              muscles: 'lats, rhomboids, biceps, rear delts',
              cues: ['Neutral spine — brace before you pull', 'Row to the hip, no torso rotation', 'Control the lowering — do not drop'],
              yt: 'single arm dumbbell row technique' },
            { id: 'm4', name: 'Eccentric pull-up — neutral grip', prescription: '3 x 2', sets: 3, reps: 2, weight: 'Bodyweight', bodyweight: true, restSeconds: 90,
              note: 'Step up on box/bench to top position. Lower for 10-15s. Progress: 2x15s then 1x30s.',
              muscles: 'lats, biceps, core, scapula stabilisers',
              cues: ['Neutral grip — palms facing each other', 'Step up to top position on box or bench', 'Lower as slowly as possible — 10 seconds minimum', 'Full control throughout — do not drop', 'Progress by increasing lowering time: 2x15s then 1x30s'],
              yt: 'eccentric pull-up neutral grip technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', bodyPart: 'Biceps', duration: '20 min',
          exercises: [
            { id: 's1', name: 'Bicep curl — barbell', prescription: '3 x 8', sets: 3, reps: 8, weight: '25kg',
              muscles: 'biceps brachii',
              cues: ['Elbows stay at sides throughout', 'Strict — no swinging or back lean', 'Squeeze at top, slow on the way down'],
              yt: 'barbell bicep curl technique' },
            { id: 's2', name: 'Hammer curl — dumbbells', prescription: '3 x 8', sets: 3, reps: 8, weight: '10-12kg DBs',
              note: 'Left shoulder feels weak on last reps — building tolerance',
              muscles: 'biceps, brachialis, brachioradialis',
              cues: ['Neutral grip — thumbs up throughout', 'Alternate arms or both together', 'Control the lowering phase'],
              yt: 'hammer curl dumbbell technique' }
          ]
        }
      ]
    },

    // ── D3 · Wed · Legs + Glutes ────────────────────────────────────────────
    {
      id: 'D3', name: 'Legs + Glutes', type: 'training', duration: '70 min',
      blocks: [
        { id: 'warmup', type: 'warmup', bodyPart: '', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Glute bridge', prescription: '2 x 15', sets: 2, reps: 15, bodyweight: true,
              muscles: 'glutes, hamstrings',
              cues: ['Drive through heels, not toes', 'Squeeze glutes hard at top', 'Ribs down — do not over-arch lower back'],
              yt: 'glute bridge activation technique' },
            { id: 'w2', name: 'Clamshells', prescription: '2 x 15 each side', sets: 2, reps: 15, bodyweight: true,
              muscles: 'glute medius, hip stabilisers',
              cues: ['Heels together, open top knee toward ceiling', 'Keep pelvis completely still — do not roll back', 'Slow and controlled — feel the outer glute'],
              yt: 'clamshell glute activation technique' },
            { id: 'w3', name: 'Bodyweight squat + hip circles', prescription: '1 x 15', sets: 1, reps: 15, bodyweight: true,
              muscles: 'quads, glutes, hip mobility',
              cues: ['Sit back into hips, chest tall', 'Knees track over toes', 'Use circles to open hips before loading'],
              yt: 'bodyweight squat hip mobility technique' }
          ]
        },
        { id: 'main', type: 'main', bodyPart: 'Legs', duration: '40 min',
          exercises: [
            { id: 'm1', name: 'Leg press', prescription: '4 x 4', sets: 4, reps: 4, weight: '90-110kg', pt: true,
              muscles: 'quads, glutes, hamstrings',
              cues: ['Feet mid-platform, shoulder-width', 'Lumbar stays in contact with pad throughout', 'Do not lock knees hard at top — slight bend'],
              yt: 'leg press technique' },
            { id: 'm2', name: 'Hack squat', prescription: '4 x 4', sets: 4, reps: 4, weight: '50kg', pt: true,
              muscles: 'quads, glutes, hamstrings',
              cues: ['Deliberately chosen over barbell squat — less spinal compression, working toward barbell squat with PT',
                'Neutral spine against the pad at all times — no lumbar rounding at the bottom',
                'Controlled depth — stop before you lose lumbar contact with the pad',
                'Feet shoulder-width, toes slightly out — experiment with position to reduce lower back load',
                'Review loading and depth with PT before increasing weight'],
              yt: 'hack squat technique spondylolisthesis' },
            { id: 'm3', name: 'Leg extension machine', prescription: '3 x 8', sets: 3, reps: 8, weight: '40kg',
              muscles: 'quadriceps (rectus femoris, vastus group)',
              cues: ['Full range — extend completely at top, controlled descent', 'Do not slam at the bottom', 'Seated — no lumbar load'],
              yt: 'leg extension machine technique' },
            { id: 'm4', name: 'Leg curl machine', prescription: '3 x 8', sets: 3, reps: 8, weight: '35kg',
              muscles: 'hamstrings',
              cues: ['Hips stay pressed down on the pad', 'Full controlled range — no jerking', 'Slow lowering — 3 seconds down'],
              yt: 'leg curl machine technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', bodyPart: 'Glutes', duration: '20 min',
          exercises: [
            { id: 's1', name: 'Abductor / adductor machine', prescription: '3 x 12 each', sets: 3, reps: 12, weight: '30-35kg',
              muscles: 'hip abductors, hip adductors, glute medius',
              cues: ['Controlled range — no slamming at end range', 'Sit tall, do not slump', 'Full range both directions'],
              yt: 'abductor adductor machine technique' },
            { id: 's2', name: 'Glute machine hip thrust', prescription: '3 x 10', sets: 3, reps: 10, weight: '20kg',
              muscles: 'glutes (primary), hamstrings',
              cues: ['Drive through heels, not toes', 'Squeeze glutes hard at top — full extension', 'Ribs down, do not over-arch lower back', 'Control the lowering phase'],
              yt: 'glute machine hip thrust technique' },
            { id: 's3', name: 'Box pistol squat — progression', prescription: '3 x 5 each side', sets: 3, reps: 5, pt: true, bodyweight: true,
              muscles: 'quads, glutes, hip stabilisers, ankle stability',
              cues: ['Start with a high box — sit back onto it with control, stand on one leg',
                'Working toward full pistol over time — do not rush depth',
                'Neutral spine throughout — no lumbar rounding at the bottom',
                'Drive the knee out — do not let it cave inward',
                'Review with PT before increasing depth or adding load — high unilateral demand with spondylolisthesis'],
              yt: 'box pistol squat progression technique' }
          ]
        }
      ]
    },

    // ── D4 · Thu · Shoulders + Core ─────────────────────────────────────────
    {
      id: 'D4', name: 'Shoulders + Core', type: 'training', duration: '70 min',
      note: 'Commute today: Zone 2 — 120-135 bpm, same as Mon/Tue/Wed after training.',
      blocks: [
        { id: 'warmup', type: 'warmup', bodyPart: '', duration: '10 min',
          note: 'Do not skip',
          exercises: [
            { id: 'w1', name: 'Shoulder Big 3', prescription: '1 x 20 each position', sets: 1, reps: 20, weight: '1kg each hand', bodyweight: false,
              note: 'Osteo prescription. 3 positions: Y, T, W. 20 reps each. Lie face down, towel under forehead.',
              muscles: 'mid-traps, lower traps, rhomboids, scapula stabilisers, rotator cuff',
              cues: ['Lie face down, towel under forehead — do not lift head from floor', '1kg dumbbell in each hand throughout', 'Position 1 — Y: arms overhead at diagonal, thumbs up, lift slowly', 'Position 2 — T: arms straight out to sides, thumbs up, lift slowly', 'Position 3 — W: elbows bent, pull elbows back and down, squeeze shoulder blades', '20 reps per position, slow and controlled'],
              yt: 'shoulder big 3 prone Y T W exercise' },
            { id: 'w2', name: 'Face pull — cable rope', prescription: '3 x 12', sets: 3, reps: 12, weight: '12kg', restSeconds: 30,
              muscles: 'rear delts, rotator cuff, upper back',
              cues: ['Pull to forehead, elbows high and wide', '4 second hold at peak'],
              yt: 'face pull cable rope technique' },
            { id: 'w3', name: 'Cable rear deltoid row — high pulley, lunge', prescription: '3 x 12', sets: 3, reps: 12, weight: '10kg',
              muscles: 'rear delts, upper back, rotator cuff',
              cues: ['High pulley with rope', 'Lunge back, pull elbows wide at shoulder height', 'Squeeze at end — do not hunch shoulders'],
              yt: 'cable rear deltoid row lunge technique' },
            { id: 'w4', name: 'GHjt external rotation', prescription: '2 x 8', sets: 2, reps: 8, weight: '5kg', restSeconds: 30,
              muscles: 'rotator cuff (infraspinatus)',
              cues: ['Elbow pinned to side at 90 degrees', 'Small controlled range, very light', 'Slow on the return'],
              yt: 'cable GHjt external rotation technique' },
            { id: 'w5', name: 'Seated shoulder external rotation', prescription: '3 x 10', sets: 3, reps: 10, weight: '0.1-1kg DB', restSeconds: 30,
              note: 'Osteo prescription. Seated on bench, elbow on knee, hand pointing up. Lower weight down toward floor slowly, return.',
              muscles: 'rotator cuff (infraspinatus, teres minor)',
              cues: ['Sit on bench, one foot on floor, other foot on bench with knee bent', 'Hold dumbbell in working hand, support elbow on knee', 'Elbow bent 90 degrees, hand pointing upward — this is the start', 'Keep shoulder down and neck long throughout', 'Lower the weight toward the floor slowly, palm facing down', 'Return to start and repeat — very light weight, controlled'],
              yt: 'seated shoulder external rotation dumbbell technique' }
          ]
        },
        { id: 'main', type: 'main', bodyPart: 'Shoulders', duration: '25 min',
          restSeconds: 90,
          exercises: [
            { id: 'm1', name: 'Dumbbell shoulder press (seated)', prescription: '4 x 4', sets: 4, reps: 4, weight: '12kg DBs', pt: true, restSeconds: 90,
              muscles: 'anterior and lateral delts, triceps',
              cues: ['Start at 10kg — left shoulder inflammation, keep it conservative', 'Monitor lumbar extension — do not arch back', 'Stop immediately if shoulder pinches or clicks', 'Press in slight arc, never lock out behind the head'],
              yt: 'seated dumbbell shoulder press technique' },
            { id: 'm2', name: 'Cable lateral raise — single arm', prescription: '3 x 10 each side', sets: 3, reps: 10, weight: '5-7kg',
              muscles: 'lateral delts',
              cues: ['Lead with the elbow, not the hand', 'Stop at shoulder height — no higher', 'Slow controlled descent — 3 seconds down'],
              yt: 'cable lateral raise single arm technique' },
            { id: 'm3', name: 'Cable woodchop — high to low', prescription: '3 x 8 each side', sets: 3, reps: 8, weight: '12kg each side',
              muscles: 'obliques, core, shoulders',
              cues: ['Rotate from the torso, not just the arms', 'Keep hips relatively square', 'Control the return — do not let cable snap back'],
              yt: 'cable woodchop high to low technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', bodyPart: 'Core', duration: '25 min',
          exercises: [
            { id: 'c1', name: 'Cable Pallof press', prescription: '3 x 12 each side', sets: 3, reps: 12, weight: '7-12kg each side',
              muscles: 'core anti-rotation, obliques, glutes',
              cues: ['Resist the rotation — goal is to stay square', 'Press straight out, hold briefly, return', 'Feet shoulder-width, slight knee bend'],
              yt: 'cable Pallof press technique' },
            { id: 'c2', name: 'Dead bug', prescription: '3 x 15 each side', sets: 3, reps: 15, bodyweight: true,
              muscles: 'deep core, transversus abdominis',
              cues: ['Lower back flat to floor throughout — non-negotiable', 'Opposite arm and leg extend slowly', 'Exhale as you extend, inhale to return'],
              yt: 'dead bug exercise technique' },
            { id: 'c3', name: 'Swiss ball rollout', prescription: '3 x 10', sets: 3, reps: 10, bodyweight: true,
              muscles: 'core, anti-extension',
              cues: ['Start on knees, ball close', 'Roll out slowly — stop before lumbar dips', 'Pull back using lats and core together'],
              yt: 'swiss ball rollout technique' },
            { id: 'c4', name: 'Single-leg glute bridge', prescription: '3 x 12 each side', sets: 3, reps: 12, bodyweight: true,
              muscles: 'glutes, hamstrings, core stability',
              cues: ['One leg extended, drive through planted heel', 'Squeeze glute at top', 'Ribs down — do not over-arch lower back'],
              yt: 'single leg glute bridge technique' }
          ]
        }
      ]
    },

    // ── D5 · Fri · Yoga / Mobility ──────────────────────────────────────────
    {
      id: 'D5', name: 'Yoga / Mobility', type: 'stretch', duration: '60 min',
      note: 'Ride to work after. Free to push the commute today — no HR restriction on yoga day.',
      yogaLog: {
        durationOptions: [15, 30, 60],
        styleOptions: ['Combination', 'Balance', 'Stretch', 'Strength']
      },
      blocks: [
        { id: 'main', type: 'main', bodyPart: 'Mobility', duration: '60 min',
          logType: 'session',
          exercises: [
            { id: 'yoga', name: 'Yoga Studio App — 60 min session', prescription: 'Log duration + style',
              sets: 1, reps: 1, bodyweight: true,
              note: 'Using Yoga Studio app. Tick to complete. Log duration (15/30/60 min) and style (Combination/Balance/Stretch/Strength).',
              muscles: 'full body mobility',
              cues: ['Follow Yoga Studio App session'],
              yt: 'yoga studio app session'
            }
          ]
        }
      ]
    },

    // ── D6 · Sat · Active Day ───────────────────────────────────────────────
    {
      id: 'D6', name: 'Active Day', type: 'cardio_day', commute: false, duration: 'Free',
      note: 'Free choice — run, swim, hike, walk, parkrun, trail run, cycle, climb. No structured gym session. Active recovery or performance depending on energy.',
      activities: [
        { id: 'run',       label: 'Run',              icon: '🏃' },
        { id: 'swim',      label: 'Swim',             icon: '🏊' },
        { id: 'hike',      label: 'Hike',             icon: '🥾' },
        { id: 'walk',      label: 'Walk',             icon: '🚶',
          presetsLabel: 'Darebin Trail',
          presets: [
            { label: 'Long',  detail: '8.5 km · ~1h45', mins: 105, km: 8.5 },
            { label: 'Short', detail: '5 km · ~1h',     mins: 60,  km: 5   }
          ] },
        { id: 'parkrun',   label: 'Parkrun',          icon: '🏅' },
        { id: 'trailrun',  label: 'Trail run',        icon: '⛰️' },
        { id: 'cycle',     label: 'Cycle',            icon: '🚴' },
        { id: 'climb',     label: 'Climb',            icon: '🧗' },
        { id: 'yoga',      label: 'Yoga',             icon: '🧘' },
        { id: 'sauna',     label: 'Sauna',            icon: '🧖' },
        { id: 'other',     label: 'Other',            icon: '➕', free: true },
        { id: 'nothing',   label: 'Rest / Nothing',   icon: '😴', rest: true }
      ],
      blocks: []
    },

    // ── D7 · Sun · Full Rest ────────────────────────────────────────────────
    {
      id: 'D7', name: 'Full Rest', type: 'rest', commute: false, duration: '-',
      note: 'Protect this day. Sauna, swim, walk — nothing structured.',
      blocks: []
    }

  ]
};
