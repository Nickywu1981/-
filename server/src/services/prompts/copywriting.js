/**
 * 电商内容文案提示词模板
 * 用途：商品标题 / 营销文案 / 带货脚本（9语种）
 */

export const copywriting = {
  titleGen: {
    description: '电商商品标题生成',
    template: `Generate {count} SEO-optimized product titles for an e-commerce listing.

Product: {productName}
Category: {category}
Platform: {platform}
Key selling points: {sellingPoints}
Target audience: {audience}

Requirements:
- Include relevant keywords naturally
- Length: {minLength}-{maxLength} characters
- Language: {language}
- Tone: {tone}
- Avoid exaggerated claims`,
    params: ['productName', 'category', 'platform', 'sellingPoints', 'language', 'count'],
    defaults: { count: 5, minLength: 30, maxLength: 80, language: 'zh-CN', tone: 'professional', audience: 'general', platform: 'taobao' },
  },

  descriptionGen: {
    description: '商品详情描述生成',
    template: `Write a compelling product description for an e-commerce listing.

Product: {productName}
Key features: {features}
Specifications: {specs}
Platform: {platform}

Structure:
1. Attention-grabbing headline
2. Key benefits (3-5 bullet points)
3. Detailed specifications
4. Usage scenarios
5. Call to action

Language: {language}
Tone: {tone}`,
    params: ['productName', 'features', 'specs', 'platform', 'language'],
    defaults: { language: 'zh-CN', tone: 'professional' },
  },

  scriptGen: {
    description: '短视频带货脚本生成（9语种）',
    template: `Create a {platform} short-video script for promoting a product.

Product: {productName}
Video duration: {duration} seconds
Style: {style}
Language: {language}

Script structure:
1. Hook (0-3s): {hookStyle}
2. Problem/Pain point (3-8s)
3. Product solution (8-{solutionEnd}s)
4. Demo/Proof ({solutionEnd}-{demoEnd}s)
5. CTA + Offer ({demoEnd}-{duration}s)

Include shot descriptions, voiceover text, and on-screen text suggestions.`,
    params: ['productName', 'platform', 'duration', 'style', 'language'],
    defaults: { duration: 30, style: 'trending', language: 'zh-CN', hookStyle: 'question', platform: 'douyin' },
  },

  translate: {
    description: '多语言商品信息翻译',
    template: `Translate the following e-commerce product information from {sourceLang} to {targetLang}.

Product name: {productName}
Description: {description}
Key features: {features}

Requirements:
- Keep product terminology accurate
- Adapt marketing tone for {targetLang} market
- Preserve all measurements and specifications
- Localize cultural references where needed`,
    params: ['productName', 'description', 'features', 'sourceLang', 'targetLang'],
    defaults: { sourceLang: 'zh-CN' },
  },
};

// 支持的语言-语种映射
export const SUPPORTED_LANGUAGES = {
  'zh-CN': '简体中文',
  'zh-TW': '繁体中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  th: 'ไทย',
};
