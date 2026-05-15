/**
 * 统一素材处理管线 — 图片/视频一站式处理
 *
 * 图片: sharp (已安装, 零外部依赖)
 * 视频: ffmpeg (可选, 未安装时降级为直通)
 *
 * 用法:
 *   import { processImage, processVideo, createThumbnail, batchProcess } from './services/mediaPipelineService.js';
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '../../uploads/.pipeline');

let _dirReady = false;
async function ensureTempDir() {
  if (!_dirReady) { await fsp.mkdir(TEMP_DIR, { recursive: true }); _dirReady = true; }
}

/** 清理超过 30 分钟的 pipeline 临时文件 */
export async function cleanupPipelineTemp() {
  try {
    const files = await fsp.readdir(TEMP_DIR);
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 min
    let cleaned = 0;
    for (const f of files) {
      const fp = path.join(TEMP_DIR, f);
      try {
        const stat = await fsp.stat(fp);
        if (now - stat.mtimeMs > maxAge) { await fsp.unlink(fp); cleaned++; }
      } catch { /* already gone */ }
    }
    if (cleaned) logger.info(`[Pipeline] 清理 ${cleaned} 个临时文件`);
  } catch { /* dir may not exist */ }
}

// ==================== 工具函数 ====================

let _sharpAvailable = null;
async function ensureSharp() {
  if (_sharpAvailable !== null) return _sharpAvailable;
  try { await import('sharp'); _sharpAvailable = true; }
  catch { _sharpAvailable = false; logger.warn('[Pipeline] sharp not available'); }
  return _sharpAvailable;
}

let _ffmpegAvailable = null;
async function ensureFfmpeg() {
  if (_ffmpegAvailable !== null) return _ffmpegAvailable;
  try { await execFileP('ffmpeg', ['-version'], { timeout: 5000 }); _ffmpegAvailable = true; }
  catch { _ffmpegAvailable = false; logger.warn('[Pipeline] ffmpeg not available'); }
  return _ffmpegAvailable;
}

/** 生成输出文件名 */
function outputName(inputPath, suffix) {
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  return path.join(TEMP_DIR, `${base}_${suffix}${ext}`);
}

// ==================== 图片处理 ====================

/**
 * 图片裁切
 * @param {string} inputPath — 源文件路径
 * @param {{ width?: number, height?: number, left?: number, top?: number }} opts
 * @returns {Promise<string>} 输出文件路径
 */
export async function crop(inputPath, opts = {}) {
  await ensureTempDir();
  if (!(await ensureSharp())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'sharp unavailable');
  const sharp = (await import('sharp')).default;
  const out = outputName(inputPath, `crop_${opts.width || 0}x${opts.height || 0}`);
  await sharp(inputPath).extract({
    left: opts.left || 0, top: opts.top || 0,
    width: opts.width || 800, height: opts.height || 800,
  }).toFile(out);
  return out;
}

/**
 * 图片缩放
 * @param {number} width — 目标宽度
 * @param {number} height — 目标高度
 * @param {'inside'|'cover'|'fill'|'outside'} fit — 缩放策略
 */
export async function resize(inputPath, { width, height, fit = 'inside' }) {
  await ensureTempDir();
  if (!(await ensureSharp())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'sharp unavailable');
  const sharp = (await import('sharp')).default;
  const out = outputName(inputPath, `${width}x${height}`);
  await sharp(inputPath).resize(width, height, { fit, withoutEnlargement: true }).toFile(out);
  return out;
}

/**
 * 图片压缩
 * @param {number} quality — 1-100 (JPEG/WebP)
 * @param {'jpeg'|'webp'|'png'|'avif'} format — 输出格式
 */
export async function compress(inputPath, { quality = 80, format = 'jpeg' } = {}) {
  await ensureTempDir();
  if (!(await ensureSharp())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'sharp unavailable');
  const sharp = (await import('sharp')).default;
  const out = outputName(inputPath, `q${quality}`);
  await sharp(inputPath)[format]({ quality }).toFile(out);
  return out;
}

/**
 * 图片水印
 * @param {string} text — 水印文字
 * @param {'southeast'|'center'|'northwest'} position — 方位
 */
export async function watermark(inputPath, { text, position = 'southeast', fontSize = 24, opacity = 0.3 } = {}) {
  await ensureTempDir();
  if (!(await ensureSharp())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'sharp unavailable');
  const sharp = (await import('sharp')).default;
  const metadata = await sharp(inputPath).metadata();

  const escapedText = text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
  const svgText = `<svg width="${metadata.width}" height="${metadata.height}">
    <text x="50%" y="90%" font-size="${fontSize}" fill="white" fill-opacity="${opacity}"
          font-family="Arial" text-anchor="middle">${escapedText}</text>
  </svg>`;

  const out = outputName(inputPath, 'wm');
  await sharp(inputPath)
    .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
    .toFile(out);
  return out;
}

/**
 * 格式转换
 * @param {'jpeg'|'png'|'webp'|'avif'|'gif'} to — 目标格式
 */
export async function convert(inputPath, { to = 'webp', quality = 85 } = {}) {
  await ensureTempDir();
  if (!(await ensureSharp())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'sharp unavailable');
  const sharp = (await import('sharp')).default;
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const out = path.join(TEMP_DIR, `${base}.${to}`);
  await sharp(inputPath)[to]({ quality }).toFile(out);
  return out;
}

/** 获取图片元信息 */
export async function imageMetadata(inputPath) {
  if (!(await ensureSharp())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'sharp unavailable');
  const sharp = (await import('sharp')).default;
  return sharp(inputPath).metadata();
}

// ==================== 视频处理 ====================

/**
 * 视频截图/缩略图
 * @param {number} atSeconds — 截取时间点
 */
export async function videoThumbnail(inputPath, { atSeconds = 1, width = 480 } = {}) {
  await ensureTempDir();
  if (!(await ensureFfmpeg())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'ffmpeg unavailable');
  const out = `${outputName(inputPath, 'thumb')}.jpg`.replace(/\.[^.]+$/, '.jpg');
  await execFileP('ffmpeg', [
    '-ss', String(atSeconds), '-i', inputPath,
    '-vframes', '1', '-vf', `scale=${width}:-1`, '-q:v', '3', out,
  ], { timeout: 30000 });
  return out;
}

/**
 * 视频转码 (H.264 AAC)
 */
export async function videoTranscode(inputPath, { crf = 23, preset = 'medium', maxWidth } = {}) {
  await ensureTempDir();
  if (!(await ensureFfmpeg())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'ffmpeg unavailable');
  const out = outputName(inputPath, 'transcoded');
  const vf = maxWidth ? `scale=${maxWidth}:-2` : null;
  const args = ['-i', inputPath, '-c:v', 'libx264', '-crf', String(crf), '-preset', preset, '-c:a', 'aac', '-movflags', '+faststart'];
  if (vf) args.push('-vf', vf);
  await execFileP('ffmpeg', [...args, out], { timeout: 300000 });
  return out;
}

/**
 * 视频剪辑
 * @param {number} startSeconds
 * @param {number} durationSeconds
 */
export async function videoTrim(inputPath, { startSeconds = 0, durationSeconds = 30 } = {}) {
  await ensureTempDir();
  if (!(await ensureFfmpeg())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'ffmpeg unavailable');
  const out = outputName(inputPath, 'trim');
  await execFileP('ffmpeg', [
    '-ss', String(startSeconds), '-i', inputPath,
    '-t', String(durationSeconds), '-c', 'copy', out,
  ], { timeout: 60000 });
  return out;
}

/**
 * 视频加水印 (图片叠加)
 * @param {string} watermarkPath — 水印图片路径 (PNG)
 */
export async function videoWatermark(inputPath, { watermarkPath, position = 'southeast' } = {}) {
  await ensureTempDir();
  if (!(await ensureFfmpeg())) throw new BusinessError(ERROR_CODE.AI_INFER_FAILED, 'ffmpeg unavailable');
  const out = outputName(inputPath, 'wm');
  const posMap = { southeast: 'W-w-10:H-h-10', northwest: '10:10', center: '(W-w)/2:(H-h)/2' };
  await execFileP('ffmpeg', [
    '-i', inputPath, '-i', watermarkPath,
    '-filter_complex', `overlay=${posMap[position] || posMap.southeast}`,
    '-c:a', 'copy', out,
  ], { timeout: 120000 });
  return out;
}

// ==================== 统一管线入口 ====================

/**
 * 图片处理管线 (支持链式操作)
 *
 * @example
 *   await pipeline('image', inputPath, [
 *     { op: 'resize', width: 800, height: 800 },
 *     { op: 'compress', quality: 80, format: 'webp' },
 *     { op: 'watermark', text: 'Movio AI' },
 *   ]);
 */
export async function processImage(inputPath, operations = []) {
  let currentPath = inputPath;
  const results = [];

  for (const op of operations) {
    const { op: opName, ...params } = op;
    switch (opName) {
      case 'crop':      currentPath = await crop(currentPath, params); break;
      case 'resize':    currentPath = await resize(currentPath, params); break;
      case 'compress':  currentPath = await compress(currentPath, params); break;
      case 'watermark': currentPath = await watermark(currentPath, params); break;
      case 'convert':   currentPath = await convert(currentPath, params); break;
      default: throw new BusinessError(ERROR_CODE.PARAM_INVALID, `Unknown image operation: ${opName}`);
    }
    results.push({ op: opName, output: currentPath });
  }
  return { output: currentPath, operations: results, input: inputPath };
}

/**
 * 视频处理管线
 * @example
 *   await processVideo(inputPath, [
 *     { op: 'trim', startSeconds: 5, durationSeconds: 30 },
 *     { op: 'transcode', crf: 23, maxWidth: 1920 },
 *   ]);
 */
export async function processVideo(inputPath, operations = []) {
  let currentPath = inputPath;
  const results = [];

  for (const op of operations) {
    const { op: opName, ...params } = op;
    switch (opName) {
      case 'thumbnail': currentPath = await videoThumbnail(currentPath, params); break;
      case 'transcode': currentPath = await videoTranscode(currentPath, params); break;
      case 'trim':      currentPath = await videoTrim(currentPath, params); break;
      case 'watermark': currentPath = await videoWatermark(currentPath, params); break;
      default: throw new BusinessError(ERROR_CODE.PARAM_INVALID, `Unknown video operation: ${opName}`);
    }
    results.push({ op: opName, output: currentPath });
  }
  return { output: currentPath, operations: results, input: inputPath };
}

/**
 * 批量处理 — 并发执行多条管线
 * @param {'image'|'video'} type
 * @param {Array<{input: string, operations: Array}>} jobs
 */
export async function batchProcess(type, jobs, { concurrency = 3 } = {}) {
  const results = [];
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(job => type === 'image' ? processImage(job.input, job.operations) : processVideo(job.input, job.operations))
    );
    results.push(...batchResults.map((r, j) => ({
      index: i + j,
      status: r.status,
      ...(r.status === 'fulfilled' ? r.value : { error: r.reason?.message }),
    })));
  }
  return { type, total: jobs.length, results };
}

/**
 * 电商主图标准管线 — 一键出图
 * 白底图 → 裁切 800x800 → 压缩 WebP 85% → 添加品牌水印
 */
export async function ecommerceMainImage(inputPath, { brandName, width = 800, height = 800 } = {}) {
  const ops = [
    { op: 'resize', width, height, fit: 'cover' },
    { op: 'compress', quality: 85, format: 'webp' },
  ];
  if (brandName) {
    ops.push({ op: 'watermark', text: brandName, fontSize: 16, opacity: 0.25 });
  }
  return processImage(inputPath, ops);
}

/**
 * 电商详情图标准管线 — 多尺寸导出
 */
export async function ecommerceDetailImages(inputPath, sizes = [
  { width: 790, label: 'detail' },
  { width: 400, label: 'thumb' },
]) {
  const jobs = sizes.map(s => ({ input: inputPath, operations: [
    { op: 'resize', width: s.width, fit: 'inside' },
    { op: 'compress', quality: 82, format: 'webp' },
  ]}));
  return batchProcess('image', jobs, { concurrency: 2 });
}

export default {
  processImage, processVideo, batchProcess,
  crop, resize, compress, watermark, convert, imageMetadata,
  videoThumbnail, videoTranscode, videoTrim, videoWatermark,
  ecommerceMainImage, ecommerceDetailImages,
};
