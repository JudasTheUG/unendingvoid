import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateEmail,
  validateUsername,
  normalizeUsernameToEmail,
  extractUsername,
  getLocalAccounts,
  saveLocalAccount,
  setActiveSession,
  clearActiveSession,
  isUsernameAvailable,
  registerWithCredentials,
  signInEmail,
  loginLocalGuest,
  logout,
  STORAGE_ACTIVE_USER,
} from '../authService';

describe('authService - Registration Validation & Uniqueness Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Email & Username Format Validation', () => {
    it('should validate proper email formats correctly', () => {
      expect(validateEmail('pilot@void.net')).toBe(true);
      expect(validateEmail('operative.strike-1@galaxy.org')).toBe(true);
      expect(validateEmail('commander@sub.domain.co.uk')).toBe(true);

      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('pilot@')).toBe(false);
      expect(validateEmail('@void.net')).toBe(false);
      expect(validateEmail('pilot@void')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should validate username constraints (3-20 chars, alphanumeric, _ and -)', () => {
      expect(validateUsername('void_pilot')).toBe(true);
      expect(validateUsername('Judas-99')).toBe(true);
      expect(validateUsername('operative123')).toBe(true);

      expect(validateUsername('ab')).toBe(false); // Too short
      expect(validateUsername('a'.repeat(25))).toBe(false); // Too long
      expect(validateUsername('pilot space')).toBe(false); // Spaces not allowed
      expect(validateUsername('pilot@net')).toBe(false); // @ not allowed in username
      expect(validateUsername('')).toBe(false);
    });
  });

  describe('Username Uniqueness Control', () => {
    it('should report available for new usernames', async () => {
      const available = await isUsernameAvailable('fresh_operative');
      expect(available).toBe(true);
    });

    it('should detect when a username is already taken locally', async () => {
      saveLocalAccount({
        uid: 'local_1',
        username: 'existing_hero',
        email: 'hero@void.net',
        password: 'password123',
      });

      const available = await isUsernameAvailable('existing_hero');
      expect(available).toBe(false);
    });
  });

  describe('Full Registration with Credentials', () => {
    it('should reject registration with invalid email', async () => {
      await expect(
        registerWithCredentials({
          username: 'cyber_runner',
          email: 'invalid-email-address',
          password: 'password123',
          displayName: 'Cyber Runner',
        })
      ).rejects.toThrow('INVALID_EMAIL');
    });

    it('should reject registration with invalid username format', async () => {
      await expect(
        registerWithCredentials({
          username: 'ab', // too short
          email: 'pilot@void.net',
          password: 'password123',
        })
      ).rejects.toThrow('INVALID_USERNAME_FORMAT');
    });

    it('should reject registration with password shorter than 6 characters', async () => {
      await expect(
        registerWithCredentials({
          username: 'cyber_runner',
          email: 'runner@void.net',
          password: '123',
        })
      ).rejects.toThrow('PASSWORD_TOO_SHORT');
    });

    it('should reject registration if username is already taken', async () => {
      saveLocalAccount({
        uid: 'local_taken',
        username: 'taken_user',
        email: 'original@void.net',
        password: 'password123',
      });

      await expect(
        registerWithCredentials({
          username: 'taken_user',
          email: 'different@void.net',
          password: 'password123',
        })
      ).rejects.toThrow('USERNAME_TAKEN');
    });

    it('should successfully register valid credentials and create session', async () => {
      const res = await registerWithCredentials({
        username: 'star_scout',
        email: 'scout@deepvoid.net',
        password: 'securePassword99',
        displayName: 'Star Scout Commander',
      });

      expect(res.user).toBeDefined();
      expect(res.user.username).toBe('star_scout');
      expect(res.user.email).toBe('scout@deepvoid.net');
      expect(res.user.displayName).toBe('Star Scout Commander');

      // Verify active session saved
      const active = JSON.parse(localStorage.getItem(STORAGE_ACTIVE_USER));
      expect(active.username).toBe('star_scout');
      expect(active.email).toBe('scout@deepvoid.net');
    });
  });

  describe('Login via Username or Email', () => {
    it('should authenticate with username matching local account', async () => {
      saveLocalAccount({
        uid: 'local_valkyrie',
        username: 'valkyrie',
        email: 'valk@valhalla.space',
        password: 'valk_password_123',
        displayName: 'Valkyrie One',
      });

      const res = await signInEmail('valkyrie', 'valk_password_123');
      expect(res.user.uid).toBe('local_valkyrie');
      expect(res.user.username).toBe('valkyrie');
      expect(res.user.displayName).toBe('Valkyrie One');
    });

    it('should authenticate with email matching local account', async () => {
      saveLocalAccount({
        uid: 'local_spectre',
        username: 'spectre',
        email: 'spectre@shadow.net',
        password: 'ghost_protocol',
      });

      const res = await signInEmail('spectre@shadow.net', 'ghost_protocol');
      expect(res.user.uid).toBe('local_spectre');
      expect(res.user.username).toBe('spectre');
    });

    it('should reject wrong password', async () => {
      saveLocalAccount({
        uid: 'local_guard',
        username: 'station_guard',
        password: 'vault_code_999',
      });

      await expect(signInEmail('station_guard', 'wrong_code')).rejects.toThrow('INVALID_PASSWORD');
    });
  });

  describe('Session Management & Guest Access', () => {
    it('should login as a local guest without credentials', async () => {
      const res = await loginLocalGuest('Guest Pilot');
      expect(res.user.displayName).toBe('Guest Pilot');
      expect(res.user.isLocal).toBe(true);
    });

    it('should clear session upon logout', async () => {
      setActiveSession({ uid: 'test_u', username: 'temp' });
      expect(localStorage.getItem(STORAGE_ACTIVE_USER)).toBeTruthy();

      await logout();
      expect(localStorage.getItem(STORAGE_ACTIVE_USER)).toBeNull();
    });
  });
});
