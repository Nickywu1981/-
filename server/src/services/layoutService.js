/**
 * 自动排版服务 — 详情页模块智能组装
 *
 * 将详情页模块(图片+文案)按布局模板自动排版输出
 *
 * 布局风格:
 *   standard_9_section — 标准九宫格详情页 (淘宝/天猫通用)
 *   waterfall           — 瀑布流叙事 (小红书/生活方式品牌)
 *   magazine            — 杂志编辑风 (高端品牌/时尚)
 *   card_grid           — 卡片网格 (3C数码/多SKU)
 */
import logger from '../utils/logger.js';

// ==================== 模块定义 ====================

const MODULE_SPECS = {
  header_banner:    { width: 750, height: 600, role: 'hero',    weight: 10, fullWidth: true },
  feature_showcase: { width: 750, height: 800, role: 'feature', weight: 8,  fullWidth: true },
  specs_table:      { width: 750, height: 600, role: 'info',    weight: 5,  fullWidth: true },
  detail_showcase:  { width: 750, height: 800, role: 'detail',  weight: 7,  fullWidth: true },
  scene_demo:       { width: 750, height: 800, role: 'scene',   weight: 6,  fullWidth: true },
  footer_cta:       { width: 750, height: 400, role: 'cta',     weight: 4,  fullWidth: true },
};

// ==================== 布局模板 ====================

const LAYOUT_TEMPLATES = {
  standard_9_section: {
    name: '标准九宫格',
    description: '天猫/淘宝通用详情页布局',
    sections: [
      { name: '顶部大图', order: 0, modules: ['header_banner'], style: 'full_width', height: 600 },
      { name: '核心卖点区', order: 1, modules: ['feature_showcase'], style: 'split_left', ratio: '6:4', height: 800, companion: { type: 'text', key: 'selling_points', title: '核心卖点' } },
      { name: '规格参数区', order: 2, modules: ['specs_table'], style: 'full_width', height: 600 },
      { name: '细节展示区', order: 3, modules: ['detail_showcase'], style: 'full_width', height: 800 },
      { name: '场景演示区', order: 4, modules: ['scene_demo'], style: 'full_width', height: 800 },
      { name: '底部CTA', order: 5, modules: ['footer_cta'], style: 'full_width', height: 400 },
    ],
    totalHeight: 4000,
    spacing: 12,
    backgroundColor: '#f5f5f5',
    textColor: '#333333',
    accentColor: '#ff5000',
  },

  waterfall: {
    name: '瀑布流叙事',
    description: '小红书/生活方式品牌风格',
    sections: [
      { name: '氛围头图', order: 0, modules: ['scene_demo'], style: 'full_width', height: 900 },
      { name: '产品亮相', order: 1, modules: ['header_banner'], style: 'centered', width: '80%', height: 600 },
      { name: '卖点讲述', order: 2, modules: ['feature_showcase'], style: 'full_width', height: 800, companion: { type: 'text', key: 'selling_points', title: '为什么选择我们' } },
      { name: '细节放大', order: 3, modules: ['detail_showcase'], style: 'full_width', height: 800 },
      { name: '规格说明', order: 4, modules: ['specs_table'], style: 'full_width', height: 600 },
      { name: '行动召唤', order: 5, modules: ['footer_cta'], style: 'full_width', height: 400 },
    ],
    totalHeight: 4100,
    spacing: 24,
    backgroundColor: '#ffffff',
    textColor: '#2c2c2c',
    accentColor: '#e60044',
  },

  magazine: {
    name: '杂志编辑风',
    description: '高端品牌/时尚/美妆',
    sections: [
      { name: '封面大图', order: 0, modules: ['header_banner'], style: 'full_bleed', height: 1000 },
      { name: '品牌故事', order: 1, modules: ['scene_demo'], style: 'full_width', height: 800, companion: { type: 'text', key: 'brand_story', title: '品牌故事' } },
      { name: '产品特写', order: 2, modules: ['detail_showcase'], style: 'grid_2col', height: 600 },
      { name: '设计哲学', order: 3, modules: ['feature_showcase'], style: 'split_right', ratio: '4:6', height: 700, companion: { type: 'text', key: 'selling_points', title: '设计亮点' } },
      { name: '技术规格', order: 4, modules: ['specs_table'], style: 'inset', width: '85%', height: 500 },
      { name: '尾页', order: 5, modules: ['footer_cta'], style: 'full_width', height: 500 },
    ],
    totalHeight: 4100,
    spacing: 0,
    backgroundColor: '#1a1a1a',
    textColor: '#e0e0e0',
    accentColor: '#d4af37',
  },

  card_grid: {
    name: '卡片网格',
    description: '3C数码/多SKU产品',
    sections: [
      { name: '产品大图', order: 0, modules: ['header_banner'], style: 'full_width', height: 600 },
      { name: '功能卡片', order: 1, modules: ['detail_showcase', 'feature_showcase'], style: 'grid_2col', height: 500, companion: { type: 'text_list', key: 'selling_points', title: '功能亮点' } },
      { name: '场景卡片', order: 2, modules: ['scene_demo', 'specs_table'], style: 'grid_2col', height: 500 },
      { name: '底部CTA', order: 3, modules: ['footer_cta'], style: 'full_width', height: 350 },
    ],
    totalHeight: 1950,
    spacing: 8,
    backgroundColor: '#f8f9fa',
    textColor: '#212529',
    accentColor: '#0066cc',
  },
};

// ==================== 主入口 ====================

/**
 * 自动排版
 *
 * @param {object} ctx      引擎上下文 { modules, sellingPoints, productName, industry, style }
 * @param {object} [opts]   排版选项
 * @param {string} [opts.layoutStyle]  布局风格 (standard_9_section|waterfall|magazine|card_grid)
 * @param {number} [opts.viewportWidth] 视口宽度 (默认 750)
 * @returns {{ layout, html, sections, totalHeight, style }}
 */
export function autoLayout(ctx, opts = {}) {
  const modules = ctx.modules || ctx.detailModules || [];
  const sellingPoints = ctx.sellingPoints || [];
  const productName = ctx.productName || '商品详情';
  const industry = ctx.industry || 'clothing';

  // 智能布局选择
  let layoutStyle = opts.layoutStyle || _inferLayoutStyle(industry, ctx.style);
  const template = LAYOUT_TEMPLATES[layoutStyle] || LAYOUT_TEMPLATES.standard_9_section;

  // 构建模块索引
  const moduleMap = {};
  for (const m of modules) {
    const key = m.key || m.name || m.type || '';
    moduleMap[key] = m;
  }

  // 组装排版段
  const sections = template.sections.map(section => {
    const filled = {
      name: section.name,
      order: section.order,
      style: section.style,
      height: section.height,
      modules: [],
      companion: null,
    };

    // 填充模块
    for (const modKey of section.modules) {
      const mod = moduleMap[modKey];
      const spec = MODULE_SPECS[modKey] || { width: 750, height: 600 };
      filled.modules.push({
        key: modKey,
        url: mod?.url || null,
        width: section.style === 'grid_2col' ? 365 : (section.width ? parseInt(section.width) : spec.width),
        height: section.height || spec.height,
        role: spec.role || 'content',
      });
    }

    // 文案伴随
    if (section.companion) {
      const comp = section.companion;
      filled.companion = {
        type: comp.type,
        title: comp.title,
        content: comp.type === 'text_list'
          ? (Array.isArray(sellingPoints) ? sellingPoints : [])
          : (typeof sellingPoints === 'string' ? sellingPoints : (Array.isArray(sellingPoints) ? sellingPoints.join('；') : '')),
      };
    }

    return filled;
  });

  // 生成HTML
  const html = _generateHtml(sections, productName, template);

  const result = {
    layout: {
      style: layoutStyle,
      styleName: template.name,
      sections,
      totalHeight: template.totalHeight,
      spacing: template.spacing,
      colors: {
        bg: template.backgroundColor,
        text: template.textColor,
        accent: template.accentColor,
      },
    },
    html,
    totalModules: sections.reduce((sum, s) => sum + s.modules.length, 0),
    productName,
  };

  logger.info('[LayoutService] Auto layout generated', {
    style: layoutStyle,
    sections: sections.length,
    modules: result.totalModules,
  });

  return result;
}

// ==================== HTML 生成 ====================

function _generateHtml(sections, productName, template) {
  const sectionHtml = sections.map(s => {
    const mods = s.modules.map(m => {
      if (m.url) {
        return `<div class="module module-${m.role}" style="width:${m.width}px;height:${m.height}px;background:url(${m.url}) center/cover no-repeat;"></div>`;
      }
      return `<div class="module module-${m.role} module-placeholder" style="width:${m.width}px;height:${m.height}px;background:#eee;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">[${m.key}]</div>`;
    }).join('\n');

    const companion = s.companion ? `
        <div class="companion companion-${s.companion.type}">
          <h3>${s.companion.title}</h3>
          ${Array.isArray(s.companion.content)
            ? `<ul>${s.companion.content.map(c => `<li>${c}</li>`).join('')}</ul>`
            : `<p>${s.companion.content}</p>`
          }
        </div>` : '';

    return `<section class="section section-${s.style}" style="margin-bottom:${template.spacing}px">
      <div class="section-inner">${mods}</div>
      ${companion}
    </section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=750"><title>${productName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:750px;margin:0 auto;background:${template.backgroundColor};color:${template.textColor};font-family:-apple-system,PingFang SC,Microsoft YaHei,sans-serif}
  .section{overflow:hidden}
  .section-inner{display:flex;flex-wrap:wrap}
  .section.grid_2col .section-inner{gap:${template.spacing}px;padding:0 ${template.spacing}px}
  .section.grid_2col .module{flex:0 0 calc(50% - ${template.spacing / 2}px)}
  .section.centered .section-inner{justify-content:center}
  .section.split_left .section-inner,.section.split_right .section-inner{gap:${template.spacing}px}
  .companion{padding:24px 20px}
  .companion h3{font-size:20px;font-weight:700;margin-bottom:12px;color:${template.accentColor}}
  .companion p{font-size:15px;line-height:1.8}
  .companion ul{list-style:none;padding:0}
  .companion li{font-size:15px;line-height:2;padding-left:16px;position:relative}
  .companion li::before{content:'·';position:absolute;left:0;color:${template.accentColor};font-weight:700}
  .module{background-size:cover;background-position:center}
  .module-placeholder{border:1px dashed #ddd}
</style></head>
<body>${sectionHtml}</body></html>`;
}

// ==================== 智能布局选择 ====================

function _inferLayoutStyle(industry, style) {
  if (style === 'magazine' || style === 'elegant') return 'magazine';
  if (style === 'waterfall' || style === 'lifestyle') return 'waterfall';
  if (style === 'card' || style === 'modern') return 'card_grid';

  const industryDefaults = {
    clothing:  'waterfall',
    beauty:    'magazine',
    '3c_digital': 'card_grid',
    food:      'waterfall',
    home:      'magazine',
  };
  return industryDefaults[industry] || 'standard_9_section';
}

export default { autoLayout };
