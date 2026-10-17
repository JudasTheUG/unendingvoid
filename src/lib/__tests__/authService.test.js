import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  normalizeUsernameToEmail,
  extractUsername,
  getLocalAccounts,
  saveLocalAccount,
  setActiveSession,
  clearActiveSession,
  signInEmail,
  registerEmail,
  loginLocalGuest,
  logout,
  STORAGE_ACTIVE_USER,
  STORAGE_LOCAL_ACCOUNTS,
} from '../authService';

describe('authService - Username and Local Authentication Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Username and Email Normalization', () => {
    it('should convert raw username into internal email format', () => {
      expect(normalizeUsernameToEmail('commander')).toBe('commander@unendingvoid.local');
      expect(normalizeUsernameToEmail('JudasTheUG')).toBe('judastheug@unendingvoid.local');
      expect(normalizeUsernameToEmail('void_pilot.99')).toBe('void_pilot.99@unendingvoid.local');
    });

    it('should preserve standard emails as lowercase', () => {
      expect(normalizeUsernameToEmail('pilot@void.net')).toBe('pilot@void.net');
      expect(normalizeUsernameToEmail('COMMANDER@STARFLEET.COM')).toBe('commander@starfleet.com');
    });

    it('should extract usernames properly from identifiers', () => {
      expect(extractUsername('operative_01')).toBe('operative_01');
      expect(extractUsername('cyber_samurai@domain.org')).toBe('cyber_samurai');
      expect(extractUsername('')).toBe('Operative');
    });
  });

  describe('Local Account Storage and Matching', () => {
    it('should save and retrieve local accounts from localStorage', () => {
      const account = {
        uid: 'local_test_1',
        username: 'cyberpunk_runner',
        displayName: 'Cyberpunk Runner',
        email: 'cyberpunk_runner@unendingvoid.local',
        password: 'password123',
      };

      saveLocalAccount(account);
      const accounts = getLocalAccounts();
      expect(accounts['cyberpunk_runner']).toBeDefined();
      expect(accounts['cyberpunk_runner'].displayName).toBe('Cyberpunk Runner');
    });

    it('should set and clear active user session', () => {
      const user = { uid: 'u123', displayName: 'Pilot Test' };
      const profile = { hp: 100, maxHp: 100 };

      setActiveSession(user, profile);
      expect(JSON.parse(localStorage.getItem(STORAGE_ACTIVE_USER))).toEqual(user);

      clearActiveSession();
      expect(localStorage.getItem(STORAGE_ACTIVE_USER)).toBeNull();
    });

    it('should authenticate locally registered accounts with matching password', async () => {
      // Seed a local account
      saveLocalAccount({
        uid: 'local_operative_9',
        username: 'operative_9',
        displayName: 'Operative Nine',
        email: 'operative_9@unendingvoid.local',
        password: 'vault_password',
      });

      const res = await signInEmail('operative_9', 'vault_password');
      expect(res.user.uid).toBe('local_operative_9');
      expect(res.user.username).toBe('operative_9');
      expect(res.isLocal).toBe(true);

      const activeUser = JSON.parse(localStorage.getItem(STORAGE_ACTIVE_USER));
      expect(activeUser.uid).toBe('local_operative_9');
    });

    it('should reject local accounts with incorrect password', async () => {
      saveLocalAccount({
        uid: 'local_operative_10',
        username: 'operative_10',
        password: 'correct_password',
      });

      await expect(signInEmail('operative_10', 'wrong_password')).rejects.toThrow('INVALID_PASSWORD');
    });

    it('should register a fallback local account when offline or cloud fails', async () => {
      const res = await registerEmail('new_explorer', 'securepass123', 'Star Explorer');
      expect(res.user).toBeDefined();
      expect(res.user.username).toBe('new_explorer');
      expect(res.user.displayName).toBe('Star Explorer');

      // Check it was cached in local accounts
      const accounts = getLocalAccounts();
      expect(accounts['new_explorer']).toBeDefined();
      expect(accounts['new_explorer'].password).toBe('securepass123');
    });

    it('should reject registration if local account already exists', async () => {
      saveLocalAccount({
        uid: 'local_existing',
        username: 'existing_user',
        password: 'pass',
      });

      await expect(registerEmail('existing_user', 'newpass', 'Display')).rejects.toThrow('USER_EXISTS');
    });

    it('should support instant one-click local guest login', async () => {
      const res = await loginLocalGuest('Guest Ranger');
      expect(res.user).toBeDefined();
      expect(res.user.displayName).toBe('Guest Ranger');
      expect(res.user.uid).toMatch(/^local_guest_/);
      expect(res.isLocal).toBe(true);

      const storedUser = JSON.parse(localStorage.getItem(STORAGE_ACTIVE_USER));
      expect(storedUser.displayName).toBe('Guest Ranger');
    });

    it('should clear active session on logout', async () => {
      await loginLocalGuest('Temporary Guest');
      expect(localStorage.getItem(STORAGE_ACTIVE_USER)).toBeTruthy();

      await logout();
      expect(localStorage.getItem(STORAGE_ACTIVE_USER)).toBeNull();
    });
  });
});
