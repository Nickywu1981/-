import crypto from 'crypto';

/**
 * 模板占位符替换: {key} → value
 * 对值做长度截断 + 控制字符清理，防止 SMS/邮件模板注入
 */
export function renderTemplate(templateContent, params) {
  return templateContent.replace(/\{(\w+)\}/g, (_, key) => {
    const raw = params[key];
    if (raw === undefined || raw === null) return `{${key}}`;
    return String(raw).replace(/[\x00-\x1f\x7f]/g, '').slice(0, 200);
  });
}

/**
 * 生成指定位数的随机数字验证码
 */
export function generateCode(length = 6) {
  return String(crypto.randomInt(0, 10 ** length)).padStart(length, '0');
}
