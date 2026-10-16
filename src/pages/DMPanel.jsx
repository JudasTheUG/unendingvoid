import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import PlayerRoster from '../components/dm/PlayerRoster';
import CombatTracker from '../components/dm/CombatTracker';
import StatOverrideForm from '../components/dm/StatOverrideForm';
import ItemSpawner from '../components/dm/ItemSpawner';
import TraitAssigner from '../components/dm/TraitAssigner';
import DiceOverlay from '../components/dice/DiceOverlay';
import { logout } from '../lib/authService';

export default function DMPanel() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { docs: players, loading: playersLoading } = useCollection('players');
  const { docs: traits } = useCollection('traits');

  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [combatActive, setCombatActive] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);

  if (playersLoading) return <LoadingSpinner />;

  const activePlayers = players.filter((p) => p.role !== 'dm');
  const selectedPlayer = players.find((p) => p.id === selectedPlayerId || p.uid === selectedPlayerId);

  const turnOrder = activePlayers.map((p) => p.id || p.uid);

  const handleNextTurn = () => {
    if (turnOrder.length === 0) return;
    setCurrentTurn((prev) => (prev + 1) % turnOrder.length);
  };

  const handlePrevTurn = () => {
    if (turnOrder.length === 0) return;
    setCurrentTurn((prev) => (prev - 1 + turnOrder.length) % turnOrder.length);
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
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 border-l-4 border-l-neon-magenta shadow-[0_0_25px_rgba(255,0,170,0.2)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl md:text-2xl font-black text-neon-magenta tracking-wider drop-shadow-[0_0_12px_rgba(255,0,170,0.5)]">
              {t('dm.panel') || 'Void Architect Command Console'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/40">
              DM Overlord
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Real-time campaign master authority active · {activePlayers.length} connected players
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            id="dm-logout-btn"
            onClick={logout}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider text-gray-400 border border-white/10 hover:border-neon-red/50 hover:text-neon-red hover:bg-neon-red/10 transition-all duration-200"
          >
            {t('auth.logout') || 'Logout'}
          </button>
        </div>
      </header>

      {/* Combat & Initiative Bar */}
      <CombatTracker
        players={players}
        turnOrder={turnOrder}
        currentTurn={currentTurn}
        combatActive={combatActive}
        onToggleCombat={() => setCombatActive(!combatActive)}
        onNextTurn={handleNextTurn}
        onPrevTurn={handlePrevTurn}
      />

      {/* Active Operatives Grid */}
      <PlayerRoster
        players={players}
        selectedPlayerId={selectedPlayerId}
        onSelectPlayer={(id) => setSelectedPlayerId(selectedPlayerId === id ? null : id)}
      />

      {/* Selected Player Stat Override Drawer/Modal */}
      {selectedPlayer && (
        <StatOverrideForm
          player={selectedPlayer}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}

      {/* Lower Dual Controls: Item Spawner & Trait Assigner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ItemSpawner
          players={players}
          onSpawnComplete={() => {}}
        />

        <TraitAssigner
          players={players}
          traits={traits}
        />
      </div>
    </div>
  );
}
