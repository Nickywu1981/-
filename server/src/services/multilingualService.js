/**
 * 多语言销售脚本服务
 * 支持 8 种语言 × 3 种脚本类型的组合生成
 */
const LANGUAGES = {
  zh: { name: '中文', flag: '🇨🇳', tone: '亲切自然' },
  en: { name: 'English', flag: '🇺🇸', tone: 'Professional & persuasive' },
  es: { name: 'Español', flag: '🇪🇸', tone: 'Cálido y cercano' },
  pt: { name: 'Português', flag: '🇧🇷', tone: 'Descontraído e direto' },
  ru: { name: 'Русский', flag: '🇷🇺', tone: 'Доверительный' },
  ja: { name: '日本語', flag: '🇯🇵', tone: '丁寧で誠実' },
  ko: { name: '한국어', flag: '🇰🇷', tone: '트렌디하고 친근한' },
  th: { name: 'ไทย', flag: '🇹🇭', tone: 'เป็นกันเอง' },
  ar: { name: 'العربية', flag: '🇸🇦', tone: 'احترافي ومقنع' },
};

const SCRIPT_TYPES = {
  live_stream: { name: '直播脚本', icon: '🎙️', template: 'live_stream', desc: '直播间话术+互动节奏' },
  short_video: { name: '短视频脚本', icon: '📱', template: 'short_video', desc: '15-60s口播脚本' },
  product_desc: { name: '产品描述', icon: '📝', template: 'product_desc', desc: '详情页卖点文案' },
};

/** 获取所有支持的语言 */
export function getLanguages() {
  return Object.entries(LANGUAGES).map(([code, info]) => ({ code, ...info }));
}

/** 获取所有脚本类型 */
export function getScriptTypes() {
  return Object.entries(SCRIPT_TYPES).map(([code, info]) => ({ code, ...info }));
}

/** 获取语言配置 */
export function getLanguage(code) {
  return LANGUAGES[code] || null;
}

/** 为脚本生成构建多语言提示词 */
export function buildMultilingualPrompt({ product, language, scriptType, platform, tone }) {
  const lang = LANGUAGES[language] || LANGUAGES.en;
  const script = SCRIPT_TYPES[scriptType] || SCRIPT_TYPES.short_video;

  const prompts = {
    live_stream: `Create a ${lang.name} livestream sales script for ${product} on ${platform || 'e-commerce platform'}.
Tone: ${tone || lang.tone}.
Include: opening hook (5s), pain point, product showcase, limited-time offer, CTA.
Structure with timestamps [0:00], [1:00], etc. Keep it engaging and interactive.`,

    short_video: `Write a ${lang.name} short video script (15-60 seconds) for ${product} on ${platform || 'social media'}.
Tone: ${tone || lang.tone}.
Structure: [Hook 0-3s] → [Problem 3-10s] → [Solution 10-20s] → [Proof 20-30s] → [CTA 30-40s].
Include visual cues and camera directions.`,

    product_desc: `Write a ${lang.name} product description for ${product} targeting ${platform || 'e-commerce'}.
Tone: ${tone || lang.tone}.
Include: compelling title, 5 key features as bullet points, product specifications, and a persuasive closing paragraph.
Optimize for SEO with relevant keywords. Keep it concise but informative.`,
  };

  return {
    language: lang.name,
    scriptType: script.name,
    prompt: prompts[scriptType] || prompts.short_video,
  };
}

export default { getLanguages, getScriptTypes, getLanguage, buildMultilingualPrompt, LANGUAGES, SCRIPT_TYPES };
