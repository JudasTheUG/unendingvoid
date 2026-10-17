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
});
