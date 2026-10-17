import React from 'react';
import '../../lib/i18n';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RollContextMenu from '../shared/RollContextMenu';
import EESysMarketplace, { MEMBERSHIP_ITEM } from '../market/EESysMarketplace';
import SpaceshipSheet from '../player/SpaceshipSheet';

describe('RollContextMenu', () => {
  it('renders Advantage and Disadvantage for d20 rolls and triggers selection', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <RollContextMenu
        isOpen={true}
        position={{ x: 100, y: 100 }}
        type="d20"
        title="Pulse Carbine Attack"
        bonus={5}
        onSelect={handleSelect}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Pulse Carbine Attack/i)).toBeInTheDocument();
    expect(screen.getByText(/^Advantage$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Disadvantage$/i)).toBeInTheDocument();
    expect(screen.getByText(/Normal Roll/i)).toBeInTheDocument();

    // Click advantage
    fireEvent.click(screen.getByText(/^Advantage$/i));
    expect(handleSelect).toHaveBeenCalledWith('advantage');
  });

  it('renders Critical Hit for damage rolls and does NOT show Advantage or Disadvantage', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <RollContextMenu
        isOpen={true}
        position={{ x: 100, y: 100 }}
        type="damage"
        title="Plasma Cannon Damage"
        diceNotation="2d6"
        bonus={2}
        onSelect={handleSelect}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Plasma Cannon Damage/i)).toBeInTheDocument();
    expect(screen.getByText(/CRITICAL HIT/i)).toBeInTheDocument();
    expect(screen.getByText(/Normal Damage/i)).toBeInTheDocument();

    // Must NOT have advantage or disadvantage
    expect(screen.queryByText(/^Advantage$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Disadvantage$/i)).not.toBeInTheDocument();

    // Click critical hit
    fireEvent.click(screen.getByText(/CRITICAL HIT/i));
    expect(handleSelect).toHaveBeenCalledWith('critical');
  });
});

describe('EESysMarketplace', () => {
  it('displays restricted access terminal when user lacks Equivalent Exchange Membership', () => {
    render(
      <EESysMarketplace
        player={{ displayName: 'Anthony', credits: 250 }}
        inventoryItems={[]}
      />
    );

    expect(screen.getByText(/RESTRICTED ACCESS TERMINAL/i)).toBeInTheDocument();
    expect(screen.getByText(/Prerequisite Requirement: Equivalent Exchange Membership/i)).toBeInTheDocument();
    expect(screen.getByText(/Acquire Equivalent Exchange Membership/i)).toBeInTheDocument();
  });

  it('unlocks marketplace catalog when user has Equivalent Exchange Membership item', () => {
    render(
      <EESysMarketplace
        player={{ displayName: 'Anthony', credits: 250 }}
        inventoryItems={[MEMBERSHIP_ITEM]}
      />
    );

    expect(screen.queryByText(/RESTRICTED ACCESS TERMINAL/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ACTIVE MEMBER/i)).toBeInTheDocument();
    expect(screen.getByText(/EQUIVALENT EXCHANGE SYSTEM \/\/ E.E.Sys/i)).toBeInTheDocument();
    expect(screen.getByText(/All Catalog/i)).toBeInTheDocument();
  });

  it('unlocks marketplace when player document has hasEEMembership flag or raw string in inventory', () => {
    // Flag test
    const { rerender } = render(
      <EESysMarketplace
        player={{ displayName: 'Anthony', credits: 250, hasEEMembership: true }}
        inventoryItems={[]}
      />
    );
    expect(screen.queryByText(/RESTRICTED ACCESS TERMINAL/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ACTIVE MEMBER/i)).toBeInTheDocument();

    // Raw string inventory test (as stored in Firestore arrayUnion)
    rerender(
      <EESysMarketplace
        player={{ displayName: 'Anthony', credits: 250, inventory: ['item_ee_membership'] }}
        inventoryItems={[]}
      />
    );
    expect(screen.queryByText(/RESTRICTED ACCESS TERMINAL/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ACTIVE MEMBER/i)).toBeInTheDocument();
  });

  it('persists membership across sessions via localStorage fallback', () => {
    const mockId = 'player-persisted-77';
    localStorage.setItem(`unendingvoid:ee_membership:${mockId}`, 'true');

    render(
      <EESysMarketplace
        player={{ id: mockId, displayName: 'Anthony', credits: 250 }}
        inventoryItems={[]}
      />
    );

    expect(screen.queryByText(/RESTRICTED ACCESS TERMINAL/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ACTIVE MEMBER/i)).toBeInTheDocument();

    localStorage.removeItem(`unendingvoid:ee_membership:${mockId}`);
  });

  it('filters catalog to display Materials & Components and allows purchasing materials', () => {
    const handleUpdateCredits = vi.fn();
    const handleUpdateInventory = vi.fn();

    render(
      <EESysMarketplace
        player={{ displayName: 'Anthony', credits: 500, hasEEMembership: true }}
        inventoryItems={[]}
        onUpdateCredits={handleUpdateCredits}
        onUpdateInventory={handleUpdateInventory}
      />
    );

    // Click Materials & Components tab
    const matTab = screen.getByRole('button', { name: /Materials & Components/i });
    fireEvent.click(matTab);

    // Verify raw materials appear in the catalog
    expect(screen.getByText(/Titanium-Ceramite Ingot/i)).toBeInTheDocument();
    expect(screen.getByText(/Plasma Compression Valve/i)).toBeInTheDocument();
    expect(screen.getByText(/Sub-Atomic Tachyon Crystal/i)).toBeInTheDocument();

    // Purchase Titanium-Ceramite Ingot (costs 25 credits)
    const buyButtons = screen.getAllByRole('button', { name: /Buy \(25 ₢\)/i });
    expect(buyButtons.length).toBeGreaterThan(0);
    fireEvent.click(buyButtons[0]);

    expect(handleUpdateCredits).toHaveBeenCalledWith(475);
    expect(handleUpdateInventory).toHaveBeenCalled();
  });

  it('allows synthesizing item for 0 credits when operative has components and design', () => {
    const handleUpdateInventory = vi.fn();
    const handleUpdateCredits = vi.fn();

    // Pulse Carbine requires 2x mat_titanium_alloy and 2x mat_plasma_cell
    const inventory = [
      MEMBERSHIP_ITEM,
      { id: 'mat_titanium_alloy', name: 'Titanium-Ceramite Ingot' },
      { id: 'mat_titanium_alloy', name: 'Titanium-Ceramite Ingot' },
      { id: 'mat_plasma_cell', name: 'Plasma Compression Valve' },
      { id: 'mat_plasma_cell', name: 'Plasma Compression Valve' },
    ];

    render(
      <EESysMarketplace
        player={{
          displayName: 'Anthony',
          credits: 300,
          hasEEMembership: true,
          designs: ['item_plasma_carbine_mk2'],
        }}
        inventoryItems={inventory}
        onUpdateInventory={handleUpdateInventory}
        onUpdateCredits={handleUpdateCredits}
      />
    );

    // Synthesize button should be available for 0 credits
    const synthesizeBtn = screen.getByRole('button', { name: /Synthesize \(0 ₡\)/i });
    expect(synthesizeBtn).toBeInTheDocument();

    fireEvent.click(synthesizeBtn);

    // Credits should NOT be deducted (free synthesis), inventory updated
    expect(handleUpdateCredits).not.toHaveBeenCalled();
    expect(handleUpdateInventory).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'item_plasma_carbine_mk2' })])
    );
  });

  it('allows unlocking design and synthesizing when operative has components but lacks design', () => {
    const handleUpdateInventory = vi.fn();
    const handleUpdateCredits = vi.fn();

    const inventory = [
      MEMBERSHIP_ITEM,
      { id: 'mat_titanium_alloy', name: 'Titanium-Ceramite Ingot' },
      { id: 'mat_titanium_alloy', name: 'Titanium-Ceramite Ingot' },
      { id: 'mat_plasma_cell', name: 'Plasma Compression Valve' },
      { id: 'mat_plasma_cell', name: 'Plasma Compression Valve' },
    ];

    render(
      <EESysMarketplace
        player={{
          displayName: 'Anthony',
          credits: 300,
          hasEEMembership: true,
          designs: [], // No design owned
        }}
        inventoryItems={inventory}
        onUpdateInventory={handleUpdateInventory}
        onUpdateCredits={handleUpdateCredits}
      />
    );

    // Unlock Design & Synthesize button should be visible with design cost (45 credits)
    const unlockAndCraftBtn = screen.getByRole('button', { name: /Unlock Design & Synthesize \(45 ₢\)/i });
    expect(unlockAndCraftBtn).toBeInTheDocument();

    fireEvent.click(unlockAndCraftBtn);

    // Deducts design cost (300 - 45 = 255)
    expect(handleUpdateCredits).toHaveBeenCalledWith(255);
    expect(handleUpdateInventory).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'item_plasma_carbine_mk2' })])
    );
  });

  it('allows direct system requisition when operative lacks components and design', () => {
    const handleUpdateInventory = vi.fn();
    const handleUpdateCredits = vi.fn();

    render(
      <EESysMarketplace
        player={{
          displayName: 'Anthony',
          credits: 500,
          hasEEMembership: true,
          designs: [],
        }}
        inventoryItems={[MEMBERSHIP_ITEM]}
        onUpdateInventory={handleUpdateInventory}
        onUpdateCredits={handleUpdateCredits}
      />
    );

    // Filter to weapons
    const weaponsTab = screen.getByRole('button', { name: /Weapons/i });
    fireEvent.click(weaponsTab);

    // Direct Requisition buttons should be available
    const directBuyButtons = screen.getAllByRole('button', { name: /Direct Requisition/i });
    expect(directBuyButtons.length).toBeGreaterThan(0);

    // Requisition first weapon (Pulse Carbine costs 150)
    fireEvent.click(directBuyButtons[0]);

    expect(handleUpdateCredits).toHaveBeenCalledWith(350);
    expect(handleUpdateInventory).toHaveBeenCalled();
  });
});

describe('SpaceshipSheet', () => {
  it('renders ship name, hull, shields, and weapons', () => {
    render(
      <SpaceshipSheet
        ship={{
          name: 'Kusaragi',
          hull: 180,
          maxHull: 180,
          shields: 120,
          maxShields: 120,
        }}
      />
    );

    expect(screen.getByText('Kusaragi')).toBeInTheDocument();
    expect(screen.getByText(/Starship Hull Integrity/i)).toBeInTheDocument();
    expect(screen.getByText(/Deflector Energy Capacitors/i)).toBeInTheDocument();
    expect(screen.getByText(/Twin Gauss Railguns/i)).toBeInTheDocument();
  });
});
