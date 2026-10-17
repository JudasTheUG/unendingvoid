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
      baseShields: 60,
      value: 400
    },
    {
      id: "hull_corvette_class_b",
      name: { en: "Vanguard Corvette Frame", tr: "Öncü Korvet Gövdesi", de: "Vorhut-Korvetten-Rumpf" },
      livingQuarters: { bedrooms: 2, stations: ["Weapon Fire Station"] },
      mass: 90,
      hullHP: 180,
      baseArmor: 15,
      reactorOutput: 80,
      baseShields: 120,
      value: 950
    },
    {
      id: "hull_frigate_class_c",
      name: { en: "Aegis Heavy Frigate Frame", tr: "Aegis Ağır Fırkateyn Gövdesi", de: "Aegis Schwerer Fregatten-Rumpf" },
      livingQuarters: { bedrooms: 3, stations: ["Weapon Station", "Medical Bay"] },
      mass: 210,
      hullHP: 320,
      baseArmor: 18,
      reactorOutput: 140,
      baseShields: 220,
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
      thrust: 220,
      maxThrustMass: 140,
      fuelBurnRate: 15,
      mass: 25,
      powerDraw: 15,
      value: 320
    },
    {
      id: "eng_plasma_heavy",
      name: { en: "Twin Inferno Plasma Thrusters", tr: "Çift Cehennem Plazma Motorları", de: "Doppel-Inferno-Plasmadüsen" },
      thrust: 480,
      maxThrustMass: 350,
      fuelBurnRate: 35,
      mass: 65,
      powerDraw: 30,
      value: 850
    }
  ],
  warpDrive: [
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
      powerDraw: 30,
      value: 750
    }
  ],
  cargoBay: [
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
    }
  ],
  scanner: [
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
      maxLandingMass: 120,
      mass: 10,
      value: 140
    },
    {
      id: "gear_heavy_pistons",
      name: { en: "Reinforced Quad-Piston Skids", tr: "Güçlendirilmiş Dört Pistonlu Kızaklar", de: "Verstärkte Vierkolben-Landekufen" },
      maxLandingMass: 400,
      mass: 30,
      value: 420
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
