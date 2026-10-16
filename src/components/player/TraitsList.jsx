import React from 'react';
import TraitBadge from '../shared/TraitBadge';

export default function TraitsList({ traits = [], traitDefs = [], locale = 'en', onRemove }) {
  // Resolve trait objects from IDs
  const resolvedTraits = traits.map((traitId) => {
    const found = traitDefs.find((t) => t.id === traitId);
    return found || { id: traitId, name: traitId, type: 'neutral' };
  });

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
        <h2 className="font-display text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="text-neon-cyan">🧬</span> Cybernetics & Genetic Traits
        </h2>
        <span className="text-[10px] text-gray-500 font-mono">
          {resolvedTraits.length} Active
        </span>
      </div>

      {resolvedTraits.length === 0 ? (
        <p className="text-xs text-gray-500 italic">No genetic augmentations or psychological traits recorded.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {resolvedTraits.map((trait) => (
            <TraitBadge
              key={trait.id}
              trait={trait}
              locale={locale}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
