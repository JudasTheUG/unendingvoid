import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import VitalsPanel from '../player/VitalsPanel';
import LanguageSwitcher from '../shared/LanguageSwitcher';
import '../../lib/i18n'; // Need to import i18n to ensure it's initialized for LanguageSwitcher

describe('Accessibility Testing', () => {
  it('VitalsPanel should have no accessibility violations', async () => {
    const { container } = render(
      <VitalsPanel
        hp={50}
        maxHp={100}
        shields={25}
        maxShields={50}
        hpLabel="HP"
        shieldsLabel="Shields"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('LanguageSwitcher should have no accessibility violations', async () => {
    const { container } = render(<LanguageSwitcher />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
