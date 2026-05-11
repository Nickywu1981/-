/**
 * Token Pricing DAO — AI 模型 Token 定价表 CRUD
 * 支持按 model_key 查询激活定价，按类别筛选，成本计算
 */
import pool from './db.js';
import { als } from './context.js';

function _db() { return als.getStore()?.db || pool; }

const COLS = 'id, model_key, category, pricing_type, price_per_unit_in, price_per_unit_out, currency, effective_from, effective_to, is_active, create_time, update_time';

// ============ 查询 ============

export async function getActiveByKey(modelKey) {
  const [rows] = await _db().query(
    `SELECT ${COLS} FROM ai_model_pricing
     WHERE model_key = ? AND is_active = 1
       AND effective_from <= NOW()
       AND (effective_to IS NULL OR effective_to >= NOW())
     ORDER BY effective_from DESC LIMIT 1`,
    [modelKey],
  );
  return rows[0] || null;
}

export async function listActive(category) {
  let sql = `SELECT ${COLS} FROM ai_model_pricing WHERE is_active = 1
     AND effective_from <= NOW()
     AND (effective_to IS NULL OR effective_to >= NOW())`;
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY category, model_key';
  const [rows] = await _db().query(sql, params);
  return rows;
}

export async function getById(id) {
  const [rows] = await _db().query(`SELECT ${COLS} FROM ai_model_pricing WHERE id = ?`, [id]);
  return rows[0] || null;
}

// ============ 写入 ============

export async function upsert(data) {
  const { model_key, category, pricing_type, price_per_unit_in, price_per_unit_out, currency, effective_from, effective_to, is_active } = data;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id FROM ai_model_pricing WHERE model_key = ? AND is_active = 1
       AND effective_from <= NOW()
       AND (effective_to IS NULL OR effective_to >= NOW())
       LIMIT 1 FOR UPDATE`,
      [model_key],
    );
    if (rows.length > 0) {
      const id = rows[0].id;
      await conn.query(
        `UPDATE ai_model_pricing SET
           category = ?, pricing_type = ?,
           price_per_unit_in = ?, price_per_unit_out = ?,
           currency = ?, effective_from = ?, effective_to = ?,
           is_active = ?
         WHERE id = ?`,
        [category, pricing_type, price_per_unit_in, price_per_unit_out, currency || 'CNY', effective_from || new Date(), effective_to || null, is_active ?? 1, id],
      );
      await conn.commit();
      return { id, model_key, category, pricing_type, price_per_unit_in, price_per_unit_out, currency, effective_from, effective_to, is_active, updated: true };
    }
    const [result] = await conn.query(
      `INSERT INTO ai_model_pricing (model_key, category, pricing_type, price_per_unit_in, price_per_unit_out, currency, effective_from, effective_to, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [model_key, category, pricing_type, price_per_unit_in, price_per_unit_out, currency || 'CNY', effective_from || new Date(), effective_to || null, is_active ?? 1],
    );
    await conn.commit();
    return { id: result.insertId, model_key, category, pricing_type, price_per_unit_in, price_per_unit_out, currency, effective_from, effective_to, is_active, updated: false };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deactivate(id) {
  await _db().query('UPDATE ai_model_pricing SET is_active = 0 WHERE id = ?', [id]);
}

// ============ 成本计算 ============

export async function calculateCost(modelKey, tokensIn, tokensOut, count) {
  const pricing = await getActiveByKey(modelKey);
  if (!pricing) return { amount: 0, currency: 'CNY', pricingId: null, details: null };

  let amount;
  switch (pricing.pricing_type) {
    case 'token':
      amount = (tokensIn || 0) * Number(pricing.price_per_unit_in)
             + (tokensOut || 0) * Number(pricing.price_per_unit_out);
      break;
    case 'image':
      amount = (count || 1) * Number(pricing.price_per_unit_in);
      break;
    case 'second':
      amount = (tokensOut || 0) * Number(pricing.price_per_unit_out);
      break;
    case 'request':
      amount = (count || 1) * Number(pricing.price_per_unit_in);
      break;
    default:
      amount = 0;
  }

  return {
    amount: Math.round(amount * 1e6) / 1e6,
    currency: pricing.currency || 'CNY',
    pricingId: pricing.id,
    details: {
      pricing_type: pricing.pricing_type,
      price_in: Number(pricing.price_per_unit_in),
      price_out: Number(pricing.price_per_unit_out),
      formula: pricing.pricing_type === 'token'
        ? `${tokensIn}×${pricing.price_per_unit_in} + ${tokensOut}×${pricing.price_per_unit_out}`
        : `${count || 1}×${pricing.price_per_unit_in}`,
      tokens_in: tokensIn || 0,
      tokens_out: tokensOut || 0,
    },
  };
}
