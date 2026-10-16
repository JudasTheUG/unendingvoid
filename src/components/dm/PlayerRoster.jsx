import React from 'react';
import VitalBar from '../shared/VitalBar';

export default function PlayerRoster({ players = [], selectedPlayerId, onSelectPlayer }) {
  const filteredPlayers = players.filter((p) => p.role !== 'dm');

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
        <h2 className="font-display text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="text-neon-cyan">👥</span> Connected Operatives ({filteredPlayers.length})
        </h2>
        <span className="text-[10px] text-neon-green font-mono flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-neon-green inline-block animate-pulse" />
          Live Sync
        </span>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-white/10 rounded-lg">
          No operatives connected. Launch emulator or invite players.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPlayers.map((player) => {
            const isSelected = player.id === selectedPlayerId;
            return (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player.id)}
                className={`glass-panel p-3.5 cursor-pointer transition-all duration-200 text-left
                           ${isSelected
                             ? 'border-neon-cyan ring-1 ring-neon-cyan/50 bg-neon-cyan/5 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                             : 'hover:border-white/30'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-bold text-sm text-white truncate">
                    {player.displayName || 'Unnamed Operative'}
                  </h3>
                  <span className="text-[10px] font-mono text-amber-300">
                    {player.credits?.toLocaleString() || 0} CR
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <VitalBar
                    label="HP"
                    current={player.hp || 0}
                    max={player.maxHp || 100}
                    type="hp"
                  />
                  <VitalBar
                    label="Shields"
                    current={player.shields || 0}
                    max={player.maxShields || 50}
                    type="shield"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-[10px] font-mono text-center text-gray-400">
                  <div>STR: <span className="text-white font-bold">{player.stats?.strength || 10}</span></div>
                  <div>DEX: <span className="text-white font-bold">{player.stats?.dexterity || 10}</span></div>
                  <div>INT: <span className="text-white font-bold">{player.stats?.intelligence || 10}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
