import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

// batchTemplateDao.js imports pool from '../dao/db.js', same path from test perspective
vi.mock('../../dao/db.js', () => ({ default: { execute: mockExecute } }));

import * as batchTemplateDao from '../../dao/batchTemplateDao.js';

describe('batchTemplateDao', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('insertTemplate 返回 insertId', async () => {
    mockExecute.mockResolvedValue([{ insertId: 7 }]);
    const id = await batchTemplateDao.insertTemplate(1, {
      name: 'B1', operation: 'cutout', platform: '淘宝', style: '简约', nightMode: true, imageCount: 10,
    });
    expect(id).toBe(7);
  });

  it('listTemplates 返回列表', async () => {
    mockExecute.mockResolvedValue([[{ id: 1, name: 'B1' }, { id: 2, name: 'B2' }]]);
    expect(await batchTemplateDao.listTemplates(1)).toHaveLength(2);
  });

  it('getTemplate 找到', async () => {
    mockExecute.mockResolvedValue([[{ id: 1, name: 'B1' }]]);
    const r = await batchTemplateDao.getTemplate(1, 1);
    expect(r.name).toBe('B1');
  });

  it('getTemplate 未找到返回 null', async () => {
    mockExecute.mockResolvedValue([[]]);
    expect(await batchTemplateDao.getTemplate(99, 1)).toBeNull();
  });

  it('deleteTemplate 软删除', async () => {
    mockExecute.mockResolvedValue([]);
    await expect(batchTemplateDao.deleteTemplate(1, 1)).resolves.toBeUndefined();
  });
});
