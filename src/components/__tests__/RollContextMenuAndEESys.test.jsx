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
