import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCampaign, createCharacter, addCharacterToCampaign } from '../campaignActions';
import { addDoc, setDoc, updateDoc, doc, collection } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  arrayUnion: vi.fn((val) => val),
  arrayRemove: vi.fn((val) => val),
  serverTimestamp: vi.fn(() => 'serverTimestampMock'),
}));

vi.mock('../firebase', () => ({
  db: { _mockDb: true },
}));

describe('campaignActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doc.mockReturnValue({ id: 'mock-doc-ref' });
    collection.mockReturnValue({ id: 'mock-collection-ref' });
    addDoc.mockResolvedValue({ id: 'new-camp-id' });
    setDoc.mockResolvedValue();
    updateDoc.mockResolvedValue();
  });

  it('createCampaign generates an invite code and assigns dmId', async () => {
    const res = await createCampaign({
      name: 'Stellar Incursion',
      description: 'Battle for deep space',
      dmId: 'dm-user-123',
      dmName: 'Master Zephyr',
    });

    expect(res.id).toBe('new-camp-id');
    expect(res.dmId).toBe('dm-user-123');
    expect(res.inviteCode).toBeDefined();
    expect(res.inviteCode.length).toBeGreaterThan(0);
    expect(addDoc).toHaveBeenCalledTimes(1);
  });

  it('createCharacter initializes D&D Beyond stats, proficiency, and attacks', async () => {
    const newChar = await createCharacter({
      ownerId: 'player-1',
      name: 'Zara Nova',
      characterClass: 'Cyber-Commando',
      stats: { strength: 16, dexterity: 14, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
    });

    expect(newChar.name).toBe('Zara Nova');
    expect(newChar.level).toBe(1);
    expect(newChar.proficiencyBonus).toBe(2);
    expect(newChar.hp).toBe(24);
    expect(newChar.attacks).toHaveLength(2);
    expect(newChar.attacks[0].name).toBe('Pulse Carbine');
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('addCharacterToCampaign links campaignId to character and updates campaign roster', async () => {
    const mockChar = {
      id: 'char-123',
      ownerId: 'player-1',
      name: 'Zara Nova',
      level: 2,
      hp: 30,
      maxHp: 30,
    };

    await addCharacterToCampaign('camp-456', mockChar);

    expect(updateDoc).toHaveBeenCalledTimes(2);
  });
});
