import { shipModulesCatalog } from './shipModulesCatalog.js';

export function calculateShipDerivedStats(modules, catalog) {
  // Extract installed module specs from catalog based on IDs in `modules`
  const getModule = (slot, id) => {
    if (slot === 'weapon1' || slot === 'weapon2' || slot === 'weapon3') {
      return catalog.weapons.find(w => w.id === id) || catalog.weapons[0];
    }
    return catalog[slot].find(m => m.id === id) || null;
  };

  const hull = getModule('hull', modules.hull);
  const flightDeck = getModule('flightDeck', modules.flightDeck);
  const thrusterEngines = getModule('thrusterEngines', modules.thrusterEngines);
  const warpDrive = getModule('warpDrive', modules.warpDrive);
  const cargoBay = getModule('cargoBay', modules.cargoBay);
  const fuelTanks = getModule('fuelTanks', modules.fuelTanks);
  const scanner = getModule('scanner', modules.scanner);
  const landingSystems = getModule('landingSystems', modules.landingSystems);
  const weapon1 = getModule('weapon1', modules.weapon1);
  const weapon2 = getModule('weapon2', modules.weapon2);
  const weapon3 = getModule('weapon3', modules.weapon3);

  // Default to empty objects if missing to avoid crashes
  const mods = {
    hull: hull || { mass: 0, hullHP: 0, baseArmor: 0, reactorOutput: 0, baseShields: 0, livingQuarters: { bedrooms: 0, stations: [] } },
    flightDeck: flightDeck || { mass: 0, powerDraw: 0, crew: 0 },
    thrusterEngines: thrusterEngines || { mass: 0, powerDraw: 0, thrust: 0, fuelBurnRate: 0, maxThrustMass: 0 },
    warpDrive: warpDrive || { mass: 0, powerDraw: 0, jumpRating: 0 },
    cargoBay: cargoBay || { mass: 0, capacity: 0 },
    fuelTanks: fuelTanks || { mass: 0, fuelCapacity: 0 },
    scanner: scanner || { mass: 0, powerDraw: 0 },
    landingSystems: landingSystems || { mass: 0, maxLandingMass: 0 },
    weapon1: weapon1 || { mass: 0, powerDraw: 0 },
    weapon2: weapon2 || { mass: 0, powerDraw: 0 },
    weapon3: weapon3 || { mass: 0, powerDraw: 0 },
  };

  const totalMass = Object.values(mods).reduce((acc, mod) => acc + (mod.mass || 0), 0);
  
  const totalPowerDraw = 
    mods.flightDeck.powerDraw + 
    mods.thrusterEngines.powerDraw + 
    mods.warpDrive.powerDraw + 
    mods.scanner.powerDraw + 
    mods.weapon1.powerDraw + 
    mods.weapon2.powerDraw + 
    mods.weapon3.powerDraw;

  const reactorOutput = mods.hull.reactorOutput;
  const maxHull = mods.hull.hullHP;
  const maxShields = mods.hull.baseShields;
  
  // ArmorClass (Base 10 + Hull Armor + Thruster Agility)
  // Let's assume thruster agility is derived or just use Hull Armor
  // The document says: Base 10 + Hull Armor + Thruster Agility
  // It doesn't define Thruster Agility, let's use 0 for now.
  const armorClass = 10 + mods.hull.baseArmor;
  
  // Sub-Warp Speed Formula: Speed = Clamp( round( (Engine.thrust / Total Mass) * 50 ), 10, 80 ) km/s
  let subWarpSpeed = 0;
  if (totalMass > 0) {
    subWarpSpeed = Math.round((mods.thrusterEngines.thrust / totalMass) * 50);
    subWarpSpeed = Math.max(10, Math.min(80, subWarpSpeed));
  }

  // Jump Range Formula: Jump Range = round( WarpDrive.jumpRating * (FuelTank.fuelCapacity / Engine.fuelBurnRate) ) Light-Years
  let jumpRange = 0;
  if (mods.thrusterEngines.fuelBurnRate > 0) {
    jumpRange = Math.round(mods.warpDrive.jumpRating * (mods.fuelTanks.fuelCapacity / mods.thrusterEngines.fuelBurnRate));
  }

  return {
    totalMass,
    maxHull,
    currentHull: maxHull,
    maxShields,
    currentShields: maxShields,
    armorClass,
    subWarpSpeed,
    jumpRange,
    cargoCapacity: mods.cargoBay.capacity,
    reactorOutput,
    totalPowerDraw,
    crewCapacity: mods.flightDeck.crew,
    livingQuarters: mods.hull.livingQuarters,
    weapons: [mods.weapon1, mods.weapon2, mods.weapon3].filter(w => w.id && w.id !== 'wpn_none')
  };
}

export function validateShipBuild(modules, catalog) {
  const getModule = (slot, id) => {
    if (slot === 'weapon1' || slot === 'weapon2' || slot === 'weapon3') {
      return catalog.weapons.find(w => w.id === id) || catalog.weapons[0];
    }
    return catalog[slot].find(m => m.id === id);
  };

  const mods = {
    hull: getModule('hull', modules.hull),
    flightDeck: getModule('flightDeck', modules.flightDeck),
    thrusterEngines: getModule('thrusterEngines', modules.thrusterEngines),
    warpDrive: getModule('warpDrive', modules.warpDrive),
    cargoBay: getModule('cargoBay', modules.cargoBay),
    fuelTanks: getModule('fuelTanks', modules.fuelTanks),
    scanner: getModule('scanner', modules.scanner),
    landingSystems: getModule('landingSystems', modules.landingSystems),
    weapon1: getModule('weapon1', modules.weapon1),
    weapon2: getModule('weapon2', modules.weapon2),
    weapon3: getModule('weapon3', modules.weapon3),
  };

  const stats = calculateShipDerivedStats(modules, catalog);

  const errors = [];
  const warnings = [];

  // Mass vs. Engine Thrust Capacity
  if (mods.thrusterEngines && stats.totalMass > mods.thrusterEngines.maxThrustMass) {
    errors.push({
      slot: 'thrusterEngines',
      message: {
        en: `Engine underpowered: Installed thrusters can only propel up to ${mods.thrusterEngines.maxThrustMass} MT, but vessel mass is ${stats.totalMass} MT. Vessel cannot break planetary orbit or navigate sub-warp space.`,
        tr: `Motor yetersiz: Kurulu iticiler en fazla ${mods.thrusterEngines.maxThrustMass} MT itebilir, ancak gemi kütlesi ${stats.totalMass} MT. Gemi gezegensel yörüngeyi kıramaz veya alt uzayda hareket edemez.`,
        de: `Triebwerk zu schwach: Installierte Schubdüsen können bis zu ${mods.thrusterEngines.maxThrustMass} MT antreiben, aber die Schiffsmasse beträgt ${stats.totalMass} MT. Das Schiff kann die Planetenumlaufbahn nicht verlassen oder im Subraum navigieren.`
      }
    });
  }

  // Engine Burn Rate vs. Fuel Tank Capacity
  if (mods.thrusterEngines && mods.fuelTanks) {
    const minFuel = mods.thrusterEngines.fuelBurnRate * 2;
    if (mods.fuelTanks.fuelCapacity < minFuel) {
      errors.push({
        slot: 'fuelTanks',
        message: {
          en: `Fuel tank too small for selected engines: ${mods.thrusterEngines.name.en} requires at least ${minFuel}L per standard cruise, but fuel tank only holds ${mods.fuelTanks.fuelCapacity}L.`,
          tr: `Seçilen motorlar için yakıt tankı çok küçük: ${mods.thrusterEngines.name.tr} standart bir seyir için en az ${minFuel}L gerektirir, ancak yakıt tankı sadece ${mods.fuelTanks.fuelCapacity}L alır.`,
          de: `Treibstofftank zu klein für gewählte Triebwerke: ${mods.thrusterEngines.name.de} benötigt mindestens ${minFuel}L pro Standardflug, aber der Treibstofftank fasst nur ${mods.fuelTanks.fuelCapacity}L.`
        }
      });
    }
  }

  // Landing Gear Capacity vs. Total Mass
  if (mods.landingSystems && stats.totalMass > mods.landingSystems.maxLandingMass) {
    errors.push({
      slot: 'landingSystems',
      message: {
        en: `Landing Gear Overloaded: Landing systems rated for ${mods.landingSystems.maxLandingMass} MT, but vessel mass is ${stats.totalMass} MT. Hull will crush upon planetary touchdown.`,
        tr: `İniş Takımı Aşırı Yüklendi: İniş sistemleri ${mods.landingSystems.maxLandingMass} MT için derecelendirildi, ancak gemi kütlesi ${stats.totalMass} MT. Gezegene inişte gövde ezilecektir.`,
        de: `Landesystem überlastet: Landesysteme sind für ${mods.landingSystems.maxLandingMass} MT ausgelegt, aber die Schiffsmasse beträgt ${stats.totalMass} MT. Der Rumpf wird bei der planetaren Landung zerdrückt.`
      }
    });
  }

  // Power Grid Balance
  if (stats.reactorOutput < stats.totalPowerDraw) {
    warnings.push({
      slot: 'powerGrid',
      message: {
        en: `Power Grid Overload: Systems consume ${stats.totalPowerDraw} MW but reactor generates ${stats.reactorOutput} MW. Brownouts will reduce weapon damage and shield recharge.`,
        tr: `Güç Şebekesi Aşırı Yüklenmesi: Sistemler ${stats.totalPowerDraw} MW tüketiyor, ancak reaktör ${stats.reactorOutput} MW üretiyor. Enerji kesintileri silah hasarını ve kalkan şarjını azaltacaktır.`,
        de: `Energieversorgungsüberlastung: Systeme verbrauchen ${stats.totalPowerDraw} MW, aber der Reaktor erzeugt ${stats.reactorOutput} MW. Spannungseinbrüche werden Waffenschaden und Schildaufladung reduzieren.`
      }
    });
  }

  return {
    isFlightReady: errors.length === 0,
    errors,
    warnings,
    stats
  };
}
