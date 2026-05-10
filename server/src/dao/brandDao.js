import pool from './db.js';

export async function getBrand(userId) {
  const [rows] = await pool.execute(
    'SELECT id, user_id, logo_url, brand_name, primary_color, watermark_enabled, watermark_opacity, watermark_position FROM user_brand WHERE user_id = ? LIMIT 1',
    [userId],
  );
  return rows[0] || null;
}

export async function upsertBrand(userId, data) {
  await pool.execute(
    `INSERT INTO user_brand (user_id, logo_url, brand_name, primary_color, watermark_enabled, watermark_opacity, watermark_position)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       logo_url = VALUES(logo_url),
       brand_name = VALUES(brand_name),
       primary_color = VALUES(primary_color),
       watermark_enabled = VALUES(watermark_enabled),
       watermark_opacity = VALUES(watermark_opacity),
       watermark_position = VALUES(watermark_position)`,
    [userId, data.logo_url || '', data.brand_name || '', data.primary_color || '#FF4400', data.watermark_enabled ?? 1, data.watermark_opacity ?? 30, data.watermark_position || 'br'],
  );
  return getBrand(userId);
}
