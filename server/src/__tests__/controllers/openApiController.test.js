import { describe, it, expect, vi } from 'vitest';

const { mockSvc } = vi.hoisted(() => ({
  mockSvc: { ping: vi.fn(), getUsage: vi.fn(), removeBackground: vi.fn(), generateScene: vi.fn(), retouchImage: vi.fn(), generateVideo: vi.fn() },
}));

vi.mock('../../services/openApiService.js', () => mockSvc);
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));
vi.mock('../../utils/response.js', () => ({ success: vi.fn() }));

import * as ctrl from '../../controller/openApiController.js';
import { success } from '../../utils/response.js';

describe('openApiController', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ping calls service', async () => {
    mockSvc.ping.mockResolvedValue({ ok: true });
    await ctrl.ping({ tenantId: 1 }, {});
    expect(mockSvc.ping).toHaveBeenCalledWith(1);
    expect(success).toHaveBeenCalled();
  });

  it('getUsage calls service with apiKeyRecord', async () => {
    mockSvc.getUsage.mockResolvedValue({ calls: 100 });
    await ctrl.getUsage({ tenantId: 1, apiKeyRecord: { key: 'sk-xxx' } }, {});
    expect(mockSvc.getUsage).toHaveBeenCalledWith(1, { key: 'sk-xxx' });
  });

  it('removeBackground calls service', async () => {
    mockSvc.removeBackground.mockResolvedValue({ resultUrl: '/no-bg.png' });
    await ctrl.removeBackground({ tenantId: 1, body: { imageUrl: 'test.jpg' } }, {});
    expect(mockSvc.removeBackground).toHaveBeenCalledWith(1, 'test.jpg');
  });

  it('generateScene passes sceneType', async () => {
    mockSvc.generateScene.mockResolvedValue({ url: '/scene.png' });
    await ctrl.generateScene({ tenantId: 1, body: { imageUrl: 'a.jpg', sceneType: 'product' } }, {});
    expect(mockSvc.generateScene).toHaveBeenCalledWith(1, 'a.jpg', 'product');
  });

  it('retouchImage calls service', async () => {
    mockSvc.retouchImage.mockResolvedValue({ url: '/retouched.png' });
    await ctrl.retouchImage({ tenantId: 1, body: { imageUrl: 'img.jpg' } }, {});
    expect(mockSvc.retouchImage).toHaveBeenCalledWith(1, 'img.jpg');
  });

  it('generateVideo passes effect options', async () => {
    mockSvc.generateVideo.mockResolvedValue({ videoUrl: '/v.mp4' });
    await ctrl.generateVideo({ tenantId: 1, body: { imageUrls: ['a.jpg'], effect: 'smooth' } }, {});
    expect(mockSvc.generateVideo).toHaveBeenCalledWith(1, ['a.jpg'], expect.objectContaining({ effect: 'smooth' }));
  });
});
