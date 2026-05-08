/**
 * 智能提示词增强器 — 自动补全风格/光照/构图/分辨率参数
 * 将用户模糊输入（"把图变好看"）转化为专业 AI 生成指令
 */

interface EnhanceOptions {
  platform?: string   // e.g. "Amazon", "淘宝"
  category?: string   // e.g. "ecommerce", "portrait"
  language?: string   // e.g. "zh", "en"
}

interface EnhancedPrompt {
  original: string
  enhanced: string
  additions: string[]
}

// 风格预设
const STYLE_PRESETS: Record<string, string[]> = {
  ecommerce: ['产品摄影', '商业级画质', '干净背景', '专业打光', '高细节'],
  portrait: ['自然光', '柔焦效果', '高级人像', '皮肤质感', '自然肤色'],
  fashion: ['时尚杂志风格', '高级时装', '柔和侧光', '电影级调色'],
  food: ['美食摄影', '自然光', '暖色调', '高饱和度', '微距细节'],
  minimalist: ['极简主义', '留白构图', '柔和阴影', '干净简洁'],
  luxury: ['奢侈品风格', '低调奢华', '金属质感', '深色背景', '聚光灯效'],
  lifestyle: ['生活场景', '自然光线', '真实氛围', '居家环境'],
}

// 光照预设
const LIGHTING_PRESETS: Record<string, string> = {
  soft: '柔和均匀光',
  studio: '影棚三点布光',
  rim: '轮廓逆光',
  natural: '自然日光',
  warm: '暖色调灯光',
  dramatic: '戏剧性强对比光',
}

// 构图预设
const COMPOSITION_PRESETS: Record<string, string> = {
  center: '居中构图，主体占比80%',
  rule_thirds: '三分法构图',
  diagonal: '对角线构图',
  negative_space: '大量留白空间',
  close_up: '微距特写',
}

// 平台规格
const PLATFORM_SPECS: Record<string, string> = {
  Amazon: '纯白背景(RGB 255,255,255)，产品占比>85%，2000x2000px',
  TikTok: '9:16竖版，吸引眼球，动态感，1080x1920px',
  Shopee: '白底或浅色背景，800x800px，产品居中',
  淘宝: '800x800px以上，主图白底，无边框无Logo',
  拼多多: '1:1正方形，产品清晰，无水印',
  京东: '800x800px，白底或场景图',
  Instagram: '1:1或4:5，高颜值，滤镜感',
}

// AI质量关键词
const QUALITY_KEYWORDS = ['8K', '超高分辨率', '超细节', '专业级', '商业摄影', '获奖作品']

export function enhancePrompt(rawInput: string, options: EnhanceOptions = {}): EnhancedPrompt {
  const additions: string[] = []
  let enhanced = rawInput

  // 1. Detect missing style keywords
  const hasStyle = /风格|style|色调|调色/.test(rawInput)
  if (!hasStyle && options.category) {
    const presets = STYLE_PRESETS[options.category] || STYLE_PRESETS.ecommerce
    const styleStr = presets.slice(0, 3).join('，')
    additions.push(`风格：${styleStr}`)
  }

  // 2. Detect missing lighting
  const hasLighting = /光|light|灯|影棚/.test(rawInput.toLowerCase())
  if (!hasLighting) {
    const lighting = options.category === 'portrait' ? LIGHTING_PRESETS.soft : LIGHTING_PRESETS.studio
    additions.push(`光照：${lighting}`)
  }

  // 3. Detect missing composition
  const hasComposition = /构图|比例|位置|居中|留白|占比/.test(rawInput)
  if (!hasComposition) {
    additions.push(`构图：${COMPOSITION_PRESETS.center}`)
  }

  // 4. Platform-specific spec
  if (options.platform && PLATFORM_SPECS[options.platform]) {
    additions.push(`平台规格：${PLATFORM_SPECS[options.platform]}`)
  }

  // 5. Quality keywords (only if missing)
  const hasQuality = /8k|4k|高清|分辨率|画质|质量/.test(rawInput.toLowerCase())
  if (!hasQuality) {
    additions.push(`画质：${QUALITY_KEYWORDS.slice(0, 2).join('，')}`)
  }

  // 6. Language style adjustment
  if (options.language === 'en') {
    additions.push('Style: Professional product photography, commercial grade')
  }

  // Build enhanced prompt
  if (additions.length > 0) {
    enhanced = `${rawInput}。${additions.join('。')}`
  }

  return { original: rawInput, enhanced, additions }
}

/** 根据平台+类别生成默认提示词 */
export function generateDefaultPrompt(platform?: string, category?: string): string {
  const parts: string[] = []

  if (platform) {
    parts.push(`${platform}平台商品图片`)
  } else {
    parts.push('电商商品图片')
  }

  const styles = STYLE_PRESETS[category || 'ecommerce'] || STYLE_PRESETS.ecommerce
  parts.push(styles.join('，'))

  const spec = platform ? PLATFORM_SPECS[platform] : '白底高清产品图'
  parts.push(spec)

  parts.push(QUALITY_KEYWORDS.join('，'))

  return parts.join('。')
}
