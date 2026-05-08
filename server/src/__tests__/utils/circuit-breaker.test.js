import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '../../utils/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 60000 });
  });

  describe('initial state', () => {
    it('starts in closed state', () => {
      expect(breaker.getState()).toBe('closed');
    });

    it('starts with zero failure count', () => {
      expect(breaker.failureCount).toBe(0);
    });

    it('is available initially', () => {
      expect(breaker.isAvailable()).toBe(true);
    });
  });

  describe('defaults', () => {
    it('uses default failureThreshold of 5', () => {
      const b = new CircuitBreaker();
      expect(b.failureThreshold).toBe(5);
    });

    it('uses default cooldownMs of 60000', () => {
      const b = new CircuitBreaker();
      expect(b.cooldownMs).toBe(60000);
    });
  });

  describe('recordFailure', () => {
    it('increments failure count', () => {
      breaker.recordFailure();
      expect(breaker.failureCount).toBe(1);
    });

    it('opens circuit when failure count reaches threshold', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');
    });

    it('does not open circuit below threshold', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('closed');
    });
  });

  describe('recordSuccess', () => {
    it('resets failure count to zero', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();
      expect(breaker.failureCount).toBe(0);
    });

    it('transitions back to closed', () => {
      breaker.recordFailure();
      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
    });
  });

  describe('isAvailable', () => {
    it('returns true when closed', () => {
      expect(breaker.isAvailable()).toBe(true);
    });

    it('returns false when open within cooldown', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.isAvailable()).toBe(false);
    });

    it('returns true when cooldown expires (half-open)', () => {
      vi.useFakeTimers();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');

      vi.advanceTimersByTime(60001);
      expect(breaker.isAvailable()).toBe(true);
      expect(breaker.getState()).toBe('half-open');
      vi.useRealTimers();
    });

    it('returns false if still in cooldown', () => {
      vi.useFakeTimers();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();

      vi.advanceTimersByTime(30000);
      expect(breaker.isAvailable()).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('state transitions', () => {
    it('closed -> open on threshold failures', () => {
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      expect(breaker.getState()).toBe('open');
    });

    it('open -> half-open after cooldown', () => {
      vi.useFakeTimers();
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      expect(breaker.getState()).toBe('open');

      vi.advanceTimersByTime(60001);
      breaker.isAvailable();
      expect(breaker.getState()).toBe('half-open');
      vi.useRealTimers();
    });

    it('half-open -> closed on success', () => {
      vi.useFakeTimers();
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      vi.advanceTimersByTime(60001);
      breaker.isAvailable();
      expect(breaker.getState()).toBe('half-open');

      breaker.recordSuccess();
      expect(breaker.getState()).toBe('closed');
      vi.useRealTimers();
    });

    it('half-open -> open on failure', () => {
      vi.useFakeTimers();
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      vi.advanceTimersByTime(60001);
      breaker.isAvailable();
      expect(breaker.getState()).toBe('half-open');

      breaker.recordFailure();
      expect(breaker.getState()).toBe('open');
      vi.useRealTimers();
    });

    it('stays available in half-open for one probe', () => {
      vi.useFakeTimers();
      for (let i = 0; i < 3; i++) breaker.recordFailure();
      vi.advanceTimersByTime(60001);
      expect(breaker.isAvailable()).toBe(true);

      // After first probe in half-open, subsequent calls also return true
      expect(breaker.isAvailable()).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('custom configuration', () => {
    it('respects custom failureThreshold', () => {
      const b = new CircuitBreaker({ failureThreshold: 10 });
      for (let i = 0; i < 9; i++) b.recordFailure();
      expect(b.getState()).toBe('closed');
      b.recordFailure();
      expect(b.getState()).toBe('open');
    });

    it('respects custom cooldownMs', () => {
      vi.useFakeTimers();
      const b = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 30000 });
      b.recordFailure();
      b.recordFailure();
      expect(b.getState()).toBe('open');

      vi.advanceTimersByTime(29000);
      expect(b.isAvailable()).toBe(false);

      vi.advanceTimersByTime(1001);
      expect(b.isAvailable()).toBe(true);
      vi.useRealTimers();
    });
  });

  describe('getState', () => {
    it('returns closed, open, or half-open', () => {
      expect(['closed', 'open', 'half-open']).toContain(breaker.getState());
    });
  });
});
