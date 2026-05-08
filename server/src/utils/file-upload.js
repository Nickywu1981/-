/**
 * Movio AI v4.1 — File Upload Service
 * G5 后端开发 | T-G5-004
 * 分片上传: 初始化 → 分片接收(5MB/片) → 合并 → CDN
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const CHUNK_DIR = path.join(UPLOAD_DIR, '.chunks');
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// 确保目录存在
[UPLOAD_DIR, CHUNK_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/**
 * 初始化上传 (前端上传前调用)
 */
export function initUpload({ fileName, fileSize, fileType }) {
  const uploadId = crypto.randomBytes(16).toString('hex');
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const ext = path.extname(fileName);

  // 验证文件类型
  const allowedTypes = (process.env.ALLOWED_UPLOAD_TYPES || 'jpg,jpeg,png,webp,mp4,mov,avi,webm').split(',');
  const fileExt = ext.replace('.', '').toLowerCase();
  if (!allowedTypes.includes(fileExt)) {
    throw { status: 400, message: `不支持的文件格式: ${fileExt}` };
  }

  // 记录上传元信息
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({ fileName, fileSize, fileType, totalChunks, receivedChunks: [], createdAt: Date.now() }));

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
export function receiveChunk(uploadId, chunkIndex, chunkBuffer) {
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  if (!fs.existsSync(metaPath)) {
    throw { status: 404, message: '上传会话不存在或已过期' };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  const chunkDir = path.join(CHUNK_DIR, uploadId);
  if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

  const chunkPath = path.join(chunkDir, `${chunkIndex}`);
  fs.writeFileSync(chunkPath, chunkBuffer);

  // 记录已接收分片
  if (!meta.receivedChunks.includes(chunkIndex)) {
    meta.receivedChunks.push(chunkIndex);
    fs.writeFileSync(metaPath, JSON.stringify(meta));
  }

  return { upload_id: uploadId, chunk_index: chunkIndex, received: meta.receivedChunks.length, total: meta.totalChunks };
}

/**
 * 获取已上传分片列表 (断点续传用)
 */
export function getReceivedChunks(uploadId) {
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  if (!fs.existsSync(metaPath)) return { received: [] };
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  return { received: meta.receivedChunks, total: meta.totalChunks };
}

/**
 * 完成上传 → 合并分片 → 返回最终文件路径
 */
export function completeUpload(uploadId) {
  const metaPath = path.join(CHUNK_DIR, `${uploadId}.json`);
  if (!fs.existsSync(metaPath)) {
    throw { status: 404, message: '上传会话不存在' };
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  if (meta.receivedChunks.length < meta.totalChunks) {
    throw { status: 400, message: `分片不完整 (${meta.receivedChunks.length}/${meta.totalChunks})` };
  }

  // 合并分片
  const chunkDir = path.join(CHUNK_DIR, uploadId);
  const timestamp = Date.now();
  const ext = path.extname(meta.fileName);
  const finalName = `${timestamp}_${uploadId.substring(0, 8)}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);

  const writeStream = fs.createWriteStream(finalPath);
  for (let i = 0; i < meta.totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `${i}`);
    const chunkData = fs.readFileSync(chunkPath);
    writeStream.write(chunkData);
  }
  writeStream.end();

  // 清理临时文件
  fs.rmSync(chunkDir, { recursive: true, force: true });
  fs.unlinkSync(metaPath);

  const fileUrl = `/uploads/${finalName}`;
  return {
    file_url: fileUrl,
    file_name: meta.fileName,
    file_size: meta.fileSize,
    file_type: meta.fileType,
    // CDN URL (生产环境)
    cdn_url: process.env.CDN_BASE_URL ? `${process.env.CDN_BASE_URL}${fileUrl}` : fileUrl,
  };
}

/**
 * 接收 multer 上传的文件并保存到 uploads 目录
 */
export function saveSimpleFile(file) {
  const timestamp = Date.now();
  const ext = path.extname(file.originalname);
  const finalName = `${timestamp}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const finalPath = path.join(UPLOAD_DIR, finalName);

  fs.writeFileSync(finalPath, file.buffer);

  const fileUrl = `/uploads/${finalName}`;
  return {
    file_url: fileUrl,
    file_name: file.originalname,
    file_size: file.size,
    file_type: file.mimetype,
    cdn_url: process.env.CDN_BASE_URL ? `${process.env.CDN_BASE_URL}${fileUrl}` : fileUrl,
  };
}

/**
 * 清理过期上传会话 (2小时无活动)
 */
export function cleanupStaleUploads() {
  const now = Date.now();
  const maxAge = 2 * 60 * 60 * 1000;
  const files = fs.readdirSync(CHUNK_DIR);
  for (const file of files) {
    if (file.endsWith('.json')) {
      const metaPath = path.join(CHUNK_DIR, file);
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        if (now - meta.createdAt > maxAge) {
          const uploadId = file.replace('.json', '');
          const chunkDir = path.join(CHUNK_DIR, uploadId);
          if (fs.existsSync(chunkDir)) fs.rmSync(chunkDir, { recursive: true, force: true });
          fs.unlinkSync(metaPath);
        }
      } catch { /* skip corrupt meta */ }
    }
  }
}
