import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import CombatTracker from '../components/dm/CombatTracker';
import StatOverrideForm from '../components/dm/StatOverrideForm';
import ItemSpawner from '../components/dm/ItemSpawner';
import TraitAssigner from '../components/dm/TraitAssigner';
import IntelBroadcaster from '../components/dm/IntelBroadcaster';
import DMIntelBroadcast from '../components/shared/DMIntelBroadcast';
import DiceOverlay from '../components/dice/DiceOverlay';
import { logout } from '../lib/authService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function DMPanel() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const { docs: campaigns = [] } = useCollection('campaigns');
  const { docs: allPlayers = [], loading: playersLoading } = useCollection('players');
  const { docs: traits = [] } = useCollection('traits');

  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [levelUpModalPlayer, setLevelUpModalPlayer] = useState(null);
  const [combatActive, setCombatActive] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);

  // Level up form states
  const [hpBonus, setHpBonus] = useState(8);
  const [shieldBonus, setShieldBonus] = useState(5);
  const [selectedStatASI, setSelectedStatASI] = useState('strength');
  const [levelingUp, setLevelingUp] = useState(false);

  if (playersLoading) return <LoadingSpinner />;

  // Active campaign
  const campaign = campaigns.find((c) => c.id === campaignId) || campaigns.find((c) => c.dmId === user?.uid);

  // Characters in this campaign, or all non-DM characters if no campaign specified
  let partyCharacters = [];
  if (campaign?.activeCharacters?.length) {
    const assignedIds = campaign.activeCharacters.map((ac) => ac.characterId || ac.uid);
    partyCharacters = allPlayers.filter((p) => assignedIds.includes(p.id || p.uid));
  } else {
    partyCharacters = allPlayers.filter((p) => p.role !== 'dm' && p.uid !== user?.uid);
  }

  const selectedPlayer = allPlayers.find((p) => (p.id || p.uid) === selectedPlayerId);

  const [customTurnOrder, setCustomTurnOrder] = useState(null);
  const turnOrder = customTurnOrder || partyCharacters.map((p) => p.id || p.uid);

  const handleNextTurn = () => {
    if (turnOrder.length === 0) return;
    setCurrentTurn((prev) => (prev + 1) % turnOrder.length);
  };

  const handlePrevTurn = () => {
    if (turnOrder.length === 0) return;
    setCurrentTurn((prev) => (prev - 1 + turnOrder.length) % turnOrder.length);
  };

  // Execute Level Up
  const handleExecuteLevelUp = async () => {
    if (!levelUpModalPlayer) return;
    setLevelingUp(true);

    const charId = levelUpModalPlayer.id || levelUpModalPlayer.uid;
    const currentLvl = levelUpModalPlayer.level || 1;
    const newLvl = currentLvl + 1;
    const newProfBonus = Math.floor((newLvl - 1) / 4) + 2;

    const currentMaxHp = levelUpModalPlayer.maxHp || 100;
    const currentMaxShields = levelUpModalPlayer.maxShields || 50;
    const newMaxHp = currentMaxHp + Number(hpBonus);
    const newMaxShields = currentMaxShields + Number(shieldBonus);

    const stats = { ...(levelUpModalPlayer.stats || {}) };
    if (selectedStatASI && stats[selectedStatASI] !== undefined) {
      stats[selectedStatASI] = Math.min(20, (stats[selectedStatASI] || 10) + 1);
    }

    try {
      await updateDoc(doc(db, 'players', charId), {
        level: newLvl,
        proficiencyBonus: newProfBonus,
        maxHp: newMaxHp,
        hp: newMaxHp, // full heal on level up
        maxShields: newMaxShields,
        shields: newMaxShields,
        stats,
        updatedAt: serverTimestamp(),
      });

      alert(`Success! ${levelUpModalPlayer.displayName || 'Operative'} has ascended to Level ${newLvl}!`);
      setLevelUpModalPlayer(null);
    } catch (err) {
      console.error('[DMPanel] Level up error:', err);
      alert('Failed to level up: ' + err.message);
    } finally {
      setLevelingUp(false);
    }
  };

  return (
    <div className="min-h-dvh bg-void-bg text-white relative p-4 md:p-6 lg:p-8 space-y-6">
      {/* 3D Dice Layer */}
      <DiceOverlay
        user={user}
        profile={profile || { displayName: 'Void Master (DM)' }}
        modifier={0}
      />

      {/* Header bar */}
      <header className="glass-panel p-4 border-l-4 border-l-neon-magenta shadow-[0_0_25px_rgba(255,0,170,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white text-xs font-mono"
            >
              ◀ Hub
            </button>
            <span className="text-gray-600">/</span>
            <h1 className="font-display text-xl md:text-2xl font-black text-neon-magenta tracking-wider drop-shadow-[0_0_12px_rgba(255,0,170,0.5)]">
              {campaign?.name || 'Void Master Command Console'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/40">
              👑 DM Overlord
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Active Campaign Roster · {partyCharacters.length} Operatives Under Command
            {campaign?.inviteCode && (
              <span className="ml-2 text-neon-cyan font-bold bg-black/40 px-2 py-0.5 rounded">
                Code: {campaign.inviteCode}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider text-gray-400 border border-white/10 hover:border-neon-red/50 hover:text-neon-red hover:bg-neon-red/10 transition-all duration-200"
          >
            {t('auth.logout') || 'Logout'}
          </button>
        </div>
      </header>

      {/* Combat & Initiative Bar */}
      <CombatTracker
        campaignId={campaign?.id || campaignId}
        players={partyCharacters}
        turnOrder={turnOrder}
        currentTurn={currentTurn}
        combatActive={combatActive}
        onToggleCombat={() => setCombatActive(!combatActive)}
        onNextTurn={handleNextTurn}
        onPrevTurn={handlePrevTurn}
        onUpdateTurnOrder={(combatants) => setCustomTurnOrder(combatants.map((c) => c.id))}
      />

      {/* Operatives Roster with Level Up & Edit Controls */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h2 className="font-display text-xs text-neon-cyan uppercase tracking-widest flex items-center gap-2">
            <span>👥</span> Campaign Operatives ({partyCharacters.length})
          </h2>
          <span className="text-[10px] text-gray-400 font-mono">
            Click any operative to Edit Stats or Level Up
          </span>
        </div>

        {partyCharacters.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-xs border border-dashed border-white/10 rounded-lg space-y-2">
            <span className="text-2xl block">🛰️</span>
            <p>No operatives in this campaign roster yet.</p>
            <p className="text-[11px] text-gray-400">
              Share Invite Code <span className="text-neon-cyan font-bold">{campaign?.inviteCode}</span> with players to deploy their characters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partyCharacters.map((player) => {
              const isSelected = (player.id || player.uid) === selectedPlayerId;

              return (
                <div
                  key={player.id || player.uid}
                  className={`glass-panel p-4 transition-all flex flex-col justify-between
                             ${isSelected
                               ? 'border-neon-cyan ring-1 ring-neon-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                               : 'hover:border-white/30'}`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-display font-bold text-sm text-white">
                          {player.displayName || player.name || 'Unnamed'}
                        </h3>
                        <p className="text-xs text-neon-cyan font-mono">
                          Level {player.level || 1} {player.characterClass || 'Operative'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-amber-300">
                        {player.credits || 0} CR
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
                      <div className="bg-white/5 p-2 rounded">
                        <span className="text-[9px] text-gray-400 uppercase block">HP</span>
                        <span className="text-neon-green font-bold">
                          {player.hp || 0}/{player.maxHp || 100}
                        </span>
                      </div>
                      <div className="bg-white/5 p-2 rounded">
                        <span className="text-[9px] text-gray-400 uppercase block">Shields</span>
                        <span className="text-neon-cyan font-bold">
                          {player.shields || 0}/{player.maxShields || 50}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DM Action Buttons: Level Up + Edit */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => setLevelUpModalPlayer(player)}
                      className="py-1.5 rounded bg-neon-purple/20 hover:bg-neon-purple/30 text-purple-300 border border-neon-purple/50 text-[11px] font-mono font-bold uppercase tracking-wider transition-all"
                    >
                      ⚡ Level Up
                    </button>
                    <button
                      onClick={() =>
                        setSelectedPlayerId(isSelected ? null : player.id || player.uid)
                      }
                      className="py-1.5 rounded bg-white/10 hover:bg-white/20 text-gray-200 text-[11px] font-mono font-bold uppercase tracking-wider transition-all"
                    >
                      {isSelected ? 'Close Edit' : '🛠️ Edit Stats'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Player Stat Override Drawer/Modal */}
      {selectedPlayer && (
        <StatOverrideForm
          player={selectedPlayer}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}

      {/* DM Tactical Comms & Intel Broadcaster */}
      <IntelBroadcaster />

      {/* Lower Dual Controls: Item Spawner & Trait Assigner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemSpawner
          players={partyCharacters}
          onSpawnComplete={() => {}}
        />

        <TraitAssigner
          players={partyCharacters}
          traits={traits}
        />
      </div>

      {/* Floating Tactical Comms Monitor */}
      <DMIntelBroadcast isDM={true} />

      {/* ──────────────── MODAL: DM LEVEL UP OPERATIVE ──────────────── */}
      {levelUpModalPlayer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-md w-full border-neon-purple shadow-[0_0_30px_rgba(170,68,255,0.4)] space-y-4 animate-fade-in font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-display text-sm font-bold text-purple-300">
                Ascend Operative: {levelUpModalPlayer.displayName || levelUpModalPlayer.name}
              </h3>
              <button
                onClick={() => setLevelUpModalPlayer(null)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase">Level Progression</span>
                <span className="text-base font-bold text-white">
                  Level {levelUpModalPlayer.level || 1} ➔{' '}
                  <span className="text-neon-cyan font-black">
                    Level {(levelUpModalPlayer.level || 1) + 1}
                  </span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block uppercase">Proficiency</span>
                <span className="text-sm font-bold text-neon-green">
                  +{Math.floor((levelUpModalPlayer.level || 1) / 4) + 2}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 uppercase text-[10px] block mb-1">
                    Max HP Increase
                  </label>
                  <input
                    type="number"
                    value={hpBonus}
                    onChange={(e) => setHpBonus(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-1.5 text-neon-green font-bold text-center"
                  />
                </div>

                <div>
                  <label className="text-gray-400 uppercase text-[10px] block mb-1">
                    Max Shield Increase
                  </label>
                  <input
                    type="number"
                    value={shieldBonus}
                    onChange={(e) => setShieldBonus(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-1.5 text-neon-cyan font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 uppercase text-[10px] block mb-1">
                  Ability Score Improvement (ASI: +1)
                </label>
                <select
                  value={selectedStatASI}
                  onChange={(e) => setSelectedStatASI(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:outline-none"
                >
                  <option value="strength">Strength (+1)</option>
                  <option value="dexterity">Dexterity (+1)</option>
                  <option value="constitution">Constitution (+1)</option>
                  <option value="intelligence">Intelligence (+1)</option>
                  <option value="wisdom">Wisdom (+1)</option>
                  <option value="charisma">Charisma (+1)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setLevelUpModalPlayer(null)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={levelingUp}
                onClick={handleExecuteLevelUp}
                className="px-5 py-2 rounded bg-neon-purple/20 hover:bg-neon-purple/30 text-purple-300 border border-neon-purple font-bold uppercase tracking-wider"
              >
                {levelingUp ? 'Transmuting DNA...' : 'Confirm Level Up ⚡'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
