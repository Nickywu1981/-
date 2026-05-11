import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  phoneSchema,
  emailSchema,
  codeSchema,
  passwordSchema,
  idSchema,
} from '../../utils/validate.js';

describe('validate schemas', () => {
  describe('paginationSchema', () => {
    it('parses valid pagination with defaults', () => {
      const result = paginationSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.sortOrder).toBe('desc');
    });

    it('parses custom page and pageSize', () => {
      const result = paginationSchema.parse({ page: '3', pageSize: '50' });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(50);
    });

    it('coerces string numbers', () => {
      const result = paginationSchema.parse({ page: '5' });
      expect(result.page).toBe(5);
    });

    it('rejects page < 1', () => {
      expect(() => paginationSchema.parse({ page: '0' })).toThrow();
      expect(() => paginationSchema.parse({ page: '-1' })).toThrow();
    });

    it('rejects pageSize > 100', () => {
      expect(() => paginationSchema.parse({ pageSize: '200' })).toThrow();
    });

    it('rejects pageSize < 1', () => {
      expect(() => paginationSchema.parse({ pageSize: '0' })).toThrow();
    });

    it('accepts valid sortOrder asc', () => {
      const result = paginationSchema.parse({ sortOrder: 'asc' });
      expect(result.sortOrder).toBe('asc');
    });

    it('rejects invalid sortOrder', () => {
      expect(() => paginationSchema.parse({ sortOrder: 'random' })).toThrow();
    });
  });

  describe('phoneSchema', () => {
    it('accepts valid Chinese mobile numbers', () => {
      expect(phoneSchema.safeParse('13800138000').success).toBe(true);
      expect(phoneSchema.safeParse('15912345678').success).toBe(true);
      expect(phoneSchema.safeParse('18888888888').success).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(phoneSchema.safeParse('12345678901').success).toBe(false);
      expect(phoneSchema.safeParse('1380013800').success).toBe(false);
      expect(phoneSchema.safeParse('138001380000').success).toBe(false);
      expect(phoneSchema.safeParse('abc').success).toBe(false);
    });

    it('rejects empty string', () => {
      expect(phoneSchema.safeParse('').success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      expect(emailSchema.safeParse('test@example.com').success).toBe(true);
      expect(emailSchema.safeParse('user.name@domain.co').success).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false);
      expect(emailSchema.safeParse('@domain.com').success).toBe(false);
      expect(emailSchema.safeParse('').success).toBe(false);
    });
  });

  describe('codeSchema', () => {
    it('accepts 6-digit codes', () => {
      expect(codeSchema.safeParse('123456').success).toBe(true);
    });

    it('rejects non-6-digit strings', () => {
      expect(codeSchema.safeParse('12345').success).toBe(false);
      expect(codeSchema.safeParse('1234567').success).toBe(false);
      expect(codeSchema.safeParse('abcdef').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts passwords 8-32 chars', () => {
      expect(passwordSchema.safeParse('12345678').success).toBe(true);
      expect(passwordSchema.safeParse('a'.repeat(32)).success).toBe(true);
    });

    it('rejects too short passwords', () => {
      expect(passwordSchema.safeParse('1234567').success).toBe(false);
    });

    it('rejects too long passwords', () => {
      expect(passwordSchema.safeParse('a'.repeat(33)).success).toBe(false);
    });
  });

  describe('idSchema', () => {
    it('accepts positive integers', () => {
      expect(idSchema.safeParse('1').success).toBe(true);
      expect(idSchema.safeParse(42).success).toBe(true);
    });

    it('rejects zero and negative', () => {
      expect(idSchema.safeParse('0').success).toBe(false);
      expect(idSchema.safeParse('-1').success).toBe(false);
    });

    it('rejects non-numeric strings', () => {
      expect(idSchema.safeParse('abc').success).toBe(false);
    });
  });
});
