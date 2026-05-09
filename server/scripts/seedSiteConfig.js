// Insert default site_config data via Node.js (handles emoji properly)
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'root123',
  database: 'ai_saas',
  charset: 'utf8mb4',
})

const defaults = {
  workspace_nav: [
    { path: '/workspace', icon: '🏠', label: '首页', disabled: false, order: 1 },
    { path: '/workspace/creation', icon: '🎨', label: '创作', disabled: false, order: 2 },
    { path: '/workspace/assistant', icon: '🤖', label: 'AI 助手', disabled: true, order: 3 },
    { path: '/workspace/workflow', icon: '⚙', label: '工作流', disabled: true, order: 4 },
    { path: '/workspace/lobster', icon: '🏭', label: '龙虾', disabled: true, order: 5 },
  ],
  workspace_cards: [
    { id: 'img_main', category: 'creation', icon: '🖼', title: '主图生成', desc: 'AI一键生成电商商品主图，合规白底/场景图', route: '/work/image', order: 1, visible: true },
    { id: 'img_scene', category: 'creation', icon: '🏞', title: '场景图生成', desc: '商品+背景智能融合，多场景批量出图', route: '/work/main-image', order: 2, visible: true },
    { id: 'img_poster', category: 'creation', icon: '📰', title: '海报生成', desc: '营销海报模板+AI文案一键成图', route: '/work/poster', order: 3, visible: true },
    { id: 'img_bg_remove', category: 'creation', icon: '✂', title: '智能去背景', desc: 'AI抠图，背景秒去除', route: '/work/image/index', order: 4, visible: true },
    { id: 'img_white_bg', category: 'creation', icon: '⬜', title: '白底图生成', desc: '平台合规白底图自动生成', route: '/work/image/index', order: 5, visible: true },
    { id: 'img_recolor', category: 'creation', icon: '🎨', title: '商品换色', desc: '保留纹理材质，一键变颜色', route: '/work/image/index', order: 6, visible: true },
    { id: 'img_style', category: 'creation', icon: '🖌', title: '风格迁移', desc: '照片秒变动漫/油画/3D风格', route: '/work/image/index', order: 7, visible: true },
    { id: 'img_expand', category: 'creation', icon: '↔', title: '智能外扩', desc: 'AI补全画面边缘，适配各平台尺寸', route: '/work/image/index', order: 8, visible: true },
    { id: 'img_retouch', category: 'creation', icon: '✨', title: 'AI精修', desc: '去皱美颜，一键修图', route: '/work/image/index', order: 9, visible: true },
    { id: 'img_ghost', category: 'creation', icon: '👻', title: '幽灵模特', desc: '无需真人模特，AI虚拟上身效果', route: '/work/image/index', order: 10, visible: true },
    { id: 'img_translate', category: 'creation', icon: '🌐', title: '图片翻译', desc: '跨境商品图OCR+翻译+重新排版', route: '/work/image/index', order: 11, visible: true },
    { id: 'img_text_fx', category: 'creation', icon: '🔠', title: '文字特效', desc: '3D/金属/霓虹文字艺术字生成', route: '/work/image/index', order: 12, visible: true },
    { id: 'video_gen', category: 'creation', icon: '🎬', title: '视频生成', desc: '图文转视频/一键成片/分镜生成', route: '/work/video', order: 1, visible: true },
    { id: 'video_edit', category: 'creation', icon: '🎞', title: '视频编辑', desc: '智能剪辑/去冗余/音频优化', route: '/work/video-edit', order: 2, visible: true },
    { id: 'video_trans', category: 'creation', icon: '🌍', title: '视频翻译', desc: '语音+字幕+面容三合一翻译', route: '/work/video-translate', order: 3, visible: true },
    { id: 'digital_human', category: 'creation', icon: '🧑', title: '数字人', desc: 'AI数字人口播带货视频', route: '/work/digital-human', order: 1, visible: true },
    { id: 'face_swap', category: 'creation', icon: '🔄', title: 'AI换脸', desc: '模特换脸/衣服试穿', route: '/work/face-swap', order: 2, visible: true },
    { id: 'voice_clone', category: 'creation', icon: '🎙', title: '声音克隆', desc: '克隆你的声音做配音', route: '/work/voice-clone', order: 1, visible: true },
    { id: 'tts_voice', category: 'creation', icon: '🔊', title: 'AI配音', desc: '多语种+多音色TTS配音', route: '/work/tts', order: 2, visible: true },
    { id: 'copy_title', category: 'creation', icon: '📝', title: '标题/卖点生成', desc: 'AI生成高转化商品标题+核心卖点', route: '/work/copywriting', order: 1, visible: true },
    { id: 'copy_detail', category: 'creation', icon: '📋', title: '详情页文案', desc: 'AI生成商品详情页全链路文案', route: '/work/copywriting', order: 2, visible: true },
    { id: 'platform_taobao', category: 'creation', icon: '🛒', title: '淘宝适配', desc: '淘宝主图视频/详情尺寸规范一键适配', route: '/work/platform/taobao', order: 1, visible: true },
    { id: 'platform_douyin', category: 'creation', icon: '🎵', title: '抖音适配', desc: '抖音短视频/商品卡尺寸适配', route: '/work/platform/douyin', order: 2, visible: true },
    { id: 'social_feed', category: 'creation', icon: '📱', title: '社媒素材', desc: '小红书/Ins/Facebook图文模板一键生成', route: '/work/social', order: 1, visible: true },
    { id: 'batch_process', category: 'creation', icon: '⚡', title: '批量处理', desc: '100SKU并行处理，2小时搞定全店素材', route: '/work/batch', order: 1, visible: true },
    { id: 'prompt_enhance', category: 'creation', icon: '💡', title: '提示词润色', desc: '内置所有模块，不会写提示词也能出好图', route: '/work/image', order: 2, visible: true },
  ],
  workspace_assistant: [
    { id: 'asst_content', icon: '✍', title: '内容创作智能体', desc: '文案/脚本/卖点一站式AI创作', order: 1 },
    { id: 'asst_image', icon: '🖼', title: '图片设计智能体', desc: '主图/海报/场景图自动生成', order: 2 },
    { id: 'asst_video', icon: '🎬', title: '视频制作智能体', desc: '短视频/直播切片AI生成', order: 3 },
    { id: 'asst_translate', icon: '🌐', title: '跨境翻译智能体', desc: '7国语本地化翻译+排版', order: 4 },
    { id: 'asst_data', icon: '📊', title: '数据分析智能体', desc: '竞品/趋势/转化率智能分析', order: 5 },
    { id: 'asst_customer', icon: '💬', title: '客服应答智能体', desc: '多语言自动应答+意图识别', order: 6 },
    { id: 'asst_seo', icon: '🔍', title: 'SEO优化智能体', desc: '标题/关键词/搜索排名优化', order: 7 },
    { id: 'asst_ad', icon: '📢', title: '广告投放智能体', desc: '广告文案/素材/投放策略', order: 8 },
    { id: 'asst_live', icon: '📹', title: '直播助播智能体', desc: '直播脚本/弹幕互动/话术推荐', order: 9 },
    { id: 'asst_email', icon: '📧', title: '邮件营销智能体', desc: 'EDM文案/序列/个性化推荐', order: 10 },
  ],
  workspace_workflow: [
    { id: 'wf_distribution', icon: '🚀', title: '一键分发', desc: '多平台同步发布内容', order: 1 },
    { id: 'wf_schedule', icon: '📅', title: '定时排期', desc: '内容日历+定时发布', order: 2 },
    { id: 'wf_track', icon: '📈', title: '数据追踪', desc: '各平台数据看板汇总', order: 3 },
    { id: 'wf_collab', icon: '👥', title: '多人协作', desc: '团队审批流+版本管理', order: 4 },
    { id: 'wf_auto', icon: '🤖', title: '自动化规则', desc: 'IFTTT触发自动执行', order: 5 },
    { id: 'wf_export', icon: '📦', title: '批量导出', desc: '一键导出全平台素材包', order: 6 },
  ],
}

async function run() {
  for (const [key, value] of Object.entries(defaults)) {
    const description = {
      workspace_nav: '工作台五大固定顶级导航',
      workspace_cards: '创作类模块功能卡片配置',
      workspace_assistant: 'AI 助手类预留模块',
      workspace_workflow: '工作流类预留模块',
    }[key] || ''
    await pool.query(
      'INSERT INTO site_config (config_key, config_value, description) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description)',
      [key, JSON.stringify(value), description]
    )
    console.log(`   ✅ ${key}`)
  }
  console.log('Done — site_config seeded')
  await pool.end()
}

run().catch(err => { console.error(err); process.exit(1) })
