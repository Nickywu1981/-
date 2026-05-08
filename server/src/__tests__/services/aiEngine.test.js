import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as aiEngine from '../../services/aiEngine.js';

describe('aiEngine', () => {
  beforeEach(() => {
    // Clear registry between tests by re-importing... can't do that easily.
    // Instead, we test with unique model IDs.
  });

  describe('registerModel', () => {
    it('注册有效模型', () => {
      const infer = vi.fn();
      aiEngine.registerModel({ id: 'test-model', type: 'image', infer });
      const m = aiEngine.getModel('test-model');
      expect(m.id).toBe('test-model');
      expect(m.type).toBe('image');
    });

    it('缺少 id 抛出错误', () => {
      expect(() => aiEngine.registerModel({ type: 'x', infer: vi.fn() })).toThrow('缺少 id/type/infer');
    });

    it('缺少 infer 抛出错误', () => {
      expect(() => aiEngine.registerModel({ id: 'x', type: 'x' })).toThrow('缺少 id/type/infer');
    });
  });

  describe('getModel', () => {
    it('未注册模型抛出错误', () => {
      expect(() => aiEngine.getModel('nonexistent')).toThrow('AI模型未注册');
    });
  });

  describe('listModels', () => {
    it('返回所有模型', () => {
      aiEngine.registerModel({ id: 'list-m1', type: 'image', infer: vi.fn() });
      aiEngine.registerModel({ id: 'list-m2', type: 'video', infer: vi.fn() });
      const all = aiEngine.listModels();
      expect(all.filter(m => m.id === 'list-m1' || m.id === 'list-m2')).toHaveLength(2);
    });

    it('按类型过滤', () => {
      expect(aiEngine.listModels('video')).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'video' })]),
      );
    });
  });

  describe('getDefaultModel', () => {
    it('已知任务类型返回模型 ID', () => {
      expect(aiEngine.getDefaultModel('cutout')).toBe('stable-diffusion-img2img');
      expect(aiEngine.getDefaultModel('img2video')).toBe('stable-diffusion-xl');
    });

    it('未知类型返回 null', () => {
      expect(aiEngine.getDefaultModel('unknown_task')).toBeNull();
    });
  });

  describe('infer', () => {
    it('调用模型 infer 并返回时间统计', async () => {
      const infer = vi.fn().mockResolvedValue({ result: 'ok' });
      aiEngine.registerModel({ id: 'inf-test', type: 'test', infer });
      const progress = vi.fn();
      const r = await aiEngine.infer('inf-test', { input: 1 }, { onProgress: progress });
      expect(r.modelId).toBe('inf-test');
      expect(r.output).toEqual({ result: 'ok' });
      expect(r.elapsed).toBeGreaterThanOrEqual(0);
      expect(progress).toHaveBeenCalledWith(0);
      expect(progress).toHaveBeenCalledWith(100);
    });
  });

  describe('pipeline', () => {
    it('串联多阶段执行', async () => {
      aiEngine.registerModel({ id: 's1', type: 'test', infer: vi.fn().mockResolvedValue({ a: 1 }) });
      aiEngine.registerModel({ id: 's2', type: 'test', infer: vi.fn().mockResolvedValue({ b: 2 }) });

      const progress = vi.fn();
      const stages = [
        { name: 'stage1', model: 's1' },
        { name: 'stage2', model: 's2' },
      ];
      const { results, final } = await aiEngine.pipeline(stages, { x: 0 }, progress);

      expect(results).toHaveLength(2);
      expect(results[0].stage).toBe('stage1');
      expect(results[1].stage).toBe('stage2');
      expect(final).toEqual({ x: 0, a: 1, b: 2 });
    });
  });
});
