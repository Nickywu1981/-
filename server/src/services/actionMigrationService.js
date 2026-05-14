/**
 * Action Migration Service — 动作迁移服务
 *
 * 将参考视频/图片中的模特动作提取并迁移到目标商品图上
 * 基于现有 videoService + gatewayRoute 的 WAN 模型
 */
import { gatewayRoute } from '../gateway/aiGatewayHub.js';
import { injectReversePrompt } from './promptParser.js';
import logger from '../utils/logger.js';

/**
 * 提交动作迁移任务
 * @param {object} params
 * @param {string} params.sourceVideo 源动作视频URL（提供动作骨架）
 * @param {string} params.productImage 目标商品图URL
 * @param {object} params.options { duration, style, outputFormat }
 */
export async function migrateAction(params) {
  const { sourceVideo, productImage, options = {} } = params;
  const { duration = 10, style = 'ecommerce', outputFormat = 'mp4' } = options;

  const basePrompt = `Action migration: extract motion pattern from source video and apply to the product image.
Maintain natural product presentation, e-commerce quality, smooth movement.
Product should stay centered, motion should be subtle and professional.`;

  const { positive, negative } = injectReversePrompt({
    prompt: basePrompt,
    intentId: 'action_migrate',
    category: 'video',
  });

  try {
    const result = await gatewayRoute({
      mode: 'single',
      taskType: 'video_gen',
      params: {
        model: 'wan-i2v',
        messages: [{ role: 'user', content: positive }],
        image_url: productImage,
        video_url: sourceVideo,
        duration,
        negative_prompt: negative,
        style: style === 'ecommerce' ? 'professional_ecommerce' : 'casual',
        output_format: outputFormat,
      },
    });

    logger.info('[ActionMigration] task completed', { duration });
    return {
      url: result?.output?.data?.[0]?.url || result?.output?.url,
      duration,
      format: outputFormat,
      prompts: { positive, negative },
      status: 'done',
    };
  } catch (err) {
    logger.error('[ActionMigration] failed', err.message);
    throw err;
  }
}

export default { migrateAction };
