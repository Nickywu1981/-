/**
 * 背景移除提示词模板
 * 用途：智能抠图 / 白底图 / 背景替换
 */

export const bgRemoval = {
  cutout: {
    description: '电商产品智能抠图',
    template: 'Remove the background from this product image. Keep the product sharp with clean edges. Output as PNG with transparent background.',
    params: ['productType', 'edgeQuality'],
    defaults: { edgeQuality: 'sharp' },
  },

  whiteBg: {
    description: '产品白底图生成',
    template: 'Place the product on a pure white background (#FFFFFF). Studio lighting, professional product photography style. No shadows on background, even lighting.',
    params: ['productType', 'shadowStyle'],
    defaults: { shadowStyle: 'natural' },
  },

  sceneGen: {
    description: 'AI 场景生成',
    template: 'Place this product in a {scene}. Professional commercial photography, {lighting} lighting, {angle} angle. The product should look natural and well-integrated into the scene. High resolution, 4K quality.',
    params: ['scene', 'lighting', 'angle'],
    defaults: { scene: 'modern minimalist studio', lighting: 'soft natural', angle: 'front' },
  },
};

// 中文版模板
export const bgRemovalCN = {
  cutout: {
    template: '将这张产品图片的背景完全移除。保持产品边缘清晰锐利。输出透明背景 PNG 格式。',
  },
  whiteBg: {
    template: '将产品放置在纯白色背景（#FFFFFF）上。影棚灯光效果，专业产品摄影风格。背景无阴影，光线均匀。',
  },
  sceneGen: {
    template: '将此产品放置在{scene}中。专业商业摄影，{lighting}光线，{angle}角度。产品与场景自然融合。高分辨率 4K 画质。',
  },
};
