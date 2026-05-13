/**
 * 电商详情页类提示词模板
 * 覆盖：商品详情页 / 信息图
 */
export const detail = {
  product_detail: {
    description: '商品详情页完整生成（图文混排）',
    system: '你是资深电商详情页策划师，擅长高转化详情页结构设计与文案撰写。',
    template: `Create a complete product detail page for e-commerce.

Product: {productName}
Category: {category}
Platform: {platform}
Target audience: {audience}
Brand tone: {brandTone}

Page structure:
1. **Header Banner** — Product hero image + main headline
2. **Core Selling Points** — 3-5 key benefits with icons
3. **Pain Point Solution** — Problem → Solution visualization
4. **Specifications** — Technical specs in table format
5. **Usage Scenarios** — 2-3 real-life application scenes
6. **Comparison** — Before/After or vs Competitor (data-backed)
7. **Quality Assurance** — Certificates, guarantees, after-sales
8. **FAQ** — Top 5 customer questions
9. **CTA Section** — Purchase button + limited offer

Language: {language}
Include on-screen text suggestions for each section.
Optimize for {platform} mobile detail page.`,
    params: ['productName', 'category', 'platform', 'audience', 'brandTone', 'language'],
    defaults: { platform: 'taobao', audience: 'general', brandTone: 'professional', language: 'zh-CN' },
  },

  infographic: {
    description: '产品信息图/对比图/一图流',
    system: '你是资深信息可视化设计师，擅长将复杂产品信息转化为清晰的信息图。',
    template: `Create an infographic for e-commerce product.

Product: {productName}
Topic: {topic}
Data points: {dataPoints}
Style: {style}

Requirements:
- Vertical scrolling format
- Clear data visualization (charts/icons)
- Color-coded sections
- Key numbers highlighted
- Comparison elements (if applicable)
- Brand colors: {brandColors}
- Readable on mobile
- Shareable dimensions`,
    params: ['productName', 'topic', 'dataPoints', 'style'],
    defaults: { style: 'modern clean', brandColors: 'primary + accent' },
  },
};
