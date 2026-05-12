/**
 * Commerce Order Controller — 企业端订单管理
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import pool from '../dao/db.js';

export const listOrders = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
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
  return success(res, { list: rows, total, page: +page, pageSize: +pageSize });
});

export const getOrderDetail = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const [rows] = await pool.query(
    `SELECT o.*, u.nickname AS customer_name, u.phone AS customer_phone, u.email AS customer_email
     FROM \`order\` o LEFT JOIN user u ON o.user_id = u.id
     WHERE o.id = ? AND o.tenant_id = ?`,
    [req.params.id, tenantId],
  );
  if (!rows.length) throw new BusinessError(ERROR_CODE.NOT_FOUND, '订单不存在');
  return success(res, rows[0]);
});

export const getOrderStats = wrapController(async (req, res) => {
  const tenantId = req.tenantId;
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total_orders,
            COALESCE(SUM(CASE WHEN status IN ('paid','completed') THEN amount ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END), 0) AS total_refund,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count
     FROM \`order\` WHERE tenant_id = ?`,
    [tenantId],
  );
  return success(res, rows[0]);
});
