import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { usePlayerData } from '../hooks/usePlayerData';
import { useCollection } from '../hooks/useCollection';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import CreditCounter from '../components/shared/CreditCounter';
import VitalsPanel from '../components/player/VitalsPanel';
import StatsGrid from '../components/player/StatsGrid';
import InventoryList from '../components/player/InventoryList';
import SpaceshipCard from '../components/player/SpaceshipCard';
import TraitsList from '../components/player/TraitsList';
import DiceOverlay from '../components/dice/DiceOverlay';
import { logout } from '../lib/authService';
import { calculateModifier } from '../lib/diceModifiers';

export default function PlayerSheet() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { data: player, loading: playerLoading } = usePlayerData(user?.uid);
  const { docs: allItems = [] } = useCollection('items');
  const { docs: allTraits = [] } = useCollection('traits');

  const [equippedWeapon, setEquippedWeapon] = useState(null);
  const [equippedArmor, setEquippedArmor] = useState(null);

  const effectivePlayer = player || profile || {
    uid: user?.uid,
    displayName: user?.displayName || user?.email?.split('@')[0] || 'Void Operative',
    role: 'player',
    locale: 'en',
    hp: 100,
    maxHp: 100,
    shields: 50,
    maxShields: 50,
    credits: 500,
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    traits: [],
    inventory: [],
  };

  if (playerLoading && !player && !profile) return <LoadingSpinner />;

  const activeLocale = i18n.language || 'en';

  // Resolve inventory items
  const inventoryItems = (effectivePlayer.inventory || [])
    .map((itemId) => allItems.find((it) => it.id === itemId))
    .filter(Boolean);

  // Resolve equipped ship
  const equippedShip = allItems.find(
    (it) => it.id === effectivePlayer.spaceship && it.type === 'spaceship'
  );

  const statLabels = {
    strength: t('player.strength') || 'Strength',
    dexterity: t('player.dexterity') || 'Dexterity',
    constitution: t('player.constitution') || 'Constitution',
    intelligence: t('player.intelligence') || 'Intelligence',
    wisdom: t('player.wisdom') || 'Wisdom',
    charisma: t('player.charisma') || 'Charisma',
  };

  const handleEquip = (itemId) => {
    const item = allItems.find((it) => it.id === itemId);
    if (!item) return;
    if (item.type === 'weapon') {
      setEquippedWeapon(equippedWeapon === itemId ? null : itemId);
    } else if (item.type === 'armor') {
      setEquippedArmor(equippedArmor === itemId ? null : itemId);
    }
  };

  return (
    <div className="min-h-dvh bg-void-bg text-white relative p-4 md:p-6 lg:p-8 space-y-6">
      {/* 3D Dice Layer */}
      <DiceOverlay
        user={user}
        profile={effectivePlayer}
        modifier={calculateModifier(effectivePlayer, allTraits, 'attack')}
      />

      {/* Header bar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-4 border-l-4 border-l-neon-cyan">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl md:text-2xl font-black text-neon-cyan tracking-wider drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">
              {effectivePlayer.displayName || 'Void Operative'}
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/30">
              Operative
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            UID: {effectivePlayer.uid || user?.uid} · Quantum Link Active
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CreditCounter amount={effectivePlayer.credits || 0} />
          <LanguageSwitcher />
          <button
            id="logout-btn"
            onClick={logout}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider text-gray-400 border border-white/10 hover:border-neon-red/50 hover:text-neon-red hover:bg-neon-red/10 transition-all duration-200"
          >
            {t('auth.logout') || 'Logout'}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Vitals & Ship */}
        <div className="space-y-6">
          <VitalsPanel
            hp={effectivePlayer.hp || 0}
            maxHp={effectivePlayer.maxHp || 100}
            shields={effectivePlayer.shields || 0}
            maxShields={effectivePlayer.maxShields || 50}
            hpLabel={t('player.hp') || 'Health / Integrity'}
            shieldsLabel={t('player.shields') || 'Energy Shields'}
          />

          <SpaceshipCard
            ship={equippedShip}
            locale={activeLocale}
          />

          <TraitsList
            traits={effectivePlayer.traits || []}
            traitDefs={allTraits}
            locale={activeLocale}
          />
        </div>

        {/* Center & Right Column: Stats & Inventory */}
        <div className="lg:col-span-2 space-y-6">
          <StatsGrid
            stats={effectivePlayer.stats || {}}
            labels={statLabels}
          />

          <InventoryList
            items={inventoryItems}
            equippedWeapon={equippedWeapon || effectivePlayer.equippedWeapon}
            equippedArmor={equippedArmor || effectivePlayer.equippedArmor}
            locale={activeLocale}
            onEquip={handleEquip}
          />
        </div>
      </div>
    </div>
  );
}
