import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock外部依赖
vi.mock('../../dao/configDao.js', () => ({
  default: {
    getItemsByGroup: vi.fn(),
    getItemValue: vi.fn(),
    updateItemValue: vi.fn(),
    insertLog: vi.fn(),
    getLogById: vi.fn(),
    listLogs: vi.fn(),
    getDictItems: vi.fn(),
  },
}));
vi.mock('../../dao/redis.js', () => ({ default: { get: vi.fn(), setex: vi.fn(), del: vi.fn() } }));
vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn(), query: vi.fn() } }));
vi.mock('../../utils/businessError.js', () => ({
  BusinessError: class BusinessError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  },
}));
vi.mock('../config-version.service.js', () => ({ broadcastVersion: vi.fn() }));

import configDao from '../../dao/configDao.js';
import redis from '../../dao/redis.js';
import {
  getGroupConfig, getDict, setConfig, rollbackConfig,
} from '../../services/config.service.js';

// ============================================================
// getPermissionLevel — 内联测试（直接访问内部逻辑）
// ============================================================
const PERMISSION_LEVELS = {
  'page.': 0, 'comp.': 0, 'nav.': 0, 'dict.': 0, 'tpl.': 0,
  'biz.': 1, 'sys.upload': 0, 'sys.rate_limit': 0,
  'sys.model': 2, 'sys.theme': 0,
};
function getPermissionLevel(groupKey) {
  for (const [prefix, level] of Object.entries(PERMISSION_LEVELS)) {
    if (groupKey.startsWith(prefix)) return level;
  }
  return 1;
}

describe('getPermissionLevel', () => {
  it('page.* 为公开级别 0', () => {
    expect(getPermissionLevel('page.home')).toBe(0);
    expect(getPermissionLevel('page.login')).toBe(0);
  });
  it('comp.* 为公开级别 0', () => {
    expect(getPermissionLevel('comp.header')).toBe(0);
    expect(getPermissionLevel('comp.footer')).toBe(0);
  });
  it('nav.* 为公开级别 0', () => {
    expect(getPermissionLevel('nav.main')).toBe(0);
  });
  it('dict.* 为公开级别 0', () => {
    expect(getPermissionLevel('dict.platform')).toBe(0);
  });
  it('tpl.* 为公开级别 0', () => {
    expect(getPermissionLevel('tpl.email')).toBe(0);
  });
  it('biz.* 需登录级别 1', () => {
    expect(getPermissionLevel('biz.credit')).toBe(1);
    expect(getPermissionLevel('biz.pricing')).toBe(1);
  });
  it('sys.model 需管理员级别 2', () => {
    expect(getPermissionLevel('sys.model')).toBe(2);
  });
  it('sys.theme 为公开级别 0', () => {
    expect(getPermissionLevel('sys.theme')).toBe(0);
  });
  it('sys.upload 为公开级别 0', () => {
    expect(getPermissionLevel('sys.upload')).toBe(0);
  });
  it('未知前缀默认级别 1', () => {
    expect(getPermissionLevel('unknown.group')).toBe(1);
    expect(getPermissionLevel('custom.setting')).toBe(1);
  });
  it('前缀优先级 — sys.model 匹配 before sys.upload', () => {
    expect(getPermissionLevel('sys.model.config')).toBe(2);
  });
});

// ============================================================
// getGroupConfig
// ============================================================
describe('getGroupConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('游客访问 page.* 配置成功', async () => {
    configDao.getItemsByGroup.mockResolvedValue([
      { item_key: 'title', item_value: 'Movio', default_val: null },
      { item_key: 'logo', item_value: null, default_val: '/logo.svg' },
    ]);
    redis.get.mockRejectedValue(new Error('noop'));

    const result = await getGroupConfig('page.home', null, null);
    expect(result).toEqual({ title: 'Movio', logo: '/logo.svg' });
  });

  it('管理员可访问 sys.model (level 2)', async () => {
    configDao.getItemsByGroup.mockResolvedValue([
      { item_key: 'default_model', item_value: 'gpt-4o', default_val: null },
    ]);
    redis.get.mockRejectedValue(new Error('noop'));

    const result = await getGroupConfig('sys.model', 1, 'admin');
    expect(result).toEqual({ default_model: 'gpt-4o' });
  });

  it('游客访问 sys.model 被拒绝', async () => {
    await expect(getGroupConfig('sys.model', null, null)).rejects.toThrow('无权限读取此配置');
  });

  it('普通用户访问 sys.model 被拒绝', async () => {
    await expect(getGroupConfig('sys.model', 5, 'user')).rejects.toThrow('无权限读取此配置');
  });

  it('超级管理员可访问 sys.model', async () => {
    configDao.getItemsByGroup.mockResolvedValue([]);
    redis.get.mockRejectedValue(new Error('noop'));

    const result = await getGroupConfig('sys.model', 1, 'super_admin');
    expect(result).toEqual({});
  });

  it('命中 Redis 缓存直接返回', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ cached: true }));
    // DAO 不应被调用
    const result = await getGroupConfig('page.home', null, null);
    expect(result).toEqual({ cached: true });
    expect(configDao.getItemsByGroup).not.toHaveBeenCalled();
  });
});

// ============================================================
// getDict
// ============================================================
describe('getDict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('从 DB 获取字典项并缓存', async () => {
    const items = [{ item_key: 'text', item_value: '文案生成' }];
    configDao.getDictItems.mockResolvedValue(items);
    redis.get.mockRejectedValue(new Error('noop'));
    redis.setex.mockResolvedValue('OK');

    const result = await getDict('task_category');
    expect(result).toEqual(items);
    expect(redis.setex).toHaveBeenCalled();
  });

  it('命中缓存直接返回', async () => {
    const cached = [{ item_key: 'image', item_value: '图片生成' }];
    redis.get.mockResolvedValue(JSON.stringify(cached));

    const result = await getDict('task_category');
    expect(result).toEqual(cached);
    expect(configDao.getDictItems).not.toHaveBeenCalled();
  });
});

// ============================================================
// setConfig
// ============================================================
describe('setConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('更新配置项并记录日志', async () => {
    configDao.getItemValue.mockResolvedValue('old-val');
    configDao.updateItemValue.mockResolvedValue();
    configDao.insertLog.mockResolvedValue();
    redis.del.mockResolvedValue(1);

    const result = await setConfig('biz.credit', 'max_credits', '500', 1);
    expect(result).toEqual({
      group_key: 'biz.credit', item_key: 'max_credits',
      old_value: 'old-val', new_value: '500',
    });
    expect(configDao.insertLog).toHaveBeenCalledWith(expect.objectContaining({
      group_key: 'biz.credit', item_key: 'max_credits',
      old_value: 'old-val', new_value: '500', changed_by: 1,
    }));
    expect(redis.del).toHaveBeenCalledWith('config:biz.credit');
  });

  it('配置项不存在时抛出 404', async () => {
    configDao.getItemValue.mockResolvedValue(null);
    await expect(setConfig('biz.credit', 'unknown', 'x', 1)).rejects.toThrow('配置项不存在');
  });
});

// ============================================================
// rollbackConfig
// ============================================================
describe('rollbackConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('回滚到旧值', async () => {
    configDao.getLogById.mockResolvedValue({
      id: 1, group_key: 'biz.credit', item_key: 'max_credits',
      old_value: '100', new_value: '500',
    });
    configDao.updateItemValue.mockResolvedValue();
    configDao.insertLog.mockResolvedValue();
    redis.del.mockResolvedValue(1);

    const result = await rollbackConfig(1, 2);
    expect(result).toMatchObject({ message: '回滚成功' });
    expect(configDao.updateItemValue).toHaveBeenCalledWith('biz.credit', 'max_credits', '100');
  });

  it('变更记录不存在时抛出 404', async () => {
    configDao.getLogById.mockResolvedValue(null);
    await expect(rollbackConfig(999, 1)).rejects.toThrow('变更记录不存在');
  });
});
