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
import SpaceshipSheet from '../components/player/SpaceshipSheet';
import EESysMarketplace, { EE_CATALOG_ITEMS } from '../components/market/EESysMarketplace';
import TraitsList from '../components/player/TraitsList';
import PlayerNotesTab from '../components/player/PlayerNotesTab';
import DMIntelBroadcast from '../components/shared/DMIntelBroadcast';
import InitiativeRollModal from '../components/player/InitiativeRollModal';
import DiceOverlay from '../components/dice/DiceOverlay';
import { updatePlayerHP, updatePlayerShields, addPlayerNote, removePlayerNote } from '../lib/playerActions';
import { logout } from '../lib/authService';

export default function PlayerSheet() {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { user, profile } = useAuth();

  const targetId = characterId || user?.uid;
  const { data: player, loading: playerLoading } = usePlayerData(targetId);
  const { docs: allItems = [] } = useCollection('items');
  const { docs: allTraits = [] } = useCollection('traits');

  // Top-Level Sheet Tabs: 'character' | 'ship' | 'market'
  const [mainTab, setMainTab] = useState('character');

  // Character sub-tabs: 'actions' | 'inventory' | 'features' | 'bio'
  const [activeTab, setActiveTab] = useState('actions');
  const [equippedWeapon, setEquippedWeapon] = useState(null);
  const [equippedArmor, setEquippedArmor] = useState(null);

  // Local state overrides for immediate market reactivity
  const [localCredits, setLocalCredits] = useState(null);
  const [localInventory, setLocalInventory] = useState(null);

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

  const equippedShip = allItems.find(
    (it) => it.id === effectivePlayer.spaceship && it.type === 'spaceship'
  );

  // Dynamic Tab Names (Never say "Player" or "Ship")
  const playerName = effectivePlayer.displayName || effectivePlayer.name || 'Anthony';
  const initialShipName = equippedShip
    ? (typeof equippedShip.name === 'object' ? equippedShip.name.en : equippedShip.name)
    : (effectivePlayer.spaceshipName || effectivePlayer.ship?.name || 'Kusaragi');
  const [customShipName, setCustomShipName] = useState(initialShipName);
  const shipDisplayName = customShipName || initialShipName;

  const currentCredits = localCredits !== null ? localCredits : (effectivePlayer.credits || 0);

  const [localNotes, setLocalNotes] = useState(null);
  const activeNotes = localNotes !== null ? localNotes : (effectivePlayer.notes || []);

  const handleAddNote = async (newNote) => {
    const updated = [newNote, ...activeNotes.filter((n) => n.id !== newNote.id)];
    setLocalNotes(updated);
    try {
      await addPlayerNote(effectivePlayer.id || effectivePlayer.uid, newNote);
    } catch (err) {
      console.warn('[PlayerSheet] Note saved to local state:', err.message);
    }
  };

  const handleDeleteNote = async (noteToDelete) => {
    const updated = activeNotes.filter((n) => n.id !== noteToDelete.id);
    setLocalNotes(updated);
    try {
      await removePlayerNote(effectivePlayer.id || effectivePlayer.uid, noteToDelete);
    } catch (err) {
      console.warn('[PlayerSheet] Note removed from local state:', err.message);
    }
  };

  // Resolve inventory items
  const rawInventory = localInventory !== null ? localInventory : (effectivePlayer.inventory || []);
  const inventoryItems = rawInventory
    .map((itemOrId) => {
      if (typeof itemOrId === 'object' && itemOrId !== null) return itemOrId;
      return (
        allItems.find((it) => it.id === itemOrId) ||
        EE_CATALOG_ITEMS.find((it) => it.id === itemOrId)
      );
    })
    .filter(Boolean);

  if (playerLoading && !player && !profile) return <LoadingSpinner />;

  const activeLocale = i18n.language || 'en';

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
      <DiceOverlay user={user} profile={effectivePlayer} modifier={0} />

      {/* Initiative Roll Pop-Up Modal */}
      <InitiativeRollModal
        character={effectivePlayer}
        campaignId={effectivePlayer.campaignId}
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
          <span className="text-gray-300 truncate">{playerName}</span>
        </div>

        <div className="flex items-center gap-3">
          <CreditCounter amount={currentCredits} />
          <LanguageSwitcher />
          <button
            onClick={logout}
            className="text-gray-400 hover:text-neon-red transition-colors uppercase text-[10px]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* TOP-LEVEL TABS: [Player Name], [Ship Name], E.E.Sys */}
      <div className="flex items-center gap-2 border-b-2 border-white/10 pb-2 overflow-x-auto">
        {/* Tab 1: Player Name (e.g. Anthony) */}
        <button
          onClick={() => setMainTab('character')}
          className={`px-5 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                     ${mainTab === 'character'
                       ? 'bg-neon-cyan/20 text-neon-cyan border-2 border-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                       : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'}`}
        >
          <span>👤</span>
          <span>{playerName}</span>
        </button>

        {/* Tab 2: Ship Name (e.g. Kusaragi) */}
        <button
          onClick={() => setMainTab('ship')}
          className={`px-5 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                     ${mainTab === 'ship'
                       ? 'bg-neon-purple/20 text-purple-300 border-2 border-neon-purple shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                       : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'}`}
        >
          <span>🚀</span>
          <span>{shipDisplayName}</span>
        </button>

        {/* Tab 3: Marketplace (Strictly named E.E.Sys) */}
        <button
          onClick={() => setMainTab('market')}
          className={`px-5 py-2.5 rounded-xl font-display font-black text-xs md:text-sm uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap
                     ${mainTab === 'market'
                       ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                       : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/10'}`}
        >
          <span>🏪</span>
          <span>E.E.Sys</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: CHARACTER OPERATIVE SHEET (Named with player's name)       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === 'character' && (
        <div className="space-y-6 animate-fade-in">
          {/* D&D Beyond Top Character Header */}
          <DnDCharacterHeader
            character={{ ...effectivePlayer, credits: currentCredits }}
            onShortRest={handleShortRest}
            onLongRest={handleLongRest}
            onUpdateHp={handleUpdateHp}
          />

          {/* Main D&D Beyond 2-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Column: Ability Scores & Skills */}
            <div className="lg:col-span-1">
              <DnDAbilitySidebar character={effectivePlayer} />
            </div>

            {/* Right Main Area: Sub-tabs */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'actions', label: '⚔️ Actions & Attacks' },
                  { id: 'inventory', label: '🎒 Equipment & Cargo' },
                  { id: 'features', label: '🧬 Features & Traits' },
                  { id: 'notes', label: '📝 Field Notes & Intel' },
                  { id: 'bio', label: '📜 Operative Dossier' },
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

              {/* SUB-TAB 1: ACTIONS */}
              {activeTab === 'actions' && (
                <DnDActionsTab
                  character={effectivePlayer}
                  onAddAttack={(updated) => console.log('Updated attacks:', updated)}
                />
              )}

              {/* SUB-TAB 2: INVENTORY */}
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

              {/* SUB-TAB 3: FEATURES & TRAITS */}
              {activeTab === 'features' && (
                <div className="space-y-4">
                  <TraitsList
                    traits={effectivePlayer.traits || []}
                    traitDefs={allTraits}
                    locale={activeLocale}
                  />
                </div>
              )}

              {/* SUB-TAB 4: FIELD NOTES & INTEL ARCHIVE */}
              {activeTab === 'notes' && (
                <PlayerNotesTab
                  notes={activeNotes}
                  onAddNote={handleAddNote}
                  onDeleteNote={handleDeleteNote}
                />
              )}

              {/* SUB-TAB 5: BIO & SHIP SUMMARY */}
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: SPACESHIP CONSOLE (Named with ship's name, e.g. Kusaragi)   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === 'ship' && (
        <SpaceshipSheet
          ship={{
            name: shipDisplayName,
            hull: equippedShip?.hullPoints || 180,
            maxHull: equippedShip?.hullPoints || 180,
            shields: 120,
            maxShields: 120,
            subWarpSpeed: equippedShip?.speed || 42,
          }}
          onUpdateShipName={(name) => setCustomShipName(name)}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: EQUIVALENT EXCHANGE SYSTEM // E.E.Sys MARKETPLACE           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {mainTab === 'market' && (
        <EESysMarketplace
          player={{ ...effectivePlayer, credits: currentCredits }}
          inventoryItems={inventoryItems}
          onUpdateCredits={(credits) => setLocalCredits(credits)}
          onUpdateInventory={(updatedInv) => setLocalInventory(updatedInv)}
        />
      )}

      {/* Floating Tactical Comms & DM Intel Feed (Read-Only for Player) */}
      <DMIntelBroadcast
        activePlayer={effectivePlayer}
        onSaveToNotes={handleAddNote}
      />
    </div>
  );
}
