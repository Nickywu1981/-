import { Router } from 'express';
import { z } from 'zod';
import { validateV4 as validate } from '../utils/validate.js';
import { authMiddleware, enterpriseOnly } from '../middleware/auth.middleware.js';
import pool from '../dao/db.js';

const router = Router({ mergeParams: true });

const getTenantId = (req) => req.user?.entId || req.user?.tenantId;

const orderQuerySchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'completed', 'refunded', 'cancelled']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  keyword: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).optional().default(20),
});

// 企业端订单列表（仅查看旗下客户订单）
router.get('/', authMiddleware, enterpriseOnly, validate(orderQuerySchema, 'query'), async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const { page, pageSize, status, startDate, endDate, keyword } = req.query;
    const conditions = ['o.tenant_id = ?'];
    const params = [tenantId];
    if (status) { conditions.push('o.status = ?'); params.push(status); }
    if (startDate) { conditions.push('o.created_at >= ?'); params.push(startDate); }
    if (endDate) { conditions.push('o.created_at <= ?'); params.push(endDate + ' 23:59:59'); }
    if (keyword) { conditions.push('(o.order_no LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)'); params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`); }

    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT o.*, u.nickname AS customer_name, u.phone AS customer_phone
       FROM \`order\` o LEFT JOIN user u ON o.user_id = u.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM \`order\` o WHERE ${conditions.join(' AND ')}`,
      params,
    );
    res.json({ code: 0, data: { list: rows, total, page: +page, pageSize: +pageSize } });
  } catch (e) { next(e); }
});

// 订单详情
router.get('/:id', authMiddleware, enterpriseOnly, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const [rows] = await pool.query(
      `SELECT o.*, u.nickname AS customer_name, u.phone AS customer_phone, u.email AS customer_email
       FROM \`order\` o LEFT JOIN user u ON o.user_id = u.id
       WHERE o.id = ? AND o.tenant_id = ?`,
      [req.params.id, tenantId],
    );
    if (!rows.length) return res.status(404).json({ code: 404, message: '订单不存在' });
    res.json({ code: 0, data: rows[0] });
  } catch (e) { next(e); }
});

// 订单统计（概览卡片）
router.get('/stats/summary', authMiddleware, enterpriseOnly, async (req, res, next) => {
  try {
    const tenantId = getTenantId(req);
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total_orders,
              COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN amount ELSE 0 END), 0) AS total_revenue,
              COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) AS total_refund,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count
       FROM \`order\` WHERE tenant_id = ?`,
      [tenantId],
    );
    res.json({ code: 0, data: rows[0] });
  } catch (e) { next(e); }
});

export default router;
