# FitTrack v0.1 — Installation Guide
## FitPlace24 · Sapporo

---

## 📱 How to Install on Android Phone & Tablet

### Method 1 — Local Wi-Fi Server (Recommended)

1. Copy the entire **GymApp** folder to your computer
2. Install a simple local server — e.g. **Python** (most PCs have it):
   ```
   cd GymApp
   python3 -m http.server 8080
   ```
3. Find your computer's local IP (e.g. `192.168.1.10`)
4. On your Android phone/tablet, open **Chrome**
5. Navigate to: `http://192.168.1.10:8080`
6. Tap the **⋮ menu → "Add to Home Screen"**
7. Tap **Install** — the app icon appears on your home screen ✅

### Method 2 — Host on GitHub Pages (Free, no server needed)

1. Create a free account at [github.com](https://github.com)
2. Create a new repository called `fittrack`
3. Upload all files from the **GymApp** folder
4. Go to **Settings → Pages → Deploy from branch: main**
5. Your app URL: `https://YOUR_USERNAME.github.io/fittrack`
6. Open that URL in Chrome on Android
7. Tap **⋮ → Add to Home Screen**

### Method 3 — USB / ADB (Advanced)

Use Android File Transfer or adb push to copy files,
then serve with a local Android server app (e.g. **HTTP Server** from Play Store).

---

## 🏋️ App Features (v0.1)

- **5-Day Training Split** based on FitPlace24 Sapporo machines
- **D1** Chest + Triceps
- **D2** Back + Biceps  
- **D3** Legs + Glutes
- **D4** Shoulders + Abs & Core
- **D5** Full Body Power

Each day includes:
- 🔥 Warm-Up (10 min)
- 💪 Main Lifting (40 min)
- 🎯 Secondary Lifting (15–20 min)
- 🏃 Cardio (30 min)

### Workout Tracking
- ✅ Check off exercises as completed
- 📊 Log weight & reps for each set
- ⏱️ Built-in workout timer
- 😴 60-second rest timer between sets
- 🔥 Streak counter
- 📜 Full workout history
- 📤 Export data as JSON

### Offline Support
Once installed, the app works **fully offline** — no internet needed at the gym.

---

## 📁 File Structure
```
GymApp/
├── index.html       ← Main app
├── style.css        ← Styles & colors
├── app.js           ← App logic
├── data.js          ← Workout program data
├── manifest.json    ← PWA manifest (enables install)
├── sw.js            ← Service worker (offline)
├── INSTALL.md       ← This file
└── icons/
    ├── icon-192.png
    ├── icon-512.png
    ├── logo-main.png
    └── logo-small.png
```

---

## 🎨 Color Palette
| Usage | HEX |
|---|---|
| Background | `#071D5F` |
| Header / Main Buttons | `#6680CC` |
| Primary Accent (pink) | `#EB47CE` |
| Secondary Accent | `#DC96D0` |
| Primary Green | `#77FD01` |
| Secondary Green | `#BEFF89` |
