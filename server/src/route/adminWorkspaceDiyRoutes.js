/**
 * 工作台 DIY 编辑路由 — 管理后台编辑用户端工作台页面和模块
 * Route:  /api/admin/workspace-diy/*
 * Auth:   admin / super_admin only
 */
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../utils/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getDB } from '../dao/db.js';
import logger from '../utils/logger.js';

const router = Router();

// ═══════════════════════════════════════════════
// 所有接口均需管理员身份
// ═══════════════════════════════════════════════
router.use(authenticate, requireRole(['admin', 'super_admin']));

// ─── GET /api/admin/workspace-diy — 获取所有配置 ───
router.get('/', async (req, res, next) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM site_config ORDER BY config_key');
    const config = {};
    for (const r of rows) config[r.config_key] = r.config_value;
    res.json({ ok: true, data: config, updatedAt: rows[0]?.updated_at || null });
  } catch (err) { next(err); }
});

// ─── GET /api/admin/workspace-diy/:key — 获取单项配置 ───
router.get('/:key', async (req, res, next) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM site_config WHERE config_key = ?', [req.params.key]);
    if (!rows.length) return res.status(404).json({ ok: false, message: '配置项不存在' });
    res.json({ ok: true, data: rows[0] });
  } catch (err) { next(err); }
});

// ─── PUT /api/admin/workspace-diy/:key — 更新单项配置 ───
const putValidators = [
  body('config_value').isArray().withMessage('config_value 必须是数组'),
  body('description').optional().isString(),
];
router.put('/:key', putValidators, validate, async (req, res, next) => {
  try {
    const db = getDB();
    const { config_value, description } = req.body;
    const updatedBy = req.user?.username || req.user?.email || 'admin';
    const [result] = await db.query(
      `INSERT INTO site_config (config_key, config_value, description, updated_by)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value),
                               description = COALESCE(VALUES(description), description),
                               updated_by = VALUES(updated_by)`,
      [req.params.key, JSON.stringify(config_value), description || '', updatedBy],
    );
    logger.info(`[workspace-diy] ${req.params.key} 已更新 by ${updatedBy}`);
    res.json({ ok: true, message: `${req.params.key} 已保存`, updatedBy });
  } catch (err) { next(err); }
});

// ─── POST /api/admin/workspace-diy/reset/:key — 恢复默认 ───
router.post('/reset/:key', async (req, res, next) => {
  try {
    const db = getDB();
    const [rows] = await db.query('SELECT * FROM site_config WHERE config_key = ?', [req.params.key]);
    if (!rows.length) return res.status(404).json({ ok: false, message: '配置项不存在' });
    await db.query('DELETE FROM site_config WHERE config_key = ?', [req.params.key]);
    logger.info(`[workspace-diy] ${req.params.key} 已重置为默认值 by ${req.user?.username || 'admin'}`);
    res.json({ ok: true, message: `${req.params.key} 已重置为默认值` });
  } catch (err) { next(err); }
});

export default router;
