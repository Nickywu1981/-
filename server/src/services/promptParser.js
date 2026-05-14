/**
 * Prompt Parser — 提示词解析器 + 合规硬约束注入
 *
 * 职责：
 * 1. 拆解用户输入 → 正向提示词 + 反向提示词
 * 2. 视频/链接 → 提取爆款元素，生成复刻正向+避坑反向
 * 3. 强制注入合规硬约束（最外层不可绕过）
 *
 * 合规硬约束规则：
 * - 所有生成请求自动追加 "do NOT copy original brand/logo/character/trademark"
 * - 视频复刻追加 "inspired by reference style only, original content must not be reproduced"
 * - 反向提示词自动包含广告法禁用词
 */
import logger from '../utils/logger.js';

// 反向提示词底板（所有生成请求强制注入）
const COMPLIANCE_NEGATIVE_BASE = [
  'watermark', 'logo', 'brand_name', 'trademark', 'copyright_text',
  'low_quality', 'blurry', 'distorted', 'pixelated',
];

// 按意图类型的合规反向提示词
const INTENT_NEGATIVE_RULES = {
  image: [
    ...COMPLIANCE_NEGATIVE_BASE,
    'fake_product', 'counterfeit', 'misleading_label',
    'price_tag', 'qr_code', 'contact_info',
    'nsfw', 'offensive', 'violent',
  ],
  video: [
    ...COMPLIANCE_NEGATIVE_BASE,
    'original_video_copy', 'reproduced_content', 'duplicate_scene',
    'copyright_music', 'unauthorized_character', 'celebrity_likeness',
    'fake_review', 'misleading_claim', 'exaggerated_effect',
  ],
  text: [
    '绝对', '最好', '第一', '唯一', '顶级', '最', '100%',
    '国家级', '世界级', '免费', '保证', '根治',
    '虚假宣传', '夸大功效', '误导消费者',
  ],
  voice: [
    ...COMPLIANCE_NEGATIVE_BASE,
    'unauthorized_voice_clone', 'celebrity_voice',
    'misleading_audio', 'fake_testimonial',
  ],
};

// 视频复刻专属硬约束后缀
const VIDEO_CLONE_COMPLIANCE_SUFFIX =
  'IMPORTANT: This is a reference-only style analysis. ' +
  'The generated content MUST be original. ' +
  'Do NOT reproduce the original video, characters, logos, trademarks, or copyrighted materials. ' +
  'Use the analyzed structure and style as inspiration only.';

/**
 * 注入合规反向提示词 — 强制追加，不可绕过
 *
 * @param {object} params
 * @param {string} params.prompt      原始正向提示词
 * @param {string} params.intentId    意图类型
 * @param {string} params.category    意图大类 (image/video/text/voice)
 * @param {string} [params.negativePrompt] 已有的反向提示词
 * @returns {{ positive: string, negative: string }}
 */
export function injectReversePrompt({ prompt, intentId, category, negativePrompt }) {
  const negRules = INTENT_NEGATIVE_RULES[category] || COMPLIANCE_NEGATIVE_BASE;
  let negative = negativePrompt || '';

  // 合并已有反向提示词 + 合规强制词
  const existingNegWords = new Set(negative.split(/[,，\s]+/).filter(Boolean).map(w => w.toLowerCase()));
  const missing = negRules.filter(w => !existingNegWords.has(w.toLowerCase()));
  if (missing.length > 0) {
    negative = negative ? `${negative}, ${missing.join(', ')}` : missing.join(', ');
  }

  // 视频复刻：强制追加合规后缀到正向提示词
  let positive = prompt;
  if (intentId === 'video_clone') {
    if (!positive.includes('inspired by') && !positive.includes('reference')) {
      positive = `${positive}. ${VIDEO_CLONE_COMPLIANCE_SUFFIX}`;
    }
    // 追加反向提示词：禁止原样复制
    const videoCloneExtras = [
      'reproduce_original', 'copy_exact_scene', 'duplicate_content',
      'unauthorized_brand', 'original_logo', 'original_product',
    ];
    const missingVC = videoCloneExtras.filter(w => !negative.toLowerCase().includes(w));
    if (missingVC.length > 0) {
      negative = `${negative}, ${missingVC.join(', ')}`;
    }
  }

  logger.info('[PromptParser] compliance injected', {
    intentId,
    category,
    negCount: (negative.match(/,/g) || []).length + 1,
    videoCloneHardened: intentId === 'video_clone',
  });

  return { positive, negative };
}

/**
 * 从视频描述中提取爆款元素结构
 */
export function extractViralElements(videoDescription) {
  const elements = {
    structure: '',
    pacing: '',
    transitions: '',
    colorPalette: '',
    bgmStyle: '',
    hooks: [],
  };

  const desc = videoDescription || '';

  if (desc.includes('快节奏') || desc.includes('快速')) elements.pacing = 'fast-paced';
  else if (desc.includes('慢') || desc.includes('舒缓')) elements.pacing = 'slow-paced';
  else elements.pacing = 'moderate';

  if (desc.includes('转场') || desc.includes('切换')) elements.transitions = 'smooth transitions';
  if (desc.includes('暖色') || desc.includes('温暖')) elements.colorPalette = 'warm tones';
  else if (desc.includes('冷色') || desc.includes('冷')) elements.colorPalette = 'cool tones';
  if (desc.includes('音乐') || desc.includes('BGM')) elements.bgmStyle = 'trending background music';

  return elements;
}

export default { injectReversePrompt, extractViralElements };
