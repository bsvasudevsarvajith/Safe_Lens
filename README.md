# SafeRoute AI — AI-Powered Safe Route Navigation & Emergency SOS System

Production-ready, enterprise-grade pedestrian and transit security platform built with **React**, **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Firebase**.

SafeRoute AI ranks routes by **Physical Safety Score (0–100)** rather than merely shortest distance, protecting citizens by continuously factoring in real-time computer vision surveillance feeds, municipal security corridors, lighting lumen quality, and verified community threat reports.

---

## 🌟 Key Features

### 1. Multi-Route Generation Ranked by Safety Score
- Computes multiple transit corridors between origin and destination:
  - **Highest Safety Route**: Maximizes police-guarded safe corridors, verified CCTV coverage, and bright LED illumination (Score ~92–96).
  - **Balanced Main Road Route**: Major public avenues with steady pedestrian traffic and moderate surveillance (Score ~80–86).
  - **Fastest Direct Route**: Shortest geometric distance, which may navigate dim alleys or unmonitored sectors (Score ~60–70).
- Visual color grading: Emerald (Safe >85), Amber (Moderate 70–84), Orange (High Risk 50–69), Crimson Red (Critical Risk <50).

### 2. Dual Safety-Score Engine (`SafetyScoreEngine` Interface)
- Decoupled pluggable architecture switchable in 1 click from Admin Settings:
  - **Manual Grid Engine**: Evaluates admin-defined polygonal/radius safety zones, baseline road ratings, time-of-day lighting heuristics, and verified threat density.
  - **AI / CCTV Vision Engine**: Consumes multimodal CCTV camera telemetry (both image frames and video streams), computing human counts, pedestrian flow density, darkness/lumen levels, and anomaly flags.
  - **Hybrid Intelligence Engine**: Seamless blend of 60% real-time AI computer vision telemetry + 40% municipal historical grid & verified threat alerts.

### 3. Active Journey / Trip-in-Progress Screen
- Once a route is started:
  - Live, continuously updating **remaining distance** (km) and **remaining time** (mins).
  - Continuous journey **progress bar** (0% &rarr; 100%).
  - Real-time **Estimated Time of Arrival (ETA)**.
  - Turn-by-turn next waypoint navigation banner.
  - Simulation toggle ("Simulate Motion" vs "Live GPS Updates").
  - Persistent quick access to the **Emergency SOS button**.
  - **End Trip action** with safe arrival confirmation dialog and historical trip logging.

### 4. Emergency SOS Command Grid
- Instant satellite GPS fix with accuracy radius.
- One-click Google Maps shareable location link (`https://maps.google.com/?q=lat,lng`).
- Direct telephone dialer integration (`tel:`) for Police (`112` / `911`), Medical Ambulance (`108` / `911`), and trusted contacts.
- Real-time Firestore event logging dispatched to the Admin Command Center with audible/pulsing emergency alert.
- Automatic dispatch preview for up to 3 emergency contacts.

### 5. Verified User Threat Reporting
- Citizen reporting form: Category (lighting, harassment, suspicious activity, blocked path, animals), severity, description, GPS location, and proof photo.
- Multi-stage verification lifecycle: `pending` &rarr; `under_review` &rarr; `verified` / `rejected` &rarr; `resolved`.
- **Strict rule**: Only **verified** reports feed into routing safety score calculations.

### 6. User Profile & Security Integrity
- Personal details editing (name, phone, avatar) and password change flow.
- Emergency contacts manager (name, relationship, phone, auto-SMS toggle).
- Comprehensive activity history tabs: SOS events history, submitted threat reports with status pills, past completed trips.
- **Security constraint**: Users cannot edit their own `role` or `status` — these remain strictly admin-controlled and server-side validated.

### 7. Full Admin Command Center
- Live dynamic metrics: total users, active journeys, open SOS calls, verified threats, cameras online, city safety index.
- Emergency SOS Dispatcher: inspect callers, coordinates, and dispatch responders.
- Threat Reports Moderation: verify, reject, or mark hazards resolved.
- AI CCTV Manager: live camera stream inspect, on-demand AI computer vision inference (testing image snapshot or video clip).
- Municipal Safety Zones & Road Geofences creator.
- User RBAC management (`user`, `safety_moderator`, `admin`).
- Immutable system audit trail.

---

## 🏗️ Project Architecture

```
/
├── app/
│   ├── admin/               # Admin command center & dispatch
│   ├── api/
│   │   ├── cctv/analyze/    # AI vision inference endpoint (image/video)
│   │   ├── routes/          # Safety multi-route generation API
│   │   └── sos/             # Emergency SOS alert ingestion
│   ├── auth/
│   │   ├── login/           # Citizen sign in with 1-click persona switch
│   │   ├── register/        # Citizen registration
│   │   └── forgot-password/ # Account password recovery
│   ├── navigation/          # Start/dest picker, safety-ranked routes & map
│   ├── profile/             # Profile, contacts, SOS & trip history
│   ├── report/              # Community threat submission & live feed
│   ├── trip/                # Active journey live tracker with persistent SOS
│   ├── globals.css          # Styling & Leaflet styles
│   ├── layout.tsx           # Global root layout with persistent floating SOS
│   └── page.tsx             # Homepage hero, live city telemetry & quick links
├── components/
│   ├── map/
│   │   ├── LeafletMap.tsx   # Geospatial vector map with safety polylines
│   │   └── SafeRouteMap.tsx # SSR-safe dynamic wrapper
│   ├── sos/
│   │   ├── SOSButton.tsx    # Floating, inline, and compact SOS triggers
│   │   └── SOSModal.tsx     # Emergency modal with GPS link and tel dialer
│   └── ui/
│       ├── Navbar.tsx       # Navigation, persona switcher & profile link
│       └── Footer.tsx       # Helplines, engine status & security notice
├── firebase/
│   └── firestore.rules      # Production Firestore RBAC security rules
├── hooks/
│   ├── useActiveJourney.ts  # Trip tracker with continuous distance & ETA updates
│   ├── useAuth.tsx          # User profile, role verification & persona switcher
│   ├── useGeolocation.ts    # High-accuracy GPS location hook
│   └── useSOS.ts            # Emergency SOS trigger and broadcast hook
├── lib/
│   ├── engines/
│   │   └── safetyEngine.ts  # SafetyScoreEngine interface (Manual, AI CCTV, Hybrid)
│   └── mockData/
│       └── initialData.ts   # Seed cameras, zones, reports, and landmarks
├── services/
│   ├── aiCctvService.ts     # Multimodal AI vision analyzer (image & video)
│   ├── firebase/
│   │   ├── authService.ts   # Firebase Auth & local user directory
│   │   ├── firebaseClient.ts# Safe Firebase client initialization
│   │   └── firestoreService.ts # Real-time Firestore state and listeners
│   └── routingService.ts    # Multi-route generator ranked by safety score
├── types/
│   └── index.ts             # Complete TypeScript schemas and interfaces
├── .env.example             # Configuration variables template
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node v24 LTS)
- npm or pnpm

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Launch local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Environment Variables

All sensitive API keys and secrets are consumed via environment variables and never exposed to client-side bundles.

See `.env.example` for the complete list of options:
- **Map & Routing**: Google Maps Platform or Mapbox tokens.
- **AI & CCTV**: Google Gemini 1.5 Flash / Custom Vision endpoint.
- **Firebase**: Web Client config and Server-side Admin SDK credentials.
- **Emergency**: Custom local police and ambulance hotlines.

---

## ☁️ Deployment Guide

### Vercel
1. Push repository to GitHub.
2. Import project in Vercel.
3. Configure environment variables in Vercel Project Settings from your `.env.local`.
4. Deploy!

### Firebase Production Rules
Deploy the included `firebase/firestore.rules` via the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```
