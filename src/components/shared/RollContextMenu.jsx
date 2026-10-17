import React, { useEffect, useRef } from 'react';

/**
 * RollContextMenu - Sleek cyberpunk context menu that appears on right-click
 * for d20 rolls (Normal, Advantage, Disadvantage) or damage rolls (Normal, Critical).
 *
 * @param {boolean} isOpen
 * @param {{x: number, y: number}} position
 * @param {string} type - 'd20' | 'damage'
 * @param {string} title - Label describing what is being rolled
 * @param {function} onSelect - Callback when an option is selected: (rollMode: 'normal'|'advantage'|'disadvantage'|'critical') => void
 * @param {function} onClose - Callback to close menu
 */
export default function RollContextMenu({
  isOpen,
  position,
  type = 'd20',
  title = 'Tactical Roll',
  diceNotation = '1d20',
  bonus = 0,
  onSelect,
  onClose,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('pointerdown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !position) return null;

  // Keep menu on screen
  const menuWidth = 220;
  const menuHeight = type === 'd20' ? 180 : 130;
  const left = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const top = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const formattedBonus = bonus >= 0 ? `+${bonus}` : `${bonus}`;

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-56 glass-panel border border-neon-cyan/40 bg-void-bg/95 backdrop-blur-md shadow-[0_0_25px_rgba(0,240,255,0.3)] rounded-lg p-2 font-mono text-xs animate-fade-in"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="border-b border-white/10 pb-1.5 mb-1.5 px-1 flex items-center justify-between">
        <span className="font-display font-bold text-[11px] text-neon-cyan truncate uppercase tracking-wider">
          {title}
        </span>
        <span className="text-[10px] text-gray-400">
          {diceNotation}
          {formattedBonus !== '+0' ? formattedBonus : ''}
        </span>
      </div>

      {type === 'd20' ? (
        <div className="space-y-1">
          {/* Normal Roll */}
          <button
            onClick={() => {
              onSelect('normal');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-gray-200 hover:text-white hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="text-neon-cyan">⚡</span>
              <span className="font-semibold text-xs">Normal Roll</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono">1d20</span>
          </button>

          {/* Roll with Advantage */}
          <button
            onClick={() => {
              onSelect('advantage');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-neon-green hover:bg-neon-green/15 transition-colors border border-transparent hover:border-neon-green/30"
          >
            <div className="flex items-center gap-2">
              <span>🟢</span>
              <div>
                <span className="font-bold text-xs block">Advantage</span>
                <span className="text-[9px] text-neon-green/80 block">Take Higher</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-neon-green">2d20</span>
          </button>

          {/* Roll with Disadvantage */}
          <button
            onClick={() => {
              onSelect('disadvantage');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-neon-red hover:bg-neon-red/15 transition-colors border border-transparent hover:border-neon-red/30"
          >
            <div className="flex items-center gap-2">
              <span>🔴</span>
              <div>
                <span className="font-bold text-xs block">Disadvantage</span>
                <span className="text-[9px] text-neon-red/80 block">Take Lower</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-neon-red">2d20</span>
          </button>
        </div>
      ) : (
        /* Damage Roll Options (Advantage / Disadvantage strictly disabled; Critical doubles dice count) */
        <div className="space-y-1">
          {/* Normal Damage */}
          <button
            onClick={() => {
              onSelect('normal');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-amber-300 hover:text-amber-200 hover:bg-amber-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span>💥</span>
              <div>
                <span className="font-bold text-xs block">Normal Damage</span>
                <span className="text-[9px] text-gray-400 block">{diceNotation}{formattedBonus}</span>
              </div>
            </div>
            <span className="text-[10px] text-amber-400">Standard</span>
          </button>

          {/* Critical Hit (Doubles Dice Count) */}
          <button
            onClick={() => {
              onSelect('critical');
              onClose();
            }}
            className="w-full text-left px-2 py-1.5 rounded flex items-center justify-between text-purple-300 hover:text-white bg-neon-purple/15 hover:bg-neon-purple/30 transition-colors border border-neon-purple/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
          >
            <div className="flex items-center gap-2">
              <span>⚡</span>
              <div>
                <span className="font-black text-xs block text-white">CRITICAL HIT</span>
                <span className="text-[9px] text-purple-300 block">Double Dice Count</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-black text-neon-purple">2x Dice</span>
          </button>
        </div>
      )}
    </div>
  );
}
