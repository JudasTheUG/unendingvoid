import React, { useState } from 'react';
import { addItemToInventory, removeItemFromInventory, updateCredits } from '../../lib/playerActions';

// Curated E.E.Sys Interstellar Marketplace Catalog
export const EE_CATALOG_ITEMS = [
  // ── WEAPONS ──
  {
    id: 'item_plasma_carbine_mk2',
    name: 'Overcharged Pulse Carbine Mk II',
    type: 'weapon',
    rarity: 'rare',
    damage: '2d8 Energy',
    range: '90 / 270 ft.',
    value: 150,
    category: 'weapons',
    description: 'Precision magnetic rail rifle capable of piercing through reinforced ceramite plates.',
  },
  {
    id: 'item_tachyon_blade',
    name: 'Tachyon Vibro-Katana',
    type: 'weapon',
    rarity: 'legendary',
    damage: '1d10+2 Slashing',
    range: 'Melee',
    value: 220,
    category: 'weapons',
    description: 'A blade oscillating at sub-atomic frequencies, slicing through physical matter like smoke.',
  },
  {
    id: 'item_heavy_meltagun',
    name: 'Inferno Heavy Meltagun',
    type: 'weapon',
    rarity: 'alien',
    damage: '3d6 Thermal',
    range: '40 / 120 ft.',
    value: 280,
    category: 'weapons',
    description: 'Ancient alien thermal cannon that turns hull plating and blast doors into molten slag.',
  },

  // ── ARMOR & SHIELDS ──
  {
    id: 'item_aegis_suit',
    name: 'Titanium-Mesh Aegis Rig',
    type: 'armor',
    rarity: 'rare',
    defense: '+3 AC / +10 Shields',
    value: 180,
    category: 'armor',
    description: 'Military combat exoskeleton layered with kinetic absorption gel and kinetic deflectors.',
  },
  {
    id: 'item_void_cloak',
    name: 'Dark-Matter Camouflage Cloak',
    type: 'gear',
    rarity: 'legendary',
    effect: 'Advantage on Stealth checks',
    value: 200,
    category: 'armor',
    description: 'Bends electromagnetic and optical wavelengths around the user for brief invisibility.',
  },

  // ── CYBERWARE & TECH ──
  {
    id: 'item_neuro_synapse',
    name: 'Neural Accelerator Cyber-Implant',
    type: 'cyberware',
    rarity: 'rare',
    effect: '+2 Initiative & Reflex Saves',
    value: 140,
    category: 'tech',
    description: 'Direct-neural cortex bridge overclocking motor reflex signals to superhuman speeds.',
  },
  {
    id: 'item_quantum_decryptor',
    name: 'Zero-Trace Quantum Decryptor',
    type: 'tech',
    rarity: 'uncommon',
    effect: '+3 Arcana / Tech Hacking',
    value: 90,
    category: 'tech',
    description: 'Handheld quantum processor engineered to crack encrypted security nodes in seconds.',
  },

  // ── MEDICAL & CONSUMABLES ──
  {
    id: 'item_nanite_stim',
    name: 'Emergency Nanite Med-Injector',
    type: 'consumable',
    rarity: 'uncommon',
    effect: 'Instantly restores 20 HP',
    value: 35,
    category: 'consumables',
    description: 'Pressurized micro-syringe dispensing medical nanobots that rapidly re-knit torn tissue.',
  },
  {
    id: 'item_shield_cell',
    name: 'Hyper-Capacitor Shield Cell',
    type: 'consumable',
    rarity: 'uncommon',
    effect: 'Recharges 25 Energy Shields',
    value: 40,
    category: 'consumables',
    description: 'Quick-release plasma capacitor that instantly restores discharged personal deflector shields.',
  },

  // ── SHIP MODULES ──
  {
    id: 'item_hyper_thrusters',
    name: 'Vortex Hyper-Drive Thrusters',
    type: 'ship_module',
    rarity: 'legendary',
    effect: '+15 km/s Sub-Warp Speed',
    value: 300,
    category: 'ship',
    description: 'Class-4 ion propulsion engines configured for rapid interstellar tactical maneuvers.',
  },
  {
    id: 'item_torpedo_launcher',
    name: 'Dual Photon Torpedo Rack',
    type: 'ship_module',
    rarity: 'rare',
    damage: '4d10 Explosive',
    value: 260,
    category: 'ship',
    description: 'Ship-mounted heavy ordnance launcher capable of devastating enemy frigates.',
  },
];

export const MEMBERSHIP_ITEM = {
  id: 'item_ee_membership',
  name: 'Equivalent Exchange Membership',
  type: 'license',
  rarity: 'legendary',
  value: 100,
  category: 'license',
  description:
    'Encrypted syndicate certificate granting full operational rights in the galactic Equivalent Exchange System (E.E.Sys) network.',
};

export default function EESysMarketplace({
  player,
  inventoryItems = [],
  onUpdateInventory,
  onUpdateCredits,
}) {
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'weapons' | 'armor' | 'tech' | 'consumables' | 'ship' | 'sell'
  const [purchaseSuccessMsg, setPurchaseSuccessMsg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentCredits = player?.credits ?? 250;
  const playerId = player?.id || player?.uid;

  // Check if user has "Equivalent Exchange Membership"
  const hasMembership =
    player?.hasEEMembership ||
    inventoryItems.some((it) => {
      const itName = typeof it.name === 'object' ? (it.name.en || '') : (it.name || '');
      return (
        itName.toLowerCase().includes('equivalent exchange membership') ||
        it.id === 'item_ee_membership' ||
        it.id === 'ee_membership'
      );
    });

  const handleAcquireMembership = async () => {
    try {
      const cost = Math.min(100, currentCredits);
      const newCredits = Math.max(0, currentCredits - cost);

      // Add membership to inventory
      if (playerId) {
        await addItemToInventory(playerId, MEMBERSHIP_ITEM.id);
        await updateCredits(playerId, newCredits);
      }

      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, MEMBERSHIP_ITEM]);

      setPurchaseSuccessMsg('✨ Equivalent Exchange Membership verified! E.E.Sys network unlocked.');
      setTimeout(() => setPurchaseSuccessMsg(null), 5000);
    } catch (err) {
      console.warn('[EESys] Membership local unlock:', err.message);
      // Fallback local unlock
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, MEMBERSHIP_ITEM]);
    }
  };

  const handleBuyItem = async (catalogItem) => {
    if (currentCredits < catalogItem.value) {
      alert(`Insufficient Credits! You need ${catalogItem.value} ₢, but only have ${currentCredits} ₢.`);
      return;
    }

    const newCredits = currentCredits - catalogItem.value;
    try {
      if (playerId) {
        await addItemToInventory(playerId, catalogItem.id);
        await updateCredits(playerId, newCredits);
      }
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, catalogItem]);

      setPurchaseSuccessMsg(`✅ Requisitioned: ${catalogItem.name} (-${catalogItem.value} ₢)`);
      setTimeout(() => setPurchaseSuccessMsg(null), 4000);
    } catch (err) {
      console.warn('[EESys] Local buy:', err.message);
      if (onUpdateCredits) onUpdateCredits(newCredits);
      if (onUpdateInventory) onUpdateInventory([...inventoryItems, catalogItem]);
    }
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

      const itemName = typeof item.name === 'object' ? item.name.en : item.name;
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
        {/* Holographic Security Warning Banner */}
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

        {/* Informational Requirement & Purchase Card */}
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
            {/* Membership License Hologram Card */}
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

            {/* Action / Buy Button */}
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
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
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
            { id: 'all', label: 'All Catalog' },
            { id: 'weapons', label: '⚔️ Weapons' },
            { id: 'armor', label: '🛡️ Armor' },
            { id: 'tech', label: '🧬 Cyberware' },
            { id: 'consumables', label: '💉 Medical' },
            { id: 'ship', label: '🚀 Ship Parts' },
            { id: 'sell', label: '💰 Sell Cargo' },
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
                const itemName = typeof item.name === 'object' ? item.name.en : item.name;
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
                        {typeof item.description === 'object' ? item.description.en : item.description}
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
        /* ── REQUISITION CATALOG SECTION ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCatalog.map((item) => {
            const canAfford = currentCredits >= item.value;
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
                      {item.name}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-wider
                                 ${item.rarity === 'alien'
                                   ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 animate-pulse'
                                   : item.rarity === 'legendary'
                                     ? 'bg-neon-purple/20 text-purple-300 border border-neon-purple/50'
                                     : 'bg-white/10 text-gray-300 border border-white/20'}`}
                    >
                      {item.rarity}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                    {item.description}
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
                </div>

                <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase block">Requisition Cost</span>
                    <span className="font-display text-base font-bold text-neon-cyan">
                      {item.value} ₢
                    </span>
                  </div>

                  <button
                    onClick={() => handleBuyItem(item)}
                    disabled={!canAfford}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all
                               ${canAfford
                                 ? 'bg-neon-cyan/20 hover:bg-neon-cyan/35 text-neon-cyan border border-neon-cyan/60 shadow-[0_0_10px_rgba(0,240,255,0.25)] hover:scale-105 active:scale-95'
                                 : 'bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed'}`}
                  >
                    {canAfford ? 'Requisition' : 'Short Credits'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
