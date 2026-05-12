import { describe, it, expect, vi } from 'vitest';

vi.mock('../../dao/db.js', () => ({ default: { execute: vi.fn() } }));
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as dao from '../../dao/workflowDao.js';
import pool from '../../dao/db.js';

describe('workflowDao', () => {
  it('listTemplates returns rows', async () => {
    pool.execute.mockResolvedValueOnce([[{ id: 1, name: '测试模板' }]]);
    const rows = await dao.listTemplates({ status: 'published' });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('测试模板');
  });

  it('getTemplate returns single row', async () => {
    pool.execute.mockResolvedValueOnce([[{ id: 2, name: '电商主图' }]]);
    const row = await dao.getTemplate(2);
    expect(row.name).toBe('电商主图');
  });

  it('getTemplate returns null when not found', async () => {
    pool.execute.mockResolvedValueOnce([[]]);
    const row = await dao.getTemplate(999);
    expect(row).toBeNull();
  });

  it('createTemplate returns insertId', async () => {
    pool.execute.mockResolvedValueOnce([{ insertId: 3 }]);
    const id = await dao.createTemplate({ name: '新模板', steps: [] });
    expect(id).toBe(3);
  });

  it('updateTemplate returns true on success', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const ok = await dao.updateTemplate(1, { name: '改名' });
    expect(ok).toBe(true);
  });

  it('updateTemplate returns false with no fields', async () => {
    const ok = await dao.updateTemplate(1, {});
    expect(ok).toBe(false);
  });

  it('deleteTemplate returns true', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const ok = await dao.deleteTemplate(1);
    expect(ok).toBe(true);
  });

  it('createJob returns insertId', async () => {
    pool.execute.mockResolvedValueOnce([{ insertId: 5 }]);
    const id = await dao.createJob({ templateId: 1, templateName: 'X', userId: 1, inputData: {} });
    expect(id).toBe(5);
  });

  it('updateJobStatus updates progress', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const ok = await dao.updateJobStatus(5, { status: 'running', progress: 50 });
    expect(ok).toBe(true);
  });

  it('getJob returns job row', async () => {
    pool.execute.mockResolvedValueOnce([[{ id: 5, status: 'completed' }]]);
    const job = await dao.getJob(5);
    expect(job.status).toBe('completed');
  });

  it('listJobsByUser paginates', async () => {
    pool.execute.mockResolvedValueOnce([[{ total: 2 }]]);
    pool.execute.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }]]);
    const result = await dao.listJobsByUser(1, { page: 1, pageSize: 10 });
    expect(result.total).toBe(2);
    expect(result.list).toHaveLength(2);
  });

  it('cancelJob sets status to cancelled', async () => {
    pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);
    const ok = await dao.cancelJob(5);
    expect(ok).toBe(true);
  });
});
