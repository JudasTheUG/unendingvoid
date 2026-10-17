import React from 'react';
import '../../lib/i18n';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NavalShipyard from '../player/NavalShipyard';
import ShipAssignmentModal from '../dm/ShipAssignmentModal';
import * as playerActions from '../../lib/playerActions';

vi.mock('../../lib/playerActions', () => ({
  assignShipToPlayer: vi.fn(() => Promise.resolve()),
  removeShipFromPlayer: vi.fn(() => Promise.resolve()),
}));

describe('NavalShipyard Component', () => {
  it('renders starship hulls and respects credit affordability', () => {
    const handleCommission = vi.fn();
    render(
      <NavalShipyard
        player={{ credits: 500 }}
        activeShip={{ id: 'ship_vanguard_scout', name: 'Vanguard Recon Skiff' }}
        onCommissionShip={handleCommission}
      />
    );

    // Vanguard Recon Skiff is owned
    expect(screen.getByRole('button', { name: /CURRENTLY OWNED/i })).toBeInTheDocument();

    // Kusaragi costs 850, player only has 500 -> Insufficient Credits
    expect(screen.getByText(/Insufficient Credits \(₡850\)/i)).toBeInTheDocument();
  });

  it('allows purchasing a hull if player has sufficient credits', () => {
    const handleCommission = vi.fn();
    render(
      <NavalShipyard
        player={{ credits: 2000 }}
        activeShip={null}
        onCommissionShip={handleCommission}
      />
    );

    // Can afford Vanguard (costs ₡350)
    const commissionVanguardBtn = screen.getByRole('button', { name: /Commission Ship \(₡350\)/i });
    expect(commissionVanguardBtn).not.toBeDisabled();

    fireEvent.click(commissionVanguardBtn);
    expect(handleCommission).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ship_vanguard_scout' })
    );

    // Success banner displays
    expect(screen.getByText(/Ship commissioned successfully/i)).toBeInTheDocument();
  });
});

describe('ShipAssignmentModal Component (DM Starship Deployment)', () => {
  it('allows DM to select a hull, enter a custom callsign, and deploy to operative', async () => {
    const handleClose = vi.fn();
    const handleAssigned = vi.fn();

    render(
      <ShipAssignmentModal
        player={{ id: 'char_42', name: 'Commander Holden' }}
        onClose={handleClose}
        onAssigned={handleAssigned}
      />
    );

    expect(screen.getByText(/Target Operative:/i)).toBeInTheDocument();
    expect(screen.getByText(/Commander Holden/i)).toBeInTheDocument();

    // Select Aegis Heavy Frigate
    const frigateBtn = screen.getByText(/Aegis Heavy Frigate/i).closest('button');
    fireEvent.click(frigateBtn);

    // Change callsign
    const input = screen.getByPlaceholderText(/e\.g\. Kusaragi, Rocinante/i);
    fireEvent.change(input, { target: { value: 'Rocinante' } });

    // Click Deploy
    const deployBtn = screen.getByRole('button', { name: /Deploy Vessel to Operative/i });
    fireEvent.click(deployBtn);

    await waitFor(() => {
      expect(playerActions.assignShipToPlayer).toHaveBeenCalledWith(
        'char_42',
        expect.objectContaining({
          id: 'ship_aegis_frigate',
          name: 'Rocinante',
        })
      );
      expect(handleAssigned).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('allows DM to revoke a starship from an operative with an existing vessel', async () => {
    window.confirm = vi.fn(() => true);
    const handleClose = vi.fn();
    const handleAssigned = vi.fn();

    render(
      <ShipAssignmentModal
        player={{ id: 'char_42', name: 'Commander Holden', ship: { id: 'ship_kusaragi_corvette', name: 'Kusaragi' } }}
        onClose={handleClose}
        onAssigned={handleAssigned}
      />
    );

    const revokeBtn = screen.getByRole('button', { name: /Revoke \/ Decommission Ship/i });
    expect(revokeBtn).toBeInTheDocument();

    fireEvent.click(revokeBtn);

    await waitFor(() => {
      expect(playerActions.removeShipFromPlayer).toHaveBeenCalledWith('char_42');
      expect(handleAssigned).toHaveBeenCalledWith(null);
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
