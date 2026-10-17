import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_SHIPS, getLocalizedShipName, getLocalizedShipDesc } from '../../lib/shipyardCatalog';

export default function NavalShipyard({
  player = null,
  activeShip = null,
  onCommissionShip,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [commissionSuccess, setCommissionSuccess] = useState(null);
  const playerCredits = player?.credits ?? 0;

  const handleCommission = (ship) => {
    if (playerCredits < ship.price) return;

    if (onCommissionShip) {
      onCommissionShip(ship);
    }
    const localizedName = getLocalizedShipName(ship, currentLang);
    setCommissionSuccess(localizedName);
    setTimeout(() => {
      setCommissionSuccess(null);
    }, 6000);
  };

  const getShipIcon = (classType = '') => {
    if (classType.includes('Scout')) return '🛸';
    if (classType.includes('Corvette')) return '🚀';
    if (classType.includes('Frigate')) return '🛳️';
    if (classType.includes('Interceptor')) return '⚡';
    return '🚀';
  };

  return (
    <div className="space-y-6 font-mono text-slate-200 animate-fade-in">
      {/* Shipyard Header Banner */}
      <div className="tactical-panel p-5 border-l-4 border-l-[#00f0ff] shadow-[0_0_25px_rgba(0,240,255,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 text-[10px] font-bold tracking-wider uppercase">
              TYCHO FLEET NAVAL SHIPYARD // BERTH 01-A
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest">
              AUTHORIZED COMMISSION TERMINAL
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-black text-white uppercase tracking-wider mt-1 flex items-center gap-2.5">
            <span>⚓</span>
            {t('spaceship.shipyardTitle', 'Tycho Fleet Naval Shipyard // Commissioning Berth')}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t(
              'spaceship.shipyardSubtitle',
              'Procure certified voidcraft hulls, assault corvettes, and stealth interceptors'
            )}
          </p>
        </div>

        {/* Available Credits Badge */}
        <div className="shrink-0 bg-slate-900/90 border border-amber-500/50 rounded-lg px-4 py-2.5 flex items-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <span className="text-xl">💳</span>
          <div>
            <span className="text-[10px] text-amber-400/80 uppercase font-mono block">
              {t('eesys.balance', 'Available Balance')}
            </span>
            <span className="text-base md:text-lg font-bold font-mono text-amber-300">
              ₡{playerCredits.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {commissionSuccess && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded-lg flex items-center gap-3 animate-fade-in shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <span className="text-2xl animate-bounce">🚀</span>
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wide">
              {t('spaceship.shipCommissioned', 'Ship commissioned successfully! Welcome aboard, Commander.')}
            </h4>
            <p className="text-xs text-emerald-400/90 font-mono mt-0.5">
              {commissionSuccess} {t('spaceship.systemsOnline', 'Systems Online')}
            </p>
          </div>
        </div>
      )}

      {/* Starship Catalog Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {BASE_SHIPS.map((ship) => {
          const isOwned = activeShip && (activeShip.id === ship.id || activeShip.name === ship.name.en);
          const canAfford = playerCredits >= ship.price;
          const localizedName = getLocalizedShipName(ship, currentLang);
          const localizedDesc = getLocalizedShipDesc(ship, currentLang);
          const icon = getShipIcon(ship.classType);

          return (
            <div
              key={ship.id}
              className={`tactical-panel p-5 transition-all flex flex-col justify-between relative group ${
                isOwned
                  ? 'border-emerald-500/70 bg-[#06141a]/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                  : 'hover:border-neon-cyan/50'
              }`}
            >
              <div>
                {/* Header: Class + Rarity + Price */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:border-neon-cyan/60 transition-colors">
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-display font-black text-white tracking-wide">
                        {localizedName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-neon-cyan font-bold">{ship.classType}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-[10px] text-purple-400 uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-950/40 border border-purple-500/30">
                          {ship.rarity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-mono">Cost</span>
                    <span className="text-base font-bold font-mono text-amber-300">
                      ₡{ship.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Lore / Description */}
                <p className="text-xs text-slate-400 leading-relaxed mb-4 min-h-[38px]">
                  {localizedDesc}
                </p>

                {/* Tactical Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mb-4">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">
                      {t('spaceship.specs.hullHP', 'Hull HP')}
                    </span>
                    <span className="text-neon-green font-bold text-sm">🛡️ {ship.hull} HP</span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">
                      {t('spaceship.specs.shields', 'Shields')}
                    </span>
                    <span className="text-neon-cyan font-bold text-sm">🔰 {ship.shields} MW</span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">
                      {t('spaceship.subWarpSpeed', 'Sub-Warp')}
                    </span>
                    <span className="text-amber-400 font-bold text-sm">⚡ {ship.subWarpSpeed} km/s</span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-[9px] text-slate-500 uppercase block">
                      {t('spaceship.shipAC', 'Ship AC')}
                    </span>
                    <span className="text-purple-300 font-bold text-sm">🎯 AC {ship.armorClass}</span>
                  </div>
                </div>

                {/* Weapons & Cargo Overview */}
                <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800/80 mb-4 text-[11px] font-mono space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>📦 {t('spaceship.cargoBayLabel', 'Cargo Bay')}:</span>
                    <span className="text-slate-200 font-bold">{ship.cargoCapacity} m³</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>🎯 {t('spaceship.battery', 'Battery')}:</span>
                    <span className="text-neon-cyan truncate max-w-[200px]">
                      {ship.weapons.map((w) => (typeof w.name === 'object' ? w.name[currentLang] || w.name.en : w.name)).join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase / Status Action Button */}
              <div>
                {isOwned ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-500/60 cursor-default flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <span>✔</span>
                    <span>{t('spaceship.owned', 'CURRENTLY OWNED')}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => handleCommission(ship)}
                    className={`w-full py-2.5 px-4 rounded font-bold text-xs uppercase tracking-wider transition-all border flex items-center justify-center gap-2 ${
                      canAfford
                        ? 'bg-gradient-to-r from-neon-cyan/25 to-blue-600/30 hover:from-neon-cyan/40 hover:to-blue-600/50 text-white border-neon-cyan/80 shadow-[0_0_20px_rgba(0,240,255,0.25)] active:scale-[0.98]'
                        : 'bg-slate-800/60 text-slate-500 border-slate-700/60 cursor-not-allowed'
                    }`}
                  >
                    <span>{canAfford ? '🛒' : '🔒'}</span>
                    <span>
                      {canAfford
                        ? `${t('spaceship.commissionShip', 'Commission Ship')} (₡${ship.price.toLocaleString()})`
                        : `${t('spaceship.insufficientCredits', 'Insufficient Credits')} (₡${ship.price.toLocaleString()})`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
