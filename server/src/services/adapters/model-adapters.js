/**
 * Movio AI v4.1 — Model Adapters
 * G5 后端开发 | W2/W3
 *
 * 每个 AI 模型封装为独立适配器, 实现统一接口:
 *   { generate(prompt, params) → result }
 * 新增模型只需在此目录添加一个 adapter + 后台配置注册
 *
 * W2 接入: 通义万象 (图片)
 * W3 接入: Seedance (视频), 千问 (文本, 已在 prompt-enhance 中使用)
 */
import { routeModel } from '../services/model-router.service.js';

/**
 * 通义万象适配器 — 图片生成
 */
export const TongyiWanxiangAdapter = {
  name: 'tongyi_wanxiang',
  category: 'image',

  async generateImage({ prompt, ratio = '1:1', style = 'realistic' }) {
    // 根据 ratio 映射分辨率
    const sizeMap = {
      '1:1': '1024x1024',
      '3:4': '768x1024',
      '4:3': '1024x768',
      '16:9': '1280x720',
    };
    const size = sizeMap[ratio] || '1024x1024';

    const result = await routeModel({
      mode: 'single',
      modelKey: 'tongyi_wanxiang',
      taskType: 'image_gen',
      params: {
        model: 'wanx-v1',
        prompt,
        size,
        n: 1,
        style,
      },
    });

    return {
      image_url: result?.data?.[0]?.url || result?.output?.image_url || '',
      prompt,
      ratio,
      style,
    };
  },

  async replicateImage({ referenceImageUrl, productName, ratio = '1:1' }) {
    const prompt = `复刻参考图的构图和风格，商品: ${productName}`;
    // 通义万象支持图生图
    const result = await routeModel({
      mode: 'single',
      modelKey: 'tongyi_wanxiang',
      taskType: 'image_gen',
      params: {
        model: 'wanx-v1',
        prompt,
        ref_img: referenceImageUrl,
        n: 1,
      },
    });

    return {
      image_url: result?.data?.[0]?.url || result?.output?.image_url || '',
      prompt,
    };
  },
};

/**
 * Seedance 适配器 — 视频生成 (W3 预留)
 */
export const SeedanceAdapter = {
  name: 'seedance',
  category: 'video',

  async generateVideo({ prompt, duration = 15, ratio = '9:16' }) {
    const sizeMap = {
      '9:16': '1080x1920',
      '16:9': '1920x1080',
      '1:1': '1080x1080',
    };
    const size = sizeMap[ratio] || '1080x1920';

    const result = await routeModel({
      mode: 'single',
      modelKey: 'seedance',
      taskType: 'video_gen',
      params: {
        prompt,
        duration,
        size,
      },
    });

    return {
      video_url: result?.data?.[0]?.url || result?.output?.video_url || '',
      duration,
      ratio,
    };
  },

  async actionMigrate({ sourceVideoUrl, targetPersonImage }) {
    const result = await routeModel({
      mode: 'single',
      modelKey: 'seedance',
      taskType: 'action_migrate',
      params: {
        source_video: sourceVideoUrl,
        target_person: targetPersonImage,
      },
    });

    return {
      video_url: result?.data?.[0]?.url || result?.output?.video_url || '',
    };
  },
};

/**
 * 通义千问适配器 — 文本 (已在 prompt-enhance 中使用)
 */
export const QwenAdapter = {
  name: 'tongyi_qwen',
  category: 'text',

  async chat({ systemPrompt, userPrompt, maxTokens = 300, temperature = 0.7 }) {
    const result = await routeModel({
      mode: 'single',
      modelKey: 'tongyi_qwen',
      taskType: 'text_gen',
      params: {
        model: 'qwen-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
      },
    });

    return {
      text: result?.choices?.[0]?.message?.content || result?.output?.text || '',
    };
  },
};
