/**
 * 电商合规引擎 — 全局前置校验
 *
 * 三合一校验：
 *   1) 广告法禁用词   — 中国广告法第9+17条 + 市场监管案例词
 *   2) 平台违禁词     — 淘宝/京东/抖音/拼多多 各平台审核红线
 *   3) 行业敏感词     — 母婴/食品/化妆品/医疗 行业特殊管控
 *
 * 拦截级别：
 *   block  — 直接拒绝，不下发模型
 *   warn   — 记录告警，弹窗提示商家
 *   replace — 自动替换为合规表述
 */
import logger from '../utils/logger.js';

// ==================== 广告法禁用词库 ====================

const AD_LAW_FORBIDDEN = {
  // 绝对化用语（广告法第9条）
  absolute: {
    level: 'block',
    words: [
      '最好', '最佳', '最优', '第一', '唯一', '首选', '顶级', '极致', '绝对',
      '国家级', '世界级', '最高级', '顶尖', '无可替代', '独一无二', '史无前例',
      '全网第一', '行业第一', '销量第一', '排名第一', '冠军', '领导品牌',
      '最先进', '最便宜', '最低价', '最受欢迎', '最有效', '最安全', '100%',
      '百分百', '彻底', '完全', '绝佳', '完美', '万能', '全能',
    ],
    suggestion: '请改用数据支撑的具体描述，如"累计销量50万+"替代"销量第一"',
  },

  // 权威机构背书（广告法第17条）
  authority: {
    level: 'block',
    words: [
      '国家推荐', '政府指定', '国家机关', '国务院', '中央', '国家级认证',
      '人民大会堂', '中南海', '钓鱼台', '特供', '专供', '军用', '军队',
      '央视推荐', 'CCTV推荐', '新华社推荐', '人民日报推荐',
      '中国驰名商标', '中国名牌', '中国免检', '免检产品',
      '国家领导人', '总理', '主席', '国宴', '国礼', '国宾',
    ],
    suggestion: '不得借国家机关/权威机构名义进行商业宣传',
  },

  // 功效夸大（广告法第17条 + 反不正当竞争法）
  exaggeration: {
    level: 'block',
    words: [
      '根治', '根除', '治愈', '治疗', '疗程', '药到病除', '永不复发',
      '一疗程见效', '一针见效', '三天见效', '一周见效', '无效退款',
      '纯天然', '无副作用', '安全无毒', '无任何毒副作用', '老少皆宜',
      '立竿见影', '瞬间', '瞬间见效', '立刻变白', '秒变', '一喷即白',
      '基因', 'DNA', '干细胞', '细胞修复', '细胞再生', '纳米', '量子',
      '永久', '终身', '终身不坏', '永不变形', '永不褪色', '永不磨损',
    ],
    suggestion: '功效描述需提供检测报告支撑，禁止使用绝对化功效承诺',
  },

  // 金融/收益承诺
  finance: {
    level: 'block',
    words: [
      '保证收益', '保本', '无风险', '零风险', '稳赚', '必赚', '躺赚',
      '年化', '回报率', '收益', '赚钱', '暴富', '发财', '翻倍',
      '月入过万', '日入', '轻松赚钱', '一夜暴富', '财富自由',
      '稳赚不赔', '只赚不赔', '稳赢', '必涨', '不会亏',
    ],
    suggestion: '投资/理财类宣传需标注风险提示',
  },

  // 比较贬低
  comparison: {
    level: 'warn',
    words: [
      '比XX好', '秒杀', '吊打', '碾压', '完爆', '甩XX几条街',
      '其他品牌都是垃圾', '市面上最好的', '别家不行', '其他都不行',
      '唯一正宗', '唯一正品', '唯一授权', '假一赔命', '假一赔万',
    ],
    suggestion: '可客观对比参数，不得贬低竞争对手',
  },

  // 诱导/迷信
  inducement: {
    level: 'warn',
    words: [
      '不买后悔', '错过等一年', '最后一次', '马上就要涨价', '库存告急',
      '赶紧抢', '手慢无', '限时', '限量', '最后一天', '最后机会',
      '开光', '加持', '风水', '转运', '招财', '辟邪', '保平安', '灵验',
    ],
    suggestion: '促销信息需标注活动时限、库存真实数据',
  },
};

// ==================== 平台违禁词 ====================

const PLATFORM_RULES = {
  taobao: {
    name: '淘宝/天猫',
    block: ['微信', '微信二维码', '加微信', '微信号', '扫码加微信', 'QQ号', '手机号', '线下交易', '货到付款', '到付', '好评返现', '五星好评返', '刷单', '刷好评', '好评有礼'],
    warn:  ['其他平台', '拼多多同款', '京东同款'],
  },
  douyin: {
    name: '抖音',
    block: ['微信', '加微信', '微信号', '二维码', '引流', '私域', '线下', '转账', '货到付款', '最', '第一', '国家级', '全网', '假货', '高仿', '药', '医疗', '处方', '疾病'],
    warn:  ['价格', '多少钱', '优惠券', '折扣'],
  },
  kuaishou: {
    name: '快手',
    block: ['微信', '加微信', '微信号', '私域', '引流', '最', '第一', '国家级', '假货', '高仿', '医疗', '药', '处方'],
    warn:  ['价格', '低价', '便宜'],
  },
  jd: {
    name: '京东',
    block: ['微信', '加微信', '微信号', '第三方', '其他平台', '外部链接', '好评返现', '刷单'],
    warn:  ['价格', '最低价'],
  },
};

// ==================== 行业敏感词 ====================

const INDUSTRY_RULES = {
  food: {
    name: '食品',
    block: ['减肥', '瘦身', '排毒', '清肠', '溶脂', '燃脂', '降血糖', '降血压', '降血脂', '抗癌', '防癌', '抗衰老', '增强免疫力', '提高抵抗力', '调节内分泌', '壮阳', '补肾', '药膳', '中药', '治疗肠胃'],
    warn:  ['低脂', '无糖', '零卡', '低卡', '无添加', '有机', '天然'],
  },
  cosmetic: {
    name: '化妆品',
    block: ['药妆', '医学护肤', '干细胞', 'DNA修复', '基因美白', '细胞再生', '祛斑', '淡斑', '祛痘', '除皱', '去皱', '抗皱', '美白', '褪黑', '消炎', '杀菌', '修复过敏', '治疗皮炎'],
    warn:  ['无添加', '零刺激', '纯天然', '无酒精', '零致敏', '医美级'],
  },
  mother_baby: {
    name: '母婴',
    block: ['治疗', '药用', '抗病毒', '抗菌', '消炎', '促进发育', '提高智商', '聪明', '天才', '早教专家', '神童', '开发右脑', '过目不忘'],
    warn:  ['有机', '纯天然', '无添加', '零甲醛', '零刺激'],
  },
  medical: {
    name: '医疗器械/保健品',
    block: ['治愈', '根治', '治疗', '疗程', '药到病除', '无效退款', '替代药品', '停用药品', '减少药物依赖', '自愈', '康复', '痊愈', '标本兼治'],
    warn:  ['保健', '调理', '改善', '辅助', '营养补充'],
  },
};

// ==================== 主引擎 ====================

/**
 * 执行合规校验
 * @param {string} text         待校验文本
 * @param {object} opts         选项
 * @param {string} opts.platform 平台 (taobao|douyin|jd|kuaishou)
 * @param {string} opts.industry 行业 (food|cosmetic|mother_baby|medical)
 * @param {boolean} opts.strict  严格模式 — warn 也返回 block
 * @returns {{ passed: boolean, violations: Array, sanitizedText?: string }}
 */
export function checkCompliance(text, opts = {}) {
  if (!text || typeof text !== 'string') {
    return { passed: true, violations: [], sanitizedText: text };
  }

  const violations = [];
  const platform = opts.platform || 'taobao';
  const industry = opts.industry || null;
  const strict = opts.strict || false;

  // 1) 广告法通用禁用词
  _checkCategory(text, AD_LAW_FORBIDDEN, '广告法', violations);

  // 2) 平台专项
  if (PLATFORM_RULES[platform]) {
    _checkPlatformRules(text, PLATFORM_RULES[platform], violations);
  }

  // 3) 行业专项
  if (industry && INDUSTRY_RULES[industry]) {
    _checkIndustryRules(text, INDUSTRY_RULES[industry], violations);
  }

  // 去重
  const unique = _deduplicate(violations);

  // 判定是否通过
  const hasBlock = unique.some(v => v.action === 'block');
  const hasWarn = unique.some(v => v.action === 'warn');
  const passed = strict ? (!hasBlock && !hasWarn) : !hasBlock;

  // 构建脱敏后文本
  let sanitizedText = text;
  if (!passed) {
    for (const v of unique) {
      if (v.action === 'block') {
        sanitizedText = sanitizedText.replace(new RegExp(v.matched, 'g'), '***');
      }
    }
  }

  if (unique.length > 0) {
    logger.warn('[Compliance] violations found', {
      count: unique.length,
      blocked: unique.filter(v => v.action === 'block').map(v => v.matched),
      warned: unique.filter(v => v.action === 'warn').map(v => v.matched),
      platform,
      industry,
    });
  }

  return { passed, violations: unique, sanitizedText };
}

/**
 * 单个文本快速阻断判断 — 用于网关 pre-invoke 前置拦截
 */
export function isBlocked(text, opts = {}) {
  const { passed, violations } = checkCompliance(text, { ...opts, strict: false });
  const blockers = violations.filter(v => v.action === 'block');
  if (blockers.length === 0) return { blocked: false };
  return {
    blocked: true,
    reason: blockers.map(v => `"${v.matched}" 违反${v.source}${v.category}规定`).join('；'),
    suggestion: blockers[0].suggestion || '请修改后重试',
  };
}

// ==================== 内部辅助 ====================

function _checkCategory(text, ruleSet, source, out) {
  for (const [category, rule] of Object.entries(ruleSet)) {
    if (typeof rule === 'object' && rule.words) {
      for (const word of rule.words) {
        if (text.includes(word)) {
          out.push({
            matched: word,
            source,
            category,
            action: rule.level || 'block',
            suggestion: rule.suggestion || '',
          });
        }
      }
    }
  }
}

function _checkPlatformRules(text, rules, out) {
  for (const level of ['block', 'warn']) {
    if (rules[level]) {
      for (const word of rules[level]) {
        if (text.includes(word)) {
          out.push({
            matched: word,
            source: '平台规范',
            category: rules.name,
            action: level,
            suggestion: `该内容违反${rules.name}平台审核规则，请修改`,
          });
        }
      }
    }
  }
}

function _checkIndustryRules(text, rules, out) {
  for (const level of ['block', 'warn']) {
    if (rules[level]) {
      for (const word of rules[level]) {
        if (text.includes(word)) {
          out.push({
            matched: word,
            source: '行业规范',
            category: rules.name,
            action: level,
            suggestion: `${rules.name}行业不允许使用"${word}"进行宣传`,
          });
        }
      }
    }
  }
}

function _deduplicate(violations) {
  const seen = new Set();
  return violations.filter(v => {
    const key = `${v.matched}|${v.source}|${v.action}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default { checkCompliance, isBlocked };
