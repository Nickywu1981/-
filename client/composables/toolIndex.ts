/**
 * 工具索引 — CommandPalette 搜索数据源
 * 新增工具只需在此文件添加条目
 */
export const toolIndex = [
  // ===== 图片处理 =====
  { id: 'remove-bg', name: '智能抠图', keywords: ['抠图', '去背景', '背景移除', 'remove background', 'cutout'], route: '/work/remove-bg', icon: 'scissor', category: 'image', description: 'AI 一键移除图片背景，5秒出图' },
  { id: 'white-bg', name: '白底图', keywords: ['白底', '白底图', '纯白背景', 'white background'], route: '/work/white-bg', icon: 'picture', category: 'image', description: '生成电商平台标准白底商品图' },
  { id: 'scene', name: '场景生成', keywords: ['场景', '背景替换', '场景图', 'scene', '背景生成'], route: '/work/scene', icon: 'picture-filled', category: 'image', description: 'AI 生成商品场景图，室内外风格任选' },
  { id: 'main-image', name: '主图制作', keywords: ['主图', '商品主图', '淘宝主图', '拼多多主图', '首图'], route: '/work/main-image', icon: 'tickets', category: 'image', description: '多平台尺寸主图生成，适配各电商平台' },
  { id: 'batch', name: '批量处理', keywords: ['批量', '批处理', '批量抠图', '批量生成', 'batch'], route: '/work/batch', icon: 'files', category: 'image', description: '一次上传批量处理，支持多种操作组合' },
  { id: 'color-swap', name: '换色', keywords: ['换色', '变色', '颜色替换', 'color swap', '改色'], route: '/work/color-swap', icon: 'brush', category: 'image', description: '商品换色，一键生成多色SKU展示图' },
  { id: 'color-change', name: '改色', keywords: ['改色', '调色', '颜色调整', 'color change'], route: '/work/color-change', icon: 'color-filter', category: 'image', description: '精确调整商品颜色，保留质感和阴影' },
  { id: 'style-transfer', name: '风格迁移', keywords: ['风格', '画风', '风格转换', 'style transfer', '滤镜'], route: '/work/style-transfer', icon: 'magic-stick', category: 'image', description: '将图片转换为指定艺术风格' },
  { id: 'retouch', name: '图片精修', keywords: ['精修', '美颜', '修图', 'retouch', '美化'], route: '/work/retouch', icon: 'edit', category: 'image', description: 'AI 自动精修，磨皮美颜提升质感' },
  { id: 'outpaint', name: '智能扩图', keywords: ['扩图', '外扩', 'outpaint', '扩展', '放大'], route: '/work/outpaint', icon: 'full-screen', category: 'image', description: '图片智能外扩，AI 补全画面边界' },
  { id: 'image-translate', name: '图片翻译', keywords: ['翻译', '图片翻译', 'translate', '多语言', '国际化'], route: '/work/image-translate', icon: 'translate', category: 'image', description: '图片中文字智能翻译，多语种版本' },
  { id: 'text-effect', name: '文字特效', keywords: ['文字', '特效', '字体', '文字效果', 'text effect'], route: '/work/text-effect', icon: 'font-color', category: 'image', description: 'AI 生成艺术文字效果' },
  { id: 'model-generate', name: 'AI 模特生成', keywords: ['模特', 'AI模特', '虚拟模特', 'model', '模特图'], route: '/work/model-generate', icon: 'user', category: 'image', description: '生成虚拟模特展示商品上身效果' },
  { id: 'swap-face', name: '换脸', keywords: ['换脸', '人脸替换', 'face swap', '换模特'], route: '/work/swap-face', icon: 'smile', category: 'image', description: '智能人脸替换，更换模特面孔' },
  { id: 'person-replace', name: '人物替换', keywords: ['人物', '替换', '换人', 'person replace'], route: '/work/person-replace', icon: 'user-filled', category: 'image', description: '图片中人物智能替换' },
  { id: 'wrinkle-remove', name: '去褶皱', keywords: ['去皱', '褶皱', '平整', 'wrinkle', '熨烫'], route: '/work/wrinkle-remove', icon: 'iron', category: 'image', description: '服装去褶皱，让商品更有质感' },

  // ===== 视频处理 =====
  { id: 'video', name: '图生视频', keywords: ['视频', '视频生成', '图生视频', 'video', '短视频'], route: '/work/video', icon: 'video-camera', category: 'video', description: '单张图片生成产品展示短视频' },
  { id: 'video-edit', name: '视频编辑', keywords: ['视频编辑', '剪辑', 'video edit', '视频处理'], route: '/work/video-edit', icon: 'video-camera-filled', category: 'video', description: 'AI 智能视频编辑，加字幕/BGM/特效' },
  { id: 'digital-human', name: '数字人', keywords: ['数字人', '虚拟主播', 'AI主播', 'digital human', '虚拟人'], route: '/work/digital-human', icon: 'mic', category: 'video', description: 'AI 数字人口播视频生成' },
  { id: 'action-transfer', name: '动作迁移', keywords: ['动作', '动作迁移', 'motion', 'action transfer', '姿态'], route: '/work/action-transfer', icon: 'trend', category: 'video', description: '参考视频动作迁移到商品图' },
  { id: 'shot-plan', name: '智能分镜', keywords: ['分镜', '脚本', 'storyboard', '镜头', '导演'], route: '/work/shot-plan', icon: 'film', category: 'video', description: 'AI 智能分镜脚本生成' },
  { id: 'storyboard', name: '分镜脚本', keywords: ['分镜脚本', '镜头脚本', '视频脚本', '短视频脚本'], route: '/work/storyboard', icon: 'collection', category: 'video', description: '短视频拍摄分镜脚本一键生成' },
  { id: 'shot-panorama', name: '全景视频', keywords: ['全景', '360', '全景视频', 'panorama', 'VR'], route: '/work/shot-panorama', icon: 'view', category: 'video', description: '商品全景展示视频制作' },
  { id: 'voice-gen', name: 'AI 配音', keywords: ['配音', '语音', '旁白', 'voice', '语音生成', 'TTS'], route: '/work/voice-gen', icon: 'microphone', category: 'video', description: 'AI 语音合成，多语种多音色' },
  { id: 'voice-clone', name: '声音克隆', keywords: ['声音', '克隆', 'voice clone', '声音复制', '音色'], route: '/work/voice-clone', icon: 'microphone', category: 'video', description: '一键克隆你的声音，专属配音' },
  { id: 'script-gen', name: '脚本生成', keywords: ['脚本', '文案', '视频文案', 'script', '口播'], route: '/work/script-gen', icon: 'document', category: 'video', description: 'AI 生成短视频脚本，支持9语种' },

  // ===== 特色功能 =====
  { id: 'detail-h5', name: '详情页H5', keywords: ['详情页', 'H5', '详情', '商品详情', 'detail'], route: '/work/detail-h5', icon: 'mobile', category: 'special', description: 'AI 生成移动端商品详情页' },
  { id: 'platform-detail', name: '多平台详情', keywords: ['平台详情', '多平台', '跨平台', '详情适配', 'platform'], route: '/work/platform-detail', icon: 'connection', category: 'special', description: '一键生成适配多平台规格的详情图' },
  { id: 'virtual-tryon', name: '虚拟试衣', keywords: ['试衣', '换装', '虚拟试穿', 'tryon', '试穿'], route: '/work/virtual-tryon', icon: 'shirt', category: 'special', description: 'AI 虚拟试衣，模特换装展示' },
  { id: 'ghost-mannequin', name: '幽灵模特', keywords: ['幽灵模特', '模特消除', 'ghost mannequin', '真人模特消除'], route: '/work/ghost-mannequin', icon: 'hide', category: 'special', description: '消除真人模特，保留服装形状' },
  { id: 'viral-clone', name: '爆款克隆', keywords: ['爆款', '克隆', '仿爆款', 'viral', '爆品'], route: '/work/viral-clone', icon: 'trend-charts', category: 'special', description: '分析爆款风格，生成相似素材' },
  { id: 'viral-replicate', name: '爆款复刻', keywords: ['复刻', '爆款复刻', '复制爆款', 'viral replicate'], route: '/work/viral-replicate', icon: 'copy-document', category: 'special', description: '爆款商品图风格一键复刻' },
  { id: 'compliance-check', name: '合规检测', keywords: ['合规', '审核', '广告法', '违禁词', 'compliance'], route: '/work/compliance-check', icon: 'checked', category: 'special', description: '电商广告合规检测，避免违规' },
  { id: 'prompt-hub', name: '提示词工坊', keywords: ['提示词', '模板', '推荐', '评分', 'prompt', 'AI推荐'], route: '/work/prompt-hub', icon: 'magic-stick', category: 'special', description: 'AI智能推荐提示词，150+模板，评分历史' },
  { id: 'publish', name: '多平台分发', keywords: ['分发', '发布', '多平台', '抖音', '快手', 'publish', '一键发布'], route: '/work/publish', icon: 'promotion', category: 'special', description: '一键分发作品到多个电商/社媒平台' },
  { id: 'distribution', name: '分发管理', keywords: ['分发', '分发管理', '推送', 'distribution', '发布记录'], route: '/work/distribution', icon: 'connection', category: 'special', description: '管理多平台分发记录和发布状态' },
  { id: 'cut-ecosystem', name: '裁剪生态', keywords: ['裁剪', '尺寸', '画幅', '适配', 'cut', '裁切'], route: '/work/cut-ecosystem', icon: 'scissor', category: 'special', description: '多平台画幅适配，智能裁剪导出' },
  { id: 'usage', name: '用量仪表盘', keywords: ['用量', '统计', '配额', '仪表盘', 'usage', 'dashboard'], route: '/work/usage', icon: 'data-line', category: 'special', description: '查看API用量、积分消耗和配额使用情况' },
  { id: 'favorites', name: '我的收藏', keywords: ['收藏', '书签', '星标', 'favorites', '我的'], route: '/my/favorites', icon: 'star-filled', category: 'special', description: '查看和管理收藏的作品和模板' },
];

export const categoryLabels = {
  image: '图片处理',
  video: '视频创作',
  special: '特色工具',
};

export const categoryIcons = {
  image: 'picture',
  video: 'video-camera',
  special: 'star',
};

export default toolIndex;
