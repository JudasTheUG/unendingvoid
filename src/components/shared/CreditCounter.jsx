import React from 'react';

/**
 * CreditCounter - Sci-fi credit balance with glowing holographic styling.
 * @param {number} amount - Credit amount
 * @param {string} [label='Credits'] - Label
 */
export default function CreditCounter({ amount = 0, label = 'Credits' }) {
  return (
    <div className="glass-panel px-4 py-2 flex items-center justify-between border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-lg">◈</span>
        <span className="font-display text-[10px] uppercase tracking-widest text-gray-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span className="text-lg font-black text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]">
          {Number(amount).toLocaleString()}
        </span>
        <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">CR</span>
      </div>
    </div>
  );
}
