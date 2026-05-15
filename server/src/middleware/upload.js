/**
 * 文件上传中间件 — multer 配置 + 魔数检测（防伪造扩展名）
 */
import multer from 'multer';
import path from 'path';
import { registerTimer } from '../utils/shutdownRegistry.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { error } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import logger from '../utils/logger.js';
import { uploadConfig } from '../config/index.js';
import { ERROR_CODE } from '../constants/errorCode.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_BASE_DIR = path.join(__dirname, '../../uploads');

/** 构建租户隔离上传目录: uploads/{tenantId}/images/ */
function getTenantUploadDir(tenantId) {
  const tid = tenantId || 0;
  return path.join(UPLOAD_BASE_DIR, String(tid), 'images');
}

let _dirReady = false;
async function ensureUploadDir(subdir) {
  if (!_dirReady) {
    await fs.promises.mkdir(UPLOAD_BASE_DIR, { recursive: true });
    _dirReady = true;
  }
  if (subdir) {
    await fs.promises.mkdir(subdir, { recursive: true });
  }
}

// 文件头魔数签名（前 N 字节十六进制）
const MAGIC_SIGNATURES = {
  'image/png':      { bytes: [0x89, 0x50, 0x4E, 0x47] },
  'image/jpeg':     { bytes: [0xFF, 0xD8, 0xFF] },
  'image/webp':     { bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
  'image/gif':      { bytes: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  'image/avif':     { bytes: [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], offset: 4 }, // ftypavif
  'video/mp4':      { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp box
  'video/quicktime':{ bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp box (MOV)
};

// MIME 类型 → 安全扩展名（不信任用户提供的 originalname）
const MIME_TO_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
};

/** 检测文件头是否匹配声明类型 (async) */
async function checkMagicNumber(filePath, mimeType) {
  const sig = MAGIC_SIGNATURES[mimeType];
  if (!sig) return true;
  const offset = sig.offset || 0;
  const expected = sig.bytes;
  let fh;
  try {
    fh = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(offset + expected.length);
    await fh.read(buf, 0, buf.length, 0);
    for (let i = 0; i < expected.length; i++) {
      if (buf[offset + i] !== expected[i]) return false;
    }
    return true;
  } catch (err) {
    // 文件读取异常（权限/IO错误）≠ 魔数不匹配，不应误删文件
    logger.error('[Upload] 魔数检测失败（文件读取异常）', { filePath, mimeType, error: err.message });
    return { readError: true };
  }
  finally { if (fh) await fh.close(); }
}

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    const dir = getTenantUploadDir(req.tenantId);
    await ensureUploadDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || '.png';
    const tid = _req.tenantId || 0;
    const name = `${tid}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = Object.keys(MAGIC_SIGNATURES);
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BusinessError(ERROR_CODE.PARAM_INVALID, `Unsupported file type: ${file.mimetype}`), false);
  }
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** 魔数后置校验中间件 — 在 multer 写入后、入库前执行 */
export async function magicNumberGuard(req, res, next) {
  if (!req.file && !req.files) return next();
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
  for (const f of files) {
    const result = await checkMagicNumber(f.path, f.mimetype);
    if (result === false) {
      fs.unlink(f.path, (err) => {
        if (err) logger.error('[Upload] 删除恶意文件失败', { path: f.path, error: err.message });
      });
      return error(res, 400, '文件内容与扩展名不匹配，已拒绝');
    }
    if (result && result.readError) {
      // 文件无法读取但保留，记录告警由人工审核
      logger.warn('[Upload] 魔数检测跳过（文件不可读），保留文件待人工审核', { path: f.path, mimeType: f.mimetype });
    }
  }
  next();
}

// ── 上传配额（每日每租户上传量上限）──

const DAILY_UPLOAD_LIMIT_MB = uploadConfig.dailyLimitMb;
const QUOTA_CLEANUP_MS = 60 * 60 * 1000;
const tenantUploadQuota = new Map(); // key → { total: number, ts: number }

export const _quotaCleanupTimer = setInterval(() => {
  try {
  const now = Date.now();
  for (const [k, v] of tenantUploadQuota) {
    if (now - v.ts > 24 * 60 * 60 * 1000) tenantUploadQuota.delete(k);
  }
  } catch { /* Map 迭代安全，兜底防护 */ }
}, QUOTA_CLEANUP_MS).unref();
registerTimer(_quotaCleanupTimer);

export function uploadQuotaGuard(req, res, next) {
  const tenantId = req.tenantId || req.user?.tenantId || 0;
  const key = `quota:${tenantId}`;
  const entry = tenantUploadQuota.get(key) || { total: 0, ts: Date.now() };

  // 预估本次上传大小
  const files = req.file ? [req.file] : (req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : []);
  const estSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

  // 原子预扣配额，避免 TOCTOU 竞态 — 先扣后检
  entry.total += estSize;
  entry.ts = Date.now();
  tenantUploadQuota.set(key, entry);

  if (entry.total > DAILY_UPLOAD_LIMIT_MB * 1024 * 1024) {
    // 超额回退
    entry.total -= estSize;
    tenantUploadQuota.set(key, entry);
    return error(res, 429, `每日上传配额已用尽 (${DAILY_UPLOAD_LIMIT_MB}MB)`);
  }

  // 响应失败时回退预扣配额
  let quotaDone = false;
  const done = () => {
    if (quotaDone) return;
    quotaDone = true;
    if (res.statusCode >= 400) {
      const cur = tenantUploadQuota.get(key);
      if (cur) { cur.total = Math.max(0, cur.total - estSize); cur.ts = Date.now(); }
    }
  };
  res.on('close', done);

  next();
}
