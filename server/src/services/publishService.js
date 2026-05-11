/**
 * Movio AI v4.1 — Publish Service (多平台内容分发)
 * M06 独家王牌功能
 *
 * 流程: 作品选择 → 平台勾选 → 内容适配 → 提交分发 → 状态追踪 → 失败重试
 */
import db from '../dao/db.js';
import { BusinessError } from '../utils/businessError.js';

// 13 平台发布规格
const PLATFORM_PUBLISH_SPECS = {
  taobao:      { name: '淘宝', maxSizeMB: 3, formats: ['jpg','png','gif'], maxWidth: 750 },
  tmall:       { name: '天猫', maxSizeMB: 5, formats: ['jpg','png'], maxWidth: 800 },
  jd:          { name: '京东', maxSizeMB: 5, formats: ['jpg','png'], maxWidth: 800 },
  pdd:         { name: '拼多多', maxSizeMB: 2, formats: ['jpg','png'], maxWidth: 800 },
  douyin:      { name: '抖音', maxSizeMB: 10, formats: ['jpg','png','webp','mp4'], maxWidth: 1080 },
  kuaishou:    { name: '快手', maxSizeMB: 10, formats: ['jpg','png','mp4'], maxWidth: 1080 },
  xiaohongshu: { name: '小红书', maxSizeMB: 5, formats: ['jpg','png','webp'], maxWidth: 1080 },
  shipinhao:   { name: '视频号', maxSizeMB: 10, formats: ['jpg','png','mp4'], maxWidth: 1080 },
  bilibili:    { name: 'B站', maxSizeMB: 10, formats: ['jpg','png','mp4'], maxWidth: 1920 },
  shopee:      { name: 'Shopee', maxSizeMB: 3, formats: ['jpg','png'], maxWidth: 800 },
  lazada:      { name: 'Lazada', maxSizeMB: 3, formats: ['jpg','png'], maxWidth: 800 },
  amazon:      { name: 'Amazon', maxSizeMB: 10, formats: ['jpg','png','gif'], maxWidth: 1500 },
  tiktokshop:  { name: 'TikTok Shop', maxSizeMB: 10, formats: ['jpg','png','mp4'], maxWidth: 1080 },
};

export function getPublishPlatforms() {
  return Object.entries(PLATFORM_PUBLISH_SPECS).map(([key, val]) => ({ key, ...val }));
}

/**
 * 提交一键分发任务
 * @param {number} userId
 * @param {string} workId      — 作品ID (assets 表)
 * @param {string[]} platforms — 目标平台列表
 * @param {object} options     — { title, description, tags, scheduleAt }
 */
export async function submitPublish(userId, workId, platforms, options = {}) {
  if (!platforms || platforms.length === 0) {
    throw new BusinessError(400, '请至少选择一个目标平台');
  }

  // 验证平台合法性
  const invalid = platforms.filter(p => !PLATFORM_PUBLISH_SPECS[p]);
  if (invalid.length > 0) {
    throw new BusinessError(400, `不支持的平台: ${invalid.join(', ')}`);
  }

  const conn = await db.getConnection();
  try {
    // 验证作品存在
    const [[asset]] = await conn.query(
      'SELECT id, file_url, file_type, file_size FROM assets WHERE id = ? AND user_id = ?',
      [workId, userId],
    );
    if (!asset) throw new BusinessError(404, '作品不存在');

    await conn.beginTransaction();

    // 批量创建发布记录（单条 INSERT 多 VALUES，避免 N+1）
    const batchId = `PUB_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status = options.scheduleAt ? 'scheduled' : 'pending';
    const values = platforms.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = [];
    for (const platform of platforms) {
      const spec = PLATFORM_PUBLISH_SPECS[platform];
      params.push(
        batchId, userId, workId, platform, spec.name, status,
        options.title || '', options.description || '',
        JSON.stringify(options.tags || []), asset.file_url,
        options.scheduleAt || null,
      );
    }

    const [result] = await conn.query(
      `INSERT INTO publish_record (batch_id, user_id, asset_id, platform, platform_name, status,
         title, description, tags, content_url, scheduled_at)
       VALUES ${values}`,
      params,
    );

    const records = [];
    let firstInsertId = result.insertId;
    for (let i = 0; i < platforms.length; i++) {
      const spec = PLATFORM_PUBLISH_SPECS[platforms[i]];
      records.push({ id: firstInsertId + i, platform: platforms[i], platformName: spec.name, status });
    }

    await conn.commit();
    return { batchId, totalPlatforms: platforms.length, records };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * 获取分发批次详情
 */
export async function getPublishBatch(batchId, userId) {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT pr.*, a.file_url, a.file_type, a.thumbnail_url
       FROM publish_record pr
       LEFT JOIN assets a ON a.id = pr.asset_id
       WHERE pr.batch_id = ? AND pr.user_id = ?
       ORDER BY pr.created_at DESC`,
      [batchId, userId],
    );
    if (rows.length === 0) throw new BusinessError(404, '分发批次不存在');
    return { batchId, records: rows };
  } finally {
    conn.release();
  }
}

/**
 * 重发失败的平台
 */
export async function retryPublish(recordId, userId) {
  const conn = await db.getConnection();
  try {
    const [[record]] = await conn.query(
      'SELECT * FROM publish_record WHERE id = ? AND user_id = ?',
      [recordId, userId],
    );
    if (!record) throw new BusinessError(404, '发布记录不存在');
    if (!['failed', 'error'].includes(record.status)) {
      throw new BusinessError(400, `当前状态 ${record.status} 不可重发`);
    }

    await conn.query(
      'UPDATE publish_record SET status = ?, retry_count = retry_count + 1, error_msg = NULL, updated_at = NOW() WHERE id = ?',
      ['pending', recordId],
    );
    return { id: recordId, platform: record.platform, status: 'pending', retryCount: record.retry_count + 1 };
  } finally {
    conn.release();
  }
}

/**
 * 分发历史 (支持按状态/平台筛选)
 */
export async function listPublishHistory(userId, { page = 1, pageSize = 20, status, platform } = {}) {
  const conn = await db.getConnection();
  try {
    const conditions = ['pr.user_id = ?'];
    const params = [userId];

    if (status) { conditions.push('pr.status = ?'); params.push(status); }
    if (platform) { conditions.push('pr.platform = ?'); params.push(platform); }

    const where = conditions.join(' AND ');

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) as total FROM publish_record pr WHERE ${where}`,
      params,
    );
    const [rows] = await conn.query(
      `SELECT pr.*, a.file_url, a.thumbnail_url, a.file_type
       FROM publish_record pr
       LEFT JOIN assets a ON a.id = pr.asset_id
       WHERE ${where}
       ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize],
    );
    return { list: rows, total, page, pageSize };
  } finally {
    conn.release();
  }
}

/**
 * 分发概览统计 (仪表盘用)
 */
export async function getPublishStats(userId) {
  const conn = await db.getConnection();
  try {
    const [[stats]] = await conn.query(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 ELSE 0 END) as inProgress,
         SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
       FROM publish_record WHERE user_id = ?`,
      [userId],
    );
    return stats;
  } finally {
    conn.release();
  }
}

export { PLATFORM_PUBLISH_SPECS };
