import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/wrapController.js', () => ({ wrapController: (fn) => fn }));
vi.mock('../../utils/response.js', () => ({ success: (r, d) => ({ code: 0, data: d }) }));

import * as ctrl from '../../controller/compareController.js';

describe('compareController', () => {
  it('sideBySide returns formatted comparison', async () => {
    const r = await ctrl.sideBySide({
      body: { imageA: 'a.jpg', imageB: 'b.jpg', mode: 'slider', labelA: '原图', labelB: '结果' },
    });
    expect(r.data.mode).toBe('slider');
    expect(r.data.imageA.url).toBe('a.jpg');
    expect(r.data.imageA.label).toBe('原图');
    expect(r.data.imageB.url).toBe('b.jpg');
    expect(r.data.imageB.label).toBe('结果');
    expect(r.data.modes).toContain('slider');
  });

  it('sideBySide defaults labels', async () => {
    const r = await ctrl.sideBySide({
      body: { imageA: 'x.png', imageB: 'y.png' },
    });
    expect(r.data.imageA.label).toBe('原始图');
    expect(r.data.imageB.label).toBe('生成图');
  });
});
