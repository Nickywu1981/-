/**
 * ADK Agent #4 — 详情页 Agent（排版力）
 * "自动生成详情页全套模块图、卖点文案、参数文案、自动排版"
 *
 * 能力：
 *   1) 商品信息提取 → 2) 详情模块图生成 → 3) 卖点文案 → 4) 参数表 → 5) 排版组装
 */
import { BaseAgent } from '../core/agent.js';
import { FunctionTool } from '../core/tool.js';
import logger from '../../utils/logger.js';

// ==================== 工具定义 ====================

const productInfoTool = new FunctionTool('extract_product_info', async (params) => {
  const { extractProductInfo } = await import('../../services/detail-image.service.js');
  return extractProductInfo(params.userId, { imageUrl: params.imageUrl });
}, {
  description: '从商品图片提取产品信息（名称/品类/特征）',
  parameters: {
    imageUrl: { type: 'string', description: '商品图URL' },
    userId: { type: 'number', description: '用户ID' },
  },
});

const modulesTool = new FunctionTool('create_detail_modules', async (params) => {
  const { gatewayInfer } = await import('../../gateway/aiGatewayHub.js');

  // 详情页标准模块
  const modules = [
    { key: 'header_banner', name: '头图banner', prompt: `e-commerce product detail page header banner, ${params.productName}, professional layout, brand style, 750x600` },
    { key: 'feature_showcase', name: '核心卖点展示', prompt: `e-commerce product feature showcase module, ${params.productName}, key features: ${params.sellingPoints || 'high quality'}, clean design, 750x800` },
    { key: 'specs_table', name: '规格参数', prompt: `e-commerce product specifications table module, ${params.productName}, specs: ${params.specs || 'standard'}, infographic style, 750x600` },
    { key: 'detail_showcase', name: '细节展示', prompt: `e-commerce product detail showcase, ${params.productName}, material and craftsmanship close-up, 750x800` },
    { key: 'scene_demo', name: '场景演示', prompt: `e-commerce product lifestyle scene demonstration, ${params.productName} in real usage scenario, 750x800` },
    { key: 'footer_cta', name: '底部行动号召', prompt: `e-commerce product detail page footer with CTA, ${params.productName}, buy now button, trust badges, 750x400` },
  ];

  const results = await Promise.allSettled(modules.map(m =>
    gatewayInfer('gpt-image-2', {
      prompt: m.prompt,
      size: '1024x1024',
    }, { taskType: 'image_gen', source: 'detail_module' })
  ));

  return {
    type: 'detail_modules',
    modules: results.map((r, i) => ({
      key: modules[i].key,
      name: modules[i].name,
      url: r.status === 'fulfilled' ? (r.value?.images?.[0]?.url || r.value?.url) : null,
    })),
  };
}, {
  description: '生成详情页全套模块图（6模块：头图/卖点/参数/细节/场景/CTA）',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    sellingPoints: { type: 'string', description: '核心卖点' },
    specs: { type: 'string', description: '规格参数' },
  },
});

const sellingPointsTool = new FunctionTool('generate_selling_points', async (params) => {
  const { gatewayRoute } = await import('../../gateway/aiGatewayHub.js');

  const prompt = `你是一个电商文案专家。为以下商品生成${params.count || 5}条核心卖点文案：

商品名称: ${params.productName}
目标平台: ${params.platform || 'taobao'}
语言: zh-CN

要求:
- 每条卖点简洁有力（15-30字）
- 突出产品核心优势
- 符合平台风格
- 避免夸大和违禁词

返回JSON格式: { "sellingPoints": ["卖点1", "卖点2", ...] }`;

  const result = await gatewayRoute({
    mode: 'single',
    taskType: 'text_gen',
    params: {
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 500,
    },
  });

  const raw = result?.output?.choices?.[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : { sellingPoints: [] };
}, {
  description: '生成商品卖点文案',
  parameters: {
    productName: { type: 'string', description: '商品名称' },
    platform: { type: 'string', description: '目标平台' },
    count: { type: 'number', description: '卖点数量' },
  },
});

// ==================== Agent 定义 ====================

export class DetailPageAgent extends BaseAgent {
  constructor() {
    super({
      name: 'detail_page',
      description: '排版力 — 详情页全套生成（模块图+卖点+参数+排版）',
      tools: [productInfoTool, modulesTool, sellingPointsTool],
      outputKey: 'detail_result',
    });
  }

  async _runAsyncImpl(ctx) {
    const state = ctx.session.state.getAll();
    const productName = state.productName || '';
    const sellingPoints = state.sellingPoints || '';
    const specs = state.specs || '';
    const platform = state.platform || 'taobao';
    const userId = state.userId;

    logger.info('[DetailPageAgent] Starting detail page creation', { productName, platform });

    const result = { productInfo: null, modules: null, sellingPoints: null, layout: null };

    // Step 1: 提取产品信息（如有图片）
    if (state.imageUrl && userId) {
      try {
        result.productInfo = await productInfoTool.fn({ imageUrl: state.imageUrl, userId });
        logger.info('[DetailPageAgent] Product info extracted');
      } catch (err) {
        logger.warn('[DetailPageAgent] Product info extraction failed:', err.message);
      }
    }

    // Step 2: 生成详情页模块图
    try {
      result.modules = await modulesTool.fn({
        productName: productName || state.userInput || '商品',
        sellingPoints: sellingPoints || '',
        specs: specs || '',
      });
    } catch (err) {
      logger.warn('[DetailPageAgent] Modules generation failed:', err.message);
    }

    // Step 3: 生成卖点文案
    try {
      const points = await sellingPointsTool.fn({
        productName: productName || state.userInput || '商品',
        platform,
        count: 5,
      });
      result.sellingPoints = points?.sellingPoints || points?.points || [];
    } catch (err) {
      logger.warn('[DetailPageAgent] Selling points generation failed:', err.message);
    }

    // Step 4: 排版组装
    result.layout = {
      order: ['header_banner', 'feature_showcase', 'specs_table', 'detail_showcase', 'scene_demo', 'footer_cta'],
      title: productName || '商品详情',
      sellingPoints: result.sellingPoints || [],
      moduleCount: result.modules?.modules?.filter(m => m.url)?.length || 0,
    };

    logger.info('[DetailPageAgent] Complete', {
      modules: result.layout.moduleCount,
      pointsCount: (result.sellingPoints || []).length,
    });

    return result;
  }
}

export const detailPageAgent = new DetailPageAgent();
