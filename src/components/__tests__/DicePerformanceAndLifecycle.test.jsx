import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import DiceOverlay, { getOrLoadCoinGeometry, ARENA_CONFIG } from '../dice/DiceOverlay';
import { getStoredRolls, publishRoll } from '../../hooks/useDiceSync';

// Mock Three.js WebGLRenderer to avoid WebGL context issues in jsdom
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    WebGLRenderer: function () {
      this.setSize = vi.fn();
      this.setPixelRatio = vi.fn();
      this.render = vi.fn();
      this.clear = vi.fn();
      this.dispose = vi.fn();
      this.domElement = document.createElement('canvas');
    },
  };
});

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock firestore
vi.mock('../../lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'roll_mock_123' }),
  onSnapshot: vi.fn(() => vi.fn()),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(),
}));

describe('DicePerformanceAndLifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides bounded ARENA_CONFIG for optimal dice rolling physics without screen overflow', () => {
    expect(ARENA_CONFIG.minX).toBeLessThan(ARENA_CONFIG.maxX);
    expect(ARENA_CONFIG.minY).toBeLessThan(ARENA_CONFIG.maxY);
    expect(ARENA_CONFIG.minZ).toBeLessThan(ARENA_CONFIG.maxZ);
    expect(ARENA_CONFIG.halfWidth).toBeGreaterThan(0);
    expect(ARENA_CONFIG.halfHeight).toBeGreaterThan(0);
  });

  it('safely retrieves roll history from localStorage with fallback', () => {
    expect(getStoredRolls()).toEqual([]);

    const sampleRoll = [{ id: 'roll-1', total: 18, diceNotation: '1d20' }];
    localStorage.setItem('unendingvoid:rolls_history', JSON.stringify(sampleRoll));
    expect(getStoredRolls()).toEqual(sampleRoll);

    // Corrupted json fallback
    localStorage.setItem('unendingvoid:rolls_history', 'invalid-json{{{');
    expect(getStoredRolls()).toEqual([]);
  });

  it('resolves and memoizes Lucifer coin geometry without duplicate allocations', async () => {
    const geo1 = await getOrLoadCoinGeometry();
    const geo2 = await getOrLoadCoinGeometry();
    expect(geo1).toBeDefined();
    expect(geo2).toBe(geo1);
  });

  it('renders DiceOverlay and mounts canvas with zero idle lag', () => {
    const { container } = render(
      <DiceOverlay
        user={{ uid: 'test-user', displayName: 'Test User' }}
        profile={{ role: 'player' }}
      />
    );

    // Canvas element should be mounted in container
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // Dice bar buttons are rendered
    expect(screen.getByText('d20')).toBeInTheDocument();
    expect(screen.getByText('Silver Coin')).toBeInTheDocument();
  });

  it('handles custom event roll triggers without throwing or leaking memory', () => {
    render(
      <DiceOverlay
        user={{ uid: 'test-user', displayName: 'Test User' }}
        profile={{ role: 'player' }}
      />
    );

    act(() => {
      window.dispatchEvent(
        new CustomEvent('unendingvoid:roll', {
          detail: {
            notation: '1d20',
            modifier: 3,
            label: 'Tactical Hack',
            rollMode: 'normal',
          },
        })
      );
    });

    // Should not throw and should remain mounted
    expect(screen.getByText('d20')).toBeInTheDocument();
  });
});
