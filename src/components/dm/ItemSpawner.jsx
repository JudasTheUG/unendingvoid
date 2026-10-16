import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { addItemToInventory } from '../../lib/playerActions';

const ITEM_TYPES = ['weapon', 'armor', 'gear', 'spaceship', 'consumable'];
const RARITIES = ['common', 'uncommon', 'rare', 'legendary', 'alien'];

export default function ItemSpawner({ players = [], onSpawnComplete }) {
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [type, setType] = useState('weapon');
  const [rarity, setRarity] = useState('uncommon');
  const [value, setValue] = useState(500);
  const [statValue, setStatValue] = useState(15);
  const [activeTab, setActiveTab] = useState('en');

  // Multilingual states
  const [nameEn, setNameEn] = useState('');
  const [nameTr, setNameTr] = useState('');
  const [nameNl, setNameNl] = useState('');

  const [descEn, setDescEn] = useState('');
  const [descTr, setDescTr] = useState('');
  const [descNlN, setDescNl] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameEn) return;

    setLoading(true);
    try {
      const itemData = {
        type,
        rarity,
        value: Number(value),
        name: {
          en: nameEn,
          tr: nameTr || nameEn,
          nl: descNlN || nameEn,
        },
        description: {
          en: descEn,
          tr: descTr || descEn,
          nl: descNlN || descEn,
        },
        createdAt: serverTimestamp(),
      };

      if (type === 'weapon') itemData.damage = Number(statValue);
      if (type === 'armor') itemData.defense = Number(statValue);
      if (type === 'spaceship') {
        itemData.speed = Number(statValue) * 50;
        itemData.hullPoints = 200;
      }
      if (type === 'consumable') itemData.effect = `heal:${statValue}`;

      const docRef = await addDoc(collection(db, 'items'), itemData);

      // If a player was chosen, assign immediately
      if (selectedPlayer) {
        await addItemToInventory(selectedPlayer, docRef.id);
      }

      // Reset form
      setNameEn('');
      setNameTr('');
      setNameNl('');
      setDescEn('');
      setDescTr('');
      setDescNl('');

      if (onSpawnComplete) onSpawnComplete(docRef.id);
    } catch (err) {
      console.error('[ItemSpawner] Error creating item:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-5 border-l-4 border-l-neon-cyan">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
        <h2 className="font-display text-xs text-neon-cyan uppercase tracking-widest flex items-center gap-2">
          <span>⚡</span> Replicator & Item Fabricator
        </h2>
        <span className="text-[10px] text-gray-500 font-mono">Multilingual Matrix</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type & Rarity & Assign */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">Item Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-neon-cyan focus:outline-none"
            >
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t} className="bg-void-surface">
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">Rarity Tier</label>
            <select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-neon-cyan focus:outline-none"
            >
              {RARITIES.map((r) => (
                <option key={r} value={r} className="bg-void-surface">
                  {r.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">Assign to Operative</label>
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-neon-cyan focus:outline-none"
            >
              <option value="">Store in Global Armory</option>
              {players
                .filter((p) => p.role !== 'dm')
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-void-surface">
                    {p.displayName}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Dynamic stat & value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">
              {type === 'weapon' && 'Base Damage'}
              {type === 'armor' && 'Shield Defense'}
              {type === 'spaceship' && 'Sub-Warp Multiplier'}
              {type === 'consumable' && 'Healing Potency'}
              {type === 'gear' && 'Utility Rating'}
            </label>
            <input
              type="number"
              value={statValue}
              onChange={(e) => setStatValue(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-neon-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 block mb-1">Credit Value (CR)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-amber-300 font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Multilingual Tabs */}
        <div className="border border-white/10 rounded-lg p-3 bg-black/20">
          <div className="flex items-center gap-1 mb-2 border-b border-white/10 pb-1.5">
            {[
              { code: 'en', label: 'English 🇬🇧' },
              { code: 'tr', label: 'Türkçe 🇹🇷' },
              { code: 'nl', label: 'Nederlands 🇳🇱' },
            ].map((tab) => (
              <button
                key={tab.code}
                type="button"
                onClick={() => setActiveTab(tab.code)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-all
                           ${activeTab === tab.code
                             ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40 font-bold'
                             : 'text-gray-400 hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'en' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Item designation (EN)..."
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                required
                className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none"
              />
              <textarea
                placeholder="Item tactical description (EN)..."
                value={descEn}
                onChange={(e) => setDescEn(e.target.value)}
                rows={2}
                className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-gray-300 focus:border-neon-cyan focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'tr' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nesne adı (TR)..."
                value={nameTr}
                onChange={(e) => setNameTr(e.target.value)}
                className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none"
              />
              <textarea
                placeholder="Taktiksel açıklama (TR)..."
                value={descTr}
                onChange={(e) => setDescTr(e.target.value)}
                rows={2}
                className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-gray-300 focus:border-neon-cyan focus:outline-none"
              />
            </div>
          )}

          {activeTab === 'nl' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Item naam (NL)..."
                value={nameNl}
                onChange={(e) => setNameNl(e.target.value)}
                className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-white focus:border-neon-cyan focus:outline-none"
              />
              <textarea
                placeholder="Tactische omschrijving (NL)..."
                value={descNlN}
                onChange={(e) => setDescNl(e.target.value)}
                rows={2}
                className="w-full bg-void-bg border border-white/10 rounded px-2.5 py-1 text-xs text-gray-300 focus:border-neon-cyan focus:outline-none"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !nameEn}
          className="w-full py-2 rounded bg-neon-cyan/20 hover:bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)] disabled:opacity-50"
        >
          {loading ? 'Fabricating Nanites...' : '⚡ Replicate & Dispatch Item'}
        </button>
      </form>
    </div>
  );
}
