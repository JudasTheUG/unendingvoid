import React from 'react';

export default function CombatTracker({
  players = [],
  turnOrder = [],
  currentTurn = 0,
  combatActive = false,
  onToggleCombat,
  onNextTurn,
  onPrevTurn,
  onRollInitiative,
}) {
  const activePlayer = turnOrder[currentTurn];

  return (
    <div className="glass-panel p-5 border-l-4 border-l-neon-red shadow-[0_0_20px_rgba(255,51,68,0.15)]">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-neon-red text-base">⚔️</span>
          <h2 className="font-display text-xs text-gray-300 uppercase tracking-widest">
            Tactical Combat & Initiative
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCombat}
            className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider transition-all
                       ${combatActive
                         ? 'bg-neon-red text-white shadow-[0_0_12px_rgba(255,51,68,0.5)]'
                         : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            {combatActive ? 'Combat Active' : 'Start Combat'}
          </button>
        </div>
      </div>

      {combatActive ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-neon-red/30">
            <div>
              <span className="text-[10px] uppercase font-mono text-gray-400 block">Current Action</span>
              <span className="font-display text-base font-bold text-neon-cyan">
                {players.find((p) => p.id === activePlayer)?.displayName || activePlayer || 'No Operative'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPrevTurn}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-xs text-gray-300 font-mono"
              >
                ◀ Prev
              </button>
              <button
                onClick={onNextTurn}
                className="px-3 py-1 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 rounded text-xs font-mono font-bold"
              >
                Next Turn ▶
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono text-gray-400">Initiative Order</span>
            <div className="flex flex-wrap gap-2">
              {turnOrder.map((playerId, idx) => {
                const player = players.find((p) => p.id === playerId);
                const isActive = idx === currentTurn;
                return (
                  <div
                    key={playerId}
                    className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 border transition-all
                               ${isActive
                                 ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)] font-bold'
                                 : 'bg-white/5 text-gray-400 border-white/10'}`}
                  >
                    <span className="text-[10px] text-gray-500">{idx + 1}.</span>
                    <span>{player?.displayName || playerId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-gray-400 py-2">
          <span>Party is in free exploration mode. Initiative paused.</span>
          {onRollInitiative && (
            <button
              onClick={onRollInitiative}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-mono text-neon-cyan"
            >
              Roll Group Initiative
            </button>
          )}
        </div>
      )}
    </div>
  );
}
