import React from 'react';
import StatBlock from '../shared/StatBlock';

const DEFAULT_STATS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];

export default function StatsGrid({ stats = {}, labels = {}, onRoll }) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
        <h2 className="font-display text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="text-neon-cyan">⌬</span> Attributes & Diagnostics
        </h2>
        <span className="text-[10px] text-gray-500 font-mono">D20 Modifiers Active</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DEFAULT_STATS.map((key) => (
          <StatBlock
            key={key}
            name={key}
            label={labels[key] || key.substring(0, 3).toUpperCase()}
            value={stats[key] ?? 10}
            onRoll={onRoll}
          />
        ))}
      </div>
    </div>
  );
}
