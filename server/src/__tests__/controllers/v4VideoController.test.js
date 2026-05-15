import { vi, describe, it, expect } from 'vitest';

vi.mock('../../services/video.service.js');
vi.mock('../../services/action-migrate.service.js');
vi.mock('../../services/viral-video.service.js');
vi.mock('../../services/digital-human.service.js');
vi.mock('../../services/live-clip.service.js');
vi.mock('../../utils/response.js', () => ({ success: (res, data) => ({ code: 200, data }) }));
vi.mock('../../utils/wrapController.js', () => ({ wrapController: fn => fn }));

const videoService = await import('../../services/video.service.js');
const actionMigrateService = await import('../../services/action-migrate.service.js');
const viralVideoService = await import('../../services/viral-video.service.js');
const digitalHumanService = await import('../../services/digital-human.service.js');
const liveClipService = await import('../../services/live-clip.service.js');

import * as ctrl from '../../controller/v4VideoController.js';

describe('v4VideoController', () => {
  const res = {};
  const makeReq = (overrides = {}) => ({ user: { id: 'u1' }, validated: {}, params: {}, query: {}, ...overrides });

  it('generateVideo', async () => {
    videoService.generateVideo = vi.fn().mockResolvedValue({ taskId: 't1' });
    const r = await ctrl.generateVideo(makeReq({ validated: { prompt: 'a cat', duration: 5 } }), res);
    expect(r.code).toBe(200);
  });

  it('imageToVideo', async () => {
    videoService.imageToVideo = vi.fn().mockResolvedValue({ taskId: 't2' });
    const r = await ctrl.imageToVideo(makeReq({ validated: { image_url: 'https://img/a.jpg', prompt: 'animate' } }), res);
    expect(r.code).toBe(200);
  });

  it('multiImageToVideo', async () => {
    videoService.multiImageToVideo = vi.fn().mockResolvedValue({ taskId: 't3' });
    const r = await ctrl.multiImageToVideo(makeReq({ validated: { images: ['a.jpg', 'b.jpg'], prompt: 'transition' } }), res);
    expect(r.code).toBe(200);
  });

  it('getVideoJobStatus', async () => {
    videoService.queryTask = vi.fn().mockResolvedValue({ id: 't1', status: 'completed' });
    const r = await ctrl.getVideoJobStatus(makeReq({ params: { id: 't1' } }), res);
    expect(r.code).toBe(200);
  });

  it('getVideoWorks', async () => {
    videoService.listWorks = vi.fn().mockResolvedValue({ list: [], total: 0 });
    const r = await ctrl.getVideoWorks(makeReq(), res);
    expect(r.code).toBe(200);
  });

  it('migrateAction', async () => {
    actionMigrateService.actionMigrate = vi.fn().mockResolvedValue({ taskId: 't4' });
    const r = await ctrl.migrateAction(makeReq({ validated: { source_url: 'https://vid/a.mp4', target_url: 'https://img/b.jpg' } }), res);
    expect(r.code).toBe(200);
  });

  it('analyzeViralVideo', async () => {
    viralVideoService.analyzeViral = vi.fn().mockResolvedValue({ taskId: 't5' });
    const r = await ctrl.analyzeViralVideo(makeReq({ validated: { product_id: 'p1' } }), res);
    expect(r.code).toBe(200);
  });

  it('createDigitalHuman', async () => {
    digitalHumanService.digitalHuman = vi.fn().mockResolvedValue({ taskId: 't6' });
    const r = await ctrl.createDigitalHuman(makeReq({ validated: { avatar_id: 'a1', script: 'Hello' } }), res);
    expect(r.code).toBe(200);
  });

  it('generateStoryboard', async () => {
    videoService.storyboard = vi.fn().mockResolvedValue({ scenes: [] });
    const r = await ctrl.generateStoryboard(makeReq({ validated: { product_id: 'p1' } }), res);
    expect(r.code).toBe(200);
  });

  it('smartClipLiveVideo', async () => {
    liveClipService.liveClip = vi.fn().mockResolvedValue({ taskId: 't7' });
    const r = await ctrl.smartClipLiveVideo(makeReq({ validated: { stream_url: 'https://live/p1' } }), res);
    expect(r.code).toBe(200);
  });

  it('removeRedundantSegments', async () => {
    videoService.longVideoEdit = vi.fn().mockResolvedValue({ taskId: 't8' });
    const r = await ctrl.removeRedundantSegments(makeReq({ validated: { video_url: 'https://vid/l.mp4', edit_points: [] } }), res);
    expect(r.code).toBe(200);
  });
});
