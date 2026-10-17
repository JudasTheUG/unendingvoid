import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import { submitInitiativeRoll } from '../../lib/campaignActions';
import { calculateInitiativeBonus } from '../../lib/initiativeCalculator';

export default function InitiativeRollModal({
  character,
  campaignId,
  traits = [],
  items = [],
  forceOpen = false,
  onClose = null,
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(forceOpen);
  const [isRolling, setIsRolling] = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const lastPromptTimestamp = useRef(0);

  const initData = calculateInitiativeBonus(character, traits, items);
  const totalBonus = initData.totalBonus;
  const dexMod = initData.dexMod;
  const extraBonus = initData.extraBonus;
  const bonusSources = initData.bonusSources;
  const charId = character?.id || character?.uid || 'operative';
  const charName = character?.displayName || character?.name || 'Operative';
  const candidateIds = [character?.id, character?.uid, character?.characterId].filter(Boolean);
  const effectiveCampaignId = campaignId || character?.campaignId || character?.initiativeCampaignId;

  const isCandidateTarget = (targetIds) => {
    if (!targetIds || targetIds.length === 0) return true;
    return candidateIds.some((id) => targetIds.includes(id));
  };

  const triggerPrompt = (timestamp = Date.now()) => {
    if (timestamp && timestamp <= lastPromptTimestamp.current) return;
    lastPromptTimestamp.current = timestamp || Date.now();
    setRollResult(null);
    setHasSubmitted(false);
    setIsRolling(false);
    setIsOpen(true);
  };

  // 1. Listen for character doc initiativeRequested flag (real-time from Firestore)
  useEffect(() => {
    if (character?.initiativeRequested) {
      const reqAt = character.initiativeRequestedAt || Date.now();
      if (reqAt > lastPromptTimestamp.current || lastPromptTimestamp.current === 0) {
        triggerPrompt(reqAt);
      }
    } else if (character?.initiativeRequested === false) {
      lastPromptTimestamp.current = 0;
    }
  }, [character?.initiativeRequested, character?.initiativeRequestedAt]);

  // 2. Listen to Campaign doc in Firestore for real-time multiplayer initiative requests
  useEffect(() => {
    if (!effectiveCampaignId || !db) return;

    try {
      const unsub = onSnapshot(
        doc(db, 'campaigns', effectiveCampaignId),
        (snap) => {
          if (!snap.exists()) return;
          const camp = snap.data();
          if (camp.initiativeRequested) {
            const reqAt = camp.initiativeRequestedAt || 0;
            const targetIds = camp.targetPlayerIds || [];
            const isTarget = isCandidateTarget(targetIds);
            const alreadyRolled = candidateIds.some((id) => Boolean(camp.initiativeRolls?.[id]));

            if (isTarget && !alreadyRolled && (reqAt > lastPromptTimestamp.current || lastPromptTimestamp.current === 0)) {
              triggerPrompt(reqAt);
            }
          } else if (camp.combatActive || camp.initiativeRequested === false) {
            lastPromptTimestamp.current = 0;
            setIsOpen(false);
          }
        },
        (err) => console.warn('[InitiativeRollModal] Campaign snapshot notice:', err.message)
      );

      return () => unsub();
    } catch (e) {
      console.warn('[InitiativeRollModal] Listener setup error:', e);
    }
  }, [effectiveCampaignId, charId]);

  // 3. Listen for DM's "Ask Initiative" broadcast locally / storage
  useEffect(() => {
    const handleAskInitiative = (e) => {
      const targetIds = e.detail?.targetPlayerIds;
      if (isCandidateTarget(targetIds)) {
        triggerPrompt(e.detail?.timestamp || Date.now());
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === 'unendingvoid:initiative_request' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const targetIds = parsed.targetPlayerIds;
          if (isCandidateTarget(targetIds)) {
            triggerPrompt(parsed.timestamp || Date.now());
          }
        } catch (_) {
          triggerPrompt();
        }
      }
    };

    window.addEventListener('unendingvoid:ask_initiative', handleAskInitiative);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('unendingvoid:ask_initiative', handleAskInitiative);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [charId]);

  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);

  const handleRollInitiative = async () => {
    if (isRolling || hasSubmitted) return;
    setIsRolling(true);
    setHasSubmitted(true);

    // Roll d20
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + totalBonus;

    // Immediately close popup so user sees the 3D dice rolling on screen
    setIsOpen(false);
    if (onClose) onClose();

    // Trigger 3D dice overlay animation with the exact predetermined d20 roll
    triggerInteractiveRoll(
      '1d20',
      totalBonus,
      `Initiative Check: ${charName}`,
      'normal',
      false,
      [d20]
    );

    // Transmit the exact same result to DM
    try {
      await submitInitiativeRoll(effectiveCampaignId, {
        playerId: charId,
        playerName: charName,
        roll: d20,
        modifier: totalBonus,
        total,
      });
    } catch (err) {
      console.warn('[InitiativeRollModal] Submission error:', err.message);
    } finally {
      setIsRolling(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-fade-in font-mono">
      <div className="relative max-w-md w-full bg-[#070b14] border-2 border-red-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.5)] space-y-5 text-center overflow-hidden">
        {/* Top Warning Stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse"></div>

        {/* Tactical Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>{t('combat.alertHeader') || 'TACTICAL ALERT // ENGAGEMENT IMMINENT'}</span>
          </div>
          <h2 className="font-display text-2xl font-black text-white tracking-wide uppercase pt-2">
            {t('combat.rollInitiativeTitle') || 'ROLL FOR INITIATIVE'}
          </h2>
          <p className="text-xs text-gray-400">
            {t('combat.dmPrompt') || 'The Dungeon Master has called for tactical initiative! Commit your reflexes to battle.'}
          </p>
        </div>

        {/* Character Tactical Card & Initiative Breakdown */}
        <div className="bg-[#0e1628] p-3.5 rounded-xl border border-slate-700 space-y-2 text-left">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <span className="text-[10px] text-gray-500 uppercase block">Operative</span>
              <span className="font-display text-sm font-bold text-white block">{charName}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 uppercase block">Total Initiative Bonus</span>
              <span className="text-base font-black text-neon-green">
                {totalBonus >= 0 ? `+${totalBonus}` : totalBonus}
              </span>
            </div>
          </div>

          {/* Sources Breakdown Badge */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
            <span className="px-2 py-0.5 rounded bg-black/60 text-neon-cyan border border-neon-cyan/40 font-bold">
              DEX: {dexMod >= 0 ? `+${dexMod}` : dexMod}
            </span>
            {bonusSources.filter((b) => b.type !== 'stat').map((b, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                {b.name}: +{b.bonus}
              </span>
            ))}
          </div>
        </div>

        {/* Outcome Display or Action Button */}
        {rollResult ? (
          <div className="bg-red-500/10 border border-red-500/40 p-4 rounded-xl space-y-2 animate-fade-in">
            <span className="text-[10px] uppercase text-red-400 tracking-widest font-bold block">
              // INITIATIVE COMMITTED //
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-black font-display text-white">
                {rollResult.total}
              </span>
              <div className="text-xs text-gray-300 font-mono text-left">
                <div>
                  [ d20: <strong className="text-neon-cyan">{rollResult.d20}</strong> + Bonus:{' '}
                  <strong className="text-neon-green">+{rollResult.totalBonus}</strong> ]
                </div>
                <div className="text-[10px] text-gray-400">
                  {rollResult.bonusSources.map((b) => `${b.name} (${b.bonus >= 0 ? '+' : ''}${b.bonus})`).join(' + ')}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-neon-green font-bold flex items-center justify-center gap-1 pt-1">
              <span>📡</span>
              <span>{t('combat.telemetryRelayed') || 'Telemetry relayed to DM. Formulating battle grid...'}</span>
            </p>
          </div>
        ) : (
          <div className="pt-2">
            {/* The exact requested button name across any language: "Leeeerooyy..." */}
            <button
              onClick={handleRollInitiative}
              disabled={isRolling}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-500 hover:to-amber-500 text-white font-display font-black text-xl uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(239,68,68,0.6)] hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2"
            >
              <span>⚡</span>
              <span>{isRolling ? (t('combat.rolling') || 'ROLLING...') : 'Leeeerooyy...'}</span>
              <span>⚡</span>
            </button>
          </div>
        )}

        {/* Dismiss Button */}
        {!isRolling && !rollResult && (
          <button
            onClick={() => {
              setIsOpen(false);
              if (onClose) onClose();
            }}
            className="text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-colors"
          >
            {t('common.cancel') || 'Dismiss'}
          </button>
        )}
      </div>
    </div>
  );
}
