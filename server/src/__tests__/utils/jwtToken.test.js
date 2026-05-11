import { describe, it, expect, vi, beforeAll } from 'vitest';
vi.mock('../../config/index.js', () => ({
  jwtConfig: { secret: 'test-secret-key-unit-test', accessExpiresIn: '15m', refreshExpiresIn: '7d' },
  jwtRefreshSecret: 'test-refresh-secret',
  isDevelopment: true,
  logConfig: { level: 'info', sampleRate: 1.0, slowQueryMs: 1000 },
}));

let generateTokens, verifyAccessToken, JWT_CONFIG, revokeAccessToken, isTokenBlacklisted;

beforeAll(async () => {
  const mod = await import('../../utils/jwtToken.js');
  generateTokens = mod.generateTokens;
  verifyAccessToken = mod.verifyAccessToken;
  JWT_CONFIG = mod.JWT_CONFIG;
  revokeAccessToken = mod.revokeAccessToken;
  isTokenBlacklisted = mod.isTokenBlacklisted;
});

describe('JWT_CONFIG', () => {
  it('定义了 accessExpires 和 refreshExpires', () => {
    expect(JWT_CONFIG).toHaveProperty('accessExpires');
    expect(JWT_CONFIG).toHaveProperty('refreshExpires');
  });
});

describe('generateTokens', () => {
  it('返回 accessToken/refreshToken/expiresIn 三个字段', () => {
    const tokens = generateTokens({ id: 1, username: 'testuser', role: 'admin', tenantId: 100 });
    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(tokens).toHaveProperty('expiresIn');
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
    expect(tokens.expiresIn).toBe(900);
  });

  it('两个 token 不相同', () => {
    const tokens = generateTokens({ id: 1, username: 'testuser' });
    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
  });

  it('refresh token 因 jti UUID 每次不同，access token 同秒同 payload 可相同', () => {
    const t1 = generateTokens({ id: 1, username: 'a' });
    const t2 = generateTokens({ id: 1, username: 'a' });
    expect(t1.refreshToken).not.toBe(t2.refreshToken); // jti 保证唯一
  });

  it('缺 role 和 tenantId 时使用默认值', () => {
    const tokens = generateTokens({ id: 2, username: 'b' });
    const decoded = verifyAccessToken(tokens.accessToken);
    expect(decoded.role).toBe('user');
    expect(decoded.tenantId).toBe(0);
  });
});

describe('verifyAccessToken', () => {
  it('能验证刚签发的有效 token', () => {
    const { accessToken } = generateTokens({ id: 1, username: 'verify', role: 'vip' });
    const decoded = verifyAccessToken(accessToken);
    expect(decoded.id).toBe(1);
    expect(decoded.username).toBe('verify');
    expect(decoded.role).toBe('vip');
  });

  it('篡改过的 token 验证失败', () => {
    const { accessToken } = generateTokens({ id: 1, username: 'x' });
    const tampered = accessToken.slice(0, -5) + 'xxxxx';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('空字符串抛出错误', () => {
    expect(() => verifyAccessToken('')).toThrow();
  });

  it('随机字符串抛出错误', () => {
    expect(() => verifyAccessToken('not.a.valid.jwt.token')).toThrow();
  });
});

describe('isTokenBlacklisted', () => {
  it('Redis 离线时返回 false（不阻塞正常请求）', async () => {
    const result = await isTokenBlacklisted('any-token');
    expect(result).toBe(false);
  });
});

describe('revokeAccessToken', () => {
  it('Redis 离线时不抛错误', async () => {
    await expect(revokeAccessToken('any-token')).resolves.toBeUndefined();
  });

  it('无效 token 不抛错误', async () => {
    await expect(revokeAccessToken('invalid')).resolves.toBeUndefined();
  });
});

describe('签发→验证完整循环', () => {
  it('access token 内包含全部用户字段', () => {
    const user = { id: 42, username: 'full', role: 'editor', tenantId: 7 };
    const { accessToken } = generateTokens(user);
    const decoded = verifyAccessToken(accessToken);
    expect(decoded.id).toBe(user.id);
    expect(decoded.username).toBe(user.username);
    expect(decoded.role).toBe(user.role);
    expect(decoded.tenantId).toBe(user.tenantId);
  });

  it('access token 有 iat 和 exp 时间戳', () => {
    const { accessToken } = generateTokens({ id: 1, username: 't' });
    const decoded = verifyAccessToken(accessToken);
    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });
});
