/* ══════════════════════════════════════════
   GYM DOLPH v0.8 — DATA
══════════════════════════════════════════ */
const PROGRAM = [
  /* ─── D1 · Chest + Triceps ─── */
  {
    id:'D1', name:'Chest + Triceps', color:'#EB47CE', type:'training',
    blocks:[
      { id:'warmup', type:'warmup', title:'WARM UP', icon:'🔥', duration:'10 min',
        exercises:[
          {id:'w1',name:'Cross Trainer',prescription:'5 min · moderate pace',sets:1,reps:1,note:'Cardio machine warm-up'},
          {id:'w2',name:'Dynamic Chest Stretch',prescription:'2 × 30 sec each side',sets:2,reps:1,note:'Bodyweight',bodyweight:true},
          {id:'w3',name:'Band Pull-Apart / Arm Circles',prescription:'2 × 15 reps',sets:2,reps:15,note:'Shoulder activation — gentle on left',bodyweight:true},
        ]
      },
      { id:'main', type:'main', title:'MAIN LIFTING — CHEST', icon:'💪', duration:'40 min',
        exercises:[
          {id:'m1',name:'Bench Press',prescription:'4 × 6–8 reps',sets:4,reps:8,note:'Olympic bench press — main compound'},
          {id:'m2',name:'Incline Chest Press (Plate Load)',prescription:'3 × 8–10 reps',sets:3,reps:10,note:'Machine — slight incline only'},
          {id:'m3',name:'Pec Fly / Rear Delt Machine',prescription:'3 × 12 reps (fly only)',sets:3,reps:12,note:'Use fly function — controlled arc'},
          {id:'m4',name:'Cable Crossover (Compact)',prescription:'3 × 12–15 reps',sets:3,reps:15,note:'Dual adjustable pulley or compact crossover'},
        ]
      },
      { id:'secondary', type:'secondary', title:'SECONDARY — TRICEPS', icon:'🔱', duration:'20 min',
        exercises:[
          {id:'s1',name:'Seated Dip Machine',prescription:'3 × 10–12 reps',sets:3,reps:12,note:'Machine — tricep focus'},
          {id:'s2',name:'Cable Tricep Pushdown',prescription:'3 × 12–15 reps',sets:3,reps:15,note:'Dual adjustable pulley with rope/bar'},
          {id:'s3',name:'Overhead Tricep Extension (Cable)',prescription:'3 × 12 reps',sets:3,reps:12,note:'High attachment — elbows forward, avoid left shoulder stress'},
          {id:'s4',name:'Bag Extension Machine',prescription:'3 × 12 reps',sets:3,reps:12,note:'Machine — skull crusher alternative'},
        ]
      },
      { id:'cardio', type:'cardio', title:'CARDIO', icon:'🏃', duration:'20 min',
        exercises:[
          {id:'c1',name:'Running Machine',prescription:'20 min · moderate pace (zone 2)',sets:1,reps:1,note:'Treadmill — steady state · maintain upright posture'},
        ]
      }
    ]
  },
  /* ─── D2 · Back + Biceps ─── */
  {
    id:'D2', name:'Back + Biceps', color:'#6680CC', type:'training',
    blocks:[
      { id:'warmup', type:'warmup', title:'WARM UP', icon:'🔥', duration:'10 min',
        exercises:[
          {id:'w1',name:'Upright Bike or Recumbent Bike',prescription:'5 min · moderate pace',sets:1,reps:1,note:'Cardio machine'},
          {id:'w2',name:'Cat-Cow Back Mobility',prescription:'2 × 10 reps',sets:2,reps:10,note:'Bodyweight — keep range small, no deep arch',bodyweight:true},
          {id:'w3',name:'Band Face Pulls / Shoulder Rotations',prescription:'2 × 15 reps',sets:2,reps:15,note:'Activation — gentle on left shoulder',bodyweight:true},
        ]
      },
      { id:'main', type:'main', title:'MAIN LIFTING — BACK', icon:'💪', duration:'40 min',
        exercises:[
          {id:'m1',name:'Barbell Row (Smith Machine)',prescription:'4 × 6–8 reps',sets:4,reps:8,note:'Smith Machine preferred — controlled spine position'},
          {id:'m2',name:'Lat Pull-Down (Cable)',prescription:'4 × 10 reps',sets:4,reps:10,note:'Front to chin only — never behind neck'},
          {id:'m3',name:'Low Row Machine',prescription:'3 × 10–12 reps',sets:3,reps:12,note:'Machine — chest up, no rounding'},
          {id:'m4',name:'T-Bar Row (Plate Load)',prescription:'3 × 8–10 reps',sets:3,reps:10,note:'T-Bar Row machine'},
          {id:'m5',name:'High Row (Plate Load)',prescription:'3 × 12 reps',sets:3,reps:12,note:'Machine'},
        ]
      },
      { id:'secondary', type:'secondary', title:'SECONDARY — BICEPS', icon:'💪', duration:'20 min',
        exercises:[
          {id:'s1',name:'Barbell Curl (Curl Bench)',prescription:'3 × 10–12 reps',sets:3,reps:12,note:'Curl Bench'},
          {id:'s2',name:'Bicep Curl Machine',prescription:'3 × 12 reps',sets:3,reps:12,note:'Machine'},
          {id:'s3',name:'Dumbbell Hammer Curl',prescription:'3 × 12 reps each arm',sets:3,reps:12,note:'Dumbbells 1–50 kg available'},
          {id:'s4',name:'Assisted Chin-Up (Narrow grip)',prescription:'3 × 8 reps',sets:3,reps:8,note:'Assisted Chin-Up machine — palms facing you',bodyweight:true},
        ]
      },
      { id:'cardio', type:'cardio', title:'CARDIO', icon:'🏃', duration:'20 min',
        exercises:[
          {id:'c1',name:'Running Machine',prescription:'20 min · moderate pace (zone 2)',sets:1,reps:1,note:'Treadmill — steady state'},
        ]
      }
    ]
  },
  /* ─── D3 · Legs + Glutes ─── */
  {
    id:'D3', name:'Legs + Glutes', color:'#77FD01', type:'training',
    blocks:[
      { id:'warmup', type:'warmup', title:'WARM UP', icon:'🔥', duration:'10 min',
        exercises:[
          {id:'w1',name:'Recumbent Bike',prescription:'5 min · easy pace · zero spinal load',sets:1,reps:1,note:'Great for spondylolisthesis warm-up'},
          {id:'w2',name:'Leg Swings & Hip Circles',prescription:'2 × 10 each direction',sets:2,reps:10,note:'Hold rail for balance',bodyweight:true},
          {id:'w3',name:'Ankle Rolls + Calf Raises',prescription:'2 × 10 each',sets:2,reps:10,note:'Warm up lower legs',bodyweight:true},
        ]
      },
      { id:'main', type:'main', title:'MAIN LIFTING — LEGS', icon:'🦵', duration:'40 min',
        exercises:[
          {id:'m1',name:'Barbell Squat (Power Rack)',prescription:'4 × 6–8 reps',sets:4,reps:8,note:'Power Rack — brace core, neutral spine'},
          {id:'m2',name:'Hack Squat Machine',prescription:'3 × 10 reps',sets:3,reps:10,note:'Machine — controlled depth'},
          {id:'m3',name:'Seated Leg Press',prescription:'4 × 10–12 reps',sets:4,reps:12,note:'Machine — feet shoulder width, no excessive forward knee'},
          {id:'m4',name:'Leg Extension Machine',prescription:'3 × 15 reps',sets:3,reps:15,note:'Machine — quad isolation'},
          {id:'m5',name:'Seated Leg Curl',prescription:'3 × 12–15 reps',sets:3,reps:15,note:'Machine — hamstring isolation, back flat'},
        ]
      },
      { id:'secondary', type:'secondary', title:'SECONDARY — GLUTES', icon:'🍑', duration:'20 min',
        exercises:[
          {id:'s1',name:'Hip Thrust Machine',prescription:'4 × 12 reps',sets:4,reps:12,note:'Machine — glute focus, avoid hyperextension at top'},
          {id:'s2',name:'Inner / Outer Thigh Machine',prescription:'3 × 15 reps each',sets:3,reps:15,note:'Inner/Outer thigh machine'},
          {id:'s3',name:'Link Hip Abduction',prescription:'3 × 15 reps',sets:3,reps:15,note:'Machine'},
          {id:'s4',name:'Seated Calf Raise',prescription:'4 × 20 reps',sets:4,reps:20,note:'Seated calf machine'},
        ]
      },
      { id:'cardio', type:'cardio', title:'CARDIO', icon:'🚴', duration:'20 min',
        exercises:[
          {id:'c1',name:'Recumbent Bike',prescription:'20 min · easy–moderate (active recovery)',sets:1,reps:1,note:'Low impact after leg session · back fully supported'},
        ]
      }
    ]
  },
  /* ─── D4 · Shoulders + Abs ─── */
  {
    id:'D4', name:'Shoulders + Abs', color:'#DC96D0', type:'training',
    blocks:[
      { id:'warmup', type:'warmup', title:'WARM UP', icon:'🔥', duration:'10 min',
        exercises:[
          {id:'w1',name:'Upright Bike',prescription:'5 min · moderate pace',sets:1,reps:1,note:'Cardio machine'},
          {id:'w2',name:'Shoulder CARs',prescription:'2 × 5 each direction',sets:2,reps:5,note:'Controlled Articular Rotations — gentle full ROM, extra care on left',bodyweight:true,yt:'https://www.youtube.com/results?search_query=shoulder+CARs+controlled+articular+rotation'},
          {id:'w3',name:'Band Lateral Raises',prescription:'2 × 15 reps',sets:2,reps:15,note:'Light band — activation only',bodyweight:true},
        ]
      },
      { id:'main', type:'main', title:'MAIN LIFTING — SHOULDERS', icon:'🏋️', duration:'40 min',
        exercises:[
          {id:'m1',name:'Shoulder Press Machine',prescription:'4 × 10–12 reps',sets:4,reps:12,note:'Machine preferred over free bar — safer for left shoulder'},
          {id:'m2',name:'Standing Lateral Raise Machine',prescription:'4 × 15 reps',sets:4,reps:15,note:'Machine — light on left side'},
          {id:'m3',name:'Rear Delt Fly (Pec Fly Machine)',prescription:'3 × 15 reps',sets:3,reps:15,note:'Use rear delt function'},
          {id:'m4',name:'Dumbbell Lateral Raises',prescription:'3 × 15–20 reps',sets:3,reps:20,note:'Dumbbells — light, controlled arc, left arm careful'},
        ]
      },
      { id:'secondary', type:'secondary', title:'SECONDARY — ABS & CORE', icon:'⚡', duration:'20 min',
        exercises:[
          {id:'s1',name:'Abdominal Machine (Crunch)',prescription:'4 × 15 reps',sets:4,reps:15,note:'Machine — no hip flexor pull'},
          {id:'s2',name:'Rotary Torso Machine',prescription:'3 × 15 reps each side',sets:3,reps:15,note:'Machine — obliques · spondylolisthesis friendly'},
          {id:'s3',name:'Leg Raise (Station)',prescription:'3 × 15 reps',sets:3,reps:15,note:'Chin/Dip/Leg Raise Station — lower abs',bodyweight:true},
          {id:'s4',name:'Back Extension (Bodyweight only)',prescription:'3 × 15 reps',sets:3,reps:15,note:'Back extension bench — no added weight, slow controlled',bodyweight:true},
        ]
      },
      { id:'cardio', type:'cardio', title:'CARDIO', icon:'🏃', duration:'20 min',
        exercises:[
          {id:'c1',name:'Cross Trainer',prescription:'20 min · moderate pace (zone 2)',sets:1,reps:1,note:'Full body cardio — arms active, upright posture'},
        ]
      }
    ]
  },
  /* ─── D5 · Cardio Day ─── */
  {
    id:'D5', name:'Cardio Day', color:'#BEFF89', type:'cardio_day',
    blocks:[
      { id:'warmup', type:'warmup', title:'WARM UP', icon:'🔥', duration:'5 min',
        exercises:[
          {id:'w1',name:'Recumbent Bike',prescription:'5 min · very easy pace',sets:1,reps:1,note:'Zero spinal load'},
          {id:'w2',name:'Leg Swings (front/back + lateral)',prescription:'10 reps each direction',sets:1,reps:10,note:'Standing · hold rail for balance'},
          {id:'w3',name:'Hip Circles',prescription:'10 reps each side',sets:1,reps:10,note:'Gentle mobilisation'},
          {id:'w4',name:'Ankle Rolls + Calf Raises',prescription:'10 reps each',sets:1,reps:10,note:'Warm up lower legs before cardio blocks'},
        ]
      },
      { id:'blockA', type:'cardio', title:'BLOCK A · RECUMBENT BIKE', icon:'🚴', duration:'15 min',
        exercises:[
          {id:'cA',name:'Recumbent Bike Intervals',prescription:'15 min · 2 min easy · 1 min hard / 1 min easy ×5 · 3 min cool-out',sets:1,reps:1,note:'Zero spinal compression'},
        ]
      },
      { id:'blockB', type:'cardio', title:'BLOCK B · CROSS TRAINER', icon:'🏃', duration:'15 min',
        exercises:[
          {id:'cB',name:'Cross Trainer Steady-State',prescription:'15 min · moderate effort (6–7 RPE) · arms active',sets:1,reps:1,note:'Low impact on lower back'},
        ]
      },
      { id:'blockC', type:'cardio', title:'BLOCK C · UPRIGHT BIKE', icon:'🚵', duration:'20 min',
        exercises:[
          {id:'cC',name:'Upright Bike Pyramid',prescription:'20 min · pyramid 1→2→3→2→1 min hard · 1 min easy between',sets:1,reps:1,note:'Resistance up on hard efforts · stay seated throughout'},
        ]
      },
      { id:'cooldown', type:'warmup', title:'COOL DOWN', icon:'❄️', duration:'5 min',
        exercises:[
          {id:'cd1',name:'Recumbent Bike',prescription:'5 min · low resistance',sets:1,reps:1,note:'Let HR drop naturally'},
        ]
      }
    ]
  },
  /* ─── D6 · Yoga / Stretching ─── */
  {
    id:'D6', name:'Yoga / Stretching', color:'#DC96D0', type:'stretch',
    stretchPhases:[
      { icon:'🌅', title:'OPENING', duration:'10 min',
        moves:[
          {id:'p1a',name:'Diaphragmatic Breathing',detail:'3 min · 4s inhale, hold 2s, 6s exhale',note:''},
          {id:'p1b',name:'Neck Rolls',detail:'5 slow rolls each direction',note:'Never roll full circle backward'},
          {id:'p1c',name:'Seated Torso Rotations',detail:'10 reps each side',note:'Gentle spinal mobilisation'},
          {id:'p1d',name:'Seated Side Reach',detail:'8 reps each side · hold 3s each',note:''},
        ]
      },
      { icon:'🦵', title:'LOWER BODY', duration:'20 min',
        moves:[
          {id:'p2a',name:'Standing Hip Flexor Stretch',detail:'45s each side',note:'⚠ Crucial for spondylolisthesis'},
          {id:'p2b',name:'Pigeon Pose (Chair Modified)',detail:'60s each side',note:'No mat needed'},
          {id:'p2c',name:'Standing Quad Stretch',detail:'45s each side',note:''},
          {id:'p2d',name:'Standing Hamstring Stretch',detail:'45s each side',note:'⚠ Never round the lower back'},
          {id:'p2e',name:'Seated Calf Stretch',detail:'45s each side',note:''},
        ]
      },
      { icon:'💪', title:'UPPER BODY', duration:'15 min',
        moves:[
          {id:'p3a',name:'Cross-Body Shoulder Stretch',detail:'45s each arm',note:'⚠ Gentle on left shoulder'},
          {id:'p3b',name:'Doorframe Chest Stretch',detail:'45s',note:''},
          {id:'p3c',name:'Overhead Tricep Stretch',detail:'45s each arm',note:'⚠ Left side — stop if shoulder pinches'},
        ]
      },
      { icon:'🧘', title:'BACK & SPINE', duration:'10 min',
        moves:[
          {id:'p4a',name:'Standing Cat-Cow (Wall)',detail:'10 reps',note:'⚠ Keep range small — no deep arch'},
          {id:'p4b',name:'Seated Spinal Twist',detail:'60s each side',note:''},
          {id:'p4c',name:'Standing Glute Stretch',detail:'45s each side',note:'Wall-sit style'},
        ]
      },
      { icon:'☮️', title:'CLOSING', duration:'5 min',
        moves:[
          {id:'p5a',name:'Standing Forward Fold (Supported)',detail:'2 min · hang from hips',note:'Great spinal decompression'},
          {id:'p5b',name:'Closing Breathing',detail:'3 min · 4s inhale, 8s exhale',note:''},
        ]
      }
    ]
  },
  /* ─── D7 · Full Rest Day ─── */
  { id:'D7', name:'Full Rest Day', color:'#6680CC', type:'rest', blocks:[] }
];

const EX_INFO = {
  'bench press': {
    muscles: 'Pectorals · Anterior deltoid · Triceps',
    cues: ['Retract scapulae before unracking', 'Bar path: slight diagonal, not straight down', 'Feet flat, drive through heels', 'Touch chest lightly, press explosively'],
    note: null, yt: 'bench press proper form tutorial'
  },
  'incline chest press (plate load)': {
    muscles: 'Upper pectorals · Anterior deltoid · Triceps',
    cues: ['Keep slight incline — avoid steep angle', 'Elbows at ~45° from torso', 'Full stretch at bottom, squeeze at top', 'Control the eccentric (lowering)'],
    note: '⚠ Left shoulder: reduce ROM if any pinch', yt: 'incline chest press machine form'
  },
  'pec fly / rear delt machine': {
    muscles: 'Pectorals (fly) · Rear deltoids · Rhomboids (rear setting)',
    cues: ['Fly: slight elbow bend, arc like hugging a tree', 'Rear delt: lead with elbows back, not hands', 'Keep chest tall throughout', 'No jerking — slow controlled movement'],
    note: null, yt: 'pec deck fly rear delt machine form'
  },
  'cable crossover (compact)': {
    muscles: 'Pectorals (inner & lower) · Anterior deltoid',
    cues: ['Low-to-high: pull from low pulley upward', 'Lean slightly forward, brace core', 'Arms slightly bent throughout', 'Squeeze chest hard at the cross point'],
    note: null, yt: 'cable crossover low to high chest form'
  },
  'seated dip machine': {
    muscles: 'Triceps (all 3 heads) · Lower pectorals',
    cues: ['Grip neutral, elbows close to body', 'Push through full extension, squeeze triceps', 'Lower slowly — 2–3 seconds down', 'Keep torso upright, avoid leaning forward'],
    note: '⚠ Left shoulder: if any pinch, reduce range', yt: 'seated dip machine triceps form'
  },
  'cable tricep pushdown': {
    muscles: 'Triceps (lateral & medial head)',
    cues: ['Elbows pinned to sides throughout', 'Push straight down, full extension', 'Resist the cable on the way back up', 'Keep upper body still — no swinging'],
    note: null, yt: 'cable tricep pushdown form tutorial'
  },
  'overhead tricep extension (cable)': {
    muscles: 'Triceps (long head emphasis)',
    cues: ['Face away from stack, arms overhead', 'Elbows forward and close together', 'Lower until 90° bend, press to full extension', 'Keep core braced, no lumbar arch'],
    note: '⚠ Left shoulder: stop if overhead position causes pain', yt: 'overhead cable tricep extension form'
  },
  'bag extension machine': {
    muscles: 'Triceps (all heads)',
    cues: ['Control the lowering phase', 'Full extension at top, squeeze', 'Elbows stay fixed — only forearms move', 'Choose weight that allows clean reps'],
    note: null, yt: 'tricep extension machine form'
  },
  'barbell row (smith machine)': {
    muscles: 'Latissimus dorsi · Rhomboids · Rear deltoids · Biceps',
    cues: ['Hip hinge: push hips back, keep back flat', 'Pull bar to lower chest/upper abs', 'Lead with elbows, not hands', 'Smith machine guides path — still brace core'],
    note: '⚠ Spondylolisthesis: neutral spine is critical — no rounding', yt: 'smith machine barbell row form'
  },
  'lat pull-down (cable)': {
    muscles: 'Latissimus dorsi · Teres major · Biceps',
    cues: ['Pull to chin — never behind neck', 'Lean back slightly, chest up', 'Drive elbows toward hips, not floor', 'Controlled return — stretch the lats'],
    note: null, yt: 'lat pulldown cable form tutorial'
  },
  'low row machine': {
    muscles: 'Latissimus dorsi · Mid-back · Biceps',
    cues: ['Chest against pad, back straight', 'Pull handles to lower chest', 'Squeeze shoulder blades at contraction', 'Slow eccentric — 2–3 seconds out'],
    note: null, yt: 'seated low row machine form'
  },
  't-bar row (plate load)': {
    muscles: 'Mid-back · Lats · Rhomboids · Biceps',
    cues: ['Chest on pad, neutral spine', 'Pull to upper abdomen', 'Lead with elbows wide and up', 'No jerking the weight up'],
    note: '⚠ Spondylolisthesis: prefer chest-supported version', yt: 't-bar row chest supported form'
  },
  'high row (plate load)': {
    muscles: 'Upper lats · Rear deltoids · Teres major',
    cues: ['Arms start high, pull down and back', 'Think: drive elbows toward back pockets', 'Keep torso stable throughout', 'Full stretch at top before each rep'],
    note: null, yt: 'high row machine form tutorial'
  },
  'barbell curl (curl bench)': {
    muscles: 'Biceps brachii · Brachialis',
    cues: ['Elbows stay pinned to sides', 'Curl to shoulder height, full contraction', 'Lower slowly — 2–3 seconds', 'No swinging — strict form'],
    note: null, yt: 'barbell curl strict form tutorial'
  },
  'bicep curl machine': {
    muscles: 'Biceps brachii (peak contraction)',
    cues: ['Chest pad supports — no cheating possible', 'Full extension at bottom for max stretch', 'Squeeze at top for 1 second', 'Control the weight down'],
    note: null, yt: 'bicep curl machine form'
  },
  'dumbbell hammer curl': {
    muscles: 'Brachialis · Brachioradialis · Biceps',
    cues: ['Neutral grip (thumbs up) throughout', 'Curl straight up — no rotation', 'Elbows stay at sides', 'Alternate arms or simultaneous'],
    note: null, yt: 'dumbbell hammer curl form'
  },
  'assisted chin-up (narrow grip)': {
    muscles: 'Lats · Biceps · Lower trapezius',
    cues: ['Palms facing you, hands shoulder-width', 'Start from dead hang, retract scapulae first', 'Pull chest toward bar', 'Lower fully — no half reps'],
    note: null, yt: 'assisted chin up form tutorial'
  },
  'barbell squat (power rack)': {
    muscles: 'Quadriceps · Glutes · Hamstrings · Core',
    cues: ['Bar on upper traps, not neck', 'Brace core like a punch is coming', 'Knees track over toes throughout', 'Descend to parallel, drive through heels'],
    note: '⚠ Spondylolisthesis: brace hard, avoid butt wink (pelvis tuck at bottom)', yt: 'barbell squat proper form spondylolisthesis safe'
  },
  'hack squat machine': {
    muscles: 'Quadriceps · Glutes',
    cues: ['Feet shoulder-width, toes slightly out', 'Back flat against pad throughout', 'Descend to 90°, push through full foot', 'Keep knees tracking over toes'],
    note: null, yt: 'hack squat machine form tutorial'
  },
  'seated leg press': {
    muscles: 'Quadriceps · Glutes · Hamstrings',
    cues: ['Feet shoulder-width, mid-platform', 'Lower until 90° knee bend — no more', 'Push through heels, not toes', 'Never lock knees at extension'],
    note: '⚠ Spondylolisthesis: keep lower back flat on pad — never let it peel off', yt: 'seated leg press form lower back safe'
  },
  'leg extension machine': {
    muscles: 'Quadriceps (all 4 heads)',
    cues: ['Shin pad just above ankle', 'Extend to full lockout, squeeze quads', 'Lower slowly — 3 seconds', 'No jerking the weight up'],
    note: null, yt: 'leg extension machine form'
  },
  'seated leg curl': {
    muscles: 'Hamstrings · Gastrocnemius',
    cues: ['Pad rests on lower calves', 'Curl fully — heels toward glutes', 'Squeeze hamstrings at peak contraction', 'Control return — 2–3 seconds'],
    note: null, yt: 'seated leg curl machine form'
  },
  'hip thrust machine': {
    muscles: 'Glutes (maximum activation) · Hamstrings',
    cues: ['Drive through heels, not toes', 'Squeeze glutes hard at top', 'Avoid hyperextending lower back at top', 'Keep chin tucked throughout'],
    note: '⚠ Spondylolisthesis: stop at neutral hip — no hyperextension', yt: 'hip thrust machine form glutes'
  },
  'inner / outer thigh machine': {
    muscles: 'Adductors (inner) · Abductors / TFL (outer)',
    cues: ['Slow controlled movement both directions', 'Keep torso upright, no leaning', 'Full range of motion each rep', 'Breathe out on exertion'],
    note: null, yt: 'inner outer thigh machine form'
  },
  'link hip abduction': {
    muscles: 'Gluteus medius · TFL · Hip abductors',
    cues: ['Stand tall, slight knee bend on stance leg', 'Lift leg to side — no hip hiking', 'Control the return slowly', 'Keep pelvis level throughout'],
    note: null, yt: 'cable hip abduction machine form'
  },
  'seated calf raise': {
    muscles: 'Soleus (deep calf) · Gastrocnemius',
    cues: ['Ball of foot on platform edge', 'Full stretch at bottom — feel the pull', 'Rise as high as possible, pause at top', 'Slow and controlled — calves respond to TUT'],
    note: null, yt: 'seated calf raise form tutorial'
  },
  'shoulder press machine': {
    muscles: 'Deltoids (anterior & medial) · Trapezius · Triceps',
    cues: ['Seat height: handles at shoulder level', 'Press to near-full extension — not locked out', 'Lower slowly to shoulder height', 'Keep lower back against pad'],
    note: '⚠ Left shoulder: use machine over free bar for safer path', yt: 'shoulder press machine form'
  },
  'standing lateral raise machine': {
    muscles: 'Medial deltoid · Supraspinatus',
    cues: ['Slight forward lean at hips', 'Lead with elbows, not wrists', 'Raise to shoulder height only — no higher', 'Slow on the way down'],
    note: '⚠ Left shoulder: reduce weight, stop if any pain', yt: 'lateral raise machine form medial deltoid'
  },
  'rear delt fly (pec fly machine)': {
    muscles: 'Posterior deltoid · Rhomboids · Mid-trapezius',
    cues: ['Arms start in front, move laterally back', 'Lead with elbows, slight bend maintained', 'Squeeze shoulder blades together at end', 'No jerking — strict controlled motion'],
    note: null, yt: 'rear delt fly pec deck machine form'
  },
  'dumbbell lateral raises': {
    muscles: 'Medial deltoid',
    cues: ['Slight elbow bend — "hugging a barrel"', 'Lead with pinky-side of hand', 'Raise to shoulder level only', 'Lower 3 seconds — the eccentric builds the muscle'],
    note: '⚠ Left shoulder: very light weight, stop at first sign of pain', yt: 'dumbbell lateral raise perfect form'
  },
  'abdominal machine (crunch)': {
    muscles: 'Rectus abdominis · Obliques',
    cues: ["Round the upper spine — don't just hip flex", 'Exhale hard at the crunch', 'Pause at full contraction', 'Slow return — keep tension on abs'],
    note: '⚠ Spondylolisthesis: machine guides ROM safely — avoid hip flexor dominance', yt: 'ab crunch machine form core'
  },
  'rotary torso machine': {
    muscles: 'Obliques · Transverse abdominis',
    cues: ['Rotate only to comfortable range', 'Keep hips square and still', 'Slow and controlled both ways', 'Breathe out on rotation'],
    note: '⚠ Spondylolisthesis: machine-guided rotation is safest — never twist aggressively', yt: 'rotary torso machine obliques form'
  },
  'leg raise (station)': {
    muscles: 'Lower rectus abdominis · Hip flexors',
    cues: ['Hang fully, brace core before lifting', 'Raise legs to 90° or as far as comfortable', "Lower slowly — don't just drop", 'Posterior pelvic tilt at the top activates lower abs'],
    note: '⚠ Spondylolisthesis: if lower back arches excessively, bend knees instead', yt: 'hanging leg raise form lower abs'
  },
  'back extension (bodyweight only)': {
    muscles: 'Erector spinae · Glutes · Hamstrings',
    cues: ['Bodyweight only — no added weight', 'Rise until body is straight — not hyperextended', 'Squeeze glutes at top', 'Lower slowly and controlled'],
    note: '⚠ Spondylolisthesis: STOP at neutral position — no extension beyond straight', yt: 'back extension machine safe form lower back'
  },
  'recumbent bike': {
    muscles: 'Cardiovascular · Quadriceps · Hamstrings',
    cues: ['Back fully supported throughout', 'Seat distance: slight knee bend at bottom', 'Moderate cadence 70–90 RPM', 'Zero spinal compression — ideal for back'],
    note: null, yt: 'recumbent bike proper form cardio'
  },
  'cross trainer': {
    muscles: 'Full body cardiovascular · Glutes · Quads · Core',
    cues: ['Arms active — push and pull', 'Upright posture, eyes forward', 'Resist the temptation to lean on handles', 'Smooth gliding motion — no jerking'],
    note: null, yt: 'elliptical cross trainer proper form'
  },
  'upright bike': {
    muscles: 'Cardiovascular · Quadriceps · Hamstrings · Glutes',
    cues: ['Seat height: near-full leg extension at bottom', 'Slight forward lean at higher efforts', 'Stay seated — especially for spondylolisthesis', 'Cadence 80–100 RPM on easy, 70–80 on hard'],
    note: null, yt: 'upright exercise bike proper form'
  },
};