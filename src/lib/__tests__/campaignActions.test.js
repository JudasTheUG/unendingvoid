import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCampaign,
  createCharacter,
  addCharacterToCampaign,
  requestInitiative,
  submitInitiativeRoll,
  setCombatTurnOrder,
  deleteCampaign,
  deleteCharacter,
  removeCharacterFromCampaign,
} from '../campaignActions';
import { addDoc, setDoc, updateDoc, deleteDoc, getDoc, doc, collection } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
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

  it('requestInitiative sets initiativeRequested flag and resets rolls', async () => {
    const res = await requestInitiative('camp-123');

    expect(res.initiativeRequested).toBe(true);
    expect(res.combatActive).toBe(false);
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'mock-doc-ref' },
      expect.objectContaining({
        initiativeRequested: true,
        initiativeRolls: {},
      })
    );
  });

  it('submitInitiativeRoll records calculated player roll', async () => {
    const rollData = {
      playerId: 'player-kael',
      playerName: 'Kaelen Voss',
      roll: 16,
      modifier: 2,
      total: 18,
    };

    const res = await submitInitiativeRoll('camp-123', rollData);

    expect(res.total).toBe(18);
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'mock-doc-ref' },
      expect.objectContaining({
        'initiativeRolls.player-kael': expect.objectContaining({
          playerId: 'player-kael',
          total: 18,
        }),
      })
    );
  });

  it('setCombatTurnOrder stores sorted turn order and activates combat', async () => {
    const turnOrder = ['player-kael', 'enemy-1', 'player-lyra'];
    const res = await setCombatTurnOrder('camp-123', turnOrder);

    expect(res.combatActive).toBe(true);
    expect(res.initiativeRequested).toBe(false);
    expect(updateDoc).toHaveBeenCalledWith(
      { id: 'mock-doc-ref' },
      expect.objectContaining({
        turnOrder,
        combatActive: true,
        initiativeRequested: false,
      })
    );
  });

  it('deleteCampaign deletes campaign document from Firestore', async () => {
    deleteDoc.mockResolvedValue();
    const res = await deleteCampaign('camp-123');

    expect(res).toBe(true);
    expect(deleteDoc).toHaveBeenCalledWith({ id: 'mock-doc-ref' });
  });

  it('deleteCharacter deletes character document from Firestore', async () => {
    deleteDoc.mockResolvedValue();
    const res = await deleteCharacter('char-123');

    expect(res).toBe(true);
    expect(deleteDoc).toHaveBeenCalledWith({ id: 'mock-doc-ref' });
  });

  it('removeCharacterFromCampaign updates campaign roster and clears campaignId on character', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        activeCharacters: [
          { characterId: 'char-1', name: 'Zara' },
          { characterId: 'char-2', name: 'Kael' },
        ],
      }),
    });
    updateDoc.mockResolvedValue();

    const res = await removeCharacterFromCampaign('camp-123', 'char-1');

    expect(res).toBe(true);
    expect(getDoc).toHaveBeenCalledWith({ id: 'mock-doc-ref' });
    expect(updateDoc).toHaveBeenCalledTimes(2);
  });
});

