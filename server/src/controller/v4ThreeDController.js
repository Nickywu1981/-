/**
 * Movio AI v4.1 — 3D Controller
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../../uploads/3d');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const MAGIC_BYTES = {
  '.glb': { offset: 0, bytes: Buffer.from('glTF') },
  '.fbx': { offset: 0, bytes: Buffer.from('Kaydara FBX Binary') },
};
const TEXT_STARTS = {
  '.gltf': '{',
  '.obj': ['#', 'v', 'f', 'g', 'o', 's', 'm', 'u'],
  '.stl': 'solid',
};

async function validateMagicBytes(filePath, ext) {
  const magic = MAGIC_BYTES[ext];
  let fh;
  try {
    fh = await fs.promises.open(filePath, 'r');
    if (magic) {
      const buf = Buffer.alloc(magic.bytes.length);
      await fh.read(buf, 0, buf.length, magic.offset);
      return buf.equals(magic.bytes);
    }
    const buf = Buffer.alloc(256);
    const { bytesRead } = await fh.read(buf, 0, 256, 0);
    const head = buf.toString('utf8', 0, bytesRead).trimStart();
    if (!head) return false;
    const expected = TEXT_STARTS[ext];
    if (typeof expected === 'string') return head.startsWith(expected);
    if (Array.isArray(expected)) return expected.some(c => head.startsWith(c));
    return true;
  } finally {
    if (fh) await fh.close();
  }
}

export const upload = wrapController(async (req, res) => {
  if (!req.file) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!await validateMagicBytes(req.file.path, ext)) {
    fs.unlink(req.file.path, () => {});
    throw new BusinessError(ERROR_CODE.BAD_REQUEST);
  }
  const url = `/uploads/3d/${req.file.filename}`;
  logger.info(`[3D] 模型上传: ${req.file.filename} → ${url}`);
  return success(res, {
    url,
    name: req.file.originalname.replace(/[\\/:*?"<>|]/g, '_'),
    size: req.file.size,
  }, '上传成功');
});

export const getModels = wrapController(async (_req, res) => {
  const entries = await fs.promises.readdir(uploadDir);
  const files = (await Promise.allSettled(
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
  ))
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);
  files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return success(res, { list: files, total: files.length });
});

const DEMO_MODELS = {
  shoe: 'shoe.glb',
  watch: 'watch.glb',
  bag: 'bag.glb',
  bottle: 'bottle.glb',
};

export const getDemo = wrapController(async (req, res) => {
  const file = DEMO_MODELS[req.validated.key];
  if (!file) throw new BusinessError(ERROR_CODE.NOT_FOUND);
  const filePath = path.join(uploadDir, 'demo', file);
  try {
    await fs.promises.access(filePath);
  } catch { logger.debug('[3D] Demo model file not found:', file);
    throw new BusinessError(ERROR_CODE.NOT_FOUND);
  }
  return res.sendFile(filePath);
});
