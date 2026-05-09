/**
 * 3D 预览路由
 * POST /api/3d/upload — 上传 3D 模型
 * GET  /api/3d/models — 用户模型列表
 * GET  /api/3d/demo/:key — 获取示例模型
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authMiddleware } from '../middleware/auth.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
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

// POST /api/3d/upload
router.post('/upload', authMiddleware, upload.single('model'), (req, res, next) => {
  try {
    if (!req.file) return error(res, ERROR_CODE.BAD_REQUEST, '请上传 3D 模型文件');
    const url = `/uploads/3d/${req.file.filename}`;
    logger.info(`[3D] 模型上传: ${req.file.originalname} → ${url}`);
    return success(res, {
      url,
      name: req.file.originalname,
      size: req.file.size,
    }, '上传成功');
  } catch (e) { next(e); }
});

// GET /api/3d/models
router.get('/models', authMiddleware, async (_req, res, next) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter((f) => ['.glb', '.gltf', '.fbx', '.obj', '.stl'].includes(path.extname(f).toLowerCase()))
      .map((f) => ({
        name: f,
        url: `/uploads/3d/${f}`,
        size: fs.statSync(path.join(uploadDir, f)).size,
        uploadedAt: fs.statSync(path.join(uploadDir, f)).mtime.toISOString(),
      }))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
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

router.get('/demo/:key', (req, res, next) => {
  try {
    const file = DEMO_MODELS[req.params.key];
    if (!file) return error(res, ERROR_CODE.NOT_FOUND, '示例模型不存在');
    const filePath = path.join(uploadDir, 'demo', file);
    if (!fs.existsSync(filePath)) return error(res, ERROR_CODE.NOT_FOUND, '示例模型文件不存在');
    return res.sendFile(filePath);
  } catch (e) { next(e); }
});

export default router;
