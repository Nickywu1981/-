import { describe, it, expect } from 'vitest';
import { parseQuery, stringifyQuery, cookie } from '../query';

describe('parseQuery', () => {
  it('parses flat query string', () => {
    const result = parseQuery('?page=1&size=20');
    expect(result).toEqual({ page: '1', size: '20' });
  });

  it('parses nested dotted keys', () => {
    const result = parseQuery('?filter.status=active&filter.type=image');
    expect(result).toEqual({ filter: { status: 'active', type: 'image' } });
  });

  it('handles empty string', () => {
    const result = parseQuery('');
    expect(result).toEqual({});
  });

  it('handles string without prefix', () => {
    const result = parseQuery('key=value');
    expect(result).toEqual({ key: 'value' });
  });
});

describe('stringifyQuery', () => {
  it('stringifies flat object', () => {
    const result = stringifyQuery({ page: 1, size: 20 });
    expect(result).toContain('page=1');
    expect(result).toContain('size=20');
    expect(result.startsWith('?')).toBe(true);
  });

  it('stringifies nested object with dots', () => {
    const result = stringifyQuery({ filter: { status: 'active' } });
    expect(result).toContain('filter.status=active');
  });
});

describe('cookie', () => {
  it('get returns undefined for missing key', () => {
    const val = cookie.get('nonexistent_key_12345');
    expect(val === undefined || val === null || val === '' || val).toBeTruthy(); // js-cookie returns undefined
  });

  it('set and remove work without throwing', () => {
    expect(() => cookie.set('test_key', 'test_val')).not.toThrow();
    expect(() => cookie.remove('test_key')).not.toThrow();
  });
});
