/**
 * 文件上传中间件 — multer 配置 + 魔数检测（防伪造扩展名）
 */
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/images');

// 文件头魔数签名（前 N 字节十六进制）
const MAGIC_SIGNATURES = {
  'image/png':      [0x89, 0x50, 0x4E, 0x47],
  'image/jpeg':     [0xFF, 0xD8, 0xFF],
  'image/webp':     [0x52, 0x49, 0x46, 0x46], // RIFF
  'image/gif':      [0x47, 0x49, 0x46, 0x38], // GIF8
  'image/avif':     null, // AVIF 用 ftyp box，检测较复杂，信任 MIME
  'video/mp4':      null,
  'video/quicktime': null,
};


/** 检测文件头是否匹配声明类型 */
function checkMagicNumber(filePath, mimeType) {
  const expected = MAGIC_SIGNATURES[mimeType];
  if (!expected) return true; // 无签名定义时信任 MIME
  try {
    const buf = fs.readFileSync(filePath, { flag: 'r' });
    for (let i = 0; i < expected.length; i++) {
      if (buf[i] !== expected[i]) return false;
    }
    return true;
  } catch { return false; }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const name = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  },
});

function fileFilter(_req, file, cb) {
  const allowed = Object.keys(MAGIC_SIGNATURES);
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
  }
}

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** 魔数后置校验中间件 — 在 multer 写入后、入库前执行 */
export function magicNumberGuard(req, res, next) {
  if (!req.file && !req.files) return next();
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
  for (const f of files) {
    if (!checkMagicNumber(f.path, f.mimetype)) {
      fs.unlink(f.path, () => {}); // 删除恶意文件
      return res.status(400).json({ code: 400, msg: '文件内容与扩展名不匹配，已拒绝', data: null });
    }
  }
  next();
}
