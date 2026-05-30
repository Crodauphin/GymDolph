/* ═══════════════════════════════════════════
   FITTRACK v0.1 — PROGRAM DATA
   FitPlace24 Sapporo — 5-Day Split
═══════════════════════════════════════════ */

const PROGRAM = [
  {
    id: 'D1',
    name: 'Chest + Triceps',
    color: '#EB47CE',
    blocks: [
      {
        id: 'warmup',
        type: 'warmup',
        title: 'WARM UP',
        icon: '🔥',
        duration: '10 min',
        exercises: [
          { id: 'w1', name: 'Cross Trainer', prescription: '5 min · moderate pace', sets: 1, reps: 1, note: 'Cardio machine' },
          { id: 'w2', name: 'Dynamic Chest Stretch', prescription: '2 × 30 sec each side', sets: 2, reps: 1, note: 'Bodyweight' },
          { id: 'w3', name: 'Band Pull-Apart / Arm Circles', prescription: '2 × 15 reps', sets: 2, reps: 15, note: 'Activation' },
        ]
      },
      {
        id: 'main',
        type: 'main',
        title: 'MAIN LIFTING — CHEST',
        icon: '💪',
        duration: '40 min',
        exercises: [
          { id: 'm1', name: 'Bench Press', prescription: '4 × 6–8 reps', sets: 4, reps: 8, note: 'Olympic bench press — main compound' },
          { id: 'm2', name: 'Incline Chest Press (Plate Load)', prescription: '3 × 8–10 reps', sets: 3, reps: 10, note: 'Machine' },
          { id: 'm3', name: 'Pec Fly / Rear Delt Machine', prescription: '3 × 12 reps (fly only)', sets: 3, reps: 12, note: 'Use fly function' },
          { id: 'm4', name: 'Cable Crossover (Compact)', prescription: '3 × 12–15 reps', sets: 3, reps: 15, note: 'Dual adjustable pulley or compact crossover' },
        ]
      },
      {
        id: 'secondary',
        type: 'secondary',
        title: 'SECONDARY LIFTING — TRICEPS',
        icon: '🔱',
        duration: '20 min',
        exercises: [
          { id: 's1', name: 'Seated Dip Machine', prescription: '3 × 10–12 reps', sets: 3, reps: 12, note: 'Machine' },
          { id: 's2', name: 'Cable Tricep Pushdown', prescription: '3 × 12–15 reps', sets: 3, reps: 15, note: 'Dual adjustable pulley with rope/bar' },
          { id: 's3', name: 'Overhead Tricep Extension (Cable)', prescription: '3 × 12 reps', sets: 3, reps: 12, note: 'Dual adjustable pulley, high attachment' },
          { id: 's4', name: 'Bag Extension Machine (Skull Crushers Alt)', prescription: '3 × 12 reps', sets: 3, reps: 12, note: 'Machine' },
        ]
      },
      {
        id: 'cardio',
        type: 'cardio',
        title: 'CARDIO',
        icon: '🏃',
        duration: '30 min',
        exercises: [
          { id: 'c1', name: 'Running Machine', prescription: '30 min · moderate pace (zone 2)', sets: 1, reps: 1, note: 'Treadmill — steady state cardio' },
        ]
      }
    ]
  },

  {
    id: 'D2',
    name: 'Back + Biceps',
    color: '#6680CC',
    blocks: [
      {
        id: 'warmup',
        type: 'warmup',
        title: 'WARM UP',
        icon: '🔥',
        duration: '10 min',
        exercises: [
          { id: 'w1', name: 'Upright Bike or Recumbent Bike', prescription: '5 min · moderate pace', sets: 1, reps: 1, note: 'Cardio machine' },
          { id: 'w2', name: 'Cat-Cow Back Mobility', prescription: '2 × 10 reps', sets: 2, reps: 10, note: 'Bodyweight' },
          { id: 'w3', name: 'Band Face Pulls / Shoulder Rotations', prescription: '2 × 15 reps', sets: 2, reps: 15, note: 'Activation' },
        ]
      },
      {
        id: 'main',
        type: 'main',
        title: 'MAIN LIFTING — BACK',
        icon: '💪',
        duration: '40 min',
        exercises: [
          { id: 'm1', name: 'Barbell Row (Smith Machine or Free Bar)', prescription: '4 × 6–8 reps', sets: 4, reps: 8, note: 'Smith Machine or Power Rack — main compound' },
          { id: 'm2', name: 'Lat Pull-Down (Cable)', prescription: '4 × 10 reps', sets: 4, reps: 10, note: 'Rat pull-down cable machine' },
          { id: 'm3', name: 'Low Row Machine', prescription: '3 × 10–12 reps', sets: 3, reps: 12, note: 'Machine' },
          { id: 'm4', name: 'T-Bar Row (Plate Load)', prescription: '3 × 8–10 reps', sets: 3, reps: 10, note: 'Tea Bar Row machine' },
          { id: 'm5', name: 'High Row (Plate Load)', prescription: '3 × 12 reps', sets: 3, reps: 12, note: 'Machine' },
        ]
      },
      {
        id: 'secondary',
        type: 'secondary',
        title: 'SECONDARY LIFTING — BICEPS',
        icon: '💪',
        duration: '15 min',
        exercises: [
          { id: 's1', name: 'Barbell Curl (Curl Bench)', prescription: '3 × 10–12 reps', sets: 3, reps: 12, note: 'Carl Bench' },
          { id: 's2', name: 'Bicep Curl Machine (Bicepsal)', prescription: '3 × 12 reps', sets: 3, reps: 12, note: 'Machine' },
          { id: 's3', name: 'Dumbbell Hammer Curl', prescription: '3 × 12 reps each arm', sets: 3, reps: 12, note: 'Dumbbells 1–50 kg available' },
          { id: 's4', name: 'Assisted Chin-Up (Narrow grip)', prescription: '3 × 8 reps', sets: 3, reps: 8, note: 'Assisted Chin-Up machine' },
        ]
      },
      {
        id: 'cardio',
        type: 'cardio',
        title: 'CARDIO',
        icon: '🏃',
        duration: '30 min',
        exercises: [
          { id: 'c1', name: 'Running Machine', prescription: '30 min · moderate pace (zone 2)', sets: 1, reps: 1, note: 'Treadmill — steady state cardio' },
        ]
      }
    ]
  },

  {
    id: 'D3',
    name: 'Legs + Glutes',
    color: '#77FD01',
    blocks: [
      {
        id: 'warmup',
        type: 'warmup',
        title: 'WARM UP',
        icon: '🔥',
        duration: '10 min',
        exercises: [
          { id: 'w1', name: 'Cross Trainer', prescription: '5 min · moderate pace', sets: 1, reps: 1, note: 'Full body warm-up' },
          { id: 'w2', name: 'Leg Swings & Hip Circles', prescription: '2 × 10 each direction', sets: 2, reps: 10, note: 'Bodyweight mobility' },
          { id: 'w3', name: 'Bodyweight Squat', prescription: '2 × 15 reps', sets: 2, reps: 15, note: 'Activation' },
        ]
      },
      {
        id: 'main',
        type: 'main',
        title: 'MAIN LIFTING — LEGS',
        icon: '🦵',
        duration: '40 min',
        exercises: [
          { id: 'm1', name: 'Barbell Squat (Power Rack)', prescription: '4 × 6–8 reps', sets: 4, reps: 8, note: 'Power Rack — main compound' },
          { id: 'm2', name: 'Hack Squat Machine', prescription: '3 × 10 reps', sets: 3, reps: 10, note: 'Machine' },
          { id: 'm3', name: 'Seated Leg Press', prescription: '4 × 10–12 reps', sets: 4, reps: 12, note: 'Machine' },
          { id: 'm4', name: 'Leg Extension Machine', prescription: '3 × 15 reps', sets: 3, reps: 15, note: 'Machine — quad isolation' },
          { id: 'm5', name: 'Seated Leg Curl', prescription: '3 × 12–15 reps', sets: 3, reps: 15, note: 'Machine — hamstring isolation' },
        ]
      },
      {
        id: 'secondary',
        type: 'secondary',
        title: 'SECONDARY LIFTING — GLUTES',
        icon: '🍑',
        duration: '15 min',
        exercises: [
          { id: 's1', name: 'Hip Thrust Machine', prescription: '4 × 12 reps', sets: 4, reps: 12, note: 'Machine' },
          { id: 's2', name: 'Inner / Outer Thigh Machine', prescription: '3 × 15 reps each', sets: 3, reps: 15, note: 'Inner/Outer rhino machine' },
          { id: 's3', name: 'Link Hip Abduction', prescription: '3 × 15 reps', sets: 3, reps: 15, note: 'Machine' },
          { id: 's4', name: 'Seated Calf Raise', prescription: '4 × 20 reps', sets: 4, reps: 20, note: 'Seated Carf machine' },
        ]
      },
      {
        id: 'cardio',
        type: 'cardio',
        title: 'CARDIO',
        icon: '🚴',
        duration: '30 min',
        exercises: [
          { id: 'c1', name: 'Recumbent Bike', prescription: '30 min · easy–moderate (active recovery)', sets: 1, reps: 1, note: 'Low impact after leg session' },
        ]
      }
    ]
  },

  {
    id: 'D4',
    name: 'Shoulders + Abs',
    color: '#DC96D0',
    blocks: [
      {
        id: 'warmup',
        type: 'warmup',
        title: 'WARM UP',
        icon: '🔥',
        duration: '10 min',
        exercises: [
          { id: 'w1', name: 'Upright Bike', prescription: '5 min · moderate pace', sets: 1, reps: 1, note: 'Cardio machine' },
          { id: 'w2', name: 'Shoulder CARs (Controlled Articular Rotations)', prescription: '2 × 5 each direction', sets: 2, reps: 5, note: 'Mobility' },
          { id: 'w3', name: 'Band Lateral Raises', prescription: '2 × 15 reps', sets: 2, reps: 15, note: 'Activation' },
        ]
      },
      {
        id: 'main',
        type: 'main',
        title: 'MAIN LIFTING — SHOULDERS',
        icon: '🏋️',
        duration: '40 min',
        exercises: [
          { id: 'm1', name: 'Shoulder Press (Plate Load / Barbell)', prescription: '4 × 6–8 reps', sets: 4, reps: 8, note: 'Plate load shoulder press or Smith Machine OHP' },
          { id: 'm2', name: 'Shoulder Press Machine', prescription: '3 × 10–12 reps', sets: 3, reps: 12, note: 'Machine' },
          { id: 'm3', name: 'Standing Lateral Raise Machine', prescription: '4 × 15 reps', sets: 4, reps: 15, note: 'Standing Lateral Rays/Frys machine' },
          { id: 'm4', name: 'Rear Delt Fly (Pec Fly Machine)', prescription: '3 × 15 reps', sets: 3, reps: 15, note: 'Peck Fry/Rear Delto — use rear delt function' },
          { id: 'm5', name: 'Dumbbell Lateral Raises', prescription: '3 × 15–20 reps', sets: 3, reps: 20, note: 'Dumbbells 1–50 kg' },
        ]
      },
      {
        id: 'secondary',
        type: 'secondary',
        title: 'SECONDARY LIFTING — ABS & CORE',
        icon: '⚡',
        duration: '15 min',
        exercises: [
          { id: 's1', name: 'Abdominal Machine (Crunch)', prescription: '4 × 15 reps', sets: 4, reps: 15, note: 'Machine' },
          { id: 's2', name: 'Rotary Torso Machine', prescription: '3 × 15 reps each side', sets: 3, reps: 15, note: 'Machine — obliques' },
          { id: 's3', name: 'Leg Raise (Chin/Dip/Leg Raise Station)', prescription: '3 × 15 reps', sets: 3, reps: 15, note: 'Bodyweight — lower abs' },
          { id: 's4', name: 'Sit-Up Bench Crunches', prescription: '3 × 20 reps', sets: 3, reps: 20, note: 'Sit-up bench' },
          { id: 's5', name: 'Back Extension', prescription: '3 × 15 reps', sets: 3, reps: 15, note: 'Back extension bench — lower back' },
        ]
      },
      {
        id: 'cardio',
        type: 'cardio',
        title: 'CARDIO',
        icon: '🏃',
        duration: '30 min',
        exercises: [
          { id: 'c1', name: 'Cross Trainer', prescription: '30 min · moderate pace (zone 2)', sets: 1, reps: 1, note: 'Full body cardio' },
        ]
      }
    ]
  },

  {
    id: 'D5',
    name: 'Full Body Power',
    color: '#BEFF89',
    blocks: [
      {
        id: 'warmup',
        type: 'warmup',
        title: 'WARM UP',
        icon: '🔥',
        duration: '10 min',
        exercises: [
          { id: 'w1', name: 'Running Machine', prescription: '5 min · light jog', sets: 1, reps: 1, note: 'Treadmill' },
          { id: 'w2', name: 'Full Body Dynamic Warm-Up', prescription: '5 min — hip flexors, shoulders, ankles', sets: 1, reps: 1, note: 'Bodyweight mobility circuit' },
        ]
      },
      {
        id: 'main',
        type: 'main',
        title: 'MAIN LIFTING — COMPOUND POWER',
        icon: '⚡',
        duration: '40 min',
        exercises: [
          { id: 'm1', name: 'Deadlift (Power Rack)', prescription: '4 × 5 reps', sets: 4, reps: 5, note: 'Power Rack — heavy compound' },
          { id: 'm2', name: 'V-Squat Machine (2-Way)', prescription: '3 × 10 reps', sets: 3, reps: 10, note: 'Machine' },
          { id: 'm3', name: 'Power Leg Press', prescription: '3 × 10 reps', sets: 3, reps: 10, note: 'Machine — heavy variation' },
          { id: 'm4', name: 'Multi Press (Overhead or Incline)', prescription: '3 × 8–10 reps', sets: 3, reps: 10, note: 'Multi Press machine — choose angle' },
          { id: 'm5', name: 'Fixed Pull-Down (Wide Grip)', prescription: '3 × 10 reps', sets: 3, reps: 10, note: 'Fixed pull-down machine' },
        ]
      },
      {
        id: 'secondary',
        type: 'secondary',
        title: 'SECONDARY — ACCESSORY CIRCUIT',
        icon: '🎯',
        duration: '15 min',
        exercises: [
          { id: 's1', name: 'Dumbbell Romanian Deadlift', prescription: '3 × 12 reps', sets: 3, reps: 12, note: 'Dumbbells 1–50 kg' },
          { id: 's2', name: 'Seated Row (Plate Load)', prescription: '3 × 12 reps', sets: 3, reps: 12, note: 'Machine' },
          { id: 's3', name: 'Wide Pull-Down (Plate Load)', prescription: '3 × 12 reps', sets: 3, reps: 12, note: 'Machine' },
          { id: 's4', name: 'Dumbbell Farmer Walk or Shrugs', prescription: '3 × 20 steps or 15 reps', sets: 3, reps: 15, note: 'Dumbbells — grip + traps finisher' },
        ]
      },
      {
        id: 'cardio',
        type: 'cardio',
        title: 'CARDIO',
        icon: '🏃',
        duration: '30 min',
        exercises: [
          { id: 'c1', name: 'Running Machine', prescription: '20 min · moderate + 10 min cool-down walk', sets: 1, reps: 1, note: 'Treadmill' },
        ]
      }
    ]
  }
];
