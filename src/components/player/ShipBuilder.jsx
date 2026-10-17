import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shipModulesCatalog } from '../../lib/shipModulesCatalog';
import { calculateShipDerivedStats, validateShipBuild } from '../../lib/shipValidation';

const SLOT_ORDER = [
  'hull',
  'flightDeck',
  'thrusterEngines',
  'warpDrive',
  'cargoBay',
  'fuelTanks',
  'scanner',
  'landingSystems',
  'weapon1',
  'weapon2',
  'weapon3',
  'reactor',
  'shieldGenerator',
];

const SLOT_ICONS = {
  hull: '🛡️',
  flightDeck: '🎛️',
  thrusterEngines: '🔥',
  warpDrive: '🌀',
  cargoBay: '📦',
  fuelTanks: '⛽',
  scanner: '📡',
  landingSystems: '🛬',
  weapon1: '🎯',
  weapon2: '💥',
  weapon3: '⚡',
  reactor: '⚛️',
  shieldGenerator: '🔰',
};

const UNMOUNT_MAP = {
  weapon1: 'wpn_none',
  weapon2: 'wpn_none',
  weapon3: 'wpn_none',
  shieldGenerator: 'shield_none',
  cargoBay: 'cargo_none',
  warpDrive: 'warp_none',
  scanner: 'scan_none',
};

const isEmptyModule = (modId) => {
  return !modId || modId === 'wpn_none' || modId === 'shield_none' || modId === 'cargo_none' || modId === 'warp_none' || modId === 'scan_none';
};

export default function ShipBuilder({ player = null, activeShip, inventoryItems = [], onAssemble }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [equippedModules, setEquippedModules] = useState(() => {
    if (activeShip && activeShip.modules && !Array.isArray(activeShip.modules) && Object.keys(activeShip.modules).length > 0) {
      return {
        reactor: 'reactor_tokamak_vanguard',
        shieldGenerator: 'shield_harmonic_matrix',
        ...activeShip.modules,
      };
    }
    // Fallback default setup (Strike Corvette Kusaragi class)
    return {
      hull: 'hull_corvette_class_b',
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
      reactor: 'reactor_tokamak_vanguard',
      shieldGenerator: 'shield_harmonic_matrix',
    };
  });

  const [selectedSlot, setSelectedSlot] = useState(null);

  const stats = calculateShipDerivedStats(equippedModules, shipModulesCatalog);
  const validation = validateShipBuild(equippedModules, shipModulesCatalog);

  const handleModuleSelect = (slot, moduleId) => {
    setEquippedModules((prev) => ({ ...prev, [slot]: moduleId }));
    setSelectedSlot(null);
  };

  const playerId = player?.id || player?.uid;
  const isEESysMember =
    Boolean(player?.hasEEMembership) ||
    (playerId && typeof window !== 'undefined' && localStorage.getItem(`unendingvoid:ee_membership:${playerId}`) === 'true') ||
    inventoryItems.some((it) => {
      if (!it) return false;
      if (typeof it === 'string') return it === 'item_ee_membership' || it === 'ee_membership';
      const itName = typeof it.name === 'object' ? (it.name?.en || '') : (it.name || '');
      return (
        it.id === 'item_ee_membership' ||
        it.id === 'ee_membership' ||
        it.type === 'license' ||
        itName.toLowerCase().includes('equivalent exchange')
      );
    });

  // Calculate unowned parts cost compared to current ship modules
  const unownedPartsCost = SLOT_ORDER.reduce((total, slot) => {
    const currentId = equippedModules[slot];
    const originalId = activeShip?.modules?.[slot];

    if (currentId !== originalId) {
      const catalogArr = slot.startsWith('weapon') ? shipModulesCatalog.weapons : shipModulesCatalog[slot];
      const mod = catalogArr?.find((m) => m.id === currentId);
      if (mod) total += mod.value || 0;
    }
    return total;
  }, 0);

  const thrusterModule = shipModulesCatalog.thrusterEngines.find((e) => e.id === equippedModules.thrusterEngines);
  const maxThrustMass = thrusterModule?.maxThrustMass || 1;
  const massRatio = Math.round((stats.totalMass / maxThrustMass) * 100);
  const isMassOverloaded = stats.totalMass > maxThrustMass;

  const powerRatio = stats.reactorOutput > 0 ? Math.round((stats.totalPowerDraw / stats.reactorOutput) * 100) : 100;
  const isPowerOverloaded = stats.totalPowerDraw > stats.reactorOutput;

  return (
    <div className="space-y-6 font-mono text-slate-200">
      {/* MCRN Tycho Drydock Header */}
      <div className="tactical-panel p-5 border-l-4 border-l-[#ea580c] shadow-[0_0_25px_rgba(234,88,12,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/40 text-[10px] font-bold tracking-wider uppercase">
              TYCHO NAVAL SHIPYARD // BAY 04
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">MCRN CLASS-4 DRYDOCK</span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider mt-1 flex items-center gap-2.5">
            <span>🛠️</span>
            {t('spaceship.drydockTitle', 'MCRN Tycho Drydock // Modular Assembly Bay')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('spaceship.drydockSubtitle', 'Modular Vessel Fabrication & Certification Terminal')}
          </p>
        </div>

        {/* Flight Certification Status Badge */}
        <div className="shrink-0">
          {validation.isFlightReady ? (
            <div className="px-4 py-2 bg-emerald-950/80 text-emerald-400 border border-emerald-500/60 rounded flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-xs uppercase tracking-wider">
                🟢 {t('spaceship.flightReady', 'FLIGHT CERTIFIED')}
              </span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-rose-950/80 text-rose-400 border border-rose-500/60 rounded flex items-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold text-xs uppercase tracking-wider">
                🔴 {t('spaceship.flightErrors', 'SYSTEM FLIGHT ERRORS')} ({validation.errors.length})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Blueprint Slots & Arsenal Rack vs Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Modular Bays & Module Selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
              <span className="text-neon-cyan">⬢</span>
              {t('spaceship.modules', 'Ship Modules')} ({SLOT_ORDER.length} Hardpoint Bays)
            </span>
            <span className="text-[10px] text-slate-500 uppercase">Click bay to mount / replace</span>
          </div>

          {/* Modular Bay Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {SLOT_ORDER.map((slot, index) => {
              const modId = equippedModules[slot];
              const catalogArr = slot.startsWith('weapon') ? shipModulesCatalog.weapons : shipModulesCatalog[slot];
              const mod = catalogArr?.find((m) => m.id === modId);
              const isNone = isEmptyModule(modId);

              const slotKey = slot.startsWith('weapon') ? slot : slot;
              const slotLabel = t(`spaceship.slots.${slotKey}`, slot);
              const isSelected = selectedSlot === slot;
              const icon = SLOT_ICONS[slot] || '⚙️';

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(isSelected ? null : slot)}
                  className={`text-left p-3.5 rounded border transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-[#141e33] border-[#ea580c] shadow-[0_0_15px_rgba(234,88,12,0.3)]'
                      : 'bg-[#0a0f1d] border-slate-700/80 hover:border-slate-500 hover:bg-[#0f172a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                      <span>{icon}</span>
                      <span>BAY-{String(index + 1).padStart(2, '0')}</span>
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isSelected ? 'bg-[#ea580c]/30 text-[#ea580c]' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    >
                      {isSelected ? '[ OPEN ]' : '[ + ]'}
                    </span>
                  </div>

                  <span className="block text-[11px] text-slate-400 uppercase font-semibold truncate mb-1">
                    {slotLabel}
                  </span>

                  <span
                    className={`block text-xs font-bold truncate transition-colors ${
                      isNone ? 'text-slate-500 italic group-hover:text-neon-cyan' : 'text-white group-hover:text-neon-cyan'
                    }`}
                  >
                    {mod && !isNone ? mod.name[currentLang] || mod.name.en : t('spaceship.emptyBay', 'Empty Bay')}
                  </span>

                  {/* Micro telemetry badge */}
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{mod?.mass !== undefined && !isNone ? `${mod.mass} MT` : '0 MT'}</span>
                    <span>
                      {mod?.reactorOutput && !isNone
                        ? `+${mod.reactorOutput} MW`
                        : mod?.shields && !isNone
                        ? `+${mod.shields} SH`
                        : mod?.powerDraw !== undefined && !isNone
                        ? `${mod.powerDraw} MW`
                        : '0 MW'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Module Selector Panel (Arsenal Drawer) */}
          {selectedSlot && (
            <div className="tactical-panel p-5 border border-[#ea580c]/60 mt-4 animate-fade-in shadow-[0_0_30px_rgba(0,0,0,0.8)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/80 pb-3 mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[#ea580c] text-lg">⚙️</span>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                      {t('spaceship.availableModules', 'Available Modules')}: {t(`spaceship.slots.${selectedSlot}`, selectedSlot)}
                    </h4>
                    <p className="text-[10px] text-slate-400 uppercase">
                      Select replacement component from naval inventory catalog
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {UNMOUNT_MAP[selectedSlot] && !isEmptyModule(equippedModules[selectedSlot]) && (
                    <button
                      type="button"
                      onClick={() => handleModuleSelect(selectedSlot, UNMOUNT_MAP[selectedSlot])}
                      className="px-2.5 py-1 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 hover:text-white text-xs border border-rose-500/60 transition-colors flex items-center gap-1.5 font-bold"
                    >
                      <span>🗑️</span>
                      <span>{t('spaceship.unmount', 'Unmount / Empty Bay')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-600 transition-colors"
                  >
                    ✕ {t('spaceship.closeBay', 'Close Bay')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {(() => {
                  const catalogArr = selectedSlot.startsWith('weapon')
                    ? shipModulesCatalog.weapons
                    : shipModulesCatalog[selectedSlot] || [];

                  return catalogArr.map((opt) => {
                    const isEquipped = equippedModules[selectedSlot] === opt.id;

                    return (
                      <div
                        key={opt.id}
                        onClick={() => !isEquipped && handleModuleSelect(selectedSlot, opt.id)}
                        className={`p-3.5 border rounded transition-all text-left relative ${
                          isEquipped
                            ? 'bg-orange-950/20 border-[#ea580c]/80 cursor-default'
                            : 'bg-[#070b14] border-slate-700/80 hover:border-neon-cyan/70 hover:bg-[#0c1424] cursor-pointer'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <span className="text-xs font-bold text-white block leading-snug">
                            {opt.name[currentLang] || opt.name.en}
                          </span>
                          {isEquipped ? (
                            <span className="text-[9px] px-2 py-0.5 bg-[#ea580c]/20 text-[#ea580c] border border-[#ea580c]/50 rounded font-bold shrink-0">
                              {t('spaceship.equipped', 'EQUIPPED')}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 shrink-0">
                              ₡{opt.value || 0}
                            </span>
                          )}
                        </div>

                        {/* Module Telemetry Spec Chips */}
                        <div className="text-[10px] text-slate-400 grid grid-cols-2 gap-x-2 gap-y-1 bg-black/40 p-2 rounded border border-slate-800/80">
                          {opt.mass !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.mass', 'Mass')}:</span>{' '}
                              <span className="text-slate-200 font-bold">{opt.mass} MT</span>
                            </div>
                          )}
                          {opt.powerDraw !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.powerDraw', 'Power')}:</span>{' '}
                              <span className="text-slate-200 font-bold">{opt.powerDraw} MW</span>
                            </div>
                          )}
                          {opt.shields !== undefined && opt.shields > 0 && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.shields', 'Shields')}:</span>{' '}
                              <span className="text-cyan-400 font-bold">+{opt.shields}</span>
                            </div>
                          )}
                          {opt.thrust !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.thrust', 'Thrust')}:</span>{' '}
                              <span className="text-amber-400 font-bold">{opt.thrust}</span>
                            </div>
                          )}
                          {opt.hullHP !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.hullHP', 'Hull')}:</span>{' '}
                              <span className="text-emerald-400 font-bold">+{opt.hullHP} HP</span>
                            </div>
                          )}
                          {opt.reactorOutput !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.reactor', 'Output')}:</span>{' '}
                              <span className="text-cyan-400 font-bold">+{opt.reactorOutput} MW</span>
                            </div>
                          )}
                          {opt.fuelCapacity !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.fuel', 'Fuel')}:</span>{' '}
                              <span className="text-slate-200 font-bold">{opt.fuelCapacity}L</span>
                            </div>
                          )}
                          {opt.capacity !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.capacity', 'Cargo')}:</span>{' '}
                              <span className="text-slate-200 font-bold">{opt.capacity} MT</span>
                            </div>
                          )}
                          {opt.maxLandingMass !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.landing', 'Landing')}:</span>{' '}
                              <span className="text-slate-200 font-bold">{opt.maxLandingMass} MT</span>
                            </div>
                          )}
                          {opt.toHit !== undefined && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.toHit', 'Fire Check')}:</span>{' '}
                              <span className="text-cyan-400 font-bold">+{opt.toHit}</span>
                            </div>
                          )}
                          {opt.damageDice && opt.damageDice !== '0' && (
                            <div>
                              <span className="text-slate-500 uppercase">{t('spaceship.specs.yield', 'Yield')}:</span>{' '}
                              <span className="text-amber-400 font-bold">{opt.damageDice}+{opt.damageBonus} {opt.damageType}</span>
                            </div>
                          )}
                        </div>

                        {!isEquipped && (
                          <div className="mt-2 flex justify-end">
                            <span className="text-[10px] text-neon-cyan font-bold uppercase tracking-wider">
                              [ {t('spaceship.mountModule', 'Mount Module')} ]
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Warship Flight Diagnostics & Actions */}
        <div className="space-y-4">
          <div className="tactical-panel p-5 border-slate-700/80 space-y-4">
            <div className="border-b border-slate-700/80 pb-2.5 flex items-center justify-between">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span className="text-neon-cyan">📊</span>
                {t('spaceship.diagnostics', 'Flight Diagnostics')}
              </h3>
              <span className="text-[10px] text-slate-400 uppercase font-mono">TELEMETRY</span>
            </div>

            {/* Mass vs Thrusters */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] uppercase">
                <span className="text-slate-400">{t('spaceship.massVsThrust', 'Mass vs Thrust')}</span>
                <span className={`font-bold ${isMassOverloaded ? 'text-rose-400' : 'text-slate-200'}`}>
                  {stats.totalMass} / {maxThrustMass} MT ({massRatio}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${isMassOverloaded ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-[#ea580c]'}`}
                  style={{ width: `${Math.min(100, massRatio)}%` }}
                />
              </div>
              {isMassOverloaded && (
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wide block">
                  ⚠️ ENGINE THRUST OVERLOAD
                </span>
              )}
            </div>

            {/* Power Grid Balance */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] uppercase">
                <span className="text-slate-400">{t('spaceship.powerGridBalance', 'Reactor Grid Balance')}</span>
                <span className={`font-bold ${isPowerOverloaded ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {stats.totalPowerDraw} / {stats.reactorOutput} MW ({powerRatio}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${isPowerOverloaded ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-neon-cyan'}`}
                  style={{ width: `${Math.min(100, powerRatio)}%` }}
                />
              </div>
              {isPowerOverloaded && (
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide block">
                  ⚡ POWER GRID DEFICIT
                </span>
              )}
            </div>

            {/* 4-Cell Telemetry Matrix */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-center">
              <div className="bg-[#070b14] p-2.5 rounded border border-slate-800">
                <span className="block text-[9px] text-slate-400 uppercase tracking-wider">
                  {t('spaceship.jumpRange', 'Jump Range')}
                </span>
                <span className="block text-sm font-black text-neon-cyan mt-0.5">{stats.jumpRange} LY</span>
              </div>
              <div className="bg-[#070b14] p-2.5 rounded border border-slate-800">
                <span className="block text-[9px] text-slate-400 uppercase tracking-wider">
                  {t('spaceship.subWarp', 'Sub-Warp')}
                </span>
                <span className="block text-sm font-black text-amber-400 mt-0.5">{stats.subWarpSpeed} km/s</span>
              </div>
              <div className="bg-[#070b14] p-2.5 rounded border border-slate-800">
                <span className="block text-[9px] text-slate-400 uppercase tracking-wider">
                  {t('spaceship.maxHpShields', 'Hull / Shields')}
                </span>
                <span className="block text-sm font-black text-emerald-400 mt-0.5">
                  {stats.maxHull} / {stats.maxShields}
                </span>
              </div>
              <div className="bg-[#070b14] p-2.5 rounded border border-slate-800">
                <span className="block text-[9px] text-slate-400 uppercase tracking-wider">
                  {t('spaceship.armorClass', 'Armor Class')}
                </span>
                <span className="block text-sm font-black text-white mt-0.5">AC {stats.armorClass}</span>
              </div>
            </div>

            {/* Error Diagnostics */}
            {validation.errors.length > 0 && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/60 rounded text-[11px] text-rose-200 space-y-2">
                <strong className="block text-rose-400 uppercase font-black tracking-wide flex items-center gap-1.5">
                  <span>⚠️</span> {t('spaceship.criticalErrors', 'CRITICAL SHIP ERRORS')}:
                </strong>
                {validation.errors.map((err, i) => (
                  <p key={i} className="leading-relaxed">
                    • {err.message[currentLang] || err.message.en}
                  </p>
                ))}
              </div>
            )}

            {/* Warning Diagnostics */}
            {validation.warnings.length > 0 && (
              <div className="p-3 bg-amber-950/50 border border-amber-500/60 rounded text-[11px] text-amber-200 space-y-2">
                <strong className="block text-amber-400 uppercase font-black tracking-wide flex items-center gap-1.5">
                  <span>⚡</span> {t('spaceship.warnings', 'TELEMETRY WARNINGS')}:
                </strong>
                {validation.warnings.map((err, i) => (
                  <p key={i} className="leading-relaxed">
                    • {err.message[currentLang] || err.message.en}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Action Console: E.E.Sys Order vs Drydock Assembly */}
          <div className="tactical-panel p-5 border-slate-700/80 text-center space-y-3">
            {unownedPartsCost > 0 ? (
              <button
                type="button"
                disabled={!isEESysMember || !validation.isFlightReady}
                onClick={() => {
                  if (isEESysMember && validation.isFlightReady) {
                    onAssemble(equippedModules, stats);
                  }
                }}
                className={`w-full py-3 px-4 rounded font-bold text-sm uppercase tracking-wider transition-all border ${
                  !isEESysMember
                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                    : validation.isFlightReady
                      ? 'bg-amber-600/25 hover:bg-amber-600/40 text-amber-300 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-[0.98]'
                      : 'bg-rose-950/30 text-rose-400 border-rose-500/50 opacity-60 cursor-not-allowed'
                }`}
              >
                {t('spaceship.orderParts', 'Order Parts via E.E.Sys')} (₡{unownedPartsCost})
              </button>
            ) : (
              <button
                type="button"
                disabled={!validation.isFlightReady}
                onClick={() => {
                  if (validation.isFlightReady) {
                    onAssemble(equippedModules, stats);
                  }
                }}
                className={`w-full py-3 px-4 rounded font-bold text-sm uppercase tracking-wider transition-all border ${
                  validation.isFlightReady
                    ? 'bg-[#ea580c]/25 hover:bg-[#ea580c]/40 text-white border-[#ea580c] shadow-[0_0_15px_rgba(234,88,12,0.3)] active:scale-[0.98]'
                    : 'bg-rose-950/30 text-rose-400 border-rose-500/50 opacity-60 cursor-not-allowed'
                }`}
              >
                {t('spaceship.assemble', 'Assemble Vessel')}
              </button>
            )}

            {!isEESysMember && unownedPartsCost > 0 && (
              <p className="text-[11px] text-rose-400 font-semibold leading-tight">
                🔒 {t('spaceship.eesysRequired', 'Requires Equivalent Exchange Membership (E.E.Sys)')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
