import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDiceSync, getStoredRolls } from '../../hooks/useDiceSync';

export default function CombatRollLedger({ user, isDM = false }) {
  const { t } = useTranslation();
  const [rolls, setRolls] = useState(() => getStoredRolls());
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'MINE'

  // Real-time synchronization of dice rolls across all connected players & DM
  useDiceSync(
    (newRoll) => {
      setRolls((prev) => {
        const exists = prev.some((r) => r.id === newRoll.id || (r.timestamp === newRoll.timestamp && r.playerName === newRoll.playerName));
        if (exists) return prev;
        return [newRoll, ...prev].slice(0, 50);
      });
    },
    (loadedHistory) => {
      if (loadedHistory && loadedHistory.length > 0) {
        setRolls(loadedHistory);
      }
    }
  );

  const visibleRolls = rolls.filter((r) => {
    const isSecret = Boolean(r.isSecret || r.role === 'dm' || r.isDMRoll || r.playerName?.includes('(DM)'));
    if (isSecret && !isDM) return false;

    if (filter === 'MINE') {
      const isMyRoll = r.userId === user?.uid || r.playerName === user?.displayName;
      return isMyRoll;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#070b14] border-l border-slate-800 select-none overflow-hidden font-mono">
      {/* Tactical Ledger Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-[#0c1220] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-pulse"></span>
          <h3 className="font-display font-black text-xs uppercase tracking-wider text-white">
            {t('combatBoard.ledgerTitle', 'Quantum Roll Ledger')}
          </h3>
          <span className="px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-neon-cyan font-bold border border-neon-cyan/30">
            {visibleRolls.length}
          </span>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-slate-800 text-[10px]">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
              filter === 'ALL'
                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('combatBoard.filterAll', 'All')}
          </button>
          <button
            onClick={() => setFilter('MINE')}
            className={`px-2 py-0.5 rounded font-bold uppercase transition-all ${
              filter === 'MINE'
                ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('combatBoard.filterMine', 'Mine')}
          </button>
        </div>
      </div>

      {/* Rolls Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
        {visibleRolls.length === 0 ? (
          <div className="py-16 text-center text-gray-500 italic space-y-2">
            <span className="text-3xl block opacity-30">📜</span>
            <p className="text-xs px-4">
              {t('combatBoard.noRollsYet', 'No dice rolls recorded yet in this tactical encounter.')}
            </p>
          </div>
        ) : (
          visibleRolls.map((r, i) => {
            const isSecret = Boolean(r.isSecret || r.role === 'dm' || r.isDMRoll || r.playerName?.includes('(DM)'));
            const isCrit20 = r.chosenResult === 20 || r.results?.includes(20) || r.total === 100;
            const isCrit1 = r.chosenResult === 1 || r.results?.includes(1);

            // Format d10 roll of 0 as 10
            const formatResults = () => {
              if (r.dieType === 'coin' || r.notation === 'coin') {
                return r.results?.map((res) => (res === 1 ? '🪙 HEADS' : '🌑 TAILS')).join(', ');
              }
              const isD10 = r.notation?.match(/\d*d10(?!\d)/i);
              if (isD10) {
                return `[${(r.results || []).map((v) => (v === 0 || v === '0' ? 10 : v)).join(', ')}]`;
              }
              return r.results ? `[${r.results.join(', ')}]` : '';
            };

            const displayTotal = () => {
              const isD10 = r.notation?.match(/\d*d10(?!\d)/i);
              if (isD10 && (r.results?.includes(0) || r.results?.includes('0')) && (r.total === 0 || r.total === '0')) {
                return 10 + (Number(r.modifier) || 0);
              }
              return r.total;
            };

            return (
              <div
                key={r.id || `${r.timestamp}_${i}`}
                className={`pt-2.5 first:pt-0 p-2.5 rounded-xl border transition-all ${
                  isSecret
                    ? 'bg-[#181126] border-purple-500/40'
                    : isCrit20
                      ? 'bg-neon-green/10 border-neon-green/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : isCrit1
                        ? 'bg-red-500/10 border-red-500/50'
                        : 'bg-[#0b101c] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Meta Header */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-white truncate">{r.playerName || 'Operative'}</span>
                    {isSecret && (
                      <span className="px-1 py-0.2 rounded bg-purple-900/60 text-purple-300 text-[9px] uppercase font-bold border border-purple-500/40">
                        SECRET
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-500 shrink-0">
                    {r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                  </span>
                </div>

                {/* Roll Label & Notation */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-gray-200 block truncate">
                      {r.label || r.notation || 'Tactical Roll'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {r.notation}{r.modifier ? (r.modifier >= 0 ? ` +${r.modifier}` : ` ${r.modifier}`) : ''}{' '}
                      <span className="text-gray-500">{formatResults()}</span>
                    </span>
                  </div>

                  {/* Total Value */}
                  <div className="text-right shrink-0 ml-2">
                    <span
                      className={`font-display font-black text-lg block ${
                        isCrit20 ? 'text-neon-green animate-pulse' : isCrit1 ? 'text-red-400' : 'text-neon-cyan'
                      }`}
                    >
                      {displayTotal()}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-gray-500 block">Total</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
