import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../services/image.service.js');
vi.mock('../../services/prompt-enhance.service.js');
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as imageService from '../../services/image.service.js';
import * as promptEnhanceService from '../../services/prompt-enhance.service.js';
import {
  generateImage, replicateMainImage, batchGenerateImage,
  batchEditImage, batchReplaceImage, getImageWorks, enhancePrompt,
} from '../../controller/v4ImageController.js';

function mockRes() {
  let sent = false;
  return {
    json(d) { sent = true; return d; },
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    get headersSent() { return sent; },
  };
}

describe('v4ImageController', () => {
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    res = mockRes();
  });

  describe('generateImage', () => {
    it('提交生图任务成功', async () => {
      imageService.generateImage.mockResolvedValue({ jobId: 'job-1' });
      const req = { user: { id: 1 }, validated: { prompt: '一只猫', ratio: '1:1', style: 'realistic' } };
      const result = await generateImage(req, res);
      expect(result.code).toBe(200);
      expect(imageService.generateImage).toHaveBeenCalledWith(1, { prompt: '一只猫', ratio: '1:1', style: 'realistic' });
    });

    it('生成失败返回错误响应', async () => {
      imageService.generateImage.mockRejectedValue(new Error('配额不足'));
      const result = await generateImage({ user: { id: 1 }, validated: { prompt: 'test' } }, res);
      expect(result.code).toBe(500);
    });
  });

  describe('replicateMainImage', () => {
    it('参考图生图成功', async () => {
      imageService.replicateMainImage.mockResolvedValue({ jobId: 'job-2' });
      const req = { user: { id: 1 }, validated: { reference_image_url: 'https://img.example/1.jpg', product_name: 'T恤', style: 'fashion', ratio: '3:4' } };
      const result = await replicateMainImage(req, res);
      expect(result.code).toBe(200);
    });
  });

  describe('batchGenerateImage', () => {
    it('批量生图拼接数量信息', async () => {
      imageService.batchGenerateImage.mockResolvedValue({ jobs: [] });
      const req = { user: { id: 1 }, validated: { prompts: ['p1', 'p2', 'p3'], ratio: '16:9', style: 'cartoon' } };
      const result = await batchGenerateImage(req, res);
      expect(result.code).toBe(200);
      expect(result.msg).toContain('3');
    });
  });

  describe('batchEditImage', () => {
    it('批量编辑提交', async () => {
      imageService.batchEditImage.mockResolvedValue({ jobs: [] });
      const req = { user: { id: 1 }, validated: { images: ['url1', 'url2'], operations: {} } };
      const result = await batchEditImage(req, res);
      expect(result.code).toBe(200);
    });
  });

  describe('batchReplaceImage', () => {
    it('批量替换背景提交', async () => {
      imageService.batchReplaceImage.mockResolvedValue({ jobs: [] });
      const req = { user: { id: 1 }, validated: { images: ['url1'], new_background: 'beach', new_scene: 'outdoor' } };
      const result = await batchReplaceImage(req, res);
      expect(result.code).toBe(200);
    });
  });

  describe('getImageWorks', () => {
    it('默认分页参数', async () => {
      imageService.getImageWorks.mockResolvedValue({ list: [], total: 0 });
      const req = { user: { id: 1 }, query: {} };
      const result = await getImageWorks(req, res);
      expect(imageService.getImageWorks).toHaveBeenCalledWith(1, { page: 1, pageSize: 20, status: undefined });
      expect(result.code).toBe(200);
    });

    it('传入自定义分页和状态', async () => {
      imageService.getImageWorks.mockResolvedValue({ list: [], total: 0 });
      const req = { user: { id: 1 }, query: { page: '3', pageSize: '10', status: 'completed' } };
      await getImageWorks(req, res);
      expect(imageService.getImageWorks).toHaveBeenCalledWith(1, { page: 3, pageSize: 10, status: 'completed' });
    });
  });

  describe('enhancePrompt', () => {
    it('增强 prompt 默认 image 类型', async () => {
      promptEnhanceService.enhancePrompt.mockResolvedValue({ enhanced: 'enhanced prompt' });
      const result = await enhancePrompt({ validated: { prompt: 'a cat' } }, res);
      expect(promptEnhanceService.enhancePrompt).toHaveBeenCalledWith('a cat', 'image');
      expect(result.code).toBe(200);
    });

    it('自定义增强类型', async () => {
      promptEnhanceService.enhancePrompt.mockResolvedValue({ enhanced: 'enhanced prompt' });
      await enhancePrompt({ validated: { prompt: 'a cat', type: 'text' } }, res);
      expect(promptEnhanceService.enhancePrompt).toHaveBeenCalledWith('a cat', 'text');
    });
  });
});
