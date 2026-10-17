import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import VitalBar from '../shared/VitalBar';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import RollContextMenu from '../shared/RollContextMenu';
import ShipBuilder from './ShipBuilder';
import NavalShipyard from './NavalShipyard';
import { shipModulesCatalog } from '../../lib/shipModulesCatalog';

export const DEFAULT_SHIP = {
  id: 'ship_kusaragi',
  name: 'Kusaragi',
  classType: 'Strike Corvette',
  rarity: 'Legendary',
  hull: 180,
  maxHull: 180,
  shields: 210,
  maxShields: 210,
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
  ship = undefined,
  inventoryItems = [],
  player = null,
  onUpdateCredits,
  onUpdateInventory,
  onUpdateShipName,
  onUpdateShip,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const hasOwnedShip = ship === undefined ? true : Boolean(ship && ship.name && ship.id !== 'none');
  const [activeShip, setActiveShip] = useState(() => {
    if (ship === undefined) return DEFAULT_SHIP;
    return ship || null;
  });
  const [viewMode, setViewMode] = useState(hasOwnedShip ? 'flightDeck' : 'shipyard');

  const [hull, setHull] = useState(() => (typeof activeShip?.hull === 'number' ? activeShip.hull : (activeShip?.maxHull ?? 180)));
  const [shields, setShields] = useState(() => (typeof activeShip?.shields === 'number' ? activeShip.shields : (activeShip?.maxShields ?? 120)));
  const [shipName, setShipName] = useState(() => {
    if (!activeShip) return '';
    return typeof activeShip.name === 'object' ? activeShip.name.en : (activeShip.name || 'Kusaragi');
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [customDmgInput, setCustomDmgInput] = useState(25);
  const [justSaved, setJustSaved] = useState(false);

  const flashSaved = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  useEffect(() => {
    if (ship) {
      setActiveShip(ship);
      setHull(typeof ship.hull === 'number' ? ship.hull : (ship.maxHull ?? 180));
      setShields(typeof ship.shields === 'number' ? ship.shields : (ship.maxShields ?? 120));
      const name = typeof ship.name === 'object' ? (ship.name[currentLang] || ship.name.en) : (ship.name || 'Kusaragi');
      setShipName(name);
    } else if (ship === null) {
      setActiveShip(null);
      setShipName('');
    }
  }, [ship, currentLang]);

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

  const handleRepairHull = (amount = 25) => {
    if (!activeShip) return;
    const maxH = activeShip.maxHull ?? 180;
    const newHull = Math.min(maxH, hull + amount);
    setHull(newHull);
    const updatedShip = { ...activeShip, hull: newHull, shields };
    setActiveShip(updatedShip);
    if (onUpdateShip) onUpdateShip(updatedShip);
    flashSaved();
  };

  const handleRechargeShields = () => {
    if (!activeShip) return;
    const maxS = activeShip.maxShields ?? 120;
    setShields(maxS);
    const updatedShip = { ...activeShip, hull, shields: maxS };
    setActiveShip(updatedShip);
    if (onUpdateShip) onUpdateShip(updatedShip);
    flashSaved();
  };

  const handleFullOverhaul = () => {
    if (!activeShip) return;
    const maxH = activeShip.maxHull ?? 180;
    const maxS = activeShip.maxShields ?? 120;
    setHull(maxH);
    setShields(maxS);
    const updatedShip = { ...activeShip, hull: maxH, shields: maxS };
    setActiveShip(updatedShip);
    if (onUpdateShip) onUpdateShip(updatedShip);
    flashSaved();
  };

  const handleTakeDamage = (damageAmount) => {
    if (!activeShip) return;
    const dmg = Math.max(0, Number(damageAmount) || 0);
    if (dmg <= 0) return;

    let newShields = shields;
    let newHull = hull;

    if (newShields >= dmg) {
      newShields -= dmg;
    } else {
      const remainingDmg = dmg - newShields;
      newShields = 0;
      newHull = Math.max(0, newHull - remainingDmg);
    }

    setShields(newShields);
    setHull(newHull);
    const updatedShip = { ...activeShip, hull: newHull, shields: newShields };
    setActiveShip(updatedShip);
    if (onUpdateShip) onUpdateShip(updatedShip);
    flashSaved();
  };

  const handleAdjustHull = (delta) => {
    if (!activeShip) return;
    const maxH = activeShip.maxHull ?? 180;
    const newHull = Math.max(0, Math.min(maxH, hull + delta));
    setHull(newHull);
    const updatedShip = { ...activeShip, hull: newHull, shields };
    setActiveShip(updatedShip);
    if (onUpdateShip) onUpdateShip(updatedShip);
    flashSaved();
  };

  const handleAdjustShields = (delta) => {
    if (!activeShip) return;
    const maxS = activeShip.maxShields ?? 120;
    const newShields = Math.max(0, Math.min(maxS, shields + delta));
    setShields(newShields);
    const updatedShip = { ...activeShip, hull, shields: newShields };
    setActiveShip(updatedShip);
    if (onUpdateShip) onUpdateShip(updatedShip);
    flashSaved();
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    if (onUpdateShipName) onUpdateShipName(shipName);
  };

  const handleCommissionShip = (newShip) => {
    const cost = newShip.price;
    const currentCredits = player?.credits ?? 0;
    const remainingCredits = Math.max(0, currentCredits - cost);

    if (onUpdateCredits) onUpdateCredits(remainingCredits);

    const shipState = {
      ...newShip,
      name: typeof newShip.name === 'object' ? (newShip.name[currentLang] || newShip.name.en) : newShip.name,
    };

    setActiveShip(shipState);
    setHull(newShip.hull);
    setShields(newShip.shields);
    setShipName(shipState.name);

    if (onUpdateShip) onUpdateShip(shipState);
    if (onUpdateShipName) onUpdateShipName(shipState.name);

    setViewMode('flightDeck');
  };

  const handleAssembleShip = (newModules, newStats) => {
    if (!activeShip) return;
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
      {/* Expanse/Cyberpunk Tactical Mode Tabs: Flight Deck | Drydock Modifier | Naval Shipyard */}
      <div className="flex border-b border-slate-700/80 gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setViewMode('flightDeck')}
          className={`px-5 py-3 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-t-2 border-l border-r whitespace-nowrap ${
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
          className={`px-5 py-3 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-t-2 border-l border-r whitespace-nowrap ${
            viewMode === 'drydock'
              ? 'bg-[#0e1628] text-[#ea580c] border-t-[#ea580c] border-l-slate-700 border-r-slate-700 shadow-[0_0_15px_rgba(234,88,12,0.15)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent'
          }`}
        >
          <span>🛠️</span>
          <span>{t('spaceship.drydockTab', 'Drydock Ship Modifier')}</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('shipyard')}
          className={`px-5 py-3 rounded-t-lg font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border-t-2 border-l border-r whitespace-nowrap ${
            viewMode === 'shipyard'
              ? 'bg-[#0e1628] text-amber-400 border-t-amber-400 border-l-slate-700 border-r-slate-700 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40 border-transparent'
          }`}
        >
          <span>⚓</span>
          <span>{t('spaceship.shipyardTab', 'Naval Shipyard')}</span>
        </button>
      </div>

      {/* VIEW 2: DRYDOCK SHIP MODIFIER */}
      {viewMode === 'drydock' && (
        <ShipBuilder
          player={player}
          activeShip={activeShip}
          inventoryItems={inventoryItems}
          onAssemble={handleAssembleShip}
          hasOwnedShip={Boolean(activeShip)}
          onNavigateShipyard={() => setViewMode('shipyard')}
        />
      )}

      {/* VIEW 3: NAVAL SHIPYARD */}
      {viewMode === 'shipyard' && (
        <NavalShipyard
          player={player}
          activeShip={activeShip}
          onCommissionShip={handleCommissionShip}
        />
      )}

      {/* VIEW 1: TACTICAL FLIGHT DECK (When No Ship Owned) */}
      {viewMode === 'flightDeck' && !activeShip && (
        <div className="tactical-panel p-8 text-center border-dashed border-slate-700/80 space-y-4 max-w-2xl mx-auto my-12 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-500/50 flex items-center justify-center text-3xl mx-auto shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            🛸
          </div>
          <h3 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-wide">
            {t('spaceship.unassignedNotice', 'No Starship Assigned')}
          </h3>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-mono">
            {t(
              'spaceship.unassignedFlightDeckDesc',
              'Flight deck offline. You do not currently command a starship. A vessel can be commissioned at the Naval Shipyard or assigned by your Campaign Flight Director (DM).'
            )}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setViewMode('shipyard')}
              className="py-3 px-6 rounded font-bold text-xs uppercase tracking-wider bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.25)] transition-all inline-flex items-center gap-2 active:scale-95"
            >
              <span>⚓</span>
              <span>{t('spaceship.visitShipyard', 'Visit Naval Shipyard')}</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: TACTICAL FLIGHT DECK (Active Ship Owned) */}
      {viewMode === 'flightDeck' && activeShip && (
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
                    {typeof activeShip.description === 'object'
                      ? activeShip.description[currentLang] || activeShip.description.en
                      : activeShip.description}
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-5 items-start">
              <div className="lg:col-span-2 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <VitalBar
                        label={t('spaceship.hullIntegrity', 'Starship Hull Integrity')}
                        current={hull}
                        max={activeShip.maxHull ?? 180}
                        type="hp"
                      />
                    </div>
                    <div className="flex items-center gap-1 ml-4 pt-4">
                      <button
                        type="button"
                        onClick={() => handleAdjustHull(-10)}
                        title="-10 Hull"
                        className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-700/60 text-xs font-mono font-bold"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustHull(10)}
                        title="+10 Hull"
                        className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 text-xs font-mono font-bold"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <VitalBar
                        label={t('spaceship.deflectorEnergy', 'Deflector Energy Capacitors')}
                        current={shields}
                        max={activeShip.maxShields ?? 120}
                        type="shield"
                      />
                    </div>
                    <div className="flex items-center gap-1 ml-4 pt-4">
                      <button
                        type="button"
                        onClick={() => handleAdjustShields(-10)}
                        title="-10 Deflectors"
                        className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-700/60 text-xs font-mono font-bold"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustShields(10)}
                        title="+10 Deflectors"
                        className="px-2 py-0.5 rounded bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 text-xs font-mono font-bold"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#070b14] p-4 rounded-lg border border-slate-700 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 font-bold">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {t('spaceship.damageControl', 'Engineering Damage Control')}
                  </span>
                  {justSaved && (
                    <span className="text-[10px] font-mono text-neon-green animate-pulse">
                      ✓ {t('spaceship.vitalsSynced', 'Vitals Saved')}
                    </span>
                  )}
                </div>

                {/* Repair & Recharge Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRepairHull(25)}
                    className="py-2 px-2 rounded bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/60 font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  >
                    🛠️ {t('spaceship.repairHull', 'Nano Repair (+25)')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRechargeShields}
                    className="py-2 px-2 rounded bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/60 font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                  >
                    ⚡ {t('spaceship.rechargeDeflectors', 'Recharge Deflectors')}
                  </button>
                </div>

                {/* Combat Damage & Full Restore */}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={customDmgInput}
                      onChange={(e) => setCustomDmgInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-center font-mono text-xs text-white"
                      title={t('spaceship.damageAmount', 'Amount')}
                    />
                    <button
                      type="button"
                      onClick={() => handleTakeDamage(customDmgInput)}
                      className="flex-1 py-1.5 px-2 rounded bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/60 font-bold text-[11px] uppercase transition-all"
                    >
                      💥 {t('spaceship.applyDamage', 'Damage')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRepairHull(customDmgInput)}
                      className="py-1.5 px-2 rounded bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-bold text-[11px] uppercase transition-all"
                    >
                      🛠️ {t('spaceship.applyRepair', 'Repair')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleFullOverhaul}
                    className="w-full py-1.5 rounded bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/50 font-bold text-[10px] uppercase tracking-wider transition-all"
                  >
                    🏥 {t('spaceship.fullRestore', 'Full Overhaul')}
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
                  {Array.isArray(activeShip.modules)
                    ? activeShip.modules.length
                    : Object.keys(activeShip.modules || {}).length}{' '}
                  {t('spaceship.systemsOnline', 'Systems Online')}
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
                  : Object.entries(activeShip.modules || {}).map(([slotKey, modId]) => {
                      const catalogArr = slotKey.startsWith('weapon')
                        ? shipModulesCatalog.weapons
                        : shipModulesCatalog[slotKey];
                      const mod = catalogArr?.find((m) => m.id === modId);
                      const isNone =
                        !modId ||
                        modId === 'wpn_none' ||
                        modId === 'shield_none' ||
                        modId === 'cargo_none' ||
                        modId === 'warp_none' ||
                        modId === 'scan_none';
                      const modName = isNone
                        ? t('spaceship.emptyBay', 'Empty Bay')
                        : mod?.name?.[currentLang] || mod?.name?.en || modId;

                      return (
                        <div
                          key={slotKey}
                          className="p-3 rounded bg-[#070b14] border border-slate-800 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                              {t(`spaceship.slots.${slotKey}`, slotKey)}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                isNone
                                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-500/50'
                              }`}
                            >
                              {isNone ? 'UNMOUNTED' : 'ONLINE'}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-xs block ${
                              isNone ? 'text-slate-500 italic' : 'text-white'
                            }`}
                          >
                            {modName}
                          </span>
                        </div>
                      );
                    })}
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
