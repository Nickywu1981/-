import { vi, describe, it, expect } from 'vitest';

vi.mock('../../services/taskService.js');
vi.mock('../../utils/response.js', () => ({ success: (res, data) => ({ code: 200, data }) }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));

const taskService = await import('../../services/taskService.js');

import * as ctrl from '../../controller/taskController.js';

describe('taskController', () => {
  const res = {};

  it('listMyWorks returns works', async () => {
    taskService.listMyWorks = vi.fn().mockResolvedValue({ list: [], total: 0 });
    const r = await ctrl.listMyWorks({ user: { id: 'u1' }, query: {} }, res);
    expect(r.code).toBe(200);
  });

  it('listMyWorks with filters', async () => {
    taskService.listMyWorks = vi.fn().mockResolvedValue({ list: [{ id: 1 }], total: 1 });
    const r = await ctrl.listMyWorks({ user: { id: 'u1' }, query: { status: 'completed', page: 1 } }, res);
    expect(r.code).toBe(200);
  });
});
