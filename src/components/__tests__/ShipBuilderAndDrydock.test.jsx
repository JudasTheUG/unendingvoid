import React from 'react';
import '../../lib/i18n';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShipBuilder from '../player/ShipBuilder';
import SpaceshipSheet from '../player/SpaceshipSheet';
import { shipModulesCatalog } from '../../lib/shipModulesCatalog';

describe('ShipBuilder Component (Cyberpunk x The Expanse Drydock UI)', () => {
  it('renders drydock header and all modular bay slots', () => {
    render(<ShipBuilder activeShip={null} inventoryItems={[]} onAssemble={vi.fn()} />);

    // Header and station designation
    expect(screen.getByText(/TYCHO NAVAL SHIPYARD \/\/ BAY 04/i)).toBeInTheDocument();
    expect(screen.getByText(/MCRN Tycho Drydock/i)).toBeInTheDocument();

    // Default setup should be flight certified
    expect(screen.getByText(/FLIGHT CERTIFIED/i)).toBeInTheDocument();

    // Bay cards
    expect(screen.getByText(/BAY-01/i)).toBeInTheDocument();
    expect(screen.getByText(/BAY-03/i)).toBeInTheDocument();
    expect(screen.getByText(/Flight Diagnostics/i)).toBeInTheDocument();
  });

  it('opens module selector drawer when clicking a hardpoint bay', () => {
    render(<ShipBuilder activeShip={null} inventoryItems={[]} onAssemble={vi.fn()} />);

    const bay1Button = screen.getByText(/BAY-01/i).closest('button');
    fireEvent.click(bay1Button);

    // Module rack should open with available hulls
    expect(screen.getByText(/Available Modules:/i)).toBeInTheDocument();
    expect(screen.getByText(/CLOSE BAY/i)).toBeInTheDocument();
    expect(screen.getByText(/Aegis Heavy Frigate Frame/i)).toBeInTheDocument();
  });

  it('requires E.E.Sys membership when ordering unowned modular components', () => {
    const handleAssemble = vi.fn();
    // Default valid Strike Corvette
    const activeShip = {
      modules: {
        hull: 'hull_corvette_class_b',
        flightDeck: 'cockpit_tactical',
        thrusterEngines: 'eng_plasma_heavy',
        warpDrive: 'warp_class_3',
        cargoBay: 'cargo_light_40',
        fuelTanks: 'fuel_pressurized_180',
        scanner: 'scan_radar_mk1',
        landingSystems: 'gear_heavy_pistons',
        weapon1: 'wpn_none',
        weapon2: 'wpn_none',
        weapon3: 'wpn_none',
      },
    };

    const { rerender } = render(
      <ShipBuilder
        activeShip={activeShip}
        inventoryItems={[]} // No E.E.Sys membership
        onAssemble={handleAssemble}
      />
    );

    // Open Bay 9 (Weapon 1)
    const bay9Button = screen.getByText(/BAY-09/i).closest('button');
    fireEvent.click(bay9Button);

    // Click Twin Gauss Railguns (costs ₡500)
    const railgunOption = screen.getByText(/Twin Gauss Railguns/i).closest('div');
    fireEvent.click(railgunOption);

    // Order Parts button should appear with credit cost and be disabled without membership
    expect(screen.getByText(/Order Parts via E\.E\.Sys/i)).toBeInTheDocument();
    expect(screen.getByText(/Requires Equivalent Exchange Membership/i)).toBeInTheDocument();

    // Now re-render with E.E.Sys membership
    rerender(
      <ShipBuilder
        activeShip={activeShip}
        inventoryItems={[{ id: 'item_ee_membership', name: 'E.E.Sys Interstellar License' }]}
        onAssemble={handleAssemble}
      />
    );

    const orderButton = screen.getByText(/Order Parts via E\.E\.Sys/i);
    expect(orderButton).not.toBeDisabled();
    fireEvent.click(orderButton);
    expect(handleAssemble).toHaveBeenCalled();
  });

  it('renders reactor and shield generator bays and allows unmounting optional components', () => {
    render(<ShipBuilder activeShip={null} inventoryItems={[]} onAssemble={vi.fn()} />);

    // Check that BAY-12 (Reactor) and BAY-13 (Shield Generator) are rendered
    expect(screen.getByText(/BAY-12/i)).toBeInTheDocument();
    expect(screen.getByText(/Main Power Reactor/i)).toBeInTheDocument();
    expect(screen.getByText(/BAY-13/i)).toBeInTheDocument();
    expect(screen.getByText(/Deflector Shield Generator/i)).toBeInTheDocument();

    // Open BAY-13 (Shield Generator)
    const bay13Button = screen.getByText(/BAY-13/i).closest('button');
    fireEvent.click(bay13Button);

    // Unmount button should be visible in drawer
    const unmountButton = screen.getByRole('button', { name: /Unmount \/ Empty Bay/i });
    expect(unmountButton).toBeInTheDocument();

    // Click Unmount
    fireEvent.click(unmountButton);

    // After unmounting, the drawer closes and BAY-13 shows Empty Bay
    expect(bay13Button).toHaveTextContent(/Empty Bay/i);
  });
});

describe('SpaceshipSheet Mode Switching & Naval Shipyard', () => {
  it('switches between Tactical Flight Deck, Drydock Modifier, and Naval Shipyard views', () => {
    render(<SpaceshipSheet />);

    // Initially in Flight Deck view
    expect(screen.getByText(/Vessel Weapon Batteries & Ordnance/i)).toBeInTheDocument();

    // Switch to Drydock Modifier
    const drydockTab = screen.getByRole('button', { name: /Drydock Ship Modifier/i });
    fireEvent.click(drydockTab);

    expect(screen.getByText(/TYCHO NAVAL SHIPYARD \/\/ BAY 04/i)).toBeInTheDocument();

    // Switch to Naval Shipyard
    const shipyardTab = screen.getByRole('button', { name: /Naval Shipyard/i });
    fireEvent.click(shipyardTab);

    expect(screen.getByText(/Commissioning Berth/i)).toBeInTheDocument();
    expect(screen.getByText(/Vanguard Recon Skiff/i)).toBeInTheDocument();

    // Switch back to Flight Deck
    const flightDeckTab = screen.getByRole('button', { name: /Tactical Flight Deck/i });
    fireEvent.click(flightDeckTab);

    expect(screen.getByText(/Vessel Weapon Batteries & Ordnance/i)).toBeInTheDocument();
  });

  it('renders Naval Shipyard when player owns no ship (ship=null) and allows commissioning', () => {
    const handleUpdateShip = vi.fn();
    const handleUpdateCredits = vi.fn();

    render(
      <SpaceshipSheet
        ship={null}
        player={{ credits: 1000 }}
        onUpdateShip={handleUpdateShip}
        onUpdateCredits={handleUpdateCredits}
      />
    );

    // Should default to Naval Shipyard view when unowned
    expect(screen.getByText(/Commissioning Berth/i)).toBeInTheDocument();
    expect(screen.getByText(/Available Balance/i)).toBeInTheDocument();

    // Commission button for Vanguard Recon Skiff (costs ₡350, player has ₡1000)
    const commissionButtons = screen.getAllByRole('button', { name: /Commission Ship/i });
    expect(commissionButtons.length).toBeGreaterThan(0);

    fireEvent.click(commissionButtons[0]);

    // Should call callbacks and switch to flight deck
    expect(handleUpdateCredits).toHaveBeenCalledWith(650);
    expect(handleUpdateShip).toHaveBeenCalled();
  });

  it('shows unassigned notices on Flight Deck and Drydock when player owns no ship', () => {
    render(<SpaceshipSheet ship={null} player={{ credits: 100 }} />);

    // Go to Flight Deck
    const flightDeckTab = screen.getByText(/Tactical Flight Deck/i);
    fireEvent.click(flightDeckTab);
    expect(screen.getByText(/No Starship Assigned/i)).toBeInTheDocument();
    expect(screen.getByText(/Flight deck offline/i)).toBeInTheDocument();

    // Go to Drydock Modifier
    const drydockTab = screen.getByText(/Drydock Ship Modifier/i);
    fireEvent.click(drydockTab);
    expect(screen.getByText(/Drydock berth empty/i)).toBeInTheDocument();
    expect(screen.getByText(/You cannot fabricate a starship from scratch/i)).toBeInTheDocument();
  });
});

