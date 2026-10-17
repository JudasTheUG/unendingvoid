import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  updatePlayerHP,
  updatePlayerShields,
  updatePlayerStat,
  addTrait,
  removeTrait,
  addItemToInventory,
  removeItemFromInventory,
  updateCredits,
  equipWeapon,
  equipArmor,
  setSpaceship,
  addPlayerNote,
  removePlayerNote,
  setPlayerEEMembership,
  assignShipToPlayer,
  removeShipFromPlayer,
  updatePlayerInventory,
  addPlayerDesign,
} from '../playerActions';

// Mock Firebase functions
vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn(),
    updateDoc: vi.fn(),
    arrayUnion: vi.fn((val) => `arrayUnion(${val})`),
    arrayRemove: vi.fn((val) => `arrayRemove(${val})`),
    serverTimestamp: vi.fn(() => 'serverTimestampMock'),
  };
});

vi.mock('../firebase', () => {
  return {
    db: {},
  };
});

describe('playerActions', () => {
  const mockUserId = 'test-user-id';
  const mockDocRef = { id: 'mock-doc' };

  beforeEach(() => {
    vi.clearAllMocks();
    doc.mockReturnValue(mockDocRef);
    updateDoc.mockResolvedValue();
  });

  it('updatePlayerHP calls updateDoc with correct parameters', async () => {
    const hp = 50;
    await updatePlayerHP(mockUserId, hp);
    
    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      hp,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('updatePlayerShields calls updateDoc with correct parameters', async () => {
    const shields = 100;
    await updatePlayerShields(mockUserId, shields);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      shields,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('updatePlayerStat calls updateDoc with correct parameters', async () => {
    const stat = 'strength';
    const value = 18;
    await updatePlayerStat(mockUserId, stat, value);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      'stats.strength': value,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('addTrait calls updateDoc with correct parameters', async () => {
    const traitId = 'tough';
    await addTrait(mockUserId, traitId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(arrayUnion).toHaveBeenCalledWith(traitId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      traits: `arrayUnion(${traitId})`,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('removeTrait calls updateDoc with correct parameters', async () => {
    const traitId = 'tough';
    await removeTrait(mockUserId, traitId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(arrayRemove).toHaveBeenCalledWith(traitId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      traits: `arrayRemove(${traitId})`,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('addItemToInventory calls updateDoc with correct parameters', async () => {
    const itemId = 'blaster';
    await addItemToInventory(mockUserId, itemId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(arrayUnion).toHaveBeenCalledWith(itemId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      inventory: `arrayUnion(${itemId})`,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('removeItemFromInventory calls updateDoc with correct parameters', async () => {
    const itemId = 'blaster';
    await removeItemFromInventory(mockUserId, itemId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(arrayRemove).toHaveBeenCalledWith(itemId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      inventory: `arrayRemove(${itemId})`,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('updateCredits calls updateDoc with correct parameters', async () => {
    const credits = 1500;
    await updateCredits(mockUserId, credits);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      credits,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('equipWeapon calls updateDoc with correct parameters', async () => {
    const itemId = 'laser_rifle';
    await equipWeapon(mockUserId, itemId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      equippedWeapon: itemId,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('equipArmor calls updateDoc with correct parameters', async () => {
    const itemId = 'kevlar_vest';
    await equipArmor(mockUserId, itemId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      equippedArmor: itemId,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('setSpaceship calls updateDoc with correct parameters', async () => {
    const itemId = 'millennium_falcon';
    await setSpaceship(mockUserId, itemId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      spaceship: itemId,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('addPlayerNote calls updateDoc with arrayUnion', async () => {
    const note = { id: 'note_1', title: 'Belter Contact', content: 'Met informal contact at Tycho Station' };
    await addPlayerNote(mockUserId, note);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      notes: 'arrayUnion([object Object])',
      updatedAt: 'serverTimestampMock',
    });
  });

  it('removePlayerNote calls updateDoc with arrayRemove', async () => {
    const note = { id: 'note_1' };
    await removePlayerNote(mockUserId, note);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      notes: 'arrayRemove([object Object])',
      updatedAt: 'serverTimestampMock',
    });
  });

  it('setPlayerEEMembership calls updateDoc with hasEEMembership and arrayUnion for item_ee_membership', async () => {
    await setPlayerEEMembership(mockUserId, true);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(arrayUnion).toHaveBeenCalledWith('item_ee_membership');
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      hasEEMembership: true,
      inventory: 'arrayUnion(item_ee_membership)',
      updatedAt: 'serverTimestampMock',
    });
  });

  it('assignShipToPlayer calls updateDoc with ship, spaceship and spaceshipName', async () => {
    const mockShip = { id: 'ship_kusaragi_corvette', name: 'Kusaragi' };
    await assignShipToPlayer(mockUserId, mockShip);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      ship: mockShip,
      spaceship: 'ship_kusaragi_corvette',
      spaceshipName: 'Kusaragi',
      updatedAt: 'serverTimestampMock',
    });
  });

  it('removeShipFromPlayer calls updateDoc with null ship values', async () => {
    await removeShipFromPlayer(mockUserId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      ship: null,
      spaceship: null,
      spaceshipName: null,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('updatePlayerInventory calls updateDoc with new inventory array', async () => {
    const newInv = ['item_1', 'mat_titanium_alloy'];
    await updatePlayerInventory(mockUserId, newInv);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      inventory: newInv,
      updatedAt: 'serverTimestampMock',
    });
  });

  it('addPlayerDesign calls updateDoc with designs and inventory arrayUnion', async () => {
    const designId = 'item_plasma_carbine_mk2';
    await addPlayerDesign(mockUserId, designId);

    expect(doc).toHaveBeenCalledWith(db, 'players', mockUserId);
    expect(arrayUnion).toHaveBeenCalledWith(designId);
    expect(arrayUnion).toHaveBeenCalledWith(`design_${designId}`);
    expect(updateDoc).toHaveBeenCalledWith(mockDocRef, {
      designs: 'arrayUnion(item_plasma_carbine_mk2)',
      inventory: 'arrayUnion(design_item_plasma_carbine_mk2)',
      updatedAt: 'serverTimestampMock',
    });
  });
});


