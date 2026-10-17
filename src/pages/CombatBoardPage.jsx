import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateTokenPosition, setCombatTarget, updateCombatantStats } from '../lib/campaignActions';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import DMIntelBroadcast from '../components/shared/DMIntelBroadcast';
import DiceOverlay from '../components/dice/DiceOverlay';

const GRID_SIZE = 32;

export default function CombatBoardPage() {
  const { campaignId } = useParams();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [campaign, setCampaign] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dragging state
  const [draggedToken, setDraggedToken] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Selected token state
  const [selectedToken, setSelectedToken] = useState(null);

  useEffect(() => {
    if (!campaignId) return;

    // Subscribe to campaign
    const unsubCamp = onSnapshot(doc(db, 'campaigns', campaignId), (snap) => {
      if (snap.exists()) {
        setCampaign(snap.data());
      }
      setLoading(false);
    });

    return () => {
      unsubCamp();
    };
  }, [campaignId]);

  // Secondary effect to fetch full player data based on activeCharacters
  useEffect(() => {
    if (!campaign || !campaign.activeCharacters || campaign.activeCharacters.length === 0) return;

    const unsubs = campaign.activeCharacters.map(ac => {
      return onSnapshot(doc(db, 'players', ac.characterId || ac.uid), (snap) => {
        if(snap.exists()) {
          setPlayers(prev => {
             const existing = prev.filter(p => p.id !== snap.id);
             return [...existing, { id: snap.id, ...snap.data() }];
          });
        }
      });
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [campaign?.activeCharacters]);

  if (loading) return <LoadingSpinner />;
  if (!campaign) return <div className="text-white p-8">{t('combatBoard.campaignNotFound') || 'Campaign not found.'}</div>;

  const combatMode = campaign.combatMode || 'ground';
  const turnOrder = campaign.turnOrder || [];
  const enemies = campaign.enemies || [];
  const currentTurn = campaign.currentTurn || 0;
  const combatState = campaign.combatState || { tokens: {}, targets: {}, playerEffects: {} };

  const isDM = user?.uid === campaign.dmId;

  const allCombatants = turnOrder.map(id => {
     let p = players.find(x => x.id === id);
     if (p) return { ...p, isEnemy: false };
     let e = enemies.find(x => x.id === id);
     if (e) return { ...e, isEnemy: true };
     let ac = (campaign.activeCharacters || []).find(x => (x.characterId || x.uid) === id);
     if (ac) return { ...ac, id, isEnemy: false };
     return { id, name: id, isEnemy: false };
  });

  const handleDragStart = (e, tokenId) => {
    e.dataTransfer.setData('tokenId', tokenId);
    setDraggedToken(tokenId);
  };

  const handleDragOver = (e, x, y) => {
    e.preventDefault();
    setDragOverCell({ x, y });
  };

  const handleDrop = async (e, x, y) => {
    e.preventDefault();
    const tokenId = e.dataTransfer.getData('tokenId');
    setDraggedToken(null);
    setDragOverCell(null);

    // Check permission
    if (!isDM) {
      const p = players.find(p => p.id === tokenId);
      if (!p || (p.ownerId !== user?.uid && p.uid !== user?.uid)) {
        return; // Not your token
      }
    }

    await updateTokenPosition(campaignId, tokenId, x, y);
  };

  const handleCellClick = async (x, y) => {
    // Check if we clicked a token
    const clickedTokenId = Object.keys(combatState.tokens || {}).find(id => {
      const t = combatState.tokens[id];
      return t.x === x && t.y === y;
    });

    if (clickedTokenId) {
      if (selectedToken) {
        // If we have a token selected and click another, set as target
        if (selectedToken !== clickedTokenId) {
           await setCombatTarget(campaignId, selectedToken, clickedTokenId);
           setSelectedToken(null);
        } else {
           setSelectedToken(null); // deselect
        }
      } else {
        // Select token if we have permission
        if (isDM) {
          setSelectedToken(clickedTokenId);
        } else {
          const p = players.find(p => p.id === clickedTokenId);
          if (p && (p.ownerId === user?.uid || p.uid === user?.uid)) {
            setSelectedToken(clickedTokenId);
          }
        }
      }
    } else if (selectedToken) {
      // Clicked empty space with token selected -> cancel selection
      setSelectedToken(null);
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        // Check for token
        let token = null;
        let isSilhouette = false;

        // Active token
        const activeTokenId = Object.keys(combatState.tokens || {}).find(id => {
          const t = combatState.tokens[id];
          return t.x === x && t.y === y;
        });

        if (activeTokenId && activeTokenId !== draggedToken) {
          token = allCombatants.find(c => c.id === activeTokenId);
        }

        // Silhouette
        if (draggedToken && dragOverCell && dragOverCell.x === x && dragOverCell.y === y) {
          token = allCombatants.find(c => c.id === draggedToken);
          isSilhouette = true;
        }

        // Target highlights
        let isTargetedBySelected = false;
        let isSelected = false;
        if (selectedToken && activeTokenId === selectedToken) {
          isSelected = true;
        } else if (selectedToken && activeTokenId && combatState.targets?.[selectedToken] === activeTokenId) {
          isTargetedBySelected = true;
        } else if (activeTokenId && Object.values(combatState.targets || {}).includes(activeTokenId)) {
           // Maybe lightly highlight if targeted by someone else?
        }

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`w-6 h-6 border border-slate-700/50 flex items-center justify-center cursor-pointer transition-colors
              ${dragOverCell?.x === x && dragOverCell?.y === y ? 'bg-white/10' : 'hover:bg-white/5'}
              ${isSelected ? 'bg-neon-green/30 border-neon-green' : ''}
              ${isTargetedBySelected ? 'bg-red-500/30 border-red-500' : ''}
            `}
            onDragOver={(e) => handleDragOver(e, x, y)}
            onDrop={(e) => handleDrop(e, x, y)}
            onClick={() => handleCellClick(x, y)}
          >
            {token && (
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, token.id)}
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] select-none
                  ${isSilhouette ? 'opacity-50' : 'opacity-100 shadow-[0_0_8px_rgba(0,0,0,0.8)]'}
                  ${token.isEnemy ? 'bg-red-600/80 text-white' : 'bg-neon-cyan/80 text-black font-bold'}
                `}
                title={token.name}
              >
                {token.isEnemy ? 'E' : token.name?.substring(0,2).toUpperCase()}
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  const handleStatChange = async (combatantId, isEnemy, deltaHp) => {
    let currentHp;
    if (isEnemy) {
       const e = enemies.find(x => x.id === combatantId);
       currentHp = e ? e.hp : 0;
    } else {
       const p = players.find(x => x.id === combatantId);
       currentHp = p ? p.hp : 0;
    }
    const newHp = Math.max(0, currentHp + deltaHp);
    await updateCombatantStats(campaignId, combatantId, isEnemy, { hp: newHp });
  };

  const handleEffectChange = async (combatantId, isEnemy, effect) => {
    await updateCombatantStats(campaignId, combatantId, isEnemy, { effect });
  };

  const effectsList = ['None', 'Prone', 'Stunned', 'Blinded', 'Charmed', 'Frightened', 'Poisoned'];

  return (
    <div className="min-h-dvh bg-void-bg text-white font-mono flex flex-col sm:flex-row overflow-hidden">

      {/* Left Panel: Turn Order & Stats */}
      <div className="w-full sm:w-80 bg-black border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
        <h2 className="text-neon-cyan font-bold uppercase border-b border-white/10 pb-2">
          {t('combatBoard.tacticalCommand') || 'Tactical Command'}
        </h2>
        <div className="space-y-3">
          {allCombatants.map((c, idx) => {
            const isActive = currentTurn === idx;
            const effect = c.isEnemy ? c.effect : combatState.playerEffects?.[c.id];

            return (
              <div key={c.id} className={`p-3 rounded-lg border ${isActive ? 'bg-neon-cyan/10 border-neon-cyan' : 'bg-white/5 border-slate-700'}`}>
                 <div className="flex justify-between items-start mb-2">
                   <span className="font-bold text-sm truncate">{idx + 1}. {c.name}</span>
                   <span className="text-xs bg-black/50 px-1 rounded">{c.hp}/{c.maxHp || '?'} HP</span>
                 </div>

                 {isDM && (
                   <div className="flex gap-2 mt-2">
                     <button onClick={() => handleStatChange(c.id, c.isEnemy, -1)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px]">-1 HP</button>
                     <button onClick={() => handleStatChange(c.id, c.isEnemy, -5)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-[10px]">-5 HP</button>
                     <button onClick={() => handleStatChange(c.id, c.isEnemy, 1)} className="px-2 py-1 bg-neon-green/20 text-neon-green rounded text-[10px]">+1 HP</button>
                     <button onClick={() => handleStatChange(c.id, c.isEnemy, 5)} className="px-2 py-1 bg-neon-green/20 text-neon-green rounded text-[10px]">+5 HP</button>
                   </div>
                 )}

                 <div className="mt-2">
                   {isDM ? (
                     <select
                       value={effect || 'None'}
                       onChange={(e) => handleEffectChange(c.id, c.isEnemy, e.target.value === 'None' ? null : e.target.value)}
                       className="w-full bg-black border border-slate-600 rounded text-xs p-1"
                     >
                       {effectsList.map(ef => <option key={ef} value={ef}>{ef}</option>)}
                     </select>
                   ) : (
                     <span className="text-[10px] text-amber-400 uppercase block">{t('combatBoard.status') || 'Status'}: {effect || (t('combatBoard.normal') || 'Normal')}</span>
                   )}
                 </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Panel: Grid */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-grid-pattern relative overflow-auto">
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded text-xs font-bold border border-slate-700 uppercase">
          {t('combatBoard.mode') || 'Mode'}: <span className="text-neon-cyan">{combatMode === 'ship' ? (t('combat.modeShip') || 'Ship vs Ship (Space)') : (t('combat.modeGround') || 'Player vs Player (Ground)')}</span> | {t('combatBoard.scale') || 'Scale'}: <span className="text-neon-cyan">{combatMode === 'ship' ? (t('combatBoard.shipScale') || '1 km/sq') : (t('combatBoard.groundScale') || '5 ft/sq')}</span>
        </div>

        <div
          className="grid bg-black/40 border border-neon-cyan shadow-[0_0_30px_rgba(0,240,255,0.1)]"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1.5rem)` }}
        >
          {renderGrid()}
        </div>
      </div>

      {/* Right Panel: Quantum Roll Ledger */}
      <div className="w-full sm:w-80 bg-black border-l border-slate-800 flex flex-col relative z-50">
        <div className="flex-1 overflow-hidden relative">
           <DMIntelBroadcast
              isDM={isDM}
              activePlayer={isDM ? null : players.find(p => p.uid === user?.uid || p.ownerId === user?.uid)}
           />
        </div>
      </div>

      <DiceOverlay />
    </div>
  );
}
