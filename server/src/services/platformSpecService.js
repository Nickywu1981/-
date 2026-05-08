import dao from '../dao/platformSpecDao.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

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
  return dao.create(data, req);
}

export async function update(id, data, req) {
  return dao.update(id, data, req);
}

export async function remove(id, req) {
  return dao.remove(id, req);
}

/**
 * 一键适配：返回某平台全部规格字典
 * 供 imageService 调用
 */
export async function getAdaptSpec(platformCode, req) {
  const rows = await dao.getAdaptSpec(platformCode, req);
  if (!rows || rows.length === 0) return null;
  const spec = {};
  for (const r of rows) {
    spec[r.spec_type] = {
      specType: r.spec_type,
      label: r.label,
      width: r.width,
      height: r.height,
      format: r.format,
      maxSizeKB: r.max_size_kb,
      bgMustWhite: Boolean(r.bg_must_white),
    };
  }
  return { platformCode, specs: spec };
}

/**
 * 图片尺寸适配：根据平台规格对图片进行 resize + format 转换
 * @param {string} inputPath - 输入图片本地路径
 * @param {string} platformCode - 平台代码（如 'taobao_main'）
 * @param {string} outputDir - 输出目录
 * @returns {Promise<{ outputPath: string, width: number, height: number, format: string, size: number }>}
 */
export async function adaptImage(inputPath, platformCode, outputDir) {
  if (!inputPath || !platformCode || !outputDir) {
    throw Object.assign(new Error('inputPath, platformCode, outputDir 均为必填'), { statusCode: 400 });
  }

  if (!fs.existsSync(inputPath)) {
    throw Object.assign(new Error(`输入文件不存在: ${inputPath}`), { statusCode: 404 });
  }

  // 解析平台代码：格式为 {platform}_{specType}，如 taobao_mainImage
  const lastUnderscore = platformCode.lastIndexOf('_');
  if (lastUnderscore <= 0) {
    throw Object.assign(new Error(`无效的平台代码格式: ${platformCode}，格式应为 {platform}_{specType}`), { statusCode: 400 });
  }
  const platform = platformCode.substring(0, lastUnderscore);
  const specType = platformCode.substring(lastUnderscore + 1);

  // 获取平台规格
  const specData = await getAdaptSpec(platform, {});
  if (!specData || !specData.specs[specType]) {
    throw Object.assign(new Error(`未找到平台规格: ${platformCode}`), { statusCode: 404 });
  }

  const spec = specData.specs[specType];

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 生成输出文件名
  const ext = spec.format || 'jpg';
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputFileName = `${baseName}_${platformCode}.${ext}`;
  const outputPath = path.join(outputDir, outputFileName);

  // 调用 sharp 进行 resize + format
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
