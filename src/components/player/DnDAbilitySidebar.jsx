import React, { useState } from 'react';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';
import RollContextMenu from '../shared/RollContextMenu';

const ABILITIES = [
  { key: 'strength', label: 'STR', name: 'Strength' },
  { key: 'dexterity', label: 'DEX', name: 'Dexterity' },
  { key: 'constitution', label: 'CON', name: 'Constitution' },
  { key: 'intelligence', label: 'INT', name: 'Intelligence' },
  { key: 'wisdom', label: 'WIS', name: 'Wisdom' },
  { key: 'charisma', label: 'CHA', name: 'Charisma' },
];

const SKILLS = [
  { name: 'Acrobatics', stat: 'dexterity' },
  { name: 'Animal Handling', stat: 'wisdom' },
  { name: 'Arcana / Tech', stat: 'intelligence' },
  { name: 'Athletics', stat: 'strength' },
  { name: 'Deception', stat: 'charisma' },
  { name: 'History', stat: 'intelligence' },
  { name: 'Insight', stat: 'wisdom' },
  { name: 'Intimidation', stat: 'charisma' },
  { name: 'Investigation', stat: 'intelligence' },
  { name: 'Medicine', stat: 'wisdom' },
  { name: 'Nature', stat: 'intelligence' },
  { name: 'Perception', stat: 'wisdom' },
  { name: 'Performance', stat: 'charisma' },
  { name: 'Persuasion', stat: 'charisma' },
  { name: 'Religion', stat: 'intelligence' },
  { name: 'Sleight of Hand', stat: 'dexterity' },
  { name: 'Stealth', stat: 'dexterity' },
  { name: 'Survival', stat: 'wisdom' },
];

export default function DnDAbilitySidebar({ character }) {
  const [contextMenu, setContextMenu] = useState(null);

  const stats = character.stats || {};
  const profBonus = character.proficiencyBonus || Math.floor(((character.level || 1) - 1) / 4) + 2;

  const getMod = (val) => Math.floor(((val ?? 10) - 10) / 2);

  const handleStatRoll = (name, mod, rollMode = 'normal') => {
    triggerInteractiveRoll('1d20', mod, `${name} Check`, rollMode);
  };

  const handleSaveRoll = (name, mod, rollMode = 'normal') => {
    triggerInteractiveRoll('1d20', mod, `${name} Saving Throw`, rollMode);
  };

  const handleSkillRoll = (skillName, mod, rollMode = 'normal') => {
    triggerInteractiveRoll('1d20', mod, `${skillName} Check`, rollMode);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* 6 Ability Scores Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2.5">
        {ABILITIES.map(({ key, label, name }) => {
          const score = stats[key] ?? 10;
          const mod = getMod(score);
          const formattedMod = mod >= 0 ? `+${mod}` : `${mod}`;

          return (
            <div
              key={key}
              onClick={() => handleStatRoll(name, mod, 'normal')}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({
                  isOpen: true,
                  position: { x: e.clientX, y: e.clientY },
                  type: 'd20',
                  title: `${name} Check`,
                  diceNotation: '1d20',
                  bonus: mod,
                  onSelect: (mode) => handleStatRoll(name, mod, mode),
                });
              }}
              className="glass-panel p-2.5 flex items-center justify-between border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/5 transition-all cursor-pointer group"
              title={`Left-click: Roll ${name} · Right-click: Advantage / Disadvantage`}
            >
              <div>
                <span className="font-display font-bold text-gray-400 group-hover:text-neon-cyan text-[11px] block">
                  {label}
                </span>
                <span className="text-[10px] text-gray-500 font-normal">Score: {score}</span>
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
          Saving Throws
        </span>
        <div className="space-y-1">
          {ABILITIES.map(({ key, name }) => {
            const score = stats[key] ?? 10;
            const isProf = character.savingThrowProficiencies?.includes(key);
            const saveMod = getMod(score) + (isProf ? profBonus : 0);
            const formatted = saveMod >= 0 ? `+${saveMod}` : `${saveMod}`;

            return (
              <div
                key={key}
                onClick={() => handleSaveRoll(name, saveMod, 'normal')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    isOpen: true,
                    position: { x: e.clientX, y: e.clientY },
                    type: 'd20',
                    title: `${name} Save`,
                    diceNotation: '1d20',
                    bonus: saveMod,
                    onSelect: (mode) => handleSaveRoll(name, saveMod, mode),
                  });
                }}
                className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-white/5 cursor-pointer text-[11px]"
                title={`Left-click: Roll ${name} Save · Right-click: Advantage / Disadvantage`}
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
                    {name}
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
          Proficiencies & Skills
        </span>
        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {SKILLS.map(({ name, stat }) => {
            const skillSlug = name.toLowerCase().replace(/[^a-z]/g, '_');
            const isProf =
              character.skillProficiencies?.includes(skillSlug) ||
              character.skillProficiencies?.includes(name.toLowerCase());
            const statMod = getMod(stats[stat]);
            const skillMod = statMod + (isProf ? profBonus : 0);
            const formatted = skillMod >= 0 ? `+${skillMod}` : `${skillMod}`;

            return (
              <div
                key={name}
                onClick={() => handleSkillRoll(name, skillMod, 'normal')}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    isOpen: true,
                    position: { x: e.clientX, y: e.clientY },
                    type: 'd20',
                    title: `${name} Check`,
                    diceNotation: '1d20',
                    bonus: skillMod,
                    onSelect: (mode) => handleSkillRoll(name, skillMod, mode),
                  });
                }}
                className="flex items-center justify-between py-0.5 px-1.5 rounded hover:bg-white/5 cursor-pointer text-[11px] group"
                title={`Left-click: Roll ${name} · Right-click: Advantage / Disadvantage`}
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
                    {name}
                  </span>
                  <span className="text-[9px] text-gray-600 uppercase">
                    ({stat.substring(0, 3)})
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
