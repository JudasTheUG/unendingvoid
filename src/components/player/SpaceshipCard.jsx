import React from 'react';
import { useTranslation } from 'react-i18next';

export default function SpaceshipCard({ ship, locale = 'en' }) {
  const { t } = useTranslation();

  if (!ship) {
    return (
      <div className="glass-panel p-5 border-dashed border-white/10 text-center text-gray-500 text-xs">
        <span className="text-xl block mb-1">🚀</span>
        {t('spaceship.noVesselDocked', 'No active vessel docked. Travel via planetary transport.')}
      </div>
    );
  }

  const name = typeof ship.name === 'object' ? (ship.name[locale] || ship.name.en || ship.id) : ship.name;
  const description =
    typeof ship.description === 'object'
      ? (ship.description[locale] || ship.description.en || '')
      : ship.description;

  return (
    <div className="glass-panel p-5 border-l-4 border-l-neon-purple shadow-[0_0_20px_rgba(170,68,255,0.15)]">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-neon-purple text-base">🚀</span>
          <h2 className="font-display text-xs text-gray-300 uppercase tracking-widest">
            {t('spaceship.dockedVessel', 'Docked Vessel')}
          </h2>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neon-purple/20 text-purple-300 border border-neon-purple/40">
          {ship.rarity || 'Vessel'}
        </span>
      </div>

      <h3 className="font-display text-base font-bold text-white mb-1">{name}</h3>
      {description && <p className="text-xs text-gray-400 mb-4">{description}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-white/5 font-mono text-xs">
        <div className="bg-white/5 p-2 rounded border border-white/5">
          <span className="text-[10px] text-gray-400 block uppercase">
            {t('spaceship.subWarpSpeed', 'Sub-Warp Speed')}
          </span>
          <span className="text-amber-400 font-bold text-sm">⚡ {ship.subWarpSpeed || ship.speed || 0} km/s</span>
        </div>
        <div className="bg-white/5 p-2 rounded border border-white/5">
          <span className="text-[10px] text-gray-400 block uppercase">
            {t('spaceship.shipAC', 'Ship AC')}
          </span>
          <span className="text-neon-cyan font-bold text-sm">🛡️ {ship.armorClass || 16}</span>
        </div>
        <div className="bg-white/5 p-2 rounded border border-white/5">
          <span className="text-[10px] text-gray-400 block uppercase">
            {t('spaceship.hullIntegrity', 'Hull Integrity')}
          </span>
          <span className="text-neon-green font-bold text-sm">
            🛡️ {typeof ship.hull === 'number' ? ship.hull : (ship.maxHull || ship.hullPoints || 100)} / {ship.maxHull || ship.hullPoints || 100} HP
          </span>
        </div>
        <div className="bg-white/5 p-2 rounded border border-white/5">
          <span className="text-[10px] text-gray-400 block uppercase">
            {t('spaceship.deflectorEnergy', 'Deflector Energy')}
          </span>
          <span className="text-cyan-400 font-bold text-sm">
            🔰 {typeof ship.shields === 'number' ? ship.shields : (ship.maxShields || 120)} / {ship.maxShields || 120} MW
          </span>
        </div>
      </div>
    </div>
  );
}
