import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../utils/crypto.js';

describe('crypto', () => {
  describe('encrypt', () => {
    it('returns a string for non-empty input', () => {
      const result = encrypt('hello world');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns empty string for empty input', () => {
      expect(encrypt('')).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(encrypt(null)).toBe('');
      expect(encrypt(undefined)).toBe('');
    });

    it('produces different ciphertexts for same plaintext (random IV)', () => {
      const a = encrypt('same text');
      const b = encrypt('same text');
      expect(a).not.toBe(b);
    });

    it('uses iv:authTag:ciphertext format', () => {
      const result = encrypt('test');
      const parts = result.split(':');
      expect(parts.length).toBe(3);
    });

    it('produces hex-encoded components', () => {
      const result = encrypt('test');
      const parts = result.split(':');
      for (const p of parts) {
        expect(/^[0-9a-f]+$/i.test(p)).toBe(true);
      }
    });
  });

  describe('decrypt', () => {
    it('decrypts encrypted text back to original', () => {
      const original = 'hello world';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('handles unicode text roundtrip', () => {
      const original = '你好世界 🌍 こんにちは';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('handles long text roundtrip', () => {
      const original = 'a'.repeat(10000);
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('returns empty string for empty input', () => {
      expect(decrypt('')).toBe('');
    });

    it('returns empty string for null/undefined', () => {
      expect(decrypt(null)).toBe('');
      expect(decrypt(undefined)).toBe('');
    });

    it('returns original for non-encrypted format (backward compat)', () => {
      expect(decrypt('plaintext')).toBe('plaintext');
    });

    it('returns original for old format without colons', () => {
      expect(decrypt('just-a-string')).toBe('just-a-string');
    });
  });

  describe('roundtrip edge cases', () => {
    it('handles JSON string', () => {
      const json = JSON.stringify({ user: 'test', id: 123, active: true });
      expect(decrypt(encrypt(json))).toBe(json);
    });

    it('handles special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      expect(decrypt(encrypt(text))).toBe(text);
    });

    it('handles whitespace only', () => {
      expect(decrypt(encrypt('   '))).toBe('   ');
    });

    it('handles single character', () => {
      expect(decrypt(encrypt('a'))).toBe('a');
    });
  });
});
