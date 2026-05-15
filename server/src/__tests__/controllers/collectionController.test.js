import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({
  mockSvc: { create: vi.fn(), update: vi.fn(), remove: vi.fn(), getById: vi.fn(), listByUser: vi.fn() },
}));

vi.mock('../../services/collectionService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({ success: (r, d, m) => ({ code: 200, data: d, message: m }) }));
vi.mock('../../utils/businessError.js', () => ({ BusinessError: class extends Error { constructor(code, msg) { super(msg); this.code = code; } } }));
vi.mock('../../constants/errorCode.js', () => ({ ERROR_CODE: { NOT_FOUND: 'NOT_FOUND' } }));

import * as ctrl from '../../controller/collectionController.js';

describe('collectionController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listCollections returns list', async () => {
    mockSvc.listByUser.mockResolvedValue([{ id: 1, name: '我的合集' }]);
    const r = await ctrl.listCollections({ user: { id: 1 }, query: {} });
    expect(r.data).toHaveLength(1);
  });

  it('getCollection returns item', async () => {
    mockSvc.getById.mockResolvedValue({ id: 1, name: 'A' });
    const r = await ctrl.getCollection({ params: { id: '1' }, user: { id: 1 } });
    expect(r.data.name).toBe('A');
  });

  it('getCollection throws on not found', async () => {
    mockSvc.getById.mockResolvedValue(null);
    await expect(ctrl.getCollection({ params: { id: '999' }, user: { id: 1 } })).rejects.toThrow();
  });

  it('createCollection returns id', async () => {
    mockSvc.create.mockResolvedValue(5);
    const r = await ctrl.createCollection({ body: { name: '新' }, user: { id: 1 } });
    expect(r.data.id).toBe(5);
  });

  it('updateCollection succeeds', async () => {
    mockSvc.update.mockResolvedValue(true);
    const r = await ctrl.updateCollection({ params: { id: '1' }, user: { id: 1 }, body: { name: '改' } });
    expect(r.message).toBe('更新成功');
  });

  it('deleteCollection succeeds', async () => {
    mockSvc.remove.mockResolvedValue(true);
    const r = await ctrl.deleteCollection({ params: { id: '1' }, user: { id: 1 } });
    expect(r.message).toBe('删除成功');
  });
});
