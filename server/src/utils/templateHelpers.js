import crypto from 'crypto';

/**
 * 模板占位符替换: {key} → value
 */
export function renderTemplate(templateContent, params) {
  return templateContent.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

/**
 * 生成指定位数的随机数字验证码
 */
export function generateCode(length = 6) {
  return String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');
}
