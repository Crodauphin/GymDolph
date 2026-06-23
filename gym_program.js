// Gym Dolph — Layer 3: Program
// window.PROGRAM = { … } — weekly structure, exercises, sets/reps, phase definitions.
// No identity, no styling. App-specific: never shared with Girly Gym Dolph.
//
// Melbourne Training Program — Ivanhoe Aquatic & Fitness Centre.
// Authored from "Gym Dolph Melbourne Program v2.0". Clinicians referred to
// generically ("PT" / "Physio/Osteo") per project rule — never by name.
//
// `days` holds the CURRENT week (Phase 1 — Foundation). `phases` holds all four
// phase definitions; the current-phase pointer (app-state) resolves which phase
// is active. Each gym day ends with a cardio block: PRIMARY + 3 alternatives.
// Optional blocks (startingWeights, milestones) are presence-driven.

window.PROGRAM = {
  schemaVersion: '0.9.7',
  meta: {
    title: 'Melbourne Program',
    framework: 'Training for the New Alpinism (House & Johnston)',
    gym: 'Ivanhoe Aquatic & Fitness Centre, Heidelberg VIC',
    protocol: '4x4 primary compounds; stop 1-2 reps before failure; 3-5 min rest',
    note: 'days = Phase 1 (Foundation). Gym days end with a cardio block (PRIMARY + alternatives). Advance phases via the phase pointer.'
  },

  // Phase definitions (current-phase pointer in app-state resolves which is active).
  phases: [
    { id: 'P1', name: 'Foundation',           weekStart: 1, weekEnd: 2,    setsReps: '3x6',     intensity: '70%',     focus: 'Transition - feel out new equipment. Form over everything. Physio warm-up mandatory every session.' },
    { id: 'P2', name: 'Building',             weekStart: 3, weekEnd: 4,    setsReps: '3-4x5-6', intensity: '75-80%',  focus: 'Add one exercise per session. Barbell rows introduced. Add 2.5-5kg where weeks 1-2 felt controlled.' },
    { id: 'P3', name: 'Strength Entry',       weekStart: 5, weekEnd: 6,    setsReps: '4x4',     intensity: '85%',     focus: 'Protocol shift to 4x4 on primary compounds. 3-5 min rest. Pull-up attempts begin.' },
    { id: 'P4', name: 'Progressive Overload', weekStart: 7, weekEnd: 9999, setsReps: '4x4',     intensity: '87-90%',  focus: 'Add 2.5kg only when all 4 sets are clean. Track weights and pull-up reps every session. Ongoing protocol.' }
  ],

  // Week 1 Ivanhoe targets (Sapporo baseline -> conservative restart).
  startingWeights: [
    { movement: 'Barbell bench press (flat)', week1: '50kg total',                    note: 'New rack - feel out position first' },
    { movement: 'Lat pulldown - cable',       week1: '35kg',                          note: 'Down from 45kg - new cable system' },
    { movement: 'Barbell bent-over row',      week1: '40kg total (Phase 2)',          note: 'PT clearance first' },
    { movement: 'Leg press',                  week1: '80-90kg',                       note: 'Post-hiking legs - rebuild' },
    { movement: 'Hack squat',                 week1: 'BW + 10kg',                     note: 'Technique only' },
    { movement: 'Barbell RDL',                week1: 'Bodyweight hip hinge - NO LOAD', note: 'PT session before loading' },
    { movement: 'Dumbbell shoulder press',    week1: '14-16kg DBs',                   note: 'Conservative - shoulder constraint' }
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
      { metric: 'Visceral fat',  target: 'Level 12 -> Level 8',                 timeline: '3-4 months' },
      { metric: 'Body weight',   target: '91.2kg -> ~86kg',                     timeline: '6 months' },
      { metric: 'Body fat %',    target: '19.5% -> 14-16%',                     timeline: '6 months' },
      { metric: 'Leg imbalance', target: 'Right stronger - single-leg work',    timeline: 'Ongoing' }
    ]
  },

  days: [
    {
      id: 'D1', name: 'Push - Chest + Triceps', type: 'training', duration: '1h',
      note: 'First session at Ivanhoe. Focus on rack setup and bar path, not weight. Meet your PT if possible.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'WARM UP', icon: '\ud83d\udd25', duration: '10-15 min', exercises: [
          { id: 'w1', name: 'Foam roll thoracic extension', prescription: '1 x 8', sets: 1, reps: 8, note: '5s hold each - floor', bodyweight: true },
          { id: 'w2', name: 'Prone scapula retractions', prescription: '3 x 12', sets: 3, reps: 12, note: 'Bodyweight - floor', bodyweight: true },
          { id: 'w3', name: 'Face pull - cable rope', prescription: '3 x 12', sets: 3, reps: 12, note: '16kg - 4s hold - cable station' },
          { id: 'w4', name: 'GHjt external rotation', prescription: '2 x 8', sets: 2, reps: 8, note: '1kg - cable station' }
        ]},
        { id: 'main', type: 'main', title: 'MAIN', icon: '\ud83d\udcaa', duration: '40 min', exercises: [
          { id: 'm1', name: 'Barbell bench press (flat)', prescription: '3 x 6', sets: 3, reps: 6, pt: true, note: '50kg total - PT: find the rack position; feet flat, natural arch, lumbar in contact with bench' },
          { id: 'm2', name: 'Incline dumbbell press', prescription: '3 x 6', sets: 3, reps: 6, note: '14-16kg DBs' },
          { id: 'm3', name: 'Tricep cable pushdown', prescription: '3 x 8', sets: 3, reps: 8, note: 'Light - feel the new cable system' }
        ]},
        { id: 'prehab', type: 'prehab', title: 'SHOULDER PREHAB', icon: '\ud83d\udee1\ufe0f', duration: '10 min', exercises: [
          { id: 'p1', name: 'Face pull - cable rope', prescription: '3 x 12', sets: 3, reps: 12, note: '16kg - 4s hold' },
          { id: 'p2', name: 'GHjt external rotation', prescription: '2 x 8', sets: 2, reps: 8, note: '1kg' }
        ]},
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83d\udeb4', duration: '20 min', exercises: [
          { id: 'c0', name: 'Bike commute - both ways', prescription: 'Zone 2', sets: 1, reps: 1, note: 'PRIMARY - keep HR <=135 bpm after training', bodyweight: true },
          { id: 'c1', name: 'Stairmaster', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 1 - Zone 2, easy pace', bodyweight: true },
          { id: 'c2', name: 'Rowing machine', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 2 - Zone 2, damper 4-5', bodyweight: true },
          { id: 'c3', name: 'Incline treadmill', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 3 - 5-8% grade, brisk walk', bodyweight: true }
        ]}
      ]
    },
    {
      id: 'D2', name: 'Pull - Back + Biceps', type: 'training', duration: '1h',
      note: 'Cables at Ivanhoe will feel different. Go 30% lighter than instinct.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'WARM UP', icon: '\ud83d\udd25', duration: '10-15 min', exercises: [
          { id: 'w1', name: 'Foam roll thoracic extension', prescription: '1 x 8', sets: 1, reps: 8, note: '5s hold - floor', bodyweight: true },
          { id: 'w2', name: 'Prone scapula retractions', prescription: '3 x 12', sets: 3, reps: 12, note: 'Bodyweight - floor', bodyweight: true },
          { id: 'w3', name: 'Cable high row - activation only', prescription: '2 x 10', sets: 2, reps: 10, note: 'Light 8-10kg - cable station' }
        ]},
        { id: 'main', type: 'main', title: 'MAIN', icon: '\ud83d\udcaa', duration: '40 min', exercises: [
          { id: 'm1', name: 'Lat pulldown - cable', prescription: '3 x 6', sets: 3, reps: 6, pt: true, note: '35kg - PT: no lumbar hyperextension at end range' },
          { id: 'm2', name: 'Single-arm dumbbell row', prescription: '3 x 6', sets: 3, reps: 6, pt: true, note: '20-24kg - PT: neutral spine, brace hard' },
          { id: 'm3', name: 'Bicep curl - barbell', prescription: '3 x 8', sets: 3, reps: 8, note: 'Moderate' }
        ]},
        { id: 'prehab', type: 'prehab', title: 'SHOULDER PREHAB', icon: '\ud83d\udee1\ufe0f', duration: '10 min', exercises: [
          { id: 'p1', name: 'Cable Pallof rotation', prescription: '3 x 12 each side', sets: 3, reps: 12, note: '5kg - light' },
          { id: 'p2', name: 'GHjt internal rotation', prescription: '2 x 8', sets: 2, reps: 8, note: '7kg' }
        ]},
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83d\udeb4', duration: '20 min', exercises: [
          { id: 'c0', name: 'Bike commute - both ways', prescription: 'Zone 2', sets: 1, reps: 1, note: 'PRIMARY - keep HR <=135 bpm after training', bodyweight: true },
          { id: 'c1', name: 'Stairmaster', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 1 - Zone 2, easy pace', bodyweight: true },
          { id: 'c2', name: 'Upright / racing bike', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 2 - Zone 2, seated', bodyweight: true },
          { id: 'c3', name: 'Incline treadmill', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 3 - 5-8% grade, brisk walk', bodyweight: true }
        ]}
      ]
    },
    {
      id: 'D3', name: 'Shoulders + Core', type: 'training', duration: '1h',
      note: 'Book your first PT session this week. Physio scapula warm-up - do not skip.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'PHYSIO WARM-UP (do not skip)', icon: '\ud83d\udd25', duration: '10-15 min', exercises: [
          { id: 'w1', name: 'Foam roll thoracic extension', prescription: '1 x 8', sets: 1, reps: 8, note: '5s hold - floor', bodyweight: true },
          { id: 'w2', name: 'Prone scapula retractions', prescription: '3 x 12', sets: 3, reps: 12, note: 'Bodyweight - floor', bodyweight: true },
          { id: 'w3', name: 'Face pull - cable rope', prescription: '3 x 12', sets: 3, reps: 12, note: '16kg - 4s hold - cable station' },
          { id: 'w4', name: 'Cable rear deltoid row - high pulley, lunge', prescription: '3 x 12', sets: 3, reps: 12, note: '10kg - same cable station' },
          { id: 'w5', name: 'GHjt external rotation', prescription: '2 x 8', sets: 2, reps: 8, note: '1kg - same cable station, adjust pulley' }
        ]},
        { id: 'main', type: 'main', title: 'MAIN', icon: '\ud83d\udcaa', duration: '35 min', exercises: [
          { id: 'm1', name: 'Dumbbell shoulder press (seated)', prescription: '3 x 6', sets: 3, reps: 6, pt: true, note: '14-16kg DBs - PT: monitor lumbar extension, stop if shoulder pinches' },
          { id: 'm2', name: 'Cable lateral raise - single arm', prescription: '3 x 10', sets: 3, reps: 10, note: '5-7kg' },
          { id: 'm3', name: 'Dead bug', prescription: '3 x 8 each side', sets: 3, reps: 8, note: 'Bodyweight', bodyweight: true },
          { id: 'm4', name: 'Plank', prescription: '3 x 30s', sets: 3, reps: 1, note: '30s hold', bodyweight: true }
        ]},
        { id: 'finisher', type: 'cardio', title: 'CONDITIONING FINISHER', icon: '\ud83d\udea3', duration: '15 min', exercises: [
          { id: 'f1', name: 'SkiErg', prescription: '15 min', sets: 1, reps: 1, note: 'Zone 2', bodyweight: true }
        ]},
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83d\udeb4', duration: '15 min', exercises: [
          { id: 'c0', name: 'Bike commute - both ways', prescription: 'Zone 2', sets: 1, reps: 1, note: 'PRIMARY - keep HR <=135 bpm after training', bodyweight: true },
          { id: 'c1', name: 'Stairmaster', prescription: '15 min', sets: 1, reps: 1, note: 'Alt 1 - Zone 2, easy', bodyweight: true },
          { id: 'c2', name: 'SkiErg', prescription: '15 min', sets: 1, reps: 1, note: 'Alt 2 - Zone 2', bodyweight: true },
          { id: 'c3', name: 'Rowing machine', prescription: '15 min', sets: 1, reps: 1, note: 'Alt 3 - Zone 2, damper 4-5', bodyweight: true }
        ]}
      ]
    },
    {
      id: 'D4', name: 'Rest', type: 'rest', duration: '-',
      note: 'Cycling commute only - Zone 2 - 120-135 bpm - both ways.',
      blocks: []
    },
    {
      id: 'D5', name: 'Yoga / Mobility', type: 'stretch', duration: '60 min',
      note: 'Ride to work after. Thoracic + hips + shoulders.',
      blocks: [
        { id: 'main', type: 'main', title: 'MOBILITY', icon: '\ud83e\uddd8', duration: '60 min', exercises: [
          { id: 's1', name: 'Foam roll - full spine + thoracic', prescription: '5 min', sets: 1, reps: 1, note: '5 min', bodyweight: true },
          { id: 's2', name: 'Hip flexor stretch - couch stretch', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true },
          { id: 's3', name: 'Pigeon pose', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true },
          { id: 's4', name: 'Cat / cow', prescription: '10 reps', sets: 1, reps: 10, note: 'Slow, breathe', bodyweight: true },
          { id: 's5', name: 'Thread the needle - thoracic rotation', prescription: '8 each side', sets: 1, reps: 8, note: 'Bodyweight', bodyweight: true },
          { id: 's6', name: 'Open book shoulder stretch', prescription: '8 each side', sets: 1, reps: 8, note: 'Bodyweight', bodyweight: true },
          { id: 's7', name: '90/90 hip mobility', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true },
          { id: 's8', name: 'Neck + upper trap release', prescription: '2 min each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true },
          { id: 's9', name: 'Pec mobilisation - spiky ball', prescription: '60s each side', sets: 1, reps: 1, note: 'Bodyweight', bodyweight: true },
          { id: 's10', name: 'Savasana / breathing', prescription: '5 min', sets: 1, reps: 1, note: '5 min', bodyweight: true }
        ]}
      ]
    },
    {
      id: 'D6', name: 'Legs + Glutes', type: 'training', duration: '1.5h',
      note: 'Legs still recovering from Yotei. Rebuild from scratch. No RDL loading today - PT session first.',
      blocks: [
        { id: 'warmup', type: 'warmup', title: 'WARM UP', icon: '\ud83d\udd25', duration: '10 min', exercises: [
          { id: 'w1', name: 'Glute bridge', prescription: '2 x 15', sets: 2, reps: 15, note: 'Bodyweight - floor', bodyweight: true },
          { id: 'w2', name: 'Clamshells', prescription: '2 x 15 each side', sets: 2, reps: 15, note: 'Bodyweight - floor', bodyweight: true },
          { id: 'w3', name: 'Bodyweight squat + hip circles', prescription: '1 x 15', sets: 1, reps: 15, note: 'Slow - open floor space', bodyweight: true }
        ]},
        { id: 'main', type: 'main', title: 'MAIN', icon: '\ud83d\udcaa', duration: '50 min', exercises: [
          { id: 'm1', name: 'Leg press', prescription: '3 x 6', sets: 3, reps: 6, pt: true, note: '80-90kg - PT: foot position and lumbar contact with pad, no tailbone rounding' },
          { id: 'm2', name: 'Hack squat', prescription: '3 x 6', sets: 3, reps: 6, pt: true, note: 'BW + 10kg - PT: technique only, do not go below parallel yet' },
          { id: 'm3', name: 'Barbell RDL', prescription: '3 x 6', sets: 3, reps: 6, pt: true, note: 'Bodyweight hip hinge only - NO LOAD - PT: non-negotiable, learn the pattern before adding weight' },
          { id: 'm4', name: 'Prone leg curl', prescription: '3 x 8', sets: 3, reps: 8, note: 'Moderate' }
        ]},
        { id: 'cardio', type: 'cardio', title: 'CARDIO', icon: '\ud83e\ude9c', duration: '20 min', exercises: [
          { id: 'c0', name: 'Stairmaster', prescription: '20 min', sets: 1, reps: 1, note: 'PRIMARY - Zone 2, easy (legs are tired)', bodyweight: true },
          { id: 'c1', name: 'Incline treadmill', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 1 - 8-10% grade, slow walk', bodyweight: true },
          { id: 'c2', name: 'Upright / racing bike', prescription: '20 min', sets: 1, reps: 1, note: 'Alt 2 - low resistance, seated', bodyweight: true },
          { id: 'c3', name: 'Rowing machine', prescription: '15 min', sets: 1, reps: 1, note: 'Alt 3 - very easy, damper 3', bodyweight: true }
        ]}
      ]
    },
    {
      id: 'D7', name: 'Full Rest', type: 'rest', duration: '-',
      note: 'Protect this day - sauna, swim, walk.',
      blocks: []
    }
  ]
};
