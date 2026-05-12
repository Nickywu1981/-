import { vi, describe, it, expect } from 'vitest';

vi.mock('../../services/config.service.js');
vi.mock('../../utils/response.js', () => ({ success: (res, data) => ({ code: 0, data }) }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));

const configService = await import('../../services/config.service.js');

import * as ctrl from '../../controller/v4ConfigController.js';

describe('v4ConfigController', () => {
  const res = {};

  it('getGroupConfig', async () => {
    configService.getGroupConfig = vi.fn().mockResolvedValue({ theme: 'dark' });
    const r = await ctrl.getGroupConfig({ user: { id: 'u1', role: 'admin' }, params: { group: 'theme' } }, res);
    expect(r.code).toBe(0);
  });

  it('getDict', async () => {
    configService.getDict = vi.fn().mockResolvedValue({ items: [] });
    const r = await ctrl.getDict({ params: { dictKey: 'countries' } }, res);
    expect(r.code).toBe(0);
  });

  it('getGroupList', async () => {
    configService.getGroupList = vi.fn().mockResolvedValue(['theme', 'payment']);
    const r = await ctrl.getGroupList({}, res);
    expect(r.code).toBe(0);
  });

  it('getGroupItems', async () => {
    configService.getGroupItems = vi.fn().mockResolvedValue([{ key: 'dark', value: true }]);
    const r = await ctrl.getGroupItems({ params: { groupKey: 'theme' } }, res);
    expect(r.code).toBe(0);
  });
});
