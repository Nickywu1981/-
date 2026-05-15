import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const mockApi = {
  get: vi.fn(() => Promise.resolve({})),
  post: vi.fn(() => Promise.resolve({})),
  put: vi.fn(() => Promise.resolve({})),
  delete: vi.fn(() => Promise.resolve({})),
};

vi.mock('@/composables/useApi', () => ({
  api: mockApi,
}));

import { useAuthStore } from '../../stores/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('window', { location: { href: '/' } });
    mockApi.post.mockReset();
    mockApi.get.mockReset();
    mockApi.post.mockResolvedValue({});
    mockApi.get.mockResolvedValue({});
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

      await store.logout();

      expect(store.user).toBeNull();
      expect(store.isLoggedIn).toBe(false);
    });

    it('login calls API with email field for email-like accounts', async () => {
      const store = useAuthStore();
      mockApi.post.mockResolvedValue({ id: 1, nickname: 'Alice' });

      const result = await store.login('user@example.com', 'password123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { email: 'user@example.com', password: 'password123' });
      expect(result).toEqual({ id: 1, nickname: 'Alice' });
      expect(store.user).toEqual({ id: 1, nickname: 'Alice' });
      expect(store.isLoggedIn).toBe(true);
    });

    it('login calls API with username field for non-email accounts', async () => {
      const store = useAuthStore();
      mockApi.post.mockResolvedValue({ id: 2 });

      await store.login('phoneuser', 'password456');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { username: 'phoneuser', password: 'password456' });
    });
  });
});
