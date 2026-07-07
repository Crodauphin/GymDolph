// Gym Dolph — Layer 3: Program
// window.PROGRAM = { … }
// Melbourne Training Program — Ivanhoe Aquatic & Fitness Centre.
// Clinicians referred to generically ("PT" / "Physio/Osteo") per project rule.
// ⚠️  This program is maintained in the Melbourne Training Roadmap thread only.
//     If another thread proposes changes, remind Albin to update it there.
//
// v0.9.9 changes vs v0.9.8:
//   - Phased progression removed — single target program, go at your own pace
//   - Week restructure: Mon Chest+Tri / Tue Back+Bi / Wed Legs / Thu Shoulders+Core / Fri Yoga / Sat Active / Sun Rest
//   - Hack squat removed from leg day, replaced with glute machine hip thrust (still in equipment list but not programmed)
//   - Seated cable row (low row) added to back day
//   - Assisted pull-up assist weight: 35kg
//   - Core: plank removed; dead bug increased to 3×15; Pallof press moved first
//   - Dumbbell shoulder press starting weight: 10–12kg DBs
//   - Hammer curl: 10kg × 8
//   - Bench press: 50–55kg
//   - Low row: 35kg
//   - D4 (Thu) commute note: free to push, Zone 2 not required
//   - Equipment list updated (July 2026)

window.PROGRAM = {
  schemaVersion: '0.9.9',
  meta: {
    title: 'Melbourne Program',
    framework: 'Training for the New Alpinism (House & Johnston)',
    gym: 'Ivanhoe Aquatic & Fitness Centre, Heidelberg VIC',
    protocol: '4x4 primary compounds; stop 1-2 reps before failure; 3-5 min rest',
    note: 'No phased progression — one target program. Start conservatively and progress at your own pace. Foam roll thoracic done at home, not in gym warm-up.'
  },

  milestones: {
    pullup: [
      { target: 'Current — 35kg assist x 5 reps',  timeline: 'Now' },
      { target: 'Reduce assist to 20kg',             timeline: 'Weeks ahead' },
      { target: 'First unassisted attempt',          timeline: 'Week 6' },
      { target: '3 unassisted reps',                 timeline: 'Month 2' },
      { target: '5 unassisted reps',                 timeline: 'Month 3' }
    ],
    bodyComp: [
      { metric: 'Visceral fat',  target: 'Level 12 -> Level 8',             timeline: '3-4 months' },
      { metric: 'Body weight',   target: '91.2kg -> ~86kg',                 timeline: '6 months' },
      { metric: 'Body fat %',    target: '19.5% -> 14-16% (athlete mode)',  timeline: '6 months' }
    ]
  },

  cardioPool: [
    { id: 'commute', name: 'Bike commute', pinned: true,  logFields: ['durationIn', 'durationBack'] },
    { id: 'stairs',  name: 'Stairmaster',  pinned: false, logFields: ['duration', 'difficulty'] },
    { id: 'skierg',  name: 'SkiErg',       pinned: false, logFields: ['duration', 'difficulty'] },
    { id: 'rowing',  name: 'Rowing machine',pinned: false,logFields: ['duration', 'difficulty'] },
    { id: 'tread',   name: 'Incline treadmill',pinned:false,logFields: ['duration', 'speed', 'incline'] },
    { id: 'upbike',  name: 'Upright / racing bike',pinned:false,logFields: ['duration', 'difficulty'] },
    { id: 'ellip',   name: 'Elliptical',   pinned: false, logFields: ['duration', 'difficulty'] },
    { id: 'recbike', name: 'Recumbent bike',pinned:false, logFields: ['duration', 'difficulty'] }
  ],

  days: [

    // ── D1 · Mon · Chest + Triceps ──────────────────────────────────────────
    {
      id: 'D1', name: 'Chest + Triceps', type: 'training', duration: '1h',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'Warm-up', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Prone scapula retractions', sets: 3, reps: 12, bodyweight: true,
              muscles: 'mid-traps, rhomboids, scapula stabilisers',
              cues: ['Lie face down, arms by your side, palms down', 'Squeeze shoulder blades down and back', 'Thumbs up, lift arms an inch off the floor', 'Hold 1s, lower slowly'],
              yt: 'prone scapula retractions technique' },
            { id: 'w2', name: 'Face pull — cable rope', sets: 3, reps: 12, weight: '16kg', restSeconds: 30,
              muscles: 'rear delts, rotator cuff, upper back',
              cues: ['Rope attachment at chest height', 'Pull to forehead, elbows high and wide', '4 second hold at peak', 'Do not let lower back arch'],
              yt: 'face pull cable rope technique' },
            { id: 'w3', name: 'GHjt external rotation', sets: 2, reps: 8, weight: '1kg', restSeconds: 30,
              muscles: 'rotator cuff (infraspinatus, teres minor)',
              cues: ['Elbow pinned to side at 90 degrees', 'Small controlled range — very light', 'Slow on the return'],
              yt: 'cable GHjt external rotation technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'Main — Chest', duration: '40 min',
          exercises: [
            { id: 'm1', name: 'Barbell bench press (flat)', sets: 4, reps: 4, weight: '50-55kg', pt: true,
              muscles: 'pectorals, triceps, anterior delts',
              cues: ['Feet flat, natural arch, lumbar in contact with bench throughout', 'Bar to mid-chest, elbows ~45 degrees out', 'Brace hard before unracking', 'Do not let lower back lift off the bench'],
              yt: 'barbell bench press technique' },
            { id: 'm2', name: 'Incline dumbbell press', sets: 3, reps: 6, weight: '16-18kg DBs',
              muscles: 'upper chest, anterior delts, triceps',
              cues: ['Bench ~30 degrees — not too steep', 'Press up and slightly together', 'Control the descent, brief pause at bottom'],
              yt: 'incline dumbbell press technique' },
            { id: 'm3', name: 'Cable chest fly', sets: 3, reps: 10, weight: '12.5kg each side',
              muscles: 'pectorals, anterior delts',
              cues: ['Slight bend in elbows throughout', 'Wide arc — open the chest fully', 'Slow return, feel the stretch'],
              yt: 'cable chest fly technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', title: 'Secondary — Triceps', duration: '20 min',
          exercises: [
            { id: 's1', name: 'Tricep cable pushdown', sets: 3, reps: 8, weight: '15-17.5kg',
              muscles: 'triceps (all heads)',
              cues: ['Elbows pinned to sides throughout', 'Full extension at bottom, squeeze', 'Slow controlled return'],
              yt: 'tricep cable pushdown technique' },
            { id: 's2', name: 'Overhead tricep cable extension', sets: 3, reps: 8, weight: '12.5-15kg',
              muscles: 'triceps long head',
              cues: ['Elbows close to head, do not flare', 'Full range — feel the stretch at top', 'Keep lumbar neutral — no arch'],
              yt: 'overhead tricep cable extension technique' }
          ]
        }
      ]
    },

    // ── D2 · Tue · Back + Biceps ────────────────────────────────────────────
    {
      id: 'D2', name: 'Back + Biceps', type: 'training', duration: '1h',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'Warm-up', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Prone scapula retractions', sets: 3, reps: 12, bodyweight: true,
              muscles: 'mid-traps, rhomboids',
              cues: ['Lie face down, squeeze shoulder blades down and back', 'Thumbs up, lift arms an inch off the floor', 'Hold 1s, lower slowly'],
              yt: 'prone scapula retractions technique' },
            { id: 'w2', name: 'Cable high row — activation', sets: 2, reps: 10, weight: '8-10kg', restSeconds: 30,
              muscles: 'lats, upper back, rear delts',
              cues: ['Very light — this is activation, not strength', 'Pull elbows wide and back', 'Squeeze shoulder blades together at end'],
              yt: 'cable high row activation technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'Main — Back', duration: '40 min',
          exercises: [
            { id: 'm1', name: 'Lat pulldown — cable', sets: 4, reps: 4, weight: '35-40kg', pt: true,
              muscles: 'lats, biceps, mid-back',
              cues: ['Pull bar to upper chest, lean back slightly', 'No lumbar hyperextension at end range', 'Drive elbows down and back, squeeze lats'],
              yt: 'lat pulldown cable technique' },
            { id: 'm2', name: 'Barbell bent-over row', sets: 4, reps: 4, weight: '40kg total', pt: true,
              muscles: 'lats, rhomboids, rear delts, biceps',
              cues: ['Hip hinge — horizontal back throughout', 'Brace hard before each rep', 'Row to lower chest, no lumbar rounding'],
              yt: 'barbell bent-over row technique' },
            { id: 'm3', name: 'Seated cable row (low row)', sets: 3, reps: 8, weight: '35kg',
              muscles: 'mid-back, lats, rhomboids',
              cues: ['Slight lean forward at start, pull to lower abdomen', 'Keep arms close to body', 'Tall posture — do not slump'],
              yt: 'seated cable row technique' },
            { id: 'm4', name: 'Single-arm dumbbell row', sets: 3, reps: 6, weight: '22kg', pt: true,
              muscles: 'lats, rhomboids, biceps, rear delts',
              cues: ['Neutral spine — brace before you pull', 'Row to the hip, no torso rotation', 'Control the lowering — do not drop'],
              yt: 'single arm dumbbell row technique' },
            { id: 'm5', name: 'Assisted pull-up', sets: 3, reps: 5, weight: '35kg assist',
              muscles: 'lats, biceps, core',
              cues: ['Full hang at the bottom — dead hang', 'Pull chest to bar, drive elbows down', 'Control the descent — do not drop', 'Reduce assist weight each week toward unassisted'],
              yt: 'assisted pull-up progression technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', title: 'Secondary — Biceps', duration: '20 min',
          exercises: [
            { id: 's1', name: 'Bicep curl — barbell', sets: 3, reps: 8, weight: '25kg',
              muscles: 'biceps brachii',
              cues: ['Elbows stay at sides throughout', 'Strict — no swinging or back lean', 'Squeeze at top, slow on the way down'],
              yt: 'barbell bicep curl technique' },
            { id: 's2', name: 'Hammer curl — dumbbells', sets: 3, reps: 8, weight: '10kg DBs',
              muscles: 'biceps, brachialis, brachioradialis',
              cues: ['Neutral grip — thumbs up throughout', 'Alternate arms or both together', 'Control the lowering phase'],
              yt: 'hammer curl dumbbell technique' }
          ]
        }
      ]
    },

    // ── D3 · Wed · Legs + Glutes ────────────────────────────────────────────
    {
      id: 'D3', name: 'Legs + Glutes', type: 'training', duration: '1h',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'Warm-up', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Glute bridge', sets: 2, reps: 15, bodyweight: true,
              muscles: 'glutes, hamstrings',
              cues: ['Drive through heels, not toes', 'Squeeze glutes hard at top', 'Ribs down — do not over-arch lower back'],
              yt: 'glute bridge activation technique' },
            { id: 'w2', name: 'Clamshells', sets: 2, reps: 15, bodyweight: true,
              muscles: 'glute medius, hip stabilisers',
              cues: ['Heels together, open top knee toward ceiling', 'Keep pelvis completely still — do not roll back', 'Slow and controlled — feel the outer glute'],
              yt: 'clamshell glute activation technique' },
            { id: 'w3', name: 'Bodyweight squat + hip circles', sets: 1, reps: 15, bodyweight: true,
              muscles: 'quads, glutes, hip mobility',
              cues: ['Sit back into hips, chest tall', 'Knees track over toes', 'Use circles to open hips before loading'],
              yt: 'bodyweight squat hip mobility technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'Main — Legs + Glutes', duration: '50 min',
          exercises: [
            { id: 'm1', name: 'Leg press', sets: 4, reps: 4, weight: '80-90kg', pt: true,
              muscles: 'quads, glutes, hamstrings',
              cues: ['Feet mid-platform, shoulder-width', 'Lumbar stays in contact with pad throughout', 'Do not lock knees hard at top — slight bend'],
              yt: 'leg press technique' },
            { id: 'm2', name: 'Barbell RDL', sets: 4, reps: 4, weight: 'Start light — PT first', pt: true,
              muscles: 'hamstrings, glutes, erectors',
              cues: ['Hip hinge — push hips back, soft bend in knees', 'Neutral spine throughout — no lumbar rounding', 'Feel hamstrings load at bottom, squeeze glutes to stand', 'Most important posterior chain movement'],
              yt: 'barbell RDL hip hinge technique' },
            { id: 'm3', name: 'Prone leg curl', sets: 3, reps: 8, weight: '35kg',
              muscles: 'hamstrings',
              cues: ['Hips stay pressed down on the pad', 'Full controlled range — no jerking', 'Slow lowering — 3 seconds down'],
              yt: 'prone leg curl technique' },
            { id: 'm4', name: 'Abductor / adductor machine', sets: 3, reps: 12, weight: 'Moderate',
              muscles: 'hip abductors, hip adductors, glute medius',
              cues: ['Controlled range — no slamming at end range', 'Sit tall, do not slump', 'Full range both directions'],
              yt: 'abductor adductor machine technique' },
            { id: 'm5', name: 'Glute machine hip thrust', sets: 3, reps: 10, weight: '40kg',
              muscles: 'glutes (primary), hamstrings',
              cues: ['Drive through heels, not toes', 'Squeeze glutes hard at top — full extension', 'Ribs down, do not over-arch lower back', 'Control the lowering phase'],
              yt: 'glute machine hip thrust technique' }
          ]
        }
      ]
    },

    // ── D4 · Thu · Shoulders + Core ─────────────────────────────────────────
    {
      id: 'D4', name: 'Shoulders + Core', type: 'training', duration: '1h',
      note: 'Commute today: free to push if you feel like it — Zone 2 not required. You decide.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'Physio warm-up (do not skip)', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Prone scapula retractions', sets: 3, reps: 12, bodyweight: true,
              muscles: 'mid-traps, rhomboids',
              cues: ['Squeeze shoulder blades down and back', 'Thumbs up, lift an inch, hold 1s'],
              yt: 'prone scapula retractions technique' },
            { id: 'w2', name: 'Face pull — cable rope', sets: 3, reps: 12, weight: '16kg', restSeconds: 30,
              muscles: 'rear delts, rotator cuff, upper back',
              cues: ['Pull to forehead, elbows high and wide', '4 second hold at peak'],
              yt: 'face pull cable rope technique' },
            { id: 'w3', name: 'Cable rear deltoid row — high pulley, lunge', sets: 3, reps: 12, weight: '10kg',
              muscles: 'rear delts, upper back, rotator cuff',
              cues: ['High pulley with rope', 'Lunge back, pull elbows wide at shoulder height', 'Squeeze at end — do not hunch shoulders'],
              yt: 'cable rear deltoid row lunge technique' },
            { id: 'w4', name: 'GHjt external rotation', sets: 2, reps: 8, weight: '1kg', restSeconds: 30,
              muscles: 'rotator cuff (infraspinatus)',
              cues: ['Elbow pinned to side at 90 degrees', 'Small controlled range, very light', 'Slow on the return'],
              yt: 'cable GHjt external rotation technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'Main — Shoulders', duration: '25 min',
          restSeconds: 90,
          exercises: [
            { id: 'm1', name: 'Dumbbell shoulder press (seated)', sets: 4, reps: 4, weight: '10-12kg DBs', pt: true, restSeconds: 90,
              muscles: 'anterior and lateral delts, triceps',
              cues: ['Monitor lumbar extension — do not arch back', 'Stop immediately if shoulder pinches or clicks', 'Press in slight arc, never lock out behind the head'],
              yt: 'seated dumbbell shoulder press technique' },
            { id: 'm2', name: 'Cable lateral raise — single arm', sets: 3, reps: 10, weight: '5-7kg',
              muscles: 'lateral delts',
              cues: ['Lead with the elbow, not the hand', 'Stop at shoulder height — no higher', 'Slow controlled descent — 3 seconds down'],
              yt: 'cable lateral raise single arm technique' },
            { id: 'm3', name: 'Cable woodchop — high to low', sets: 3, reps: 8, weight: '6kg each side',
              muscles: 'obliques, core, shoulders',
              cues: ['Rotate from the torso, not just the arms', 'Keep hips relatively square', 'Control the return — do not let cable snap back'],
              yt: 'cable woodchop high to low technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', title: 'Secondary — Core (anti-extension / anti-rotation)', duration: '25 min',
          exercises: [
            { id: 'c1', name: 'Cable Pallof press', sets: 3, reps: 12, weight: 'Light-moderate each side',
              muscles: 'core anti-rotation, obliques, glutes',
              cues: ['Resist the rotation — goal is to stay square', 'Press straight out, hold briefly, return', 'Feet shoulder-width, slight knee bend'],
              yt: 'cable Pallof press technique' },
            { id: 'c2', name: 'Dead bug', sets: 3, reps: 15, bodyweight: true,
              muscles: 'deep core, transversus abdominis',
              cues: ['Lower back flat to floor throughout — non-negotiable', 'Opposite arm and leg extend slowly', 'Exhale as you extend, inhale to return'],
              yt: 'dead bug exercise technique' },
            { id: 'c3', name: 'Swiss ball rollout', sets: 3, reps: 10, bodyweight: true,
              muscles: 'core, anti-extension',
              cues: ['Start on knees, ball close', 'Roll out slowly — stop before lumbar dips', 'Pull back using lats and core together'],
              yt: 'swiss ball rollout technique' },
            { id: 'c4', name: 'Single-leg glute bridge', sets: 3, reps: 12, bodyweight: true,
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
      note: 'Ride to work after. Thoracic + hips + shoulders. Counterbalances 10h desk posture.',
      blocks: [
        { id: 'main', type: 'main', title: 'Mobility',
          exercises: [
            { id: 's1', name: 'Foam roll — full spine + thoracic', sets: 1, reps: 1, note: '5 min', bodyweight: true,
              muscles: 'spinal mobility, thoracic extension',
              cues: ['Roll slowly, pause and breathe on tight spots', 'Avoid rolling the lumbar directly', 'Hands behind head for support'],
              yt: 'foam roll thoracic spine technique' },
            { id: 's2', name: 'Hip flexor stretch — couch stretch', sets: 1, reps: 1, note: '2 min each side', bodyweight: true,
              muscles: 'hip flexors, quads, psoas',
              cues: ['Rear foot elevated, tuck pelvis under', 'Squeeze glute of back leg', 'Tall torso — do not arch lower back'],
              yt: 'couch stretch hip flexor technique' },
            { id: 's3', name: 'Pigeon pose', sets: 1, reps: 1, note: '2 min each side', bodyweight: true,
              muscles: 'glutes, hip external rotators, piriformis',
              cues: ['Front shin angled, hips square to floor', 'Fold forward only as far as comfortable', 'Breathe into it, no bouncing'],
              yt: 'pigeon pose yoga technique' },
            { id: 's4', name: 'Cat / cow', sets: 1, reps: 10, bodyweight: true,
              muscles: 'spinal mobility, core',
              cues: ['Move with the breath', 'Articulate one vertebra at a time', 'Gentle range, no forcing'],
              yt: 'cat cow spine mobility technique' },
            { id: 's5', name: 'Thread the needle — thoracic rotation', sets: 1, reps: 8, bodyweight: true,
              muscles: 'thoracic spine, shoulders, upper back',
              cues: ['From all fours, reach one arm under and through', 'Rotate from upper back not lower', 'Keep hips stacked and still'],
              yt: 'thread the needle thoracic rotation technique' },
            { id: 's6', name: 'Open book shoulder stretch', sets: 1, reps: 8, bodyweight: true,
              muscles: 'thoracic rotation, chest, anterior shoulder',
              cues: ['Side lying, knees bent and stacked at 90 degrees', 'Open top arm slowly toward floor behind', 'Follow hand with eyes, exhale as you open'],
              yt: 'open book stretch thoracic rotation' },
            { id: 's7', name: '90/90 hip mobility', sets: 1, reps: 1, note: '2 min each side', bodyweight: true,
              muscles: 'hip internal and external rotation',
              cues: ['Both knees at 90 degrees', 'Rotate side to side with control', 'Sit tall, move from the hips not the spine'],
              yt: '90 90 hip mobility technique' },
            { id: 's8', name: 'Neck + upper trap release', sets: 1, reps: 1, note: '2 min each side', bodyweight: true,
              muscles: 'neck, upper traps, levator scapulae',
              cues: ['Gentle tilt, ear toward shoulder', 'Very light hand assist — do not pull hard', 'Hold and breathe slowly into the stretch'],
              yt: 'neck upper trap stretch technique' },
            { id: 's9', name: 'Pec mobilisation — spiky ball', sets: 1, reps: 1, note: '60s each side', bodyweight: true,
              muscles: 'chest, anterior shoulder, pec minor',
              cues: ['Ball into chest near shoulder against wall', 'Small slow circles, pause on tight spots', 'Ease off if it feels sharp rather than dull'],
              yt: 'pec mobilisation spiky ball technique' },
            { id: 's10', name: 'Savasana / breathing', sets: 1, reps: 1, note: '5 min', bodyweight: true,
              muscles: 'parasympathetic recovery',
              cues: ['Lie still, let body settle completely', 'Slow nasal breathing — 4 count in, 6 count out', 'This is part of training, not wasted time'],
              yt: 'savasana breathing relaxation technique' }
          ]
        }
      ]
    },

    // ── D6 · Sat · Active Day ───────────────────────────────────────────────
    {
      id: 'D6', name: 'Active Day', type: 'cardio_day', commute: false, duration: 'Free',
      note: 'Free choice — run, swim, hike, parkrun, trail run, cycle, climb. No structured gym session. Active recovery or performance depending on energy.',
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
