/**
 * 全局页面 SEO composable
 * 基于路由自动生成 TDK (Title/Description/Keywords)
 * 页面可调用 usePageSEO({ title: '自定义' }) 覆盖默认值
 */

const pageSEOMap: Record<string, { title: string; description: string; keywords?: string }> = {
  // ===== 首页 =====
  '/': {
    title: '首页',
    description: 'Movio AI — 电商图片视频全功能一体化平台，支持13个电商平台一键适配',
    keywords: 'AI电商图,电商主图,AI场景图,详情页,电商视频,AI抠图,批量处理',
  },
  '/workspace': {
    title: '工作台',
    description: 'Movio AI 工作台 — AI图片处理/视频创作/特色工具，一站式电商内容创作',
    keywords: 'AI工作台,电商工具,图片处理,视频创作',
  },

  // ===== 图片处理工具 =====
  '/work/remove-bg': {
    title: '智能抠图',
    description: 'AI智能抠图，5秒去除图片背景，支持人像/商品/复杂边缘，导出透明PNG',
    keywords: 'AI抠图,去背景,智能抠图,背景移除,透明背景,商品抠图',
  },
  '/work/white-bg': {
    title: '白底图生成',
    description: 'AI白底图生成，一键将商品图转为纯白背景，适配淘宝/拼多多/亚马逊等电商平台',
    keywords: '白底图,电商白底图,商品白底图,纯白背景,淘宝白底图',
  },
  '/work/scene': {
    title: 'AI场景生成',
    description: 'AI智能场景生成，为商品创建室内/室外/季节/节日场景图，提升转化率',
    keywords: 'AI场景图,商品场景,电商场景,背景生成,场景合成',
  },
  '/work/main-image': {
    title: '主图制作',
    description: '电商主图一键制作，适配淘宝/拼多多/抖音/小红书/亚马逊等13个平台尺寸',
    keywords: '电商主图,商品主图,淘宝主图,拼多多主图,主图制作',
  },
  '/work/batch': {
    title: '批量处理',
    description: '商品图批量处理，一次上传多张，支持批量抠图/白底/场景/换色，提升效率',
    keywords: '批量抠图,批量处理,批量生成,批量白底,电商批量',
  },
  '/work/color-swap': {
    title: 'AI换色',
    description: '商品智能换色，生成多色SKU展示图，保留质感光影，一键出多色',
    keywords: '商品换色,多色图,SKU图,颜色替换,变色',
  },
  '/work/color-change': {
    title: '精准改色',
    description: '精准调色工具，HSL颜色调整，保留材质纹理和阴影细节',
    keywords: '改色,调色,商品改色,精准调色,颜色调整',
  },
  '/work/style-transfer': {
    title: '风格迁移',
    description: 'AI风格迁移，将商品图转为水彩/油画/3D/插画/动漫等多种艺术风格',
    keywords: '风格迁移,AI风格,图片风格转换,艺术风格,滤镜效果',
  },
  '/work/retouch': {
    title: '图片精修',
    description: 'AI自动精修商品图，提亮/磨皮/去瑕疵/增强质感，专业级修图效果',
    keywords: '图片精修,AI修图,商品精修,自动修图,美颜',
  },
  '/work/outpaint': {
    title: '智能扩图',
    description: 'AI智能扩图，无缝扩展图片边界，自动补全背景内容，外扩不露馅',
    keywords: 'AI扩图,智能扩图,图片扩展,外扩,outpaint',
  },
  '/work/image-translate': {
    title: '图片翻译',
    description: '图片文字智能翻译，保留原排版风格，支持20+语种，跨境电商必备',
    keywords: '图片翻译,文字翻译,跨境电商,多语言图,图片本地化',
  },
  '/work/text-effect': {
    title: '文字特效',
    description: 'AI文字特效生成，3D/霓虹/金属/火焰/发光等风格，电商海报必备',
    keywords: '文字特效,AI字体,艺术字,电商文字,字体设计',
  },
  '/work/model-generate': {
    title: 'AI模特生成',
    description: 'AI虚拟模特生成，多种肤色/年龄/风格，穿版展示商品上身效果',
    keywords: 'AI模特,虚拟模特,模特生成,商品模特,穿版图',
  },
  '/work/swap-face': {
    title: 'AI换脸',
    description: '智能人脸替换，更换模特面孔，保留发型/光影/肤色一致性',
    keywords: 'AI换脸,人脸替换,换模特脸,face swap,智能换脸',
  },
  '/work/person-replace': {
    title: '人物替换',
    description: '图片人物智能替换，更换模特/角色，保持场景一致性',
    keywords: '人物替换,换人,模特替换,角色替换,person replace',
  },
  '/work/wrinkle-remove': {
    title: '去褶皱',
    description: '服装去褶皱AI工具，让衣服看起来平整有质感，提升商品图片品质',
    keywords: '去褶皱,衣服去皱,服装平整,去皱AI,衣物美化',
  },

  // ===== 视频创作工具 =====
  '/work/video': {
    title: '图生视频',
    description: '单张图片生成产品展示短视频，多种运镜/转场/BGM，电商带货神器',
    keywords: '图生视频,图片转视频,产品视频,电商视频,AI视频',
  },
  '/work/video-edit': {
    title: '视频编辑',
    description: 'AI智能视频编辑，自动加字幕/BGM/特效/转场，快速制作营销视频',
    keywords: '视频编辑,AI剪辑,自动编辑,短视频制作,视频处理',
  },
  '/work/digital-human': {
    title: 'AI数字人',
    description: 'AI数字人口播视频生成，真人级表情/口型/动作，直播带货新方式',
    keywords: '数字人,AI主播,虚拟主播,口播视频,数字人直播',
  },
  '/work/action-transfer': {
    title: '动作迁移',
    description: '参考视频动作迁移到商品图，让静态模特动起来，支持多种动作模板',
    keywords: '动作迁移,AI动作,姿态迁移,商品动图,motion transfer',
  },
  '/work/shot-plan': {
    title: '智能分镜',
    description: 'AI智能分镜脚本，自动拆解镜头/运镜/时长/转场，导演级拍摄方案',
    keywords: '智能分镜,分镜脚本,镜头设计,视频分镜,AI导演',
  },
  '/work/storyboard': {
    title: '分镜脚本',
    description: '短视频拍摄分镜脚本一键生成，包含景别/运镜/台词/时长/备注',
    keywords: '分镜脚本,拍摄脚本,短视频脚本,镜头脚本,storyboard',
  },
  '/work/shot-panorama': {
    title: '全景展示',
    description: '商品360°全景展示视频，旋转/缩放/细节特写，全方位展示商品',
    keywords: '全景视频,商品全景,360展示,旋转视频,产品展示',
  },
  '/work/voice-gen': {
    title: 'AI配音',
    description: 'AI语音合成配音，50+音色/20+语种/多种情感，电商视频配音神器',
    keywords: 'AI配音,语音合成,TTS,配音生成,旁白配音',
  },
  '/work/voice-clone': {
    title: '声音克隆',
    description: 'AI声音克隆，上传音频样本即可复刻专属音色，用于配音和口播',
    keywords: '声音克隆,AI声音,音色克隆,voice clone,声音复制',
  },
  '/work/script-gen': {
    title: '脚本生成',
    description: 'AI短视频脚本生成，支持中英日韩等9语种，包含话术/卖点/引导',
    keywords: '脚本生成,视频脚本,带货脚本,文案生成,短视频文案',
  },

  // ===== 特色工具 =====
  '/work/detail-h5': {
    title: '详情页H5',
    description: 'AI生成移动端商品详情页，自动排版/文案/配图，一键导出H5',
    keywords: '详情页,商品详情,H5详情,移动详情,AI详情页',
  },
  '/work/platform-detail': {
    title: '多平台详情',
    description: '一键生成适配淘宝/拼多多/京东/抖音等多平台规格的商品详情图',
    keywords: '多平台详情,详情适配,跨平台详情,商品详情图',
  },
  '/work/virtual-tryon': {
    title: '虚拟试衣',
    description: 'AI虚拟试衣，模特换装展示，支持多种体型/姿势，在线试穿体验',
    keywords: '虚拟试衣,AI试衣,模特换装,在线试穿,virtual tryon',
  },
  '/work/ghost-mannequin': {
    title: '幽灵模特',
    description: '消除真人模特保留服装形状，生成3D立体中空效果，电商必备工具',
    keywords: '幽灵模特,模特消除,服装展示,ghost mannequin,立体服装',
  },
  '/work/viral-clone': {
    title: '爆款克隆',
    description: '分析爆款商品图风格，AI自动生成相似视觉风格的素材，快速跟进热点',
    keywords: '爆款克隆,爆款分析,风格复制,仿爆款,爆品分析',
  },
  '/work/viral-replicate': {
    title: '爆款复刻',
    description: '爆款商品图一键复刻，保留爆款视觉基因，批量生成同风格素材',
    keywords: '爆款复刻,商品复刻,风格复刻,爆品复制,viral replicate',
  },
  '/work/compliance-check': {
    title: '合规检测',
    description: '电商广告合规检测，违禁词/广告法/极限用语自动识别，降低违规风险',
    keywords: '合规检测,广告法,违禁词检测,极限用语,电商合规',
  },

  // ===== 用户页面 =====
  '/login': { title: '登录', description: '登录 Movio AI，开始AI电商创作之旅', keywords: '登录,AI电商,账号登录' },
  '/register': { title: '免费注册', description: '注册 Movio AI，免费体验AI抠图/场景/视频生成', keywords: '注册,免费注册,AI工具注册,电商工具' },
  '/forgot-password': { title: '找回密码', description: '找回 Movio AI 账号密码', keywords: '找回密码,重置密码' },
  '/membership': { title: '会员套餐', description: 'Movio AI 会员套餐对比，选择最适合你的方案', keywords: '会员,套餐,付费方案,AI会员' },
  '/notifications': { title: '通知中心', description: '查看系统通知和任务进度', keywords: '通知,消息,任务通知' },
  '/compare': { title: '竞品对比', description: 'Movio AI vs 其他电商AI工具功能对比', keywords: '竞品对比,工具对比,AI工具PK,电商工具比较' },
  '/help': { title: '帮助中心', description: 'Movio AI 使用教程、常见问题与帮助文档', keywords: '帮助,教程,FAQ,使用指南,帮助文档' },
  '/error': { title: '页面错误', description: '页面出错了', keywords: '' },
  '/privacy': { title: '隐私政策', description: 'Movio AI 隐私政策', keywords: '隐私,隐私政策' },
  '/terms': { title: '服务条款', description: 'Movio AI 服务条款', keywords: '服务条款,用户协议' },

  // ===== 账户页面 =====
  '/account/settings': { title: '账户设置', description: '管理你的 Movio AI 账户信息和偏好设置', keywords: '账户设置,个人设置,偏好设置' },
  '/account/profile': { title: '个人资料', description: '编辑你的 Movio AI 个人资料', keywords: '个人资料,编辑资料,头像,昵称' },
  '/account/membership': { title: '我的会员', description: '查看和管理你的 Movio AI 会员订阅', keywords: '我的会员,会员管理,订阅管理,套餐' },
  '/account/billing': { title: '消费账单', description: '查看 Movio AI 消费记录和账单明细', keywords: '账单,消费记录,扣费明细,费用' },
  '/account/credits': { title: '积分明细', description: '查看算力积分余额和使用记录', keywords: '积分,算力,点数,余额,积分明细' },
  '/account/orders': { title: '我的订单', description: '查看支付订单记录', keywords: '订单,支付记录,购买记录' },
  '/account/works': { title: '我的作品', description: '查看和管理生成的作品图片和视频', keywords: '我的作品,作品库,生成记录,素材库' },
  '/account/templates': { title: '我的模板', description: '管理保存的批量处理模板', keywords: '模板,预设,批量模板,快捷模板' },
  '/account/collections': { title: '我的合集', description: '管理作品合集和收藏夹', keywords: '合集,收藏,收藏夹,作品合集' },
  '/account/notifications': { title: '消息通知', description: '查看系统推送的消息通知', keywords: '消息,通知,系统通知' },

  // ===== 我的页面 =====
  '/my/works': { title: '我的作品', description: '管理生成的AI作品', keywords: '作品,生成记录' },
  '/my/my-works': { title: '我的作品', description: '管理生成的AI作品', keywords: '作品,生成记录' },
  '/my/credits': { title: '积分明细', description: '查看积分使用明细', keywords: '积分,点数' },
  '/my/orders': { title: '我的订单', description: '查看订单记录', keywords: '订单,支付' },
  '/my/templates': { title: '我的模板', description: '管理批量处理模板', keywords: '模板,预设' },
  '/my/collections': { title: '我的合集', description: '管理作品合集', keywords: '合集,收藏' },
  '/my/settings': { title: '个人设置', description: '账户安全与偏好设置', keywords: '设置,安全,密码' },
  '/my/notifications': { title: '消息通知', description: '查看系统通知', keywords: '通知,消息' },

  // ===== DIY =====
  '/diy': { title: 'DIY页面', description: '自定义 Landing Page 搭建工具', keywords: 'DIY,页面搭建,自定义页面' },
  '/diy/editor': { title: 'DIY编辑器', description: '拖拽式页面编辑器', keywords: '编辑器,页面编辑,可视化编辑' },
  '/diy/preview': { title: 'DIY预览', description: '预览自定义页面效果', keywords: '预览,页面预览' },

  // ===== 法律 =====
  '/legal/privacy': { title: '隐私政策', description: 'Movio AI 隐私政策与数据保护声明', keywords: '隐私政策,数据保护,个人信息' },
  '/legal/terms': { title: '服务条款', description: 'Movio AI 用户服务协议', keywords: '服务条款,用户协议,使用协议' },

  // ===== 管理后台 =====
  '/admin/dashboard': { title: '管理后台', description: 'Movio AI 管理后台仪表盘', keywords: '' },
  '/admin/users': { title: '用户管理', description: '管理平台用户', keywords: '' },
  '/admin/tasks': { title: '任务管理', description: '查看和管理异步任务', keywords: '' },
  '/admin/orders': { title: '订单管理', description: '查看支付订单', keywords: '' },
  '/admin/plans': { title: '套餐管理', description: '管理会员套餐配置', keywords: '' },
  '/admin/credits': { title: '积分管理', description: '管理用户积分', keywords: '' },
  '/admin/prompts': { title: '提示词管理', description: '管理AI提示词模板', keywords: '' },
  '/admin/notifications': { title: '通知管理', description: '管理推送通知', keywords: '' },
  '/admin/logs': { title: '操作日志', description: '查看系统操作日志', keywords: '' },
  '/admin/ai-logs': { title: 'AI调用日志', description: '查看AI模型调用记录', keywords: '' },
  '/admin/sms-logs': { title: '短信日志', description: '查看短信发送记录', keywords: '' },
  '/admin/sms-templates': { title: '短信模板', description: '管理短信模板', keywords: '' },
  '/admin/tenants': { title: '租户管理', description: '管理多租户', keywords: '' },
  '/admin/diy': { title: 'DIY管理', description: '管理DIY页面模板', keywords: '' },
  '/admin/forms': { title: '表单管理', description: '管理自定义表单', keywords: '' },
  '/admin/proxy': { title: 'API代理', description: '管理API代理配置', keywords: '' },
  '/admin/recharge': { title: '充值管理', description: '管理充值订单', keywords: '' },
  '/admin/automation': { title: '自动化管理', description: '管理浏览器自动化任务', keywords: '' },
  '/admin/badges': { title: '徽章管理', description: '管理用户徽章', keywords: '' },
  '/admin/abuse': { title: '举报管理', description: '管理用户举报', keywords: '' },
  '/admin/moderation': { title: '内容审核', description: 'AI内容审核管理', keywords: '' },
  '/admin/site-config': { title: '站点配置', description: '管理站点全局配置', keywords: '' },
  '/admin/tier': { title: '等级管理', description: '管理用户等级体系', keywords: '' },
};

/**
 * 页面 SEO composable
 * @param overrides 可选覆盖项
 * @example usePageSEO({ title: '自定义标题' })
 */
export function usePageSEO(overrides?: { title?: string; description?: string; keywords?: string }) {
  const route = useRoute();
  const path = route.path;

  // 匹配路由（精确匹配 → 前缀匹配 → 默认值）
  let config: { title: string; description: string; keywords?: string } | undefined = pageSEOMap[path];
  if (!config) {
    // 尝试前缀匹配
    const matchKey = Object.keys(pageSEOMap).find(k => k !== '/' && path.startsWith(k + '/'));
    config = matchKey ? pageSEOMap[matchKey] : undefined;
  }

  const title = overrides?.title || config?.title || path.slice(1) || '首页';
  const description = overrides?.description || config?.description || 'Movio AI — 电商图片视频全功能一体化AI创作平台';
  const keywords = overrides?.keywords || config?.keywords || 'AI电商图,电商主图,AI场景图,商品视频,AI抠图';

  useHead({
    title,
    titleTemplate: '%s | Movio AI',
    meta: [
      { name: 'description', content: description },
      { name: 'keywords', content: keywords },
      { property: 'og:title', content: `${title} | Movio AI` },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: `${title} | Movio AI` },
      { name: 'twitter:description', content: description },
    ],
    script: [
      {
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: `Movio AI — ${title}`,
          description,
          applicationCategory: 'Multimedia',
          operatingSystem: 'Web',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
        }),
      },
    ],
  });
}

export default usePageSEO;
