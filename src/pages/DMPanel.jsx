import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import CommsAndRollsFlow from '../components/shared/CommsAndRollsFlow';
import DiceOverlay from '../components/dice/DiceOverlay';
import { logout } from '../lib/authService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deleteCampaign, removeCharacterFromCampaign, cancelInitiative } from '../lib/campaignActions';
import ShipAssignmentModal from '../components/dm/ShipAssignmentModal';

export default function DMPanel() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile } = useAuth();

  const { docs: campaigns = [] } = useCollection('campaigns');
  const { docs: allPlayers = [], loading: playersLoading } = useCollection('players');
  const { docs: traits = [] } = useCollection('traits');
  const { docs: items = [] } = useCollection('items');

  const [mainTab, setMainTab] = useState('console');
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [levelUpModalPlayer, setLevelUpModalPlayer] = useState(null);
  const [shipModalPlayer, setShipModalPlayer] = useState(null);
  const [combatActive, setCombatActive] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [customTurnOrder, setCustomTurnOrder] = useState(null);

  // Level up form states
  const [hpBonus, setHpBonus] = useState(8);
  const [shieldBonus, setShieldBonus] = useState(5);
  const [selectedStatASI, setSelectedStatASI] = useState('strength');
  const [levelingUp, setLevelingUp] = useState(false);

  // Active campaign
  const campaign = campaigns.find((c) => c.id === campaignId) || campaigns.find((c) => c.dmId === user?.uid);

  useEffect(() => {
    if (campaign?.combatActive !== undefined) {
      setCombatActive(Boolean(campaign.combatActive));
    }
  }, [campaign?.combatActive]);

  // Characters in this campaign, or all non-DM characters if no campaign specified
  let partyCharacters = [];
  if (campaign?.activeCharacters?.length) {
    const assignedIds = campaign.activeCharacters.map((ac) => ac.characterId || ac.uid);
    partyCharacters = allPlayers.filter((p) => assignedIds.includes(p.id || p.uid));
  } else {
    partyCharacters = allPlayers.filter((p) => p.role !== 'dm' && p.uid !== user?.uid);
  }

  const selectedPlayer = allPlayers.find((p) => (p.id || p.uid) === selectedPlayerId);

  const turnOrder = customTurnOrder || partyCharacters.map((p) => p.id || p.uid);

  if (playersLoading) return <LoadingSpinner />;

  const handleToggleCombat = async () => {
    const nextState = !combatActive;
    setCombatActive(nextState);
    if (!nextState && (campaign?.id || campaignId)) {
      try {
        await cancelInitiative(campaign?.id || campaignId, partyCharacters);
      } catch (err) {
        console.warn('[DMPanel] Error resetting combat active in campaign:', err.message);
      }
    } else if (nextState && (campaign?.id || campaignId) && db) {
      try {
        await updateDoc(doc(db, 'campaigns', campaign?.id || campaignId), {
          combatActive: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('[DMPanel] Error setting combat active in campaign:', err.message);
      }
    }
  };

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

  // Delete Campaign
  const handleDeleteCampaign = async () => {
    if (!campaign) return;
    const confirmDelete = window.confirm(
      t('campaign.confirmDeleteCampaign', `Are you sure you want to permanently delete campaign "${campaign.name}"? This action cannot be undone.`)
    );
    if (!confirmDelete) return;

    try {
      await deleteCampaign(campaign.id);
      alert(t('campaign.campaignDeleted', 'Campaign successfully deleted.'));
      navigate('/dashboard');
    } catch (err) {
      console.error('[DMPanel] Delete campaign error:', err);
      alert(t('campaign.failedToDelete', 'Failed to delete campaign') + ': ' + err.message);
    }
  };

  // Remove Operative from Campaign
  const handleRemoveCharacter = async (player) => {
    if (!campaign) return;
    const charId = player.id || player.uid;
    const charName = player.displayName || player.name || 'Operative';
    const confirmRemove = window.confirm(
      t('campaign.confirmRemoveCharacter', `Remove operative "${charName}" from this campaign roster?`)
    );
    if (!confirmRemove) return;

    try {
      await removeCharacterFromCampaign(campaign.id, charId);
      alert(t('campaign.characterRemoved', `Operative "${charName}" removed from campaign.`));
      if (selectedPlayerId === charId) setSelectedPlayerId(null);
    } catch (err) {
      console.error('[DMPanel] Remove character error:', err);
      alert(t('campaign.failedToRemove', 'Failed to remove operative') + ': ' + err.message);
    }
  };

  return (
    <div className="min-h-dvh bg-void-bg text-white relative p-4 md:p-6 lg:p-8 pb-44 md:pb-52 lg:pb-56 space-y-6">
      {/* 3D Dice Layer */}
      <DiceOverlay
        user={user}
        profile={{ role: 'dm', ...profile, displayName: profile?.displayName || 'Void Master (DM)' }}
        isDM={true}
        modifier={0}
      />

      {/* Header bar */}
      <header className="glass-panel p-4 border-l-4 border-l-neon-magenta shadow-[0_0_25px_rgba(255,0,170,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-gray-400 hover:text-white text-xs font-mono"
            >
              ◀ {t('navigation.hub', 'Hub')}
            </Link>
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
          {campaign && (
            <button
              onClick={handleDeleteCampaign}
              className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider text-rose-400 border border-rose-500/40 hover:bg-rose-950/40 hover:border-rose-500 transition-all duration-200 flex items-center gap-1.5"
              title={t('campaign.deleteCampaign', 'Delete Campaign')}
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">{t('campaign.deleteCampaign', 'Delete Campaign')}</span>
            </button>
          )}
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider text-gray-400 border border-white/10 hover:border-neon-red/50 hover:text-neon-red hover:bg-neon-red/10 transition-all duration-200"
          >
            {t('auth.logout') || 'Logout'}
          </button>
        </div>
      </header>

      {/* TOP-LEVEL TABS: Command Console on left, Live Flow on far right side */}
      <div className="flex items-center gap-2 border-b-2 border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setMainTab('console')}
          className={`px-5 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                     ${mainTab === 'console'
                       ? 'bg-neon-magenta/20 text-neon-magenta border-2 border-neon-magenta shadow-[0_0_20px_rgba(255,0,170,0.4)]'
                       : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'}`}
        >
          <span>👑</span>
          <span>{t('dm.commandConsole', 'Master Command Console')}</span>
        </button>

        {/* Far Right Side: Live Comms & Quantum Rolls Flow */}
        <div className="ml-auto flex items-center pl-2">
          <button
            onClick={() => setMainTab('flow')}
            className={`px-4 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                       ${mainTab === 'flow'
                         ? 'bg-emerald-500/20 text-emerald-300 border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                         : 'text-gray-400 hover:text-emerald-300 hover:bg-emerald-950/20 border border-white/10 hover:border-emerald-500/40'}`}
          >
            <span>📡📜</span>
            <span>{t('flow.tabTitle', 'Live Flow')}</span>
          </button>
        </div>
      </div>

      {mainTab === 'console' && (
        <>
          {/* Combat & Initiative Bar */}
          <CombatTracker
        campaignId={campaign?.id || campaignId}
        players={partyCharacters}
        traits={traits}
        items={items}
        turnOrder={turnOrder}
        currentTurn={currentTurn}
        combatActive={combatActive}
        onToggleCombat={handleToggleCombat}
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
                      <div className="bg-white/5 p-2 rounded col-span-2 flex items-center justify-between text-xs">
                        <span className="text-[9px] text-gray-400 uppercase block">
                          {t('spaceship.currentShip', 'Current Ship')}
                        </span>
                        {player.ship || player.spaceship ? (
                          <span className="text-neon-cyan font-bold truncate max-w-[170px] flex items-center gap-1">
                            <span>🚀</span>
                            <span>
                              {player.ship
                                ? (typeof player.ship.name === 'object' ? player.ship.name.en : player.ship.name)
                                : (player.spaceshipName || t('spaceship.title', 'Starship'))}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-500 italic text-[11px] flex items-center gap-1">
                            <span>🛸</span>
                            <span>{t('spaceship.unassigned', 'No Ship Assigned')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* DM Action Buttons: Level Up + Edit + Starship + Remove */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-2">
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

                    <button
                      type="button"
                      onClick={() => setShipModalPlayer(player)}
                      className="w-full py-1.5 rounded bg-neon-cyan/15 hover:bg-neon-cyan/25 text-neon-cyan border border-neon-cyan/40 text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>🚀</span>
                      <span>
                        {player.ship || player.spaceship
                          ? t('spaceship.manageShip', 'Manage Starship')
                          : t('spaceship.assignShip', 'Assign Starship')}
                      </span>
                    </button>

                    {campaign && (
                      <button
                        onClick={() => handleRemoveCharacter(player)}
                        className="w-full py-1.5 rounded bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 border border-rose-500/30 hover:border-rose-500/60 text-[10px] font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                        title={t('campaign.removeFromCampaign', 'Remove from Campaign')}
                      >
                        <span>✕</span>
                        <span>{t('campaign.removeFromCampaign', 'Remove from Campaign')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DM Starship Assignment Modal */}
      {shipModalPlayer && (
        <ShipAssignmentModal
          player={shipModalPlayer}
          onClose={() => setShipModalPlayer(null)}
          onAssigned={() => setShipModalPlayer(null)}
        />
      )}

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
      </>
    )}

    {/* Live Dual Telemetry Flow: TAC-COMMS + Quantum Roll Ledger */}
    {mainTab === 'flow' && (
      <CommsAndRollsFlow
        isDM={true}
        user={user}
        profile={profile || user}
      />
    )}

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
