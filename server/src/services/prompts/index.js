/**
 * 提示词模板索引
 * 集中导出所有模板，供 Service 层调用
 *
 * 使用方式:
 *   import { bgRemoval, bgRemovalCN } from './prompts/index.js';
 *   const prompt = bgRemoval.sceneGen.template.replace('{scene}', 'beach');
 */

export { bgRemoval, bgRemovalCN } from './bgRemoval.js';
export { copywriting, SUPPORTED_LANGUAGES } from './copywriting.js';
export { imageEnhance } from './imageEnhance.js';
export { videoGen, advancedVideo } from './videoGen.js';

// 提示词填充工具
export function fillPrompt(template, params) {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? ''));
  }
  return result;
}

// 获取模块所有模板名称
export function getTemplateNames(module) {
  return Object.keys(module).filter((k) => module[k]?.template);
}
