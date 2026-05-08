import dao from '../dao/platformSpecDao.js';

export async function listAll(req) {
  return dao.listAll(req);
}

export async function getById(id, req) {
  return dao.getById(id, req);
}

export async function getByPlatformCode(code, req) {
  return dao.listByPlatform(code, req);
}

export async function create(data, req) {
  const row = {
    platform: data.platform,
    category: data.category,
    label: data.label,
    width: data.width,
    height: data.height,
    sort_order: data.sortOrder ?? 0,
  };
  return dao.create(row, req);
}

export async function update(id, data, req) {
  const row = {};
  if (data.platform !== undefined) row.platform = data.platform;
  if (data.category !== undefined) row.category = data.category;
  if (data.label !== undefined) row.label = data.label;
  if (data.width !== undefined) row.width = data.width;
  if (data.height !== undefined) row.height = data.height;
  if (data.sortOrder !== undefined) row.sort_order = data.sortOrder;
  return dao.update(id, row, req);
}

export async function remove(id, req) {
  return dao.remove(id, req);
}

export async function getAdaptSpec(platformCode, req) {
  const rows = await dao.getAdaptSpec(platformCode, req);
  if (!rows || rows.length === 0) return null;
  const spec = {};
  for (const r of rows) {
    spec[r.category] = {
      category: r.category,
      label: r.label,
      width: r.width,
      height: r.height,
    };
  }
  return { platformCode, specs: spec };
}

export async function adaptImage(inputPath, platformCode, outputDir) {
  if (!inputPath || !platformCode || !outputDir) {
    throw Object.assign(new Error('inputPath, platformCode, outputDir 均为必填'), { statusCode: 400 });
  }

  const fs = await import('fs');
  if (!fs.existsSync(inputPath)) {
    throw Object.assign(new Error(`输入文件不存在: ${inputPath}`), { statusCode: 404 });
  }

  const specData = await getAdaptSpec(platformCode, {});
  if (!specData || !specData.specs || Object.keys(specData.specs).length === 0) {
    throw Object.assign(new Error(`未找到平台规格: ${platformCode}`), { statusCode: 404 });
  }

  // 取第一个规格进行适配
  const firstKey = Object.keys(specData.specs)[0];
  const spec = specData.specs[firstKey];

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const path = await import('path');
  const sharp = (await import('sharp')).default;
  const ext = 'jpg';
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputFileName = `${baseName}_${platformCode}.${ext}`;
  const outputPath = path.join(outputDir, outputFileName);

  try {
    await sharp(inputPath)
      .resize(spec.width, spec.height, { fit: 'fill' })
      .toFormat(ext)
      .toFile(outputPath);
  } catch (sharpErr) {
    throw Object.assign(new Error(`图片处理失败: ${sharpErr.message}`), { statusCode: 500 });
  }

  const stats = fs.statSync(outputPath);

  return {
    outputPath,
    width: spec.width,
    height: spec.height,
    format: ext,
    size: stats.size,
  };
}

export default { listAll, getById, getByPlatformCode, create, update, remove, getAdaptSpec, adaptImage };
