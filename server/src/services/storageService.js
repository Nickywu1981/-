/**
 * 云存储抽象层 — 统一文件存储后端
 *
 * 支持后端: Local (默认) / COS / OSS / S3 / MinIO
 * 切换方式: 设置 STORAGE_BACKEND 环境变量 + 对应密钥
 * 降级策略: 云存储不可用时自动 fallback 到本地存储
 *
 * 用法:
 *   import { upload, getUrl, remove, exists } from './services/storageService.js';
 *   const result = await upload(localPath, { tenantId, folder, filename });
 *   const url = await getUrl(remoteKey);
 */

import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { uploadConfig } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_UPLOAD_DIR = path.join(__dirname, '../../uploads');

// 确保本地目录存在
let _dirReady = false;
async function ensureLocalDir(subdir = '') {
  if (!_dirReady) {
    await fsp.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    _dirReady = true;
  }
  if (subdir) {
    const dir = path.join(LOCAL_UPLOAD_DIR, subdir);
    await fsp.mkdir(dir, { recursive: true });
  }
}

/** 从环境变量读取存储后端配置 */
function getBackendConfig() {
  const backend = (process.env.STORAGE_BACKEND || 'local').toLowerCase();
  return {
    backend,
    cos: {
      secretId: process.env.COS_SECRET_ID || '',
      secretKey: process.env.COS_SECRET_KEY || '',
      bucket: process.env.COS_BUCKET || '',
      region: process.env.COS_REGION || 'ap-guangzhou',
      cdnDomain: process.env.CDN_BASE_URL || '',
    },
    oss: {
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: process.env.OSS_BUCKET || '',
      endpoint: process.env.OSS_ENDPOINT || '',
      cdnDomain: process.env.CDN_BASE_URL || '',
    },
    s3: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || '',
      cdnDomain: process.env.CDN_BASE_URL || '',
    },
    minio: {
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
      bucket: process.env.MINIO_BUCKET || '',
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      useSSL: process.env.MINIO_USE_SSL === 'true',
    },
  };
}

// ==================== 路径构建 ====================

/**
 * 构建存储 Key (带租户隔离前缀)
 *   tenantId: 租户 ID
 *   folder: 业务文件夹 (images/videos/documents/avatars)
 *   filename: 文件名
 */
export function buildKey({ tenantId = 0, folder = 'files', filename }) {
  const date = new Date();
  const datePrefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `${tenantId}/${folder}/${datePrefix}/${filename}`;
}

/** 本地绝对路径 — 含路径穿越防护 */
export function localPath(key) {
  const resolved = path.resolve(LOCAL_UPLOAD_DIR, key);
  if (!resolved.startsWith(LOCAL_UPLOAD_DIR + path.sep) && resolved !== LOCAL_UPLOAD_DIR) {
    throw new Error('Path traversal blocked');
  }
  return resolved;
}

// ==================== 本地存储后端 ====================

async function localUpload(sourcePath, key) {
  const dest = localPath(key);
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(sourcePath, dest);
  const stat = await fsp.stat(dest);
  return { key, url: `/uploads/${key}`, size: stat.size };
}

async function localGetUrl(key) {
  const dest = localPath(key);
  try { await fsp.access(dest); } catch { return null; }
  const cdn = uploadConfig.cdnBaseUrl;
  return cdn ? `${cdn}/uploads/${key}` : `/uploads/${key}`;
}

async function localRemove(key) {
  const dest = localPath(key);
  try { await fsp.unlink(dest); return true; } catch { return false; }
}

async function localExists(key) {
  try { await fsp.access(localPath(key)); return true; } catch { return false; }
}

// ==================== COS 后端 (stub — 需要安装 cos-nodejs-sdk-v5) ====================

let _cosClient = null;
let _cosAvailable = null;

async function getCosClient() {
  if (_cosAvailable !== null) return _cosAvailable ? _cosClient : null;
  const cfg = getBackendConfig().cos;
  if (!cfg.secretId || !cfg.secretKey) { _cosAvailable = false; return null; }
  try {
    const COS = (await import('cos-nodejs-sdk-v5')).default;
    _cosClient = new COS({ SecretId: cfg.secretId, SecretKey: cfg.secretKey });
    _cosAvailable = true;
    logger.info('[Storage] COS client initialized', { bucket: cfg.bucket, region: cfg.region });
  } catch (err) {
    _cosAvailable = false;
    logger.warn('[Storage] COS SDK not available, falling back to local', { error: err.message });
  }
  return _cosAvailable ? _cosClient : null;
}

async function cosUpload(sourcePath, key) {
  const client = await getCosClient();
  if (!client) throw new BusinessError(ERROR_CODE.SERVICE_UNAVAILABLE, 'COS unavailable');
  const cfg = getBackendConfig().cos;
  const body = await fsp.readFile(sourcePath);
  return new Promise((resolve, reject) => {
    client.putObject({ Bucket: cfg.bucket, Region: cfg.region, Key: key, Body: body }, (err, data) => {
      if (err) return reject(err);
      resolve({ key, url: cfg.cdnDomain ? `${cfg.cdnDomain}/${key}` : `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com/${key}`, etag: data.ETag });
    });
  });
}

async function cosGetUrl(key) {
  const cfg = getBackendConfig().cos;
  if (cfg.cdnDomain) return `${cfg.cdnDomain}/${key}`;
  return `https://${cfg.bucket}.cos.${cfg.region}.myqcloud.com/${key}`;
}

async function cosRemove(key) {
  const client = await getCosClient();
  if (!client) return false;
  const cfg = getBackendConfig().cos;
  return new Promise((resolve) => {
    client.deleteObject({ Bucket: cfg.bucket, Region: cfg.region, Key: key }, (err) => {
      if (err) { logger.warn('[Storage] COS delete failed', { key, error: err.message }); resolve(false); }
      else resolve(true);
    });
  });
}

async function cosExists(key) {
  const client = await getCosClient();
  if (!client) return false;
  const cfg = getBackendConfig().cos;
  return new Promise((resolve) => {
    client.headObject({ Bucket: cfg.bucket, Region: cfg.region, Key: key }, (err) => resolve(!err));
  });
}

// ==================== S3 兼容后端 (MinIO/OSS/R2 等) ====================

let _s3Client = null;
let _s3Available = null;

async function getS3Client() {
  if (_s3Available !== null) return _s3Available ? _s3Client : null;
  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const cfg = getBackendConfig().s3;
    _s3Client = new S3Client({
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      ...(cfg.endpoint ? { endpoint: cfg.endpoint, forcePathStyle: true } : {}),
    });
    _s3Available = true;
    logger.info('[Storage] S3 client initialized', { bucket: cfg.bucket, region: cfg.region });
  } catch (err) {
    _s3Available = false;
    logger.warn('[Storage] S3 SDK not available, falling back to local', { error: err.message });
  }
  return _s3Available ? _s3Client : null;
}

async function s3Upload(sourcePath, key) {
  const client = await getS3Client();
  if (!client) throw new BusinessError(ERROR_CODE.SERVICE_UNAVAILABLE, 'S3 unavailable');
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const cfg = getBackendConfig().s3;
  const body = await fsp.readFile(sourcePath);
  await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body }));
  const url = cfg.cdnDomain ? `${cfg.cdnDomain}/${key}` :
    (cfg.endpoint ? `${cfg.endpoint}/${cfg.bucket}/${key}` : `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`);
  return { key, url };
}

async function s3GetUrl(key) {
  const cfg = getBackendConfig().s3;
  if (cfg.cdnDomain) return `${cfg.cdnDomain}/${key}`;
  if (cfg.endpoint) return `${cfg.endpoint}/${cfg.bucket}/${key}`;
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`;
}

async function s3Remove(key) {
  const client = await getS3Client();
  if (!client) return false;
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const cfg = getBackendConfig().s3;
  try { await client.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key })); return true; }
  catch (err) { logger.warn('[Storage] S3 delete failed', { key, error: err.message }); return false; }
}

async function s3Exists(key) {
  const client = await getS3Client();
  if (!client) return false;
  const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
  const cfg = getBackendConfig().s3;
  try { await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key })); return true; }
  catch { return false; }
}

// ==================== 统一对外接口 ====================

const backendFn = { local: {}, cos: {}, s3: {} };

/** 获取当前活跃后端名称 */
function activeBackend() {
  return getBackendConfig().backend;
}

/** 解析后端函数 (local/cos/s3)，自动 fallback 到 local */
function resolve(fn) {
  const be = activeBackend();
  if (be === 'cos') return backendFn.cos[fn] || backendFn.local[fn];
  if (be === 's3' || be === 'oss' || be === 'minio') return backendFn.s3[fn] || backendFn.local[fn];
  return backendFn.local[fn];
}

// 注册所有后端函数
backendFn.local.upload = localUpload;
backendFn.local.getUrl = localGetUrl;
backendFn.local.remove = localRemove;
backendFn.local.exists = localExists;
backendFn.cos.upload = cosUpload;
backendFn.cos.getUrl = cosGetUrl;
backendFn.cos.remove = cosRemove;
backendFn.cos.exists = cosExists;
backendFn.s3.upload = s3Upload;
backendFn.s3.getUrl = s3GetUrl;
backendFn.s3.remove = s3Remove;
backendFn.s3.exists = s3Exists;

/**
 * 上传文件到存储后端
 * @param {string} sourcePath — 本地临时文件路径
 * @param {{ tenantId?: number, folder?: string, filename?: string }} opts
 * @returns {Promise<{key: string, url: string, size?: number}>}
 */
export async function upload(sourcePath, opts = {}) {
  const { tenantId = 0, folder = 'files' } = opts;
  const filename = opts.filename || path.basename(sourcePath);
  const key = buildKey({ tenantId, folder, filename });

  const be = activeBackend();
  try {
    if (be !== 'local') {
      return await resolve('upload')(sourcePath, key);
    }
  } catch (err) {
    logger.warn(`[Storage] ${be} upload failed, falling back to local`, { key, error: err.message });
  }
  // 默认走本地
  return await localUpload(sourcePath, key);
}

/**
 * 获取文件访问 URL
 * @param {string} key — 存储 key
 * @returns {Promise<string|null>}
 */
export async function getUrl(key) {
  if (!key) return null;
  try {
    const be = activeBackend();
    if (be !== 'local') {
      const url = await resolve('getUrl')(key);
      if (url) return url;
    }
  } catch (err) { logger.warn('[Storage] getUrl failed', { key, error: err.message }); }
  return localGetUrl(key);
}

/**
 * 删除文件
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function remove(key) {
  if (!key) return false;
  try {
    const be = activeBackend();
    if (be !== 'local') {
      const ok = await resolve('remove')(key);
      if (ok) return true;
    }
  } catch (err) { logger.warn('[Storage] remove failed', { key, error: err.message }); }
  return localRemove(key);
}

/**
 * 检查文件是否存在
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function exists(key) {
  if (!key) return false;
  try {
    const be = activeBackend();
    if (be !== 'local') {
      return await resolve('exists')(key);
    }
  } catch { /* fall through */ }
  return localExists(key);
}

/**
 * 批量获取 URL (并发)
 * @param {string[]} keys
 * @returns {Promise<Record<string, string|null>>}
 */
export async function getUrls(keys) {
  const results = await Promise.allSettled(keys.map(k => getUrl(k)));
  return Object.fromEntries(keys.map((k, i) => [k, results[i].status === 'fulfilled' ? results[i].value : null]));
}

// ==================== 启动健康检查 ====================

let _healthChecked = false;

export async function healthCheck() {
  if (_healthChecked) return _healthChecked;
  const be = activeBackend();
  const key = buildKey({ tenantId: 0, folder: '.health', filename: '.ping' });
  try {
    if (be === 'cos') { const c = await getCosClient(); if (c) { await cosExists(key); } }
    else if (be === 's3' || be === 'oss' || be === 'minio') { const c = await getS3Client(); if (c) { await s3Exists(key); } }
    _healthChecked = { backend: be, status: 'ok' };
  } catch (err) {
    _healthChecked = { backend: be, status: 'degraded', fallback: 'local', error: err.message };
    logger.warn('[Storage] Health check failed, using local fallback', _healthChecked);
  }
  return _healthChecked;
}

export default { upload, getUrl, getUrls, remove, exists, buildKey, localPath, healthCheck };
