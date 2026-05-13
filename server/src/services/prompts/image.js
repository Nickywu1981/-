/**
 * 电商图片类提示词模板
 * 覆盖：商品主图 / 场景图 / 营销海报 / 详情图
 */
export const image = {
  main_image: {
    description: '商品主图生成（白底/透明底）',
    system: '你是资深电商摄影师，专精商品主图拍摄与后期。',
    template: `Generate a professional e-commerce product main image.

Product: {productName}
Category: {category}
Style: {style}
Platform requirements: {platform}

Requirements:
- Pure white/transparent background
- Product occupies 80-90% of frame
- Sharp focus, studio lighting
- Front/slightly angled view
- Resolution: {resolution}
- No watermarks, no logos, no text overlay
- Color accurate, true to product`,
    params: ['productName', 'category', 'style', 'platform'],
    defaults: { style: 'clean studio', resolution: '2048x2048', platform: '通用' },
  },

  scene_image: {
    description: '商品场景图/模特图生成',
    system: '你是资深电商场景摄影师，擅长生活方式场景搭建与构图。',
    template: `Generate an e-commerce lifestyle scene image.

Product: {productName}
Scene: {scene}
Style: {style}
Mood: {mood}

Requirements:
- Natural lighting, lifestyle setting
- Product clearly visible in context
- {platform} platform style
- Composition: {composition}
- Color palette: {colorPalette}
- Authentic, relatable atmosphere`,
    params: ['productName', 'scene', 'style', 'mood', 'platform'],
    defaults: { scene: 'modern home', style: 'lifestyle', mood: 'warm natural', composition: 'rule of thirds', colorPalette: 'neutral warm', platform: '通用' },
  },

  poster: {
    description: '营销海报/活动图生成',
    system: '你是资深电商视觉设计师，专注高转化营销海报设计。',
    template: `Design a marketing poster for e-commerce.

Product: {productName}
Campaign: {campaign}
Platform: {platform}
Target audience: {audience}

Requirements:
- Strong visual hierarchy
- Prominent product placement
- Clear call-to-action area
- {platform} optimal dimensions
- Brand color consistency
- Eye-catching but not cluttered
- Text-safe zones preserved
- Festival/seasonal elements if applicable`,
    params: ['productName', 'campaign', 'platform', 'audience'],
    defaults: { campaign: '新品上市', platform: 'taobao', audience: 'general' },
  },

  detail_image: {
    description: '商品详情图/描述图生成',
    system: '你是资深电商详情页设计师，擅长产品卖点可视化与信息图设计。',
    template: `Create a product detail image for e-commerce.

Product: {productName}
Feature to highlight: {feature}
Specifications: {specs}
Platform: {platform}

Requirements:
- Clean information layout
- Feature clearly visualized
- Specifications formatted neatly
- Comparison before/after if applicable
- Dimensions: {platform} detail page spec
- Consistent brand style
- Readable text size
- Icons/graphics to aid comprehension`,
    params: ['productName', 'feature', 'specs', 'platform'],
    defaults: { platform: 'taobao' },
  },
};
