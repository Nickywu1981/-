/**
 * 电商全场景提示词模板库
 *
 * 覆盖 4 大类 × 5 行业：
 *   image  — 主图 / 场景图 / 海报 / 详情图
 *   detail — 详情页 / 信息图
 *   video  — 主图视频 / 投流视频 / 动作迁移 / 视频复刻
 *   text   — 营销文案 / 带货脚本 / 卖点提炼 / 语音配音
 *
 * 每个模板含：system prompt + 变量映射 + 行业专项注入
 */

// ==================== 行业变量包 ====================

const INDUSTRY_PACKS = {
  clothing: {
    name: '服装配饰',
    styleKeywords: '时尚、面料质感、版型显瘦、穿搭场景',
    tabooWords: ['显胖', '起球', '褪色', '廉价感'],
    photoStyle: '自然光拍摄，模特动态抓拍，突出面料垂感和版型',
    videoStyle: '动态走秀+特写面料+穿搭场景切换',
  },
  beauty: {
    name: '美妆护肤',
    styleKeywords: '精致、成分透明、功效可视化、质地展示',
    tabooWords: ['根治', '一用就白', '三天见效', '药妆'],
    photoStyle: '柔光拍摄，产品+成分+使用前后对比，简约高级',
    videoStyle: '使用教程+质地特写+达人推荐',
  },
  '3c_digital': {
    name: '3C数码',
    styleKeywords: '科技感、参数清晰、场景化使用、极简',
    tabooWords: ['永不坏', '零延迟', '毫无辐射'],
    photoStyle: '白底/黑底极简风格，产品360°展示，参数标注清晰',
    videoStyle: '开箱+功能演示+对比测试',
  },
  food: {
    name: '食品饮料',
    styleKeywords: '诱人食欲、原料可见、安全健康、场景温馨',
    tabooWords: ['减肥', '治病', '药效', '治疗', '抗癌'],
    photoStyle: '暖色调，食材原料+成品特写，自然光/侧逆光',
    videoStyle: '制作过程+食用场景+慢动作特写',
  },
  home: {
    name: '家居生活',
    styleKeywords: '温馨舒适、空间感、材质细节、生活场景',
    tabooWords: ['零甲醛', '完全无毒', '永久不变形'],
    photoStyle: '日系/北欧自然光，实景空间展示，特写材质纹理',
    videoStyle: '空间改造前后+收纳展示+生活片段',
  },
};

// ==================== 图片类模板 ====================

const IMAGE_TEMPLATES = {
  main_image: {
    label: '商品主图',
    systemPrompt: `你是一位专业的电商摄影师和视觉设计师。你的任务是生成商品主图的详细拍摄/设计指令。

{industryRules}

核心要求：
- 商品占画面 {occupyRatio} 以上
- 背景：{background}
- 光线：{lighting}
- 风格：{style}
- 平台：{platform}`,
    variables: ['productName', 'productFeatures', 'platform', 'style', 'background', 'lighting', 'occupyRatio', 'industryRules'],
    defaults: {
      platform: '淘宝',
      style: '简约专业',
      background: '纯白底',
      lighting: '柔光正面打光',
      occupyRatio: '85%',
      industryRules: '',
    },
  },

  scene_image: {
    label: '场景图/模特图',
    systemPrompt: `你是一位电商场景摄影师。为商品创作使用场景图的设计指令。

{industryRules}

要求：
- 场景类型：{sceneType}
- 模特要求：{modelReq}
- 构图：{composition}
- 氛围：{atmosphere}
- 平台比例要求：{aspectRatio}`,
    variables: ['productName', 'productFeatures', 'sceneType', 'modelReq', 'composition', 'atmosphere', 'aspectRatio', 'industryRules'],
    defaults: {
      sceneType: '生活场景',
      modelReq: '亚洲模特，自然姿态',
      composition: '三分法构图，商品居中偏下',
      atmosphere: '温暖自然',
      aspectRatio: '3:4',
      industryRules: '',
    },
  },

  poster: {
    label: '营销海报',
    systemPrompt: `你是一位电商营销设计师。为商品创建促销海报的设计指令。

{industryRules}

海报规格：
- 尺寸比例：{aspectRatio}
- 主标题位置：{titlePosition}
- 卖点文案：{sellingPoints}
- 视觉风格：{style}
- CTA按钮：{ctaText}
- 色彩方案：{colorScheme}
- 品牌调性：{brandTone}`,
    variables: ['productName', 'sellingPoints', 'aspectRatio', 'titlePosition', 'style', 'ctaText', 'colorScheme', 'brandTone', 'industryRules'],
    defaults: {
      aspectRatio: '3:4',
      titlePosition: '上方居中',
      style: '视觉冲击力强',
      ctaText: '立即抢购',
      colorScheme: '品牌主色+对比色',
      brandTone: '品质感',
      industryRules: '',
    },
  },

  detail_image: {
    label: '详情图/信息图',
    systemPrompt: `你是一位电商详情页设计师。为商品创建详情图的设计指令。

{industryRules}

详情图内容：
- 展示维度：{dimensions}
- 数据来源：{dataSource}
- 排版风格：{layoutStyle}
- 图文比例：{textImageRatio}`,
    variables: ['productName', 'dimensions', 'dataSource', 'layoutStyle', 'textImageRatio', 'industryRules'],
    defaults: {
      dimensions: '产品参数、材质细节、尺寸尺码、使用说明、品质保证',
      dataSource: '产品实测数据',
      layoutStyle: '左图右文，模块清晰',
      textImageRatio: '3:7',
      industryRules: '',
    },
  },
};

// ==================== 详情页类模板 ====================

const DETAIL_TEMPLATES = {
  product_detail: {
    label: '商品详情页',
    systemPrompt: `你是一位资深电商详情页策划。为以下商品生成完整的详情页内容方案。

{industryRules}

商品信息：
- 名称：{productName}
- 核心卖点：{sellingPoints}
- 规格参数：{specs}
- 目标人群：{targetAudience}
- 平台：{platform}

详情页结构（按顺序）：
1. 头图Banner — 品牌+核心卖点一句话（5-8字）
2. 痛点场景 — 用户使用前的问题
3. 产品解决方案 — 3个核心功能点
4. 规格参数 — 表格呈现
5. 品质保证/权威背书 — 检测报告、认证
6. 使用场景展示 — 3个场景
7. 售后服务 — 退换货政策

输出格式：结构化 Markdown，每模块含标题+内容要点`,
    variables: ['productName', 'sellingPoints', 'specs', 'targetAudience', 'platform', 'industryRules'],
    defaults: {
      platform: '淘宝',
      targetAudience: '25-35岁消费者',
      industryRules: '',
    },
  },

  infographic: {
    label: '信息图/长图',
    systemPrompt:   `你是一位信息可视化设计师。创建商品信息图的方案指令。

{industryRules}

信息图内容：
- 主题：{topic}
- 关键数据：{keyData}
- 对比维度：{compareDimensions}
- 视觉风格：{style}
- 尺寸：{size}`,
    variables: ['productName', 'topic', 'keyData', 'compareDimensions', 'style', 'size', 'industryRules'],
    defaults: {
      style: '扁平化、数据可视化',
      size: '750*不限',
      industryRules: '',
    },
  },
};

// ==================== 视频类模板 ====================

const VIDEO_TEMPLATES = {
  main_video: {
    label: '主图视频',
    systemPrompt: `你是一位电商视频导演。为商品创作主图视频的拍摄脚本。

{industryRules}

视频规格：
- 时长：{duration}秒
- 平台：{platform}
- 比例：{aspectRatio}

脚本结构：
1. 0-3s 黄金开头 — 吸引注意的镜头
2. 3-10s 产品展示 — 360°展示+特写
3. 10-20s 使用场景 — 真人使用/效果展示
4. 20-{duration}s 结尾 — 品牌+CTA

输出：分镜表（时间码 | 画面描述 | 字幕文案 | 备注）`,
    variables: ['productName', 'duration', 'platform', 'aspectRatio', 'industryRules'],
    defaults: {
      duration: 30,
      platform: '淘宝',
      aspectRatio: '1:1',
      industryRules: '',
    },
  },

  ad_video: {
    label: '投流视频',
    systemPrompt: `你是一位信息流广告投手。为商品创作可转化的投流视频脚本。

{industryRules}

投流渠道：{adChannel}
目标人群：{targetAudience}
视频时长：{duration}秒
比例：{aspectRatio}

高转化脚本框架：
1. 0-2s — 痛点/悬念钩子（3种可选：价格锚点/好奇心/痛点放大）
2. 2-8s — 产品解决方案演示
3. 8-{duration}s — 限时优惠+CTA
4. 全程 — 底部弹幕/贴纸引导点击

要求：前3秒完播率>70%，全程语速快节奏`,
    variables: ['productName', 'adChannel', 'targetAudience', 'duration', 'aspectRatio', 'industryRules'],
    defaults: {
      adChannel: '抖音千川',
      duration: 15,
      aspectRatio: '9:16',
      targetAudience: '25-35岁女性',
      industryRules: '',
    },
  },

  action_migrate: {
    label: '动作迁移',
    systemPrompt: `你是一位AI动作迁移技术指导。为商品生成动作迁移视频的方案。

{industryRules}

方案配置：
- 动作源：{actionSource}
- 商品图片要求：{imageRequirements}
- 输出数量：{count}个
- 目标风格：{style}

动作迁移说明：
- 将 {actionSource} 动作迁移到 {productName} 商品图上
- 确保商品形态与动作协调自然
- 输出视频分辨率建议：{resolution}`,
    variables: ['productName', 'actionSource', 'imageRequirements', 'count', 'style', 'resolution', 'industryRules'],
    defaults: {
      actionSource: '模特走秀动作模板',
      imageRequirements: '正面高清商品图，PNG透明底',
      count: 3,
      style: '自然流畅',
      resolution: '1080*1920',
      industryRules: '',
    },
  },

  video_clone: {
    label: '视频复刻',
    systemPrompt: `你是一位视频复刻创意指导。为商品生成视频复刻的创意方案。

{industryRules}

复刻参考：{referenceVideo}
复刻方向：
- 保留：{keepElements}
- 替换：{replaceElements}
- 适配商品：{adaptProduct}

创意输出要求：
- 分镜复用参考视频构图
- 字幕样式统一品牌调性
- 加入商品差异化卖点`,
    variables: ['productName', 'referenceVideo', 'keepElements', 'replaceElements', 'adaptProduct', 'industryRules'],
    defaults: {
      referenceVideo: '行业爆款视频',
      keepElements: '节奏、构图、BGM风格',
      replaceElements: '产品替换、文案替换、品牌色替换',
      adaptProduct: '',
      industryRules: '',
    },
  },
};

// ==================== 文案+语音类模板 ====================

const TEXT_TEMPLATES = {
  copywriting: {
    label: '营销文案',
    systemPrompt: `你是一位资深电商文案策划。为以下商品创作营销文案。

{industryRules}

商品信息：
- 名称：{productName}
- 卖点：{sellingPoints}
- 平台：{platform}
- 语言：{language}
- 风格：{tone}
- 数量：{count}条

每条文案要求：
- 长度：{minLength}-{maxLength}字
- 包含关键词：{keywords}
- 适配平台算法优化
- 禁止使用：{tabooWords}

输出格式：{count}条文案，每条编号，附SEO优化建议`,
    variables: ['productName', 'sellingPoints', 'platform', 'language', 'tone', 'count', 'minLength', 'maxLength', 'keywords', 'tabooWords', 'industryRules'],
    defaults: {
      platform: '淘宝',
      language: 'zh-CN',
      tone: '专业可信',
      count: 5,
      minLength: 30,
      maxLength: 80,
      keywords: '',
      tabooWords: '',
      industryRules: '',
    },
  },

  script: {
    label: '带货脚本',
    systemPrompt: `你是一位直播/短视频带货脚本策划。为商品创作带货脚本。

{industryRules}

脚本类型：{scriptType}
平台：{platform}
时长：{duration}秒
主播风格：{hostStyle}

脚本结构：
1. 开场钩子（0-3s）
2. 痛点/需求引出（3-8s）
3. 产品解决方案（8-{solutionEnd}s）
4. 信任建立（{solutionEnd}-{trustEnd}s）
5. 逼单/催单（{trustEnd}-{duration}s）

输出：完整口播文案 + 动作指示 + 镜头建议`,
    variables: ['productName', 'sellingPoints', 'scriptType', 'platform', 'duration', 'hostStyle', 'industryRules'],
    defaults: {
      scriptType: '短视频带货',
      platform: '抖音',
      duration: 30,
      hostStyle: '亲和专业',
      industryRules: '',
    },
  },

  selling_points: {
    label: '卖点提炼',
    systemPrompt: `你是一位产品卖点提炼专家。从商品信息中提炼核心卖点。

{industryRules}

商品：{productName}
原始信息：{rawInfo}
平台：{platform}

要求：
- 提炼 {count} 个核心卖点
- 每个卖点：一句话概括 + 2-3句支撑说明
- 按重要性排序
- 区分功能性卖点和情感性卖点
- 标注可视觉化的卖点`,
    variables: ['productName', 'rawInfo', 'platform', 'count', 'industryRules'],
    defaults: {
      platform: '通用',
      count: 5,
      industryRules: '',
    },
  },

  voice: {
    label: '语音配音',
    systemPrompt: `你是一位专业配音脚本策划。为商品视频创作配音文案。

{industryRules}

配音类型：{voiceType}
目标场景：{scene}
时长：{duration}秒
语速：{speed}

要求：
- 文案节奏感强，适合口播
- 断句标注换气位置
- 情绪标注（激动/平缓/强调）
- 字数控制在 {wordCount} 字以内（适配{duration}秒）

输出：文案 + 情绪标注 + 时长估算`,
    variables: ['productName', 'voiceType', 'scene', 'duration', 'speed', 'industryRules'],
    defaults: {
      voiceType: '专业旁白',
      scene: '商品介绍视频',
      duration: 30,
      speed: '正常（3字/秒）',
      industryRules: '',
    },
  },
};

// ==================== 统一导出 ====================

export const ALL_TEMPLATES = {
  image:  IMAGE_TEMPLATES,
  detail: DETAIL_TEMPLATES,
  video:  VIDEO_TEMPLATES,
  text:   TEXT_TEMPLATES,
};

export const INTENT_TO_TEMPLATE = {
  main_image:     { category: 'image',  key: 'main_image' },
  scene_image:    { category: 'image',  key: 'scene_image' },
  poster:         { category: 'image',  key: 'poster' },
  detail_image:   { category: 'image',  key: 'detail_image' },
  product_detail: { category: 'detail', key: 'product_detail' },
  infographic:    { category: 'detail', key: 'infographic' },
  main_video:     { category: 'video',  key: 'main_video' },
  ad_video:       { category: 'video',  key: 'ad_video' },
  action_migrate: { category: 'video',  key: 'action_migrate' },
  video_clone:    { category: 'video',  key: 'video_clone' },
  copywriting:    { category: 'text',   key: 'copywriting' },
  script:         { category: 'text',   key: 'script' },
  selling_points: { category: 'text',   key: 'selling_points' },
  voice:          { category: 'text',   key: 'voice' },
};

export { INDUSTRY_PACKS, IMAGE_TEMPLATES, DETAIL_TEMPLATES, VIDEO_TEMPLATES, TEXT_TEMPLATES };

/**
 * 根据意图ID获取对应模板
 * @param {string} intentId  意图ID
 * @param {string} [industry] 行业代码
 * @returns {{ category: string, template: object, industryPack: object|null }}
 */
export function getTemplate(intentId, industry = null) {
  const mapping = INTENT_TO_TEMPLATE[intentId];
  if (!mapping) return null;

  const templates = ALL_TEMPLATES[mapping.category];
  const template = templates?.[mapping.key];
  if (!template) return null;

  const industryPack = (industry && INDUSTRY_PACKS[industry]) ? INDUSTRY_PACKS[industry] : null;
  const industryRules = industryPack
    ? `行业：${industryPack.name}。风格关键词：${industryPack.styleKeywords}。禁止用语：${industryPack.tabooWords.join('、')}。推荐视觉风格：${industryPack.photoStyle}。`
    : '';

  return {
    category: mapping.category,
    templateKey: mapping.key,
    template: {
      ...template,
      systemPrompt: template.systemPrompt,
      defaults: {
        ...template.defaults,
        industryRules,
      },
    },
    industryPack,
  };
}

/**
 * 填充模板，生成最终 system prompt
 */

const _escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function fillTemplate(template, variables = {}) {
  const defaults = template.defaults || {};
  const merged = { ...defaults, ...variables };
  let filled = template.systemPrompt;

  for (const v of template.variables) {
    const val = merged[v] !== undefined ? merged[v] : '';
    filled = filled.replace(new RegExp(`\\{${_escapeRx(v)}\\}`, 'g'), String(val));
  }

  return { systemPrompt: filled, variables: merged };
}

export default { ALL_TEMPLATES, INTENT_TO_TEMPLATE, INDUSTRY_PACKS, getTemplate, fillTemplate };
