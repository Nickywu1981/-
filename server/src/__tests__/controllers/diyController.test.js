import { vi, describe, it, expect } from 'vitest';

vi.mock('../../services/diyService.js');
vi.mock('../../utils/response.js', () => ({ success: (res, data) => ({ code: 0, data }) }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/pagination.js', () => ({ parsePagination: () => ({ page: 1, pageSize: 20 }) }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(c, m) { super(m); this.code = c; } } }));
vi.mock('../../constants/errorCode.js', () => ({ ERROR_CODE: { NOT_FOUND: 'NOT_FOUND' } }));
vi.mock('../../constants/domainStatus.js', () => ({ DIY_PAGE_STATUS_LABEL: {} }));

const diyService = (await import('../../services/diyService.js')).default;

import * as ctrl from '../../controller/diyController.js';

describe('diyController', () => {
  const res = {};

  it('listPages', async () => {
    diyService.listPages = vi.fn().mockResolvedValue({ list: [], total: 0 });
    const r = await ctrl.listPages({ tenantId: 't1', user: { id: 'u1' }, query: {} }, res);
    expect(r.code).toBe(0);
  });

  it('getPage exists', async () => {
    diyService.getPageById = vi.fn().mockResolvedValue({ id: 1 });
    const r = await ctrl.getPage({ tenantId: 't1', params: { id: '1' } }, res);
    expect(r.code).toBe(0);
  });

  it('getPage not found', async () => {
    diyService.getPageById = vi.fn().mockResolvedValue(null);
    await expect(ctrl.getPage({ tenantId: 't1', params: { id: '999' } }, res)).rejects.toThrow('页面不存在');
  });

  it('createPage', async () => {
    diyService.createPage = vi.fn().mockResolvedValue({ id: 2 });
    const r = await ctrl.createPage({ tenantId: 't1', user: { id: 'u1' }, body: { title: 'New', slug: 'new', pageType: 'shop' } }, res);
    expect(r.code).toBe(0);
  });
});
