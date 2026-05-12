import { describe, it, expect, vi } from 'vitest';

const { mockDao } = vi.hoisted(() => ({ mockDao: { list: vi.fn() } }));
vi.mock('../../dao/auditLogDao.js', () => ({ default: mockDao }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ listResult: vi.fn() }));
vi.mock('../../utils/pagination.js', () => ({ parsePagination: (q) => ({ page: +(q.page || 1), pageSize: +(q.pageSize || 20) }) }));

import * as ctrl from '../../controller/auditLogController.js';

describe('auditLogController', () => {
  it('list calls dao with pagination', async () => {
    mockDao.list.mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    await ctrl.list({ query: { page: '1', pageSize: '10' } }, {});
    expect(mockDao.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 10 }));
  });
});
