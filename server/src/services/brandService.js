import * as brandDao from '../dao/brandDao.js';

export async function getBrandSettings(userId) {
  const row = await brandDao.getBrand(userId);
  return row || {
    brand_name: '',
    logo_url: '',
    primary_color: '#FF4400',
    watermark_enabled: false,
    watermark_opacity: 30,
    watermark_position: 'br',
  };
}

export async function saveBrandSettings(userId, data) {
  const allowed = ['logo_url', 'brand_name', 'primary_color', 'watermark_enabled', 'watermark_opacity', 'watermark_position'];
  const sanitized = {};
  for (const key of allowed) {
    if (data[key] !== undefined) sanitized[key] = data[key];
  }
  if (Object.keys(sanitized).length === 0) {
    const err = new Error('没有需要更新的字段');
    err.statusCode = 400;
    throw err;
  }
  return brandDao.upsertBrand(userId, sanitized);
}
