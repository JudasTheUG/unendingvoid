# TASK SPECIFICATION FOR JULES: Modular Starship Builder & Multi-Language Localization

**Assignee:** Jules (Autonomous Coding Agent)  
**Project:** *Unending Void* (Sci-Fi TTRPG Virtual Tabletop)  
**Priority:** Highest / Core Feature  
**Status:** Ready for Implementation  
**Primary Locales:** English US (`en`), Turkish (`tr`), German (`de`)

---

## 1. Executive Summary

This task directs the architectural design and full implementation of two interconnected systems:
1. **Modular Starship Builder ("Starfield-lite"):** Transforms the Spaceship tab into a specialized engineering dock where ships are treated as composite objects assembled from 10 distinct module types. Includes a real-time equivalence and compatibility validation engine (power, mass vs engine thrust, fuel burn vs tank capacity, landing gear tonnage, structural requirements), a pre-defined out-of-the-box module catalog, and an integration with the **E.E.Sys Interstellar Marketplace** for ordering missing modules and assembling them into flight-ready vessels.
2. **Complete Multi-Language UI Localization (TR, EN, DE):** Establishes full localized text across every interactive element, button, HUD banner, roll notification, item catalog, and ship builder console for Turkish (TR), English US (EN), and German (DE).

---

## 2. System Architecture: Modular Ship Model

### 2.1 Composite Vessel Object Schema
A ship in *Unending Void* is not a flat set of hardcoded numbers, but a single composite vessel object composed of swappable modules:

```typescript
interface ShipVessel {
  id: string;                     // e.g. "ship_kusaragi"
  name: string;                   // Vessel registry name (editable)
  classType: string;              // e.g. "Strike Corvette", "Heavy Frigate"
  rarity: "Standard" | "Superior" | "Rare" | "Legendary";
  
  // Active Installed Module IDs (Foreign keys to the Catalog)
  modules: {
    hull: string;                 // Hull chassis & living quarters
    flightDeck: string;           // Cockpit / Command Bridge
    thrusterEngines: string;      // Propulsion & maneuvering thrusters
    warpDrive: string;            // FTL / Grav-Drive core
    cargoBay: string;             // Freight hold capacity
    fuelTanks: string;            // He-3 / Deuterium fuel capacity
    scanner: string;              // Sensor & target lock array
    landingSystems: string;       // Atmospheric landing gear & retro-skids
    weapon1: string;              // Primary Hardpoint
    weapon2: string;              // Secondary Hardpoint
    weapon3: string;              // Heavy Ordnance Silo / Launcher
  };

  // Dynamically Derived Vessel Attributes (Recalculated from modules)
  derivedStats: {
    totalMass: number;            // Sum of all module masses (in Metric Tons)
    maxHull: number;              // Structural integrity from Hull + Armor
    currentHull: number;
    maxShields: number;           // Energy deflector capacity
    currentShields: number;
    armorClass: number;           // AC (Base 10 + Hull Armor + Thruster Agility)
    subWarpSpeed: number;         // Tactical cruise speed in km/s
    jumpRange: number;            // FTL jump distance in Light-Years (LY)
    cargoCapacity: number;        // Total usable freight capacity (MT)
    reactorOutput: number;        // Total Megawatts (MW) generated
    totalPowerDraw: number;       // Total Megawatts (MW) consumed
    crewCapacity: number;         // Crew stations supported
    livingQuarters: {
      bedrooms: number;           // Crew sleeping quarters
      stations: string[];         // e.g. ["Weapon Station", "Medical Bay", "Workshop"]
    };
  };

  // Active Weapon Batteries (Hydrated from weapon1, weapon2, weapon3)
  weapons: ShipWeapon[];
}
```

---

## 3. The 10 Changable Module Slots

Every vessel has 10 dedicated module slots. Jules must enforce the following slot definitions:

| Slot Key | Slot Name (EN / TR / DE) | Primary Role & Stats Contributed |
| :--- | :--- | :--- |
| `hull` | Hull Frame<br>Gövde İskeleti<br>Rumpfstruktur | Base Structural HP, Reactor Output (MW), Mass (MT), Living Quarters (Bedrooms & Stations), Base Armor. |
| `flightDeck` | Flight Deck / Bridge<br>Uçuş Güvertesi<br>Flugdeck / Brücke | Crew Stations, Avionics to-hit bonus (+1 to +3), Sensor integration, Target tracking. |
| `thrusterEngines` | Thruster Engines<br>İtici Motorlar<br>Schubtriebwerke | Engine Thrust ($T$), Max Supported Mass ($M_{\max}$), Sub-Warp Speed modifier, Fuel Burn Rate per jump. |
| `warpDrive` | Warp Drive Core<br>Warp Sürücü Çekirdeği<br>Überlichtantrieb | FTL Class rating, Jump Distance Multiplier, Power Draw (MW). |
| `cargoBay` | Cargo Bay<br>Kargo Bölmesi<br>Frachtraum | Freight Capacity (MT), Tare Mass (MT), Shielded Contraband Hold (boolean). |
| `fuelTanks` | Fuel Tanks<br>Yakıt Tankları<br>Treibstofftanks | Fuel Volume (Liters of He-3), Loaded Weight (MT). |
| `scanner` | Scanning Components<br>Tarama Bileşenleri<br>Sensorsysteme | Detection Range (AU), Sensor Resolution, Target Lock bonus, Electronic Countermeasures. |
| `landingSystems` | Landing Systems<br>İniş Sistemleri<br>Landesysteme | Max Landing Mass rating (MT), Planetary descent stability, Shock absorption. |
| `weapon1` | Primary Hardpoint<br>Birincil Batarya<br>Primäre Waffenaufhängung | High-yield kinetic railguns, particle projectors, or heavy laser banks. |
| `weapon2` | Secondary Hardpoint<br>İkincil Batarya<br>Sekundäre Waffenaufhängung | Thermal beams, plasma lances, or rapid autocannons. |
| `weapon3` | Heavy Ordnance Silo<br>Ağır Mühimmat Silosu<br>Schwere Gefechtsstation | Proton torpedo launchers, anti-matter missile racks, or EMP disrupters. |

---

## 4. Equivalence & Compatibility Engine ("Starfield-lite")

To prevent impossible ship combinations (such as a colossal dreadnought hull powered by a scout ion scooter, or a massive military thruster with a micro fuel tank), Jules must implement a streamlined mathematical validation engine: `validateShipBuild(modules, catalog)`.

### 4.1 Compatibility Equations & Rules

1. **Mass vs. Engine Thrust Capacity:**
   $$\text{Total Mass} = \sum_{m \in \text{modules}} \text{Mass}(m)$$
   - **Fatal Constraint:** $\text{Total Mass} \le \text{Engine.maxThrustMass}$.
   - If violated $\rightarrow$ `CRITICAL_ERROR`: *"Engine underpowered: Installed thrusters can only propel up to {maxThrustMass} MT, but vessel mass is {totalMass} MT. Vessel cannot break planetary orbit or navigate sub-warp space."*
   - **Sub-Warp Speed Formula:**
     $$\text{Speed} = \text{Clamp}\left( \text{round}\left( \frac{\text{Engine.thrust}}{\text{Total Mass}} \times 50 \right), 10, 80 \right) \text{ km/s}$$

2. **Engine Burn Rate vs. Fuel Tank Capacity:**
   - High-performance engines consume more fuel per interstellar jump.
   - **Fatal Constraint:** $\text{FuelTank.fuelCapacity} \ge \text{Engine.fuelBurnRate} \times 2$.
   - If violated $\rightarrow$ `CRITICAL_ERROR`: *"Fuel tank too small for selected engines: {Engine.name} requires at least {minFuel}L per standard cruise, but fuel tank only holds {fuelCapacity}L."*
   - **Jump Range Formula:**
     $$\text{Jump Range} = \text{round}\left( \text{WarpDrive.jumpRating} \times \frac{\text{FuelTank.fuelCapacity}}{\text{Engine.fuelBurnRate}} \right) \text{ Light-Years}$$

3. **Landing Gear Capacity vs. Total Mass:**
   - Atmospheric landings subject structural gear to intense gravitational load.
   - **Fatal Constraint:** $\text{Total Mass} \le \text{LandingGear.maxLandingMass}$.
   - If violated $\rightarrow$ `CRITICAL_ERROR`: *"Landing Gear Overloaded: Landing systems rated for {maxLandingMass} MT, but vessel mass is {totalMass} MT. Hull will crush upon planetary touchdown."*

4. **Power Grid Balance (Reactor Output vs. Total Draw):**
   $$\text{Net Power} = \text{Hull.reactorOutput} - \sum \text{PowerDraw}(\text{Engines, Warp, Shields, Weapons, Scanners})$$
   - If $\text{Net Power} < 0 \rightarrow$ `WARNING_DEFICIT`: *"Power Grid Overload: Systems consume {totalDraw} MW but reactor generates {reactorOutput} MW. Brownouts will reduce weapon damage and shield recharge."*

5. **Diagnostic Status Output:**
   The validator returns:
   ```typescript
   interface BuildDiagnostic {
     isFlightReady: boolean;        // true if 0 critical errors
     errors: { slot: string; message: { en: string; tr: string; de: string } }[];
     warnings: { slot: string; message: { en: string; tr: string; de: string } }[];
     stats: DerivedVesselStats;
   }
   ```

---

## 5. Pre-Defined Out-of-the-Box Base Catalog

Jules must create `src/lib/shipModulesCatalog.js` providing concrete, production-ready modules for all 10 slots. This ensures future real data can be plugged in without additional code changes.

### 5.1 Concrete Modules Specification

#### A. Hull Frames (`hull`)
1. **Light Scout Frame (Class A):**
   - ID: `hull_scout_class_a`
   - Name: `{ en: "Starlight Scout Chassis", tr: "Yıldızışığı Keşif Gövdesi", de: "Sternenlicht-Aufklärer-Chassis" }`
   - Living Quarters: 1 Bedroom, 0 extra stations.
   - Stats: Mass: 40 MT, Hull HP: 100, Base Armor: 12, Reactor Output: 40 MW, Base Shields: 60.
   - Value: 400 Credits.
2. **Corvette Tactical Frame (Class B):**
   - ID: `hull_corvette_class_b`
   - Name: `{ en: "Vanguard Corvette Frame", tr: "Öncü Korvet Gövdesi", de: "Vorhut-Korvetten-Rumpf" }`
   - Living Quarters: 2 Bedrooms, Weapon Fire Station.
   - Stats: Mass: 90 MT, Hull HP: 180, Base Armor: 15, Reactor Output: 80 MW, Base Shields: 120.
   - Value: 950 Credits.
3. **Heavy Frigate Armored Frame (Class C):**
   - ID: `hull_frigate_class_c`
   - Name: `{ en: "Aegis Heavy Frigate Frame", tr: "Aegis Ağır Fırkateyn Gövdesi", de: "Aegis Schwerer Fregatten-Rumpf" }`
   - Living Quarters: 3 Bedrooms, Weapon Station, Medical Bay.
   - Stats: Mass: 210 MT, Hull HP: 320, Base Armor: 18, Reactor Output: 140 MW, Base Shields: 220.
   - Value: 2,200 Credits.

#### B. Flight Decks (`flightDeck`)
1. **Explorer Cockpit:** `{ id: "cockpit_explorer", name: { en: "Aero-Scan Pilot Cockpit", tr: "Hava-Tarama Pilot Kokpiti", de: "Aero-Scan Pilotencockpit" }, crew: 2, avionicsBonus: 1, mass: 15, powerDraw: 5, value: 220 }`
2. **Tactical Bridge:** `{ id: "cockpit_tactical", name: { en: "Combat Command Bridge", tr: "Muharebe Komuta Köprüsü", de: "Gefechts-Kommandobrücke" }, crew: 4, avionicsBonus: 2, mass: 30, powerDraw: 10, value: 550 }`

#### C. Thruster Engines (`thrusterEngines`)
1. **Light Ion Thrusters:** `{ id: "eng_ion_light", name: { en: "Ion-Vector Pulse Thrusters", tr: "İyon-Vektör İtici Motorlar", de: "Ionen-Vektor-Schubdüsen" }, thrust: 220, maxThrustMass: 140, fuelBurnRate: 15, mass: 25, powerDraw: 15, value: 320 }`
2. **Dual Heavy Plasma Thrusters:** `{ id: "eng_plasma_heavy", name: { en: "Twin Inferno Plasma Thrusters", tr: "Çift Cehennem Plazma Motorları", de: "Doppel-Inferno-Plasmadüsen" }, thrust: 480, maxThrustMass: 350, fuelBurnRate: 35, mass: 65, powerDraw: 30, value: 850 }`

#### D. Warp Drives (`warpDrive`)
1. **Class-1 Subspace Jumper:** `{ id: "warp_class_1", name: { en: "Subspace Warp Drive Mk I", tr: "Altuzay Warp Sürücüsü Mk I", de: "Subraum-Warpantrieb Mk I" }, jumpRating: 12, mass: 20, powerDraw: 15, value: 300 }`
2. **Class-3 Hyperdrive Core:** `{ id: "warp_class_3", name: { en: "Hyper-Graviton Warp Core", tr: "Hiper-Graviton Warp Çekirdeği", de: "Hyper-Graviton-Warpkern" }, jumpRating: 28, mass: 45, powerDraw: 30, value: 750 }`

#### E. Cargo Bays (`cargoBay`)
1. **Light Cargo Bay (40 MT):** `{ id: "cargo_light_40", name: { en: "Standard Pressurized Hold (40 MT)", tr: "Standart Basınçlı Bölme (40 MT)", de: "Standard-Druckfrachtraum (40 MT)" }, capacity: 40, mass: 15, value: 150 }`
2. **Reinforced Heavy Bay (120 MT):** `{ id: "cargo_heavy_120", name: { en: "Reinforced Armored Hold (120 MT)", tr: "Güçlendirilmiş Zırhlı Bölme (120 MT)", de: "Verstärkter Panzerfrachtraum (120 MT)" }, capacity: 120, mass: 45, isShielded: true, value: 450 }`

#### F. Fuel Tanks (`fuelTanks`)
1. **Cryo-Cell 60L:** `{ id: "fuel_cryo_60", name: { en: "He-3 Cryo-Cell (60L)", tr: "He-3 Kriyojenik Tank (60L)", de: "He-3 Kryo-Zelle (60L)" }, fuelCapacity: 60, mass: 12, value: 120 }`
2. **Super-Pressure 180L:** `{ id: "fuel_pressurized_180", name: { en: "Deep-Void Fuel Tank (180L)", tr: "Derin Uzay Yakıt Tankı (180L)", de: "Tiefenraum-Treibstofftank (180L)" }, fuelCapacity: 180, mass: 35, value: 380 }`

#### G. Scanning Components (`scanner`)
1. **Planetary Radar Array:** `{ id: "scan_radar_mk1", name: { en: "Broadband Radar Scanner", tr: "Genişbant Radar Tarayıcı", de: "Breitband-Radardetektor" }, rangeAU: 5, targetLock: 1, mass: 8, powerDraw: 5, value: 180 }`
2. **Subspace Sensor Grid:** `{ id: "scan_subspace_mk3", name: { en: "Subspace Quantum Scanner", tr: "Altuzay Kuantum Tarayıcı", de: "Subraum-Quantenscanner" }, rangeAU: 20, targetLock: 3, mass: 18, powerDraw: 12, value: 500 }`

#### H. Landing Systems (`landingSystems`)
1. **Light Struts (Max 120 MT):** `{ id: "gear_light_struts", name: { en: "Hydraulic Light Landing Struts", tr: "Hidrolik Hafif İniş Ayakları", de: "Hydraulische Leicht-Landestützen" }, maxLandingMass: 120, mass: 10, value: 140 }`
2. **Heavy Quad Pistons (Max 400 MT):** `{ id: "gear_heavy_pistons", name: { en: "Reinforced Quad-Piston Skids", tr: "Güçlendirilmiş Dört Pistonlu Kızaklar", de: "Verstärkte Vierkolben-Landekufen" }, maxLandingMass: 400, mass: 30, value: 420 }`

#### I. Weapons 1, 2, 3 (`weapon1`, `weapon2`, `weapon3`)
1. **Twin Gauss Railguns (Kinetic Battery):**
   - `{ id: "wpn_railgun_mk2", name: { en: "Twin Gauss Railguns", tr: "Çift Gauss Manyetik Raylı Top", de: "Doppel-Gauss-Schienengeschütz" }, type: "Kinetic Battery", toHit: 6, damageDice: "2d10", damageBonus: 4, damageType: "Kinetic", range: "2,000 / 8,000 km", mass: 20, powerDraw: 12, value: 500 }`
2. **Heavy Plasma Lance (Thermal Beam):**
   - `{ id: "wpn_plasma_lance", name: { en: "Heavy Plasma Lance", tr: "Ağır Plazma Mızrağı", de: "Schwere Plazmalanze" }, type: "Thermal Beam", toHit: 5, damageDice: "3d8", damageBonus: 3, damageType: "Thermal", range: "1,500 / 5,000 km", mass: 22, powerDraw: 15, value: 580 }`
3. **Proton Torpedo Silo (Heavy Ordnance):**
   - `{ id: "wpn_proton_torpedo", name: { en: "Proton Torpedo Silo", tr: "Proton Torpido Silosu", de: "Protonen-Torpedosilo" }, type: "Heavy Ordnance", toHit: 7, damageDice: "4d6", damageBonus: 2, damageType: "Explosive", range: "5,000 / 15,000 km", mass: 30, powerDraw: 8, value: 650 }`
4. **Disruptor Ion Cannon (Shield Stripper):**
   - `{ id: "wpn_ion_disruptor", name: { en: "Pulse Ion Disruptor", tr: "Darbeli İyon Bozucu", de: "Puls-Ionen-Disruptor" }, type: "Ion Energy", toHit: 6, damageDice: "2d12", damageBonus: 2, damageType: "Ion", range: "1,000 / 4,000 km", mass: 18, powerDraw: 14, value: 520 }`

---

## 6. Ship Builder UI & E.E.Sys Procurement Pipeline

### 6.1 User Experience Flow in Ship Tab
1. In `SpaceshipSheet.jsx`, add a mode selector:
   - **Tactical Flight Deck** (Current view: vitals, weapon attack/damage triggers with right-click modifiers, active shield recharge, nano-repairs).
   - **Drydock Ship Builder** (The new Starfield-lite module engineering interface).
2. **Ship Builder Interface Design:**
   - **Vessel Wireframe Blueprint:** Visual grid displaying the 10 module slots with their current equipped component.
   - **Slot Details & Swap Selector:** Clicking any slot displays all compatible modules from `shipModulesCatalog.js`. Shows real-time delta stats: e.g. `Hull HP: +40`, `Mass: +15 MT`, `Speed: -4 km/s`.
   - **Flight Diagnostic HUD:** Real-time visual meters for:
     - ⚖️ *Mass vs Thrust* (Progress bar with danger zone if overloaded).
     - ⛽ *Fuel vs Engine Burn* (Jump range calculator).
     - 🦿 *Landing Gear Rating* (Total Mass vs Max Landing Mass).
     - ⚡ *Reactor Power Balance* (Generated MW vs Drawn MW).
   - **Validation Badge:**
     - 🟢 **FLIGHT CERTIFIED** (All equations satisfied).
     - 🔴 **SYSTEM FLIGHT ERRORS** (Lists specific error in active language).

### 6.2 E.E.Sys Marketplace Order & Assembly
- If player designs a blueprint with modules they **do not own**:
  - The UI calculates total credits required for the unowned parts.
  - Displays button: **"Order Parts via E.E.Sys ({totalCost} Credits)"**.
  - Requires **Equivalent Exchange Membership** (checks `inventoryItems` for `item_ee_membership`).
  - Deducts player credits and registers parts in inventory/hangar.
- When all parts are owned:
  - Displays button: **"Assemble & Certify Vessel"**.
  - Clicking installs the modules, permanently updates `ship.modules` and recalculates `ship.maxHull`, `ship.maxShields`, `ship.subWarpSpeed`, `ship.armorClass`, `ship.cargoCapacity`, and `ship.weapons`.

---

## 7. Multi-Language Localization Mandate (TR, EN, DE)

All text, labels, buttons, error messages, and descriptions across the entire project must strictly adhere to the localization rule:

### 7.1 Language Identifiers
- **English (US):** `en` (Flag: `🇺🇸`)
- **Turkish (TR):** `tr` (Flag: `🇹🇷`)
- **German (DE):** `de` (Flag: `🇩🇪`)

### 7.2 Core Dictionaries (`src/locales/{en,tr,de}/common.json`)
Jules must expand the dictionaries so no screen renders raw hardcoded strings. This includes:
- Navigation tabs: Operative Sheet, Ship Console / Builder, E.E.Sys Marketplace.
- Dice roll banners, context menu options ("Normal", "Advantage", "Disadvantage", "Critical Hit").
- Character vitals, ability scores, inventory action buttons ("Equip", "Drop", "Inspect").
- Ship module slot names, diagnostic errors, repair/recharge buttons.
- Marketplace buy/sell confirmation modals and membership alerts.

---

## 8. Implementation Steps & Acceptance Criteria for Jules

### Implementation Steps:
1. **Create `src/lib/shipModulesCatalog.js`:**
   - Define catalog arrays for all 10 module types with stats, prices, and `{ en, tr, de }` titles and descriptions.
2. **Create `src/lib/shipValidation.js`:**
   - Implement `calculateShipDerivedStats(modules, catalog)` and `validateShipBuild(modules, catalog)`.
   - Write comprehensive unit tests in `src/lib/__tests__/shipValidation.test.js` verifying:
     - Overweight hull exceeds light engine thrust $\rightarrow$ returns critical error.
     - Heavy engine with micro fuel tank $\rightarrow$ returns critical error.
     - Overweight ship exceeds landing gear limit $\rightarrow$ returns critical error.
     - Valid ship setup returns `isFlightReady: true` with correct derived HP, Shields, Speed, and Jump Range.
3. **Build `src/components/player/ShipBuilder.jsx`:**
   - Implement the interactive visual drydock schematic, module slot selector, diagnostic bars, and delta stat comparisons.
   - Connect to E.E.Sys purchasing flow and vessel assembly.
4. **Integrate into `src/components/player/SpaceshipSheet.jsx`:**
   - Provide seamless toggle between Tactical Flight Deck and Drydock Builder.
   - Ensure weapon rolls and vitals reflect the newly assembled configuration.
5. **Localization Sweep:**
   - Verify every UI element adapts immediately upon clicking `🇺🇸 EN`, `🇹🇷 TR`, or `🇩🇪 DE` in `LanguageSwitcher.jsx`.
6. **Verify Test Suite & Build:**
   - Run `npm test` ensuring 100% test pass rate.
   - Run `npm run build` ensuring clean Vite compilation.

---

## 9. Deliverables Checkoff for Jules
- [ ] `src/lib/shipModulesCatalog.js` created with concrete options for all 10 slots.
- [ ] `src/lib/shipValidation.js` implemented with Starfield-lite math rules.
- [ ] `src/lib/__tests__/shipValidation.test.js` created and passing all test cases.
- [ ] `src/components/player/ShipBuilder.jsx` interactive engineering drydock created.
- [ ] Spaceship tab seamlessly updates ship HP, shields, AC, speed, cargo, and weapons upon assembly.
- [ ] E.E.Sys ordering integrated for unowned ship parts.
- [ ] Multi-language support verified in English (US), Turkish (TR), and German (DE).
- [ ] `npm test` passing with zero regressions.
