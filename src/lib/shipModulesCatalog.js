export const shipModulesCatalog = {
  hull: [
    {
      id: "hull_scout_class_a",
      name: { en: "Starlight Scout Chassis", tr: "Yıldızışığı Keşif Gövdesi", de: "Sternenlicht-Aufklärer-Chassis" },
      livingQuarters: { bedrooms: 1, stations: [] },
      mass: 40,
      hullHP: 100,
      baseArmor: 12,
      reactorOutput: 40,
      baseShields: 30,
      value: 400
    },
    {
      id: "hull_corvette_class_b",
      name: { en: "Vanguard Corvette Frame", tr: "Öncü Korvet Gövdesi", de: "Vorhut-Korvetten-Rumpf" },
      livingQuarters: { bedrooms: 2, stations: ["Weapon Fire Station"] },
      mass: 90,
      hullHP: 180,
      baseArmor: 15,
      reactorOutput: 50,
      baseShields: 60,
      value: 950
    },
    {
      id: "hull_frigate_class_c",
      name: { en: "Aegis Heavy Frigate Frame", tr: "Aegis Ağır Fırkateyn Gövdesi", de: "Aegis Schwerer Fregatten-Rumpf" },
      livingQuarters: { bedrooms: 3, stations: ["Weapon Station", "Medical Bay"] },
      mass: 210,
      hullHP: 340,
      baseArmor: 18,
      reactorOutput: 80,
      baseShields: 100,
      value: 2200
    }
  ],
  flightDeck: [
    {
      id: "cockpit_explorer",
      name: { en: "Aero-Scan Pilot Cockpit", tr: "Hava-Tarama Pilot Kokpiti", de: "Aero-Scan Pilotencockpit" },
      crew: 2,
      avionicsBonus: 1,
      mass: 15,
      powerDraw: 5,
      value: 220
    },
    {
      id: "cockpit_tactical",
      name: { en: "Combat Command Bridge", tr: "Muharebe Komuta Köprüsü", de: "Gefechts-Kommandobrücke" },
      crew: 4,
      avionicsBonus: 2,
      mass: 30,
      powerDraw: 10,
      value: 550
    }
  ],
  thrusterEngines: [
    {
      id: "eng_ion_light",
      name: { en: "Ion-Vector Pulse Thrusters", tr: "İyon-Vektör İtici Motorlar", de: "Ionen-Vektor-Schubdüsen" },
      thrust: 320,
      maxThrustMass: 260,
      fuelBurnRate: 15,
      mass: 25,
      powerDraw: 12,
      value: 320
    },
    {
      id: "eng_plasma_heavy",
      name: { en: "Twin Inferno Plasma Thrusters", tr: "Çift Cehennem Plazma Motorları", de: "Doppel-Inferno-Plasmadüsen" },
      thrust: 700,
      maxThrustMass: 550,
      fuelBurnRate: 35,
      mass: 65,
      powerDraw: 22,
      value: 850
    },
    {
      id: "eng_fusion_torch",
      name: { en: "Tycho Heavy Fusion Torch Drive", tr: "Tycho Ağır Füzyon Meşale Motoru", de: "Tycho Schwerer Fusionsfackelantrieb" },
      thrust: 1400,
      maxThrustMass: 1100,
      fuelBurnRate: 45,
      mass: 110,
      powerDraw: 38,
      value: 1950
    }
  ],
  reactor: [
    {
      id: "reactor_fusion_micro",
      name: { en: "Micro-Pebble Fusion Core (80 MW)", tr: "Mikro-Çakıl Füzyon Çekirdeği (80 MW)", de: "Mikro-Kugelfusionskern (80 MW)" },
      reactorOutput: 80,
      mass: 15,
      value: 350
    },
    {
      id: "reactor_tokamak_vanguard",
      name: { en: "Tokamak Magnetic Confinement Core (160 MW)", tr: "Tokamak Manyetik Çekirdek (160 MW)", de: "Tokamak-Magnetfeldkern (160 MW)" },
      reactorOutput: 160,
      mass: 28,
      value: 750
    },
    {
      id: "reactor_antimatter_overdrive",
      name: { en: "Antimatter Singularity Reactor (280 MW)", tr: "Karşı-Madde Tekillik Reaktörü (280 MW)", de: "Antimaterie-Singularitätsreaktor (280 MW)" },
      reactorOutput: 280,
      mass: 45,
      value: 1600
    },
    {
      id: "reactor_quantum_hypergrid",
      name: { en: "Martian Quantum Hypergrid Core (450 MW)", tr: "Mars Kuantum Hiperşebeke Çekirdeği (450 MW)", de: "Marsianischer Quanten-Hypergrid-Kern (450 MW)" },
      reactorOutput: 450,
      mass: 70,
      value: 3200
    }
  ],
  shieldGenerator: [
    {
      id: "shield_none",
      name: { en: "Empty Shield Hardpoint (Unshielded)", tr: "Boş Kalkan Yuvası (Kalkansız)", de: "Leere Schildaufhängung (Ungeschützt)" },
      shields: 0,
      powerDraw: 0,
      mass: 0,
      value: 0
    },
    {
      id: "shield_tactical_deflector",
      name: { en: "Aegis Light Deflector Barrier (+80)", tr: "Aegis Hafif Saptırıcı Bariyer (+80)", de: "Aegis Leichtes Deflektorfeld (+80)" },
      shields: 80,
      powerDraw: 10,
      mass: 10,
      value: 300
    },
    {
      id: "shield_harmonic_matrix",
      name: { en: "Harmonic Phase Barrier Matrix (+160)", tr: "Harmonik Faz Bariyer Matrisi (+160)", de: "Harmonische Phasenbarriere (+160)" },
      shields: 160,
      powerDraw: 20,
      mass: 22,
      value: 650
    },
    {
      id: "shield_heavy_citadel",
      name: { en: "Citadel Heavy Fortress Shield (+280)", tr: "Hisar Ağır Kale Kalkanı (+280)", de: "Zitadellen-Schwerer Festungsschild (+280)" },
      shields: 280,
      powerDraw: 35,
      mass: 42,
      value: 1400
    }
  ],
  warpDrive: [
    {
      id: "warp_none",
      name: { en: "No Warp Drive (Sub-Light Only)", tr: "Warp Sürücüsü Yok (Işık-Altı)", de: "Kein Warpantrieb (Nur Sublicht)" },
      jumpRating: 0,
      mass: 0,
      powerDraw: 0,
      value: 0
    },
    {
      id: "warp_class_1",
      name: { en: "Subspace Warp Drive Mk I", tr: "Altuzay Warp Sürücüsü Mk I", de: "Subraum-Warpantrieb Mk I" },
      jumpRating: 12,
      mass: 20,
      powerDraw: 15,
      value: 300
    },
    {
      id: "warp_class_3",
      name: { en: "Hyper-Graviton Warp Core", tr: "Hiper-Graviton Warp Çekirdeği", de: "Hyper-Graviton-Warpkern" },
      jumpRating: 28,
      mass: 45,
      powerDraw: 26,
      value: 750
    }
  ],
  cargoBay: [
    {
      id: "cargo_none",
      name: { en: "Empty Cargo Hold (0 MT)", tr: "Boş Kargo Bölmesi (0 MT)", de: "Leere Frachtbucht (0 MT)" },
      capacity: 0,
      mass: 0,
      value: 0
    },
    {
      id: "cargo_light_40",
      name: { en: "Standard Pressurized Hold (40 MT)", tr: "Standart Basınçlı Bölme (40 MT)", de: "Standard-Druckfrachtraum (40 MT)" },
      capacity: 40,
      mass: 15,
      value: 150
    },
    {
      id: "cargo_heavy_120",
      name: { en: "Reinforced Armored Hold (120 MT)", tr: "Güçlendirilmiş Zırhlı Bölme (120 MT)", de: "Verstärkter Panzerfrachtraum (120 MT)" },
      capacity: 120,
      mass: 45,
      isShielded: true,
      value: 450
    },
    {
      id: "cargo_super_250",
      name: { en: "Industrial Modular Hauler Bay (250 MT)", tr: "Endüstriyel Modüler Taşıyıcı Bölme (250 MT)", de: "Industrielle Modular-Frachtbucht (250 MT)" },
      capacity: 250,
      mass: 85,
      isShielded: true,
      value: 950
    }
  ],
  fuelTanks: [
    {
      id: "fuel_cryo_60",
      name: { en: "He-3 Cryo-Cell (60L)", tr: "He-3 Kriyojenik Tank (60L)", de: "He-3 Kryo-Zelle (60L)" },
      fuelCapacity: 60,
      mass: 12,
      value: 120
    },
    {
      id: "fuel_pressurized_180",
      name: { en: "Deep-Void Fuel Tank (180L)", tr: "Derin Uzay Yakıt Tankı (180L)", de: "Tiefenraum-Treibstofftank (180L)" },
      fuelCapacity: 180,
      mass: 35,
      value: 380
    },
    {
      id: "fuel_deuterium_heavy",
      name: { en: "Deep-Space Deuterium Bunker (360L)", tr: "Derin Uzay Döteryum Tankı (360L)", de: "Tiefenraum-Deuterium-Bunker (360L)" },
      fuelCapacity: 360,
      mass: 65,
      value: 750
    }
  ],
  scanner: [
    {
      id: "scan_none",
      name: { en: "Basic Passive Sensors (1 AU)", tr: "Temel Pasif Sensörler (1 AU)", de: "Einfache passive Sensoren (1 AE)" },
      rangeAU: 1,
      targetLock: 0,
      mass: 0,
      powerDraw: 0,
      value: 0
    },
    {
      id: "scan_radar_mk1",
      name: { en: "Broadband Radar Scanner", tr: "Genişbant Radar Tarayıcı", de: "Breitband-Radardetektor" },
      rangeAU: 5,
      targetLock: 1,
      mass: 8,
      powerDraw: 5,
      value: 180
    },
    {
      id: "scan_subspace_mk3",
      name: { en: "Subspace Quantum Scanner", tr: "Altuzay Kuantum Tarayıcı", de: "Subraum-Quantenscanner" },
      rangeAU: 20,
      targetLock: 3,
      mass: 18,
      powerDraw: 12,
      value: 500
    }
  ],
  landingSystems: [
    {
      id: "gear_light_struts",
      name: { en: "Hydraulic Light Landing Struts", tr: "Hidrolik Hafif İniş Ayakları", de: "Hydraulische Leicht-Landestützen" },
      maxLandingMass: 260,
      mass: 10,
      value: 140
    },
    {
      id: "gear_heavy_pistons",
      name: { en: "Reinforced Quad-Piston Skids", tr: "Güçlendirilmiş Dört Pistonlu Kızaklar", de: "Verstärkte Vierkolben-Landekufen" },
      maxLandingMass: 600,
      mass: 30,
      value: 420
    },
    {
      id: "gear_titan_pads",
      name: { en: "Titan Quad-Hydraulic Landing Skids", tr: "Titan Dörtlü Hidrolik İniş Kızakları", de: "Titan Hydraulische Vierfach-Landekufen" },
      maxLandingMass: 1200,
      mass: 55,
      value: 850
    }
  ],
  weapons: [
    {
      id: "wpn_none",
      name: { en: "Empty Hardpoint", tr: "Boş Yuva", de: "Leere Waffenaufhängung" },
      type: "None",
      toHit: 0,
      damageDice: "0",
      damageBonus: 0,
      damageType: "None",
      range: "0",
      mass: 0,
      powerDraw: 0,
      value: 0
    },
    {
      id: "wpn_railgun_mk2",
      name: { en: "Twin Gauss Railguns", tr: "Çift Gauss Manyetik Raylı Top", de: "Doppel-Gauss-Schienengeschütz" },
      type: "Kinetic Battery",
      toHit: 6,
      damageDice: "2d10",
      damageBonus: 4,
      damageType: "Kinetic",
      range: "2,000 / 8,000 km",
      mass: 20,
      powerDraw: 12,
      value: 500
    },
    {
      id: "wpn_plasma_lance",
      name: { en: "Heavy Plasma Lance", tr: "Ağır Plazma Mızrağı", de: "Schwere Plazmalanze" },
      type: "Thermal Beam",
      toHit: 5,
      damageDice: "3d8",
      damageBonus: 3,
      damageType: "Thermal",
      range: "1,500 / 5,000 km",
      mass: 22,
      powerDraw: 15,
      value: 580
    },
    {
      id: "wpn_proton_torpedo",
      name: { en: "Proton Torpedo Silo", tr: "Proton Torpido Silosu", de: "Protonen-Torpedosilo" },
      type: "Heavy Ordnance",
      toHit: 7,
      damageDice: "4d6",
      damageBonus: 2,
      damageType: "Explosive",
      range: "5,000 / 15,000 km",
      mass: 30,
      powerDraw: 8,
      value: 650
    },
    {
      id: "wpn_ion_disruptor",
      name: { en: "Pulse Ion Disruptor", tr: "Darbeli İyon Bozucu", de: "Puls-Ionen-Disruptor" },
      type: "Ion Energy",
      toHit: 6,
      damageDice: "2d12",
      damageBonus: 2,
      damageType: "Ion",
      range: "1,000 / 4,000 km",
      mass: 18,
      powerDraw: 14,
      value: 520
    }
  ]
};
