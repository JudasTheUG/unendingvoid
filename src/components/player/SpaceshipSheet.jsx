import React, { useState } from 'react';
import VitalBar from '../shared/VitalBar';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import RollContextMenu from '../shared/RollContextMenu';

export const DEFAULT_SHIP = {
  id: 'ship_kusaragi',
  name: 'Kusaragi',
  classType: 'Strike Corvette',
  rarity: 'Legendary',
  hull: 180,
  maxHull: 180,
  shields: 120,
  maxShields: 120,
  subWarpSpeed: 42, // km/s
  armorClass: 16,
  cargoCapacity: 80,
  cargoUsed: 22,
  description:
    'A customized black-ops strike corvette outfitted with silenced ion thrusters, tachyon deflectors, and heavy railgun batteries.',
  weapons: [
    {
      id: 'ship_wpn_railgun',
      name: 'Twin Gauss Railguns',
      type: 'Kinetic Battery',
      toHit: 6,
      damageDice: '2d10',
      damageBonus: 4,
      damageType: 'Kinetic',
      range: '2,000 / 8,000 km',
    },
    {
      id: 'ship_wpn_plasma',
      name: 'Heavy Plasma Lance',
      type: 'Thermal Beam',
      toHit: 5,
      damageDice: '3d8',
      damageBonus: 3,
      damageType: 'Thermal',
      range: '1,500 / 5,000 km',
    },
    {
      id: 'ship_wpn_torpedo',
      name: 'Proton Torpedo Silo',
      type: 'Heavy Ordnance',
      toHit: 7,
      damageDice: '4d6',
      damageBonus: 2,
      damageType: 'Explosive',
      range: '5,000 / 15,000 km',
    },
  ],
  modules: [
    { id: 'mod_cloak', name: 'Phase Cloaking Field', status: 'ONLINE', desc: 'Optical and radar sensor invisibility' },
    { id: 'mod_repair', name: 'Auto-Repair Nano Drones', status: 'ACTIVE', desc: 'Repairs 10 Hull HP per long cruise' },
    { id: 'mod_sensor', name: 'Subspace Sensor Array', status: 'ONLINE', desc: 'Scan enemy vessels within 10 AU' },
    { id: 'mod_ftl', name: 'Class-5 Hyperdrive Core', status: 'READY', desc: 'Instantaneous sub-space jump capability' },
  ],
};

export default function SpaceshipSheet({ ship = null, onUpdateShipName }) {
  const activeShip = ship || DEFAULT_SHIP;

  const [hull, setHull] = useState(activeShip.hull || 180);
  const [shields, setShields] = useState(activeShip.shields || 120);
  const [shipName, setShipName] = useState(activeShip.name || 'Kusaragi');
  const [isEditingName, setIsEditingName] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  const handleWeaponToHit = (wpn, rollMode = 'normal') => {
    triggerInteractiveRoll('1d20', wpn.toHit, `Ship Battery Hit Check: ${wpn.name}`, rollMode);
  };

  const handleWeaponDamage = (wpn, rollMode = 'normal') => {
    triggerInteractiveRoll(
      wpn.damageDice,
      wpn.damageBonus,
      `Ship Ordnance Damage: ${wpn.name} (${wpn.damageType})`,
      rollMode
    );
  };

  const handleRepairHull = () => {
    setHull((prev) => Math.min(activeShip.maxHull || 180, prev + 25));
  };

  const handleRechargeShields = () => {
    setShields(activeShip.maxShields || 120);
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    if (onUpdateShipName) onUpdateShipName(shipName);
  };

  return (
    <div className="space-y-6 animate-fade-in font-mono">
      {/* Ship Bridge Header */}
      <div className="glass-panel p-6 border-l-4 border-l-neon-purple shadow-[0_0_30px_rgba(168,85,247,0.2)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neon-purple/20 border-2 border-neon-purple flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(168,85,247,0.35)] shrink-0">
              🚀
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shipName}
                    onChange={(e) => setShipName(e.target.value)}
                    className="bg-void-bg border border-neon-cyan px-2 py-1 rounded text-white font-display text-xl font-bold focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-2.5 py-1 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan text-xs font-bold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-2xl md:text-3xl font-black text-white tracking-wide">
                    {shipName}
                  </h1>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-gray-400 hover:text-neon-cyan text-xs"
                    title="Rename Vessel"
                  >
                    ✏️
                  </button>
                </div>
              )}
              <p className="text-xs font-mono text-neon-purple mt-0.5">
                {activeShip.classType || 'Strike Corvette'} · Registry: #VOID-771
              </p>
              <p className="text-[11px] text-gray-400 mt-1 max-w-2xl leading-relaxed">
                {activeShip.description}
              </p>
            </div>
          </div>

          {/* Core Ship Badges */}
          <div className="flex flex-wrap items-center gap-2 text-center font-mono">
            <div className="glass-panel px-3 py-1.5 border-white/10 min-w-[75px]">
              <span className="text-[9px] uppercase text-gray-400 block">Ship AC</span>
              <span className="text-sm font-bold text-neon-cyan">{activeShip.armorClass || 16}</span>
            </div>
            <div className="glass-panel px-3 py-1.5 border-white/10 min-w-[75px]">
              <span className="text-[9px] uppercase text-gray-400 block">Sub-Warp</span>
              <span className="text-sm font-bold text-amber-300">{activeShip.subWarpSpeed || 42} km/s</span>
            </div>
            <div className="glass-panel px-3 py-1.5 border-white/10 min-w-[75px]">
              <span className="text-[9px] uppercase text-gray-400 block">Cargo Bay</span>
              <span className="text-sm font-bold text-white">
                {activeShip.cargoUsed}/{activeShip.cargoCapacity} MT
              </span>
            </div>
            <div className="glass-panel px-3 py-1.5 border-neon-green/40 min-w-[75px]">
              <span className="text-[9px] uppercase text-gray-400 block">FTL Core</span>
              <span className="text-sm font-bold text-neon-green animate-pulse">ONLINE</span>
            </div>
          </div>
        </div>

        {/* Ship Vitals Bars & Emergency Consoles */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 items-center">
          <div className="lg:col-span-2 space-y-3">
            <VitalBar label="Starship Hull Integrity" current={hull} max={activeShip.maxHull || 180} type="hp" />
            <VitalBar
              label="Deflector Energy Capacitors"
              current={shields}
              max={activeShip.maxShields || 120}
              type="shield"
            />
          </div>

          <div className="bg-black/40 p-3.5 rounded-lg border border-white/10 space-y-2 text-xs">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block border-b border-white/10 pb-1">
              Engineering Damage Control
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRepairHull}
                className="py-1.5 px-2 rounded bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border border-neon-green/40 font-bold text-[11px] uppercase transition-all"
              >
                🛠️ Nano Repair (+25)
              </button>
              <button
                onClick={handleRechargeShields}
                className="py-1.5 px-2 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 font-bold text-[11px] uppercase transition-all"
              >
                ⚡ Recharge Deflectors
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Ship Combat & Systems Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ship Weapon Batteries (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-5 border-l-4 border-l-neon-cyan space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-neon-cyan text-base">🛰️</span>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Vessel Weapon Batteries & Ordnance
              </h3>
            </div>
            <span className="text-[10px] text-gray-400">Tactical Range: Star-Sector 4</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase">
                  <th className="py-2 px-2">Battery</th>
                  <th className="py-2 px-2">Range</th>
                  <th className="py-2 px-2 text-center">Fire Solution</th>
                  <th className="py-2 px-2 text-center">Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(activeShip.weapons || DEFAULT_SHIP.weapons).map((wpn) => {
                  const toHitStr = wpn.toHit >= 0 ? `+${wpn.toHit}` : `${wpn.toHit}`;
                  const dmgBonusStr = wpn.damageBonus >= 0 ? `+${wpn.damageBonus}` : `${wpn.damageBonus}`;

                  return (
                    <tr key={wpn.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-2">
                        <span className="font-display font-bold text-white text-sm block">
                          {wpn.name}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase">{wpn.type}</span>
                      </td>
                      <td className="py-2.5 px-2 text-gray-300 text-xs">{wpn.range}</td>

                      {/* Clickable Fire To-Hit Button */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleWeaponToHit(wpn, 'normal')}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              isOpen: true,
                              position: { x: e.clientX, y: e.clientY },
                              type: 'd20',
                              title: `${wpn.name} Fire Check`,
                              diceNotation: '1d20',
                              bonus: wpn.toHit,
                              onSelect: (mode) => handleWeaponToHit(wpn, mode),
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-neon-cyan/15 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 font-black text-sm tracking-wider transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] hover:scale-105 active:scale-95 inline-flex items-center gap-1.5"
                          title="Left-click: Normal fire check · Right-click: Advantage / Disadvantage"
                        >
                          <span>🎯</span>
                          <span>{toHitStr}</span>
                        </button>
                      </td>

                      {/* Clickable Damage Yield Button with Critical Support */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleWeaponDamage(wpn, 'normal')}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              isOpen: true,
                              position: { x: e.clientX, y: e.clientY },
                              type: 'damage',
                              title: `${wpn.name} Damage`,
                              diceNotation: wpn.damageDice,
                              bonus: wpn.damageBonus,
                              onSelect: (mode) => handleWeaponDamage(wpn, mode),
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs tracking-wider transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 inline-flex items-center gap-1.5"
                          title="Left-click: Normal damage · Right-click: Critical Hit (Double Dice)"
                        >
                          <span>💥</span>
                          <span>
                            {wpn.damageDice}
                            {dmgBonusStr} {wpn.damageType}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ship Modules & Status (1 col) */}
        <div className="glass-panel p-5 border-l-4 border-l-neon-purple space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Installed Ship Modules
            </h3>
            <span className="text-[10px] text-neon-purple font-mono">4 Systems</span>
          </div>

          <div className="space-y-2.5">
            {(activeShip.modules || DEFAULT_SHIP.modules).map((mod) => (
              <div key={mod.id} className="p-2.5 rounded bg-white/5 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{mod.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neon-green/20 text-neon-green border border-neon-green/40">
                    {mod.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right-Click Roll Context Menu */}
      {contextMenu && (
        <RollContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          type={contextMenu.type}
          title={contextMenu.title}
          diceNotation={contextMenu.diceNotation}
          bonus={contextMenu.bonus}
          onSelect={contextMenu.onSelect}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
