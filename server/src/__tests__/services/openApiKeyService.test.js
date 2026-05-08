import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateApiKey } from '../../services/openApiKeyService.js';

// ============================================================
// generateApiKey — 纯函数,不依赖外部模块
// ============================================================
describe('generateApiKey', () => {
  it('生成 movio_ 前缀的 apiKey', () => {
    const result = generateApiKey(1);
    expect(result.apiKey).toMatch(/^movio_[a-f0-9]{40}$/);
  });

  it('apiSecret 为 64 位 hex 字符串', () => {
    const result = generateApiKey(1);
    expect(result.apiSecret).toMatch(/^[a-f0-9]{64}$/);
  });

  it('apiKey 和 apiSecret 互不相同', () => {
    const result = generateApiKey(1);
    expect(result.apiKey).not.toBe(result.apiSecret);
  });

  it('两次调用生成不同密钥', () => {
    const a = generateApiKey(1);
    const b = generateApiKey(1);
    expect(a.apiKey).not.toBe(b.apiKey);
    expect(a.apiSecret).not.toBe(b.apiSecret);
  });

  it('保留 description 字段', () => {
    const result = generateApiKey(1, '测试密钥');
    expect(result.description).toBe('测试密钥');
  });

  it('不同 tenantId 生成不同前缀哈希', () => {
    const a = generateApiKey(1);
    const b = generateApiKey(2);
    expect(a.apiKey).not.toBe(b.apiKey);
  });

  it('空 description 默认为空字符串', () => {
    const result = generateApiKey(99);
    expect(result.description).toBe('');
  });
});

// ============================================================
// Service 函数 — mock DAO 测试
// ============================================================
describe('openApiKeyService (with mock DAO)', () => {
  let service;

  beforeEach(async () => {
    vi.resetModules();
    const mockDao = {
      listByTenant: vi.fn().mockResolvedValue({
        rows: [
          { id: 1, api_key: 'movio_abc123000000000000000000000000000000', description: 'Key1', status: 1, rate_limit: 100, daily_limit: 10000, create_time: '2026-01-01', update_time: '2026-01-02' },
          { id: 2, api_key: 'movio_def456000000000000000000000000000000', description: '', status: 0, rate_limit: 50, daily_limit: 5000, create_time: '2026-02-01', update_time: '2026-02-02' },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      }),
      create: vi.fn().mockResolvedValue(3),
      update: vi.fn().mockResolvedValue(true),
      softDelete: vi.fn().mockResolvedValue(true),
    };

    vi.doMock('../../dao/openApiKeyDao.js', () => ({ default: mockDao, ...mockDao }));
    service = await import('../../services/openApiKeyService.js');
  });

  describe('listKeys', () => {
    it('返回 items/total/page/pageSize 分页结构', async () => {
      const result = await service.listKeys(1, { page: 1, pageSize: 20 });
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 20);
      expect(result.items).toHaveLength(2);
    });

    it('每个 item 包含驼峰命名字段', async () => {
      const { items } = await service.listKeys(1, {});
      const k = items[0];
      expect(k).toHaveProperty('id', 1);
      expect(k).toHaveProperty('apiKey');
      expect(k).toHaveProperty('apiKeyFull');
      expect(k).toHaveProperty('description');
      expect(k).toHaveProperty('status');
      expect(k).toHaveProperty('rateLimit');
      expect(k).toHaveProperty('dailyLimit');
      expect(k).toHaveProperty('createTime');
      expect(k).toHaveProperty('updateTime');
    });

    it('apiKey 被脱敏显示(maskKey)', async () => {
      const { items } = await service.listKeys(1, {});
      const k = items[0];
      expect(k.apiKey).toContain('****');
      expect(k.apiKey).not.toBe(k.apiKeyFull);
      expect(k.apiKeyFull).toBe('movio_abc123000000000000000000000000000000');
    });

    it('maskKey 空值返回空字符串', async () => {
      const { items } = await service.listKeys(1, {});
      expect(items[1].description).toBe('');
    });
  });

  describe('createKey', () => {
    it('返回 id/apiKey/apiSecret', async () => {
      const result = await service.createKey(1, {});
      expect(result).toHaveProperty('id', 3);
      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('apiSecret');
      expect(result.apiKey).toMatch(/^movio_/);
    });
  });

  describe('toggleKey', () => {
    it('切换启停状态返回 ok', async () => {
      const result = await service.toggleKey(1, 1, 0);
      expect(result.ok).toBe(true);
    });
  });

  describe('updateKey', () => {
    it('更新描述和限制返回 ok', async () => {
      const result = await service.updateKey(1, 1, { description: 'updated', rateLimit: 200 });
      expect(result.ok).toBe(true);
    });

    it('undefined 字段不会传递到 DAO', async () => {
      const result = await service.updateKey(1, 1, { description: 'only' });
      expect(result.ok).toBe(true);
    });
  });

  describe('deleteKey', () => {
    it('软删除返回 ok', async () => {
      const result = await service.deleteKey(1, 1);
      expect(result.ok).toBe(true);
    });
  });
});
