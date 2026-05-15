// Artillery 处理器: 图片生成 prompt 池
// 提供 20 种预定义 prompt 轮转使用

const PROMPT_POOL = [
  'A professional product photo of a white sneaker on a clean white background',
  'A minimalist logo design for a tech startup, flat vector style',
  'An e-commerce banner showcasing summer fashion collection, vibrant colors',
  'A realistic 3D render of a modern office chair, studio lighting',
  'A food photography shot of a gourmet burger with fresh ingredients',
  'A stylish wristwatch floating on a gradient background, luxury feel',
  'A skincare product bottle with water splashes, refreshing aesthetic',
  'An electronic gadget on a dark background with neon rim lighting',
  'A cozy living room interior with Scandinavian design elements',
  'A fitness product shot with dramatic gym lighting',
  'A jewelry piece on black velvet, macro detail shot',
  'A book cover mockup with soft natural lighting',
  'A perfume bottle with smoke effects, mysterious atmosphere',
  'A modern smartphone mockup with a colorful abstract background',
  'A pair of headphones floating on a minimal white background',
  'A ceramic coffee mug with steam, warm morning light',
  'A backpack product shot with outdoor adventure theme',
  'A candle product photo with cozy ambient lighting',
  'A gaming keyboard with RGB lighting effects',
  'A sustainable eco-friendly product on natural wood texture',
]

let _index = 0

/**
 * 轮转获取下一个 prompt
 */
function getNextPrompt() {
  const prompt = PROMPT_POOL[_index % PROMPT_POOL.length]
  _index++
  return prompt
}

/**
 * Artillery 处理器: 为每个请求注入随机 prompt
 */
function imagePromptFeeder(req, ctx, ee, next) {
  ctx.vars.prompt = getNextPrompt()
  return next()
}

module.exports = {
  imagePromptFeeder,
  PROMPT_POOL,
  getNextPrompt,
}
