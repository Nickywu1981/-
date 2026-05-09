/**
 * AI 意图路由 — 解析用户自然语言输入，自动匹配最佳功能工具
 * 规则匹配 + 关键词权重算法，不依赖外部 AI 调用
 */

// 工具-关键词映射表（权重越高越精确匹配）
const TOOL_PATTERNS: { tool: string; route: string; keywords: string[]; weight: number }[] = [
  { tool: '智能抠图', route: '/work/remove-bg', keywords: ['抠图', '去背景', '扣图', 'remove bg', 'remove background', '透明背景', '抠出'], weight: 10 },
  { tool: '白底图', route: '/work/white-bg', keywords: ['白底', '白底图', '白色背景', 'white background', '换白底'], weight: 9 },
  { tool: '场景生成', route: '/work/scene', keywords: ['场景', '背景生成', '场景图', 'scene', '布景', '换场景', '场景合成'], weight: 10 },
  { tool: '商品主图', route: '/work/main-image', keywords: ['主图', '商品图', '主图制作', '电商主图', '产品图', 'main image', '淘天主图', '亚马逊主图', '拼多多主图'], weight: 10 },
  { tool: '图片精修', route: '/work/retouch', keywords: ['精修', '修图', '美化', '润色', 'retouch', 'enhance', '修复', '磨皮', '美颜'], weight: 9 },
  { tool: '详情页H5', route: '/work/detail-h5', keywords: ['详情页', '详情', 'detail', 'h5', '产品详情', '商品详情', 'A+页面'], weight: 9 },
  { tool: '视频生成', route: '/work/video', keywords: ['视频', '生成视频', 'video', '视频制作', '短视频', '商品视频'], weight: 10 },
  { tool: '批量处理', route: '/work/batch', keywords: ['批量', '批量处理', 'batch', '批量抠图', '批量生成', '批量导出'], weight: 10 },
  { tool: '虚拟试穿', route: '/work/virtual-tryon', keywords: ['试穿', '虚拟试穿', 'try on', '换装', '试衣', 'virtual try', '模特上身'], weight: 9 },
  { tool: '颜色替换', route: '/work/color-change', keywords: ['换色', '颜色', '变色', 'color', '改色', '颜色替换', '配色'], weight: 8 },
  { tool: '风格迁移', route: '/work/style-transfer', keywords: ['风格', '风格迁移', 'style transfer', '画风', '滤镜', '艺术风格', '风格化'], weight: 8 },
  { tool: '幽灵模特', route: '/work/ghost-mannequin', keywords: ['幽灵模特', '模特', 'mannequin', '假模', '穿版', '3D模特'], weight: 9 },
  { tool: '画面扩展', route: '/work/outpainting', keywords: ['扩图', '扩展', 'outpaint', '画面扩展', '外扩', '画布扩展', 'outpainting'], weight: 8 },
  { tool: '视频脚本', route: '/work/script-gen', keywords: ['脚本', '文案', 'script', '带货脚本', '视频文案', '直播脚本', '剧本', 'copywriting'], weight: 9 },
  { tool: '智能分镜', route: '/work/storyboard', keywords: ['分镜', 'storyboard', '镜头', '分镜头', '故事板'], weight: 8 },
  { tool: '爆款复刻', route: '/work/viral-replicate', keywords: ['复刻', '爆款', 'viral', '模仿', '热门视频', 'replicate', '同款'], weight: 8 },
  { tool: '视频编辑', route: '/work/video-edit', keywords: ['剪辑', '编辑', '裁剪', 'edit', '剪辑视频', '视频后期', '字幕'], weight: 8 },
  { tool: '语音生成', route: '/work/voice-gen', keywords: ['语音', '配音', 'voice', 'tts', '旁白', '文本转语音', '语音合成', 'text to speech'], weight: 8 },
  { tool: '声音克隆', route: '/work/voice-clone', keywords: ['声音克隆', '克隆', 'voice clone', '模仿声音', '音色'], weight: 8 },
  { tool: '数字人', route: '/work/digital-human', keywords: ['数字人', 'digital human', '虚拟人', 'AI主播', '数字人直播', '虚拟主播'], weight: 9 },
  { tool: '图片翻译', route: '/work/translate-image', keywords: ['翻译', 'translate', '图片翻译', '文字翻译', '多语言'], weight: 7 },
  { tool: '文字特效', route: '/work/text-effect', keywords: ['文字特效', '字体', 'text effect', '艺术字', '标题设计', 'typography'], weight: 7 },
  { tool: '产品渲染', route: '/work/product-render', keywords: ['渲染', '3D渲染', 'render', '产品渲染', '建模'], weight: 7 },
  { tool: '3D 预览', route: '/work/3d-preview', keywords: ['3D', '3d', '三维', '模型', '立体', 'GLB', '360'], weight: 7 },
  { tool: '模板市场', route: '/work/marketplace', keywords: ['模板', 'template', '预设', '市场'], weight: 6 },
  { tool: '运动转移', route: '/work/shot-panorama', keywords: ['运动转移', '动作', 'motion', '动态'], weight: 7 },
]

// 平台意图检测
const PLATFORM_PATTERNS: { platform: string; keywords: string[] }[] = [
  { platform: 'Amazon', keywords: ['亚马逊', 'amazon', 'amz'] },
  { platform: 'TikTok', keywords: ['tiktok', '抖音', 'tk'] },
  { platform: 'Shopee', keywords: ['虾皮', 'shopee'] },
  { platform: 'Lazada', keywords: ['lazada', '来赞达'] },
  { platform: 'eBay', keywords: ['ebay'] },
  { platform: '淘宝', keywords: ['淘宝', 'taobao', '淘天'] },
  { platform: '拼多多', keywords: ['拼多多', 'pdd'] },
  { platform: '京东', keywords: ['京东', 'jd'] },
  { platform: '独立站', keywords: ['独立站', 'shopify', '自建站'] },
]

// 动作意图检测
const ACTION_PATTERNS: { action: string; keywords: string[] }[] = [
  { action: 'remove_bg', keywords: ['去背景', '抠', '去掉', '删除背景'] },
  { action: 'add_bg', keywords: ['加背景', '换背景', '换底', '添加背景'] },
  { action: 'enhance', keywords: ['增强', '提高画质', '高清', '放大', 'upscale', '清晰'] },
  { action: 'generate', keywords: ['生成', '创建', '制作', 'generate', 'create', '做', '弄'] },
  { action: 'resize', keywords: ['尺寸', '大小', '缩放', 'resize', '裁剪', 'crop'] },
  { action: 'format', keywords: ['格式', '转换', 'convert', 'jpg', 'png', 'webp', 'pdf'] },
]

export interface IntentResult {
  matched: boolean
  tool: string
  route: string
  confidence: number
  detectedPlatform: string | null
  detectedAction: string | null
  suggestions: { tool: string; route: string; confidence: number }[]
}

export function parseIntent(input: string): IntentResult {
  if (!input || !input.trim()) {
    return { matched: false, tool: '', route: '', confidence: 0, detectedPlatform: null, detectedAction: null, suggestions: [] }
  }

  const normalized = input.toLowerCase().trim()

  // 1. Tool matching
  const scored = TOOL_PATTERNS.map(t => {
    let score = 0
    for (const kw of t.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        score += kw.length // longer keyword = more specific match
      }
    }
    return { ...t, score: score / t.weight }
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score)

  // 2. Platform detection
  let detectedPlatform: string | null = null
  for (const p of PLATFORM_PATTERNS) {
    if (p.keywords.some(kw => normalized.includes(kw.toLowerCase()))) {
      detectedPlatform = p.platform; break
    }
  }

  // 3. Action detection
  let detectedAction: string | null = null
  for (const a of ACTION_PATTERNS) {
    if (a.keywords.some(kw => normalized.includes(kw.toLowerCase()))) {
      detectedAction = a.action; break
    }
  }

  // 4. Build result
  const suggestions = scored.slice(0, 5).map(s => ({
    tool: s.tool, route: s.route, confidence: Math.round(s.score * 100),
  }))

  const best = scored[0]
  return {
    matched: !!best,
    tool: best?.tool || '',
    route: best?.route || '',
    confidence: best ? Math.round(best.score * 100) : 0,
    detectedPlatform,
    detectedAction,
    suggestions,
  }
}
