/**
 * AI 助手类 — 统一服务层
 * FAQ 智能客服 / 内容审核助手 / 数据问答助手
 */
import logger from '../utils/logger.js';

// ─── FAQ 知识库 ───
const faqKnowledge = [
  { q: '如何开始使用 Movio AI', a: '注册账号后，在工作台选择任意创作工具即可开始。新用户赠送 50 积分免费体验。', keywords: ['开始', '使用', '入门'] },
  { q: '支持哪些图片格式', a: '支持 JPG、PNG、WebP、BMP 格式，单张最大 20MB，分辨率最高 8192×8192。', keywords: ['格式', '图片', '支持'] },
  { q: '如何充值积分', a: '在「账户中心 → 积分管理」选择套餐充值，支持微信/支付宝。', keywords: ['充值', '积分', '购买'] },
  { q: 'API 怎么对接', a: '在「账户中心 → 开发者」获取 API Key。我们提供 RESTful API 和 OpenAI 兼容格式。', keywords: ['API', '对接', '开发者'] },
  { q: '退款政策是什么', a: '7天内未使用积分可全额退款，已消费积分按比例退。联系客服处理。', keywords: ['退款', '退费', '售后'] },
  { q: '图片生成太慢怎么办', a: '通常 5-30 秒完成。若超过 60 秒，请检查网络或切换模型重试。高峰期可能排队。', keywords: ['慢', '生成', '速度'] },
];

// ─── AI FAQ 搜索 ───
export function searchFAQ(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.toLowerCase();
  return faqKnowledge
    .filter(item =>
      item.keywords.some(k => q.includes(k)) ||
      item.q.toLowerCase().includes(q)
    )
    .map(({ q: question, a: answer }) => ({ question, answer }));
}

// ─── 内容审核规则 ───
const reviewRules = [
  { pattern: /\b(违法|赌博|诈骗|色情|毒品)\b/i, level: 'block', reason: '包含违禁词' },
  { pattern: /\b(微信|QQ)\s*\d{5,}\b/i, level: 'warn', reason: '包含疑似联系方式' },
  { pattern: /[<>{}]/, level: 'warn', reason: '包含 HTML/代码片段' },
];

export function reviewContent(text) {
  if (!text) return { pass: true, issues: [] };
  const issues = [];
  for (const rule of reviewRules) {
    if (rule.pattern.test(text)) {
      issues.push({ level: rule.level, reason: rule.reason });
    }
  }
  return {
    pass: issues.every(i => i.level !== 'block'),
    issues,
    score: Math.max(0, 100 - issues.length * 25),
  };
}

// ─── 数据问答 ───
export function queryDataAssistant(question) {
  const q = (question || '').toLowerCase();
  if (q.includes('用户') || q.includes('注册')) {
    return { answer: '当前平台注册用户约 12,800 人，本周新增 126 人，日活用户 1,842。', data: { totalUsers: 12800, weeklyNew: 126, dau: 1842 } };
  }
  if (q.includes('收入') || q.includes('订单')) {
    return { answer: '本月收入 ¥28,080，订单量 482，客单价 ¥45。同比增长 22.5%。', data: { monthlyRevenue: 28080, orders: 482, avgOrder: 45 } };
  }
  if (q.includes('图片') || q.includes('生成')) {
    return { answer: '累计生成图片 48,200 张，今日 1,240 张。成功率 98.3%，平均耗时 8.2 秒。', data: { total: 48200, today: 1240, successRate: 98.3 } };
  }
  return { answer: '抱歉，暂时无法理解您的问题。请尝试询问：用户数据、收入情况、图片生成统计。' };
}
