/**
 * Movio AI v4.1 — Publish Service (多平台内容分发)
 * M06 独家王牌功能
 *
 * 流程: 作品选择 → 平台勾选 → 内容适配 → 提交分发 → 状态追踪 → 失败重试
 */
import db from '../dao/db.js';
import * as publishDao from '../dao/publishDao.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

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

export async function submitPublish(userId, workId, platforms, options = {}) {
  if (!platforms || platforms.length === 0) throw new BusinessError(ERROR_CODE.PARAM_MISSING);

  const invalid = platforms.filter(p => !PLATFORM_PUBLISH_SPECS[p]);
  if (invalid.length > 0) {
    throw new BusinessError(ERROR_CODE.PARAM_INVALID, `Unsupported platforms: ${invalid.join(", ")}`);
  }

  const conn = await db.getConnection();
  try {
    const asset = await publishDao.validateAsset(conn, workId, userId);
    if (!asset) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);

    await conn.beginTransaction();

    const batchId = `PUB_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const status = options.scheduleAt ? 'scheduled' : 'pending';
    const records = platforms.map(platform => {
      const spec = PLATFORM_PUBLISH_SPECS[platform];
      return {
        batchId, userId, assetId: workId, platform, platformName: spec.name, status,
        title: options.title || '', description: options.description || '',
        tags: options.tags || [], contentUrl: asset.file_url,
        scheduledAt: options.scheduleAt || null,
      };
    });

    const firstInsertId = await publishDao.insertRecords(conn, records);

    const result = platforms.map((platform, i) => ({
      id: firstInsertId + i, platform, platformName: PLATFORM_PUBLISH_SPECS[platform].name, status,
    }));

    await conn.commit();
    return { batchId, totalPlatforms: platforms.length, records: result };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getPublishBatch(batchId, userId) {
  const rows = await publishDao.findBatchByBatchId(batchId, userId);
  if (rows.length === 0) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  return { batchId, records: rows };
}

export async function retryPublish(recordId, userId) {
  const record = await publishDao.findRecordById(recordId, userId);
  if (!record) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (!['failed', 'error'].includes(record.status)) {
    throw new BusinessError(ERROR_CODE.PARAM_ERROR, `Status ${record.status} cannot be resent`);
  }

  await publishDao.updateStatusToPending(recordId);
  return { id: recordId, platform: record.platform, status: 'pending', retryCount: record.retry_count + 1 };
}

export async function listPublishHistory(userId, { page = 1, pageSize = 20, status, platform } = {}) {
  return publishDao.listHistory(userId, { page, pageSize, status, platform });
}

export async function getPublishStats(userId) {
  return publishDao.getStats(userId);
}

export { PLATFORM_PUBLISH_SPECS };
