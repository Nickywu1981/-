/**
 * ADK Agent #3 — 素材扩图 Agent（扩展力）
 * "白底图自动批量生成多主图、多角度图、多场景图、卖点细节图、分镜图"
 *
 * 核心能力：
 *   1) 白底图生成 → 2) 多角度扩展 → 3) 多场景扩展 → 4) 卖点细节图 → 5) 分镜图
 */
import { BaseAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';
import logger from '../../utils/logger.js';
import { batchImageGen } from '../tools/ai/gateway-image-batch.js';

// ==================== 工具定义 ====================

const whiteBgTool = new FunctionTool('generate_white_bg', async (params) => {
  const { generateWhiteBg } = await import('../../services/backgroundRemovalService.js');
  return generateWhiteBg({
    imageUrl: params.imageUrl,
    productName: params.productName || '',
    size: params.size || '1024x1024',
  });
}, {
  description: '商品图→纯白背景图（电商标准白底）',
  parameters: {
    imageUrl: { type: 'string', description: '原始商品图URL' },
    productName: { type: 'string', description: '商品名称' },
    size: { type: 'string', description: '输出尺寸' },
  },
});

const multiAngleTool = new FunctionTool('expand_angles', async (params) => {
  const angles = ['front', 'side_left', 'side_right', 'back', '45_degree', 'detail_closeup'];
  const count = params.count || 4;
  const selected = angles.slice(0, count);

  const items = selected.map(angle => ({
    key: angle,
    label: angle,
    prompt: `professional e-commerce product photography, ${angle} view, pure white background #FFFFFF, studio lighting, product centered, ultra high resolution, commercial quality${params.productName ? `, product: ${params.productName}` : ''}`,
    size: params.size || '1024x1024',
  }));

  const result = await batchImageGen(items, { source: 'expand_angles' });
  return { type: 'multi_angle', angles: selected, images: result.images.map((img, i) => ({ angle: selected[i], ...img })) };
}, {
  description: '白底图→多角度图（正面/侧面/背面/45°）',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    size: { type: 'string', description: '输出尺寸' },
    count: { type: 'number', description: '角度数量(2-6)' },
  },
});

const sceneTool = new FunctionTool('expand_scenes', async (params) => {
  const scenes = params.scenes || ['modern_living_room', 'minimalist_studio', 'outdoor_natural'];

  const items = scenes.map(scene => ({
    key: scene,
    label: scene,
    prompt: `professional e-commerce lifestyle photography, ${params.productName || 'product'} in ${scene.replace(/_/g, ' ')}, natural lighting, commercial quality, realistic setting`,
    size: params.size || '1024x1024',
  }));

  const result = await batchImageGen(items, { source: 'expand_scenes' });
  return { type: 'scene_images', scenes, images: result.images.map((img, i) => ({ scene: scenes[i], ...img })) };
}, {
  description: '生成多场景使用图（客厅/工作室/户外等）',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    scenes: { type: 'string', description: '场景列表JSON数组' },
    size: { type: 'string', description: '输出尺寸' },
  },
});

const detailShotTool = new FunctionTool('expand_detail_shots', async (params) => {
  const details = ['material_texture', 'craftsmanship_detail', 'size_comparison', 'feature_highlight'];

  const items = details.map(d => ({
    key: d,
    label: d,
    prompt: `extreme close-up e-commerce product photography, ${d.replace(/_/g, ' ')}, ${params.productName || 'product'}, macro lens, ultra detailed, studio lighting, pure white background`,
    size: params.size || '1024x1024',
  }));

  const result = await batchImageGen(items, { source: 'expand_details' });
  return { type: 'detail_shots', details, images: result.images.map((img, i) => ({ detail: details[i], ...img })) };
}, {
  description: '生成卖点细节图（材质/工艺/尺寸/功能亮点）',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    size: { type: 'string', description: '输出尺寸' },
  },
});

// ==================== Agent 定义 ====================

export class ExpandAgent extends BaseAgent {
  constructor() {
    super({
      name: 'expand',
      description: '扩展力 — 素材扩图（白底→多角度→多场景→细节→分镜）',
      tools: [whiteBgTool, multiAngleTool, sceneTool, detailShotTool],
      outputKey: 'expand_result',
    });
  }

  async _runAsyncImpl(ctx) {
    const state = ctx.session.state.getAll();
    const userInput = state.userInput || '';
    const productName = state.productName || '';
    const imageUrl = state.imageUrl || state.referenceImageUrl || '';
    const platform = state.platform || 'taobao';
    const industry = state.industry || 'clothing';

    logger.info('[ExpandAgent] Starting material expansion', { productName, hasImage: !!imageUrl });

    const results = { whiteBg: null, angles: null, scenes: null, details: null };

    // Step 1: 白底图（如有原始图）
    if (imageUrl) {
      try {
        results.whiteBg = await whiteBgTool.fn({ imageUrl, productName, size: '1024x1024' });
        logger.info('[ExpandAgent] White BG generated');
      } catch (err) {
        logger.warn('[ExpandAgent] White BG failed:', err.message);
      }
    }

    // Step 2: 多角度扩展
    try {
      results.angles = await multiAngleTool.fn({
        productName: productName || userInput,
        size: '1024x1024',
        count: 4,
      });
    } catch (err) {
      logger.warn('[ExpandAgent] Multi-angle failed:', err.message);
    }

    // Step 3: 多场景扩展
    try {
      const industryScenes = {
        clothing: ['modern_studio', 'urban_street', 'natural_park'],
        beauty: ['minimalist_bathroom', 'vanity_table', 'spa_setting'],
        '3c_digital': ['modern_desk', 'coffee_shop', 'minimalist_office'],
        food: ['rustic_kitchen', 'dining_table', 'natural_light'],
        home: ['modern_living_room', 'scandinavian_bedroom', 'sunlit_balcony'],
      };
      const scenes = industryScenes[industry] || industryScenes.clothing;

      results.scenes = await sceneTool.fn({
        productName: productName || userInput,
        scenes,
        size: '1024x1024',
      });
    } catch (err) {
      logger.warn('[ExpandAgent] Scene expansion failed:', err.message);
    }

    // Step 4: 卖点细节图
    try {
      results.details = await detailShotTool.fn({
        productName: productName || userInput,
        size: '1024x1024',
      });
    } catch (err) {
      logger.warn('[ExpandAgent] Detail shots failed:', err.message);
    }

    const summary = {
      generated: {
        whiteBg: !!results.whiteBg?.whiteBgUrl,
        angles: results.angles?.images?.filter(i => i.url)?.length || 0,
        scenes: results.scenes?.images?.filter(i => i.url)?.length || 0,
        details: results.details?.images?.filter(i => i.url)?.length || 0,
      },
      allUrls: [],
    };

    // 收集所有URL
    if (results.whiteBg?.whiteBgUrl) summary.allUrls.push({ type: 'white_bg', url: results.whiteBg.whiteBgUrl });
    (results.angles?.images || []).forEach(i => i.url && summary.allUrls.push({ type: 'angle', label: i.angle, url: i.url }));
    (results.scenes?.images || []).forEach(i => i.url && summary.allUrls.push({ type: 'scene', label: i.scene, url: i.url }));
    (results.details?.images || []).forEach(i => i.url && summary.allUrls.push({ type: 'detail', label: i.detail, url: i.url }));

    logger.info('[ExpandAgent] Complete', summary.generated);
    return summary;
  }
}

export const expandAgent = new ExpandAgent();
