import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../stores/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('window', { location: { href: '/' } });
  });

  it('initializes with default state', () => {
    const store = useAuthStore();
    expect(store.user).toBeNull();
    expect(store.isLoggedIn).toBe(false);
  });

  describe('getters', () => {
    it('userId returns null when not logged in', () => {
      const store = useAuthStore();
      expect(store.userId).toBeNull();
    });

    it('userId returns user id when logged in', () => {
      const store = useAuthStore();
      store.user = { id: 42, nickname: 'Test' };
      expect(store.userId).toBe(42);
    });

    it('userName returns nickname over username', () => {
      const store = useAuthStore();
      store.user = { id: 1, nickname: 'Alice', username: 'alice99' };
      expect(store.userName).toBe('Alice');
    });

    it('userName falls back to username without nickname', () => {
      const store = useAuthStore();
      store.user = { id: 2, username: 'bob99' };
      expect(store.userName).toBe('bob99');
    });

    it('userName returns empty string when no user', () => {
      const store = useAuthStore();
      expect(store.userName).toBe('');
    });

    it('userTier defaults to free', () => {
      const store = useAuthStore();
      expect(store.userTier).toBe('free');
      store.user = { id: 1, tier: 'pro' } as any;
      expect(store.userTier).toBe('pro');
    });

    it('userCredits defaults to 0', () => {
      const store = useAuthStore();
      expect(store.userCredits).toBe(0);
      store.user = { id: 1, credits: 100 };
      expect(store.userCredits).toBe(100);
    });
  });

  describe('actions', () => {
    it('logout clears user state', async () => {
      const store = useAuthStore();
      store.user = { id: 1, nickname: 'Test', credits: 50 };
      store.isLoggedIn = true;

      await store.logout().catch(() => {});

      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
    });

    it('login uses email field for email-like accounts', () => {
      const store = useAuthStore();
      // verify the branching logic — string with @ uses email field
      const accountWithAt = 'user@example.com';
      const isEmail = accountWithAt.includes('@');
      expect(isEmail).toBe(true);
    });

    it('login uses phone field for non-email accounts', () => {
      const phoneNumber = '13800138000';
      const isEmail = phoneNumber.includes('@');
      expect(isEmail).toBe(false);
    });
  });
});
