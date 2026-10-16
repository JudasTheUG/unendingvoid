import React, { useState } from 'react';
import { addTrait, removeTrait } from '../../lib/playerActions';

export default function TraitAssigner({ players = [], traits = [] }) {
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedTraitId, setSelectedTraitId] = useState('');
  const [loading, setLoading] = useState(false);

  const activePlayers = players.filter((p) => p.role !== 'dm');
  const selectedPlayer = activePlayers.find((p) => p.id === selectedPlayerId);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedTraitId) return;

    setLoading(true);
    try {
      await addTrait(selectedPlayerId, selectedTraitId);
      setSelectedTraitId('');
    } catch (err) {
      console.error('[TraitAssigner] Error adding trait:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (traitId) => {
    if (!selectedPlayerId) return;
    try {
      await removeTrait(selectedPlayerId, traitId);
    } catch (err) {
      console.error('[TraitAssigner] Error removing trait:', err);
    }
  };

  return (
    <div className="glass-panel p-5 border-l-4 border-l-neon-purple shadow-[0_0_15px_rgba(170,68,255,0.15)]">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
        <h2 className="font-display text-xs text-purple-300 uppercase tracking-widest flex items-center gap-2">
          <span>🧬</span> Genetic & Cybernetic Augmenter
        </h2>
        <span className="text-[10px] text-gray-500 font-mono">Real-time Injection</span>
      </div>

      <form onSubmit={handleAssign} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">Target Operative</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-neon-purple focus:outline-none"
            >
              <option value="">Select an Operative...</option>
              {activePlayers.map((p) => (
                <option key={p.id} value={p.id} className="bg-void-surface">
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">Available Trait / Augment</label>
            <select
              value={selectedTraitId}
              onChange={(e) => setSelectedTraitId(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-neon-purple focus:outline-none"
            >
              <option value="">Select Trait Definition...</option>
              {traits.map((t) => (
                <option key={t.id} value={t.id} className="bg-void-surface">
                  {typeof t.name === 'object' ? t.name.en : t.name} ({t.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedPlayerId || !selectedTraitId}
          className="w-full py-1.5 rounded bg-neon-purple/20 hover:bg-neon-purple/30 text-purple-300 border border-neon-purple/50 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(170,68,255,0.2)] disabled:opacity-50"
        >
          {loading ? 'Splicing Genome...' : '🧬 Inject Trait into Operative'}
        </button>
      </form>

      {/* Show active traits of selected player with remove option */}
      {selectedPlayer && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <span className="text-[10px] font-mono uppercase text-gray-400 block mb-2">
            Active Traits on {selectedPlayer.displayName}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(!selectedPlayer.traits || selectedPlayer.traits.length === 0) ? (
              <span className="text-xs text-gray-500 italic">No traits currently active.</span>
            ) : (
              selectedPlayer.traits.map((tId) => {
                const def = traits.find((t) => t.id === tId);
                const name = def ? (typeof def.name === 'object' ? def.name.en : def.name) : tId;
                return (
                  <span
                    key={tId}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-white/5 border border-white/10 text-gray-300"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemove(tId)}
                      className="text-gray-500 hover:text-neon-red font-bold text-xs"
                      title="Revoke Trait"
                    >
                      ×
                    </button>
                  </span>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
