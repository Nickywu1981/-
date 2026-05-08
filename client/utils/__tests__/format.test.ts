import { describe, it, expect } from 'vitest';
import { formatFileSize, formatCurrency, formatDate, formatDateTime, formatDuration, isToday, isThisWeek, truncate, formatPlatformName, isValidImageFile, formatRelative } from '../format';

describe('formatFileSize', () => {
  it('returns 0 B for zero/negative', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(-1)).toBe('0 B');
  });
  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(1073741824)).toBe('1.0 GB');
  });
});

describe('formatCurrency', () => {
  it('formats cents to yuan', () => {
    expect(formatCurrency(0)).toBe('¥0.00');
    expect(formatCurrency(9900)).toBe('¥99.00');
    expect(formatCurrency(100)).toBe('¥1.00');
  });
});

describe('formatDate', () => {
  it('formats ISO date string', () => {
    expect(formatDate('2026-05-07T10:30:00Z')).toBe('2026-05-07');
  });
  it('returns empty for falsy input', () => {
    expect(formatDate('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('formats ISO datetime string', () => {
    const result = formatDateTime('2026-05-07T10:30:00Z');
    expect(result).toContain('2026-05-07');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(30)).toBe('30秒');
    expect(formatDuration(90)).toBe('1分30秒');
    expect(formatDuration(3661)).toBe('1时1分');
  });
});

describe('isToday', () => {
  it('detects today', () => {
    expect(isToday(new Date().toISOString())).toBe(true);
  });
  it('detects not today', () => {
    expect(isToday('2020-01-01T00:00:00Z')).toBe(false);
  });
});

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });
  it('keeps short strings', () => {
    expect(truncate('Hi', 5)).toBe('Hi');
  });
  it('handles empty', () => {
    expect(truncate('', 5)).toBe('');
    expect(truncate(null as any, 5)).toBe('');
  });
});
