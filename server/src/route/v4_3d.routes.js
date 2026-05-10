/**
 * 3D 预览路由
 * POST /api/3d/upload — 上传 3D 模型
 * GET  /api/3d/models — 用户模型列表
 * GET  /api/3d/demo/:key — 获取示例模型
 */
import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { uploadLimiter } from '../middleware/rateLimiter.js';
import { uploadQuotaGuard } from '../middleware/upload.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { validateV4 as _validate } from '../utils/validate.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Upload config
const uploadDir = path.resolve(__dirname, '../../uploads/3d');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.glb', '.gltf', '.fbx', '.obj', '.stl'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// Magic bytes for 3D model formats to prevent extension-spoofing
const MAGIC_BYTES = {
  '.glb': { offset: 0, bytes: Buffer.from('glTF') },
  '.fbx': { offset: 0, bytes: Buffer.from('Kaydara FBX Binary') },
};
const TEXT_STARTS = {
  '.gltf': '{',
  '.obj': ['#', 'v', 'f', 'g', 'o', 's', 'm', 'u'],
  '.stl': 'solid',
};

function validateMagicBytes(filePath, ext) {
  // Binary format check
  const magic = MAGIC_BYTES[ext];
  if (magic) {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(magic.bytes.length);
      fs.readSync(fd, buf, 0, buf.length, magic.offset);
      return buf.equals(magic.bytes);
    } finally { fs.closeSync(fd); }
  }
  // Text format check: read first 256 bytes
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(256);
    const n = fs.readSync(fd, buf, 0, 256, 0);
    const head = buf.toString('utf8', 0, n).trimStart();
    if (!head) return false;
    const expected = TEXT_STARTS[ext];
    if (typeof expected === 'string') return head.startsWith(expected);
    if (Array.isArray(expected)) return expected.some(c => head.startsWith(c));
    return true;
  } finally { fs.closeSync(fd); }
}

// POST /api/3d/upload
router.post('/upload', uploadLimiter, authMiddleware, upload.single('model'), uploadQuotaGuard, (req, res, next) => {
  try {
    if (!req.file) return error(res, ERROR_CODE.BAD_REQUEST, '请上传 3D 模型文件');
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!validateMagicBytes(req.file.path, ext)) {
      fs.unlink(req.file.path, () => {});
      return error(res, ERROR_CODE.BAD_REQUEST, '文件格式与扩展名不匹配');
    }
    const url = `/uploads/3d/${req.file.filename}`;
    logger.info(`[3D] 模型上传: ${req.file.filename} → ${url}`);
    return success(res, {
      url,
      name: req.file.originalname.replace(/[\\/:*?"<>|]/g, '_'),
      size: req.file.size,
    }, '上传成功');
  } catch (e) { next(e); }
});

const modelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// GET /api/3d/models
router.get('/models', authMiddleware, _validate(modelsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const entries = await fs.promises.readdir(uploadDir);
    const files = await Promise.all(
      entries
        .filter((f) => ['.glb', '.gltf', '.fbx', '.obj', '.stl'].includes(path.extname(f).toLowerCase()))
        .map(async (f) => {
          const stat = await fs.promises.stat(path.join(uploadDir, f));
          return {
            name: f,
            url: `/uploads/3d/${f}`,
            size: stat.size,
            uploadedAt: stat.mtime.toISOString(),
          };
        }),
    );
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return success(res, { list: files, total: files.length });
  } catch (e) { next(e); }
});

// GET /api/3d/demo/:key — 示例模型（GLB）
const DEMO_MODELS = {
  shoe: 'shoe.glb',
  watch: 'watch.glb',
  bag: 'bag.glb',
  bottle: 'bottle.glb',
};

const demoParamsSchema = z.object({
  key: z.enum(['shoe', 'watch', 'bag', 'bottle']),
});

router.get('/demo/:key', _validate(demoParamsSchema, 'params'), (req, res, next) => {
  try {
    const file = DEMO_MODELS[req.validated.key];
    if (!file) return error(res, ERROR_CODE.NOT_FOUND, '示例模型不存在');
    const filePath = path.join(uploadDir, 'demo', file);
    try {
      await fs.promises.access(filePath);
    } catch {
      return error(res, ERROR_CODE.NOT_FOUND, '示例模型文件不存在');
    }
    return res.sendFile(filePath);
  } catch (e) { next(e); }
});

export default router;
