import { describe, it, expect } from 'vitest';
import { calculateShipDerivedStats, validateShipBuild } from '../shipValidation';
import { shipModulesCatalog } from '../shipModulesCatalog';

describe('Ship Validation Engine', () => {
  it('should calculate derived stats correctly for a valid ship', () => {
    const validShipModules = {
      hull: 'hull_scout_class_a',
      flightDeck: 'cockpit_explorer',
      thrusterEngines: 'eng_ion_light',
      warpDrive: 'warp_class_1',
      cargoBay: 'cargo_light_40',
      fuelTanks: 'fuel_cryo_60',
      scanner: 'scan_radar_mk1',
      landingSystems: 'gear_light_struts',
      weapon1: 'wpn_railgun_mk2',
      weapon2: 'wpn_none',
      weapon3: 'wpn_none',
    };

    const stats = calculateShipDerivedStats(validShipModules, shipModulesCatalog);
    
    // total mass = 40 (hull) + 15 (deck) + 25 (engines) + 20 (warp) + 15 (cargo) + 12 (fuel) + 8 (scanner) + 10 (landing) + 20 (wpn1) = 165
    expect(stats.totalMass).toBe(165);
    expect(stats.maxHull).toBe(100);
    expect(stats.reactorOutput).toBe(40);
  });

  it('should return a critical error when overweight hull exceeds light engine thrust', () => {
    const overweightShip = {
      hull: 'hull_frigate_class_c', // 210 MT
      flightDeck: 'cockpit_explorer',
      thrusterEngines: 'eng_ion_light', // maxThrustMass: 140
      warpDrive: 'warp_class_1',
      cargoBay: 'cargo_light_40',
      fuelTanks: 'fuel_cryo_60',
      scanner: 'scan_radar_mk1',
      landingSystems: 'gear_heavy_pistons',
      weapon1: 'wpn_none',
      weapon2: 'wpn_none',
      weapon3: 'wpn_none',
    };

    const validation = validateShipBuild(overweightShip, shipModulesCatalog);
    expect(validation.isFlightReady).toBe(false);
    expect(validation.errors.some(e => e.slot === 'thrusterEngines')).toBe(true);
  });

  it('should return a critical error when heavy engine with micro fuel tank is used', () => {
    const fuelStarvedShip = {
      hull: 'hull_scout_class_a',
      flightDeck: 'cockpit_explorer',
      thrusterEngines: 'eng_plasma_heavy', // fuelBurnRate: 35 (needs 70L)
      warpDrive: 'warp_class_1',
      cargoBay: 'cargo_light_40',
      fuelTanks: 'fuel_cryo_60', // fuelCapacity: 60
      scanner: 'scan_radar_mk1',
      landingSystems: 'gear_light_struts',
      weapon1: 'wpn_none',
      weapon2: 'wpn_none',
      weapon3: 'wpn_none',
    };

    const validation = validateShipBuild(fuelStarvedShip, shipModulesCatalog);
    expect(validation.isFlightReady).toBe(false);
    expect(validation.errors.some(e => e.slot === 'fuelTanks')).toBe(true);
  });

  it('should return a critical error when overweight ship exceeds landing gear limit', () => {
    const heavyLandingShip = {
      hull: 'hull_frigate_class_c', // 210 MT
      flightDeck: 'cockpit_tactical',
      thrusterEngines: 'eng_plasma_heavy',
      warpDrive: 'warp_class_3',
      cargoBay: 'cargo_heavy_120',
      fuelTanks: 'fuel_pressurized_180',
      scanner: 'scan_subspace_mk3',
      landingSystems: 'gear_light_struts', // maxLandingMass: 120
      weapon1: 'wpn_proton_torpedo',
      weapon2: 'wpn_plasma_lance',
      weapon3: 'wpn_ion_disruptor',
    };

    const validation = validateShipBuild(heavyLandingShip, shipModulesCatalog);
    expect(validation.isFlightReady).toBe(false);
    expect(validation.errors.some(e => e.slot === 'landingSystems')).toBe(true);
  });

  it('should return isFlightReady: true with correct stats for a valid ship setup', () => {
    const perfectShip = {
      hull: 'hull_corvette_class_b', // 90 MT
      flightDeck: 'cockpit_tactical', // 30 MT
      thrusterEngines: 'eng_plasma_heavy', // 65 MT (maxThrustMass: 350)
      warpDrive: 'warp_class_3', // 45 MT
      cargoBay: 'cargo_light_40', // 15 MT
      fuelTanks: 'fuel_pressurized_180', // 35 MT (Capacity 180L)
      scanner: 'scan_radar_mk1', // 8 MT
      landingSystems: 'gear_heavy_pistons', // 30 MT (maxLandingMass 400)
      weapon1: 'wpn_plasma_lance', // 22 MT
      weapon2: 'wpn_none', // 0 MT
      weapon3: 'wpn_none', // 0 MT
    }; // Total mass: 340 MT

    const validation = validateShipBuild(perfectShip, shipModulesCatalog);
    
    // Expect total mass = 90+30+65+45+15+35+8+30+22 = 340 MT
    // Thrust: 480
    // Max landing mass: 400
    // Fuel needed: 35 * 2 = 70. Capacity 180 > 70.
    
    expect(validation.stats.totalMass).toBe(340);
    expect(validation.isFlightReady).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it('should compute reactor output and shield generator stats correctly', () => {
    const shipWithReactorAndShields = {
      hull: 'hull_corvette_class_b', // 90 MW base, 50 shields base
      flightDeck: 'cockpit_tactical',
      thrusterEngines: 'eng_plasma_heavy',
      warpDrive: 'warp_class_3',
      cargoBay: 'cargo_light_40',
      fuelTanks: 'fuel_pressurized_180',
      scanner: 'scan_radar_mk1',
      landingSystems: 'gear_heavy_pistons',
      weapon1: 'wpn_railgun_mk2',
      weapon2: 'wpn_none',
      weapon3: 'wpn_none',
      reactor: 'reactor_tokamak_vanguard', // 160 MW
      shieldGenerator: 'shield_harmonic_matrix', // 160 shields, 20 MW draw
    };

    const stats = calculateShipDerivedStats(shipWithReactorAndShields, shipModulesCatalog);
    // Reactor output = 50 (hull) + 160 (tokamak) = 210 MW
    expect(stats.reactorOutput).toBe(210);
    // Max shields = 60 (hull) + 160 (harmonic matrix) = 220 shields
    expect(stats.maxShields).toBe(220);
    expect(stats.totalPowerDraw).toBeGreaterThan(0);
    expect(stats.reactorOutput).toBeGreaterThan(stats.totalPowerDraw); // Sufficient power

    const validation = validateShipBuild(shipWithReactorAndShields, shipModulesCatalog);
    expect(validation.isFlightReady).toBe(true);
    expect(validation.warnings.length).toBe(0); // No power grid overload warning
  });

  it('should allow flight readiness with dummy starter scout build without mass or thrust deficit', () => {
    const starterScoutShip = {
      hull: 'hull_scout_class_a',
      flightDeck: 'cockpit_explorer',
      thrusterEngines: 'eng_ion_light', // rated for 260 MT
      warpDrive: 'warp_class_1',
      cargoBay: 'cargo_light_40',
      fuelTanks: 'fuel_cryo_60',
      scanner: 'scan_radar_mk1',
      landingSystems: 'gear_light_struts', // rated for 260 MT
      weapon1: 'wpn_railgun_mk2',
      weapon2: 'wpn_none',
      weapon3: 'wpn_none',
      reactor: 'reactor_fusion_micro', // 80 MW (total 120 MW)
      shieldGenerator: 'shield_tactical_deflector', // +80 shields
    };

    const validation = validateShipBuild(starterScoutShip, shipModulesCatalog);
    expect(validation.isFlightReady).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.stats.totalMass).toBeLessThanOrEqual(260);
    expect(validation.stats.totalPowerDraw).toBeLessThanOrEqual(validation.stats.reactorOutput);
  });

  it('should properly handle unmounted optional components', () => {
    const unmountedVessel = {
      hull: 'hull_scout_class_a',
      flightDeck: 'cockpit_explorer',
      thrusterEngines: 'eng_ion_light',
      warpDrive: 'warp_none', // Unmounted
      cargoBay: 'cargo_none', // Unmounted
      fuelTanks: 'fuel_cryo_60',
      scanner: 'scan_none', // Unmounted
      landingSystems: 'gear_light_struts',
      weapon1: 'wpn_none', // Unmounted
      weapon2: 'wpn_none',
      weapon3: 'wpn_none',
      reactor: 'reactor_fusion_micro',
      shieldGenerator: 'shield_none', // Unmounted (0 shields)
    };

    const stats = calculateShipDerivedStats(unmountedVessel, shipModulesCatalog);
    expect(stats.cargoCapacity).toBe(0);
    expect(stats.jumpRange).toBe(0);
    expect(stats.weapons).toEqual([]);
    // Scout hull base shields is 30, shield_none adds 0
    expect(stats.maxShields).toBe(30);

    const validation = validateShipBuild(unmountedVessel, shipModulesCatalog);
    expect(validation.isFlightReady).toBe(true);
  });
});
