import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import RollContextMenu from '../shared/RollContextMenu';

const ABILITIES = [
  { key: 'strength', labelKey: 'abilities.str', label: 'STR', nameKey: 'abilities.strength', name: 'Strength' },
  { key: 'dexterity', labelKey: 'abilities.dex', label: 'DEX', nameKey: 'abilities.dexterity', name: 'Dexterity' },
  { key: 'constitution', labelKey: 'abilities.con', label: 'CON', nameKey: 'abilities.constitution', name: 'Constitution' },
  { key: 'intelligence', labelKey: 'abilities.int', label: 'INT', nameKey: 'abilities.intelligence', name: 'Intelligence' },
  { key: 'wisdom', labelKey: 'abilities.wis', label: 'WIS', nameKey: 'abilities.wisdom', name: 'Wisdom' },
  { key: 'charisma', labelKey: 'abilities.cha', label: 'CHA', nameKey: 'abilities.charisma', name: 'Charisma' },
];

const SKILLS = [
  { id: 'acrobatics', name: 'Acrobatics', stat: 'dexterity' },
  { id: 'animalHandling', name: 'Animal Handling', stat: 'wisdom' },
  { id: 'arcana', name: 'Arcana / Tech', stat: 'intelligence' },
  { id: 'athletics', name: 'Athletics', stat: 'strength' },
  { id: 'deception', name: 'Deception', stat: 'charisma' },
  { id: 'history', name: 'History', stat: 'intelligence' },
  { id: 'insight', name: 'Insight', stat: 'wisdom' },
  { id: 'intimidation', name: 'Intimidation', stat: 'charisma' },
  { id: 'investigation', name: 'Investigation', stat: 'intelligence' },
  { id: 'medicine', name: 'Medicine', stat: 'wisdom' },
  { id: 'nature', name: 'Nature', stat: 'intelligence' },
  { id: 'perception', name: 'Perception', stat: 'wisdom' },
  { id: 'performance', name: 'Performance', stat: 'charisma' },
  { id: 'persuasion', name: 'Persuasion', stat: 'charisma' },
  { id: 'religion', name: 'Religion', stat: 'intelligence' },
  { id: 'sleightOfHand', name: 'Sleight of Hand', stat: 'dexterity' },
  { id: 'stealth', name: 'Stealth', stat: 'dexterity' },
  { id: 'survival', name: 'Survival', stat: 'wisdom' },
];

export default function DnDAbilitySidebar({ character }) {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState(null);

  const stats = character.stats || {};
  const profBonus = character.proficiencyBonus || Math.floor(((character.level || 1) - 1) / 4) + 2;

  const getMod = (val) => Math.floor(((val ?? 10) - 10) / 2);

  const handleStatRoll = (name, mod, rollMode = 'normal') => {
    triggerInteractiveRoll('1d20', mod, `${name} ${t('characterStats.score', 'Check')}`, rollMode);
  };

  const handleSaveRoll = (name, mod, rollMode = 'normal') => {
    triggerInteractiveRoll('1d20', mod, `${name} ${t('characterStats.savingThrows', 'Save')}`, rollMode);
  };

  const handleSkillRoll = (skillName, mod, rollMode = 'normal') => {
    triggerInteractiveRoll('1d20', mod, `${skillName} ${t('characterStats.score', 'Check')}`, rollMode);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 6 Ability Scores Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
        {ABILITIES.map(({ key, labelKey, label, nameKey, name }) => {
          const score = stats[key] ?? 10;
          const mod = getMod(score);
          const formattedMod = mod >= 0 ? `+${mod}` : `${mod}`;
          const localizedName = t(nameKey, name);
          const localizedLabel = t(labelKey, label);

          return (
            <div
              key={key}
              onClick={() => handleStatRoll(localizedName, mod, 'normal')}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  isOpen: true,
                  position: { x: e.clientX, y: e.clientY },
                  type: 'd20',
                  title: `${localizedName} ${t('characterStats.score', 'Check')}`,
                  diceNotation: '1d20',
                  bonus: mod,
                  onSelect: (mode) => handleStatRoll(localizedName, mod, mode),
                });
              }}
              className="glass-panel p-2.5 flex items-center justify-between border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all cursor-pointer group"
              title={`${t('characterStats.rollHint', { name: localizedName, defaultValue: `Left-click: Roll ${localizedName} · Right-click: Advantage / Disadvantage` })}`}
            >
              <div>
                <span className="font-display font-bold text-gray-400 group-hover:text-neon-cyan text-[11px] block">
                  {localizedLabel}
                </span>
                <span className="text-[10px] text-gray-500 font-normal">{t('characterStats.score', 'Score')}: {score}</span>
              </div>
              <div className="px-2 py-1 rounded bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 font-bold text-sm">
                {formattedMod}
              </div>
            </div>
          );
        })}
      </div>

      {/* Saving Throws (D&D Beyond Style) */}
      <div className="glass-panel p-3 border-l-2 border-l-neon-purple space-y-2">
        <span className="font-display text-[10px] uppercase text-gray-400 tracking-wider block border-b border-white/10 pb-1">
          {t('characterStats.savingThrows', 'Saving Throws')}
        </span>
        <div className="space-y-1">
          {ABILITIES.map(({ key, nameKey, name }) => {
            const score = stats[key] ?? 10;
            const isProf = character.savingThrowProficiencies?.includes(key);
            const saveMod = getMod(score) + (isProf ? profBonus : 0);
            const formatted = saveMod >= 0 ? `+${saveMod}` : `${saveMod}`;
            const localizedName = t(nameKey, name);

            return (
              <div
                key={key}
                onClick={() => handleSaveRoll(localizedName, saveMod, 'normal')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    isOpen: true,
                    position: { x: e.clientX, y: e.clientY },
                    type: 'd20',
                    title: `${localizedName} ${t('characterStats.savingThrows', 'Save')}`,
                    diceNotation: '1d20',
                    bonus: saveMod,
                    onSelect: (mode) => handleSaveRoll(localizedName, saveMod, mode),
                  });
                }}
                className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-white/5 cursor-pointer text-[11px]"
                title={`${t('characterStats.rollHint', { name: `${localizedName} Save`, defaultValue: `Left-click: Roll ${localizedName} Save · Right-click: Advantage / Disadvantage` })}`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full border ${
                      isProf
                        ? 'bg-neon-purple border-neon-purple shadow-[0_0_6px_rgba(168,85,247,0.6)]'
                        : 'border-gray-500'
                    }`}
                  />
                  <span className={isProf ? 'text-white font-bold' : 'text-gray-400'}>
                    {localizedName}
                  </span>
                </div>
                <span className={isProf ? 'text-neon-purple font-bold' : 'text-gray-400'}>
                  {formatted}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skills List (D&D Beyond Style) */}
      <div className="glass-panel p-3 border-l-2 border-l-neon-cyan space-y-2">
        <span className="font-display text-[10px] uppercase text-gray-400 tracking-wider block border-b border-white/10 pb-1">
          {t('characterStats.proficienciesSkills', 'Proficiencies & Skills')}
        </span>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {SKILLS.map(({ id, name, stat }) => {
            const skillSlug = name.toLowerCase().replace(/[^a-z]/g, '_');
            const isProf =
              character.skillProficiencies?.includes(skillSlug) ||
              character.skillProficiencies?.includes(name.toLowerCase());
            const statMod = getMod(stats[stat]);
            const skillMod = statMod + (isProf ? profBonus : 0);
            const formatted = skillMod >= 0 ? `+${skillMod}` : `${skillMod}`;
            const localizedSkill = t(`skills.${id}`, name);
            const shortStat = t(`abilities.${stat.substring(0, 3)}`, stat.substring(0, 3).toUpperCase());

            return (
              <div
                key={name}
                onClick={() => handleSkillRoll(localizedSkill, skillMod, 'normal')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    isOpen: true,
                    position: { x: e.clientX, y: e.clientY },
                    type: 'd20',
                    title: `${localizedSkill} ${t('characterStats.score', 'Check')}`,
                    diceNotation: '1d20',
                    bonus: skillMod,
                    onSelect: (mode) => handleSkillRoll(localizedSkill, skillMod, mode),
                  });
                }}
                className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-white/5 cursor-pointer text-[11px] group"
                title={`${t('characterStats.rollHint', { name: localizedSkill, defaultValue: `Left-click: Roll ${localizedSkill} · Right-click: Advantage / Disadvantage` })}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className={`w-2 h-2 rounded-full border ${
                      isProf
                        ? 'bg-neon-cyan border-neon-cyan shadow-[0_0_6px_rgba(0,240,255,0.6)]'
                        : 'border-gray-600'
                    }`}
                  />
                  <span
                    className={`truncate ${
                      isProf ? 'text-white font-bold' : 'text-gray-400'
                    } group-hover:text-neon-cyan`}
                  >
                    {localizedSkill}
                  </span>
                  <span className="text-[9px] text-gray-600 uppercase">
                    ({shortStat})
                  </span>
                </div>
                <span className={isProf ? 'text-neon-cyan font-bold' : 'text-gray-400'}>
                  {formatted}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right-Click Roll Context Menu (Advantage / Disadvantage) */}
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
