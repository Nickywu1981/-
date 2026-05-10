/**
 * 短信服务 — 多服务商抽象 + 模板引擎 + 频率控制
 *
 * 支持: mock / aliyun / tencent
 * 配置: config.sms = { provider, providers: { aliyun: {...}, tencent: {...} } }
 */

import * as smsLogDao from '../dao/smsLogDao.js';
import * as smsTemplateDao from '../dao/smsTemplateDao.js';
import config from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';

const CODE_CACHE = new Map();

// ==================== 服务商抽象层 ====================

const providers = {
  mock: {
    async send({ phone, content, templateCode }) {
      logger.info(`[SMS Mock] → ${phone.slice(0,3)}****${phone.slice(-4)} | ${templateCode} | ${content.slice(0,20)}...`);
      return { success: true, raw: { code: 'OK', messageId: `mock_${Date.now()}` } };
    },
  },

  aliyun: {
    async send(_payload) {
      throw new BusinessError(503, '阿里云短信密钥未配置');
    },
  },

  tencent: {
    async send(_payload) {
      throw new BusinessError(503, '腾讯云短信密钥未配置');
    },
  },
};

function getProvider() {
  const name = config.sms?.provider || 'mock';
  return providers[name] || providers.mock;
}

// ==================== 模板渲染 ====================

function renderTemplate(templateContent, params) {
  return templateContent.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

// ==================== 验证码生成与校验 ====================

function generateCode(length = 6) {
  return String(Math.floor(Math.random() * 10 ** length)).padStart(length, '0');
}

function cacheKey(phone, scene) {
  return `sms:${scene}:${phone}`;
}

export function verifyCode(phone, scene, code) {
  const key = cacheKey(phone, scene);
  const stored = CODE_CACHE.get(key);
  if (!stored) return { valid: false, reason: '验证码不存在或已过期' };
  if (Date.now() - stored.time > 300000) {
    CODE_CACHE.delete(key);
    return { valid: false, reason: '验证码已过期' };
  }
  // 暴力破解防护：最多5次尝试
  stored.attempts = (stored.attempts || 0) + 1;
  if (stored.attempts > 5) {
    CODE_CACHE.delete(key);
    return { valid: false, reason: '尝试次数过多，请重新获取验证码' };
  }
  if (stored.code !== String(code)) return { valid: false, reason: '验证码错误' };
  CODE_CACHE.delete(key);
  // 验证通过后设置已验证标记，供 login-by-code 使用
  CODE_CACHE.set(`verified:sms:${phone}`, { time: Date.now() });
  return { valid: true };
}

export function checkVerified(phone) {
  const key = `verified:sms:${phone}`;
  const entry = CODE_CACHE.get(key);
  if (!entry || Date.now() - entry.time > 300000) {
    CODE_CACHE.delete(key);
    return false;
  }
  CODE_CACHE.delete(key);
  return true;
}

// ==================== 核心发送方法 ====================

export async function sendVerificationCode({ phone, scene }) {
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, msg: '手机号格式不正确' };
  }

  const key = cacheKey(phone, scene);
  const existing = CODE_CACHE.get(key);
  if (existing && Date.now() - existing.time < 60000) {
    return { success: false, msg: '验证码已发送，请60秒后重试' };
  }

  const hourlyCount = await smsLogDao.countByPhoneLastHour(phone);
  if (hourlyCount >= 5) return { success: false, msg: '发送频率过高，请稍后再试' };

  const dailyCount = await smsLogDao.countByPhoneToday(phone);
  if (dailyCount >= 10) return { success: false, msg: '今日发送次数已达上限' };

  const templateCodeMap = {
    register: 'sms_register_code',
    login: 'sms_login_code',
    reset_password: 'sms_reset_password',
    bind: 'sms_bind_code',
  };
  const templateCode = templateCodeMap[scene];
  if (!templateCode) return { success: false, msg: '不支持的发送场景' };

  const template = await smsTemplateDao.findByCode(templateCode);
  if (!template) return { success: false, msg: '短信模板未配置' };

  const code = generateCode(6);
  const content = renderTemplate(template.content, { code });
  const provider = getProvider();

  try {
    await provider.send({
      phone,
      content,
      templateCode,
      params: { code },
      providerTemplateId: template.provider_template_id,
    });

    CODE_CACHE.set(key, { code, time: Date.now() });

    await smsLogDao.insertLog({
      templateCode,
      phone,
      params: { code },
      content,
      result: true,
      provider: config.sms?.provider || 'mock',
    });

    return { success: true, msg: '验证码已发送', expire: 300 };
  } catch (e) {
    logger.error('[SMS] sendVerificationCode failed:', e);
    await smsLogDao.insertLog({
      templateCode,
      phone,
      params: { code },
      content,
      result: false,
      provider: config.sms?.provider || 'mock',
    });
    return { success: false, msg: '短信发送失败，请稍后重试' };
  }
}

// ==================== 通知类短信 ====================

export async function sendNotification(phone, { scene, templateCode, params }) {
  const template = templateCode
    ? await smsTemplateDao.findByCode(templateCode)
    : await smsTemplateDao.findByCode(scene);

  if (!template) return { success: false, msg: '短信模板未配置' };

  const content = renderTemplate(template.content, params || {});
  const provider = getProvider();

  try {
    await provider.send({
      phone, content,
      templateCode: template.template_code,
      params,
      providerTemplateId: template.provider_template_id,
    });
    await smsLogDao.insertLog({
      templateCode: template.template_code, phone, params,
      content, result: true, provider: config.sms?.provider || 'mock',
    });
    return { success: true, msg: '发送成功' };
  } catch (e) {
    logger.error('[SMS] sendNotification failed:', e);
    await smsLogDao.insertLog({
      templateCode: template.template_code, phone, params,
      content, result: false, provider: config.sms?.provider || 'mock',
    });
    return { success: false, msg: '发送失败' };
  }
}

// ==================== 模板管理 ====================

export async function getTemplates() {
  return smsTemplateDao.listTemplates();
}

export async function updateTemplate(id, fields) {
  return smsTemplateDao.updateTemplate(id, fields);
}

export async function createTemplate(fields) {
  return smsTemplateDao.insertTemplate(fields);
}

export async function deleteTemplate(id) {
  return smsTemplateDao.deleteTemplate(id);
}

// ==================== 日志查询 ====================

export async function getLogs(filters) {
  return smsLogDao.listLogs(filters);
}
