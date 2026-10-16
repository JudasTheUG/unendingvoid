import React from 'react';
import VitalBar from '../shared/VitalBar';

export default function VitalsPanel({ hp, maxHp, shields, maxShields, hpLabel = 'Hull / HP', shieldsLabel = 'Shields' }) {
  return (
    <div className="glass-panel p-5 space-y-4 border-l-4 border-l-neon-cyan/70">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h2 className="font-display text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="text-neon-cyan">⚡</span> Vitals & Defensive Field
        </h2>
      </div>

      <div className="space-y-4">
        <VitalBar
          id="vital-hp"
          label={hpLabel}
          current={hp}
          max={maxHp}
          type="hp"
        />

        <VitalBar
          id="vital-shields"
          label={shieldsLabel}
          current={shields}
          max={maxShields}
          type="shield"
        />
      </div>
    </div>
  );
}
