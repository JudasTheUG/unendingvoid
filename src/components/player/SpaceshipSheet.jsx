import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import VitalBar from '../shared/VitalBar';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import RollContextMenu from '../shared/RollContextMenu';
import ShipBuilder from './ShipBuilder';

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

export default function SpaceshipSheet({
  ship = null,
  inventoryItems = [],
  onUpdateCredits,
  onUpdateInventory,
  onUpdateShipName,
  onUpdateShip,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [activeShip, setActiveShip] = useState(ship || DEFAULT_SHIP);
  const [viewMode, setViewMode] = useState('flightDeck'); // 'flightDeck' | 'drydock'

  const [hull, setHull] = useState(activeShip.hull || 180);
  const [shields, setShields] = useState(activeShip.shields || 120);
  const [shipName, setShipName] = useState(activeShip.name || 'Kusaragi');
  const [isEditingName, setIsEditingName] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (ship) {
      setActiveShip(ship);
      setHull(ship.hull ?? 180);
      setShields(ship.shields ?? 120);
      setShipName(ship.name || 'Kusaragi');
    }
  }, [ship]);

  const handleWeaponToHit = (wpn, rollMode = 'normal') => {
    const wpnName = typeof wpn.name === 'object' ? wpn.name[currentLang] || wpn.name.en : wpn.name;
    triggerInteractiveRoll('1d20', wpn.toHit, `Ship Battery Hit Check: ${wpnName}`, rollMode);
  };

  const handleWeaponDamage = (wpn, rollMode = 'normal') => {
    const wpnName = typeof wpn.name === 'object' ? wpn.name[currentLang] || wpn.name.en : wpn.name;
    triggerInteractiveRoll(
      wpn.damageDice,
      wpn.damageBonus,
      `Ship Ordnance Damage: ${wpnName} (${wpn.damageType})`,
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

  const handleAssembleShip = (newModules, newStats) => {
    const newShipState = {
      ...activeShip,
      modules: newModules,
      maxHull: newStats.maxHull,
      hull: Math.min(hull, newStats.maxHull),
      maxShields: newStats.maxShields,
      shields: Math.min(shields, newStats.maxShields),
      armorClass: newStats.armorClass,
      subWarpSpeed: newStats.subWarpSpeed,
      cargoCapacity: newStats.cargoCapacity,
      weapons: newStats.weapons,
    };
    setActiveShip(newShipState);
    setHull(Math.min(hull, newStats.maxHull));
    setShields(Math.min(shields, newStats.maxShields));
    setViewMode('flightDeck');

    if (onUpdateShip) onUpdateShip(newShipState);
  };

  return (
    <div className="space-y-6 animate-fade-in font-mono text-slate-200">
      {/* Expanse/Cyberpunk Tactical Mode Tabs */}
      <div className="flex border-b border-slate-700/80 gap-2">
        <button
          type="button"
          onClick={() => setViewMode('flightDeck')}
          className={`px-5 py-3 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-t-2 border-l border-r ${
            viewMode === 'flightDeck'
              ? 'bg-[#0e1628] text-neon-cyan border-t-neon-cyan border-l-slate-700 border-r-slate-700 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent'
          }`}
        >
          <span>🛰️</span>
          <span>{t('spaceship.flightDeckTab', 'Tactical Flight Deck')}</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('drydock')}
          className={`px-5 py-3 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-t-2 border-l border-r ${
            viewMode === 'drydock'
              ? 'bg-[#0e1628] text-[#ea580c] border-t-[#ea580c] border-l-slate-700 border-r-slate-700 shadow-[0_0_15px_rgba(234,88,12,0.15)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent'
          }`}
        >
          <span>🛠️</span>
          <span>{t('spaceship.drydockTab', 'Drydock Ship Builder')}</span>
        </button>
      </div>

      {viewMode === 'drydock' && (
        <ShipBuilder
          activeShip={activeShip}
          inventoryItems={inventoryItems}
          onAssemble={handleAssembleShip}
        />
      )}

      {viewMode === 'flightDeck' && (
        <>
          {/* Ship Bridge Header Console */}
          <div className="tactical-panel p-6 border-l-4 border-l-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.12)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-slate-700/80 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-neon-cyan/70 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(0,240,255,0.25)] shrink-0">
                  🚀
                </div>
                <div>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={shipName}
                        onChange={(e) => setShipName(e.target.value)}
                        className="bg-[#05080e] border border-neon-cyan px-2.5 py-1 rounded text-white font-display text-xl font-bold focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveName}
                        className="px-3 py-1 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan text-xs font-bold transition-all"
                      >
                        {t('spaceship.save', 'Save')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h1 className="font-display text-2xl md:text-3xl font-black text-white tracking-wide">
                        {shipName}
                      </h1>
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-400 hover:text-neon-cyan text-xs transition-colors"
                        title={t('spaceship.renameVessel', 'Rename Vessel')}
                      >
                        ✏️
                      </button>
                    </div>
                  )}

                  <p className="text-xs font-mono text-neon-cyan mt-1 flex items-center gap-2">
                    <span className="font-bold">{activeShip.classType || 'Strike Corvette'}</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">
                      {t('spaceship.registry', 'Registry')}: #VOID-771
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {activeShip.description}
                  </p>
                </div>
              </div>

              {/* Core Telemetry Badges */}
              <div className="flex flex-wrap items-center gap-2.5 text-center font-mono">
                <div className="bg-[#070b14] px-3.5 py-2 rounded border border-slate-700 min-w-[80px]">
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider">
                    {t('spaceship.shipAC', 'Ship AC')}
                  </span>
                  <span className="text-sm font-black text-neon-cyan mt-0.5">
                    {activeShip.armorClass || 16}
                  </span>
                </div>
                <div className="bg-[#070b14] px-3.5 py-2 rounded border border-slate-700 min-w-[80px]">
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider">
                    {t('spaceship.subWarpSpeed', 'Sub-Warp')}
                  </span>
                  <span className="text-sm font-black text-amber-400 mt-0.5">
                    {activeShip.subWarpSpeed || 42} km/s
                  </span>
                </div>
                <div className="bg-[#070b14] px-3.5 py-2 rounded border border-slate-700 min-w-[80px]">
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider">
                    {t('spaceship.cargoBayLabel', 'Cargo Bay')}
                  </span>
                  <span className="text-sm font-black text-white mt-0.5">
                    {activeShip.cargoUsed || 22}/{activeShip.cargoCapacity || 80} MT
                  </span>
                </div>
                <div className="bg-[#070b14] px-3.5 py-2 rounded border border-emerald-500/50 min-w-[80px] shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider">
                    {t('spaceship.ftlCore', 'FTL Core')}
                  </span>
                  <span className="text-sm font-black text-emerald-400 animate-pulse mt-0.5">
                    {t('spaceship.ftlOnline', 'ONLINE')}
                  </span>
                </div>
              </div>
            </div>

            {/* Ship Vitals & Damage Control Consoles */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5 items-center">
              <div className="lg:col-span-2 space-y-3.5">
                <VitalBar
                  label={t('spaceship.hullIntegrity', 'Starship Hull Integrity')}
                  current={hull}
                  max={activeShip.maxHull || 180}
                  type="hp"
                />
                <VitalBar
                  label={t('spaceship.deflectorEnergy', 'Deflector Energy Capacitors')}
                  current={shields}
                  max={activeShip.maxShields || 120}
                  type="shield"
                />
              </div>

              <div className="bg-[#070b14] p-4 rounded-lg border border-slate-700 space-y-2.5 text-xs">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block border-b border-slate-700/80 pb-1.5 font-bold">
                  {t('spaceship.damageControl', 'Engineering Damage Control')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleRepairHull}
                    className="py-2 px-2.5 rounded bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/60 font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  >
                    🛠️ {t('spaceship.repairHull', 'Nano Repair (+25)')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRechargeShields}
                    className="py-2 px-2.5 rounded bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/60 font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                  >
                    ⚡ {t('spaceship.rechargeDeflectors', 'Recharge Deflectors')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Ship Combat & Systems Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ship Weapon Batteries (2 cols) */}
            <div className="lg:col-span-2 tactical-panel p-5 border-l-4 border-l-neon-cyan space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-neon-cyan text-base">🛰️</span>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                    {t('spaceship.weaponBatteries', 'Vessel Weapon Batteries & Ordnance')}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">
                  {t('spaceship.tacticalRange', 'Tactical Range: Star-Sector 4')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-700/80 text-slate-400 text-[10px] uppercase">
                      <th className="py-2 px-2.5">{t('spaceship.battery', 'Battery')}</th>
                      <th className="py-2 px-2.5">{t('spaceship.range', 'Range')}</th>
                      <th className="py-2 px-2.5 text-center">{t('spaceship.fireSolution', 'Fire Solution')}</th>
                      <th className="py-2 px-2.5 text-center">{t('spaceship.yield', 'Yield')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(activeShip.weapons || DEFAULT_SHIP.weapons).map((wpn, idx) => {
                      const wpnName = typeof wpn.name === 'object' ? wpn.name[currentLang] || wpn.name.en : wpn.name;
                      const toHitStr = wpn.toHit >= 0 ? `+${wpn.toHit}` : `${wpn.toHit}`;
                      const dmgBonusStr = wpn.damageBonus >= 0 ? `+${wpn.damageBonus}` : `${wpn.damageBonus}`;

                      return (
                        <tr key={wpn.id || idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-2.5">
                            <span className="font-display font-bold text-white text-sm block">
                              {wpnName}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase">{wpn.type}</span>
                          </td>
                          <td className="py-3 px-2.5 text-slate-300 text-xs">{wpn.range}</td>

                          {/* Fire Check Button */}
                          <td className="py-3 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleWeaponToHit(wpn, 'normal')}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({
                                  isOpen: true,
                                  position: { x: e.clientX, y: e.clientY },
                                  type: 'd20',
                                  title: `${wpnName} Fire Check`,
                                  diceNotation: '1d20',
                                  bonus: wpn.toHit,
                                  onSelect: (mode) => handleWeaponToHit(wpn, mode),
                                });
                              }}
                              className="px-3.5 py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-500/60 font-black text-sm tracking-wider transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] hover:scale-105 active:scale-95 inline-flex items-center gap-1.5"
                              title={t('spaceship.rollHint', 'Left-click: Normal fire check · Right-click: Advantage / Disadvantage')}
                            >
                              <span>🎯</span>
                              <span>{toHitStr}</span>
                            </button>
                          </td>

                          {/* Damage Yield Button */}
                          <td className="py-3 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleWeaponDamage(wpn, 'normal')}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({
                                  isOpen: true,
                                  position: { x: e.clientX, y: e.clientY },
                                  type: 'damage',
                                  title: `${wpnName} Damage`,
                                  diceNotation: wpn.damageDice,
                                  bonus: wpn.damageBonus,
                                  onSelect: (mode) => handleWeaponDamage(wpn, mode),
                                });
                              }}
                              className="px-3.5 py-1.5 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/60 font-bold text-xs tracking-wider transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 inline-flex items-center gap-1.5"
                              title={t('spaceship.rollHint', 'Left-click: Normal damage · Right-click: Critical Hit')}
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

            {/* Installed Ship Modules & Status (1 col) */}
            <div className="tactical-panel p-5 border-l-4 border-l-[#ea580c] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                  {t('spaceship.installedModules', 'Installed Ship Modules')}
                </h3>
                <span className="text-[10px] text-[#ea580c] font-mono font-bold">
                  {Array.isArray(activeShip.modules) ? activeShip.modules.length : 10} {t('spaceship.systemsOnline', 'Systems Online')}
                </span>
              </div>

              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {Array.isArray(activeShip.modules)
                  ? activeShip.modules.map((mod) => (
                      <div
                        key={mod.id}
                        className="p-3 rounded bg-[#070b14] border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs">{mod.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/50">
                            {mod.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">{mod.desc}</p>
                      </div>
                    ))
                  : Object.entries(activeShip.modules || {}).map(([slotKey, modId]) => (
                      <div
                        key={slotKey}
                        className="p-3 rounded bg-[#070b14] border border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {t(`spaceship.slots.${slotKey}`, slotKey)}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/50">
                            ONLINE
                          </span>
                        </div>
                        <span className="font-bold text-white text-xs block">{modId}</span>
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
        </>
      )}
    </div>
  );
}
