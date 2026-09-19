# MetroAttend

> Enterprise Digital Workforce Verification & Attendance Management Platform

MetroAttend is a progressive web application (PWA) built for **MetroWorks Infrastructure Services** to streamline on-site staff attendance, geofence compliance, and workforce operations.

---

## 🌟 Key Features

### 📱 Staff PWA (iOS & Android)
- **High-Precision GPS Geofencing**: Validates that staff are physically within the official organizational premises (latitude: `5.706728`, longitude: `-0.298185`) before enabling check-in.
- **Progressive Web App (PWA)**:
  - Installable on **iOS (Safari)** with custom home screen icon (`apple-touch-icon.png`) and standalone display.
  - Installable on **Android (Chrome)** via native Web App Manifest (`manifest.json`) and automated install prompt.
  - Offline-ready with registered Service Worker (`sw.js`).
- **Profile Photo Upload**: Employees can capture or upload an avatar/photo directly on device.
- **Daily Shift Tracking**: Real-time morning check-in and end-of-day check-out recording.
- **Personal Log History**: View past attendance sessions with GPS verification badges and punctuality metrics.
- **Notifications & Bulletins**: Receive direct administrative alerts and agency-wide broadcast bulletins.

### 🛠 Administrative Console
- **Live Operations Dashboard**: Headcount metrics, real-time present/late/absent ratios, and category breakdowns (*Permanent Staff*, *National Service Personnel*, *Interns*, *Contract Staff*).
- **Attendance Records Management**: Real-time log filtering by date, department, and category, with status override capabilities and CSV export.
- **Staff Directory**: Add new personnel, toggle active/inactive status, edit staff details, or send direct notices.
- **Geofence Boundary Calibration**: Interactive GPS perimeter visualizer with center coordinate adjustments, radius sliders (`30m – 500m`), location presets, and distance simulator.
- **Broadcast Publisher**: Management broadcast console for distributing notices to all staff devices instantly.
- **Reports & Audit Analytics**: Department attendance comparisons, punctuality scores, date-range filters, and export to CSV or print-ready format.
- **Security & Integrity**: GPS anti-spoofing detection, single-device hardware lock, and administrator session controls.

---

## 🚀 Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4
- **Backend / Database**: Firebase Firestore, Firebase Authentication (with localStorage resilience fallback)
- **PWA**: Web App Manifest, Service Worker caching, iOS Apple Touch Icon, beforeinstallprompt handling

---

## 💻 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- pnpm or npm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Ramphic/MetroAttend.git

# Navigate to project directory
cd MetroAttend

# Install dependencies
pnpm install # or npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory (based on `.env.example`):
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=durattendance.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=durattendance
VITE_FIREBASE_STORAGE_BUCKET=durattendance.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=99884343146
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_ADMIN_EMAIL=admin@metroworks.gov.gh
```

### 4. Running Locally
```bash
# Start development server
pnpm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📱 Installing on Mobile

### iOS (Safari)
1. Open the app in Safari.
2. Tap the **Share** button (box with an upward arrow) at the bottom.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top right.

### Android (Chrome)
1. Open the app in Chrome.
2. Tap the **Install App** popup that appears automatically, or open the Chrome menu (three dots) and select **Install app** / **Add to Home screen**.

---

## 📄 License
Private & Confidential — MetroWorks Infrastructure Services. All rights reserved.
