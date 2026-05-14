// Poster page tab definitions and template data
// Centralized config to keep poster.vue lean

export const posterTabs = [
  { key: 'product', icon: '🛍️', labelKey: 'work_pages.poster.tab_product', phKey: 'work_pages.poster.tab_product_ph' },
  { key: 'holiday', icon: '🎉', labelKey: 'work_pages.poster.tab_holiday', phKey: 'work_pages.poster.tab_holiday_ph' },
  { key: 'event', icon: '📢', labelKey: 'work_pages.poster.tab_event', phKey: 'work_pages.poster.tab_event_ph' },
  { key: 'private', icon: '💬', labelKey: 'work_pages.poster.tab_private', phKey: 'work_pages.poster.tab_private_ph' },
  { key: 'xhs', icon: '📕', labelKey: 'work_pages.poster.tab_xhs', phKey: 'work_pages.poster.tab_xhs_ph' },
  { key: 'wechat', icon: '💚', labelKey: 'work_pages.poster.tab_wechat', phKey: 'work_pages.poster.tab_wechat_ph' },
] as const

export const posterTemplates: Record<string, { labelKey: string; prompt: string }[]> = {
  product: [
    { labelKey: 'work_pages.poster.tpl_new_product', prompt: '3C数码新品发布会海报，科技感蓝色调，产品居中展示，光影效果，大字标题"重磅首发"' },
    { labelKey: 'work_pages.poster.tpl_flash_sale', prompt: '电商限时秒杀海报，红色促销风格，倒计时元素，价格醒目，紧迫感设计' },
    { labelKey: 'work_pages.poster.tpl_hot_return', prompt: '热销爆款返场海报，金色质感，网红种草风格，产品使用场景展示' },
  ],
  holiday: [
    { labelKey: 'work_pages.poster.tpl_spring_festival', prompt: '春节年货促销海报，中国红主色调，传统纹样，福字元素，温馨团圆氛围' },
    { labelKey: 'work_pages.poster.tpl_double11', prompt: '双十一狂欢节海报，炫酷霓虹灯光效，促销数字醒目，潮流年轻化设计' },
    { labelKey: 'work_pages.poster.tpl_mid_autumn', prompt: '中秋节海报，月圆桂花元素，暖金色调，团圆祝福文案，典雅中国风' },
  ],
  event: [
    { labelKey: 'work_pages.poster.tpl_anniversary', prompt: '品牌周年庆典海报，金色质感设计，时间线展示品牌历程，感恩回馈主题' },
    { labelKey: 'work_pages.poster.tpl_live_preview', prompt: '直播带货预告海报，产品主图居中，主播形象，时间/福利信息清晰分层' },
    { labelKey: 'work_pages.poster.tpl_launch', prompt: '新品发布会倒计时海报，极简科技风格，产品剪影悬念设计，日期醒目' },
  ],
  private: [
    { labelKey: 'work_pages.poster.tpl_community', prompt: '私域社群专属福利海报，温暖亲切色调，会员专属标识，扫码入群引导' },
    { labelKey: 'work_pages.poster.tpl_member_day', prompt: '会员日专享海报，VIP尊贵感设计，专属优惠信息，品牌调性统一' },
    { labelKey: 'work_pages.poster.tpl_moments', prompt: '朋友圈分享海报，生活方式美学，产品场景化展示，信任背书文案' },
  ],
  xhs: [
    { labelKey: 'work_pages.poster.tpl_good_stuff', prompt: '小红书好物分享封面，清新自然光拍摄风，产品平铺展示，种草文案标题' },
    { labelKey: 'work_pages.poster.tpl_ootd', prompt: '小红书穿搭封面，时尚街拍风格，OOTD标题，高级感色调，身材友好' },
    { labelKey: 'work_pages.poster.tpl_vlog', prompt: '小红书VLOG封面，生活方式美学，人像+文字排版，温暖治愈色调' },
  ],
  wechat: [
    { labelKey: 'work_pages.poster.tpl_article', prompt: '公众号干货文章封面，简洁信息图风格，标题关键词突出，专业信任感' },
    { labelKey: 'work_pages.poster.tpl_brand_story', prompt: '公众号品牌故事封面，高级质感摄影风，品牌色调用色，情感共鸣设计' },
    { labelKey: 'work_pages.poster.tpl_activity', prompt: '公众号活动推文封面，信息层级清晰，活动主题突出，行动号召引导' },
  ],
}

export const posterStyleDefaults: Record<string, string> = {
  product: '电商营销风格，突出产品卖点与优惠信息，设计感强',
  holiday: '节日氛围浓厚，色彩鲜明，传统文化与现代设计融合',
  event: '大型活动促销风格，信息层级清晰，视觉冲击力强',
  private: '私域社交风格，亲切温馨，突出信任感与专属福利',
  xhs: '小红书生活方式美学风格，清新自然，种草感强',
  wechat: '公众号头图风格，简洁有力，适合信息流浏览',
}

export const posterSizes: Record<string, { width: number; height: number; ratio: string; labelKey: string }> = {
  product: { width: 1200, height: 1800, ratio: '2:3', labelKey: 'work_pages.poster.tab_product' },
  holiday: { width: 1200, height: 1800, ratio: '2:3', labelKey: 'work_pages.poster.tab_holiday' },
  event: { width: 1920, height: 1080, ratio: '16:9', labelKey: 'work_pages.poster.tab_event' },
  private: { width: 1080, height: 1920, ratio: '9:16', labelKey: 'work_pages.poster.tab_private' },
  xhs: { width: 1080, height: 1440, ratio: '3:4', labelKey: 'work_pages.poster.tab_xhs' },
  wechat: { width: 900, height: 383, ratio: '2.35:1', labelKey: 'work_pages.poster.tab_wechat' },
}
