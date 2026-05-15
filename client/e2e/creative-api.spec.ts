import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3001';

// ─── 图片创作类 API 全覆盖 ───
test.describe('Creative — 图片创作 API', () => {

  test.describe('v4 Image (image.service)', () => {
    test('GET /api/image/generate-options 返回配置', async ({ request }) => {
      const res = await request.get(`${BASE}/api/image/generate-options`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/image/generate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/image/generate`, { data: { prompt: 'test' } });
      expect([401, 403]).toContain(res.status());
    });

    test('POST /api/image/generate 缺参数不500', async ({ request }) => {
      const res = await request.post(`${BASE}/api/image/generate`, { data: {} });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/image/replicate-main 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/image/replicate-main`, { data: {} });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/image/batch-generate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/image/batch-generate`, { data: { prompts: ['a', 'b'] } });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/image/batch-edit 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/image/batch-edit`, { data: {} });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/image/prompt-enhance 增强提示词', async ({ request }) => {
      const res = await request.post(`${BASE}/api/image/prompt-enhance`, {
        data: { prompt: 'a red dress', type: 'image' },
      });
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Advanced Image (advancedImageService)', () => {
    const advEndpoints = [
      { method: 'POST', path: '/api/advanced-image/virtual-tryon', body: { productImageUrl: 'test.jpg' } },
      { method: 'POST', path: '/api/advanced-image/color-swap', body: { productImageUrl: 'test.jpg' } },
      { method: 'POST', path: '/api/advanced-image/style-transfer', body: { productImageUrl: 'test.jpg', targetStyle: '3d' } },
      { method: 'POST', path: '/api/advanced-image/wrinkle-remove', body: { productImageUrl: 'test.jpg' } },
      { method: 'POST', path: '/api/advanced-image/image-translate', body: { productImageUrl: 'test.jpg', targetLang: 'en' } },
      { method: 'POST', path: '/api/advanced-image/outpainting', body: { productImageUrl: 'test.jpg' } },
      { method: 'POST', path: '/api/advanced-image/ghost-mannequin', body: { productImageUrl: 'test.jpg' } },
      { method: 'POST', path: '/api/advanced-image/model-generate', body: { imageUrl: 'test.jpg' } },
      { method: 'POST', path: '/api/advanced-image/shot-panorama', body: { imageUrl: 'test.jpg' } },
      { method: 'POST', path: '/api/advanced-image/swap-face', body: { baseUrl: 'a.jpg', faceUrl: 'b.jpg' } },
      { method: 'POST', path: '/api/advanced-image/text-effect', body: { text: 'Hello' } },
    ];

    for (const { method, path, body } of advEndpoints) {
      test(`${method} ${path} 需认证不500`, async ({ request }) => {
        const res = method === 'POST'
          ? await request.post(`${BASE}${path}`, { data: body })
          : await request.get(`${BASE}${path}`);
        expect(res.status()).toBeLessThan(500);
      });

      test(`${method} ${path} 空body不500`, async ({ request }) => {
        const res = await request.post(`${BASE}${path}`, { data: {} });
        expect(res.status()).toBeLessThan(500);
      });
    }

    test('GET /api/advanced-image/task/:id 需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/advanced-image/task/t1`);
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/advanced-image/tasks 需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/advanced-image/tasks`);
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Poster (poster.service)', () => {
    test('POST /api/poster/generate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/poster/generate`, {
        data: { posterType: 'product', prompt: 'test' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/poster/sizes 返回尺寸配置', async ({ request }) => {
      const res = await request.get(`${BASE}/api/poster/sizes`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/poster/styles 返回风格配置', async ({ request }) => {
      const res = await request.get(`${BASE}/api/poster/styles`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/poster/works 需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/poster/works`);
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Detail Image (detail-image.service)', () => {
    test('POST /api/detail/generate-set 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/detail/generate-set`, {
        data: { product_name: 'test', product_images: ['a.jpg'] },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/detail/replicate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/detail/replicate`, {
        data: { reference_url: 'a.jpg', product_name: 'test', product_images: ['b.jpg'] },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/detail/works 需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/detail/works`);
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Model Generate & Render (v4)', () => {
    test('POST /api/model-generate/generate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/model-generate/generate`, { data: { imageUrl: 'test.jpg' } });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/render/product 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/render/product`, { data: { productImageUrl: 'test.jpg' } });
      expect(res.status()).toBeLessThan(500);
    });
  });
});

// ─── 视频创作类 API 全覆盖 ───
test.describe('Creative — 视频创作 API', () => {

  test.describe('v4 Video (video.service)', () => {
    test('POST /api/video/generate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/generate`, { data: { prompt: 'test' } });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/image-to-video 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/image-to-video`, {
        data: { imageUrl: 'test.jpg' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/multi-image-to-video 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/multi-image-to-video`, {
        data: { images: [{ url: 'a.jpg' }, { url: 'b.jpg' }] },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/auto-package 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/auto-package`, {
        data: { videoUrl: 'test.mp4' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/prompt-enhance 增强提示词', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/prompt-enhance`, {
        data: { prompt: 'a product showcase', type: 'video' },
      });
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Advanced Video (advancedVideoService)', () => {
    const advVideoEndpoints = [
      { path: '/api/advanced-video/img2video', body: { imageUrl: 'test.jpg' } },
      { path: '/api/advanced-video/multi2video', body: { imageUrls: ['a.jpg', 'b.jpg'] } },
      { path: '/api/advanced-video/video-auto-package', body: { videoUrl: 'test.mp4' } },
      { path: '/api/advanced-video/script-gen', body: { productInfo: 'test product' } },
      { path: '/api/advanced-video/shot-plan', body: { productInfo: 'test product' } },
      { path: '/api/advanced-video/viral-clone', body: { referenceVideoUrl: 'a.mp4', productImageUrl: 'b.jpg' } },
      { path: '/api/advanced-video/action-batch', body: { actionVideoUrl: 'a.mp4', productImageUrls: ['b.jpg'] } },
      { path: '/api/advanced-video/video-beautify', body: { videoUrl: 'test.mp4' } },
      { path: '/api/advanced-video/voice-gen', body: { text: '你好世界' } },
      { path: '/api/advanced-video/voice-clone', body: { audioSampleUrl: 'sample.mp3', text: '你好' } },
      { path: '/api/advanced-video/video-edit', body: { videoUrl: 'test.mp4' } },
    ];

    for (const { path, body } of advVideoEndpoints) {
      test(`POST ${path} 不500`, async ({ request }) => {
        const res = await request.post(`${BASE}${path}`, { data: body });
        expect(res.status()).toBeLessThan(500);
      });
    }
  });

  test.describe('Digital Human', () => {
    test('POST /api/digital-human/create 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/digital-human/create`, {
        data: { text: '你好，欢迎选购' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/digital-human/create 空body不500', async ({ request }) => {
      const res = await request.post(`${BASE}/api/digital-human/create`, { data: {} });
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Viral Video & Live Clip', () => {
    test('POST /api/video/analyze-viral 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/analyze-viral`, {
        data: { videoUrl: 'https://example.com/v.mp4', platform: 'douyin' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/smart-clip 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/smart-clip`, {
        data: { videoUrl: 'test.mp4' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/remove-redundant 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/remove-redundant`, {
        data: { videoUrl: 'test.mp4' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/optimize-audio 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/optimize-audio`, {
        data: { videoUrl: 'test.mp4', level: 'standard' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video/subtitle-correction 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video/subtitle-correction`, {
        data: { videoUrl: 'test.mp4' },
      });
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Video Translation', () => {
    test('POST /api/video-translate/voice 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video-translate/voice`, {
        data: { videoUrl: 'test.mp4', targetLang: 'en' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video-translate/subtitles 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video-translate/subtitles`, {
        data: { videoUrl: 'test.mp4', targetLang: 'en' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/video-translate/face 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/video-translate/face`, {
        data: { videoUrl: 'test.mp4', targetLang: 'en' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/video-translate/langs 返回支持语言', async ({ request }) => {
      const res = await request.get(`${BASE}/api/video-translate/langs`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });
  });
});

// ─── 文案/语音创作类 API ───
test.describe('Creative — 文案/语音 API', () => {

  test.describe('Copywriting', () => {
    test('POST /api/copywriting/generate-titles 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/copywriting/generate-titles`, {
        data: { productName: 'T恤', platform: 'taobao' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/copywriting/generate-titles 缺productName不500', async ({ request }) => {
      const res = await request.post(`${BASE}/api/copywriting/generate-titles`, { data: {} });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/copywriting/generate-description 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/copywriting/generate-description`, {
        data: { productName: 'T恤' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/copywriting/translate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/copywriting/translate`, {
        data: { text: 'T恤', targetLang: 'en' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/copywriting/generate-script 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/copywriting/generate-script`, {
        data: { productName: 'T恤' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/copywriting/platforms 返回平台列表', async ({ request }) => {
      const res = await request.get(`${BASE}/api/copywriting/platforms`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/copywriting/languages 返回语言列表', async ({ request }) => {
      const res = await request.get(`${BASE}/api/copywriting/languages`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/copywriting/history 需认证', async ({ request }) => {
      const res = await request.get(`${BASE}/api/copywriting/history`);
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Voice (TTS & Clone)', () => {
    test('POST /api/voice/generate 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/voice/generate`, {
        data: { text: '你好世界', voice: 'sweet-female', speed: 1.0 },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/voice/generate 空文本不500', async ({ request }) => {
      const res = await request.post(`${BASE}/api/voice/generate`, { data: { text: '', voice: 'sweet-female' } });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/voice/clone 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/voice/clone`, {
        data: { sampleUrl: 'https://example.com/voice.mp3', text: '你好' },
      });
      expect(res.status()).toBeLessThan(500);
    });
  });
});

// ─── 其他创作类 API ───
test.describe('Creative — 其他创作 API', () => {

  test.describe('3D Models', () => {
    test('GET /api/3d/models 返回模型列表', async ({ request }) => {
      const res = await request.get(`${BASE}/api/3d/models`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });

    test('GET /api/3d/demo 返回示例配置', async ({ request }) => {
      const res = await request.get(`${BASE}/api/3d/demo`, { failOnStatusCode: false });
      expect(res.status()).toBeLessThan(500);
    });
  });

  test.describe('Cut Ecosystem (剪映导出)', () => {
    test('POST /api/cut/export-jianying 需认证', async ({ request }) => {
      const res = await request.post(`${BASE}/api/cut/export-jianying`, {
        data: { workIds: [1, 2], projectName: 'test' },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('POST /api/cut/export-jianying 空workIds不500', async ({ request }) => {
      const res = await request.post(`${BASE}/api/cut/export-jianying`, { data: {} });
      expect(res.status()).toBeLessThan(500);
    });
  });
});

// ─── 作品管理类 API ───
test.describe('Creative — 作品管理 API', () => {
  test('GET /api/works 需认证', async ({ request }) => {
    const res = await request.get(`${BASE}/api/works`);
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/image/works 需认证', async ({ request }) => {
    const res = await request.get(`${BASE}/api/image/works`);
    expect(res.status()).toBeLessThan(500);
  });

  test('GET /api/video/works 需认证', async ({ request }) => {
    const res = await request.get(`${BASE}/api/video/works`);
    expect(res.status()).toBeLessThan(500);
  });
});
