/**
 * Movio AI v4.1 — Platform Binding Routes
 * G5 后端开发 | W4
 * GET    /api/platforms/bindings  — 用户已绑定平台列表
 * POST   /api/platforms/bind      — 绑定新平台
 * DELETE /api/platforms/bind/:id  — 解绑
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import db from '../dao/db.js';

const router = Router();

function _validate(schema) {
  return (req, res, next) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      return error(res, 400, r.error.errors.map(e => e.message).join('; '));
    }
    req.validated = r.data;
    next();
  };
}

const bindSchema = z.object({
  platform: z.string().min(1, '请提供平台标识').max(50),
  bind_type: z.enum(['shop', 'creator']).default('shop'),
  account_id: z.string().min(1, '请提供账号ID').max(100),
  account_name: z.string().max(100).optional(),
});

const publishSchema = z.object({
  work_id: z.string().min(1, '请提供作品ID').max(50),
  platform: z.string().min(1, '请提供目标平台').max(50),
  content_url: z.string().url().optional(),
});

// GET /api/platforms/bindings
router.get('/bindings', async (req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      const [rows] = await conn.query(
        'SELECT id, bind_type, platform, account_id, account_name, created_at FROM user_platform_bind WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
        [req.user.id],
      );
      return success(res, { list: rows });
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, 500, err.message);
  }
});

// POST /api/platforms/bind
router.post('/bind', _validate(bindSchema), async (req, res) => {
  try {
    const { platform, bind_type, account_id, account_name } = req.validated;

    const conn = await db.getConnection();
    try {
      await conn.query(
        `INSERT INTO user_platform_bind (user_id, bind_type, platform, account_id, account_name)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE account_name = ?, is_active = 1`,
        [req.user.id, bind_type || 'shop', platform, account_id, account_name || '', account_name || ''],
      );
      return success(res, null, '绑定成功');
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, 500, err.message);
  }
});

// DELETE /api/platforms/bind/:id
router.delete('/bind/:id', async (req, res) => {
  try {
    const conn = await db.getConnection();
    try {
      await conn.query(
        'UPDATE user_platform_bind SET is_active = 0 WHERE id = ? AND user_id = ?',
        [req.params.id, req.user.id],
      );
      return success(res, null, '解绑成功');
    } finally {
      conn.release();
    }
  } catch (err) {
    return error(res, 500, err.message);
  }
});

// POST /api/platforms/publish — 发布内容到平台
router.post('/publish', _validate(publishSchema), async (req, res) => {
  try {
    const { _work_id, platform, content_url } = req.validated;

    // TODO: 实际对接各平台发布API (W4 MVP先记录)
    return success(res, { published_url: content_url, platform, status: 'submitted' }, '已提交发布任务');
  } catch (err) {
    return error(res, 500, err.message);
  }
});

export default router;
