/**
 * 行为埋点分析服务
 * 追踪关键转化事件：注册/首次上传/首次生成/付费
 */
import * as logDao from '../dao/logDao.js';
import logger from '../utils/logger.js';

export const EVENT = {
  PAGE_VIEW: 'page_view',
  REGISTER: 'register',
  FIRST_UPLOAD: 'first_upload',
  FIRST_GENERATE: 'first_generate',
  UPGRADE_CLICK: 'upgrade_click',
  PAYMENT_START: 'payment_start',
  PAYMENT_SUCCESS: 'payment_success',
  TOOL_USE: 'tool_use',
  SHARE: 'share',
  INVITE: 'invite',
};

export async function trackEvent(userId, event, metadata = {}) {
  try {
    await logDao.insertOperationLog({
      userId,
      action: event,
      targetType: metadata.targetType || 'analytics',
      targetId: metadata.targetId || '',
      detail: metadata,
      ip: metadata.ip || '',
    });
  } catch (err) {
    logger.warn(`[Analytics] trackEvent error: ${err.message}`);
  }
}

export async function getFunnelMetrics(days = 30) {
  const r = await logDao.getFunnelMetrics(days);
  const regs = Number(r.registrations) || 0;
  const ups = Number(r.first_uploads) || 0;
  const gens = Number(r.first_generates) || 0;
  const pays = Number(r.payments) || 0;
  return {
    registrations: regs,
    firstUploads: ups,
    firstGenerates: gens,
    payments: pays,
    uploadRate: regs > 0 ? ((ups / regs) * 100).toFixed(1) : '0',
    generateRate: regs > 0 ? ((gens / regs) * 100).toFixed(1) : '0',
    payRate: regs > 0 ? ((pays / regs) * 100).toFixed(1) : '0',
  };
}

export async function getActiveUsers() {
  return logDao.getActiveUserCounts();
}

export async function getTopTools(days = 7, limit = 10) {
  return logDao.getTopTools(days, limit);
}

export async function getDailyTrend(days = 30) {
  return logDao.getDailyTrend(days);
}

export async function getConversionFunnel(days = 30) {
  const row = await logDao.getConversionFunnel(days);
  const landing = Number(row.landing) || 0;
  const reg = Number(row.registered) || 0;
  const act = Number(row.activated) || 0;
  const paid = Number(row.paid) || 0;
  const ret = Number(row.retained) || 0;
  return {
    steps: [
      { name: '访问落地', count: landing, rate: '100%' },
      { name: '注册', count: reg, rate: landing ? (reg / landing * 100).toFixed(1) + '%' : '0%' },
      { name: '激活(首次生成)', count: act, rate: reg ? (act / reg * 100).toFixed(1) + '%' : '0%' },
      { name: '付费转化', count: paid, rate: act ? (paid / act * 100).toFixed(1) + '%' : '0%' },
      { name: '7日留存', count: ret, rate: act ? (ret / act * 100).toFixed(1) + '%' : '0%' },
    ],
  };
}

export default { trackEvent, getFunnelMetrics, getActiveUsers, getTopTools, getDailyTrend, getConversionFunnel, EVENT };
