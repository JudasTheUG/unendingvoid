import React from 'react';

/**
 * StatBlock - Sci-fi D&D Stat display with calculated modifier, angular corner accents, and roll trigger.
 * @param {string} name - Stat identifier (e.g. strength, dexterity)
 * @param {string} label - Display label in active locale
 * @param {number} value - Base stat value (1-20)
 * @param {function} [onRoll] - Optional click handler to roll with this stat
 */
export default function StatBlock({ name, label, value = 10, onRoll }) {
  const modifier = Math.floor((value - 10) / 2);
  const formattedMod = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  return (
    <div
      onClick={onRoll ? () => onRoll(name, modifier) : undefined}
      className={`group relative glass-panel p-3 text-center transition-all duration-300
                 hover:border-neon-cyan/50 hover:shadow-[0_0_15px_rgba(0,240,255,0.15)]
                 ${onRoll ? 'cursor-pointer active:scale-95' : ''}`}
    >
      {/* Sci-fi angular corner accent */}
      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-neon-cyan/40 group-hover:border-neon-cyan transition-colors" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-neon-cyan/40 group-hover:border-neon-cyan transition-colors" />

      <p className="font-display text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-neon-cyan transition-colors truncate">
        {label}
      </p>

      <div className="my-1.5 flex items-baseline justify-center gap-1.5">
        <span className="font-display text-2xl font-black text-white group-hover:text-neon-cyan transition-colors">
          {value}
        </span>
      </div>

      <div className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
        {formattedMod}
      </div>

      {onRoll && (
        <p className="text-[9px] text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
          Click to Roll
        </p>
      )}
    </div>
  );
}
