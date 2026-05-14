/**
 * 电商智能意图分类引擎
 *
 * 覆盖 4 大类 10 种电商场景，自动识别无需传 type：
 *   image    — 主图 / 场景图 / 海报 / 详情图
 *   detail   — 详情页 / 信息图
 *   video    — 主图视频 / 投流视频 / 动作迁移 / 视频复刻
 *   text     — 文案 / 脚本 / 卖点提炼 / 语音配音
 *
 * 分类策略：
 *   1) 关键词快速命中 (< 1ms)
 *   2) LLM 兜底分类 (仅关键词未命中时)
 *   3) 结果缓存 (相同输入复用)
 */
import { gatewayRoute } from '../gateway/aiGatewayHub.js';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 意图枚举 ====================

export const INTENT_TYPES = {
  // 图片类
  MAIN_IMAGE:     { id: 'main_image',     category: 'image',  label: '商品主图' },
  SCENE_IMAGE:    { id: 'scene_image',    category: 'image',  label: '场景图' },
  POSTER:         { id: 'poster',         category: 'image',  label: '营销海报' },
  DETAIL_IMAGE:   { id: 'detail_image',   category: 'image',  label: '详情图' },

  // 详情页类
  PRODUCT_DETAIL: { id: 'product_detail', category: 'detail', label: '商品详情页' },
  INFOGRAPHIC:    { id: 'infographic',    category: 'detail', label: '信息图' },

  // 视频类
  MAIN_VIDEO:     { id: 'main_video',     category: 'video',  label: '主图视频' },
  AD_VIDEO:       { id: 'ad_video',       category: 'video',  label: '投流视频' },
  ACTION_MIGRATE: { id: 'action_migrate', category: 'video',  label: '动作迁移' },
  VIDEO_CLONE:    { id: 'video_clone',    category: 'video',  label: '视频复刻' },

  // 文案+语音类
  COPYWRITING:    { id: 'copywriting',    category: 'text',   label: '营销文案' },
  SCRIPT:         { id: 'script',         category: 'text',   label: '带货脚本' },
  SELLING_POINTS: { id: 'selling_points', category: 'text',   label: '卖点提炼' },
  VOICE:          { id: 'voice',          category: 'text',   label: '语音配音' },

  // 对话+综合类（Phase 1.5 扩展）
  CHAT:           { id: 'chat',           category: 'chat',   label: '通用问答' },
  TRANSLATE:      { id: 'translate',      category: 'text',   label: '跨境翻译' },
  COMPLIANCE:     { id: 'compliance',     category: 'chat',   label: '合规检查' },
  ANALYSE_IMAGE:  { id: 'analyse_image',  category: 'chat',   label: '图片分析' },
};

// ==================== 关键词快速匹配 ====================

const KEYWORD_MAP = [
  { intent: 'main_image',     kw: ['主图','白底图','商品图','产品图','首图','正面图'] },
  { intent: 'scene_image',    kw: ['场景图','场景','使用场景','模特图','摆拍','上身图','穿搭'] },
  { intent: 'poster',         kw: ['海报','促销图','banner','活动图','主图海报','营销图','封面'] },
  { intent: 'detail_image',   kw: ['详情图','详情页图','详情','描述图','产品详情图','介绍图','细节图','尺寸图'] },
  { intent: 'product_detail', kw: ['详情页','详情页','商品详情','宝贝详情','产品介绍','规格','参数','卖点','优势','功能'] },
  { intent: 'infographic',    kw: ['信息图','长图','一图流','对比图','数据图','对比','vs','尺寸','参数表'] },
  { intent: 'main_video',     kw: ['主图视频','商品视频','展示视频','产品视频','开箱','评测','测评','试用'] },
  { intent: 'ad_video',       kw: ['投流视频','广告视频','投放','信息流','feed','推广','引流','千川','巨量'] },
  { intent: 'action_migrate', kw: ['动作迁移','动作','跳舞','舞蹈','pose','动作模版','动作模板','姿势','动作复制'] },
  { intent: 'video_clone',    kw: ['视频复刻','复刻','模仿','翻拍','同款视频','拍同款','仿拍','翻拍视频'] },
  { intent: 'copywriting',    kw: ['文案','标题','描述','卖点文案','营销文案','推广语','广告语','slogan','描述文案说明'] },
  { intent: 'script',         kw: ['脚本','带货脚本','视频脚本','剧本','直播脚本','口播','话术','台词','主播','讲解'] },
  { intent: 'selling_points', kw: ['卖点提炼','卖点','提炼','亮点','优势提炼','核心卖点','产品特点','差异化','总结卖点','优势亮点'] },
  { intent: 'voice',          kw: ['配音','语音','旁白','解说','音频','朗读','播音','画外音','口播配音','配音生成'] },
  // 对话+综合类（Phase 1.5 扩展 ~30 关键词）
  { intent: 'chat',          kw: ['帮助','怎么用','怎么操作','教我用','功能', '能做什么','有什么功能','可以做什么','使用方法','使用教程','帮助文档','不会用','怎么弄','如何','怎么','怎样'] },
  { intent: 'translate',     kw: ['翻译','英文','日文','韩文','西班牙语','多语言','跨境翻译','多语种','翻译成','英文版','日文版','国际化','本地化','translate','localization'] },
  { intent: 'compliance',    kw: ['合规','合规检查','敏感词','违禁词','广告法','审核','检查文案','检测违规','是否合规','有没有违规','能用吗合规','风险','排查'] },
  { intent: 'analyse_image', kw: ['分析这张图','图片分析','图里有什么','解析图片','看图','这张图','图片里','图中','分析图','理解图片'] },
];

// 关键词→意图 索引缓存
let _kwIndex = null;
function _buildKwIndex() {
  if (_kwIndex) return _kwIndex;
  _kwIndex = new Map();
  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.kw) {
      _kwIndex.set(kw, entry.intent);
    }
  }
  return _kwIndex;
}

// ==================== 分类主入口 ====================

/**
 * @param {string} userInput 用户原始输入
 * @param {object} [ctx] 上下文 { userId, platform, historyTags }
 * @returns {{ intentId: string, category: string, label: string, confidence: number, source: 'keyword'|'llm' }}
 */
export async function classifyIntent(userInput, ctx = {}) {
  if (!userInput || typeof userInput !== 'string') {
    return { intentId: 'copywriting', category: 'text', label: '营销文案', confidence: 0.3, source: 'fallback' };
  }

  // 1) 关键词快速命中
  const kwResult = _keywordMatch(userInput);
  if (kwResult) {
    logger.debug('[Intent] keyword hit', { intent: kwResult.intentId, input: userInput.slice(0, 60) });
    return kwResult;
  }

  // 2) LLM 兜底
  try {
    const llmResult = await _llmClassify(userInput, ctx);
    logger.info('[Intent] LLM classified', { intent: llmResult.intentId, input: userInput.slice(0, 60) });
    return llmResult;
  } catch (err) {
    logger.warn('[Intent] LLM classify failed, fallback to copywriting', err.message);
    return { intentId: 'copywriting', category: 'text', label: '营销文案', confidence: 0.3, source: 'fallback' };
  }
}

// ==================== 关键词匹配 ====================

function _keywordMatch(input) {
  const idx = _buildKwIndex();
  let bestIntent = null;
  let bestLen = 0;

  for (const [kw, intent] of idx) {
    if (input.includes(kw) && kw.length > bestLen) {
      bestLen = kw.length;
      bestIntent = intent;
    }
  }

  if (!bestIntent) return null;

  const info = Object.values(INTENT_TYPES).find(t => t.id === bestIntent);
  return {
    intentId: bestIntent,
    category: info?.category || 'unknown',
    label: info?.label || bestIntent,
    confidence: Math.min(0.7 + bestLen * 0.03, 0.95),
    source: 'keyword',
  };
}

// ==================== LLM 兜底分类 ====================

async function _llmClassify(userInput, ctx) {
  const platform = ctx?.platform || '通用';
  const historyTags = ctx?.historyTags || '无';

  const prompt = `你是一个电商需求分类器。根据用户输入，判断属于以下哪一类意图：

图片类: main_image(商品主图) | scene_image(场景图) | poster(营销海报) | detail_image(详情图)
详情页类: product_detail(商品详情页) | infographic(信息图)
视频类: main_video(主图视频) | ad_video(投流视频) | action_migrate(动作迁移) | video_clone(视频复刻)
文案语音类: copywriting(营销文案) | script(带货脚本) | selling_points(卖点提炼) | voice(语音配音)
对话综合类: chat(通用问答/功能引导/使用方法) | translate(跨境翻译/多语种) | compliance(合规检查/敏感词检测) | analyse_image(图片内容分析)

用户输入："${userInput.slice(0, 500)}"
当前平台：${platform}
历史标签：${historyTags}

仅输出 JSON: {"intent":"<intent_id>","confidence":0.0-1.0,"reason":"一句话理由"}`;

  const result = await gatewayRoute({
    mode: 'single',
    taskType: 'text_gen',
    params: {
      model: 'qwen-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
    },
  });

  const raw = result?.output?.choices?.[0]?.message?.content || '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'LLM classification result is not valid JSON');

  const parsed = JSON.parse(jsonMatch[0]);
  const intentId = parsed.intent;
  const info = Object.values(INTENT_TYPES).find(t => t.id === intentId);

  return {
    intentId: info ? intentId : 'copywriting',
    category: info?.category || 'text',
    label: info?.label || '营销文案',
    confidence: parsed.confidence || 0.5,
    source: 'llm',
  };
}

export default { classifyIntent, INTENT_TYPES };
