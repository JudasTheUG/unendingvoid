import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import i18n from '../../lib/i18n';
import DnDCharacterHeader from '../player/DnDCharacterHeader';
import DnDAbilitySidebar from '../player/DnDAbilitySidebar';
import DnDActionsTab from '../player/DnDActionsTab';
import InventoryList from '../player/InventoryList';
import TraitsList from '../player/TraitsList';
import enCommon from '../../locales/en/common.json';
import trCommon from '../../locales/tr/common.json';
import deCommon from '../../locales/de/common.json';

const mockCharacter = {
  id: 'char_test_ugur',
  displayName: 'Uğur GELEÇ',
  characterClass: 'Operative',
  species: 'Augmented Human',
  background: 'Mercenary',
  level: 3,
  proficiencyBonus: 2,
  speed: 30,
  armorClass: 14,
  hp: 120,
  maxHp: 120,
  shields: 65,
  maxShields: 65,
  stats: {
    strength: 20,
    dexterity: 20,
    constitution: 20,
    intelligence: 20,
    wisdom: 20,
    charisma: 20,
  },
  skillProficiencies: ['athletics', 'perception', 'stealth'],
};

describe('Player Sheet Multi-Language Localization Engine', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('tr');
  });

  it('verifies locale JSON structural parity across en, tr, and de', () => {
    const checkParity = (enObj, targetObj, path = '') => {
      for (const key of Object.keys(enObj)) {
        const currentPath = path ? `${path}.${key}` : key;
        expect(targetObj).toHaveProperty(key);
        if (typeof enObj[key] === 'object' && enObj[key] !== null) {
          checkParity(enObj[key], targetObj[key], currentPath);
        }
      }
    };

    checkParity(enCommon, trCommon, 'TR');
    checkParity(enCommon, deCommon, 'DE');
  });

  it('renders DnDCharacterHeader with full Turkish localization', async () => {
    await i18n.changeLanguage('tr');
    render(
      <DnDCharacterHeader
        character={mockCharacter}
        onShortRest={() => {}}
        onLongRest={() => {}}
        onUpdateHp={() => {}}
      />
    );

    // Verify Turkish labels
    expect(screen.getByText(/Uzmanlık/i)).toBeInTheDocument();
    expect(screen.getByText(/Hız/i)).toBeInTheDocument();
    expect(screen.getByText(/Zırh Sınıfı/i)).toBeInTheDocument();
    expect(screen.getByText(/İnisiyatif/i)).toBeInTheDocument();
    expect(screen.getByText(/Pasif Algı/i)).toBeInTheDocument();

    // Vitals
    expect(screen.getByText(/Gövde ve Can/i)).toBeInTheDocument();
    expect(screen.getByText(/Savunma Enerji Kalkanları/i)).toBeInTheDocument();

    // Controls
    expect(screen.getByText(/Kısa Mola/i)).toBeInTheDocument();
    expect(screen.getByText(/Uzun Mola/i)).toBeInTheDocument();
    expect(screen.getByText(/Operatif Hasar Kontrolü/i)).toBeInTheDocument();
    expect(screen.getByText(/Med-Stim/i)).toBeInTheDocument();
    expect(screen.getByText(/Kalkan Dalgası/i)).toBeInTheDocument();

    // Localized class, species, background
    expect(screen.getByText(/Seviye 3 Ajan · Güçlendirilmiş İnsan/i)).toBeInTheDocument();
    expect(screen.getByText(/Geçmiş: Paralı Asker/i)).toBeInTheDocument();
  });

  it('handles Operative Damage Control actions (Med-Stim, Shield Surge)', () => {
    const handleUpdateHp = vi.fn();
    render(
      <DnDCharacterHeader
        character={{ ...mockCharacter, hp: 50, maxHp: 100, shields: 10, maxShields: 50 }}
        onShortRest={vi.fn()}
        onLongRest={vi.fn()}
        onUpdateHp={handleUpdateHp}
      />
    );

    // Med-stim adds 20 HP
    const stimBtn = screen.getByRole('button', { name: /Med-Stim/i });
    fireEvent.click(stimBtn);
    expect(handleUpdateHp).toHaveBeenCalledWith(70, 10);

    // Shield surge adds 15 Shields
    const shieldBtn = screen.getByRole('button', { name: /Kalkan Dalgası|Shield Surge/i });
    fireEvent.click(shieldBtn);
    expect(handleUpdateHp).toHaveBeenCalledWith(50, 25);
  });

  it('renders DnDAbilitySidebar with Turkish ability labels and skills', async () => {
    await i18n.changeLanguage('tr');
    render(<DnDAbilitySidebar character={mockCharacter} />);

    // Scores
    expect(screen.getAllByText(/Skor: 20/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Kurtarma Zarları/i)).toBeInTheDocument();
    expect(screen.getByText(/Uzmanlıklar ve Beceriler/i)).toBeInTheDocument();

    // Ability names in saves
    expect(screen.getByText('Kuvvet')).toBeInTheDocument();
    expect(screen.getByText('Çeviklik')).toBeInTheDocument();
    expect(screen.getByText('Dayanıklılık')).toBeInTheDocument();
    expect(screen.getByText('Zeka')).toBeInTheDocument();
    expect(screen.getByText('Bilgelik')).toBeInTheDocument();
    expect(screen.getByText('Karizma')).toBeInTheDocument();

    // Skills
    expect(screen.getByText('Atletizm')).toBeInTheDocument();
    expect(screen.getByText('Algı')).toBeInTheDocument();
    expect(screen.getByText('Gizlilik')).toBeInTheDocument();
  });

  it('renders DnDActionsTab with Turkish weapons, columns, and actions', async () => {
    await i18n.changeLanguage('tr');
    render(<DnDActionsTab character={mockCharacter} onAddAttack={() => {}} />);

    expect(screen.getByText(/Silah ve Teknolojik Saldırılar/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Saldırı Ekle/i)).toBeInTheDocument();

    // Table Columns & Content
    expect(screen.getAllByText(/Silah/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Menzil/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/İsabet/i)).toBeInTheDocument();
    expect(screen.getByText(/Hasar ve Tür/i)).toBeInTheDocument();
    expect(screen.getByText(/Notlar/i)).toBeInTheDocument();

    // Localized weapons
    expect(screen.getByText('Darbe Karbini')).toBeInTheDocument();
    expect(screen.getByText('Monomoleküler Titro-Bıçak')).toBeInTheDocument();
    expect(screen.getByText('Ağır Plazma Topu')).toBeInTheDocument();

    // Tactical Actions & Reactions
    expect(screen.getByText(/Standart Taktik Eylemler/i)).toBeInTheDocument();
    expect(screen.getByText('Koş')).toBeInTheDocument();
    expect(screen.getByText('Geri Çekil')).toBeInTheDocument();
    expect(screen.getByText(/Tepkiler ve Savaş Refleksleri/i)).toBeInTheDocument();
    expect(screen.getByText('Fırsat Saldırısı')).toBeInTheDocument();
  });

  it('renders InventoryList and TraitsList in German when language is changed to de', async () => {
    await i18n.changeLanguage('de');
    render(<InventoryList items={[]} locale="de" />);

    expect(screen.getByText(/Fracht & Waffenkammer/i)).toBeInTheDocument();
    expect(screen.getByText(/Der Frachtraum ist leer/i)).toBeInTheDocument();

    render(<TraitsList traits={[]} locale="de" />);
    expect(screen.getByText(/Kybernetik & Genetische Merkmale/i)).toBeInTheDocument();
    expect(screen.getByText(/Keine genetischen Augmentierungen/i)).toBeInTheDocument();
  });
});
