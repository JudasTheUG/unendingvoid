import React, { useState } from 'react';
import { triggerInteractiveRoll } from '../dice/DiceOverlay';

const DEFAULT_ATTACKS = [
  {
    id: 'atk_carbine',
    name: 'Pulse Carbine',
    type: 'Ranged',
    range: '80 / 240 ft.',
    stat: 'dexterity',
    damageDice: '1d8',
    damageType: 'Energy',
    bonus: 0,
    notes: 'Burst Fire, Kinetic Dampener',
  },
  {
    id: 'atk_blade',
    name: 'Monomolecular Vibro-Blade',
    type: 'Melee',
    range: '5 ft. reach',
    stat: 'strength',
    damageDice: '1d6',
    damageType: 'Slashing',
    bonus: 1,
    notes: 'Finesse, Light',
  },
  {
    id: 'atk_plasma',
    name: 'Heavy Plasma Cannon',
    type: 'Heavy Ranged',
    range: '100 / 300 ft.',
    stat: 'strength',
    damageDice: '2d6',
    damageType: 'Thermal',
    bonus: 0,
    notes: 'Two-Handed, Area Melt',
  },
];

export default function DnDActionsTab({ character, onAddAttack }) {
  const [attacks, setAttacks] = useState(character.attacks?.length ? character.attacks : DEFAULT_ATTACKS);
  const [showAddModal, setShowAddModal] = useState(false);

  // New attack form
  const [atkName, setAtkName] = useState('');
  const [atkType, setAtkType] = useState('Ranged');
  const [atkRange, setAtkRange] = useState('60 / 180 ft.');
  const [atkStat, setAtkStat] = useState('dexterity');
  const [atkDice, setAtkDice] = useState('1d8');
  const [atkDamageType, setAtkDamageType] = useState('Energy');

  const stats = character.stats || {};
  const profBonus = character.proficiencyBonus || Math.floor(((character.level || 1) - 1) / 4) + 2;

  const getStatMod = (statKey) => Math.floor(((stats[statKey] ?? 10) - 10) / 2);

  const handleAttackToHit = (atk) => {
    const statMod = getStatMod(atk.stat || 'dexterity');
    const toHitBonus = statMod + profBonus + (atk.bonus || 0);

    // Roll d20 with exact to-hit formula
    triggerInteractiveRoll('1d20', toHitBonus, `Attack Hit Check: ${atk.name}`);
  };

  const handleDamageRoll = (atk) => {
    const statMod = getStatMod(atk.stat || 'dexterity');
    const totalDmgBonus = statMod + (atk.bonus || 0);

    // Roll damage using weapon's exact die (e.g. 1d8, 2d6, 1d12)
    triggerInteractiveRoll(
      atk.damageDice || '1d8',
      totalDmgBonus,
      `Damage Roll: ${atk.name} (${atk.damageType || 'Piercing'})`
    );
  };

  const handleCreateAttack = (e) => {
    e.preventDefault();
    if (!atkName.trim()) return;

    const newAtk = {
      id: `atk_${Date.now()}`,
      name: atkName,
      type: atkType,
      range: atkRange,
      stat: atkStat,
      damageDice: atkDice,
      damageType: atkDamageType,
      bonus: 0,
    };

    const updated = [...attacks, newAtk];
    setAttacks(updated);
    if (onAddAttack) onAddAttack(updated);
    setShowAddModal(false);
    setAtkName('');
  };

  return (
    <div className="space-y-6">
      {/* Attacks Section */}
      <div className="glass-panel p-5 border-l-4 border-l-neon-cyan space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-neon-cyan text-base">⚔️</span>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Weapon & Technological Attacks
            </h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1 bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/40 rounded text-xs font-mono font-bold uppercase tracking-wider"
          >
            + Add Attack
          </button>
        </div>

        {/* Attack Table matching DnD Beyond */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 text-[10px] uppercase">
                <th className="py-2 px-2">Weapon</th>
                <th className="py-2 px-2">Range</th>
                <th className="py-2 px-2 text-center">To Hit</th>
                <th className="py-2 px-2 text-center">Damage & Type</th>
                <th className="py-2 px-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {attacks.map((atk) => {
                const statMod = getStatMod(atk.stat || 'dexterity');
                const toHit = statMod + profBonus + (atk.bonus || 0);
                const toHitStr = toHit >= 0 ? `+${toHit}` : `${toHit}`;
                const dmgBonus = statMod + (atk.bonus || 0);
                const dmgBonusStr = dmgBonus >= 0 ? `+${dmgBonus}` : `${dmgBonus}`;

                return (
                  <tr key={atk.id} className="hover:bg-white/5 transition-colors">
                    {/* Weapon Name */}
                    <td className="py-2.5 px-2">
                      <span className="font-display font-bold text-white text-sm block">
                        {atk.name}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase">
                        {atk.type} ({atk.stat?.substring(0, 3).toUpperCase()})
                      </span>
                    </td>

                    {/* Range */}
                    <td className="py-2.5 px-2 text-gray-300 text-xs">{atk.range}</td>

                    {/* Clickable TO HIT Button (Sword/D20 Icon) */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => handleAttackToHit(atk)}
                        className="px-3 py-1.5 rounded-lg bg-neon-cyan/15 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 font-black text-sm tracking-wider transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] hover:scale-105 active:scale-95 inline-flex items-center gap-1.5"
                        title="Click to roll attack check (d20)"
                      >
                        <span>⚔️</span>
                        <span>{toHitStr}</span>
                      </button>
                    </td>

                    {/* Clickable DAMAGE Button (Dice Icon with Weapon's Exact Die) */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => handleDamageRoll(atk)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 font-bold text-xs tracking-wider transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95 inline-flex items-center gap-1.5"
                        title={`Click to roll damage (${atk.damageDice})`}
                      >
                        <span>🎲</span>
                        <span>
                          {atk.damageDice}
                          {dmgBonusStr} {atk.damageType}
                        </span>
                      </button>
                    </td>

                    {/* Notes */}
                    <td className="py-2.5 px-2 text-gray-400 text-[11px]">{atk.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard Actions & Bonus Actions (D&D Beyond Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Actions */}
        <div className="glass-panel p-4 border border-white/10 space-y-2">
          <h4 className="font-display text-xs text-neon-cyan uppercase tracking-wider font-bold border-b border-white/10 pb-1">
            Standard Tactical Actions
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              { name: 'Dash', desc: 'Double movement speed for turn' },
              { name: 'Disengage', desc: 'Movement does not provoke opportunity attacks' },
              { name: 'Dodge', desc: 'Attacks against you have disadvantage' },
              { name: 'Overcharge Shield', desc: 'Expend bonus action to restore 5 shields' },
            ].map((action) => (
              <div key={action.name} className="bg-white/5 p-2 rounded border border-white/5">
                <span className="font-bold text-white block">{action.name}</span>
                <span className="text-[10px] text-gray-400 leading-snug">{action.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reactions & Senses */}
        <div className="glass-panel p-4 border border-white/10 space-y-2">
          <h4 className="font-display text-xs text-neon-magenta uppercase tracking-wider font-bold border-b border-white/10 pb-1">
            Reactions & Combat Reflexes
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs font-mono">
            <div className="bg-white/5 p-2 rounded border border-white/5">
              <span className="font-bold text-white block">Opportunity Strike</span>
              <span className="text-[10px] text-gray-400">
                Strike an enemy entering or leaving melee reach.
              </span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/5">
              <span className="font-bold text-white block">Phase Shift Reaction</span>
              <span className="text-[10px] text-gray-400">
                Halve damage from an incoming kinetic blast once per combat.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Attack */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 max-w-md w-full border-neon-cyan shadow-[0_0_25px_rgba(0,240,255,0.3)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="font-display text-sm font-bold text-neon-cyan">
                Fabricate Weapon Attack
              </h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAttack} className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-gray-400 uppercase block mb-1">Weapon Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Singularity Edge"
                  value={atkName}
                  onChange={(e) => setAtkName(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:outline-none focus:border-neon-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 uppercase block mb-1">Type</label>
                  <select
                    value={atkType}
                    onChange={(e) => setAtkType(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:outline-none"
                  >
                    <option value="Melee">Melee</option>
                    <option value="Ranged">Ranged</option>
                    <option value="Heavy Ranged">Heavy Ranged</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 uppercase block mb-1">Governing Stat</label>
                  <select
                    value={atkStat}
                    onChange={(e) => setAtkStat(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:outline-none"
                  >
                    <option value="strength">Strength</option>
                    <option value="dexterity">Dexterity</option>
                    <option value="intelligence">Intelligence</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-gray-400 uppercase block mb-1">Damage Die</label>
                  <select
                    value={atkDice}
                    onChange={(e) => setAtkDice(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:outline-none"
                  >
                    <option value="1d4">1d4</option>
                    <option value="1d6">1d6</option>
                    <option value="1d8">1d8</option>
                    <option value="1d10">1d10</option>
                    <option value="1d12">1d12</option>
                    <option value="2d6">2d6</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-400 uppercase block mb-1">Damage Type</label>
                  <input
                    type="text"
                    value={atkDamageType}
                    onChange={(e) => setAtkDamageType(e.target.value)}
                    className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-400 uppercase block mb-1">Range</label>
                <input
                  type="text"
                  value={atkRange}
                  onChange={(e) => setAtkRange(e.target.value)}
                  className="w-full bg-void-bg border border-white/20 rounded p-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-neon-cyan/20 text-neon-cyan border border-neon-cyan font-bold uppercase"
                >
                  Save Attack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
