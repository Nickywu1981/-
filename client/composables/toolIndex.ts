/**
 * Tool index — CommandPalette search data source
 * All display names/descriptions use i18n keys; add tools here only.
 */
export const toolIndex = [
  // ===== Image =====
  { id: 'remove-bg',       keywords: ['remove background', 'cutout', '抠图', '去背景', '背景移除'], route: '/work/remove-bg',        icon: 'scissor',          category: 'image' },
  { id: 'white-bg',        keywords: ['white background', '白底', '白底图', '纯白背景'],          route: '/work/white-bg',         icon: 'picture',         category: 'image' },
  { id: 'scene',           keywords: ['scene', '背景替换', '场景图', '背景生成'],              route: '/work/scene',            icon: 'picture-filled',  category: 'image' },
  { id: 'main-image',      keywords: ['主图', '商品主图', '淘宝主图', '首图'],                route: '/work/main-image',       icon: 'tickets',         category: 'image' },
  { id: 'batch',           keywords: ['batch', '批量', '批处理', '批量抠图'],               route: '/work/batch',            icon: 'files',           category: 'image' },
  { id: 'color-swap',      keywords: ['color swap', '换色', '变色', '颜色替换'],             route: '/work/color-swap',       icon: 'brush',           category: 'image' },
  { id: 'color-change',    keywords: ['color change', '改色', '调色'],                     route: '/work/color-change',     icon: 'color-filter',    category: 'image' },
  { id: 'retouch',         keywords: ['retouch', '精修', '美颜', '修图'],                   route: '/work/retouch',          icon: 'edit',            category: 'image' },
  { id: 'outpaint',        keywords: ['outpaint', '扩图', '外扩', '扩展'],                  route: '/work/outpaint',         icon: 'full-screen',     category: 'image' },
  { id: 'image-translate', keywords: ['translate', '翻译', '图片翻译', '多语言'],              route: '/work/image-translate',  icon: 'translate',       category: 'image' },
  { id: 'model-generate',  keywords: ['model', 'AI模特', '虚拟模特', '模特图'],              route: '/work/model-generate',   icon: 'user',            category: 'image' },
  { id: 'wrinkle-remove',  keywords: ['wrinkle', '去皱', '褶皱', '平整'],                   route: '/work/wrinkle-remove',   icon: 'iron',            category: 'image' },

  // ===== Video =====
  { id: 'video',           keywords: ['video', '视频', '视频生成', '图生视频', '短视频'],        route: '/work/video',            icon: 'video-camera',        category: 'video' },
  { id: 'video-edit',      keywords: ['video edit', '视频编辑', '剪辑'],                     route: '/work/video-edit',       icon: 'video-camera-filled', category: 'video' },
  { id: 'digital-human',   keywords: ['digital human', '数字人', '虚拟主播', 'AI主播'],        route: '/work/digital-human',    icon: 'mic',                 category: 'video' },
  { id: 'action-transfer', keywords: ['motion', '动作', '动作迁移', '姿态'],                  route: '/work/action-transfer',  icon: 'trend',               category: 'video' },
  { id: 'shot-plan',       keywords: ['storyboard', '分镜', '脚本', '镜头'],                  route: '/work/shot-plan',        icon: 'film',                category: 'video' },
  { id: 'storyboard',      keywords: ['分镜脚本', '镜头脚本', '视频脚本'],                     route: '/work/storyboard',       icon: 'collection',          category: 'video' },
  { id: 'shot-panorama',   keywords: ['panorama', '全景', '360', 'VR'],                     route: '/work/shot-panorama',    icon: 'view',                category: 'video' },
  { id: 'voice-gen',       keywords: ['voice', 'TTS', '配音', '语音', '旁白'],                route: '/work/voice-gen',        icon: 'microphone',          category: 'video' },
  { id: 'voice-clone',     keywords: ['voice clone', '声音', '克隆', '音色'],                 route: '/work/voice-clone',      icon: 'microphone',          category: 'video' },
  { id: 'script-gen',      keywords: ['script', '脚本', '文案', '视频文案', '口播'],            route: '/work/script-gen',       icon: 'document',            category: 'video' },

  // ===== Special =====
  { id: 'detail-h5',       keywords: ['detail', '详情页', 'H5', '商品详情'],                 route: '/work/detail-h5',        icon: 'mobile',          category: 'special' },
  { id: 'platform-detail', keywords: ['platform', '平台详情', '多平台', '跨平台'],              route: '/work/platform-detail',  icon: 'connection',      category: 'special' },
  { id: 'virtual-tryon',   keywords: ['tryon', '试衣', '换装', '虚拟试穿'],                   route: '/work/virtual-tryon',    icon: 'shirt',           category: 'special' },
  { id: 'ghost-mannequin', keywords: ['ghost mannequin', '模特消除'],                      route: '/work/ghost-mannequin',  icon: 'hide',            category: 'special' },
  { id: 'viral-clone',     keywords: ['viral', '爆款', '克隆', '仿爆款'],                    route: '/work/viral-clone',      icon: 'trend-charts',    category: 'special' },
  { id: 'viral-replicate', keywords: ['viral replicate', '复刻', '爆款复刻'],                route: '/work/viral-replicate',  icon: 'copy-document',   category: 'special' },
  { id: 'compliance-check',keywords: ['compliance', '合规', '审核', '广告法', '违禁词'],         route: '/work/compliance-check', icon: 'checked',         category: 'special' },
  { id: 'prompt-hub',      keywords: ['prompt', '提示词', '模板', '推荐', '评分'],              route: '/work/prompt-hub',       icon: 'magic-stick',     category: 'special' },
  { id: 'publish',         keywords: ['publish', '分发', '发布', '多平台', '抖音', '快手'],       route: '/work/publish',          icon: 'promotion',       category: 'special' },
  { id: 'distribution',    keywords: ['distribution', '分发管理', '推送', '发布记录'],          route: '/work/distribution',     icon: 'connection',      category: 'special' },
  { id: 'usage',           keywords: ['usage', 'dashboard', '用量', '统计', '配额'],          route: '/work/usage',            icon: 'data-line',       category: 'special' },
  { id: 'favorites',       keywords: ['favorites', '收藏', '书签', '星标'],                  route: '/my/favorites',          icon: 'star-filled',     category: 'special' },
];

export const categoryKeys = {
  image: 'cmd_palette.cat_image',
  video: 'cmd_palette.cat_video',
  special: 'cmd_palette.cat_special',
} as const;

export const categoryIcons = {
  image: 'picture',
  video: 'video-camera',
  special: 'star',
};

/**
 * Resolve display name & description from i18n keys.
 * Call this in a component setup with access to t().
 */
export function resolveToolDisplay(t: (key: string) => string, tool: (typeof toolIndex)[number]) {
  const baseKey = `cmd_palette.tool_${tool.id.replace(/-/g, '_')}`
  return {
    name: t(`${baseKey}_name`),
    description: t(`${baseKey}_desc`),
  }
}

export function resolveCategoryLabel(t: (key: string) => string, category: string) {
  const key = categoryKeys[category as keyof typeof categoryKeys]
  return key ? t(key) : category
}

export default toolIndex;
