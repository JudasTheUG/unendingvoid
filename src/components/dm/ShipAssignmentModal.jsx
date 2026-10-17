import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BASE_SHIPS, getLocalizedShipName, getLocalizedShipDesc } from '../../lib/shipyardCatalog';
import { assignShipToPlayer, removeShipFromPlayer } from '../../lib/playerActions';

export default function ShipAssignmentModal({ player, onClose, onAssigned }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [selectedHullId, setSelectedHullId] = useState(
    player?.ship?.id || BASE_SHIPS[0].id
  );
  const selectedBaseShip = BASE_SHIPS.find((s) => s.id === selectedHullId) || BASE_SHIPS[0];

  const initialName = player?.ship
    ? (typeof player.ship.name === 'object' ? player.ship.name.en : player.ship.name)
    : (typeof selectedBaseShip.name === 'object' ? selectedBaseShip.name.en : selectedBaseShip.name);

  const [callsign, setCallsign] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const playerId = player?.id || player?.uid;
  const playerName = player?.displayName || player?.name || 'Operative';
  const hasExistingShip = Boolean(player?.ship || player?.spaceship);

  const handleSelectHull = (hull) => {
    setSelectedHullId(hull.id);
    const defName = typeof hull.name === 'object' ? hull.name.en : hull.name;
    setCallsign(defName);
  };

  const handleDeploy = async () => {
    if (!playerId) return;
    setSubmitting(true);
    setError(null);

    const shipToAssign = {
      ...selectedBaseShip,
      name: callsign.trim() || (typeof selectedBaseShip.name === 'object' ? selectedBaseShip.name.en : selectedBaseShip.name),
    };

    try {
      await assignShipToPlayer(playerId, shipToAssign);
      if (onAssigned) onAssigned(shipToAssign);
      onClose();
    } catch (err) {
      console.error('[ShipAssignmentModal] Error deploying ship:', err);
      setError(err.message);
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!playerId) return;
    const confirmRevoke = window.confirm(
      t('spaceship.confirmRevoke', 'Revoke and decommission active starship from this operative?')
    );
    if (!confirmRevoke) return;

    setSubmitting(true);
    setError(null);

    try {
      await removeShipFromPlayer(playerId);
      if (onAssigned) onAssigned(null);
      onClose();
    } catch (err) {
      console.error('[ShipAssignmentModal] Error revoking ship:', err);
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono text-slate-200">
      <div className="tactical-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 border-l-4 border-l-neon-cyan shadow-[0_0_40px_rgba(0,240,255,0.25)] space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-700/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 text-[10px] font-bold tracking-wider uppercase">
                FLEET COMMAND // LOGISTICS
              </span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                DM STARSHIP DEPLOYMENT
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-display font-black text-white uppercase tracking-wider mt-1 flex items-center gap-2">
              <span>🚀</span>
              {t('spaceship.assignShipTitle', 'Fleet Command // Assign Vessel to Operative')}
            </h2>
            <p className="text-xs text-neon-cyan mt-0.5">
              Target Operative: <strong className="text-white">{playerName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-950/60 border border-rose-500 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Hull Class Selector */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
            {t('spaceship.selectShipClass', 'Select Starship Hull Class')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {BASE_SHIPS.map((hull) => {
              const isSelected = selectedHullId === hull.id;
              const localizedName = getLocalizedShipName(hull, currentLang);
              const localizedDesc = getLocalizedShipDesc(hull, currentLang);

              return (
                <button
                  key={hull.id}
                  type="button"
                  onClick={() => handleSelectHull(hull)}
                  className={`text-left p-3 rounded border transition-all ${
                    isSelected
                      ? 'border-neon-cyan bg-neon-cyan/10 ring-1 ring-neon-cyan/60 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-bold text-sm text-white">{localizedName}</span>
                    <span className="text-[10px] text-neon-cyan font-bold">{hull.classType}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                    {localizedDesc}
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-300 border-t border-slate-800/80 pt-1.5 font-mono">
                    <span>🛡️ {hull.hull} HP</span>
                    <span>🔰 {hull.shields} MW</span>
                    <span>⚡ {hull.subWarpSpeed} km/s</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Callsign / Ship Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
            {t('spaceship.customShipName', 'Vessel Callsign / Custom Name (Optional)')}
          </label>
          <input
            type="text"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value)}
            placeholder="e.g. Kusaragi, Rocinante, Voidstalker"
            className="w-full bg-[#05080e] border border-slate-700 focus:border-neon-cyan px-3.5 py-2 rounded text-white text-sm font-mono focus:outline-none transition-colors"
          />
        </div>

        {/* Selected Hull Summary */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded text-xs space-y-1 font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Armor Class:</span>
            <span className="text-white font-bold">AC {selectedBaseShip.armorClass}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Cargo Capacity:</span>
            <span className="text-white font-bold">{selectedBaseShip.cargoCapacity} m³</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Default Batteries:</span>
            <span className="text-neon-cyan font-bold truncate max-w-[280px]">
              {selectedBaseShip.weapons.map((w) => (typeof w.name === 'object' ? w.name[currentLang] || w.name.en : w.name)).join(', ')}
            </span>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700/80">
          <div>
            {hasExistingShip && (
              <button
                type="button"
                disabled={submitting}
                onClick={handleRevoke}
                className="w-full sm:w-auto px-4 py-2 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/40 text-xs font-bold uppercase tracking-wider transition-all"
              >
                🗑️ {t('spaceship.revokeShip', 'Revoke / Decommission Ship')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs uppercase tracking-wider transition-all font-bold"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDeploy}
              className="px-5 py-2 rounded bg-gradient-to-r from-neon-cyan/30 to-blue-600/40 hover:from-neon-cyan/50 hover:to-blue-600/60 text-white border border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.3)] text-xs uppercase tracking-wider transition-all font-bold flex items-center gap-2"
            >
              <span>🚀</span>
              <span>
                {submitting
                  ? t('common.saving', 'Deploying...')
                  : t('spaceship.deployShip', 'Deploy Vessel to Operative')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
