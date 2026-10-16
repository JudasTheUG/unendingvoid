import React, { useState } from 'react';

const TYPE_STYLES = {
  buff: {
    pill: 'bg-emerald-500/15 text-neon-green border-emerald-500/40 hover:bg-emerald-500/25',
    icon: '▲',
    glow: 'hover:shadow-[0_0_12px_rgba(0,255,136,0.3)]',
  },
  debuff: {
    pill: 'bg-red-500/15 text-neon-red border-red-500/40 hover:bg-red-500/25',
    icon: '▼',
    glow: 'hover:shadow-[0_0_12px_rgba(255,51,68,0.3)]',
  },
  neutral: {
    pill: 'bg-purple-500/15 text-purple-300 border-purple-500/40 hover:bg-purple-500/25',
    icon: '◆',
    glow: 'hover:shadow-[0_0_12px_rgba(170,68,255,0.3)]',
  },
};

/**
 * TraitBadge - Buff/Debuff pill with detailed hover popover showing mechanical modifiers.
 * @param {Object} trait - Trait definition object
 * @param {string} [locale='en'] - Active locale
 * @param {function} [onRemove] - Optional DM remove callback
 */
export default function TraitBadge({ trait, locale = 'en', onRemove }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!trait) return null;

  const traitType = trait.type || 'neutral';
  const style = TYPE_STYLES[traitType] || TYPE_STYLES.neutral;

  const name = typeof trait.name === 'object' ? (trait.name[locale] || trait.name.en || trait.id) : trait.name || trait.id;
  const description =
    typeof trait.description === 'object'
      ? (trait.description[locale] || trait.description.en || '')
      : trait.description;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                   cursor-pointer transition-all duration-200 select-none ${style.pill} ${style.glow}`}
      >
        <span className="text-[10px] font-bold">{style.icon}</span>
        <span className="font-sans tracking-wide">{name}</span>

        {trait.rollModifier && (
          <span className="text-[10px] font-mono font-bold ml-0.5 opacity-90">
            [{trait.rollModifier >= 0 ? `+${trait.rollModifier}` : trait.rollModifier}]
          </span>
        )}

        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(trait.id);
            }}
            className="ml-1 text-gray-400 hover:text-neon-red text-xs transition-colors"
            title="Remove trait"
          >
            ×
          </button>
        )}
      </div>

      {/* Tooltip Popover */}
      {showTooltip && (
        <div className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 glass-panel text-left text-xs shadow-xl border border-white/20 animate-fade-in pointer-events-none">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/10">
            <span className="font-display font-bold text-white text-[11px]">{name}</span>
            <span className="text-[9px] uppercase font-mono text-gray-400">{traitType}</span>
          </div>

          {description && <p className="text-[11px] text-gray-300 leading-snug mb-1.5">{description}</p>}

          <div className="space-y-0.5 text-[10px] font-mono">
            {trait.statModifiers &&
              Object.entries(trait.statModifiers).map(([stat, mod]) => (
                <div key={stat} className="text-neon-cyan">
                  ⚡ {stat}: {mod >= 0 ? `+${mod}` : mod}
                </div>
              ))}
            {trait.rollModifier !== undefined && (
              <div className="text-neon-green">
                🎲 Roll Modifier: {trait.rollModifier >= 0 ? `+${trait.rollModifier}` : trait.rollModifier}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
