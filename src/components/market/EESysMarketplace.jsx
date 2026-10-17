import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  addItemToInventory,
  removeItemFromInventory,
  updateCredits,
  setPlayerEEMembership,
  updatePlayerInventory,
  addPlayerDesign,
} from '../../lib/playerActions';

// ── RAW MATERIALS & ADVANCED SYNTHESIS COMPONENTS ──
export const EE_MATERIALS = [
  {
    id: 'mat_titanium_alloy',
    name: {
      en: 'Titanium-Ceramite Ingot',
      tr: 'Titanyum-Seramit Külçesi',
      de: 'Titan-Keramik-Barren',
    },
    type: 'material',
    rarity: 'common',
    value: 25,
    category: 'materials',
    description: {
      en: 'High-density reinforced alloy used in heavy kinetic plating and reinforced weapon receivers.',
      tr: 'Ağır kinetik zırh kaplamalarında ve güçlendirilmiş silah gövdelerinde kullanılan yüksek yoğunluklu alaşım.',
      de: 'Hochdichte verstärkte Legierung für schwere Kinetikpanzerungen und Waffenempfänger.',
    },
  },
  {
    id: 'mat_plasma_cell',
    name: {
      en: 'Plasma Compression Valve',
      tr: 'Plazma Sıkıştırma Valfi',
      de: 'Plasmakompressionsventil',
    },
    type: 'material',
    rarity: 'uncommon',
    value: 30,
    category: 'materials',
    description: {
      en: 'Magnetic containment chamber for super-heated ionized gases and thermal weaponry.',
      tr: 'Aşırı ısıtılmış iyonize gazlar ve termal silahlar için manyetik muhafaza odası.',
      de: 'Magnetische Eindämmungskammer für überhitzte ionisierte Gase und thermische Waffen.',
    },
  },
  {
    id: 'mat_nano_fiber',
    name: {
      en: 'Carbon Nanotube Weave',
      tr: 'Karbon Nanotüp Örgüsü',
      de: 'Kohlenstoff-Nanoröhren-Gewebe',
    },
    type: 'material',
    rarity: 'common',
    value: 20,
    category: 'materials',
    description: {
      en: 'Ultra-light flexible weave that absorbs kinetic shock and disperses thermal blast waves.',
      tr: 'Kinetik şoku emen ve termal patlama dalgalarını dağıtan ultra hafif esnek örgü.',
      de: 'Ultraleichtes flexibles Gewebe, das kinetische Stöße absorbiert und Hitzewellen zerstreut.',
    },
  },
  {
    id: 'mat_tachyon_core',
    name: {
      en: 'Sub-Atomic Tachyon Crystal',
      tr: 'Atom-Altı Takyon Kristali',
      de: 'Subatomarer Tachyon-Kristall',
    },
    type: 'material',
    rarity: 'rare',
    value: 50,
    category: 'materials',
    description: {
      en: 'Exotic crystalline lattice vibrating with tachyon energy, required for high-frequency vibro-blades.',
      tr: 'Yüksek frekanslı titreşim bıçakları için gerekli olan, takyon enerjisiyle titreşen egzotik kristal örgü.',
      de: 'Exotisches Kristallgitter, das mit Tachyonenenergie vibriert, erforderlich für Hochfrequenzklingen.',
    },
  },
  {
    id: 'mat_neural_chip',
    name: {
      en: 'Bio-Neural Logic Substrate',
      tr: 'Biyo-Nöral Mantık Çipi',
      de: 'Bioneurales Logiksubstrat',
    },
    type: 'material',
    rarity: 'rare',
    value: 40,
    category: 'materials',
    description: {
      en: 'Synthetic quantum neuro-processor designed for cortex cyberware and zero-trace decryptors.',
      tr: 'Korteks sibernetikleri ve sıfır izli şifre çözücüler için tasarlanmış sentetik kuantum nöro-işlemci.',
      de: 'Synthetischer Quanten-Neuroprozessor für Kortex-Cyberware und Zero-Trace-Entschlüsseler.',
    },
  },
  {
    id: 'mat_graviton_emitter',
    name: {
      en: 'Miniaturized Graviton Coil',
      tr: 'Minyatür Graviton Bobini',
      de: 'Miniaturisierte Graviton-Spule',
    },
    type: 'material',
    rarity: 'legendary',
    value: 60,
    category: 'materials',
    description: {
      en: 'Micro-gravitational flux generator that manipulates local space-time for stealth and sub-warp drives.',
      tr: 'Gizlilik ve alt-büküm motorları için yerel uzay-zamanı manipüle eden mikro-yerçekimsel akı jeneratörü.',
      de: 'Mikrogravitativer Flussgenerator zur Raum-Zeit-Manipulation für Tarnung und Unterlichtantriebe.',
    },
  },
  {
    id: 'mat_medic_nanites',
    name: {
      en: 'Medical Nanite Flask',
      tr: 'Tıbbi Nanit Şişesi',
      de: 'Medizinische Naniten-Flasche',
    },
    type: 'material',
    rarity: 'uncommon',
    value: 15,
    category: 'materials',
    description: {
      en: 'Sterile suspension of programmable medical nanobots capable of instantly repairing tissue damage.',
      tr: 'Doku hasarını anında onarabilen programlanabilir tıbbi nanobotların steril süspansiyonu.',
      de: 'Sterile Suspension programmierbarer medizinischer Nanobots zur sofortigen Gewebereparatur.',
    },
  },
];

// Curated E.E.Sys Interstellar Marketplace Catalog with Recipes and Design Costs
export const EE_CATALOG_ITEMS = [
  // ── WEAPONS ──
  {
    id: 'item_plasma_carbine_mk2',
    name: {
      en: 'Overcharged Pulse Carbine Mk II',
      tr: 'Aşırı Yüklü Darbe Karbin Mk II',
      de: 'Überladener Impulskarabiner Mk II',
    },
    type: 'weapon',
    rarity: 'rare',
    damage: '2d8 Energy',
    range: '90 / 270 ft.',
    value: 150,
    designCost: 45,
    category: 'weapons',
    recipe: [
      { id: 'mat_titanium_alloy', count: 2 },
      { id: 'mat_plasma_cell', count: 2 },
    ],
    description: {
      en: 'Precision magnetic rail rifle capable of piercing through reinforced ceramite plates.',
      tr: 'Güçlendirilmiş seramit plakaları delebilen hassas manyetik raylı tüfek.',
      de: 'Präzisions-Magnetgewehr, das verstärkte Keramikpanzerungen durchschlägt.',
    },
  },
  {
    id: 'item_tachyon_blade',
    name: {
      en: 'Tachyon Vibro-Katana',
      tr: 'Takyon Titreşim Katanası',
      de: 'Tachyonen-Vibro-Katana',
    },
    type: 'weapon',
    rarity: 'legendary',
    damage: '1d10+2 Slashing',
    range: 'Melee',
    value: 220,
    designCost: 65,
    category: 'weapons',
    recipe: [
      { id: 'mat_titanium_alloy', count: 2 },
      { id: 'mat_tachyon_core', count: 2 },
    ],
    description: {
      en: 'A blade oscillating at sub-atomic frequencies, slicing through physical matter like smoke.',
      tr: 'Duman gibi fiziksel maddeleri kesen, atom-altı frekanslarda titreşen bir kılıç.',
      de: 'Eine Klinge, die auf subatomaren Frequenzen oszilliert und Materie wie Rauch durchschneidet.',
    },
  },
  {
    id: 'item_heavy_meltagun',
    name: {
      en: 'Inferno Heavy Meltagun',
      tr: 'Cehennem Ağır Ergitme Silahı',
      de: 'Inferno Schwere Melter-Kanone',
    },
    type: 'weapon',
    rarity: 'alien',
    damage: '3d6 Thermal',
    range: '40 / 120 ft.',
    value: 280,
    designCost: 85,
    category: 'weapons',
    recipe: [
      { id: 'mat_titanium_alloy', count: 3 },
      { id: 'mat_plasma_cell', count: 3 },
    ],
    description: {
      en: 'Ancient alien thermal cannon that turns hull plating and blast doors into molten slag.',
      tr: 'Gövde kaplamalarını ve patlama kapılarını erimiş cürufa çeviren kadim uzaylı termal topu.',
      de: 'Uralte Alien-Thermokanone, die Rumpfpanzerungen und Schotttüren in geschmolzene Schlacke verwandelt.',
    },
  },

  // ── ARMOR & SHIELDS ──
  {
    id: 'item_aegis_suit',
    name: {
      en: 'Titanium-Mesh Aegis Rig',
      tr: 'Titanyum-Ağ Aegis Zırhı',
      de: 'Titan-Gewebe Aegis-Panzerung',
    },
    type: 'armor',
    rarity: 'rare',
    defense: '+3 AC / +10 Shields',
    value: 180,
    designCost: 55,
    category: 'armor',
    recipe: [
      { id: 'mat_titanium_alloy', count: 2 },
      { id: 'mat_nano_fiber', count: 3 },
    ],
    description: {
      en: 'Military combat exoskeleton layered with kinetic absorption gel and kinetic deflectors.',
      tr: 'Kinetik emme jeli ve saptırıcılarla katmanlanmış askeri muharebe dış iskeleti.',
      de: 'Militärisches Kampf-Exoskelett mit kinetischem Absorptionsgel und Deflektoren.',
    },
  },
  {
    id: 'item_void_cloak',
    name: {
      en: 'Dark-Matter Camouflage Cloak',
      tr: 'Karanlık Madde Kamuflaj Pelerini',
      de: 'Dunkle-Materie-Tarnumhang',
    },
    type: 'gear',
    rarity: 'legendary',
    effect: 'Advantage on Stealth checks',
    value: 200,
    designCost: 60,
    category: 'armor',
    recipe: [
      { id: 'mat_nano_fiber', count: 2 },
      { id: 'mat_graviton_emitter', count: 2 },
    ],
    description: {
      en: 'Bends electromagnetic and optical wavelengths around the user for brief invisibility.',
      tr: 'Kullanıcının etrafındaki elektromanyetik ve optik dalga boylarını bükerek geçici görünmezlik sağlar.',
      de: 'Biegt elektromagnetische und optische Wellen um den Träger für temporäre Unsichtbarkeit.',
    },
  },

  // ── CYBERWARE & TECH ──
  {
    id: 'item_neuro_synapse',
    name: {
      en: 'Neural Accelerator Cyber-Implant',
      tr: 'Nöral Hızlandırıcı Siber İmplant',
      de: 'Neuronaler Beschleuniger-Cyber-Implantat',
    },
    type: 'cyberware',
    rarity: 'rare',
    effect: '+2 Initiative & Reflex Saves',
    value: 140,
    designCost: 40,
    category: 'tech',
    recipe: [
      { id: 'mat_neural_chip', count: 2 },
      { id: 'mat_nano_fiber', count: 1 },
    ],
    description: {
      en: 'Direct-neural cortex bridge overclocking motor reflex signals to superhuman speeds.',
      tr: 'Motor refleks sinyallerini insanüstü hızlara çıkaran doğrudan nöral korteks köprüsü.',
      de: 'Direkte Kortexbrücke, die motorische Reflexsignale auf übermenschliche Geschwindigkeiten taktet.',
    },
  },
  {
    id: 'item_quantum_decryptor',
    name: {
      en: 'Zero-Trace Quantum Decryptor',
      tr: 'Sıfır İzli Kuantum Şifre Çözücü',
      de: 'Zero-Trace Quanten-Entschlüsseler',
    },
    type: 'tech',
    rarity: 'uncommon',
    effect: '+3 Arcana / Tech Hacking',
    value: 90,
    designCost: 30,
    category: 'tech',
    recipe: [
      { id: 'mat_neural_chip', count: 1 },
      { id: 'mat_titanium_alloy', count: 1 },
    ],
    description: {
      en: 'Handheld quantum processor engineered to crack encrypted security nodes in seconds.',
      tr: 'Şifreli güvenlik düğümlerini saniyeler içinde kırmak için tasarlanmış el tipi kuantum işlemci.',
      de: 'Handheld-Quantenprozessor zum sekundenschnellen Knacken verschlüsselter Sicherheitsknoten.',
    },
  },

  // ── MEDICAL & CONSUMABLES ──
  {
    id: 'item_nanite_stim',
    name: {
      en: 'Emergency Nanite Med-Injector',
      tr: 'Acil Durum Nanit Tıbbi Enjektörü',
      de: 'Notfall-Naniten-Med-Injektor',
    },
    type: 'consumable',
    rarity: 'uncommon',
    effect: 'Instantly restores 20 HP',
    value: 35,
    designCost: 10,
    category: 'consumables',
    recipe: [{ id: 'mat_medic_nanites', count: 2 }],
    description: {
      en: 'Pressurized micro-syringe dispensing medical nanobots that rapidly re-knit torn tissue.',
      tr: 'Yırtılmış dokuyu hızla yeniden ören tıbbi nanobotları dağıtan basınçlı mikro şırınga.',
      de: 'Druck-Mikrospritze mit medizinischen Nanobots zur schnellen Geweberegeneration.',
    },
  },
  {
    id: 'item_shield_cell',
    name: {
      en: 'Hyper-Capacitor Shield Cell',
      tr: 'Hiper Kapasitör Kalkan Hücresi',
      de: 'Hyper-Kondensator-Schildzelle',
    },
    type: 'consumable',
    rarity: 'uncommon',
    effect: 'Recharges 25 Energy Shields',
    value: 40,
    designCost: 12,
    category: 'consumables',
    recipe: [
      { id: 'mat_plasma_cell', count: 1 },
      { id: 'mat_nano_fiber', count: 1 },
    ],
    description: {
      en: 'Quick-release plasma capacitor that instantly restores discharged personal deflector shields.',
      tr: 'Boşalmış kişisel saptırıcı kalkanları anında geri yükleyen hızlı açılan plazma kapasitörü.',
      de: 'Schnellverschluss-Plasmakondensator zur sofortigen Wiederherstellung persönlicher Schilde.',
    },
  },

  // ── SHIP MODULES ──
  {
    id: 'item_hyper_thrusters',
    name: {
      en: 'Vortex Hyper-Drive Thrusters',
      tr: 'Vorteks Hiper Motor İticileri',
      de: 'Vortex-Hyperantrieb-Triebwerke',
    },
    type: 'ship_module',
    slot: 'thrusterEngines',
    rarity: 'legendary',
    effect: '+15 km/s Sub-Warp Speed (950 Thrust)',
    thrust: 950,
    mass: 45,
    powerDraw: 24,
    value: 300,
    designCost: 90,
    category: 'ship',
    recipe: [
      { id: 'mat_titanium_alloy', count: 3 },
      { id: 'mat_graviton_emitter', count: 2 },
    ],
    description: {
      en: 'Class-4 ion propulsion engines configured for rapid interstellar tactical maneuvers.',
      tr: 'Hızlı yıldızlararası taktik manevralar için yapılandırılmış Sınıf-4 iyon itiş motorları.',
      de: 'Klasse-4-Ionenantriebstriebwerke für schnelle interstellare taktische Manöver.',
    },
  },
  {
    id: 'item_torpedo_launcher',
    name: {
      en: 'Dual Photon Torpedo Rack',
      tr: 'Çift Foton Torpido Yuvası',
      de: 'Doppel-Photonen-Torpedogestell',
    },
    type: 'ship_module',
    slot: 'weapon',
    rarity: 'rare',
    damage: '4d10 Explosive',
    damageDice: '4d10',
    damageBonus: 4,
    damageType: 'Explosive',
    toHit: 7,
    range: '4,000 / 12,000 km',
    mass: 25,
    powerDraw: 16,
    value: 260,
    designCost: 80,
    category: 'ship',
    recipe: [
      { id: 'mat_titanium_alloy', count: 3 },
      { id: 'mat_plasma_cell', count: 2 },
    ],
    description: {
      en: 'Ship-mounted heavy ordnance launcher capable of devastating enemy frigates.',
      tr: 'Düşman fırkateynlerini yok edebilen gemiye monte ağır mühimmat fırlatıcı.',
      de: 'Schiffsgestützter schwerer Geschosswerfer zur Zerstörung feindlicher Fregatten.',
    },
  },
  {
    id: 'item_phase_shield',
    name: {
      en: 'Harmonic Phase Barrier Matrix',
      tr: 'Harmonik Faz Bariyer Matrisi',
      de: 'Harmonische Phasenbarriere',
    },
    type: 'ship_module',
    slot: 'shieldGenerator',
    rarity: 'epic',
    effect: '+160 Deflector Shields',
    shields: 160,
    mass: 22,
    powerDraw: 20,
    value: 650,
    designCost: 180,
    category: 'ship',
    recipe: [
      { id: 'mat_titanium_alloy', count: 3 },
      { id: 'mat_graviton_emitter', count: 2 },
      { id: 'mat_plasma_cell', count: 1 },
    ],
    description: {
      en: 'Harmonic frequency deflector matrix dispersing high-energy plasma and beam ordnance.',
      tr: 'Yüksek enerjili plazma ve ışın mühimmatını dağıtan harmonik frekans saptırıcı matrisi.',
      de: 'Harmonische Frequenzdeflektormatrix zur Abwehr hochenergetischer Plasmageschosse.',
    },
  },
  {
    id: 'item_tokamak_reactor',
    name: {
      en: 'Tokamak Magnetic Confinement Core',
      tr: 'Tokamak Manyetik Çekirdek',
      de: 'Tokamak-Magnetfeldkern',
    },
    type: 'ship_module',
    slot: 'reactor',
    rarity: 'epic',
    effect: '+160 MW Reactor Output',
    reactorOutput: 160,
    mass: 28,
    value: 750,
    designCost: 200,
    category: 'ship',
    recipe: [
      { id: 'mat_titanium_alloy', count: 4 },
      { id: 'mat_neural_chip', count: 2 },
      { id: 'mat_plasma_cell', count: 2 },
    ],
    description: {
      en: 'Military-grade magnetic toroidal fusion reactor producing 160 MW stable grid power.',
      tr: '160 MW kararlı şebeke gücü üreten askeri sınıf manyetik toroidal füzyon reaktörü.',
      de: 'Militärischer toroidaler Magnetfusionsreaktor mit 160 MW stabiler Netzleistung.',
    },
  },
  {
    id: 'item_quantum_scanner',
    name: {
      en: 'Subspace Quantum Scanner',
      tr: 'Altuzay Kuantum Tarayıcı',
      de: 'Subraum-Quantenscanner',
    },
    type: 'ship_module',
    slot: 'scanner',
    rarity: 'rare',
    effect: '20 AU Detection Range (+3 Lock)',
    rangeAU: 20,
    targetLock: 3,
    mass: 18,
    powerDraw: 12,
    value: 500,
    designCost: 140,
    category: 'ship',
    recipe: [
      { id: 'mat_titanium_alloy', count: 2 },
      { id: 'mat_neural_chip', count: 2 },
    ],
    description: {
      en: 'Advanced tachyon sensor array scanning celestial vectors and hostile signatures across 20 AU.',
      tr: '20 AU boyunca göksel vektörleri ve düşman izlerini tarayan gelişmiş takyon sensör dizisi.',
      de: 'Fortschrittliches Tachyon-Sensorarray zur Ortung feindlicher Signaturen über 20 AE.',
    },
  },

  // ── RAW MATERIALS & COMPONENTS ──
  ...EE_MATERIALS,
];

export const MEMBERSHIP_ITEM = {
  id: 'item_ee_membership',
  name: {
    en: 'Equivalent Exchange Membership',
    tr: 'Eşdeğer Değişim Üyeliği',
    de: 'Äquivalenztausch-Mitgliedschaft',
  },
  type: 'license',
  rarity: 'legendary',
  value: 100,
  category: 'license',
  description: {
    en: 'Encrypted syndicate certificate granting full operational rights in the galactic Equivalent Exchange System (E.E.Sys) network.',
    tr: 'Galaktik Eşdeğer Değişim Sistemi (E.E.Sys) ağında tam operasyonel haklar sağlayan şifreli sendika sertifikası.',
    de: 'Verschlüsseltes Syndikatszertifikat, das volle Zugriffsrechte im galaktischen Äquivalenztausch-Netzwerk (E.E.Sys) gewährt.',
  },
};

// Ensure catalog always includes the membership item for inventory resolution
EE_CATALOG_ITEMS.push(MEMBERSHIP_ITEM);

export function getItemName(item, lang = 'en') {
  if (!item) return '';
  if (typeof item.name === 'object') {
    return item.name[lang] || item.name.en || '';
  }
  return item.name || '';
}

export function getItemDesc(item, lang = 'en') {
  if (!item) return '';
  if (typeof item.description === 'object') {
    return item.description[lang] || item.description.en || '';
  }
  return item.description || '';
}

export default function EESysMarketplace({
  player,
  inventoryItems = [],
  onUpdateInventory,
  onUpdateCredits,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'weapons' | 'armor' | 'tech' | 'consumables' | 'materials' | 'ship' | 'sell'
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localDesigns, setLocalDesigns] = useState([]);

  const currentCredits = player?.credits ?? 250;
  const playerId = player?.id || player?.uid;

  // Check if user has "Equivalent Exchange Membership"
  const hasMembership =
    Boolean(player?.hasEEMembership) ||
    (playerId && typeof window !== 'undefined' && localStorage.getItem(`unendingvoid:ee_membership:${playerId}`) === 'true') ||
    (Array.isArray(player?.inventory) &&
      (player.inventory.includes('item_ee_membership') || player.inventory.includes('ee_membership'))) ||
    inventoryItems.some((it) => {
      if (!it) return false;
      if (typeof it === 'string') return it === 'item_ee_membership' || it === 'ee_membership';
      const itName = typeof it.name === 'object' ? (it.name?.en || '') : (it.name || '');
      return (
        itName.toLowerCase().includes('equivalent exchange') ||
        it.id === 'item_ee_membership' ||
        it.id === 'ee_membership' ||
        it.type === 'license'
      );
    });

  // Calculate owned quantity for a given material/component
  const getMaterialCount = (matId) => {
    let count = 0;
    if (Array.isArray(inventoryItems)) {
      count = inventoryItems.filter((it) => (typeof it === 'string' ? it === matId : it?.id === matId)).length;
    }
    return count;
  };

  // Check if player has unlocked the design/blueprint for an item
  const hasDesign = (itemId) => {
    const designKey = `design_${itemId}`;
    const inLocal = localDesigns.includes(itemId) || localDesigns.includes(designKey);
    const inPlayer = Array.isArray(player?.designs) && (player.designs.includes(itemId) || player.designs.includes(designKey));
    const inInventory = inventoryItems.some((it) => {
      if (!it) return false;
      const id = typeof it === 'string' ? it : it.id;
      return id === designKey || (id === itemId && it.type === 'design');
    });
    const inStorage = playerId && typeof window !== 'undefined' && localStorage.getItem(`unendingvoid:design:${playerId}:${itemId}`) === 'true';
    return Boolean(inLocal || inPlayer || inInventory || inStorage);
  };

  const handleAcquireMembership = async () => {
    try {
      const cost = Math.min(100, currentCredits);
      const newCredits = Math.max(0, currentCredits - cost);

      if (playerId && typeof window !== 'undefined') {
        localStorage.setItem(`unendingvoid:ee_membership:${playerId}`, 'true');
      }

      if (playerId) {
        await setPlayerEEMembership(playerId, true);
        await updateCredits(playerId, newCredits);
      }

      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, MEMBERSHIP_ITEM]);

      setPurchaseSuccessMsg('✨ Equivalent Exchange Membership verified! E.E.Sys network unlocked.');
      setTimeout(() => setPurchaseSuccessMsg(null), 5000);
    } catch (err) {
      console.warn('[EESys] Membership local unlock:', err.message);
      if (playerId && typeof window !== 'undefined') {
        localStorage.setItem(`unendingvoid:ee_membership:${playerId}`, 'true');
      }
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, MEMBERSHIP_ITEM]);
    }
  };

  // ── PATH 3: DIRECT SYSTEM BUY (PAY FULL CREDITS, NO COMPONENTS OR DESIGN NEEDED) ──
  const handleDirectBuy = async (catalogItem) => {
    if (currentCredits < catalogItem.value) {
      alert(`${t('eesys.insufficientCredits', 'Insufficient Credits')}! ${catalogItem.value} ₢ > ${currentCredits} ₢`);
      return;
    }

    const newCredits = currentCredits - catalogItem.value;
    const localizedName = getItemName(catalogItem, currentLang);

    try {
      if (playerId) {
        await addItemToInventory(playerId, catalogItem.id);
        await updateCredits(playerId, newCredits);
      }
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, catalogItem]);

      setPurchaseSuccessMsg(`✅ ${t('eesys.requisitionSuccess', 'Requisitioned')}: ${localizedName} (-${catalogItem.value} ₢)`);
      setTimeout(() => setPurchaseSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('[EESys] Local buy:', err.message);
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, catalogItem]);
    }
  };

  // Helper to remove consumed crafting ingredients from inventory
  const consumeRecipeIngredients = (recipe) => {
    let updatedInv = [...inventoryItems];
    for (const ing of recipe) {
      for (let i = 0; i < ing.count; i++) {
        const idx = updatedInv.findIndex((it) => (typeof it === 'string' ? it === ing.id : it.id === ing.id));
        if (idx !== -1) {
          updatedInv.splice(idx, 1);
        }
      }
    }
    return updatedInv;
  };

  // ── PATH 1: COMPONENTS + DESIGN CREATE THE ITEM FOR FREE (0 ₡) ──
  const handleFabricateWithComponents = async (catalogItem) => {
    const localizedName = getItemName(catalogItem, currentLang);
    const updatedInv = consumeRecipeIngredients(catalogItem.recipe);
    updatedInv.push(catalogItem);

    try {
      if (playerId) {
        await updatePlayerInventory(playerId, updatedInv.map((it) => (typeof it === 'string' ? it : it.id)));
      }
      if (onUpdateInventory) onUpdateInventory(updatedInv);

      setPurchaseSuccessMsg(`🛠️ ${t('eesys.synthesizeSuccess', 'Item successfully synthesized via E.E.Sys nanofabricator!')} (${localizedName})`);
      setTimeout(() => setPurchaseSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('[EESys] Local craft:', err.message);
      if (onUpdateInventory) onUpdateInventory(updatedInv);
    }
  };

  // ── PATH 2: HAVE COMPONENTS BUT NO DESIGN -> PAY FOR DESIGN & FABRICATE ──
  const handleUnlockAndFabricate = async (catalogItem) => {
    const cost = catalogItem.designCost || Math.floor(catalogItem.value * 0.35);
    if (currentCredits < cost) {
      alert(`${t('eesys.insufficientCredits', 'Insufficient Credits')}! Design costs ${cost} ₢.`);
      return;
    }

    const newCredits = currentCredits - cost;
    const localizedName = getItemName(catalogItem, currentLang);
    const updatedInv = consumeRecipeIngredients(catalogItem.recipe);
    updatedInv.push(catalogItem);

    // Save design permanently
    setLocalDesigns((prev) => [...prev, catalogItem.id]);
    if (playerId && typeof window !== 'undefined') {
      localStorage.setItem(`unendingvoid:design:${playerId}:${catalogItem.id}`, 'true');
    }

    try {
      if (playerId) {
        await addPlayerDesign(playerId, catalogItem.id);
        await updatePlayerInventory(playerId, updatedInv.map((it) => (typeof it === 'string' ? it : it.id)));
        await updateCredits(playerId, newCredits);
      }
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory(updatedInv);

      setPurchaseSuccessMsg(`📜 ${t('eesys.designUnlockedSuccess', 'Schematic design permanently registered to your neural datapad!')} & 🛠️ ${localizedName}`);
      setTimeout(() => setPurchaseSuccessMsg(null), 5000);
    } catch (err) {
      console.warn('[EESys] Local unlock & craft:', err.message);
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory(updatedInv);
    }
  };

  // ── BUY DESIGN DIRECTLY (ONE-TIME PURCHASE) ──
  const handleBuyDesignDirect = async (catalogItem) => {
    const cost = catalogItem.designCost || Math.floor(catalogItem.value * 0.35);
    if (currentCredits < cost) {
      alert(`${t('eesys.insufficientCredits', 'Insufficient Credits')}! Design costs ${cost} ₢.`);
      return;
    }

    const newCredits = currentCredits - cost;
    const localizedName = getItemName(catalogItem, currentLang);

    setLocalDesigns((prev) => [...prev, catalogItem.id]);
    if (playerId && typeof window !== 'undefined') {
      localStorage.setItem(`unendingvoid:design:${playerId}:${catalogItem.id}`, 'true');
    }

    try {
      if (playerId) {
        await addPlayerDesign(playerId, catalogItem.id);
        await updateCredits(playerId, newCredits);
      }
      if (onUpdateCredits) onUpdateCredits(newCredits);

      setPurchaseSuccessMsg(`📜 ${t('eesys.designUnlockedSuccess', 'Schematic design permanently registered to your neural datapad!')} (${localizedName})`);
      setTimeout(() => setPurchaseSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('[EESys] Local design purchase:', err.message);
      if (onUpdateCredits) onUpdateCredits(newCredits);
    }
  };

  // ── QUICK-BUY MATERIAL FROM CARD ──
  const handleBuyMaterialById = async (matId) => {
    const matItem = EE_MATERIALS.find((m) => m.id === matId);
    if (!matItem) return;
    await handleDirectBuy(matItem);
  };

  const handleSellItem = async (item) => {
    const sellValue = Math.max(5, Math.floor((item.value || 20) * 0.7));
    const newCredits = currentCredits + sellValue;

    try {
      if (playerId) {
        await removeItemFromInventory(playerId, item.id);
        await updateCredits(playerId, newCredits);
      }
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory(inventoryItems.filter((it) => it.id !== item.id));

      const itemName = getItemName(item, currentLang);
      setPurchaseSuccessMsg(`💰 Sold: ${itemName} (+${sellValue} ₢)`);
      setTimeout(() => setPurchaseSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('[EESys] Local sell:', err.message);
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory(inventoryItems.filter((it) => it.id !== item.id));
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // LOCKED TERMINAL VIEW (IF NO MEMBERSHIP)
  // ════════════════════════════════════════════════════════════════════════════
  if (!hasMembership) {
    return (
      <div className="space-y-6 animate-fade-in font-mono">
        <div className="glass-panel p-6 border-l-4 border-l-neon-red bg-red-950/20 shadow-[0_0_35px_rgba(255,0,85,0.2)]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-neon-red/20 border-2 border-neon-red flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(255,0,85,0.4)] shrink-0">
              🔒
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-neon-red/20 text-neon-red border border-neon-red/50 animate-pulse">
                  RESTRICTED ACCESS TERMINAL
                </span>
                <span className="text-gray-400 text-xs">SEC-PROTOCOL // 403-FORBIDDEN</span>
              </div>
              <h2 className="font-display text-xl md:text-2xl font-black text-white tracking-wide">
                EQUIVALENT EXCHANGE SYSTEM (E.E.Sys)
              </h2>
              <p className="text-gray-300 text-xs leading-relaxed max-w-3xl">
                The <strong className="text-neon-cyan">Equivalent Exchange System (E.E.Sys)</strong> is an encrypted,
                interstellar tactical supply network. Access to military-grade weapons, cybernetic implants, starship
                ordnance, and galactic trading relays is strictly limited to verified syndicate operatives.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 border border-white/10 space-y-6">
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Prerequisite Requirement: Equivalent Exchange Membership
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                To unlock and requisition gear through the E.E.Sys terminal, you must acquire an official membership license.
              </p>
            </div>
            <span className="text-xs text-neon-cyan font-bold">
              Current Balance: {currentCredits} ₢
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="glass-panel p-5 border-2 border-neon-purple bg-neon-purple/10 shadow-[0_0_25px_rgba(168,85,247,0.25)] space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-neon-purple/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-2xl">🎫</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-neon-purple/30 text-purple-200 border border-neon-purple/60 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                  Legendary Syndicate License
                </span>
              </div>

              <h4 className="font-display text-lg font-black text-white tracking-wide">
                Equivalent Exchange Membership
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Biometrically locked dark-matter token that grants persistent orbital uplink, peer-to-peer gear exchange,
                and high-tier weapons requisition across all sectors.
              </p>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">Requisition Fee:</span>
                <span className="font-display font-black text-xl text-neon-cyan">
                  100 Credits (₢)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-black/30 p-4 rounded-lg border border-white/10 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2 text-neon-cyan font-bold">
                  <span>ℹ️</span>
                  <span>How to activate E.E.Sys:</span>
                </div>
                <p>1. Click the button below to purchase your Equivalent Exchange Membership.</p>
                <p>2. The credentials will be added to your operative inventory.</p>
                <p>3. The E.E.Sys marketplace tab will instantly unlock with full requisition rights.</p>
              </div>

              <button
                onClick={handleAcquireMembership}
                className="w-full py-3.5 px-6 rounded-xl font-display font-black text-sm uppercase tracking-wider
                           bg-neon-cyan/20 hover:bg-neon-cyan/35 text-neon-cyan border-2 border-neon-cyan
                           shadow-[0_0_20px_rgba(0,240,255,0.35)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)]
                           hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <span>🛒</span>
                <span>Acquire Equivalent Exchange Membership (100 Credits)</span>
              </button>

              {currentCredits < 100 && (
                <p className="text-[11px] text-amber-400/90 text-center italic">
                  Note: Even if your current credit balance is below 100, the Syndicate Emergency Grant will waive the
                  difference to activate your license immediately.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UNLOCKED MARKETPLACE TERMINAL (OPERATIVE HAS MEMBERSHIP)
  // ════════════════════════════════════════════════════════════════════════════
  const filteredCatalog = EE_CATALOG_ITEMS.filter((item) => {
    if (item.id === 'item_ee_membership') return false;
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const itemName = getItemName(item, currentLang);
    const itemDesc = getItemDesc(item, currentLang);
    const matchesSearch =
      !searchQuery ||
      itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      itemDesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in font-mono">
      {/* Toast notification */}
      {purchaseSuccessMsg && (
        <div className="glass-panel p-3 border-neon-green bg-green-950/40 text-neon-green text-xs font-bold flex items-center justify-between shadow-[0_0_20px_rgba(0,255,136,0.3)] animate-bounce-short">
          <span>{purchaseSuccessMsg}</span>
          <button onClick={() => setPurchaseSuccessMsg(null)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Terminal Header & Status */}
      <div className="glass-panel p-5 border-l-4 border-l-neon-cyan shadow-[0_0_30px_rgba(0,240,255,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-neon-cyan/20 border-2 border-neon-cyan flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(0,240,255,0.35)]">
            🏪
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-black text-white tracking-wide">
                EQUIVALENT EXCHANGE SYSTEM // E.E.Sys
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-neon-green/20 text-neon-green border border-neon-green/50">
                ACTIVE MEMBER
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Interstellar Requisition & Black Market Trading Terminal · Sector 7 Uplink Online
            </p>
          </div>
        </div>

        {/* Operative Credit Vault */}
        <div className="glass-panel px-4 py-2 border-neon-cyan/40 bg-white/5 flex items-center gap-3">
          <span className="text-xl">💳</span>
          <div>
            <span className="text-[10px] uppercase text-gray-400 block tracking-wider">Credit Vault</span>
            <span className="font-display text-xl font-black text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">
              {currentCredits} ₢
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `🌐 ${t('eesys.allCatalog', 'All Catalog')}` },
            { id: 'weapons', label: `⚔️ ${t('eesys.weapons', 'Weapons')}` },
            { id: 'armor', label: `🛡️ ${t('eesys.armor', 'Armor')}` },
            { id: 'tech', label: `🧬 ${t('eesys.tech', 'Cyberware')}` },
            { id: 'consumables', label: `💉 ${t('eesys.medical', 'Medical')}` },
            { id: 'materials', label: `🧱 ${t('eesys.materials', 'Materials & Components')}` },
            { id: 'ship', label: `🚀 ${t('eesys.shipParts', 'Ship Parts')}` },
            { id: 'sell', label: `💰 ${t('eesys.sellCargo', 'Sell Cargo')}` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-xs transition-all whitespace-nowrap
                         ${activeCategory === cat.id
                           ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                           : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {activeCategory !== 'sell' && (
          <input
            type="text"
            placeholder="Search requisition catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-void-bg border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-neon-cyan focus:outline-none w-full sm:w-64"
          />
        )}
      </div>

      {/* ── SELL CARGO SECTION ── */}
      {activeCategory === 'sell' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Operative Cargo Hold ({inventoryItems.length} items available to liquidate)</span>
            <span className="text-neon-green">Payout: ~70% Market Value</span>
          </div>

          {inventoryItems.length === 0 ? (
            <div className="glass-panel p-8 text-center text-gray-500 text-xs border-dashed border-white/10">
              No cargo in operative inventory to liquidate.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {inventoryItems.map((item, idx) => {
                const itemName = getItemName(item, currentLang);
                const sellValue = Math.max(5, Math.floor((item.value || 20) * 0.7));
                const isLicense = item.id === 'item_ee_membership' || item.type === 'license';

                return (
                  <div
                    key={`${item.id}-${idx}`}
                    className="glass-panel p-3.5 border-white/10 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-display font-bold text-sm text-white">{itemName}</h4>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-gray-300">
                          {item.type || 'gear'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {getItemDesc(item, currentLang)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-xs font-bold text-neon-green">+{sellValue} ₢</span>
                      {isLicense ? (
                        <span className="text-[10px] text-gray-500 italic">E.E. License (Protected)</span>
                      ) : (
                        <button
                          onClick={() => handleSellItem(item)}
                          className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold transition-all"
                        >
                          Liquidate (+{sellValue} ₢)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── REQUISITION & CRAFTING CATALOG SECTION ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCatalog.map((item) => {
            const itemName = getItemName(item, currentLang);
            const itemDesc = getItemDesc(item, currentLang);
            const canAffordDirect = currentCredits >= item.value;
            const ownsDesign = hasDesign(item.id);
            const hasRecipe = Array.isArray(item.recipe) && item.recipe.length > 0;
            const designPrice = item.designCost || Math.floor(item.value * 0.35);
            const canAffordDesign = currentCredits >= designPrice;

            // Check if player has all recipe materials
            const hasAllComponents = hasRecipe
              ? item.recipe.every((ing) => getMaterialCount(ing.id) >= ing.count)
              : false;

            const rarityBorder =
              item.rarity === 'alien'
                ? 'border-neon-cyan/50'
                : item.rarity === 'legendary'
                  ? 'border-neon-purple/50'
                  : item.rarity === 'rare'
                    ? 'border-blue-500/40'
                    : 'border-white/15';

            return (
              <div
                key={item.id}
                className={`glass-panel p-4 flex flex-col justify-between transition-all border ${rarityBorder} hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-display font-bold text-sm text-white tracking-wide">
                      {itemName}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-wider
                                 ${item.rarity === 'alien'
                                   ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 animate-pulse'
                                   : item.rarity === 'legendary'
                                     ? 'bg-neon-purple/20 text-purple-300 border border-neon-purple/50'
                                     : item.rarity === 'rare'
                                       ? 'bg-blue-950/40 text-blue-300 border border-blue-500/30'
                                       : 'bg-white/10 text-gray-300 border border-white/20'}`}
                    >
                      {item.rarity}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                    {itemDesc}
                  </p>

                  {/* Attributes */}
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono pt-1">
                    {item.damage && (
                      <span className="text-neon-red font-bold">⚔️ {item.damage}</span>
                    )}
                    {item.defense && (
                      <span className="text-neon-cyan font-bold">🛡️ {item.defense}</span>
                    )}
                    {item.effect && (
                      <span className="text-neon-green font-bold">✨ {item.effect}</span>
                    )}
                    {item.range && (
                      <span className="text-gray-400">📏 {item.range}</span>
                    )}
                  </div>

                  {/* ── RECIPE & COMPONENTS BREAKDOWN (IF CRAFTABLE) ── */}
                  {hasRecipe && (
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 font-bold uppercase flex items-center gap-1">
                          <span>🧱</span> {t('eesys.components', 'Components')}:
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            hasAllComponents
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/50'
                              : 'bg-amber-950/60 text-amber-400 border border-amber-500/50'
                          }`}
                        >
                          {hasAllComponents
                            ? `✔ ${t('eesys.componentsReady', 'Components Ready')}`
                            : `⚠️ ${t('eesys.missingComponents', 'Components Missing')}`}
                        </span>
                      </div>

                      {/* Ingredient list */}
                      <div className="grid grid-cols-1 gap-1 text-[11px] font-mono">
                        {item.recipe.map((ing) => {
                          const ownedCount = getMaterialCount(ing.id);
                          const isComplete = ownedCount >= ing.count;
                          const matDef = EE_MATERIALS.find((m) => m.id === ing.id);
                          const matName = matDef ? getItemName(matDef, currentLang) : ing.id;
                          const matCost = matDef?.value || 25;

                          return (
                            <div
                              key={ing.id}
                              className="flex items-center justify-between bg-black/40 px-2 py-1 rounded border border-white/5"
                            >
                              <span className="text-gray-300 truncate max-w-[130px]">{matName}</span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold ${
                                    isComplete ? 'text-neon-green' : 'text-amber-400'
                                  }`}
                                >
                                  {ownedCount}/{ing.count}
                                </span>
                                {!isComplete && (
                                  <button
                                    type="button"
                                    onClick={() => handleBuyMaterialById(ing.id)}
                                    title={`Buy 1x for ₡${matCost}`}
                                    className="px-1.5 py-0.5 bg-neon-cyan/15 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 rounded text-[9px] font-bold transition-all"
                                  >
                                    +{matCost}₢
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Design / Schematic Status */}
                      <div className="flex items-center justify-between text-[11px] bg-slate-900/60 p-1.5 rounded border border-slate-800">
                        <span className="text-gray-400 flex items-center gap-1">
                          <span>📜</span> {t('eesys.design', 'Schematic Design')}:
                        </span>
                        {ownsDesign ? (
                          <span className="text-emerald-400 font-bold text-[10px]">
                            ✔ {t('eesys.designOwned', 'Design Unlocked')}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-300 text-[10px]">
                              {designPrice} ₢
                            </span>
                            <button
                              type="button"
                              disabled={!canAffordDesign}
                              onClick={() => handleBuyDesignDirect(item)}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                                canAffordDesign
                                  ? 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border-purple-500/50'
                                  : 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                              }`}
                            >
                              {t('eesys.buyDesignOnly', 'Buy Design')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── ACTION PROCUREMENT CONSOLE (3 PATHS) ── */}
                <div className="pt-3 mt-3 border-t border-white/10 space-y-2">
                  {/* PATH 1 & 2: FABRICATION BUTTONS IF CRAFTABLE */}
                  {hasRecipe && (
                    <>
                      {hasAllComponents && ownsDesign && (
                        <button
                          type="button"
                          onClick={() => handleFabricateWithComponents(item)}
                          className="w-full py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 text-emerald-300 border border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 active:scale-98"
                        >
                          <span>🛠️</span>
                          <span>{t('eesys.fabricateFree', 'Synthesize (0 ₡)')}</span>
                        </button>
                      )}

                      {hasAllComponents && !ownsDesign && (
                        <button
                          type="button"
                          disabled={!canAffordDesign}
                          onClick={() => handleUnlockAndFabricate(item)}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                            canAffordDesign
                              ? 'bg-gradient-to-r from-amber-600/25 to-orange-600/30 hover:from-amber-600/40 hover:to-orange-600/50 text-amber-300 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] active:scale-98'
                              : 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                          }`}
                        >
                          <span>📜</span>
                          <span>
                            {canAffordDesign
                              ? `${t('eesys.unlockAndFabricate', 'Unlock Design & Synthesize')} (${designPrice} ₢)`
                              : `${t('eesys.insufficientCredits', 'Insufficient Credits')} (${designPrice} ₢)`}
                          </span>
                        </button>
                      )}
                    </>
                  )}

                  {/* PATH 3: DIRECT MONEY REQUISITION TO SYSTEM */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase block font-mono">
                        {item.category === 'materials' ? 'Unit Price' : 'Direct Requisition'}
                      </span>
                      <span className="font-display text-sm font-bold text-neon-cyan">
                        {item.value} ₢
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDirectBuy(item)}
                      disabled={!canAffordDirect}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all border ${
                        canAffordDirect
                          ? 'bg-neon-cyan/20 hover:bg-neon-cyan/35 text-neon-cyan border-neon-cyan/60 shadow-[0_0_10px_rgba(0,240,255,0.25)] active:scale-95'
                          : 'bg-white/5 text-gray-500 border-white/10 cursor-not-allowed'
                      }`}
                    >
                      {canAffordDirect
                        ? (item.category === 'materials'
                            ? `Buy (${item.value} ₢)`
                            : t('eesys.directRequisition', 'Direct Buy'))
                        : 'Short Credits'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
