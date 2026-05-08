import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

/**
 * 图片 WebP 格式转换工具
 * 上传完成后自动转 WebP，压缩 40%+ 体积，保留原图
 */
export async function convertToWebP(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // 跳过已是 webp 和 gif 的文件
  if (ext === '.webp') return filePath;

  const webpPath = filePath.replace(ext, '.webp');

  try {
    const pipeline = sharp(filePath);

    if (ext === '.png') {
      pipeline.webp({ quality: 85, lossless: false, alphaQuality: 90 });
    } else if (ext === '.avif') {
      pipeline.webp({ quality: 85 });
    } else {
      pipeline.webp({ quality: 82 }); // jpeg 可压更狠
    }

    await pipeline.toFile(webpPath);

    // 如果 WebP 实际更大，回退原图
    const [origStat, webpStat] = await Promise.all([
      fs.stat(filePath),
      fs.stat(webpPath),
    ]);

    if (webpStat.size >= origStat.size) {
      await fs.unlink(webpPath);
      return filePath;
    }

    return webpPath;
  } catch (err) {
    console.error(`[WebP] 转换失败: ${filePath}`, err.message);
    return filePath;
  }
}

/**
 * 批量转换
 */
export async function convertBatchToWebP(filePaths) {
  const results = await Promise.allSettled(filePaths.map(convertToWebP));
  return results.map((r, i) => (r.status === 'fulfilled' ? r.value : filePaths[i]));
}
