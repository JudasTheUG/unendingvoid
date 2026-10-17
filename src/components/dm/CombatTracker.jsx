import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { requestInitiative, submitInitiativeRoll, setCombatTurnOrder } from '../../lib/campaignActions';
import { calculateInitiativeBonus } from '../../lib/initiativeCalculator';

const DEFAULT_ENEMIES = [
  { id: 'en_marine_01', name: 'MCRN Patrol Marine', dexMod: 2, hp: 45, maxHp: 45, initiative: null, isEnemy: true },
  { id: 'en_pirate_02', name: 'Belter Breacher', dexMod: 1, hp: 35, maxHp: 35, initiative: null, isEnemy: true },
  { id: 'en_drone_03', name: 'Combat Security Drone', dexMod: 3, hp: 25, maxHp: 25, initiative: null, isEnemy: true },
];

export default function CombatTracker({
  campaignId,
  players = [],
  traits = [],
  items = [],
  turnOrder = [],
  currentTurn = 0,
  combatActive = false,
  onToggleCombat,
  onNextTurn,
  onPrevTurn,
  onUpdateTurnOrder,
}) {
  const { t } = useTranslation();
  const [isAwaitingRolls, setIsAwaitingRolls] = useState(false);
  const [playerRolls, setPlayerRolls] = useState({});
  const [enemies, setEnemies] = useState(DEFAULT_ENEMIES);
  const [newEnemyName, setNewEnemyName] = useState('');
  const [newEnemyDex, setNewEnemyDex] = useState(1);
  const [roundCount, setRoundCount] = useState(1);
  const [combatMode, setCombatMode] = useState('ground');

  // Real-time Firestore synchronization for campaign initiative rolls
  useEffect(() => {
    if (!campaignId || !db) return;

    try {
      const unsub = onSnapshot(
        doc(db, 'campaigns', campaignId),
        (snap) => {
          if (!snap.exists()) return;
          const camp = snap.data();
          if (camp.initiativeRolls) {
            setPlayerRolls(camp.initiativeRolls);
          }
          if (camp.initiativeRequested !== undefined) {
            setIsAwaitingRolls(Boolean(camp.initiativeRequested));
          }
        },
        (err) => console.warn('[CombatTracker] Campaign snapshot notice:', err.message)
      );

      return () => unsub();
    } catch (e) {
      console.warn('[CombatTracker] Firestore listener error:', e);
    }
  }, [campaignId]);

  // Real-time Firestore synchronization for campaign initiative rolls
  useEffect(() => {
    if (!campaignId || !db) return;

    try {
      const unsub = onSnapshot(
        doc(db, 'campaigns', campaignId),
        (snap) => {
          if (!snap.exists()) return;
          const camp = snap.data();
          if (camp.initiativeRolls) {
            setPlayerRolls(camp.initiativeRolls);
          }
          if (camp.initiativeRequested !== undefined) {
            setIsAwaitingRolls(Boolean(camp.initiativeRequested));
          }
        },
        (err) => console.warn('[CombatTracker] Campaign snapshot notice:', err.message)
      );

      return () => unsub();
    } catch (e) {
      console.warn('[CombatTracker] Firestore listener error:', e);
    }
  }, [campaignId]);

  // Sync player rolls from storage / custom events
  useEffect(() => {
    const handleRollSubmitted = (e) => {
      const data = e.detail;
      if (data?.playerId) {
        setPlayerRolls((prev) => ({
          ...prev,
          [data.playerId]: data,
        }));
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'unendingvoid:initiative_rolls' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setPlayerRolls(parsed);
        } catch (err) {}
      }
    };

    // Load initial stored rolls
    try {
      const raw = localStorage.getItem('unendingvoid:initiative_rolls');
      if (raw) setPlayerRolls(JSON.parse(raw));
    } catch (e) {}

    window.addEventListener('unendingvoid:initiative_submitted', handleRollSubmitted);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('unendingvoid:initiative_submitted', handleRollSubmitted);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Trigger "Ask Initiative" to all players
  const handleAskInitiative = async () => {
    setIsAwaitingRolls(true);
    setPlayerRolls({});
    try {
      await requestInitiative(campaignId, players);
    } catch (err) {
      console.warn('[CombatTracker] Failed to request initiative:', err.message);
    }
  };

  // Auto-roll enemy initiatives
  const handleAutoRollEnemies = () => {
    const updated = enemies.map((enemy) => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const total = roll + Number(enemy.dexMod || 0);
      return {
        ...enemy,
        roll,
        initiative: total,
      };
    });
    setEnemies(updated);
  };

  // Manual roll for player if AFK (calculates full DEX + Alert trait + cyberware bonuses)
  const handleForceRollPlayer = async (player) => {
    const pId = player.id || player.uid;
    const { totalBonus, dexMod, extraBonus, bonusSources } = calculateInitiativeBonus(player, traits, items);
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + totalBonus;

    const rollData = {
      playerId: pId,
      playerName: player.displayName || player.name || 'Operative',
      roll: d20,
      modifier: totalBonus,
      total,
      breakdown: { dexMod, extraBonus, bonusSources },
      timestamp: Date.now(),
    };

    setPlayerRolls((prev) => ({
      ...prev,
      [pId]: rollData,
    }));

    try {
      await submitInitiativeRoll(campaignId, rollData);
    } catch (err) {
      console.warn('[CombatTracker] Error persisting force roll to Firestore:', err.message);
    }
  };

  // Auto-roll initiative for all players who haven't submitted yet
  const handleAutoRollAllPlayers = async () => {
    const pendingPlayers = players.filter((p) => {
      const pId = p.id || p.uid;
      return !playerRolls[pId];
    });

    for (const player of pendingPlayers) {
      await handleForceRollPlayer(player);
    }
  };

  // Add custom enemy
  const handleAddEnemy = (e) => {
    e.preventDefault();
    if (!newEnemyName.trim()) return;

    const newEnemy = {
      id: `enemy_${Date.now()}`,
      name: newEnemyName.trim(),
      dexMod: Number(newEnemyDex) || 0,
      hp: 30,
      maxHp: 30,
      initiative: null,
      isEnemy: true,
    };

    setEnemies((prev) => [...prev, newEnemy]);
    setNewEnemyName('');
  };

  // Remove enemy
  const handleRemoveEnemy = (id) => {
    setEnemies((prev) => prev.filter((e) => e.id !== id));
  };

  // Finalize Turn Order: Sort descending by initiative score
  const handleFinalizeTurnOrder = async () => {
    const allCombatants = [];

    // Add players who rolled
    players.forEach((p) => {
      const pId = p.id || p.uid;
      const roll = playerRolls[pId];
      const dexScore = p.stats?.dexterity || 10;
      const dexMod = Math.floor((dexScore - 10) / 2);
      const initScore = roll?.total !== undefined ? roll.total : dexMod;

      allCombatants.push({
        id: pId,
        name: p.displayName || p.name || 'Operative',
        isEnemy: false,
        initiative: initScore,
        hp: p.hp || 100,
        maxHp: p.maxHp || 100,
        detail: `[Roll: ${roll?.roll || '—'}, DEX: ${dexMod >= 0 ? `+${dexMod}` : dexMod}]`,
      });
    });

    // Add enemies
    enemies.forEach((en) => {
      const initScore = en.initiative !== null ? en.initiative : en.dexMod;
      allCombatants.push({
        id: en.id,
        name: en.name,
        isEnemy: true,
        initiative: initScore,
        hp: en.hp,
        maxHp: en.maxHp,
        detail: `[Roll: ${en.roll || '—'}, DEX: ${en.dexMod >= 0 ? `+${en.dexMod}` : en.dexMod}]`,
      });
    });

    // Sort descending by initiative
    allCombatants.sort((a, b) => b.initiative - a.initiative);

    const orderedIds = allCombatants.map((c) => c.id);

    if (onUpdateTurnOrder) {
      onUpdateTurnOrder(allCombatants);
    }

    try {
      await setCombatTurnOrder(campaignId, orderedIds, combatMode, enemies);
    } catch (err) {}

    setIsAwaitingRolls(false);
    if (!combatActive && onToggleCombat) {
      onToggleCombat();
    }
  };

  const allPlayersReady =
    players.length > 0 &&
    players.every((p) => {
      const pId = p.id || p.uid;
      return playerRolls[pId] !== undefined;
    });

  const activeCombatantId = turnOrder[currentTurn];
  const activeCombatant =
    players.find((p) => (p.id || p.uid) === activeCombatantId) ||
    enemies.find((e) => e.id === activeCombatantId);

  return (
    <div className="glass-panel p-5 border-l-4 border-l-neon-red shadow-[0_0_25px_rgba(239,68,68,0.2)] font-mono text-xs space-y-4">
      {/* Top Combat Header & Action Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">⚔️</span>
          <div>
            <h2 className="font-display text-sm text-white font-black uppercase tracking-wider">
              {t('combat.panelTitle') || 'Tactical Combat & Initiative Command'}
            </h2>
            <p className="text-[11px] text-gray-400">
              {combatActive
                ? `Combat Active · Round ${roundCount} · Turn ${currentTurn + 1} of ${turnOrder.length || 1}`
                : 'Free exploration mode. Ready tactical grid.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ask Initiative Button */}
          {!combatActive && (
            <button
              onClick={handleAskInitiative}
              className={`px-3.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border
                         ${allPlayersReady
                           ? 'bg-neon-green/20 text-neon-green border-neon-green/60 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                           : isAwaitingRolls
                             ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 animate-pulse'
                             : 'bg-red-600/20 hover:bg-red-600/30 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.3)]'}`}
              title="Broadcast initiative request to all players with 'Leeeerooyy...' button"
            >
              <span>{allPlayersReady ? '✅' : (isAwaitingRolls ? '⏳' : '🚨')}</span>
              <span>
                {allPlayersReady
                  ? (t('combat.allPlayersReady') || 'All Players Ready')
                  : isAwaitingRolls
                    ? (t('combat.awaitingRolls') || 'Awaiting Operative Rolls...')
                    : (t('combat.askInitiative') || 'Ask Initiative')}
              </span>
            </button>
          )}

          {/* Open Combat Board */}
          {combatActive && (
            <button
              onClick={() => window.open(`/combat/${campaignId}`, '_blank')}
              className="px-3.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 text-[10px] flex items-center justify-center"
              title="Open Combat Board"
            >
              ▤ {t('combat.openBoard') || 'Open Board'}
            </button>
          )}

          {/* Toggle Combat Active */}
          <button
            onClick={onToggleCombat}
            className={`px-3.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all
                       ${combatActive
                         ? 'bg-neon-red text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                         : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/10'}`}
          >
            {combatActive ? (t('combat.endCombat') || 'End Combat') : (t('combat.startCombat') || 'Start Combat')}
          </button>
        </div>
      </div>

      {/* ACTIVE COMBAT HUD BANNER */}
      {combatActive ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0c1220] p-3.5 rounded-xl border border-red-500/40 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center justify-center text-lg shrink-0">
                {activeCombatant?.isEnemy ? '💀' : '👤'}
              </div>
              <div>
                <span className="text-[10px] uppercase font-mono text-gray-400 block tracking-widest">
                  Current Turn Acting
                </span>
                <span className="font-display text-base font-black text-white block">
                  {activeCombatant?.name || activeCombatant?.displayName || 'Unknown Combatant'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onPrevTurn}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-gray-300 font-mono transition-colors"
              >
                ◀ {t('combat.prevTurn') || 'Prev'}
              </button>
              <button
                onClick={() => {
                  if (currentTurn + 1 >= turnOrder.length) {
                    setRoundCount((prev) => prev + 1);
                  }
                  if (onNextTurn) onNextTurn();
                }}
                className="px-4 py-1.5 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 rounded-lg text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              >
                {t('combat.nextTurn') || 'Next Turn'} ▶
              </button>
            </div>
          </div>

          {/* Turn Order Strip */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono text-gray-400 tracking-wider">
              {t('combat.turnOrder') || 'Tactical Initiative Order'}
            </span>
            <div className="flex flex-wrap gap-2">
              {turnOrder.map((cId, idx) => {
                const combatant =
                  players.find((p) => (p.id || p.uid) === cId) ||
                  enemies.find((e) => e.id === cId);

                const isActive = idx === currentTurn;
                const isEnemy = combatant?.isEnemy;

                return (
                  <div
                    key={cId}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 border transition-all
                               ${isActive
                                 ? 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.35)] font-bold scale-105'
                                 : isEnemy
                                   ? 'bg-red-500/10 text-red-300 border-red-500/30'
                                   : 'bg-white/5 text-gray-300 border-white/10'}`}
                  >
                    <span className="text-[10px] text-gray-400 font-bold">{idx + 1}.</span>
                    <span>{isEnemy ? '💀' : '👤'}</span>
                    <span>{combatant?.displayName || combatant?.name || cId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* INITIATIVE PREPARATION & ENEMY SETUP DRAWER */
        <div className="space-y-4 pt-1">
          {/* Operative Initiative Roll Status */}
          <div className="bg-[#090d18] p-3.5 rounded-xl border border-slate-700/80 space-y-2.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
                <span>👥</span>
                <span>{t('combat.operativeInitiativeStatus') || 'Operative Initiative Status'} ({players.length})</span>
              </span>
              <div className="flex items-center gap-2">
                {!allPlayersReady && players.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoRollAllPlayers}
                    className="px-2.5 py-0.5 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
                    title={t('combat.autoRollAllOperatives') || 'Auto Roll All Operatives'}
                  >
                    <span>⚡</span>
                    <span>{t('combat.autoRollAllOperatives') || 'Auto-Roll Pending Operatives'}</span>
                  </button>
                )}
                <span className={`text-[10px] font-bold flex items-center gap-1 ${allPlayersReady ? 'text-neon-green' : 'text-gray-400'}`}>
                  {allPlayersReady && <span>✅</span>}
                  {allPlayersReady
                    ? (t('combat.allPlayersReady') || 'All Players Ready')
                    : `${Object.keys(playerRolls).length}/${players.length} Submitted`}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {players.map((p) => {
                const pId = p.id || p.uid;
                const roll = playerRolls[pId];
                const { totalBonus, dexMod, extraBonus, bonusSources } = calculateInitiativeBonus(p, traits, items);

                return (
                  <div
                    key={pId}
                    className={`p-2.5 rounded-lg border flex items-center justify-between text-xs
                               ${roll
                                 ? 'bg-neon-green/10 border-neon-green/40 text-neon-green'
                                 : 'bg-[#0f172a] border-slate-700 text-gray-300'}`}
                  >
                    <div>
                      <span className="font-bold block text-white text-[11px]">
                        {p.displayName || p.name}
                      </span>
                      <span
                        className="text-[10px] text-gray-400 block"
                        title={bonusSources.map((b) => `${b.name} (${b.bonus >= 0 ? '+' : ''}${b.bonus})`).join(' + ')}
                      >
                        Init: <strong className="text-neon-cyan">{totalBonus >= 0 ? `+${totalBonus}` : totalBonus}</strong>
                        {extraBonus !== 0 && (
                          <span className="text-amber-400 text-[9px] ml-1">
                            (DEX {dexMod >= 0 ? `+${dexMod}` : dexMod}, {extraBonus >= 0 ? `+${extraBonus}` : extraBonus} traits/gear)
                          </span>
                        )}
                      </span>
                    </div>

                    {roll ? (
                      <div className="text-right">
                        <span className="font-display font-black text-sm text-neon-green block">
                          {roll.total}
                        </span>
                        <span className="text-[9px] text-gray-400">
                          [{roll.roll}{roll.modifier >= 0 ? `+${roll.modifier}` : roll.modifier}]
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleForceRollPlayer(p)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-gray-300 text-[10px] uppercase font-bold"
                        title={t('combat.rollForPlayer') || 'Force roll for this player'}
                      >
                        {t('combat.rollForPlayer') || 'Roll for Player'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enemy Combatants & Auto-Roll */}
          <div className="bg-[#090d18] p-3.5 rounded-xl border border-slate-700/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-red-400 font-bold uppercase text-[11px]">
                  💀 {t('combat.hostileCombatants') || 'Hostile Combatants'} ({enemies.length})
                </span>
                <span className="text-[10px] text-gray-400">
                  {t('combat.hostileAutoRollHint') || 'Auto-roll or manual initiative'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAutoRollEnemies}
                className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1"
              >
                <span>🎲</span>
                <span>{t('combat.autoRollHostiles') || 'Auto-Roll Hostile Initiatives'}</span>
              </button>
            </div>

            {/* Enemies List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {enemies.map((en) => (
                <div
                  key={en.id}
                  className="bg-[#0f172a] p-2.5 rounded-lg border border-red-500/30 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold block text-white text-[11px]">
                      {en.name}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      DEX: {en.dexMod >= 0 ? `+${en.dexMod}` : en.dexMod} · HP: {en.hp}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={en.initiative !== null ? en.initiative : ''}
                      placeholder="Init"
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : Number(e.target.value);
                        setEnemies((prev) =>
                          prev.map((it) => (it.id === en.id ? { ...it, initiative: val } : it))
                        );
                      }}
                      className="w-12 bg-black/60 border border-slate-700 rounded px-1.5 py-0.5 text-center text-amber-400 font-bold text-xs"
                    />
                    <button
                      onClick={() => handleRemoveEnemy(en.id)}
                      className="text-gray-500 hover:text-red-400 text-xs px-1"
                      title="Remove enemy"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Enemy Form */}
            <form onSubmit={handleAddEnemy} className="flex gap-2 pt-1 border-t border-slate-800 text-xs">
              <input
                type="text"
                placeholder="New Hostile (e.g. Syndicate Sniper)"
                value={newEnemyName}
                onChange={(e) => setNewEnemyName(e.target.value)}
                className="flex-1 bg-black/40 border border-slate-700 rounded px-2.5 py-1 text-white text-xs placeholder-gray-600 focus:border-red-500 focus:outline-none"
              />
              <input
                type="number"
                placeholder="DEX"
                value={newEnemyDex}
                onChange={(e) => setNewEnemyDex(e.target.value)}
                className="w-16 bg-black/40 border border-slate-700 rounded px-2 py-1 text-white text-xs text-center focus:border-red-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-200 uppercase font-bold text-[10px]"
              >
                + Add
              </button>
            </form>
          </div>

          {/* Formulate & Start Combat Button */}
          <div className="pt-2 pb-4">
            <div className="mb-4 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 p-3 rounded-lg bg-black/40 border border-slate-800">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" name="combatMode" value="ground" checked={combatMode === 'ground'} onChange={() => setCombatMode('ground')} className="text-neon-cyan focus:ring-neon-cyan bg-black/60 border-slate-600" />
                 <span className="text-[11px] font-bold text-gray-300 uppercase">Player vs Player (Ground)</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" name="combatMode" value="ship" checked={combatMode === 'ship'} onChange={() => setCombatMode('ship')} className="text-neon-cyan focus:ring-neon-cyan bg-black/60 border-slate-600" />
                 <span className="text-[11px] font-bold text-gray-300 uppercase">Ship vs Ship (Space)</span>
               </label>
            </div>

            <button
              onClick={handleFinalizeTurnOrder}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-display font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>⚡</span>
              <span>{t('combat.finalizeTurnOrder') || 'Finalize Turn Order & Engage Combat'}</span>
              <span>⚡</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
