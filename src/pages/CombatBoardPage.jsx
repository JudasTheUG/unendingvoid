import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  updateTokenPosition,
  setCombatTarget,
  updateCombatantStats,
  advanceCombatTurn,
  addCombatantToCombat,
  endCombatSession,
} from '../lib/campaignActions';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import CombatRollLedger from '../components/combat/CombatRollLedger';
import DiceOverlay from '../components/dice/DiceOverlay';

const GRID_SIZE = 32;

const PRESET_HOSTILES_GROUND = [
  { name: 'Syndicate Sniper', hp: 35, dexMod: 3, armorClass: 15, shields: 10, maxShields: 10 },
  { name: 'MCRN Shock Trooper', hp: 55, dexMod: 2, armorClass: 16, shields: 20, maxShields: 20 },
  { name: 'Cyber-Security Hound', hp: 25, dexMod: 4, armorClass: 13, shields: 0, maxShields: 0 },
  { name: 'Mercenary Enforcer', hp: 45, dexMod: 1, armorClass: 14, shields: 15, maxShields: 15 },
  { name: 'Automated Defense Drone', hp: 20, dexMod: 2, armorClass: 12, shields: 10, maxShields: 10 },
];

const PRESET_HOSTILES_SPACE = [
  { name: 'MCRN Escort Frigate', hp: 180, dexMod: 2, armorClass: 16, shields: 100, maxShields: 100 },
  { name: 'Belter Scrap Raider', hp: 90, dexMod: 3, armorClass: 14, shields: 40, maxShields: 40 },
  { name: 'Stealth Corvette', hp: 140, dexMod: 4, armorClass: 17, shields: 60, maxShields: 60 },
  { name: 'Pirate Interceptor', hp: 60, dexMod: 3, armorClass: 15, shields: 30, maxShields: 30 },
];

const STATUS_LIST = ['Normal', 'Unconscious', 'Dead'];
const EFFECTS_LIST = [
  'None',
  'Charmed',
  'Frightened',
  'Prone',
  'Stunned',
  'Blinded',
  'Poisoned',
  'Paralyzed',
  'Restrained',
];

function renderEffectIcon(effect) {
  switch (effect) {
    case 'Blinded':
      return '😵'; // eyes x x emoji
    case 'Poisoned':
      return (
        <span
          className="inline-block leading-none"
          style={{ filter: 'drop-shadow(0 0 2px #22c55e) sepia(1) saturate(5000%) hue-rotate(75deg)' }}
          title="Poisoned"
        >
          💀
        </span>
      ); // green skull emoji
    case 'Restrained':
      return '🪢'; // tied rope / knot emoji
    case 'Charmed':
      return '💖';
    case 'Frightened':
      return '😱';
    case 'Stunned':
      return '⚡';
    case 'Prone':
      return '⬇️';
    case 'Paralyzed':
      return '🧊';
    default:
      return '✦';
  }
}

function getEffectPlainIcon(effect) {
  switch (effect) {
    case 'Blinded':
      return '😵';
    case 'Poisoned':
      return '💀';
    case 'Restrained':
      return '🪢';
    case 'Charmed':
      return '💖';
    case 'Frightened':
      return '😱';
    case 'Stunned':
      return '⚡';
    case 'Prone':
      return '⬇️';
    case 'Paralyzed':
      return '🧊';
    default:
      return '';
  }
}

function getEffectBadgeStyle(effect) {
  switch (effect) {
    case 'Blinded':
      return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
    case 'Poisoned':
      return 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.25)]';
    case 'Restrained':
      return 'bg-orange-950/60 text-orange-300 border-orange-500/40';
    case 'Charmed':
      return 'bg-pink-950/60 text-pink-300 border-pink-500/40';
    case 'Frightened':
      return 'bg-violet-950/60 text-violet-300 border-violet-500/40';
    case 'Stunned':
      return 'bg-yellow-950/60 text-yellow-300 border-yellow-500/40';
    case 'Prone':
      return 'bg-slate-900 text-slate-300 border-slate-700';
    case 'Paralyzed':
      return 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40';
    default:
      return 'bg-black/40 text-gray-400 border-slate-800';
  }
}

export default function CombatBoardPage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDM = Boolean(
    campaign?.dmId
      ? user?.uid && user.uid === campaign.dmId
      : profile?.role === 'dm' || user?.role === 'dm'
  );

  // DM ends combat encounter completely
  const handleEndCombat = async () => {
    try {
      await endCombatSession(campaignId, players);
    } catch (err) {
      console.warn('[CombatBoardPage] Failed to end combat session:', err);
    }
    try {
      window.close();
    } catch (e) {
      // ignore
    }
    setTimeout(() => {
      navigate(`/dm/${campaignId}`);
    }, 250);
  };

  // Player closes combat board window after notification
  const handleCloseCombatBoard = () => {
    try {
      window.close();
    } catch (e) {
      // ignore
    }
    setTimeout(() => {
      navigate('/player');
    }, 250);
  };

  // Listen for local combat_ended event
  useEffect(() => {
    const handleCombatEndedEvent = () => {
      if (!isDM) {
        setCampaign((prev) => (prev ? { ...prev, combatActive: false, combatEnded: true } : prev));
      }
    };
    window.addEventListener('unendingvoid:combat_ended', handleCombatEndedEvent);
    return () => {
      window.removeEventListener('unendingvoid:combat_ended', handleCombatEndedEvent);
    };
  }, [isDM]);

  // Manual HP modification inputs per combatant: { [cId]: number }
  const [manualHpInputs, setManualHpInputs] = useState({});

  // Spawn hostile modal state
  const [showSpawnModal, setShowSpawnModal] = useState(false);
  const [customHostileName, setCustomHostileName] = useState('');
  const [customHostileHp, setCustomHostileHp] = useState(30);
  const [customHostileDex, setCustomHostileDex] = useState(2);
  const [customHostileAc, setCustomHostileAc] = useState(14);
  const [customHostileShields, setCustomHostileShields] = useState(10);

  // Dragging state
  const [draggedTokenId, setDraggedTokenId] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Selected token state (for click-to-target)
  const [selectedTokenId, setSelectedTokenId] = useState(null);

  // Grid Zoom / Pan
  const [zoomLevel, setZoomLevel] = useState(1);

  // Subscribe to campaign
  useEffect(() => {
    if (!campaignId || !db) return;

    const unsubCamp = onSnapshot(doc(db, 'campaigns', campaignId), (snap) => {
      if (snap.exists()) {
        setCampaign(snap.data());
      }
      setLoading(false);
    });

    return () => unsubCamp();
  }, [campaignId]);

  // Fetch full player documents for all characters in activeCharacters and turnOrder
  const playerIdsKey = Array.from(
    new Set([
      ...(campaign?.activeCharacters || []).map((ac) => ac.characterId || ac.uid),
      ...(campaign?.turnOrder || []).filter((id) => !(campaign?.enemies || []).some((e) => e.id === id)),
    ].filter(Boolean))
  ).sort().join(',');

  useEffect(() => {
    if (!playerIdsKey || !db) return;
    const ids = playerIdsKey.split(',').filter(Boolean);
    const unsubs = ids.map((pId) => {
      return onSnapshot(
        doc(db, 'players', pId),
        (snap) => {
          if (snap.exists()) {
            setPlayers((prev) => {
              const filtered = prev.filter((p) => p.id !== snap.id && p.uid !== snap.id);
              return [...filtered, { id: snap.id, ...snap.data() }];
            });
          }
        },
        (err) => console.warn('[CombatBoardPage] Player fetch error:', err.message)
      );
    });

    return () => unsubs.forEach((u) => u());
  }, [playerIdsKey]);

  // Auto-populate default token positions if any combatant is missing coordinates
  const missingTokensKey = (campaign?.turnOrder || [])
    .filter((id) => !campaign?.combatState?.tokens?.[id])
    .join(',');

  useEffect(() => {
    if (!campaignId || !isDM || !missingTokensKey) return;

    const existingTokens = campaign?.combatState?.tokens || {};
    const enemyIds = new Set((campaign?.enemies || []).map((e) => e.id));

    let pIdx = 0;
    let eIdx = 0;
    (campaign?.turnOrder || []).forEach((id) => {
      if (!existingTokens[id]) {
        if (!enemyIds.has(id)) {
          const defX = 4;
          const defY = Math.min(30, 6 + pIdx * 3);
          pIdx++;
          updateTokenPosition(campaignId, id, defX, defY);
        } else {
          const defX = 27;
          const defY = Math.min(30, 6 + eIdx * 3);
          eIdx++;
          updateTokenPosition(campaignId, id, defX, defY);
        }
      }
    });
  }, [campaignId, isDM, missingTokensKey]);

  if (loading) return <LoadingSpinner />;
  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center font-mono">
        {t('combatBoard.campaignNotFound', 'Campaign not found.')}
      </div>
    );
  }

  const combatMode = campaign.combatMode || 'ground';
  const turnOrder = campaign.turnOrder || [];
  const enemies = campaign.enemies || [];
  const currentTurn = campaign.currentTurn || 0;
  const round = campaign.round || 1;
  const combatState = campaign.combatState || { tokens: {}, targets: {}, playerStatuses: {}, playerEffects: {} };
  const tokens = combatState.tokens || {};
  const targets = combatState.targets || {};

  // Find the viewer's personal active character (if player)
  const myActiveChar = (campaign?.activeCharacters || []).find(
    (ac) => ac.uid === user?.uid || ac.ownerId === user?.uid || ac.characterId === user?.uid
  );
  const myPlayerChar = players.find(
    (p) => p.uid === user?.uid || p.ownerId === user?.uid || p.id === user?.uid || p.id === myActiveChar?.characterId
  );
  const myCharId = myPlayerChar?.id || myPlayerChar?.uid || myActiveChar?.characterId || myActiveChar?.uid;

  // Build resolved combatants list with robust fallback names, AC, and Shields
  const allCombatants = turnOrder.map((id) => {
    const p = players.find((x) => x.id === id || x.uid === id);
    if (p) {
      const pName = p.displayName || p.name || p.characterName || 'Operative';
      const status = combatState.playerStatuses?.[id] || p.status || 'Normal';
      const effect = combatState.playerEffects?.[id] || p.effect || 'None';

      let pAc = p.armorClass ?? p.ac;
      let pShields = p.shields;
      let pMaxShields = p.maxShields;
      if (combatMode === 'ship' && (p.ship || p.spaceship)) {
        const s = p.ship || p.spaceship;
        pAc = s.armorClass ?? s.ac ?? pAc ?? 16;
        pShields = s.shields ?? pShields ?? 100;
        pMaxShields = s.maxShields ?? s.shields ?? pMaxShields ?? 100;
      }

      const ac = (campaign.activeCharacters || []).find((x) => (x.characterId || x.uid) === id);
      const avatarUrl = p.avatarUrl || p.imageUrl || p.photoURL || ac?.avatarUrl || ac?.imageUrl || null;

      return {
        ...p,
        id,
        name: pName,
        displayName: pName,
        avatarUrl,
        hp: p.hp ?? p.maxHp ?? 100,
        maxHp: p.maxHp ?? 100,
        armorClass: pAc ?? (combatMode === 'ship' ? 16 : 14),
        shields: pShields ?? (combatMode === 'ship' ? 100 : 15),
        maxShields: pMaxShields ?? pShields ?? (combatMode === 'ship' ? 100 : 15),
        status,
        effect,
        isEnemy: false,
      };
    }

    const e = enemies.find((x) => x.id === id);
    if (e) {
      const eName = e.displayName || e.name || 'Hostile Unit';
      const eAc = e.armorClass ?? e.ac ?? (combatMode === 'ship' ? 15 : 14);
      const eShields = e.shields ?? (combatMode === 'ship' ? 40 : 10);
      const eMaxShields = e.maxShields ?? e.shields ?? (combatMode === 'ship' ? 40 : 10);
      return {
        ...e,
        id,
        name: eName,
        displayName: eName,
        avatarUrl: e.avatarUrl || e.imageUrl || null,
        hp: e.hp ?? 30,
        maxHp: e.maxHp ?? e.hp ?? 30,
        armorClass: eAc,
        shields: eShields,
        maxShields: eMaxShields,
        status: e.status || 'Normal',
        effect: e.effect || 'None',
        isEnemy: true,
      };
    }

    const ac = (campaign.activeCharacters || []).find((x) => (x.characterId || x.uid) === id);
    if (ac) {
      const acName = ac.displayName || ac.name || ac.characterName || 'Operative';
      return {
        ...ac,
        id,
        name: acName,
        displayName: acName,
        hp: ac.hp ?? 100,
        maxHp: ac.maxHp ?? 100,
        armorClass: ac.armorClass ?? ac.ac ?? 14,
        shields: ac.shields ?? 15,
        maxShields: ac.maxShields ?? ac.shields ?? 15,
        status: combatState.playerStatuses?.[id] || 'Normal',
        effect: combatState.playerEffects?.[id] || 'None',
        isEnemy: false,
      };
    }

    return {
      id,
      name: 'Operative',
      displayName: 'Operative',
      hp: 100,
      maxHp: 100,
      armorClass: 14,
      shields: 15,
      maxShields: 15,
      status: 'Normal',
      effect: 'None',
      isEnemy: false,
    };
  });

  // Ensure every combatant has a starting token position on the map
  const activeCombatant = allCombatants[currentTurn] || allCombatants[0];

  // Turn management for DM
  const handleNextTurn = async () => {
    if (!isDM || allCombatants.length === 0) return;
    const nextIdx = (currentTurn + 1) % allCombatants.length;
    const nextRound = nextIdx === 0 ? round + 1 : round;
    await advanceCombatTurn(campaignId, nextIdx, nextRound);
  };

  const handlePrevTurn = async () => {
    if (!isDM || allCombatants.length === 0) return;
    const prevIdx = (currentTurn - 1 + allCombatants.length) % allCombatants.length;
    const prevRound = currentTurn === 0 && round > 1 ? round - 1 : round;
    await advanceCombatTurn(campaignId, prevIdx, prevRound);
  };

  // Drag and drop handlers
  const handleDragStart = (e, tokenId) => {
    e.dataTransfer.setData('tokenId', tokenId);
    setDraggedTokenId(tokenId);
  };

  const handleDragOver = (e, x, y) => {
    e.preventDefault();
    setDragOverCell({ x, y });
  };

  const handleDrop = async (e, x, y) => {
    e.preventDefault();
    const tokenId = e.dataTransfer.getData('tokenId') || draggedTokenId;
    setDraggedTokenId(null);
    setDragOverCell(null);

    if (!tokenId) return;

    // Check movement permission
    if (!isDM) {
      const p = players.find((p) => p.id === tokenId || p.uid === tokenId);
      if (!p || (p.ownerId !== user?.uid && p.uid !== user?.uid)) {
        return; // Player can only move their own token
      }
    }

    await updateTokenPosition(campaignId, tokenId, x, y);
  };

  // Targeting: click on enemy token
  const handleTokenClick = async (clickedCombatantId) => {
    if (!clickedCombatantId) return;

    // If player: sets their own character's target to clickedCombatantId
    if (!isDM && myCharId) {
      if (myCharId === clickedCombatantId) {
        // Deselect target
        await setCombatTarget(campaignId, myCharId, null);
      } else {
        await setCombatTarget(campaignId, myCharId, clickedCombatantId);
      }
      return;
    }

    // If DM: select/deselect token
    if (selectedTokenId === clickedCombatantId) {
      setSelectedTokenId(null);
    } else {
      setSelectedTokenId(clickedCombatantId);
    }
  };

  // Damage & Healing controls (DM only)
  const handleApplyDamage = async (combatantId, isEnemy, customAmt = null) => {
    const amt = customAmt !== null ? Number(customAmt) : Number(manualHpInputs[combatantId] || 0);
    if (!amt || isNaN(amt) || amt <= 0) return;

    const c = allCombatants.find((x) => x.id === combatantId);
    if (!c) return;

    let curShields = c.shields ?? 0;
    let curHp = c.hp ?? 0;
    let remainingDmg = amt;

    let newShields = curShields;
    if (curShields > 0) {
      if (remainingDmg <= curShields) {
        newShields = curShields - remainingDmg;
        remainingDmg = 0;
      } else {
        remainingDmg -= curShields;
        newShields = 0;
      }
    }

    const newHp = Math.max(0, curHp - remainingDmg);
    const newStatus = newHp === 0 ? 'Dead' : c.status;

    await updateCombatantStats(campaignId, combatantId, isEnemy, {
      hp: newHp,
      shields: newShields,
      status: newStatus,
    });
    setManualHpInputs((prev) => ({ ...prev, [combatantId]: '' }));
  };

  const handleApplyHeal = async (combatantId, isEnemy, customAmt = null) => {
    const amt = customAmt !== null ? Number(customAmt) : Number(manualHpInputs[combatantId] || 0);
    if (!amt || isNaN(amt) || amt <= 0) return;

    const c = allCombatants.find((x) => x.id === combatantId);
    if (!c) return;

    const maxHp = c.maxHp || 100;
    const curHp = c.hp || 0;
    const maxShields = c.maxShields || 0;
    const curShields = c.shields || 0;

    let newHp = Math.min(maxHp, curHp + amt);
    let overflow = Math.max(0, (curHp + amt) - maxHp);
    let newShields = curShields;
    if (overflow > 0 && maxShields > 0) {
      newShields = Math.min(maxShields, curShields + overflow);
    }

    const newStatus = newHp > 0 && c.status === 'Dead' ? 'Normal' : c.status;

    await updateCombatantStats(campaignId, combatantId, isEnemy, {
      hp: newHp,
      shields: newShields,
      status: newStatus,
    });
    setManualHpInputs((prev) => ({ ...prev, [combatantId]: '' }));
  };

  const handleStatusChange = async (combatantId, isEnemy, newStatus) => {
    await updateCombatantStats(campaignId, combatantId, isEnemy, { status: newStatus });
  };

  const handleEffectChange = async (combatantId, isEnemy, newEffect) => {
    await updateCombatantStats(campaignId, combatantId, isEnemy, { effect: newEffect });
  };

  // Spawn dynamic hostile/NPC
  const handleSpawnHostile = async (preset = null) => {
    const hostileData = preset
      ? {
          name: preset.name,
          hp: preset.hp,
          maxHp: preset.hp,
          dexMod: preset.dexMod,
          armorClass: preset.armorClass ?? 14,
          shields: preset.shields ?? 0,
          maxShields: preset.shields ?? 0,
          status: 'Normal',
          effect: 'None',
          isEnemy: true,
        }
      : {
          name: customHostileName.trim() || 'Custom Hostile',
          hp: Number(customHostileHp) || 30,
          maxHp: Number(customHostileHp) || 30,
          dexMod: Number(customHostileDex) || 2,
          armorClass: Number(customHostileAc) || 14,
          shields: Number(customHostileShields) || 0,
          maxShields: Number(customHostileShields) || 0,
          status: 'Normal',
          effect: 'None',
          isEnemy: true,
        };

    await addCombatantToCombat(campaignId, hostileData);
    setShowSpawnModal(false);
    setCustomHostileName('');
  };

  // Render tactical grid
  const renderGridCells = () => {
    const cells = [];

    // Find all targeted enemy IDs
    const targetedEnemyIds = new Set(Object.values(targets).filter(Boolean));

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        // Active token at this coordinate
        const activeTokenId = Object.keys(tokens).find((id) => tokens[id]?.x === x && tokens[id]?.y === y);
        let tokenCombatant = null;
        let isSilhouette = false;

        if (activeTokenId) {
          tokenCombatant = allCombatants.find((c) => c.id === activeTokenId);
        }

        // Ghost silhouette during drag & drop preview
        if (draggedTokenId && dragOverCell && dragOverCell.x === x && dragOverCell.y === y) {
          tokenCombatant = allCombatants.find((c) => c.id === draggedTokenId);
          isSilhouette = true;
        }

        const isActiveTurn = tokenCombatant && activeCombatant?.id === tokenCombatant.id;
        const isTargeted = tokenCombatant && targetedEnemyIds.has(tokenCombatant.id);
        const isMyChar = tokenCombatant && tokenCombatant.id === myCharId;
        const canDrag = isDM || isMyChar;
        const canSeeTokenStats = isDM || isMyChar;

        cells.push(
          <div
            key={`${x}-${y}`}
            onDragOver={(e) => handleDragOver(e, x, y)}
            onDrop={(e) => handleDrop(e, x, y)}
            onClick={() => tokenCombatant && handleTokenClick(tokenCombatant.id)}
            className={`w-7 h-7 sm:w-8 sm:h-8 border border-slate-800/60 flex items-center justify-center relative transition-colors ${
              dragOverCell?.x === x && dragOverCell?.y === y ? 'bg-cyan-500/20' : 'hover:bg-white/5'
            } ${isActiveTurn ? 'bg-emerald-950/20' : ''}`}
          >
            {/* Coordinate watermark every 5 squares */}
            {x % 5 === 0 && y % 5 === 0 && (
              <span className="absolute top-0.5 left-0.5 text-[7px] text-gray-700 font-mono pointer-events-none">
                {x},{y}
              </span>
            )}

            {/* Token element */}
            {tokenCombatant && (
              <div
                draggable={canDrag}
                onDragStart={(e) => canDrag && handleDragStart(e, tokenCombatant.id)}
                title={`${tokenCombatant.name} (${tokenCombatant.isEnemy ? 'Hostile' : 'Operative'})\n${
                  canSeeTokenStats
                    ? `HP: ${tokenCombatant.hp}/${tokenCombatant.maxHp || 100}\nAC: ${tokenCombatant.armorClass ?? 14} · Shield: ${tokenCombatant.shields ?? 0}/${tokenCombatant.maxShields ?? tokenCombatant.shields ?? 0}\n`
                    : ''
                }Status: ${tokenCombatant.status}\nEffect: ${tokenCombatant.effect}`}
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex flex-col items-center justify-center select-none cursor-pointer transition-transform relative ${
                  isSilhouette ? 'opacity-40 border-2 border-dashed border-neon-cyan animate-pulse' : 'opacity-100 shadow-md'
                } ${
                  tokenCombatant.isEnemy
                    ? 'bg-gradient-to-br from-red-600 to-rose-950 text-white border border-red-400'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-900 text-white border border-cyan-300 font-bold'
                } ${
                  isActiveTurn
                    ? 'ring-2 ring-neon-green shadow-[0_0_15px_#10b981] scale-110 z-20'
                    : isTargeted
                      ? 'ring-2 ring-red-500 shadow-[0_0_15px_#ef4444] z-10'
                      : ''
                }`}
              >
                {/* Pawn Icon / Avatar Image */}
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                  {(tokenCombatant.avatarUrl || tokenCombatant.imageUrl || tokenCombatant.photoURL) ? (
                    <img
                      src={tokenCombatant.avatarUrl || tokenCombatant.imageUrl || tokenCombatant.photoURL}
                      alt={tokenCombatant.name}
                      className="w-full h-full object-cover rounded-full pointer-events-none"
                    />
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-black leading-none uppercase">
                      {combatMode === 'ship'
                        ? tokenCombatant.isEnemy ? '🛸' : '🚀'
                        : tokenCombatant.isEnemy
                          ? tokenCombatant.name.slice(0, 2).toUpperCase()
                          : tokenCombatant.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Status Overlay Icon (Dead / Unconscious) */}
                {tokenCombatant.status === 'Dead' && (
                  <span className="absolute -top-1 -right-1 text-[10px] filter drop-shadow">💀</span>
                )}
                {tokenCombatant.status === 'Unconscious' && (
                  <span className="absolute -top-1 -right-1 text-[10px] filter drop-shadow">💤</span>
                )}

                {/* Effect Badge (Blinded, Poisoned, Restrained, Charmed, Stunned, etc.) */}
                {tokenCombatant.effect && tokenCombatant.effect !== 'None' && (
                  <span
                    className={`absolute -bottom-1 -left-1 text-[8px] rounded-full px-0.5 border flex items-center justify-center ${
                      tokenCombatant.effect === 'Poisoned'
                        ? 'bg-emerald-950/95 border-emerald-400 text-emerald-200 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                        : tokenCombatant.effect === 'Blinded'
                          ? 'bg-amber-950/95 border-amber-400 text-amber-200'
                          : tokenCombatant.effect === 'Restrained'
                            ? 'bg-orange-950/95 border-orange-400 text-orange-200'
                            : 'bg-purple-950/90 border-purple-400 text-purple-200'
                    }`}
                    title={tokenCombatant.effect}
                  >
                    {renderEffectIcon(tokenCombatant.effect)}
                  </span>
                )}

                {/* Targeted Indicator Crosshair */}
                {isTargeted && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black text-red-400 tracking-tighter uppercase">
                    🎯
                  </span>
                )}
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="h-screen w-screen bg-[#050814] text-white font-mono flex flex-col overflow-hidden select-none">
      {/* Standalone Tactical Top Bar */}
      <div className="h-12 border-b border-slate-800 bg-[#090d18] px-4 flex items-center justify-between shrink-0 shadow-md relative">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚔️</span>
          <div>
            <h1 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider text-white">
              {t('combatBoard.tacticalCommand', 'Tactical Command')} // {campaign.name || 'Encounter'}
            </h1>
            <span className="text-[10px] text-gray-400">
              {combatMode === 'ship'
                ? t('combatBoard.shipScale', '500 m / sq (Patrol Craft)')
                : t('combatBoard.groundScale', '5 ft / sq (Medium Unit)')}
            </span>
          </div>
        </div>

        {/* Top Middle: End Combat Button (DM only) */}
        {isDM && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center z-20">
            <button
              onClick={handleEndCombat}
              className="px-4 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/60 hover:border-red-400 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center gap-2 cursor-pointer active:scale-95"
              title={t('combatBoard.endCombat', 'End Combat')}
            >
              <span>⏹</span>
              <span>{t('combatBoard.endCombat', 'End Combat')}</span>
            </button>
          </div>
        )}

        {/* Global Turn / Round Telemetry */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-black/60 border border-slate-700 flex items-center gap-2 text-xs">
            <span className="text-gray-400 uppercase text-[10px]">
              {t('combatBoard.round', 'Round')}: <strong className="text-neon-cyan">{round}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-gray-400 uppercase text-[10px]">
              {t('combatBoard.turn', 'Turn')}:{' '}
              <strong className="text-neon-green">
                {activeCombatant?.displayName || activeCombatant?.name || '---'}
              </strong>
            </span>
          </div>

          {/* DM Turn Stepping Controls */}
          {isDM && (
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevTurn}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-gray-300 font-bold text-xs transition-colors"
                title={t('combatBoard.prevTurn', 'Prev Turn')}
              >
                ◀
              </button>
              <button
                onClick={handleNextTurn}
                className="px-3 py-1 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 font-bold text-xs transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                title={t('combatBoard.nextTurn', 'Next Turn')}
              >
                {t('combatBoard.nextTurn', 'Next Turn')} ▶
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 3-Column Tactical Display */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANEL: TURN ORDER, STATS, DAMAGE & HEAL, STATUS & EFFECT */}
        <div className="w-full md:w-88 lg:w-96 bg-[#070b14] border-r border-slate-800 flex flex-col shrink-0 overflow-hidden">
          {/* Panel Header & Spawn Hostile Button */}
          <div className="p-3 border-b border-slate-800 bg-[#0c1220] flex items-center justify-between shrink-0">
            <span className="font-display font-black text-xs uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>👥</span>
              <span>
                {t('combat.turnOrder', 'Tactical Initiative Order')} ({allCombatants.length})
              </span>
            </span>

            {isDM && (
              <button
                onClick={() => setShowSpawnModal(true)}
                className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/50 text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                {t('combatBoard.addHostile', '+ Spawn Hostile / NPC')}
              </button>
            )}
          </div>

          {/* Turn Order Cards List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {allCombatants.map((c, idx) => {
              const isActive = idx === currentTurn;
              const isTargeted = Object.values(targets).includes(c.id);
              const isMyCharacter = Boolean(
                myCharId && (c.id === myCharId || c.uid === myCharId || c.characterId === myCharId)
              );
              const canViewInfo = isDM || isMyCharacter;

              return (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-neon-cyan/15 border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                      : isTargeted
                        ? 'bg-red-500/10 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                        : 'bg-[#0d1424] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Title & Type */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-bold text-gray-400 font-mono">{idx + 1}.</span>
                      {c.avatarUrl || c.imageUrl || c.photoURL ? (
                        <img
                          src={c.avatarUrl || c.imageUrl || c.photoURL}
                          alt={c.name}
                          className="w-5 h-5 rounded-full object-cover border border-neon-cyan/50 shrink-0"
                        />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                          {c.isEnemy ? '💀' : '👤'}
                        </span>
                      )}
                      <span className="text-sm font-bold text-white truncate">
                        {c.displayName || c.name || (c.isEnemy ? 'Hostile Unit' : 'Operative')}
                      </span>
                    </div>

                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        c.isEnemy
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/40'
                      }`}
                    >
                      {c.isEnemy ? t('combatBoard.hostile', 'Hostile') : t('combatBoard.operative', 'Operative')}
                    </span>
                  </div>

                  {/* Health, AC and Shield Section - for DM all shown, for player only his own information */}
                  {canViewInfo && (
                    <div className="space-y-2 mb-2.5">
                      {/* Health Section */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-300 font-mono">
                          <span className="text-[10px] uppercase text-gray-400 font-bold">{t('combatBoard.hp', 'HP')}</span>
                          <span className="font-bold">
                            {c.hp} / {c.maxHp || 100}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-slate-700/60">
                          <div
                            className={`h-full transition-all duration-300 ${
                              c.hp / (c.maxHp || 100) > 0.5
                                ? 'bg-neon-green'
                                : c.hp / (c.maxHp || 100) > 0.25
                                  ? 'bg-amber-400'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, (c.hp / (c.maxHp || 100)) * 100))}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* AC and Shield Row */}
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-black/50 rounded-lg p-2 border border-slate-800">
                        {/* AC */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-neon-cyan text-sm">🛡️</span>
                          <div>
                            <span className="text-[9px] uppercase text-gray-400 block leading-tight font-bold">
                              {t('combatBoard.ac', 'AC')}
                            </span>
                            <span className="font-bold text-white text-xs">
                              {c.armorClass ?? 14}
                            </span>
                          </div>
                        </div>

                        {/* Shield */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-cyan-400 text-sm">⚡</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center text-[9px] uppercase text-gray-400 leading-tight">
                              <span className="font-bold truncate">{t('combatBoard.shield', 'Shield')}</span>
                              <span className="font-bold text-cyan-300 font-mono text-[10px] ml-1 shrink-0">
                                {c.shields ?? 0} / {c.maxShields ?? c.shields ?? 0}
                              </span>
                            </div>
                            <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden border border-cyan-900/60 mt-0.5">
                              <div
                                className="h-full bg-cyan-400 transition-all duration-300 shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                                style={{
                                  width: `${
                                    (c.maxShields ?? c.shields ?? 0) > 0
                                      ? Math.min(100, Math.max(0, ((c.shields ?? 0) / (c.maxShields || c.shields || 1)) * 100))
                                      : 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DM Manual Damage & Heal Input Form */}
                  {isDM && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          placeholder={t('combatBoard.amtPlaceholder', 'Amt')}
                          value={manualHpInputs[c.id] ?? ''}
                          onChange={(e) =>
                            setManualHpInputs({
                              ...manualHpInputs,
                              [c.id]: e.target.value,
                            })
                          }
                          className="w-16 bg-black/70 border border-slate-700 rounded px-2 py-1 text-center text-xs text-white font-bold focus:border-neon-cyan focus:outline-none"
                        />
                        <button
                          onClick={() => handleApplyDamage(c.id, c.isEnemy)}
                          className="flex-1 py-1 px-2 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50 font-bold text-xs uppercase transition-all"
                        >
                          💥 {t('combatBoard.damage', 'Damage')}
                        </button>
                        <button
                          onClick={() => handleApplyHeal(c.id, c.isEnemy)}
                          className="flex-1 py-1 px-2 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/50 font-bold text-xs uppercase transition-all"
                        >
                          💚 {t('combatBoard.heal', 'Heal')}
                        </button>
                      </div>

                      {/* Quick Shortcut Buttons */}
                      <div className="grid grid-cols-4 gap-1 text-[10px]">
                        <button
                          onClick={() => handleApplyDamage(c.id, c.isEnemy, 1)}
                          className="py-0.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 font-bold"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleApplyDamage(c.id, c.isEnemy, 5)}
                          className="py-0.5 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 font-bold"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleApplyHeal(c.id, c.isEnemy, 1)}
                          className="py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 font-bold"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleApplyHeal(c.id, c.isEnemy, 5)}
                          className="py-0.5 rounded bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 font-bold"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status & Effect Area */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-1.5 border-t border-slate-800/60 text-xs">
                    {/* Status Area */}
                    <div>
                      <span className="text-[9px] uppercase text-gray-500 block mb-0.5">
                        {t('combatBoard.status', 'Status')}
                      </span>
                      {isDM ? (
                        <select
                          value={c.status || 'Normal'}
                          onChange={(e) => handleStatusChange(c.id, c.isEnemy, e.target.value)}
                          className="w-full bg-black/80 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-gray-200 focus:border-neon-cyan focus:outline-none"
                        >
                          {STATUS_LIST.map((st) => (
                            <option key={st} value={st}>
                              {st === 'Normal'
                                ? t('combatBoard.normal', 'Normal')
                                : st === 'Unconscious'
                                  ? t('combatBoard.unconscious', 'Unconscious')
                                  : t('combatBoard.dead', 'Dead')}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            c.status === 'Dead'
                              ? 'bg-red-500/20 text-red-400 border-red-500/40'
                              : c.status === 'Unconscious'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-neon-green/10 text-neon-green border-neon-green/30'
                          }`}
                        >
                          {c.status}
                        </span>
                      )}
                    </div>

                    {/* Effect Area */}
                    <div>
                      <span className="text-[9px] uppercase text-gray-500 block mb-0.5 font-bold">
                        {t('combatBoard.effect', 'Effect')}
                      </span>
                      {isDM ? (
                        <select
                          value={c.effect || 'None'}
                          onChange={(e) => handleEffectChange(c.id, c.isEnemy, e.target.value)}
                          className="w-full bg-black/80 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-gray-200 focus:border-neon-cyan focus:outline-none"
                        >
                          {EFFECTS_LIST.map((ef) => (
                            <option key={ef} value={ef}>
                              {ef === 'None'
                                ? t('combatBoard.none', 'None')
                                : `${getEffectPlainIcon(ef)} ${ef}`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getEffectBadgeStyle(
                            c.effect
                          )}`}
                        >
                          {c.effect && c.effect !== 'None' && (
                            <span className="text-[11px] leading-none">{renderEffectIcon(c.effect)}</span>
                          )}
                          <span>{c.effect || 'None'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL: 32x32 TACTICAL INTERACTIVE GRID */}
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 bg-[#03060f] relative overflow-auto">
          {/* Grid Scale & Targeting Banner */}
          <div className="mb-2 flex items-center justify-between w-full max-w-4xl text-xs text-gray-400 px-2 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></span>
              <span className="font-bold text-white uppercase text-[11px]">
                {combatMode === 'ship'
                  ? t('combat.modeShip', 'Ship vs Ship (Space)')
                  : t('combat.modeGround', 'Player vs Player (Ground)')}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-[10px] text-neon-cyan font-bold">
                {combatMode === 'ship'
                  ? t('combatBoard.shipScale', '500 m / sq (Patrol Craft)')
                  : t('combatBoard.groundScale', '5 ft / sq (Medium Unit)')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500">
                {isDM
                  ? 'Drag & Drop tokens anywhere'
                  : 'Drag your token to move · Click enemy to target'}
              </span>
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded border border-slate-800">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.1))}
                  className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-bold hover:bg-white/20"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="text-[9px] px-1 text-gray-300">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                  className="px-1.5 py-0.5 rounded bg-white/10 text-xs font-bold hover:bg-white/20"
                  title="Zoom In"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 32x32 Matrix Grid Container */}
          <div
            className="border-2 border-neon-cyan/50 bg-[#070d1a] shadow-[0_0_50px_rgba(0,240,255,0.15)] rounded-lg overflow-auto max-h-[calc(100vh-9rem)] max-w-full"
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(1.75rem, 2rem))`,
              }}
            >
              {renderGridCells()}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: QUANTUM ROLL LEDGER STREAM (DIRECTLY VISIBLE) */}
        <div className="w-full md:w-80 lg:w-88 bg-[#070b14] border-l border-slate-800 shrink-0 h-full overflow-hidden flex flex-col">
          <CombatRollLedger user={user} isDM={isDM} />
        </div>
      </div>

      {/* 3D Dice Simulation Engine (Toolbar hidden in standalone combat board) */}
      <DiceOverlay user={user} profile={user} isDM={isDM} showToolbar={false} />

      {/* DM Spawn Hostile / NPC Modal */}
      {showSpawnModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#090e1a] border-2 border-red-500/80 rounded-2xl p-5 max-w-md w-full shadow-[0_0_40px_rgba(239,68,68,0.4)] space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <span>💀</span>
                <span>{t('combatBoard.spawnHostileTitle', 'Spawn Tactical Hostile / NPC')}</span>
              </h3>
              <button
                onClick={() => setShowSpawnModal(false)}
                className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                {combatMode === 'ship'
                  ? t('combatBoard.presetShip', 'Vessel Targets')
                  : t('combatBoard.presetGround', 'Ground Combatants')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {(combatMode === 'ship' ? PRESET_HOSTILES_SPACE : PRESET_HOSTILES_GROUND).map((pr) => (
                  <button
                    key={pr.name}
                    onClick={() => handleSpawnHostile(pr)}
                    className="p-2 rounded-lg bg-[#0e1628] hover:bg-red-500/20 text-left border border-slate-800 hover:border-red-500/50 transition-all text-xs"
                  >
                    <span className="font-bold text-white block truncate">{pr.name}</span>
                    <span className="text-[10px] text-gray-400">
                      HP: <strong className="text-red-400">{pr.hp}</strong> · AC: <strong className="text-neon-cyan">{pr.armorClass || 14}</strong> · ⚡ <strong className="text-cyan-300">{pr.shields || 0}</strong>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Hostile Creator */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                {t('combatBoard.customUnit', 'Custom Unit')}
              </span>
              <div className="space-y-2 text-xs">
                <input
                  type="text"
                  placeholder={t('combatBoard.unitName', 'Unit Name (e.g. Belter Assassin)')}
                  value={customHostileName}
                  onChange={(e) => setCustomHostileName(e.target.value)}
                  className="w-full bg-black/60 border border-slate-700 rounded px-2.5 py-1.5 text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-gray-500 block">{t('combatBoard.unitHp', 'Max HP')}</span>
                    <input
                      type="number"
                      value={customHostileHp}
                      onChange={(e) => setCustomHostileHp(e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 rounded px-2 py-1 text-white font-bold focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block">{t('combatBoard.unitAc', 'Armor Class (AC)')}</span>
                    <input
                      type="number"
                      value={customHostileAc}
                      onChange={(e) => setCustomHostileAc(e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 rounded px-2 py-1 text-white font-bold focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-gray-500 block">{t('combatBoard.unitShields', 'Shields')}</span>
                    <input
                      type="number"
                      value={customHostileShields}
                      onChange={(e) => setCustomHostileShields(e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 rounded px-2 py-1 text-white font-bold focus:border-red-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block">{t('combatBoard.unitDex', 'DEX Modifier')}</span>
                    <input
                      type="number"
                      value={customHostileDex}
                      onChange={(e) => setCustomHostileDex(e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 rounded px-2 py-1 text-white font-bold focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => handleSpawnHostile()}
                  className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  ⚡ {t('combatBoard.spawnBtn', 'Spawn onto Grid')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMBAT ENDED / INACTIVE NOTIFICATION MODAL (PLAYERS ONLY) */}
      {!isDM && (!campaign.combatActive || campaign.combatEnded || !campaign.turnOrder || campaign.turnOrder.length === 0) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in font-mono"
        >
          <div className="relative max-w-md w-full bg-[#070b14] border-2 border-red-500 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.5)] space-y-5 text-center overflow-hidden">
            {/* Top Warning Stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

            {/* Tactical Alert Banner */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{t('combatBoard.combatEndedAlert', 'TACTICAL ALERT // ENGAGEMENT CONCLUDED')}</span>
              </div>
              <h2 className="font-display text-2xl font-black text-white tracking-wide uppercase pt-2">
                {t('combatBoard.combatEndedTitle', 'COMBAT HAS ENDED')}
              </h2>
              <p className="text-xs text-gray-400">
                {t(
                  'combatBoard.combatEndedPrompt',
                  'The Dungeon Master has ended the combat encounter. Tactical battle telemetry has been cleared.'
                )}
              </p>
            </div>

            {/* Tactical Grid Emblem */}
            <div className="bg-[#0e1628] p-5 rounded-xl border border-slate-700 flex flex-col items-center justify-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                ⏹
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                // GRID DISENGAGED //
              </span>
            </div>

            {/* ONLY ONE BUTTON: CLOSE COMBAT BOARD */}
            <button
              onClick={handleCloseCombatBoard}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-display font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(239,68,68,0.4)] cursor-pointer active:scale-95"
            >
              {t('combatBoard.closeBoard', 'Close Combat Board')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
