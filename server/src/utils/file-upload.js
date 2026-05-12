import { BusinessError } from './businessError.js';
import logger from './logger.js';
import { uploadConfig } from '../config/index.js';

/**
 * Movio AI v4.1 — File Upload Service (Async I/O)
 */

// ============= 魔数检测（防伪造文件扩展名） =============

const MAGIC_SIGNATURES = {
  // 图片
  jpg:  [0xFF, 0xD8, 0xFF],
  jpeg: [0xFF, 0xD8, 0xFF],
  png:  [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  webp: [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
         'RIFF....WEBP'],
  gif:  [0x47, 0x49, 0x46, 0x38],
  bmp:  [0x42, 0x4D],
  // 视频
  mp4:  [[0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70],           // '....ftyp'
         [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70]],         // ISOM
  mov:  [[0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74], // '....ftypqt'
         [0x00, 0x00, 0x00, null, 0x6D, 0x6F, 0x6F, 0x76]],         // '....moov'
  avi:  [0x52, 0x49, 0x46, 0x46],                                     // 'RIFF'
  webm: [0x1A, 0x45, 0xDF, 0xA3],
  // 文档
  pdf:  [0x25, 0x50, 0x44, 0x46],                                     // '%PDF'
};

/**
 * 校验文件魔数是否匹配声明的扩展名
 * @param {Buffer} buffer - 文件前若干字节
 * @param {string} ext - 不带点的扩展名
 * @returns {boolean}
 */
function matchMagic(buffer, ext) {
  const sig = MAGIC_SIGNATURES[ext.toLowerCase()];
  if (!sig) return true; // 未定义签名，放行

  // 单一签名
  if (Array.isArray(sig) && sig.length > 0 && typeof sig[0] === 'number') {
    return sig.every((b, i) => buffer[i] === b);
  }
  // 多签名数组
  if (Array.isArray(sig) && Array.isArray(sig[0])) {
    return sig.some(s => {
      if (typeof s[0] !== 'number') return false;
      return s.every((b, i) => b === null || buffer[i] === b);
    });
  }
  return true;
}

async function validateFileMagic(filePath, ext) {
  const fsp = await import('fs/promises');
  const fd = await fsp.open(filePath, 'r');
  const buf = Buffer.alloc(16);
  try {
    await fd.read(buf, 0, 16, 0);
  } finally {
    await fd.close();
  }

  if (!matchMagic(buf, ext)) {
    await fsp.unlink(filePath);
    throw new BusinessError(400, `文件内容与声明的类型 (${ext}) 不匹配`);
  }
}

// 内存版本（用于 multer buffer）
function validateBufferMagic(buffer, ext) {
  if (!matchMagic(buffer, ext)) {
    throw new BusinessError(400, `文件内容与声明的类型 (${ext}) 不匹配`);
  }
}

// ============= 分片上传 =============

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const CHUNK_DIR = path.join(UPLOAD_DIR, '.chunks');
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// 确保目录存在
await Promise.all([UPLOAD_DIR, CHUNK_DIR].map(async (dir) => {
  try { await fsp.access(dir); } catch { await fsp.mkdir(dir, { recursive: true }); }
}));

/**
 * 初始化上传 (前端上传前调用)
 */
export async function initUpload({ fileName, fileSize, fileType }) {
  const uploadId = crypto.randomBytes(16).toString('hex');
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const ext = path.extname(fileName);

  // 验证文件类型
  const allowedTypes = uploadConfig.allowedTypes;
  const fileExt = ext.replace('.', '').toLowerCase();
  if (!allowedTypes.includes(fileExt)) {
    throw new BusinessError(400, `不支持的文件格式: ${fileExt}`);
  }

  // 记录上传元信息
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  await fsp.writeFile(metaPath, JSON.stringify({ fileName, fileSize, fileType, totalChunks, receivedChunks: [], createdAt: Date.now() }));

  return {
    upload_id: uploadId,
    chunk_size: CHUNK_SIZE,
    total_chunks: totalChunks,
    upload_url: '/api/upload/chunk',
  };
}

/**
 * 接收分片
 */
export async function receiveChunk(uploadId, chunkIndex, chunkBuffer) {
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  try { await fsp.access(metaPath); } catch { throw new BusinessError(404, '上传会话不存在或已过期'); }

  const metaRaw = await fsp.readFile(metaPath, 'utf8');
  let meta;
  try { meta = JSON.parse(metaRaw); } catch { throw new BusinessError(400, '上传元数据损坏'); }
  const chunkDir = path.join(CHUNK_DIR, uploadId);
  try { await fsp.access(chunkDir); } catch { await fsp.mkdir(chunkDir, { recursive: true }); }

  const chunkPath = path.join(chunkDir, `${chunkIndex}`);
  await fsp.writeFile(chunkPath, chunkBuffer);

  // 记录已接收分片
  if (!meta.receivedChunks.includes(chunkIndex)) {
    meta.receivedChunks.push(chunkIndex);
    await fsp.writeFile(metaPath, JSON.stringify(meta));
  }

  return { upload_id: uploadId, chunk_index: chunkIndex, received: meta.receivedChunks.length, total: meta.totalChunks };
}

/**
 * 获取已上传分片列表 (断点续传用)
 */
export async function getReceivedChunks(uploadId) {
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  try { await fsp.access(metaPath); } catch { return { received: [] }; }
  let meta;
  try { meta = JSON.parse(await fsp.readFile(metaPath, 'utf8')); } catch { return { received: [] }; }
  return { received: meta.receivedChunks || [], total: meta.totalChunks || 0 };
}

/**
 * 完成上传 → 合并分片 → 返回最终文件路径
 */
export async function completeUpload(uploadId) {
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  try { await fsp.access(metaPath); } catch { throw new BusinessError(404, '上传会话不存在'); }

  let meta;
  try { meta = JSON.parse(await fsp.readFile(metaPath, 'utf8')); } catch { throw new BusinessError(400, '上传元数据损坏，请重新上传'); }
  if (meta.receivedChunks.length < meta.totalChunks) {
    throw new BusinessError(400, `分片不完整 (${meta.receivedChunks.length}/${meta.totalChunks})`);
  }

  // 合并分片
  const chunkDir = path.join(CHUNK_DIR, uploadId);
  const timestamp = Date.now();
  const ext = path.extname(meta.fileName);
  const finalName = `${timestamp}_${uploadId.substring(0, 8)}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);

  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(finalPath);
    (async () => {
      try {
        for (let i = 0; i < meta.totalChunks; i++) {
          const chunkPath = path.join(chunkDir, `${i}`);
          const chunkData = await fsp.readFile(chunkPath);
          if (!writeStream.write(chunkData)) {
            await new Promise(r => writeStream.once('drain', r));
          }
        }
        writeStream.on('error', reject);
        writeStream.end();
        writeStream.on('finish', resolve);
      } catch (err) { writeStream.destroy(); reject(err); }
    })();
  });

  // 清理临时文件
  await fsp.rm(chunkDir, { recursive: true, force: true });
  await fsp.unlink(metaPath);

  // 魔数检测 — 合并后验证
  const extClean = ext.replace('.', '').toLowerCase();
  try {
    await validateFileMagic(finalPath, extClean);
  } catch {
    await fsp.unlink(finalPath).catch(err => logger.warn('[FileUpload] 魔数校验清理失败:', err.message)); // 清理问题文件
    throw new BusinessError(400, `文件内容与声明的类型 (${extClean}) 不匹配，已删除`);
  }

  const fileUrl = `/uploads/${finalName}`;
  return {
    file_url: fileUrl,
    file_name: meta.fileName,
    file_size: meta.fileSize,
    file_type: meta.fileType,
    // CDN URL (生产环境)
    cdn_url: uploadConfig.cdnBaseUrl ? `${uploadConfig.cdnBaseUrl}${fileUrl}` : fileUrl,
  };
}

/**
 * 接收 multer 上传的文件并保存到 uploads 目录
 */
export async function saveSimpleFile(file) {
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  const extClean = ext.replace('.', '').toLowerCase();
  const finalName = `${timestamp}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);

  // 魔数检测 — 写入前验证
  validateBufferMagic(file.buffer, extClean);

  await fsp.writeFile(finalPath, file.buffer);

  const fileUrl = `/uploads/${finalName}`;
  return {
    file_url: fileUrl,
    file_name: file.originalname,
    file_size: file.size,
    file_type: file.mimetype,
    cdn_url: uploadConfig.cdnBaseUrl ? `${uploadConfig.cdnBaseUrl}${fileUrl}` : fileUrl,
  };
}

/**
 * 清理过期上传会话 (2小时无活动)
 */
export async function cleanupStaleUploads() {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000;
  let files;
  try { files = await fsp.readdir(CHUNK_DIR); } catch { return; }
  for (const file of files) {
    if (file.endsWith('.json')) {
      const metaPath = path.join(CHUNK_DIR, file);
      try {
        const meta = JSON.parse(await fsp.readFile(metaPath, 'utf8'));
        if (now - meta.createdAt > maxAge) {
          const uploadId = file.replace('.json', '');
          const chunkDir = path.join(CHUNK_DIR, uploadId);
          try { await fsp.rm(chunkDir, { recursive: true, force: true }); } catch { /* skip */ }
          try { await fsp.unlink(metaPath); } catch { /* skip */ }
        }
      } catch { /* skip corrupt meta */ }
    }
  }
}
