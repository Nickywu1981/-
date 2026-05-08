/**
 * 邮箱验证码服务 — 多服务商抽象 + 频率控制 + 模板渲染
 * 支持: mock / smtp(QQ/Gmail/163) / sendgrid
 */
import config from '../config/index.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import * as emailTemplateDao from '../dao/emailTemplateDao.js';

const CODE_CACHE = new Map(); // key: email, value: { code, expires, attempts }

// ==================== 模板渲染 ====================

function renderTemplate(templateContent, params) {
  return templateContent.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

// ==================== 服务商抽象层 ====================

const providers = {
  mock: {
    async send({ email, subject, content }) {
      logger.info(`[Email Mock] → ${email} | ${subject} | code: ${content.match(/\d{6}/)?.[0] || 'N/A'}`);
      return { success: true, messageId: `mock_${Date.now()}` };
    },
  },

  smtp: {
    async send({ email, subject, content }) {
      const cfg = config.email?.smtp || {};
      if (!cfg.host) throw new BusinessError(503, 'SMTP 未配置');
      // 动态导入 nodemailer（生产按需安装）
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
          host: cfg.host,
          port: cfg.port || 587,
          secure: cfg.secure || false,
          auth: { user: cfg.user, pass: cfg.pass },
        });
        const info = await transporter.sendMail({
          from: cfg.from || cfg.user,
          to: email,
          subject,
          html: content,
        });
        return { success: true, messageId: info.messageId };
      } catch (e) {
        throw new BusinessError(502, `SMTP 发送失败: ${e.message}`);
      }
    },
  },

  sendgrid: {
    async send(_payload) {
      throw new BusinessError(503, 'SendGrid 密钥未配置');
    },
  },
};

function getProvider() {
  const name = config.email?.provider || 'mock';
  return providers[name] || providers.mock;
}

// ==================== 验证码 ====================

function generateCode(len = 6) {
  return String(Math.floor(Math.random() * 10 ** len)).padStart(len, '0');
}

export async function sendVerificationCode(email, scene = 'login') {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BusinessError(400, '请输入有效邮箱地址');
  }

  // 频率控制：60秒内不可重复发送
  const cached = CODE_CACHE.get(email);
  if (cached && Date.now() - cached.lastSent < 60000) {
    throw new BusinessError(429, '发送过于频繁，请60秒后再试');
  }

  const code = generateCode(6);
  const expires = Date.now() + 5 * 60 * 1000; // 5分钟有效

  CODE_CACHE.set(email, { code, expires, lastSent: Date.now(), attempts: 0 });

  // 场景 → 模板编码映射
  const templateCodeMap = {
    login: 'email_login_code',
    register: 'email_register_code',
    reset_password: 'email_reset_password',
    bind: 'email_bind_code',
  };

  const templateCode = templateCodeMap[scene];
  if (!templateCode) {
    throw new BusinessError(400, '不支持的邮件场景');
  }

  // 从数据库读取模板，失败则降级为内置模板
  let subject, html;
  try {
    const template = await emailTemplateDao.findByCode(templateCode);
    if (template) {
      subject = renderTemplate(template.subject, { code });
      html = renderTemplate(template.content, { code });
    } else {
      throw new BusinessError(404, '模板未找到');
    }
  } catch {
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
    html = renderTemplate(fallback.content, { code });
  }

  const provider = getProvider();
  await provider.send({ email, subject, content: html });

  return { success: true, expireMinutes: 5 };
}

// ==================== 校验 ====================

export function verifyCode(email, code) {
  const cached = CODE_CACHE.get(email);
  if (!cached) {
    throw new BusinessError(400, '请先获取验证码');
  }

  // 防爆破：最多5次错误
  if (cached.attempts >= 5) {
    CODE_CACHE.delete(email);
    throw new BusinessError(429, '验证码错误次数过多，请重新获取');
  }

  if (Date.now() > cached.expires) {
    CODE_CACHE.delete(email);
    throw new BusinessError(400, '验证码已过期，请重新获取');
  }

  if (cached.code !== String(code)) {
    cached.attempts++;
    throw new BusinessError(400, '验证码错误');
  }

  // 验证通过后删除缓存 + 设置已验证标记
  CODE_CACHE.delete(email);
  CODE_CACHE.set(`verified:email:${email}`, { time: Date.now() });
  return true;
}

export function checkVerified(email) {
  const key = `verified:email:${email}`;
  const entry = CODE_CACHE.get(key);
  if (!entry || Date.now() - entry.time > 300000) {
    CODE_CACHE.delete(key);
    return false;
  }
  CODE_CACHE.delete(key);
  return true;
}
