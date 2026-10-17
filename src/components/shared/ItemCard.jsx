import React from 'react';
import { useTranslation } from 'react-i18next';

const RARITY_STYLES = {
  common: {
    border: 'border-gray-500/30 hover:border-gray-400',
    badge: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    glow: 'hover:shadow-[0_0_15px_rgba(156,163,175,0.15)]',
  },
  uncommon: {
    border: 'border-neon-green/30 hover:border-neon-green/70',
    badge: 'bg-neon-green/15 text-neon-green border-neon-green/40',
    glow: 'hover:shadow-[0_0_15px_rgba(0,255,136,0.2)]',
  },
  rare: {
    border: 'border-blue-500/40 hover:border-blue-400',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
    glow: 'hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]',
  },
  legendary: {
    border: 'border-neon-purple/40 hover:border-neon-purple',
    badge: 'bg-neon-purple/20 text-purple-300 border-neon-purple/50',
    glow: 'hover:shadow-[0_0_20px_rgba(170,68,255,0.3)]',
  },
  alien: {
    border: 'border-neon-cyan/50 hover:border-neon-cyan',
    badge: 'bg-neon-cyan/20 text-neon-cyan border-neon-cyan/60 animate-pulse',
    glow: 'hover:shadow-[0_0_25px_rgba(0,240,255,0.4)]',
  },
};

/**
 * ItemCard - Sci-fi equipment/item card with rarity glow and multilingual text.
 * @param {Object} item - Item object
 * @param {string} [locale='en'] - Active locale
 * @param {boolean} [isEquipped=false] - Whether item is equipped
 * @param {function} [onEquip] - Equip callback
 * @param {function} [onAction] - General action callback (e.g. use consumable or remove)
 */
export default function ItemCard({ item, locale = 'en', isEquipped = false, onEquip, onAction }) {
  const { t } = useTranslation();
  if (!item) return null;

  const rarity = item.rarity || 'common';
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  // Retrieve multilingual name & description or fallback
  const name = typeof item.name === 'object' ? (item.name[locale] || item.name.en || 'Unknown Item') : item.name;
  const description =
    typeof item.description === 'object'
      ? (item.description[locale] || item.description.en || '')
      : item.description;

  return (
    <div
      className={`glass-panel p-3.5 flex flex-col justify-between transition-all duration-300
                 ${style.border} ${style.glow} ${isEquipped ? 'ring-1 ring-neon-cyan/60 bg-white/[0.07]' : ''}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="font-display font-bold text-sm text-white tracking-wide">{name}</h4>
            <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400">
              {item.type || 'gear'}
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${style.badge}`}>
            {rarity}
          </span>
        </div>

        {description && <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{description}</p>}
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs font-mono">
        {/* Stat badges */}
        <div className="flex items-center gap-2">
          {item.damage !== undefined && (
            <span className="text-neon-red flex items-center gap-1 font-bold">
              ⚔️ {item.damage} <span className="text-[10px] text-gray-500 font-normal">DMG</span>
            </span>
          )}
          {item.defense !== undefined && (
            <span className="text-neon-cyan flex items-center gap-1 font-bold">
              🛡️ {item.defense} <span className="text-[10px] text-gray-500 font-normal">DEF</span>
            </span>
          )}
          {item.speed !== undefined && (
            <span className="text-amber-400 flex items-center gap-1 font-bold">
              ⚡ {item.speed} <span className="text-[10px] text-gray-500 font-normal">SPD</span>
            </span>
          )}
          {item.effect && (
            <span className="text-neon-green flex items-center gap-1 font-bold">
              ✨ {item.effect}
            </span>
          )}
        </div>

        {/* Cost & Equip Action */}
        <div className="flex items-center gap-2">
          {item.value !== undefined && (
            <span className="text-amber-300/90 text-xs">
              {item.value.toLocaleString()} <span className="text-[9px] text-gray-400">CR</span>
            </span>
          )}
          {onEquip && (
            <button
              onClick={() => onEquip(item.id)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold transition-all
                         ${isEquipped
                           ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                           : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
              {isEquipped ? t('common.equipped', 'Equipped') : t('common.equip', 'Equip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
