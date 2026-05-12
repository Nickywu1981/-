import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../../services/poster.service.js');
vi.mock('../../services/prompt-enhance.service.js');

import * as posterService from '../../services/poster.service.js';
import * as promptEnhanceService from '../../services/prompt-enhance.service.js';
import { generatePoster, enhancePrompt, getSizes, getUserPosters } from '../../controller/v4PosterController.js';

function mockRes() {
  const res = {};
  res._jsonBody = null;
  res.json = vi.fn(function (body) { res._jsonBody = body; return res; });
  res.setHeader = vi.fn();
  res.status = vi.fn(function () { return res; });
  return res;
}
function mockReq(overrides = {}) {
  return { body: {}, params: {}, query: {}, user: { id: 1 }, validated: null, ...overrides };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('v4PosterController', () => {
  it('generatePoster 提交海报任务', async () => {
    posterService.generatePoster.mockResolvedValue({ id: 42 });
    const res = mockRes();
    const req = mockReq({ validated: { prompt: '宣传海报', size: 'A3' } });
    await generatePoster(req, res);
    expect(res._jsonBody.data.job_id).toBe(42);
    expect(res._jsonBody.data.status).toBe('queued');
  });

  it('enhancePrompt 小红书类型 → social', async () => {
    promptEnhanceService.enhancePrompt.mockResolvedValue({ enhanced: '优质海报文案' });
    const res = mockRes();
    await enhancePrompt(mockReq({ validated: { prompt: '海报', posterType: 'xhs' } }), res);
    expect(promptEnhanceService.enhancePrompt).toHaveBeenCalledWith('海报', 'social');
  });

  it('enhancePrompt 海报类型 → poster', async () => {
    promptEnhanceService.enhancePrompt.mockResolvedValue({ enhanced: '海报' });
    const res = mockRes();
    await enhancePrompt(mockReq({ validated: { prompt: '海报', posterType: 'ecs' } }), res);
    expect(promptEnhanceService.enhancePrompt).toHaveBeenCalledWith('海报', 'poster');
  });

  it('getSizes 返回尺寸和风格', async () => {
    posterService.getPosterSizes.mockReturnValue([{ name: 'A3' }]);
    posterService.getPosterStyles.mockReturnValue([{ name: '简约' }]);
    const res = mockRes();
    await getSizes(mockReq(), res);
    expect(res._jsonBody.data.sizes).toHaveLength(1);
    expect(res._jsonBody.data.styles).toHaveLength(1);
  });

  it('getUserPosters 返回用户海报列表', async () => {
    posterService.getUserPosters.mockResolvedValue([{ id: 1, type: 'poster' }]);
    const res = mockRes();
    const req = mockReq({ validated: { type: 'poster', page: 1, limit: 20 } });
    await getUserPosters(req, res);
    expect(posterService.getUserPosters).toHaveBeenCalledWith(1, { type: 'poster', page: 1, limit: 20 });
  });
});
