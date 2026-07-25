// Gym Dolph — Layer 2: Identity + Constraints
// Clinicians referred to generically ("PT" / "Physio/Osteo") per project rule.
// Never reference clinicians by name in this file or any output.

window.USER_NAME    = 'Albin';
window.DEFAULT_THEME = 'dark';

window.USER_PROFILE = {
  name:     'Albin Pluche',
  age:      36,
  sex:      'Male',
  height:   '181cm',
  location: 'Northcote, Melbourne VIC',
  gym:      'Ivanhoe Aquatic & Fitness Centre, Heidelberg',

  bodyComp: {
    date:            '2026-07-04',
    device:          'Technogym Checkup (multi-frequency BIA)',
    note:            'Fasted morning (8-9h). Track trends on this machine only.',
    weight:          92.3,
    bmi:             28.2,
    bodyFatPct:      20.9,
    fatMass:         19.3,
    skeletalMuscleMass: 41.9,
    boneMineral:     4.2,
    bmr:             1960,
    phaseAngle:      6.7,
    softLeanMass:    68.8,
    fatFreeMass:     72.9,
    totalBodyWater:  53.4,
    score:           52,
  },

  goals: {
    primary:         'Reduce body fat % and improve body composition',
    targetWeight:    85,
    targetBodyFat:   '14-16%',
    targetTimeline:  '6 months',
    physique:        'Functional hybrid — trail runner / alpine athlete build. Moderate bulk not a concern.',
    performance:     'Hiking, mountaineering, cycling endurance, trail running',
  },

  workingWeights: [
    { movement: 'Barbell bench press (flat)',    weight: '60kg total (incl 20kg bar)', note: '20kg in plates + 20kg bar' },
    { movement: 'Incline dumbbell press',        weight: '20kg DBs',           note: '' },
    { movement: 'Cable chest fly',               weight: '15kg each side',     note: '' },
    { movement: 'Skull crusher',                 weight: '20kg bar',           note: 'EZ-bar preferred' },
    { movement: 'Lat pulldown — cable',          weight: '40-45kg',            note: '' },
    { movement: 'Seated cable row (low row)',    weight: '35kg',               note: 'Straight bar, neutral grip' },
    { movement: 'Single-arm dumbbell row',       weight: '22kg',               note: '' },
    { movement: 'Eccentric pull-up',             weight: 'Bodyweight',         note: '3x2, 10s lowering — progress to 15s then 30s' },
    { movement: 'Bicep curl — barbell',          weight: '25kg',               note: '' },
    { movement: 'Hammer curl — dumbbells',       weight: '10-12kg',            note: 'Left shoulder weak on last reps' },
    { movement: 'Leg press',                     weight: '90-110kg',           note: '' },
    { movement: 'Hack squat',                    weight: '50kg',               note: 'Replaces barbell RDL — review depth with PT' },
    { movement: 'Leg extension machine',         weight: '40kg',               note: '' },
    { movement: 'Leg curl machine',              weight: '35kg',               note: '' },
    { movement: 'Abductor / adductor machine',   weight: '30-35kg',            note: '' },
    { movement: 'Glute machine hip thrust',      weight: '20kg',               note: '' },
    { movement: 'Dumbbell shoulder press',       weight: '12kg DBs',           note: 'Conservative — shoulder constraint' },
    { movement: 'Cable lateral raise',           weight: '5-7kg',              note: '' },
    { movement: 'Cable woodchop',                weight: '12kg each side',     note: '' },
    { movement: 'Cable Pallof press',            weight: '7-12kg each side',   note: '' },
  ],

  lifestyle: {
    occupation:   'Office-based, ~10h/day at computer including weekends',
    posture:      'Forward head, rounded upper back, hip flexor tightness from desk work',
    commute:      'Road bike, Northcote to CBD, avg 34 min one way, avg HR 120-135 bpm',
    interests:    ['hiking', 'mountaineering', 'trail running', 'cycling', 'parkrun'],
    recentEvents: ['Summited Asahidake June 2026', 'Climbed Mt Yotei June 2026'],
  },

  diet: {
    tdee:          '2600-2800 kcal',
    targetDeficit: '300-400 kcal',
    protein:       '180-200g/day',
    framework:     'Anti-inflammatory whole foods (Pagano protocol principles)',
    direction:     'Low refined carbs, high protein, legumes, fermented foods',
    challenges:    ['Sweet tooth', 'Transitioning from travel diet'],
    alcohol:       false,
    health:        'Eczema — monitor triggers. Psoriasis in remission.',
    carbCycling:   'Higher on gym days (Mon/Tue/Wed/Thu), lower on rest days (Sat/Sun)',
  },
};

// ── Health Constraints ────────────────────────────────────────────────────────
// These are injected into every AI coaching prompt. Non-negotiable.

window.AI_CONSTRAINTS = `
ATHLETE: Albin Pluche, 36M, 181cm, 92.3kg, 20.9% body fat (Technogym, Jul 2026).
GYM: Ivanhoe Aquatic & Fitness Centre, Heidelberg VIC. Technogym equipment.

LOWER BACK — SPONDYLOLISTHESIS (PhysioLife letter, March 2023):
- No axial loading: conventional barbell deadlifts and good mornings avoided; barbell back squat under review with Osteo — discuss before programming
- No extension beyond neutral in lumbar region
- Monitor lumbar extension during all overhead movements
- Hip hinge (barbell/dumbbell RDL) permitted with good technique — PT supervision required initially
- Graduated hip extensor strengthening (glutes + hamstrings) prescribed

LEFT SHOULDER — INFLAMMATION (PhysioLife scapula program):
- No heavy overhead lifting, no anterior loading
- No Arnold press, no dips
- Dumbbell/machine shoulder press at light-moderate weight only — monitor lumbar extension
- Physio scapula circuit is warm-up in every gym session (not a home routine)

PT FLAGS — require supervision before loading:
- Hack squat (depth + lumbar position against pad)
- Single-arm dumbbell row (lumbar bracing, unilateral)
- Lat pulldown (no lumbar hyperextension at end range)
- Barbell bench press (rack setup, lumbar contact)
- Leg press (foot position, lumbar contact with pad)
- Dumbbell shoulder press (lumbar extension monitoring)
- Box pistol squat (high unilateral demand — depth and load progression)

GOALS: Reduce body fat to 14-16%, reach ~85kg, improve phase angle 6.7 to 7.5+.
Functional hybrid physique — hiking, mountaineering, cycling, trail running. Not bulk.
Protocol: Training for the New Alpinism — 4x4, stop 1-2 reps before failure, 3-5 min rest.
`.trim();

// ── Gym Equipment — Ivanhoe Aquatic (July 2026) ───────────────────────────────
// "Assume we have it all" until final list confirmed.

window.GYM_MACHINES = [
  // Free weights
  { id: 'barbell',      name: 'Barbells + plates',             category: 'free' },
  { id: 'dumbbell',     name: 'Dumbbells',                     category: 'free' },
  { id: 'bench_flat',   name: 'Olympic bench press',           category: 'free' },
  { id: 'bench_inc',    name: 'Incline bench',                 category: 'free' },
  { id: 'deadlift',     name: 'Deadlift platforms',            category: 'free' },
  // Machines
  { id: 'latpull',      name: 'Lat pulldown (cable)',          category: 'machine' },
  { id: 'assisted',     name: 'Assisted chin/dip machine',     category: 'machine' },
  { id: 'cable5',       name: '5-station cable machine',       category: 'machine' },
  { id: 'chestpress',   name: 'Plate-loaded chest press',      category: 'machine' },
  { id: 'shoulderpress',name: 'Plate-loaded shoulder press',   category: 'machine' },
  { id: 'hacksquat',    name: 'Hack squat',                    category: 'machine' },
  { id: 'legpress',     name: 'Leg press',                     category: 'machine' },
  { id: 'legcurl',      name: 'Prone leg curl',                category: 'machine' },
  { id: 'legext',       name: 'Leg extension machine',         category: 'machine' },
  { id: 'abadduct',     name: 'Abductor / adductor machine',   category: 'machine' },
  { id: 'glute',        name: 'Glute machine (hip thrust)',    category: 'machine' },
  { id: 'kinesis',      name: 'Kinesis ore',                   category: 'machine' },
  { id: 'scottbench',   name: 'Scott bench',                   category: 'machine' },
  { id: 'lowerback',    name: 'Lower back bench',              category: 'machine' },
  // Cardio
  { id: 'stairmaster',  name: 'Stairmaster',                   category: 'cardio' },
  { id: 'skierg',       name: 'SkiErg',                        category: 'cardio' },
  { id: 'rowing',       name: 'Rowing machine',                category: 'cardio' },
  { id: 'treadmill',    name: 'Treadmill',                     category: 'cardio' },
  { id: 'upbike',       name: 'Upright bike',                  category: 'cardio' },
  { id: 'crosstrainer', name: 'Cross-trainer',                 category: 'cardio' },
  { id: 'recbike',      name: 'Recumbent bike',                category: 'cardio' },
  // Other
  { id: 'swissball',    name: 'Swiss balls',                   category: 'other' },
];
