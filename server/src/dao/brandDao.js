import pool from './db.js';

export async function getBrand(userId) {
  const [rows] = await pool.execute(
    'SELECT id, user_id, logo_url, brand_name, primary_color, watermark_enabled, watermark_opacity, watermark_position FROM user_brand WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

export async function upsertBrand(userId, data) {
  const exist = await getBrand(userId);
  if (exist) {
    const fields = [];
    const params = [];
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) { fields.push(`${k} = ?`); params.push(v); }
    }
    if (fields.length === 0) return exist;
    params.push(userId);
    await pool.execute(`UPDATE user_brand SET ${fields.join(', ')} WHERE user_id = ?`, params);
  } else {
    await pool.execute(
      'INSERT INTO user_brand (user_id, logo_url, brand_name, primary_color, watermark_enabled, watermark_opacity, watermark_position) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, data.logo_url || '', data.brand_name || '', data.primary_color || '#FF4400', data.watermark_enabled ?? 1, data.watermark_opacity ?? 30, data.watermark_position || 'br'],
    );
  }
  return getBrand(userId);
}
