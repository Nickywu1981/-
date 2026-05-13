import { BusinessError } from '../utils/businessError.js';

/**
 * Movio AI v4.1 — Poster & Social Cover Service
 * G5 后端开发 | Phase 2
 * 产品营销海报 / 节日海报 / 活动海报 / 私域海报 / 小红书封面 / 公众号封面
 */
import { submitJob } from './job-queue.service.js';
import * as moderationService from './moderation.service.js';
import db from '../dao/db.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const POSTER_SIZES = {
  product:    { width: 1200, height: 1800, ratio: '2:3', label: '产品营销海报' },
  holiday:    { width: 1200, height: 1800, ratio: '2:3', label: '节日海报' },
  event:      { width: 1920, height: 1080, ratio: '16:9', label: '活动宣传海报' },
  private:    { width: 1080, height: 1920, ratio: '9:16', label: '私域运营海报' },
  xhs:        { width: 1080, height: 1440, ratio: '3:4', label: '小红书封面' },
  wechat:     { width: 900,  height: 383,  ratio: '2.35:1', label: '公众号封面' },
};

const POSTER_STYLES = {
  product: '电商营销风格，突出产品卖点与优惠信息，设计感强',
  holiday: '节日氛围浓厚，色彩鲜明，传统文化元素与现代设计融合',
  event:   '大型活动促销风格，信息层级清晰，视觉冲击力强',
  private: '私域社交风格，亲切温馨，突出信任感与专属福利',
  xhs:     '小红书生活方式美学风格，清新自然，种草感强',
  wechat:  '公众号头图风格，简洁有力，适合信息流浏览',
};

/**
 * 生成海报/封面 (异步任务)
 */
export async function generatePoster(userId, { posterType, prompt, enhancedPrompt, style }) {
  const size = POSTER_SIZES[posterType] || POSTER_SIZES.product;
  const finalPrompt = enhancedPrompt || prompt;

  const auditResult = await moderationService.moderateText(finalPrompt, userId, { stage: 'input' });
  if (auditResult.action === 'block') {
    throw new BusinessError(ERROR_CODE.CONTENT_MODERATION);
  }

  return submitJob(userId, `poster_${posterType}`, {
    prompt: finalPrompt,
    ratio: size.ratio,
    width: size.width,
    height: size.height,
    poster_type: posterType,
    style: style || POSTER_STYLES[posterType],
    original_prompt: prompt,
  }, { priority: 5 });
}

/**
 * 获取海报尺寸配置
 */
export function getPosterSizes() {
  return POSTER_SIZES;
}

/**
 * 获取海报风格参考
 */
export function getPosterStyles() {
  return POSTER_STYLES;
}

/**
 * 获取用户海报作品列表
 */
export async function getUserPosters(userId, { type, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const sql = 'SELECT * FROM user_works WHERE user_id = ? AND task_category LIKE ? ORDER BY create_time DESC LIMIT ? OFFSET ?';
  const prefix = type ? `poster_${type}` : 'poster_%';
  const [rows] = await db.query(sql, [userId, prefix, limit, offset]);
  return rows;
}

export { POSTER_SIZES, POSTER_STYLES };
