import { describe, it, expect, beforeAll } from 'vitest';
import i18n from '../i18n';

describe('i18n integration', () => {
  beforeAll(async () => {
    if (!i18n.isInitialized) {
      await new Promise((resolve) => {
        i18n.on('initialized', resolve);
      });
    }
  });

  it('should initialize with correct resources', () => {
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('tr', 'translation')).toBe(true);
    expect(i18n.hasResourceBundle('nl', 'translation')).toBe(true);
  });

  it('should translate keys correctly in English', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('app.title')).toBe('Unending Void');
    expect(i18n.t('auth.login')).toBe('Sign In');
  });

  it('should translate keys correctly in Turkish', async () => {
    await i18n.changeLanguage('tr');
    expect(i18n.t('app.title')).toBe('Sonsuz Boşluk');
    expect(i18n.t('auth.login')).toBe('Giriş Yap');
  });

  it('should translate keys correctly in Dutch', async () => {
    await i18n.changeLanguage('nl');
    expect(i18n.t('app.title')).toBe('Eindeloze Leegte');
    expect(i18n.t('auth.login')).toBe('Inloggen');
  });

  it('should fallback to English when a language is not found', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('app.title')).toBe('Unending Void');
  });
});
