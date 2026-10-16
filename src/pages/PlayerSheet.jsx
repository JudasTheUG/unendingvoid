import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { usePlayerData } from '../hooks/usePlayerData';
import { useCollection } from '../hooks/useCollection';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';
import CreditCounter from '../components/shared/CreditCounter';
import DnDCharacterHeader from '../components/player/DnDCharacterHeader';
import DnDAbilitySidebar from '../components/player/DnDAbilitySidebar';
import DnDActionsTab from '../components/player/DnDActionsTab';
import InventoryList from '../components/player/InventoryList';
import SpaceshipCard from '../components/player/SpaceshipCard';
import TraitsList from '../components/player/TraitsList';
import DiceOverlay from '../components/dice/DiceOverlay';
import { updatePlayerHP, updatePlayerShields } from '../lib/playerActions';
import { logout } from '../lib/authService';

export default function PlayerSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();

  const targetId = characterId || user?.uid;
  const { data: player, loading: playerLoading } = usePlayerData(targetId);
  const { docs: allItems = [] } = useCollection('items');
  const { docs: allTraits = [] } = useCollection('traits');

  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'inventory' | 'features' | 'bio'
  const [equippedWeapon, setEquippedWeapon] = useState(null);
  const [equippedArmor, setEquippedArmor] = useState(null);

  const effectivePlayer = player || profile || {
    id: targetId,
    uid: targetId,
    ownerId: user?.uid,
    displayName: user?.displayName || user?.email?.split('@')[0] || 'Void Operative',
    role: 'player',
    characterClass: 'Cyber-Commando',
    level: 1,
    proficiencyBonus: 2,
    hp: 24,
    maxHp: 24,
    shields: 15,
    maxShields: 15,
    credits: 250,
    speed: 30,
    armorClass: 14,
    stats: { strength: 14, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
    traits: [],
    inventory: [],
  };

  if (playerLoading && !player && !profile) return <LoadingSpinner />;

  const activeLocale = i18n.language || 'en';

  const inventoryItems = (effectivePlayer.inventory || [])
    .map((itemId) => allItems.find((it) => it.id === itemId))
    .filter(Boolean);

  const equippedShip = allItems.find(
    (it) => it.id === effectivePlayer.spaceship && it.type === 'spaceship'
  );

  const handleUpdateHp = async (newHp, newShields) => {
    try {
      await updatePlayerHP(effectivePlayer.id || effectivePlayer.uid, newHp);
      await updatePlayerShields(effectivePlayer.id || effectivePlayer.uid, newShields);
    } catch (err) {
      console.warn('[PlayerSheet] Local state update only:', err.message);
    }
  };

  const handleShortRest = async () => {
    const conMod = Math.floor(((effectivePlayer.stats?.constitution || 10) - 10) / 2);
    const healRoll = Math.floor(Math.random() * 10) + 1 + Math.max(0, conMod);
    const newHp = Math.min(effectivePlayer.maxHp || 100, (effectivePlayer.hp || 0) + healRoll);
    const newShields = Math.min(effectivePlayer.maxShields || 50, (effectivePlayer.shields || 0) + 5);

    await handleUpdateHp(newHp, newShields);
    alert(`Short Rest Complete! Recovered ${healRoll} HP and 5 Shields.`);
  };

  const handleLongRest = async () => {
    await handleUpdateHp(effectivePlayer.maxHp || 100, effectivePlayer.maxShields || 50);
    alert('Long Rest Complete! HP and Energy Shields fully restored to maximum.');
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
        modifier={0}
      />

      {/* Navigation & Breadcrumbs Bar */}
      <div className="flex items-center justify-between glass-panel px-4 py-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-neon-cyan hover:underline flex items-center gap-1 font-bold"
          >
            ◀ Return to Hub
          </button>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300 truncate">
            {effectivePlayer.displayName || effectivePlayer.name}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <CreditCounter amount={effectivePlayer.credits || 0} />
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="text-gray-400 hover:text-neon-red transition-colors uppercase text-[10px]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* D&D Beyond Top Character Header */}
      <DnDCharacterHeader
        character={effectivePlayer}
        onShortRest={handleShortRest}
        onLongRest={handleLongRest}
        onUpdateHp={handleUpdateHp}
      />

      {/* Main D&D Beyond 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Ability Scores & Skills (1 of 4 columns on large screens) */}
        <div className="lg:col-span-1">
          <DnDAbilitySidebar character={effectivePlayer} />
        </div>

        {/* Right Main Area: Tabs (3 of 4 columns) */}
        <div className="lg:col-span-3 space-y-4">
          {/* D&D Beyond Style Tab Buttons */}
          <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
            {[
              { id: 'actions', label: '⚔️ Actions & Attacks' },
              { id: 'inventory', label: '🎒 Equipment & Cargo' },
              { id: 'features', label: '🧬 Features & Traits' },
              { id: 'bio', label: '📜 Notes & Vessel' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-display font-bold uppercase tracking-wider transition-all rounded-t-lg
                           ${activeTab === tab.id
                             ? 'bg-white/10 text-neon-cyan border-b-2 border-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                             : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: ACTIONS */}
          {activeTab === 'actions' && (
            <DnDActionsTab
              character={effectivePlayer}
              onAddAttack={(updated) => console.log('Updated attacks:', updated)}
            />
          )}

          {/* TAB 2: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <InventoryList
                items={inventoryItems}
                equippedWeapon={equippedWeapon || effectivePlayer.equippedWeapon}
                equippedArmor={equippedArmor || effectivePlayer.equippedArmor}
                locale={activeLocale}
                onEquip={handleEquip}
              />
            </div>
          )}

          {/* TAB 3: FEATURES & TRAITS */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <TraitsList
                traits={effectivePlayer.traits || []}
                traitDefs={allTraits}
                locale={activeLocale}
              />
            </div>
          )}

          {/* TAB 4: BIO & SHIP */}
          {activeTab === 'bio' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel p-5 space-y-3 font-mono text-xs">
                <h3 className="font-display text-sm font-bold text-white uppercase border-b border-white/10 pb-2">
                  Operative Dossier
                </h3>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Species & Heritage</span>
                  <p className="text-white font-bold">{effectivePlayer.species || 'Augmented Human'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Background</span>
                  <p className="text-gray-300">{effectivePlayer.background || 'Ex-Corporate Mercenary'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block">Combat Classification</span>
                  <p className="text-neon-cyan font-bold">{effectivePlayer.characterClass || 'Operative'}</p>
                </div>
              </div>

              <SpaceshipCard ship={equippedShip} locale={activeLocale} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
