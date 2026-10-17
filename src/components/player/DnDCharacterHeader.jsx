import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import VitalBar from '../shared/VitalBar';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import RollContextMenu from '../shared/RollContextMenu';
import { calculateInitiativeBonus } from '../../lib/initiativeCalculator';

export default function DnDCharacterHeader({
  character,
  traits = [],
  items = [],
  onShortRest,
  onLongRest,
  onUpdateHp,
}) {
  const { t } = useTranslation();
  const [healAmount, setHealAmount] = useState('');
  const [damageAmount, setDamageAmount] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const stats = character.stats || {};
  const dexMod = Math.floor(((stats.dexterity || 10) - 10) / 2);
  const wisMod = Math.floor(((stats.wisdom || 10) - 10) / 2);
  const initData = calculateInitiativeBonus(character, traits, items);
  const totalInitBonus = initData.totalBonus;
  const profBonus = character.proficiencyBonus || Math.floor(((character.level || 1) - 1) / 4) + 2;
  const passivePerception = 10 + wisMod + (character.skillProficiencies?.includes('perception') ? profBonus : 0);

  const handleApplyDamage = () => {
    const dmg = Number(damageAmount);
    if (!dmg || isNaN(dmg)) return;

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

    onUpdateHp(newHp, newShields);
    setDamageAmount('');
  };

  const handleApplyHeal = () => {
    const heal = Number(healAmount);
    if (!heal || isNaN(heal)) return;

    const newHp = Math.min(character.maxHp || 100, (character.hp || 0) + heal);
    onUpdateHp(newHp, character.shields);
    setHealAmount('');
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
          <div className="w-14 h-14 rounded-xl bg-neon-cyan/15 border-2 border-neon-cyan/60 flex items-center justify-center font-display text-2xl shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            🚀
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-black text-white tracking-wide">
              {character.displayName || character.name || 'Void Operative'}
            </h1>
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

      {/* Vitals Cluster & Resting Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
        <div className="lg:col-span-2 space-y-3">
          <VitalBar
            label={t('vitals.hullHealth', 'Hull & Health (HP)')}
            current={character.hp || 0}
            max={character.maxHp || 100}
            type="hp"
          />
          <VitalBar
            label={t('vitals.defensiveShields', 'Defensive Energy Shields')}
            current={character.shields || 0}
            max={character.maxShields || 50}
            type="shield"
          />
        </div>

        {/* Quick Damage / Heal / Rest Console */}
        <div className="bg-black/40 p-3 rounded-lg border border-white/10 space-y-2 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder={t('vitals.damage', 'Damage')}
              value={damageAmount}
              onChange={(e) => setDamageAmount(e.target.value)}
              className="w-20 bg-void-bg border border-white/10 rounded px-2 py-1 text-neon-red text-center focus:outline-none"
            />
            <button
              onClick={handleApplyDamage}
              className="px-2.5 py-1 bg-neon-red/20 text-neon-red border border-neon-red/40 hover:bg-neon-red/30 rounded font-bold uppercase text-[10px]"
            >
              {t('vitals.damage', 'Damage')}
            </button>

            <input
              type="number"
              placeholder={t('vitals.heal', 'Heal')}
              value={healAmount}
              onChange={(e) => setHealAmount(e.target.value)}
              className="w-20 bg-void-bg border border-white/10 rounded px-2 py-1 text-neon-green text-center focus:outline-none ml-2"
            />
            <button
              onClick={handleApplyHeal}
              className="px-2.5 py-1 bg-neon-green/20 text-neon-green border border-neon-green/40 hover:bg-neon-green/30 rounded font-bold uppercase text-[10px]"
            >
              {t('vitals.heal', 'Heal')}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-[10px] text-gray-500">{t('vitals.hitDice', 'Hit Dice')}: {character.level || 1}d10</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onShortRest}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-gray-300 text-[10px] uppercase font-bold"
              >
                {t('vitals.shortRest', 'Short Rest')}
              </button>
              <button
                onClick={onLongRest}
                className="px-2 py-0.5 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 text-[10px] uppercase font-bold"
              >
                {t('vitals.longRest', 'Long Rest')}
              </button>
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
