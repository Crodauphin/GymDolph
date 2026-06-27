// Gym Dolph — Layer 3: Program
// window.PROGRAM = { … } — weekly structure, exercises, sets/reps, phase definitions.
// No identity, no styling. App-specific: never shared with Girly Gym Dolph.
//
// Melbourne Training Program — Ivanhoe Aquatic & Fitness Centre.
// Clinicians referred to generically ("PT" / "Physio/Osteo") per project rule.
//
// v0.9.8 changes:
//   - Foam roll thoracic removed from all gym warm-ups (done at home)
//   - Warm-up capped at 10 min across all gym days
//   - Separate prehab block removed — shoulder prehab absorbed into warm-up
//   - Each session now has MAIN + SECONDARY block structure (like Sapporo)
//   - D1: warmup / main CHEST / secondary TRICEPS / cardio
//   - D2: warmup / main BACK / secondary BICEPS / cardio
//   - D3: warmup / main SHOULDERS / secondary CORE / cardio
//   - D6: warmup / main LEGS+GLUTES / cardio

window.PROGRAM = {
  schemaVersion: '0.9.8',
  meta: {
    title: 'Melbourne Program',
    framework: 'Training for the New Alpinism (House & Johnston)',
    gym: 'Ivanhoe Aquatic & Fitness Centre, Heidelberg VIC',
    protocol: '4x4 primary compounds; stop 1-2 reps before failure; 3-5 min rest',
    note: 'days = Phase 1 (Foundation). Warm-up max 10 min. Foam roll thoracic done at home - not in gym warm-up. Each session: warmup / main / secondary / cardio.'
  },

  phases: [
    { id: 'P1', name: 'Foundation',           weekStart: 1, weekEnd: 2,    setsReps: '3x6',     intensity: '70%',     focus: 'Transition - feel out new equipment. Form over everything. 10 min warm-up mandatory every session.', yt: 'Foundation technique' },
    { id: 'P2', name: 'Building',             weekStart: 3, weekEnd: 4,    setsReps: '3-4x5-6', intensity: '75-80%',  focus: 'Add one exercise per session. Barbell rows introduced. Add 2.5-5kg where weeks 1-2 felt controlled.', yt: 'Building technique' },
    { id: 'P3', name: 'Strength Entry',       weekStart: 5, weekEnd: 6,    setsReps: '4x4',     intensity: '85%',     focus: 'Protocol shift to 4x4 on primary compounds. 3-5 min rest. Pull-up attempts begin.', yt: 'Strength Entry technique' },
    { id: 'P4', name: 'Progressive Overload', weekStart: 7, weekEnd: 9999, setsReps: '4x4',     intensity: '87-90%',  focus: 'Add 2.5kg only when all 4 sets are clean. Track weights and pull-up reps every session. Ongoing protocol.', yt: 'Progressive Overload technique' }
  ],

  startingWeights: [
    { movement: 'Barbell bench press (flat)', week1: '50kg total',                     note: 'New rack - feel out position first' },
    { movement: 'Lat pulldown - cable',       week1: '35kg',                           note: 'Down from 45kg - new cable system' },
    { movement: 'Barbell bent-over row',      week1: '40kg total (Phase 2)',           note: 'PT clearance first' },
    { movement: 'Leg press',                  week1: '80-90kg',                        note: 'Post-hiking legs - rebuild' },
    { movement: 'Hack squat',                 week1: 'BW + 10kg',                      note: 'Technique only' },
    { movement: 'Barbell RDL',                week1: 'Bodyweight hip hinge - NO LOAD', note: 'PT session before loading' },
    { movement: 'Dumbbell shoulder press',    week1: '14-16kg DBs',                    note: 'Conservative - shoulder constraint' }
  ],

  milestones: {
    pullup: [
      { target: 'Baseline - 40kg assist x 5', timeline: 'Week 1' },
      { target: 'Reduce assist to 20kg',       timeline: 'Week 3-4' },
      { target: 'First unassisted attempt',    timeline: 'Week 6' },
      { target: '3 unassisted reps',           timeline: 'Month 2' },
      { target: '5 unassisted reps',           timeline: 'Month 3' }
    ],
    bodyComp: [
      { metric: 'Visceral fat',  target: 'Level 12 -> Level 8',              timeline: '3-4 months' },
      { metric: 'Body weight',   target: '91.2kg -> ~86kg',                  timeline: '6 months' },
      { metric: 'Body fat %',    target: '19.5% -> 14-16%',                  timeline: '6 months' },
      { metric: 'Leg imbalance', target: 'Right stronger - single-leg work', timeline: 'Ongoing' }
    ]
  },

  days: [

    // ── D1 · Push ────────────────────────────────────────────────────────────
    {
      id: 'D1', name: 'Push - Chest + Triceps', type: 'training', duration: '1h',
      note: 'First session at Ivanhoe. Focus on rack setup and bar path, not weight. Meet your PT if possible.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'WARM UP', icon: '\ud83d\udd25', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Prone scapula retractions', prescription: '3 x 12', sets: 3, reps: 12, note: 'Bodyweight - floor', bodyweight: true,
              muscles: 'mid-traps, rhomboids',
              cues: ['Lie face down, arms by your side', 'Squeeze shoulder blades down and back', 'Thumbs up, small controlled lift off the floor'],
              yt: 'prone scapula retractions technique' },
            { id: 'w2', name: 'Face pull - cable rope', prescription: '3 x 12', sets: 3, reps: 12, note: '16kg - 4s hold - cable station',
              muscles: 'rear delts, rotator cuff, upper back',
              cues: ['Pull to forehead height, elbows high and wide', '4 second hold at the peak', 'Light load - this is prehab not strength work'],
              yt: 'face pull cable rope technique' },
            { id: 'w3', name: 'GHjt external rotation', prescription: '2 x 8', sets: 2, reps: 8, note: '1kg - cable station',
              muscles: 'rotator cuff (infraspinatus)',
              cues: ['Elbow pinned to your side at 90 degrees', 'Small controlled range, very light', 'Slow on the way back'],
              yt: 'GHjt external rotation cable technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'MAIN — CHEST', icon: '\ud83d\udcaa', duration: '40 min',
          exercises: [
            { id: 'm1', name: 'Barbell bench press (flat)', prescription: '3 x 6', sets: 3, reps: 6, pt: true,
              note: '50kg total - PT: find the rack position; feet flat, natural arch, lumbar in contact with bench',
              muscles: 'chest, triceps, front delts',
              cues: ['Feet flat, natural arch, lumbar in contact with bench throughout', 'Bar to mid-chest, elbows about 45 degrees out', 'Brace hard before unracking - do not let the lower back lift off'],
              yt: 'barbell bench press technique' },
            { id: 'm2', name: 'Incline dumbbell press', prescription: '3 x 6', sets: 3, reps: 6, note: '14-16kg DBs',
              muscles: 'upper chest, front delts, triceps',
              cues: ['Bench around 30 degrees - not too steep', 'Press up and very slightly together', 'Control the descent, pause briefly at the bottom'],
              yt: 'incline dumbbell press technique' },
            { id: 'm3', name: 'Cable chest fly', prescription: '3 x 10', sets: 3, reps: 10, note: 'Light - feel the cable',
              muscles: 'chest, front delts',
              cues: ['Slight bend in the elbows throughout', 'Wide arc - open the chest', 'Slow on the return, feel the stretch'],
              yt: 'cable chest fly technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', title: 'SECONDARY — TRICEPS', icon: '\ud83d\udd31', duration: '20 min',
          exercises: [
            { id: 's1', name: 'Tricep cable pushdown', prescription: '3 x 8', sets: 3, reps: 8, note: 'Moderate',
              muscles: 'triceps (all heads)',
              cues: ['Elbows pinned to your sides throughout', 'Full extension at the bottom, squeeze', 'Slow controlled return - do not let elbows flare'],
              yt: 'tricep cable pushdown technique' },
            { id: 's2', name: 'Overhead tricep cable extension', prescription: '3 x 8', sets: 3, reps: 8, note: 'Moderate - monitor shoulder',
              muscles: 'triceps (long head)',
              cues: ['Elbows close to the head, do not flare wide', 'Full range - feel the stretch at the top', 'Keep the lumbar neutral - do not arch'],
              yt: 'overhead tricep cable extension technique' }
          ]
        },
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83d\udeb4', duration: '20 min',
          exercises: [
            { id: 'c0', name: 'Bike commute - both ways', prescription: 'Zone 2', sets: 1, reps: 1, note: 'PRIMARY - keep HR <=135 bpm after training', bodyweight: true,
              muscles: 'legs, cardiovascular (Zone 2)',
              cues: ['Conversational pace - full sentences only', 'Keep HR 120-135 bpm', 'Light gear, smooth cadence - this is recovery riding'],
              yt: 'zone 2 cycling technique' },
            { id: 'c1', name: 'Stairmaster', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 1 - Zone 2, easy pace', bodyweight: true,
              muscles: 'legs, glutes, cardiovascular',
              cues: ['Stand tall, do not lean on the rails', 'Full steps, drive through the heel', 'Keep it Zone 2 - you should be able to talk'],
              yt: 'Stairmaster technique' },
            { id: 'c2', name: 'Rowing machine', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 2 - Zone 2, damper 4-5', bodyweight: true,
              muscles: 'full body, cardiovascular',
              cues: ['Drive legs first, then lean back, then pull arms', 'Reverse on recovery - arms out, lean forward, legs bend', 'Damper 4-5, smooth steady pace'],
              yt: 'rowing machine technique' },
            { id: 'c3', name: 'Incline treadmill', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 3 - 5-8% grade, brisk walk', bodyweight: true,
              muscles: 'legs, glutes, cardiovascular',
              cues: ['Set 5-8 percent incline', 'Brisk walk - do not hold the rails', 'Keep HR in Zone 2'],
              yt: 'incline treadmill walking technique' }
          ]
        }
      ]
    },

    // ── D2 · Pull ────────────────────────────────────────────────────────────
    {
      id: 'D2', name: 'Pull - Back + Biceps', type: 'training', duration: '1h',
      note: 'Cables at Ivanhoe will feel different from Sapporo. Go 30% lighter than instinct.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'WARM UP', icon: '\ud83d\udd25', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Prone scapula retractions', prescription: '3 x 12', sets: 3, reps: 12, note: 'Bodyweight - floor', bodyweight: true,
              muscles: 'mid-traps, rhomboids',
              cues: ['Lie face down, arms by your side', 'Squeeze shoulder blades down and back', 'Thumbs up, small controlled lift'],
              yt: 'prone scapula retractions technique' },
            { id: 'w2', name: 'Cable high row - activation only', prescription: '2 x 10', sets: 2, reps: 10, note: 'Light 8-10kg - cable station',
              muscles: 'lats, upper back, rear delts',
              cues: ['Very light - activation not strength', 'Pull elbows wide and back', 'Squeeze the shoulder blades at the end'],
              yt: 'cable high row activation technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'MAIN — BACK', icon: '\ud83d\udcaa', duration: '40 min',
          exercises: [
            { id: 'm1', name: 'Lat pulldown - cable', prescription: '3 x 6', sets: 3, reps: 6, pt: true,
              note: '35kg - PT: no lumbar hyperextension at end range',
              muscles: 'lats, biceps, mid-back',
              cues: ['Pull bar to upper chest, lean back slightly', 'No lumbar hyperextension at the bottom of the rep', 'Drive elbows down and back, squeeze the lats'],
              yt: 'lat pulldown cable technique' },
            { id: 'm2', name: 'Single-arm dumbbell row', prescription: '3 x 6', sets: 3, reps: 6, pt: true,
              note: '20-24kg - PT: neutral spine, brace hard before each rep',
              muscles: 'lats, rhomboids, biceps, rear delts',
              cues: ['Neutral spine throughout - brace before you pull', 'Row to the hip, no torso rotation', 'Control the lowering phase - do not drop'],
              yt: 'single arm dumbbell row technique' },
            { id: 'm3', name: 'Assisted pull-up', prescription: '3 x 5', sets: 3, reps: 5, note: '40kg assist - reduce each week toward unassisted',
              muscles: 'lats, biceps, core',
              cues: ['Full hang at the bottom, dead hang', 'Pull chest to the bar, drive elbows down', 'Control the descent - do not drop'],
              yt: 'assisted pull-up technique progression' }
          ]
        },
        { id: 'secondary', type: 'secondary', title: 'SECONDARY — BICEPS', icon: '\ud83d\udd31', duration: '20 min',
          exercises: [
            { id: 's1', name: 'Bicep curl - barbell', prescription: '3 x 8', sets: 3, reps: 8, note: 'Moderate',
              muscles: 'biceps brachii',
              cues: ['Elbows stay at your sides throughout', 'Strict - no swinging or back lean', 'Squeeze at the top, slow on the way down'],
              yt: 'barbell bicep curl technique' },
            { id: 's2', name: 'Hammer curl - dumbbells', prescription: '3 x 8', sets: 3, reps: 8, note: 'Moderate',
              muscles: 'biceps brachii, brachialis, brachioradialis',
              cues: ['Neutral grip - thumbs up throughout', 'Alternate or both together', 'Control the lowering phase'],
              yt: 'hammer curl dumbbell technique' }
          ]
        },
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83d\udeb4', duration: '20 min',
          exercises: [
            { id: 'c0', name: 'Bike commute - both ways', prescription: 'Zone 2', sets: 1, reps: 1, note: 'PRIMARY - keep HR <=135 bpm after training', bodyweight: true,
              muscles: 'legs, cardiovascular (Zone 2)',
              cues: ['Conversational pace', 'Keep HR 120-135 bpm', 'Light gear, smooth cadence'],
              yt: 'zone 2 cycling technique' },
            { id: 'c1', name: 'Stairmaster', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 1 - Zone 2, steady pace', bodyweight: true,
              muscles: 'legs, glutes, cardiovascular',
              cues: ['Stand tall, do not lean on the rails', 'Full steps, drive through the heel', 'Zone 2 - steady and controlled'],
              yt: 'Stairmaster technique' },
            { id: 'c2', name: 'Upright / racing bike', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 2 - Zone 2, seated', bodyweight: true,
              muscles: 'legs, cardiovascular',
              cues: ['Seated, steady cadence', 'Light resistance for Zone 2', 'Relaxed upper body, hands light on bars'],
              yt: 'upright bike Zone 2 technique' },
            { id: 'c3', name: 'Rowing machine', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 3 - Zone 2, damper 4-5', bodyweight: true,
              muscles: 'full body, cardiovascular',
              cues: ['Drive legs first, lean back, pull', 'Reverse on recovery', 'Damper 4-5, smooth pace'],
              yt: 'rowing machine technique' }
          ]
        }
      ]
    },

    // ── D3 · Shoulders + Core ────────────────────────────────────────────────
    {
      id: 'D3', name: 'Shoulders + Core', type: 'training', duration: '1h',
      note: 'Book your first PT session this week. Full physio warm-up on this day - do not skip.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'PHYSIO WARM-UP (do not skip)', icon: '\ud83d\udd25', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Prone scapula retractions', prescription: '3 x 12', sets: 3, reps: 12, note: 'Bodyweight - floor', bodyweight: true,
              muscles: 'mid-traps, rhomboids',
              cues: ['Squeeze shoulder blades down and back', 'Thumbs up, small controlled lift'],
              yt: 'prone scapula retractions technique' },
            { id: 'w2', name: 'Face pull - cable rope', prescription: '3 x 12', sets: 3, reps: 12, note: '16kg - 4s hold - cable station',
              muscles: 'rear delts, rotator cuff, upper back',
              cues: ['Pull to forehead height, elbows high and wide', '4 second hold at the peak', 'Light load - prehab not strength'],
              yt: 'face pull cable rope technique' },
            { id: 'w3', name: 'Cable rear deltoid row - high pulley, lunge', prescription: '3 x 12', sets: 3, reps: 12, note: '10kg - same cable station',
              muscles: 'rear delts, upper back, rotator cuff',
              cues: ['High pulley with rope attachment', 'Lunge back, keep arms straight initially', 'Pull elbows wide at shoulder height, squeeze'],
              yt: 'cable rear deltoid row lunge technique' },
            { id: 'w4', name: 'GHjt external rotation', prescription: '2 x 8', sets: 2, reps: 8, note: '1kg - same cable station, adjust pulley',
              muscles: 'rotator cuff (infraspinatus)',
              cues: ['Elbow pinned to side at 90 degrees', 'Small controlled range, very light', 'Slow on the return'],
              yt: 'GHjt external rotation cable technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'MAIN — SHOULDERS', icon: '\ud83d\udcaa', duration: '25 min',
          exercises: [
            { id: 'm1', name: 'Dumbbell shoulder press (seated)', prescription: '3 x 6', sets: 3, reps: 6, pt: true,
              note: '14-16kg DBs - PT: monitor lumbar extension, stop if shoulder pinches',
              muscles: 'anterior and lateral delts, triceps',
              cues: ['Monitor lumbar extension - do not arch the back', 'Stop immediately if the shoulder pinches or clicks', 'Press in a slight arc, never lock out behind the head'],
              yt: 'seated dumbbell shoulder press technique' },
            { id: 'm2', name: 'Cable lateral raise - single arm', prescription: '3 x 10', sets: 3, reps: 10, note: '5-7kg',
              muscles: 'lateral delts',
              cues: ['Lead with the elbow, not the hand', 'Stop at shoulder height - no higher', 'Slow controlled descent - 3 seconds down'],
              yt: 'cable lateral raise single arm technique' },
            { id: 'm3', name: 'Cable woodchop - high to low', prescription: '3 x 8', sets: 3, reps: 8, note: '6kg each side',
              muscles: 'obliques, core, shoulders',
              cues: ['Rotate from the torso, not just the arms', 'Keep the hips relatively square', 'Control the return - do not let the cable snap back'],
              yt: 'cable woodchop high to low technique' }
          ]
        },
        { id: 'secondary', type: 'secondary', title: 'SECONDARY — CORE', icon: '\ud83d\udd31', duration: '25 min',
          exercises: [
            { id: 'c1', name: 'Dead bug', prescription: '3 x 8 each side', sets: 3, reps: 8, note: 'Bodyweight - slow and controlled', bodyweight: true,
              muscles: 'deep core, transversus abdominis (anti-extension)',
              cues: ['Lower back flat to the floor throughout - non-negotiable', 'Opposite arm and leg extend slowly', 'Exhale as you extend, inhale to return'],
              yt: 'dead bug exercise technique' },
            { id: 'c2', name: 'Cable Pallof press', prescription: '3 x 12 each side', sets: 3, reps: 12, note: 'Light to moderate - each side',
              muscles: 'core anti-rotation, obliques, glutes',
              cues: ['Resist the rotation - the goal is to stay square', 'Press straight out, hold briefly, return', 'Feet shoulder-width, slight knee bend'],
              yt: 'cable Pallof press technique' },
            { id: 'c3', name: 'Swiss ball rollout', prescription: '3 x 10', sets: 3, reps: 10, note: 'Wk 5+ only - bodyweight', bodyweight: true,
              muscles: 'core, anti-extension',
              cues: ['Start on knees, ball close', 'Roll out slowly - stop before the lumbar dips', 'Pull back using the lats and core together'],
              yt: 'swiss ball rollout technique' },
            { id: 'c4', name: 'Plank', prescription: '3 x 45s', sets: 3, reps: 1, note: '45s hold - build to 60s', bodyweight: true,
              muscles: 'core, shoulders, glutes',
              cues: ['Straight line head to heels', 'Squeeze the glutes and brace the core hard', 'Do not let the hips sag or pike up'],
              yt: 'plank technique' },
            { id: 'c5', name: 'Single-leg glute bridge', prescription: '3 x 12 each side', sets: 3, reps: 12, note: 'Bodyweight - addresses leg imbalance', bodyweight: true,
              muscles: 'glutes, hamstrings, core stability',
              cues: ['One leg extended, drive through the planted heel', 'Squeeze the glute at the top', 'Ribs down - do not over-arch the lower back'],
              yt: 'single leg glute bridge technique' }
          ]
        },
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83d\udeb4', duration: '20 min',
          exercises: [
            { id: 'cd0', name: 'Bike commute - both ways', prescription: 'Zone 2', sets: 1, reps: 1, note: 'PRIMARY - keep HR <=135 bpm after training', bodyweight: true,
              muscles: 'legs, cardiovascular (Zone 2)',
              cues: ['Conversational pace', 'Keep HR 120-135 bpm', 'Light gear, smooth cadence'],
              yt: 'zone 2 cycling technique' },
            { id: 'cd1', name: 'Stairmaster', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 1 - Zone 2, steady', bodyweight: true,
              muscles: 'legs, glutes, cardiovascular',
              cues: ['Stand tall, do not lean on the rails', 'Full steps, drive through the heel', 'Zone 2 pace'],
              yt: 'Stairmaster technique' },
            { id: 'cd2', name: 'SkiErg', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 2 - Zone 2 or light intervals',
              muscles: 'lats, core, cardiovascular',
              cues: ['Hinge at the hips, engage the lats', 'Drive down and through, not just the arms', 'Smooth steady rhythm for Zone 2'],
              yt: 'SkiErg technique' },
            { id: 'cd3', name: 'Rowing machine', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 3 - Zone 2, damper 4-5', bodyweight: true,
              muscles: 'full body, cardiovascular',
              cues: ['Drive legs first, lean back, pull', 'Reverse on recovery', 'Damper 4-5, smooth pace'],
              yt: 'rowing machine technique' }
          ]
        }
      ]
    },

    // ── D4 · Rest ────────────────────────────────────────────────────────────
    {
      id: 'D4', name: 'Rest', type: 'rest', duration: '-',
      note: 'Cycling commute only - Zone 2 - 120-135 bpm - both ways.',
      blocks: []
    },

    // ── D5 · Yoga ────────────────────────────────────────────────────────────
    {
      id: 'D5', name: 'Yoga / Mobility', type: 'stretch', duration: '60 min',
      note: 'Ride to work after. Thoracic + hips + shoulders. Counterbalances 10h desk posture.',
      blocks: [
        { id: 'main', type: 'main', title: 'MOBILITY', icon: '\ud83e\uddd8', duration: '60 min',
          exercises: [
            { id: 's1', name: 'Foam roll - full spine + thoracic', prescription: '5 min', sets: 1, reps: 1, note: '5 min', bodyweight: true,
              muscles: 'spinal mobility, thoracic extension',
              cues: ['Roll slowly - pause and breathe on tight spots', 'Avoid rolling the lumbar directly', 'Hands behind head for support'],
              yt: 'foam roll thoracic spine technique' },
            { id: 's2', name: 'Hip flexor stretch - couch stretch', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true,
              muscles: 'hip flexors, quads, psoas',
              cues: ['Rear foot elevated, tuck the pelvis under', 'Squeeze the glute of the back leg', 'Tall torso - do not arch the lower back'],
              yt: 'couch stretch hip flexor technique' },
            { id: 's3', name: 'Pigeon pose', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true,
              muscles: 'glutes, hip external rotators, piriformis',
              cues: ['Front shin angled, hips square to the floor', 'Fold forward only as far as is comfortable', 'Breathe into it, no bouncing'],
              yt: 'pigeon pose technique' },
            { id: 's4', name: 'Cat / cow', prescription: '10 reps', sets: 1, reps: 10, note: 'Slow, breathe', bodyweight: true,
              muscles: 'spinal mobility, core',
              cues: ['Move with the breath - exhale into cat, inhale into cow', 'Articulate one vertebra at a time', 'Gentle range, no forcing'],
              yt: 'cat cow spine mobility technique' },
            { id: 's5', name: 'Thread the needle - thoracic rotation', prescription: '8 each side', sets: 1, reps: 8, note: 'Bodyweight', bodyweight: true,
              muscles: 'thoracic spine, shoulders, upper back',
              cues: ['From all fours, reach one arm under and through', 'Rotate from the upper back not the lower', 'Keep the hips stacked and still'],
              yt: 'thread the needle thoracic rotation technique' },
            { id: 's6', name: 'Open book shoulder stretch', prescription: '8 each side', sets: 1, reps: 8, note: 'Bodyweight', bodyweight: true,
              muscles: 'thoracic rotation, chest, anterior shoulder',
              cues: ['Side lying, knees bent and stacked at 90 degrees', 'Open the top arm slowly toward the floor behind', 'Follow the hand with your eyes, exhale as you open'],
              yt: 'open book stretch thoracic rotation' },
            { id: 's7', name: '90/90 hip mobility', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true,
              muscles: 'hip internal and external rotation',
              cues: ['Both knees at 90 degrees', 'Rotate side to side with control', 'Sit tall, move from the hips not the spine'],
              yt: '90 90 hip mobility technique' },
            { id: 's8', name: 'Neck + upper trap release', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true,
              muscles: 'neck, upper traps, levator scapulae',
              cues: ['Gentle tilt, ear toward shoulder', 'Very light hand assist - do not pull hard', 'Hold and breathe slowly into the stretch'],
              yt: 'neck upper trap stretch technique' },
            { id: 's9', name: 'Pec mobilisation - spiky ball', prescription: '60s each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true,
              muscles: 'chest, anterior shoulder, pec minor',
              cues: ['Ball into the chest near the shoulder against a wall', 'Small slow circles, pause on tight spots', 'Ease off if it feels sharp rather than dull'],
              yt: 'pec mobilisation spiky ball technique' },
            { id: 's10', name: 'Savasana / breathing', prescription: '5 min', sets: 1, reps: 1, note: '5 min', bodyweight: true,
              muscles: 'parasympathetic recovery',
              cues: ['Lie still and let the body settle completely', 'Slow nasal breathing - 4 count in, 6 count out', 'Down-regulate - this is part of training not wasted time'],
              yt: 'savasana breathing relaxation technique' }
          ]
        }
      ]
    },

    // ── D6 · Legs ────────────────────────────────────────────────────────────
    {
      id: 'D6', name: 'Legs + Glutes', type: 'training', duration: '1.5h',
      note: 'Biggest session of the week. Stairmaster after legs - non-negotiable. Pool or sauna after if available.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'WARM UP', icon: '\ud83d\udd25', duration: '10 min',
          exercises: [
            { id: 'w1', name: 'Glute bridge', prescription: '2 x 15', sets: 2, reps: 15, note: 'Bodyweight - floor', bodyweight: true,
              muscles: 'glutes, hamstrings',
              cues: ['Drive through the heels, not the toes', 'Squeeze the glutes hard at the top', 'Ribs down - do not over-arch the lower back'],
              yt: 'glute bridge activation technique' },
            { id: 'w2', name: 'Clamshells', prescription: '2 x 15 each side', sets: 2, reps: 15, note: 'Bodyweight - floor', bodyweight: true,
              muscles: 'glute medius, hip stabilisers',
              cues: ['Heels together, open the top knee toward the ceiling', 'Keep the pelvis completely still - do not roll back', 'Slow and controlled - feel the outer glute'],
              yt: 'clamshell glute activation technique' },
            { id: 'w3', name: 'Bodyweight squat + hip circles', prescription: '1 x 15', sets: 1, reps: 15, note: 'Slow - open floor space', bodyweight: true,
              muscles: 'quads, glutes, hip mobility',
              cues: ['Sit back into the hips, chest tall', 'Knees track over the toes throughout', 'Use the circles to open the hips before loading'],
              yt: 'bodyweight squat hip mobility technique' }
          ]
        },
        { id: 'main', type: 'main', title: 'MAIN — LEGS + GLUTES', icon: '\ud83d\udcaa', duration: '50 min',
          exercises: [
            { id: 'm1', name: 'Leg press', prescription: '3 x 6', sets: 3, reps: 6, pt: true,
              note: '80-90kg - PT: foot position and lumbar contact with pad, no tailbone rounding',
              muscles: 'quads, glutes, hamstrings',
              cues: ['Feet mid-platform, shoulder-width apart', 'Lumbar stays in contact with the pad throughout', 'Do not lock the knees hard at the top - slight bend'],
              yt: 'leg press technique' },
            { id: 'm2', name: 'Hack squat', prescription: '3 x 6', sets: 3, reps: 6, pt: true,
              note: 'BW + 10kg - PT: depth and lumbar position',
              muscles: 'quads, glutes',
              cues: ['Lumbar against the pad at all times', 'Do not go below parallel until PT clears depth', 'Knees track over the toes - drive them outward'],
              yt: 'hack squat technique' },
            { id: 'm3', name: 'Barbell RDL', prescription: '3 x 6', sets: 3, reps: 6, pt: true,
              note: 'Bodyweight hip hinge only until PT clears loading',
              muscles: 'hamstrings, glutes, erectors',
              cues: ['Hip hinge - push the hips back, soft bend in the knees', 'Neutral spine throughout - no rounding at the lower back', 'Feel the hamstrings load at the bottom, squeeze glutes to stand'],
              yt: 'barbell RDL hip hinge technique' },
            { id: 'm4', name: 'Prone leg curl', prescription: '3 x 8', sets: 3, reps: 8, note: 'Moderate',
              muscles: 'hamstrings',
              cues: ['Hips stay pressed down on the pad', 'Full controlled range, no swinging or jerking', 'Slow on the way down - 3 second lowering'],
              yt: 'prone leg curl technique' },
            { id: 'm5', name: 'Abductor / adductor machine', prescription: '3 x 12 each', sets: 3, reps: 12, note: 'Moderate - addresses leg imbalance',
              muscles: 'hip abductors, hip adductors, glute medius',
              cues: ['Controlled range, no slamming at the end', 'Sit tall, do not slump', 'Full range of motion both directions'],
              yt: 'abductor adductor machine technique' }
          ]
        },
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83e\ude9c', duration: '30 min',
          exercises: [
            { id: 'c0', name: 'Stairmaster', prescription: '30 min', sets: 1, reps: 1, note: 'PRIMARY - Zone 2, 120-135 bpm. Most important cardio of the week.', bodyweight: true,
              muscles: 'legs, glutes, cardiovascular',
              cues: ['Stand tall, do not lean on the rails', 'Full steps, drive through the heel', 'Zone 2 - conversational pace throughout'],
              yt: 'Stairmaster Zone 2 technique' },
            { id: 'c1', name: 'Incline treadmill', prescription: '30 min', sets: 1, reps: 1, note: 'Alt 1 - 8-10% grade, brisk walk', bodyweight: true,
              muscles: 'legs, glutes, cardiovascular',
              cues: ['Set 8-10 percent incline', 'Brisk walk - do not hold the rails', 'Zone 2 - keep HR 120-135 bpm'],
              yt: 'incline treadmill walking technique' },
            { id: 'c2', name: 'Upright / racing bike', prescription: '30 min', sets: 1, reps: 1, note: 'Alt 2 - Zone 2, seated, low resistance', bodyweight: true,
              muscles: 'legs, cardiovascular',
              cues: ['Seated, steady cadence', 'Light resistance to stay in Zone 2', 'Relaxed upper body'],
              yt: 'upright bike Zone 2 technique' },
            { id: 'c3', name: 'Rowing machine', prescription: '25 min', sets: 1, reps: 1, note: 'Alt 3 - Zone 2, damper 4-5', bodyweight: true,
              muscles: 'full body, cardiovascular',
              cues: ['Drive legs first, lean back, pull', 'Reverse on recovery', 'Damper 4-5, smooth steady pace'],
              yt: 'rowing machine Zone 2 technique' }
          ]
        }
      ]
    },

    // ── D7 · Rest ────────────────────────────────────────────────────────────
    {
      id: 'D7', name: 'Full Rest', type: 'rest', duration: '-',
      note: 'Protect this day. Sauna, swim, walk - nothing structured.',
      blocks: []
    }

  ]
};
