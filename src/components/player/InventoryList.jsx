import React from 'react';
import { useTranslation } from 'react-i18next';
import ItemCard from '../shared/ItemCard';

export default function InventoryList({
  items = [],
  equippedWeapon,
  equippedArmor,
  locale = 'en',
  onEquip,
}) {
  const { t } = useTranslation();

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-4">
        <h2 className="font-display text-xs text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <span className="text-neon-cyan">◧</span> {t('inventory.cargoArmory', 'Cargo & Armory')}
        </h2>
        <span className="text-[10px] text-gray-500 font-mono">
          {items.length} {items.length === 1 ? t('inventory.item', 'Item') : t('inventory.items', 'Items')}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-xs border border-dashed border-white/10 rounded-lg">
          {t('inventory.emptyCargo', 'Cargo hold is empty. Obtain items from the DM or market.')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {items.map((item) => {
            const isEquipped = item.id === equippedWeapon || item.id === equippedArmor;
            return (
              <ItemCard
                key={item.id}
                item={item}
                locale={locale}
                isEquipped={isEquipped}
                onEquip={onEquip}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
