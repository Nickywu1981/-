/**
 * ADK 共享工具 — 批量图片生成辅助
 * 封装 gatewayInfer + Promise.allSettled → 统一结果格式
 *
 * 被 expandAgent / detailAgent / storyboardAgent 等多个 Agent 复用
 */
import logger from '../../../utils/logger.js';

/**
 * 并行调用 gatewayInfer 生成多张图片
 * @param {Array<{key: string, label?: string, prompt: string, size?: string}>} items 生成项列表
 * @param {object} opts 选项
 * @param {string} opts.source 来源标识 (用于日志/tracing)
 * @returns {Promise<{images: Array<{key: string, label?: string, url: string|null, status: string}>}>}
 */
export async function batchImageGen(items, opts = {}) {
  const { source = 'adk_tool' } = opts;
  const { gatewayInfer } = await import('../../../gateway/aiGatewayHub.js');

  const results = await Promise.allSettled(
    items.map(item =>
      gatewayInfer('gpt-image-2', {
        prompt: item.prompt,
        size: item.size || '1024x1024',
      }, { taskType: 'image_gen', source })
    )
  );

  const images = results.map((r, i) => {
    const value = r.status === 'fulfilled' ? r.value : null;
    return {
      key: items[i].key,
      label: items[i].label || items[i].key,
      url: value ? (value?.images?.[0]?.url || value?.url || null) : null,
      status: r.status,
    };
  });

  const successCount = images.filter(i => i.url).length;
  logger.info(`[batchImageGen] ${successCount}/${items.length} generated (source: ${source})`);

  return { images };
}
