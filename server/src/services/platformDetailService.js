/**
 * 13大平台详情页模板配置
 * 每个平台有独特的详情页布局规范和模板
 */
const PLATFORM_DETAIL_TEMPLATES = {
  // ===== 国内平台 =====
  taobao: {
    name: '淘宝', region: 'cn', defaultLang: 'zh',
    specs: { maxWidth: 750, maxHeight: 0, maxSizeKB: 3072, supportedFormats: ['jpg', 'png', 'gif'] },
    sections: ['品牌故事', '产品主图', '规格参数', '细节展示', '使用场景', '售后保障'],
    templates: [
      { id: 'tb_std', name: '淘宝标准版', style: '图文混排+参数表', modules: ['header_brand', 'product_gallery', 'spec_table', 'detail_images', 'footer_service'] },
      { id: 'tb_brand', name: '品牌旗舰版', style: '大图+品牌故事', modules: ['hero_banner', 'brand_story', 'product_showcase', 'detail_closeup', 'brand_footer'] },
      { id: 'tb_promo', name: '促销活动版', style: '优惠券+限时', modules: ['coupon_bar', 'promo_banner', 'product_grid', 'countdown', 'detail_mix'] },
    ],
  },
  douyin: {
    name: '抖音', region: 'cn', defaultLang: 'zh',
    specs: { maxWidth: 1080, maxHeight: 1920, maxSizeKB: 5120, supportedFormats: ['jpg', 'png', 'webp'] },
    sections: ['封面视频', '卖点海报', '产品详情', '使用教程', '好评截图', '购买入口'],
    templates: [
      { id: 'dy_shop', name: '抖音小店标准', style: '竖版滑动+视频', modules: ['cover_video', 'selling_points', 'product_detail', 'reviews_screenshot', 'cta_button'] },
      { id: 'dy_live', name: '直播带货版', style: '直播切片+种草', modules: ['live_clip', 'influencer_quote', 'product_highlight', 'limited_offer', 'cart_link'] },
    ],
  },
  pdd: {
    name: '拼多多', region: 'cn', defaultLang: 'zh',
    specs: { maxWidth: 800, maxHeight: 0, maxSizeKB: 2048, supportedFormats: ['jpg', 'png'] },
    sections: ['价格标签', '产品主图', '对比优势', '细节展示', '拼团入口'],
    templates: [
      { id: 'pdd_std', name: '拼多多标准版', style: '价格突出+拼团', modules: ['price_tag', 'product_main', 'compare_chart', 'detail_grid', 'group_buy_cta'] },
    ],
  },
  xiaohongshu: {
    name: '小红书', region: 'cn', defaultLang: 'zh',
    specs: { maxWidth: 1080, maxHeight: 1440, maxSizeKB: 5120, supportedFormats: ['jpg', 'png', 'webp'] },
    sections: ['种草封面', '使用体验', '产品细节', '效果对比', '购买链接'],
    templates: [
      { id: 'xhs_note', name: '种草笔记版', style: '3:4竖版+滤镜', modules: ['lifestyle_cover', 'experience_share', 'detail_photos', 'before_after', 'shopping_link'] },
      { id: 'xhs_brand', name: '品牌号专业版', style: '品牌调性+场景', modules: ['brand_intro', 'scene_photos', 'product_features', 'user_stories', 'official_store'] },
    ],
  },
  shipinhao: {
    name: '视频号', region: 'cn', defaultLang: 'zh',
    specs: { maxWidth: 1080, maxHeight: 1920, maxSizeKB: 5120, supportedFormats: ['jpg', 'png', 'webp'] },
    sections: ['视频封面', '产品简介', '详情图文', '公众号关联'],
    templates: [
      { id: 'wx_std', name: '微信视频号标准', style: '视频+图文', modules: ['video_cover', 'product_intro', 'detail_images', 'official_account_link'] },
    ],
  },
  // ===== 跨境平台 =====
  amazon: {
    name: '亚马逊', region: 'global', defaultLang: 'en',
    specs: { maxWidth: 2000, maxHeight: 2000, maxSizeKB: 10240, supportedFormats: ['jpg', 'png', 'tiff'] },
    sections: ['Main Image', 'Infographic', 'Features', 'Dimensions', 'Lifestyle', 'Comparison'],
    templates: [
      { id: 'amz_std', name: 'Amazon Standard', style: 'White bg + infographic', modules: ['pure_white_bg', 'infographic_1', 'feature_callouts', 'dimension_chart', 'lifestyle_shot', 'comp_chart'] },
      { id: 'amz_aplus', name: 'A+ Content', style: 'Premium brand storytelling', modules: ['hero_banner', 'brand_story', 'feature_modules', 'comparison_table', 'lifestyle_grid'] },
      { id: 'amz_premium', name: 'A+ Premium', style: 'Interactive + video', modules: ['video_header', 'interactive_hotspots', 'carousel_module', 'qa_module', 'enhanced_comparison'] },
    ],
  },
  temu: {
    name: 'Temu', region: 'global', defaultLang: 'en',
    specs: { maxWidth: 1000, maxHeight: 1000, maxSizeKB: 3072, supportedFormats: ['jpg', 'png'] },
    sections: ['Price Badge', 'Product Photos', 'Size Guide', 'Details', 'Reviews'],
    templates: [
      { id: 'temu_std', name: 'Temu Standard', style: 'Price-first layout', modules: ['price_badge', 'product_grid', 'size_chart', 'detail_photos', 'review_cards'] },
    ],
  },
  shein: {
    name: 'Shein', region: 'global', defaultLang: 'en',
    specs: { maxWidth: 1200, maxHeight: 1600, maxSizeKB: 5120, supportedFormats: ['jpg', 'png', 'webp'] },
    sections: ['Model Shot', 'Fabric Detail', 'Size Guide', 'Style Tips'],
    templates: [
      { id: 'shein_fashion', name: 'Shein Fashion', style: '3:4 model-focused', modules: ['model_fullbody', 'fabric_closeup', 'size_guide', 'style_suggestions', 'size_color_variants'] },
    ],
  },
  tiktok: {
    name: 'TikTok Shop', region: 'global', defaultLang: 'en',
    specs: { maxWidth: 1080, maxHeight: 1920, maxSizeKB: 5120, supportedFormats: ['jpg', 'png', 'webp'] },
    sections: ['Video Cover', 'Highlights', 'Details', 'Reviews'],
    templates: [
      { id: 'tt_shop', name: 'TikTok Shop', style: 'Short video + product cards', modules: ['video_thumbnail', 'key_features', 'product_photos', 'review_highlights', 'shop_link'] },
    ],
  },
  mercado: {
    name: '美客多', region: 'latam', defaultLang: 'es',
    specs: { maxWidth: 1000, maxHeight: 1000, maxSizeKB: 3072, supportedFormats: ['jpg', 'png'] },
    sections: ['Foto Principal', 'Caracteristicas', 'Medidas', 'Garantia'],
    templates: [
      { id: 'meli_std', name: 'Mercado Libre', style: 'Clean white bg, ES copy', modules: ['foto_principal', 'caracteristicas', 'tabla_medidas', 'garantia_sello'] },
    ],
  },
  ozon: {
    name: 'Ozon', region: 'cis', defaultLang: 'ru',
    specs: { maxWidth: 900, maxHeight: 900, maxSizeKB: 3072, supportedFormats: ['jpg', 'png'] },
    sections: ['Главное фото', 'Характеристики', 'Комплектация', 'Отзывы'],
    templates: [
      { id: 'ozon_std', name: 'Ozon Standard', style: 'Infographic RU style', modules: ['glavnoe_foto', 'harakteristiki', 'komplektaciya', 'reviews_block'] },
    ],
  },
  shopee: {
    name: 'Shopee', region: 'sea', defaultLang: 'en',
    specs: { maxWidth: 800, maxHeight: 800, maxSizeKB: 2048, supportedFormats: ['jpg', 'png'] },
    sections: ['Cover Photo', 'Product Details', 'Specifications', 'Warranty'],
    templates: [
      { id: 'shopee_std', name: 'Shopee Standard', style: 'SEA marketplace style', modules: ['cover_photo', 'product_detail', 'spec_list', 'shop_badge', 'voucher_banner'] },
    ],
  },
  lazada: {
    name: 'Lazada', region: 'sea', defaultLang: 'en',
    specs: { maxWidth: 800, maxHeight: 800, maxSizeKB: 2048, supportedFormats: ['jpg', 'png'] },
    sections: ['Hero Image', 'Description', 'Specs', 'Delivery Info'],
    templates: [
      { id: 'laz_std', name: 'Lazada Standard', style: 'SEA ecommerce style', modules: ['hero_image', 'rich_description', 'spec_table', 'delivery_banner', 'lazmall_badge'] },
    ],
  },
};

/** 获取所有平台模板列表 */
export function listAllPlatforms() {
  return Object.entries(PLATFORM_DETAIL_TEMPLATES).map(([code, p]) => ({
    code,
    name: p.name,
    region: p.region,
    defaultLang: p.defaultLang,
    templateCount: p.templates.length,
  }));
}

/** 获取单个平台完整配置 */
export function getPlatformConfig(code) {
  return PLATFORM_DETAIL_TEMPLATES[code] || null;
}

/** 获取平台支持的片区 */
export function getPlatformsByRegion(region) {
  return Object.entries(PLATFORM_DETAIL_TEMPLATES)
    .filter(([, p]) => p.region === region)
    .map(([code, p]) => ({ code, name: p.name, templates: p.templates }));
}

export default { listAllPlatforms, getPlatformConfig, getPlatformsByRegion, PLATFORM_DETAIL_TEMPLATES };
