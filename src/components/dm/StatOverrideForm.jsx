import React, { useState, useEffect } from 'react';
import {
  updatePlayerHP,
  updatePlayerShields,
  updatePlayerStat,
  updateCredits,
} from '../../lib/playerActions';

const STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

export default function StatOverrideForm({ player, onClose }) {
  const [hp, setHp] = useState(player?.hp ?? 100);
  const [shields, setShields] = useState(player?.shields ?? 50);
  const [credits, setCredits] = useState(player?.credits ?? 500);
  const [stats, setStats] = useState(player?.stats ?? {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (player) {
      setHp(player.hp ?? 100);
      setShields(player.shields ?? 50);
      setCredits(player.credits ?? 500);
      setStats(player.stats ?? {});
    }
  }, [player]);

  if (!player) return null;

  const handleStatChange = (statName, val) => {
    setStats((prev) => ({ ...prev, [statName]: Number(val) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePlayerHP(player.id, Number(hp));
      await updatePlayerShields(player.id, Number(shields));
      await updateCredits(player.id, Number(credits));
      for (const stat of STATS) {
        if (stats[stat] !== undefined) {
          await updatePlayerStat(player.id, stat, Number(stats[stat]));
        }
      }
      if (onClose) onClose();
    } catch (err) {
      console.error('[DM] Failed to update player:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-5 border-l-4 border-l-neon-green">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
        <div>
          <h2 className="font-display text-xs text-neon-green uppercase tracking-widest">
            Manual Override: {player.displayName}
          </h2>
          <span className="text-[10px] text-gray-500 font-mono">ID: {player.id}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Vitals inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">
              HP (Current / {player.maxHp || 100})
            </label>
            <input
              type="number"
              min="0"
              max={player.maxHp || 100}
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-sm text-neon-green font-mono focus:border-neon-green focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">
              Shields (Current / {player.maxShields || 50})
            </label>
            <input
              type="number"
              min="0"
              max={player.maxShields || 50}
              value={shields}
              onChange={(e) => setShields(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-sm text-neon-cyan font-mono focus:border-neon-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">
              Credits (CR)
            </label>
            <input
              type="number"
              min="0"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-sm text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* 6 Stats inputs */}
        <div>
          <label className="text-[10px] font-mono uppercase text-gray-400 block mb-2">
            Base Attributes (1–20)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {STATS.map((stat) => (
              <div key={stat} className="bg-white/5 p-2 rounded border border-white/5 text-center">
                <span className="text-[10px] uppercase font-mono text-gray-400 block mb-1">
                  {stat.substring(0, 3)}
                </span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={stats[stat] ?? 10}
                  onChange={(e) => handleStatChange(stat, e.target.value)}
                  className="w-full bg-void-bg text-center border border-white/10 rounded py-0.5 text-xs text-white font-mono focus:border-neon-cyan focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-gray-400 hover:text-white font-mono"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-1.5 rounded bg-neon-green/20 hover:bg-neon-green/30 text-neon-green border border-neon-green/50 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(0,255,136,0.2)] disabled:opacity-50"
          >
            {saving ? 'Transmitting...' : 'Apply Overrides'}
          </button>
        </div>
      </form>
    </div>
  );
}
