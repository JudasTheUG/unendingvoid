import React from 'react';

/**
 * VitalBar - Animated vitals bar for HP and Shields with dynamic color grading and pulse effects.
 * @param {string} label - Display label (HP, Shields)
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {'hp'|'shield'} type - Bar style type
 * @param {string} [id] - Unique DOM id
 */
export default function VitalBar({ label, current = 0, max = 100, type = 'hp', id }) {
  const safeCurrent = Math.max(0, current);
  const safeMax = Math.max(1, max);
  const percent = Math.min(100, Math.max(0, (safeCurrent / safeMax) * 100));

  // Determine color scheme based on type & percentage
  let barGradient = 'from-emerald-500 to-neon-green';
  let glowColor = 'rgba(0, 255, 136, 0.4)';
  let textColor = 'text-neon-green';

  if (type === 'shield') {
    barGradient = 'from-cyan-500 to-neon-cyan';
    glowColor = 'rgba(0, 240, 255, 0.4)';
    textColor = 'text-neon-cyan';
  } else if (type === 'hp') {
    if (percent <= 25) {
      barGradient = 'from-red-600 to-neon-red';
      glowColor = 'rgba(255, 51, 68, 0.5)';
      textColor = 'text-neon-red';
    } else if (percent <= 50) {
      barGradient = 'from-amber-500 to-yellow-400';
      glowColor = 'rgba(245, 158, 11, 0.4)';
      textColor = 'text-amber-400';
    }
  }

  return (
    <div id={id} className="space-y-1.5 font-sans">
      <div className="flex items-center justify-between text-xs tracking-wider">
        <span className="font-display font-bold uppercase text-gray-300 flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full inline-block animate-pulse"
            style={{ backgroundColor: type === 'shield' ? '#00f0ff' : '#00ff88' }}
          />
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold text-sm ${textColor}`}>
            {safeCurrent}
            <span className="text-gray-500 text-xs font-normal"> / {safeMax}</span>
          </span>
          <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
            {Math.round(percent)}%
          </span>
        </div>
      </div>

      <div className="h-3 w-full bg-void-bg/90 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500 ease-out`}
          style={{
            width: `${percent}%`,
            boxShadow: `0 0 10px ${glowColor}`,
          }}
        />
      </div>
    </div>
  );
}
