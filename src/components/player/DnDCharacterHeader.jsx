import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import VitalBar from '../shared/VitalBar';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import RollContextMenu from '../shared/RollContextMenu';
import { calculateInitiativeBonus } from '../../lib/initiativeCalculator';
import { processProfileImage } from '../../lib/imageUtils';
import { updatePlayerAvatar } from '../../lib/playerActions';

export default function DnDCharacterHeader({
  character,
  traits = [],
  items = [],
  onShortRest,
  onLongRest,
  onUpdateHp,
  onUpdateAvatar,
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [customAmount, setCustomAmount] = useState('10');
  const [justSaved, setJustSaved] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState(null);

  const avatarImage = avatarOverride || character.avatarUrl || character.imageUrl || character.photoURL;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // Process profile image: auto-resize if > 1MB or exceeds dimensions
      const dataUrl = await processProfileImage(file);
      setAvatarOverride(dataUrl);

      const charId = character.id || character.uid;
      if (onUpdateAvatar) {
        await onUpdateAvatar(dataUrl);
      } else if (charId) {
        await updatePlayerAvatar(charId, dataUrl);
      }
      flashSaved();
    } catch (err) {
      console.warn('Avatar upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const flashSaved = () => {
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const stats = character.stats || {};
  const dexMod = Math.floor(((stats.dexterity || 10) - 10) / 2);
  const wisMod = Math.floor(((stats.wisdom || 10) - 10) / 2);
  const initData = calculateInitiativeBonus(character, traits, items);
  const totalInitBonus = initData.totalBonus;
  const profBonus = character.proficiencyBonus || Math.floor(((character.level || 1) - 1) / 4) + 2;
  const passivePerception = 10 + wisMod + (character.skillProficiencies?.includes('perception') ? profBonus : 0);

  const handleApplyDamage = (amount) => {
    const val = amount !== undefined ? amount : customAmount;
    const dmg = Number(val);
    if (!dmg || isNaN(dmg) || dmg <= 0) return;

    // First absorb with shields, then HP
    let remaining = dmg;
    let newShields = character.shields || 0;
    let newHp = character.hp || 100;

    if (newShields > 0) {
      if (newShields >= remaining) {
        newShields -= remaining;
        remaining = 0;
      } else {
        remaining -= newShields;
        newShields = 0;
      }
    }

    if (remaining > 0) {
      newHp = Math.max(0, newHp - remaining);
    }

    if (onUpdateHp) onUpdateHp(newHp, newShields);
    flashSaved();
  };

  const handleApplyHeal = (amount) => {
    const val = amount !== undefined ? amount : customAmount;
    const heal = Number(val);
    if (!heal || isNaN(heal) || heal <= 0) return;

    const newHp = Math.min(character.maxHp || 100, (character.hp || 0) + heal);
    if (onUpdateHp) onUpdateHp(newHp, character.shields || 0);
    flashSaved();
  };

  const handleQuickMedStim = () => {
    const newHp = Math.min(character.maxHp || 100, (character.hp || 0) + 20);
    if (onUpdateHp) onUpdateHp(newHp, character.shields || 0);
    flashSaved();
  };

  const handleShieldSurge = () => {
    const newShields = Math.min(character.maxShields || 50, (character.shields || 0) + 15);
    if (onUpdateHp) onUpdateHp(character.hp || 0, newShields);
    flashSaved();
  };

  const handleShortRestClick = () => {
    if (onShortRest) onShortRest();
    flashSaved();
  };

  const handleLongRestClick = () => {
    if (onLongRest) onLongRest();
    flashSaved();
  };

  const handleRollInitiative = (rollMode = 'normal') => {
    triggerInteractiveRoll(
      '1d20',
      totalInitBonus,
      `${t('characterStats.initiative', 'Initiative')} (${character.displayName || character.name || 'Operative'})`,
      rollMode
    );
  };

  return (
    <div className="glass-panel p-5 space-y-4 border-l-4 border-l-neon-cyan shadow-[0_0_25px_rgba(0,240,255,0.15)]">
      {/* Top Identity Row */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          {/* PROFILE ICON / AVATAR WITH UPLOAD */}
          <div className="relative group shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              data-testid="avatar-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-16 h-16 rounded-xl bg-neon-cyan/15 border-2 border-neon-cyan/60 hover:border-neon-cyan flex items-center justify-center font-display text-2xl shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all overflow-hidden relative cursor-pointer"
              title={t('characterStats.uploadAvatar', 'Upload Operative Portrait')}
            >
              {avatarImage ? (
                <img
                  src={avatarImage}
                  alt={character.displayName || character.name || 'Void Operative'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">👤</span>
              )}

              {/* Upload Hover Overlay */}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-neon-cyan font-mono font-bold">
                <span>📷</span>
                <span className="text-[8px] uppercase tracking-tighter">
                  {isUploading ? '...' : t('characterStats.changeAvatar', 'Change')}
                </span>
              </div>
            </button>

            {/* Ship Icon Mini-Badge on Profile Icon */}
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-[#0c1220] border border-cyan-400/60 flex items-center justify-center text-xs shadow-md select-none"
              title={`${t('characterStats.shipIconBadge', 'Assigned Vessel')}: ${
                character.spaceshipName ||
                (character.ship?.name
                  ? typeof character.ship.name === 'object'
                    ? character.ship.name.en
                    : character.ship.name
                  : t('characterStats.shipNotAssigned', 'No Vessel Assigned'))
              }`}
            >
              🚀
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl md:text-2xl font-black text-white tracking-wide">
                {character.displayName || character.name || 'Void Operative'}
              </h1>
              {(character.spaceshipName || character.ship?.name) && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 text-[10px] font-mono text-neon-cyan font-bold">
                  <span>🚀</span>
                  <span>
                    {typeof character.ship?.name === 'object'
                      ? character.ship.name.en
                      : character.spaceshipName || character.ship?.name}
                  </span>
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-neon-cyan mt-0.5">
              {t('characterStats.level', 'Level')} {character.level || 1} {t(`classes.${(character.characterClass || 'operative').toLowerCase().replace(/[\s-]+/g, '_')}`, character.characterClass || 'Operative')} · {t(`species.${(character.species || 'augmented_human').toLowerCase().replace(/[\s-]+/g, '_')}`, character.species || 'Augmented Human')}
            </p>
            <p className="text-[11px] font-mono text-gray-400">
              {t('characterStats.background', 'Background')}: {t(`backgrounds.${(character.background || 'mercenary').toLowerCase().replace(/[\s-]+/g, '_')}`, character.background || 'Mercenary')}
            </p>
          </div>
        </div>

        {/* Core Tactical Stat Badges (D&D Beyond Style) */}
        <div className="flex flex-wrap items-center gap-2 text-center font-mono">
          <div className="glass-panel px-3 py-1.5 border-white/10 min-w-[70px]">
            <span className="text-[9px] uppercase text-gray-400 block">{t('characterStats.proficiency', 'Proficiency')}</span>
            <span className="text-sm font-bold text-neon-cyan">+{profBonus}</span>
          </div>

          <div className="glass-panel px-3 py-1.5 border-white/10 min-w-[70px]">
            <span className="text-[9px] uppercase text-gray-400 block">{t('characterStats.speed', 'Speed')}</span>
            <span className="text-sm font-bold text-white">{character.speed || 30} {t('characterStats.feet', 'ft.')}</span>
          </div>

          <div className="glass-panel px-3 py-1.5 border-white/10 min-w-[70px]">
            <span className="text-[9px] uppercase text-gray-400 block">{t('characterStats.armorClass', 'Armor Class')}</span>
            <span className="text-sm font-bold text-neon-cyan">{character.armorClass || 14}</span>
          </div>

          <button
            onClick={() => handleRollInitiative('normal')}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({
                isOpen: true,
                position: { x: e.clientX, y: e.clientY },
                type: 'd20',
                title: t('characterStats.initiativeCheck', 'Initiative Check'),
                diceNotation: '1d20',
                bonus: totalInitBonus,
                onSelect: (mode) => handleRollInitiative(mode),
              });
            }}
            className="glass-panel px-3 py-1.5 border-neon-cyan/40 hover:border-neon-cyan min-w-[70px] hover:bg-neon-cyan/10 transition-all cursor-pointer group"
            title={`${t('characterStats.initiativeHint', 'Left-click: Roll initiative · Right-click: Advantage / Disadvantage')}\nTotal: +${totalInitBonus}`}
          >
            <span className="text-[9px] uppercase text-gray-400 group-hover:text-neon-cyan block">
              {t('characterStats.initiative', 'Initiative')}
            </span>
            <span className="text-sm font-bold text-neon-green">
              {totalInitBonus >= 0 ? `+${totalInitBonus}` : totalInitBonus}
            </span>
          </button>

          <div className="glass-panel px-3 py-1.5 border-white/10 min-w-[70px]">
            <span className="text-[9px] uppercase text-gray-400 block">{t('characterStats.passivePerception', 'Passive Per.')}</span>
            <span className="text-sm font-bold text-amber-300">{passivePerception}</span>
          </div>
        </div>
      </div>

      {/* Vitals Cluster & Operative Damage Control Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <VitalBar
              label={t('vitals.hullHealth', 'Hull & Health (HP)')}
              current={character.hp || 0}
              max={character.maxHp || 100}
              type="hp"
            />
          </div>
          <div className="space-y-1">
            <VitalBar
              label={t('vitals.defensiveShields', 'Defensive Energy Shields')}
              current={character.shields || 0}
              max={character.maxShields || 50}
              type="shield"
            />
          </div>
        </div>

        {/* Operative Damage Control Console (Matches Ship Engineering Damage Control) */}
        <div className="bg-[#070b14] p-4 rounded-lg border border-slate-700 space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 font-bold">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              {t('vitals.damageControl', 'Operative Damage Control')}
            </span>
            {justSaved && (
              <span className="text-[10px] font-mono text-neon-green animate-pulse">
                ✓ {t('vitals.vitalsSynced', 'Vitals Saved')}
              </span>
            )}
          </div>

          {/* Quick Med-Stim & Shield Surge Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickMedStim}
              className="py-2 px-2 rounded bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/60 font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            >
              💉 {t('vitals.medStim', 'Med-Stim (+20)')}
            </button>
            <button
              type="button"
              onClick={handleShieldSurge}
              className="py-2 px-2 rounded bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/60 font-bold text-[11px] uppercase transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
            >
              ⚡ {t('vitals.shieldSurge', 'Shield Surge (+15)')}
            </button>
          </div>

          {/* Combat Damage & Heal Simulator */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="200"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="10"
                className="w-16 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-center font-mono text-xs text-white focus:outline-none focus:border-neon-cyan"
                title={t('vitals.amount', 'Amount')}
              />
              <button
                type="button"
                onClick={() => handleApplyDamage()}
                className="flex-1 py-1.5 px-2 rounded bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-500/60 font-bold text-[11px] uppercase transition-all"
              >
                💥 {t('vitals.damage', 'Damage')}
              </button>
              <button
                type="button"
                onClick={() => handleApplyHeal()}
                className="py-1.5 px-2 rounded bg-emerald-950/50 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 font-bold text-[11px] uppercase transition-all"
              >
                🩹 {t('vitals.heal', 'Heal')}
              </button>
            </div>

            {/* Rest & Recovery Buttons */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-mono">
                {t('vitals.hitDice', 'Hit Dice')}: <span className="text-neon-cyan font-bold">{character.level || 1}d10</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleShortRestClick}
                  className="py-1 px-2.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600/60 font-bold text-[10px] uppercase tracking-wider transition-all"
                >
                  ☕ {t('vitals.shortRest', 'Short Rest')}
                </button>
                <button
                  type="button"
                  onClick={handleLongRestClick}
                  className="py-1 px-2.5 rounded bg-indigo-950/60 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/50 font-bold text-[10px] uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                >
                  🏥 {t('vitals.longRest', 'Long Rest')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right-Click Roll Context Menu for Initiative */}
      {contextMenu && (
        <RollContextMenu
          isOpen={contextMenu.isOpen}
          position={contextMenu.position}
          type={contextMenu.type}
          title={contextMenu.title}
          diceNotation={contextMenu.diceNotation}
          bonus={contextMenu.bonus}
          onSelect={contextMenu.onSelect}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
