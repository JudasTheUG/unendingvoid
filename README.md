# 🌌 UNENDING VOID — Virtual Tabletop (VTT)

[![Version](https://img.shields.io/badge/version-1.0.0-00F0FF?style=for-the-badge)](https://unendingvoid-app.web.app)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%7C%20Auth%20%7C%20Hosting-FFA611?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![Vitest](https://img.shields.io/badge/Tests-117%20Passed-10B981?style=for-the-badge&logo=vitest)](https://vitest.dev)
[![Localization](https://img.shields.io/badge/Locales-EN%20%7C%20TR%20%7C%20DE-A855F7?style=for-the-badge)](src/locales)

> **Unending Void** is a high-octane, cyberpunk/hard-sci-fi Virtual Tabletop (VTT) built for gritty space opera tabletop roleplaying games (*The Expanse* meets *Cyberpunk 2020 / RED* with customized D&D 5e mechanics). Designed with high-contrast cybernetic HUD aesthetics, real-time multiplayer Firestore sync, canvas physics 3D dice, a modular starship refit yard, corporate naval shipyards, a 3-tier synthesis marketplace, and full tri-lingual localization (`en`, `tr`, `de`).

---

## 📑 Table of Contents

- [🌌 Lore & Setting](#-lore--setting)
- [⚡ Key Features](#-key-features)
  - [1. Operative Dossier (Player Sheet)](#1-operative-dossier-player-sheet)
  - [2. Spaceship Operations Deck & Naval Shipyard](#2-spaceship-operations-deck--naval-shipyard)
  - [3. E.E.Sys (Equivalent Exchange System) Marketplace](#3-eesys-equivalent-exchange-system-marketplace)
  - [4. TAC-COMMS Broadcast Network & Live Ledger](#4-tac-comms-broadcast-network--live-ledger)
  - [5. DM Tactical Command Deck (DM Panel)](#5-dm-tactical-command-deck-dm-panel)
  - [6. 3D Canvas Physics Dice HUD](#6-3d-canvas-physics-dice-hud)
  - [7. Tri-Lingual Real-Time Localization](#7-tri-lingual-real-time-localization)
  - [8. Local & Cloud Authentication with Registration Validation](#8-local--cloud-authentication-with-registration-validation)
- [🛠️ Tech Stack & Architecture](#️-tech-stack--architecture)
- [📋 User Pre-Flight Prerequisites](#-user-pre-flight-prerequisites)
- [🚀 Quickstart & Local Setup](#-quickstart--local-setup)
- [🧪 Automated Unit Testing](#-automated-unit-testing)
- [🌐 Production Deployment](#-production-deployment)
- [📂 Project Directory Structure](#-project-directory-structure)
- [🛡️ Security & Firestore Rules](#️-security--firestore-rules)

---

## 🌌 Lore & Setting

In the 26th Century, human civilization fractured across the asteroid belts, sovereign mega-corporations, and hollowed-out moons. Deep space is lethal, oxygen is privatized, and only operatives equipped with cybernetic augments, hardened starships, and the **E.E.Sys** (Equivalent Exchange System) can survive the treacherous outer void.

Whether tracking bounties through corporate space stations, commanding combat frigates in hyper-velocity dogfights, or scavenging raw components from decommissioned derelicts, **Unending Void** provides the digital cockpit for players and Game Masters alike.

---

## ⚡ Key Features

### 1. Operative Dossier (Player Sheet)
- **D&D Beyond 2-Column Responsive Layout**: Streamlined tactical navigation inspired by modern digital character sheets.
- **Cybernetic Vital Signs**: Dynamic gauges for **Hit Points (HP)**, **Nano-Shields**, **Mental Stress**, and **Temp Shields**, including hit die expending, rests, and level tracking.
- **D&D-Derived Ability Scores & Skills**: STR, DEX, CON, INT, WIS, CHA with instant modifier calculations, proficiency bonus scaling, and saving throw modifiers.
- **Tactical Actions Tab**: Melee, ranged, cybernetic overclocks, and special maneuvers with one-click d20 rolls.
- **Multi-Character Management**: Create multiple operatives per account, switch between characters on the fly, and delete decommissioned operatives.
- **Full Inventory & Cyberware**: Track credits, equipment weight, cybernetic implant slots, and trait modifiers.

### 2. Spaceship Operations Deck & Naval Shipyard
- **Dynamic Ship Berth**: If an operative doesn't own a ship, the tab dynamically reads `Your Ship` / `Gemin` / `Dein Schiff` and directs them to the Naval Shipyard.
- **Naval Shipyard**: Browse and commission state-of-the-art starships from corporate shipbuilders:
  - *Void Skiff* (Light courier / reconnaissance)
  - *Stealth Corsair* (Electronic warfare & boarding vessel)
  - *Heavy Frigate* (Armored combat escort)
  - *Dreadnought* (Capital assault warship)
- **Drydock Refit Bay**:
  - Modular modification for owned ships only.
  - Equip engines, reactors, shield generators, and plasma hardpoints.
  - Real-time engineering validation: **Reactor Grid Balance** (Power Supply vs. Power Drain) and **Mass vs. Thrust Ratio**.
- **DM Ship Commissioning**: The DM can directly assign or revoke starships from operatives via the DM Command Deck.

### 3. E.E.Sys (Equivalent Exchange System) Marketplace
- **3-Tier Material Synthesis Engine**:
  - **Tier 1 — Sovereign Blueprint Assembly**: If you own the raw components AND the blueprint design, fabricate the item for **0 ₡**.
  - **Tier 2 — Licensed Fabrication**: If you own the components but lack the design, pay a one-time licensing royalty fee to fabricate.
  - **Tier 3 — Direct Credit Requisition**: Lack materials and designs? Instantly requisition the item by paying market credit price.
- **Raw Materials Depot**: Purchase components directly (Graphene Plates, Superconductor Coils, Neural Wiring, Graviton Matrix, etc.).
- **E.E.Sys Membership System**: Track corporate syndicate tier status (Standard, Executive, Void Syndicate) with auto-renewing perks and market discounts.

### 4. TAC-COMMS Broadcast Network & Live Ledger
- **Live DM Intel Transmissions**: Direct broadcast alerts sent to all active operatives in a campaign.
- **Resilient Media Viewer**: Intel broadcasts support direct image URLs and Pinterest pins via an automatic image proxy resolver fallback.
- **Live Dice & Combat Ledger**: Every operative's roll is synchronized in real time across the campaign.
- **DM Privacy Cloak**: DM rolls can be marked as secret (cloaked from players) while remaining visible to the DM.

### 5. DM Tactical Command Deck (DM Panel)
- **Real-Time Combat Encounter Tracker**: Track enemy and player initiatives, HP/shield states, status effects, and round counts.
- **Synchronized "Request Initiative" Protocol**: Trigger an initiative check that broadcasts to all operatives; track roll arrivals with real-time state change from *"Awaiting Operatives"* to *"All Operatives Ready"*.
- **Operative & Ship Management**: Inspect live operative sheets, adjust vital stats, assign starships, or dismiss operatives from the campaign.
- **Campaign Administration**: Generate invite codes, configure rule presets, or decommission/delete entire campaigns with cascade cleanups.

### 6. 3D Canvas Physics Dice HUD
- **High-Performance 3D Wireframe Canvas**: Pure mathematical 3D isometric projection rendering d4, d6, d8, d10, d12, d20, and d100 percentile dice.
- **Visual Depth & Shading**: Dynamic face polygon rendering, neon specular lighting, edge highlights, and wireframe depth.
- **Leeroy Jenkins Emergency Popup**: Instant high-stakes initiative roll modal with synchronized dice values that seamlessly send results to the DM.
- **Docked HUD & Responsive Floating Window**: Collapsible bottom dice bar with tactile modifier buttons and quick-action presets.

### 7. Tri-Lingual Real-Time Localization
- **Zero Hardcoded Strings**: Every single string is localized across three core locales:
  - 🇺🇸 **English (`en`)**
  - 🇹🇷 **Turkish (`tr`)**
  - 🇩🇪 **German (`de`)**
- **Instant Hot-Switching**: Switch languages anytime using the floating language toggle without page reloads.

### 8. Local & Cloud Authentication with Registration Validation
- **Complete Registration Flow**: New operatives register with **Username**, **Email**, **Password**, and optional **Callsign / Display Name**.
- **Email Format Validation**: Strict RFC-compliant regex validation prevents malformed emails and displays localized error feedback.
- **Username Uniqueness Control**: Enforces uniqueness across Cloud Firestore (`/usernames/{username}`) and local browser storage (`unendingvoid_local_accounts`). Includes live on-blur availability indicators.
- **Dual Login Capability**: Returning operatives can log in using **either** their chosen Username OR their Email Address.
- **Offline / Local Fallback**: Seamless automatic fallback to local accounts when offline or testing without cloud connectivity.
- **Quick Local Guest Access**: Instant one-click guest authentication that bypasses forms and immediately launches into the tactical dashboard.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | **React 19** + **Vite 6** (ES Modules, HMR, Fast Refresh) |
| **Styling & Aesthetics** | **Tailwind CSS v4** (Modern `@theme` variables, cyberpunk color palette) |
| **Backend & Real-Time Sync**| **Google Cloud Firestore** (Real-time snapshots, offline persistence) |
| **User Authentication** | **Local Storage Engine + Firebase Auth** (Username/Email, Password, Uniqueness Control, Guest Access) |
| **Hosting & CDN** | **Firebase Hosting** (HTTP/2 edge distribution, SPA URL rewrite rules) |
| **Localization (i18n)** | **i18next** + **react-i18next** + **i18next-browser-languagedetector** |
| **Icons & Effects** | **Lucide React** (HUD icons), **Canvas Confetti** (Critical roll celebrations) |
| **Testing Suite** | **Vitest 5** + **@testing-library/react** + **jest-dom** (117 unit tests) |

---

## 📋 User Pre-Flight Prerequisites

Before setting up or cloning the repository, the following environment prerequisites must be prepared:

1. **Node.js LTS (v20 or higher)**:
   - Verify with: `node -v` (should report `v20.x.x` or higher)
   - Verify with: `npm -v` (should report `v10.x.x` or higher)
2. **Git**:
   - Verify with: `git --version`
3. **Firebase Account & Console Project**:
   - Go to [Firebase Console](https://console.firebase.google.com).
   - Create a project (e.g. `unendingvoid-app`).
   - Enable **Firebase Authentication** with providers:
     - *Email / Password* (Enabled)
     - *Anonymous* (Enabled for quick guest testing)
   - Enable **Cloud Firestore Database** (start in Test Mode or Production Mode in your preferred region).
4. **Firebase CLI**:
   - Install globally: `npm install -g firebase-tools`
   - Authenticate your machine: `firebase login`

---

## 🚀 Quickstart & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/JudasTheUG/unendingvoid.git
cd unendingvoid
```

### 2. Configure Environment Variables
Copy the template to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Firebase Web App configuration keys from the Firebase Console (*Project Settings -> General -> Web Apps*):
```ini
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=unendingvoid-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=unendingvoid-app
VITE_FIREBASE_STORAGE_BUCKET=unendingvoid-app.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Local Development Server
```bash
npm run dev
```
The application will be live at `http://localhost:5173`.

### 5. Run Firebase Local Emulators (Optional)
For offline local development without touching production Firestore:
```bash
firebase emulators:start
```
- **Auth Emulator**: `http://localhost:9099`
- **Firestore Emulator**: `http://localhost:8080`
- **Emulator UI Suite**: `http://localhost:4000`

---

## 🧪 Automated Unit Testing

The project maintains a 100% pass rate across 15 test suites and 98 test cases covering math calculation, game logic, ship grid balance, and UI components.

```bash
# Run test suite once
npm test

# Run tests in watch mode
npx vitest

# Run tests with HTML reporting
npm run test:report
```

### Test Coverage Highlights:
- `src/lib/__tests__/initiativeCalculator.test.js`: Initiative modifier math and roll ordering.
- `src/lib/__tests__/shipValidation.test.js`: Starship reactor overload detection and mass-to-thrust calculations.
- `src/lib/__tests__/diceModifiers.test.js`: Trait bonuses and roll adjustments.
- `src/lib/__tests__/campaignActions.test.js`: Campaign deletion, character assignment/removal.
- `src/lib/__tests__/playerActions.test.js`: Vitals damage, rest recovery, credit calculations.
- `src/lib/__tests__/i18n.test.js`: Tri-lingual key completeness and fallback validation.
- `src/components/__tests__/CombatAndInitiative.test.jsx`: Combat tracker state transitions.
- `src/components/__tests__/ShipAssignmentAndShipyard.test.jsx`: Starship purchasing and assignment modal.
- `src/components/__tests__/RollContextMenuAndEESys.test.jsx`: 3-tier synthesis validation.

---

## 🌐 Production Deployment

### 1. Build the Production Bundle
```bash
npm run build
```
Vite outputs the optimized, code-split production bundle to the `dist/` directory.

### 2. Deploy to Firebase Hosting & Firestore
```bash
firebase deploy
```
Or deploy individual targets:
```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only security rules
firebase deploy --only firestore:rules
```

Live Production Site: **[https://unendingvoid-app.web.app](https://unendingvoid-app.web.app)**

---

## 📂 Project Directory Structure

```text
unendingvoid/
├── .firebaserc                     # Firebase active project configuration
├── firebase.json                   # Firebase Hosting, Firestore, and Emulator routing
├── firestore.rules                 # Production Firestore security and access rules
├── index.html                      # Single Page Application HTML entry point
├── package.json                    # Project dependencies and npm scripts
├── plan.md                         # Parametric AI Agent Replication Blueprint
├── vite.config.js                  # Vite bundler, React, and Tailwind config
├── public/                         # Static web assets
├── scripts/
│   ├── seed-emulator.js            # Firestore seed data for local emulators
│   └── test-and-report.js          # Vitest execution and automated QA reporting
└── src/
    ├── App.jsx                     # Root application container with LanguageSwitcher
    ├── index.css                   # Core design tokens, cyber-glow utilities, scrollbars
    ├── main.jsx                    # React 19 bootstrap mount
    ├── router.jsx                  # React Router routes and protected paths
    ├── components/
    │   ├── dice/
    │   │   └── DiceOverlay.jsx     # 3D Canvas Physics Dice Engine & Leeroy Jenkins modal
    │   ├── dm/
    │   │   ├── CombatTracker.jsx   # Tactical turn order & initiative synchronization
    │   │   ├── IntelBroadcaster.jsx# DM broadcast composer with media previews
    │   │   ├── ItemSpawner.jsx     # Spawns items directly into operative inventories
    │   │   ├── PlayerRoster.jsx    # Campaign operative list & character dismissal
    │   │   ├── ShipAssignmentModal.jsx # Assign ships to campaign players
    │   │   ├── StatOverrideForm.jsx# Live stat tweaking for DM overrides
    │   │   └── TraitAssigner.jsx   # DM trait grants and cyberware perks
    │   ├── market/
    │   │   └── EESysMarketplace.jsx# 3-tier synthesis crafting engine & raw materials
    │   ├── player/
    │   │   ├── DnDAbilitySidebar.jsx   # Ability scores, saving throws, passive senses
    │   │   ├── DnDActionsTab.jsx       # Tactical combat actions and weapon strikes
    │   │   ├── DnDCharacterHeader.jsx  # Operative identity, level, rest controls
    │   │   ├── InitiativeRollModal.jsx # Individual operative initiative prompt
    │   │   ├── InventoryList.jsx       # Equipment list, weight limits, credit balance
    │   │   ├── NavalShipyard.jsx       # Corporate shipyard catalogue (4 hulls)
    │   │   ├── PlayerNotesTab.jsx      # Personal operative mission logbook
    │   │   ├── ShipBuilder.jsx         # Modular drydock refit bay for owned vessels
    │   │   ├── SpaceshipCard.jsx       # Compact spaceship status card
    │   │   ├── SpaceshipSheet.jsx      # Starship Bridge, Drydock, and Naval Shipyard tabs
    │   │   ├── StatsGrid.jsx           # Core attributes display
    │   │   ├── TraitsList.jsx          # Cyberware implants, traits, and feats
    │   │   └── VitalsPanel.jsx         # HP, Nano-Shields, Stress, and Temp HP gauges
    │   └── shared/
    │       ├── CreditCounter.jsx       # Glowing credit currency counter
    │       ├── DMIntelBroadcast.jsx    # TAC-COMMS broadcast channel & dice history
    │       ├── ErrorBoundary.jsx       # Crash containment with cyberpunk recovery UI
    │       ├── ItemCard.jsx            # Standardized inventory item presentation
    │       ├── LanguageSwitcher.jsx    # Instant tri-lingual hot-switcher (EN / TR / DE)
    │       ├── LoadingSpinner.jsx      # Holographic loading indicator
    │       ├── RollContextMenu.jsx     # Contextual roll launcher (Advantage / Disadvantage)
    │       ├── StatBlock.jsx           # Monospace HUD stat block
    │       ├── TraitBadge.jsx          # Tagged cyberware/trait badge
    │       └── VitalBar.jsx            # Animated HUD bar with color shifts
    ├── hooks/
    │   ├── useAuth.jsx                 # Firebase authentication state and guest auth
    │   ├── useCollection.js            # Real-time Firestore collection listener
    │   ├── useDiceSync.js              # Real-time dice roll broadcast hook
    │   └── usePlayerData.js            # Active operative profile and inventory sync
    ├── lib/
    │   ├── authService.js              # Sign in, sign up, anonymous session management
    │   ├── campaignActions.js          # Campaign join, leave, delete, and roster actions
    │   ├── diceModifiers.js            # Bonus math and advantage calculations
    │   ├── firebase.js                 # Firebase App, Auth, and Firestore bindings
    │   ├── i18n.js                     # i18next initialization and language detector
    │   ├── initiativeCalculator.js     # Initiative ordering and tie-breaker algorithms
    │   ├── playerActions.js            # Rest, damage, heal, and character deletion actions
    │   ├── shipModulesCatalog.js       # Ship hardpoint modules (reactors, shields, weapons)
    │   ├── shipValidation.js           # Reactor grid balance and thrust-to-mass algorithms
    │   └── shipyardCatalog.js          # Pre-fabricated corporate starship hulls
    └── locales/
        ├── de/common.json              # German translation catalogue
        ├── en/common.json              # English translation catalogue
        └── tr/common.json              # Turkish translation catalogue
```

---

## 🛡️ Security & Firestore Rules

Production security rules are located in `firestore.rules`:
- `/players/{characterId}`: Read, update, and delete access granted to authenticated operatives.
- `/campaigns/{campaignId}`: Read, update, and delete access granted to authenticated players/DMs.
- `/items/{itemId}` and `/traits/{traitId}`: Authenticated catalog access.
- `/rolls/{rollId}`: Real-time append-only stream (`allow read, create: if true; allow update, delete: if false`).
- `/broadcasts/{broadcastId}`: Real-time broadcast channel for campaign tactical updates.

---

## 📜 License & Acknowledgments

Built for tabletop roleplaying enthusiasts, sci-fi game masters, and cyberpunk operatives across the galaxy. Inspired by the tactical depths of *The Expanse RPG*, *Cyberpunk 2020 / RED*, and *Dungeons & Dragons 5e*.
