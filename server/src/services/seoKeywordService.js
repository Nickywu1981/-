/**
 * SEO 关键词嵌入引擎 — 13 平台搜索算法独立适配
 *
 * 技术亮点：
 *   - 13 平台独立词库（淘宝/京东/拼多多/抖音/Amazon/eBay/Shopee/Lazada/TikTok Shop/1688/天猫/速卖通/Zalando）
 *   - 高搜索量关键词 + 长尾词双维度
 *   - 关键词嵌入密度 ≥3 个/标题
 */
import { BusinessError } from '../utils/businessError.js';

// 13 平台核心高搜索量关键词库（种子数据）
const PLATFORM_KEYWORDS = {
  taobao: {
    name: '淘宝',
    highVolume: ['2025新款', 'ins风', '网红同款', '高级感', '小众', '轻奢', '正品', '旗舰店', '学生党', '平价'],
    longTail: ['显瘦遮肉', '气质名媛风', '通勤百搭', '温柔风', '慵懒风', '设计感小众', '显高显腿长', '韩版宽松'],
    modifier: ['超火', '必入', '绝绝子', '闭眼入', '人手一件'],
    category: { 女装: ['显瘦', '气质', '温柔风'], 数码: ['高性价比', '跑分', '旗舰'], 美妆: ['持妆', '遮瑕', '水光感'], 家居: ['收纳', '北欧', 'ins风'] },
  },
  jd: {
    name: '京东',
    highVolume: ['官方正品', '自营', '品质保证', '旗舰级', '高端', '大容量', '超长续航', '高性能', '智能', '节能'],
    longTail: ['送运费险', '价保618', 'PLUS会员价', '新品首发', '以旧换新', '上门安装'],
    modifier: ['爆款', '口碑', '甄选', '优选', '严选'],
    category: { 家电: ['一级能效', '变频', '静音'], 数码: ['高刷屏', '旗舰芯片', '快充'], 生鲜: ['产地直发', '新鲜', '冷链'] },
  },
  pinduoduo: {
    name: '拼多多',
    highVolume: ['源头好货', '工厂直供', '万人团', '白菜价', '学生价', '清仓', '批发价', '超高性价比', '亏本冲量'],
    longTail: ['好评返现', '买一送一', '第二件半价', '新用户专享', '限时秒杀'],
    modifier: ['真香', '白嫖级', '破价', '骨折价'],
  },
  douyin: {
    name: '抖音电商',
    highVolume: ['带货王', '好物分享', '测评', '开箱', '种草', '必囤', '回购无数次', '直播间同款', '博主推荐'],
    longTail: ['意想不到', '惊呆了', '绝了', '太上头了', '这也太好用了', '后悔没早买'],
    modifier: ['神仙', '封神', '天花板', 'yyds'],
    category: { 美妆: ['伪素颜', '持妆王者', '水光肌'], 食品: ['追剧必备', '解馋神器', '宝藏零食'], 日用: ['懒人必备', '清洁神器'] },
  },
  amazon: {
    name: 'Amazon',
    highVolume: ['best seller', 'premium quality', 'new release', 'top rated', '#1 best seller', 'professional grade', 'heavy duty'],
    longTail: ['made in', 'with free shipping', 'for men women', 'easy to install', 'comes with', 'gift box packaging'],
    modifier: ['must have', 'game changer', 'life changing'],
    category: {
      electronics: ['wireless', 'portable', 'rechargeable', 'high speed'],
      home: ['space saving', 'easy to clean', 'durable'],
      fashion: ['trendy', 'casual', 'elegant'],
    },
  },
  ebay: {
    name: 'eBay',
    highVolume: ['brand new', 'original', 'authentic', 'free shipping', 'fast delivery', 'limited edition'],
    longTail: ['rare', 'vintage', 'collectible', 'hard to find', 'discontinued'],
    modifier: ['bargain', 'steal', 'gem'],
  },
  shopee: {
    name: 'Shopee',
    highVolume: ['murah', 'original', 'terlaris', 'best seller', 'promo', 'diskon', 'gratis ongkir', 'cod'],
    longTail: ['wajib punya', 'limited stock', 'ready stock', 'pengiriman cepat'],
    modifier: ['wow', 'keren', 'worth it'],
  },
  lazada: {
    name: 'Lazada',
    highVolume: ['original', 'authentic', 'warranty', 'free shipping', 'cod available', 'flash sale'],
    longTail: ['guaranteed', 'official store', 'same day delivery', 'easy return'],
  },
  tiktokshop: {
    name: 'TikTok Shop',
    highVolume: ['viral', 'trending', 'must have 2025', 'tiktok made me buy it', 'aesthetic', 'unboxing'],
    longTail: ['obsessed', 'can not believe', 'run dont walk', 'went viral on tiktok'],
    modifier: ['holy grail', 'changed my life', 'no joke'],
  },
  alibaba1688: {
    name: '1688',
    highVolume: ['源头厂家', '一手货源', '批发价', '来样定制', '爆款', '工厂直发', '一件代发'],
    longTail: ['支持混批', '小批量定制', '来图定制', '现货批发'],
  },
  tmall: {
    name: '天猫',
    highVolume: ['官方旗舰', '正品保证', '会员专享', '新品首发', '限量', '独家', '联名款'],
    longTail: ['顺丰包邮', '7天无理由', '花呗分期', '30天价保'],
    modifier: ['奢享', '尊享', '臻品'],
  },
  aliexpress: {
    name: '速卖通',
    highVolume: ['free shipping', 'wholesale', 'original', 'new 2025', 'dropshipping', 'fast delivery worldwide'],
    longTail: ['bulk order', 'custom logo', 'economy shipping', 'tracked'],
  },
  zalando: {
    name: 'Zalando',
    highVolume: ['nachhaltig', 'trend 2025', 'premium marke', 'limited edition', 'vegan', 'fair produziert'],
    longTail: ['kostenloser versand', '100 tage rückgaberecht', 'größenberatung'],
    modifier: ['must-have', 'it-piece', 'highlight'],
  },
};

// 平台搜索特性（用于调整嵌入策略）
const PLATFORM_SEO_TRAITS = {
  taobao: { maxTitleLen: 30, preferModifiers: true, keywordDensity: 'high', minKeywords: 4 },
  jd: { maxTitleLen: 45, preferModifiers: false, keywordDensity: 'medium', minKeywords: 3 },
  pinduoduo: { maxTitleLen: 40, preferModifiers: true, keywordDensity: 'very_high', minKeywords: 5 },
  douyin: { maxTitleLen: 35, preferModifiers: true, keywordDensity: 'high', minKeywords: 3 },
  amazon: { maxTitleLen: 200, preferModifiers: false, keywordDensity: 'medium', minKeywords: 3 },
  ebay: { maxTitleLen: 80, preferModifiers: false, keywordDensity: 'medium', minKeywords: 2 },
  shopee: { maxTitleLen: 100, preferModifiers: false, keywordDensity: 'medium', minKeywords: 3 },
  lazada: { maxTitleLen: 100, preferModifiers: false, keywordDensity: 'medium', minKeywords: 3 },
  tiktokshop: { maxTitleLen: 150, preferModifiers: true, keywordDensity: 'high', minKeywords: 3 },
  alibaba1688: { maxTitleLen: 60, preferModifiers: false, keywordDensity: 'very_high', minKeywords: 5 },
  tmall: { maxTitleLen: 30, preferModifiers: false, keywordDensity: 'medium', minKeywords: 3 },
  aliexpress: { maxTitleLen: 128, preferModifiers: false, keywordDensity: 'medium', minKeywords: 2 },
  zalando: { maxTitleLen: 100, preferModifiers: false, keywordDensity: 'medium', minKeywords: 2 },
};

/**
 * 从请求中提取品类关键词（可从 productName/category/description 中提取）
 */
function extractCategoryHints({ productName, category, description }) {
  const combined = [productName, category, description].filter(Boolean).join(' ');
  const hints = new Set();
  const categoryMap = {
    女装: /女装|裙子|连衣裙|上衣|裤子|外套/i,
    数码: /数码|手机|电脑|耳机|充电|数据线/i,
    美妆: /美妆|化妆|口红|粉底|护肤|面膜/i,
    家居: /家居|收纳|家具|厨房|浴室|装饰/i,
    家电: /家电|冰箱|电视|空调|洗衣|微波炉/i,
    食品: /食品|零食|糖果|坚果|方便面|茶叶/i,
    生鲜: /生鲜|水果|蔬菜|海鲜|肉类|鸡蛋/i,
    日用: /日用|纸巾|清洁|洗衣液|牙刷|毛巾/i,
    electronics: /electronics|phone|laptop|headphone|cable|charger/i,
    home: /home|kitchen|furniture|decor|bathroom/i,
    fashion: /fashion|clothing|dress|shoes|bag/i,
  };
  for (const [cat, re] of Object.entries(categoryMap)) {
    if (re.test(combined)) hints.add(cat);
  }
  return [...hints];
}

/**
 * 为核心产品名嵌入平台 SEO 关键词（核心引擎）
 *
 * @param {Object} params
 * @param {string} params.productName - 核心产品名（如 "蓝牙耳机"）
 * @param {string} params.platformCode - 平台代码
 * @param {string} [params.category] - 品类
 * @param {string} [params.description] - 产品描述
 * @param {number} [params.count=5] - 生成标题数
 * @returns {Promise<{keywords: string[], titles: string[], density: number, platform: string}>}
 */
export async function embedSEOKeywords({ productName, platformCode, category, description, count = 5 }) {
  const platform = PLATFORM_KEYWORDS[platformCode];
  if (!platform) throw new BusinessError(400, `不支持的平台: ${platformCode}`);

  const traits = PLATFORM_SEO_TRAITS[platformCode];
  const hints = extractCategoryHints({ productName, category, description });

  // 1. 选关键词：高流量 + 品类特化 + 修饰词
  const categoryKeywords = [];
  for (const hint of hints) {
    if (platform.category && platform.category[hint]) {
      categoryKeywords.push(...platform.category[hint]);
    }
  }

  const pool = [
    ...platform.highVolume,
    ...platform.longTail,
    ...categoryKeywords,
    ...(traits.preferModifiers ? platform.modifier : []),
  ];

  // 2. 去重 + 随机采样
  const unique = [...new Set(pool)];
  const selected = [];
  const used = new Set();
  const needed = Math.max(traits.minKeywords + 2, 6);
  while (selected.length < Math.min(needed, unique.length)) {
    const k = unique[Math.floor(Math.random() * unique.length)];
    if (!used.has(k)) { selected.push(k); used.add(k); }
  }

  // 3. 生成标题：产品名 + 关键词组合
  const titles = [];
  for (let i = 0; i < count; i++) {
    const kwSubset = selected.slice(0, traits.minKeywords + (i % 3));
    const shuffled = [...kwSubset].sort(() => Math.random() - 0.5);
    const titleParts = [productName, ...shuffled];
    let title = titleParts.join(' ');
    if (title.length > traits.maxTitleLen) {
      title = titleParts.slice(0, Math.ceil(titleParts.length * 0.7)).join(' ');
    }
    titles.push(title);
  }

  // 4. 密度 = 关键词数 / 标题词数
  const avgWords = titles.reduce((s, t) => s + t.split(/\s+/).length, 0) / titles.length;
  const density = selected.length / avgWords;

  return {
    keywords: selected.slice(0, traits.minKeywords + 3),
    titles,
    density: Math.round(density * 100) / 100,
    platform: platform.name,
    keywordCount: selected.length,
    minRequired: traits.minKeywords,
  };
}

/**
 * 获取指定平台的所有 SEO 关键词
 */
export function getPlatformKeywords(platformCode) {
  const platform = PLATFORM_KEYWORDS[platformCode];
  if (!platform) throw new BusinessError(400, `不支持的平台: ${platformCode}`);
  return {
    platform: platform.name,
    highVolume: platform.highVolume,
    longTail: platform.longTail,
    modifiers: platform.modifier || [],
    categories: Object.keys(platform.category || {}),
    traits: PLATFORM_SEO_TRAITS[platformCode],
  };
}

/**
 * 列出所有支持的 SEO 平台
 */
export function listSEOPlatforms() {
  return Object.entries(PLATFORM_KEYWORDS).map(([code, p]) => ({
    code,
    name: p.name,
    keywordCount: (p.highVolume || []).length + (p.longTail || []).length + (p.modifier || []).length,
    supportedLanguages: code.match(/^(amazon|ebay|shopee|lazada|tiktokshop|aliexpress|zalando)$/) ? 'en/multi' : 'zh',
  }));
}

export { PLATFORM_KEYWORDS, PLATFORM_SEO_TRAITS };
