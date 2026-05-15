/**
 * 邮箱验证码服务 — 多服务商抽象 + 频率控制 + 模板渲染
 * 支持: mock / smtp(QQ/Gmail/163) / sendgrid
 */
import config from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
import { renderTemplate, generateCode } from '../utils/templateHelpers.js';
import { registerInterval } from '../utils/shutdownRegistry.js';
import logger from '../utils/logger.js';
import * as emailTemplateDao from '../dao/emailTemplateDao.js';
import * as codeStore from './codeStore.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const CODE_CACHE = new Map(); // key: email, value: { code, expires, attempts }
// WARNING: Per-process Map — rate limits are bypassable across PM2 cluster workers.
// A full fix requires Redis-backed atomic counters (INCR + EXPIRE).
const EMAIL_SEND_LOG = new Map(); // key: email, value: [timestamp, ...]

// 定期清理过期验证码和发送日志，防止内存泄漏
export const _emailCleanupTimer = setInterval(() => {
  try {
  const now = Date.now();
  for (const [key, entry] of CODE_CACHE) {
    if (entry.expires < now) CODE_CACHE.delete(key);
  }
  for (const [key, timestamps] of EMAIL_SEND_LOG) {
    EMAIL_SEND_LOG.set(key, timestamps.filter((t) => now - t < 86400000));
    if (EMAIL_SEND_LOG.get(key)?.length === 0) EMAIL_SEND_LOG.delete(key);
  }
  } catch (err) { logger.warn('[Email] cleanup interval error', { error: err.message }); }
}, 300000).unref();
registerInterval(_emailCleanupTimer);

// ==================== HTML 模板消毒 ====================

function sanitizeHtml(html) {
  // 移除 <script> 标签、事件处理器、javascript: 协议、iframe/embed/object
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\s*script\b[^>]*\/?\s*>/gi, '')
    .replace(/<\s*\/\s*script\s*>/gi, '')
    .replace(/<iframe\b[^>]*\/?\s*>/gi, '')
    .replace(/<\s*\/\s*iframe\s*>/gi, '')
    .replace(/<embed\b[^>]*\/?\s*>/gi, '')
    .replace(/<object\b[^>]*\/?\s*>/gi, '')
    .replace(/<\s*\/\s*object\s*>/gi, '')
    .replace(/<svg\b[^>]*\/?\s*>/gi, '')
    .replace(/<\s*\/\s*svg\s*>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/\s+on\w+\s*=\s*`[^`]*`/gi, '')
    .replace(/&#\d+;?/gi, '')
    .replace(/&#x[0-9a-f]+;?/gi, '')
    .replace(/javascript\s*:/gi, 'data-xss-blocked:')
    .replace(/data\s*:\s*text\/html/gi, 'data-xss-blocked:')
    .replace(/<style\b[^>]*>[\s\S]*?<\/\s*style\s*>/gi, '')
    .replace(/<link\b[^>]*\/?\s*>/gi, '');
}

// ==================== 服务商抽象层 ====================

const providers = {
  mock: {
    async send({ email, subject, content }) {
      logger.debug(`[Email Mock] → ${email.replace(/(.{2}).*(@.*)/, '$1***$2')} | ${subject} | code: ***`);
      return { success: true, messageId: `mock_${Date.now()}` };
    },
  },

  smtp: {
    async send({ email, subject, content }) {
      const cfg = config.email?.smtp || {};
      if (!cfg.host) throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
      // 动态导入 nodemailer（生产按需安装）
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          host: cfg.host,
          port: cfg.port || 587,
          secure: cfg.secure || false,
          auth: { user: cfg.user, pass: cfg.pass },
        });
        const info = await Promise.race([
          transporter.sendMail({ from: cfg.from || cfg.user, to: email, subject, html: content }),
          new Promise((_, reject) => setTimeout(() => reject(new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'SMTP send timeout')), config.email.smtp.timeoutMs)),
        ]);
        return { success: true, messageId: info.messageId };
      } catch (e) {
        logger.error(`[Email] SMTP 发送失败: ${e.message}`);
        // Preserve original error type for upstream handling (auth/timeout/recipient)
        if (e instanceof BusinessError) throw e;
        throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, `SMTP: ${e.message?.slice(0, 200) || 'unknown error'}`);
      }
    },
  },

  sendgrid: {
    async send(_payload) {
      const cfg = config.email?.sendgrid || {};
      if (!cfg.apiKey) {
        throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
      }
      throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
    },
  },
};

function getProvider() {
  const name = config.email?.provider || 'mock';
  return providers[name] || providers.mock;
}

// ==================== 验证码 ====================

export async function sendVerificationCode(email, scene = 'login') {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  }

  // 频率控制：60秒内不可重复发送
  const cached = CODE_CACHE.get(email);
  if (cached && Date.now() - cached.lastSent < 60000) {
    throw new BusinessError(ERROR_CODE.EC_RATE_CODE);
  }

  // 小时/日频率控制
  const now = Date.now();
  const sends = (EMAIL_SEND_LOG.get(email) || []).filter(t => now - t < 86400000);
  const hourSends = sends.filter(t => now - t < 3600000).length;
  if (hourSends >= 5) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);
  if (sends.length >= 10) throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED);
  sends.push(now);
  EMAIL_SEND_LOG.set(email, sends);

  const code = generateCode(6);
  const expires = Date.now() + 5 * 60 * 1000; // 5分钟有效

  CODE_CACHE.set(email, { code, expires, lastSent: Date.now(), attempts: 0 });
  await codeStore.saveCode(`email:${email}`, code, 300).catch(err => logger.warn('[Email] Redis 验证码存储失败，降级使用内存', { error: err.message }));

  // 场景 → 模板编码映射
  const templateCodeMap = {
    login: 'email_login_code',
    register: 'email_register_code',
    reset_password: 'email_reset_password',
    bind: 'email_bind_code',
  };

  const templateCode = templateCodeMap[scene];
  if (!templateCode) {
    throw new BusinessError(ERROR_CODE.PARAM_INVALID);
  }

  // 从数据库读取模板，失败则降级为内置模板
  let subject, html;
  try {
    const template = await emailTemplateDao.findByCode(templateCode);
    if (template) {
      subject = renderTemplate(template.subject, { code });
      html = sanitizeHtml(renderTemplate(template.content, { code }));
    } else {
      throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
    }
  } catch (e) {
    logger.warn('[Email] 模板查询失败，降级使用内置模板', { templateCode, error: e.message });
    // 降级内置模板
    const fallbacks = {
      email_login_code: {
        subject: '【AI电商工具箱】登录验证码',
        content: '<h2>AI电商工具箱</h2><p>您的登录验证码为：<b>{code}</b>，5分钟内有效。</p>',
      },
      email_register_code: {
        subject: '【AI电商工具箱】注册验证码',
        content: '<h2>AI电商工具箱</h2><p>您的注册验证码为：<b>{code}</b>，5分钟内有效。</p>',
      },
      email_reset_password: {
        subject: '【AI电商工具箱】密码重置',
        content: '<h2>AI电商工具箱</h2><p>您正在重置密码，验证码：<b>{code}</b>，5分钟内有效。</p>',
      },
      email_bind_code: {
        subject: '【AI电商工具箱】邮箱绑定验证',
        content: '<h2>AI电商工具箱</h2><p>您的邮箱绑定验证码为：<b>{code}</b>，5分钟内有效。</p>',
      },
    };
    const fallback = fallbacks[templateCode] || { subject: '【AI电商工具箱】验证码', content: '<p>验证码：{code}</p>' };
    subject = renderTemplate(fallback.subject, { code });
    html = sanitizeHtml(renderTemplate(fallback.content, { code }));
  }

  const provider = getProvider();
  try {
    await provider.send({ email, subject, content: html });
  } catch (e) {
    logger.error('[Email] 发送失败', { email: email.replace(/(.{1,2}).*(@.*)/, '$1***$2'), error: e.message });
    throw new BusinessError(ERROR_CODE.INTERNAL_ERROR);
  }

  return { success: true, expireMinutes: 5 };
}

// ==================== 校验 ====================

export async function verifyCode(email, code) {
  // 优先 Redis 共享存储
  const result = await codeStore.verifyCode(`email:${email}`, code, 5);
  if (result.valid) {
    try { await codeStore.saveCode(`verified:email:${email}`, '1', 300); } catch (e) { logger.warn('邮件验证标记保存失败', { email: email.replace(/(.{1,2}).*(@.*)/, '$1***$2'), error: e.message }); }
    return true;
  }
  if (result.reason !== 'error') {
    throw new BusinessError(result.reason === 'max_attempts' ? 429 : 400,
      result.reason === 'max_attempts' ? '验证码错误次数过多，请重新获取'
        : result.reason === 'not_found' ? '请先获取验证码' : '验证码错误');
  }
  // Redis 不可用降级为进程内 Map
  const cached = CODE_CACHE.get(email);
  if (!cached) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  if (cached.attempts >= 5) { CODE_CACHE.delete(email); throw new BusinessError(ERROR_CODE.EC_RATE_VERIFY); }
  if (Date.now() > cached.expires) { CODE_CACHE.delete(email); throw new BusinessError(ERROR_CODE.PARAM_INVALID); }
  if (cached.code !== String(code)) { cached.attempts++; throw new BusinessError(ERROR_CODE.PARAM_INVALID); }
  CODE_CACHE.delete(email);
  CODE_CACHE.set(`verified:email:${email}`, { time: Date.now(), expires: Date.now() + 300000 });
  return true;
}

export async function checkVerified(email) {
  const key = `verified:email:${email}`;
  try {
    const result = await codeStore.verifyCode(key, '1', 1);
    if (result.valid || result.reason === 'mismatch') return true;
  } catch { logger.warn('[Email] checkVerified Redis 查询失败', { email: email.replace(/(.{1,2}).*(@.*)/, '$1***$2') }); }
  const entry = CODE_CACHE.get(key);
  if (!entry || Date.now() - entry.time > 300000) { CODE_CACHE.delete(key); return false; }
  CODE_CACHE.delete(key);
  return true;
}

// ==================== 模板管理（后台） ====================

export async function listTemplates() {
  return emailTemplateDao.listTemplates();
}

export async function updateTemplate(id, fields) {
  const data = await emailTemplateDao.updateTemplate(id, fields);
  if (!data) throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  return data;
}

export async function createTemplate(fields) {
  if (!fields.template_code || !fields.name || !fields.content) {
    throw new BusinessError(ERROR_CODE.PARAM_MISSING);
  }
  const id = await emailTemplateDao.insertTemplate(fields);
  return { id };
}

export async function deleteTemplate(id) {
  const affected = await emailTemplateDao.deleteTemplate(id);
  if (affected === 0) throw new BusinessError(ERROR_CODE.NOT_FOUND);
}
