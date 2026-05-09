/**
 * Movio AI v4.1 — Upload Routes
 * G5 后端开发 | POST /api/upload/simple | /init | /chunk | /complete
 */
import { Router } from 'express';
import { z } from 'zod';
import { success, error } from '../utils/response.js';
import { validateV4 as _validate, validate } from '../utils/validate.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as uploadService from '../utils/file-upload.js';
import multer from 'multer';

const router = Router();
const _storage = multer.memoryStorage();
const _upload = multer({ storage: _storage, limits: { fileSize: 50 * 1024 * 1024 } });

const initUploadSchema = z.object({
  file_name: z.string().min(1, '请提供文件名').max(255),
  file_size: z.number().int().positive('文件大小不正确').max(10 * 1024 * 1024 * 1024),
  file_type: z.string().min(1, '请提供文件类型').max(100),
});

const completeUploadSchema = z.object({
  upload_id: z.string().regex(/^[a-f0-9]{32}$/, 'upload_id 格式不正确'),
});

const chunkSchema = z.object({
  upload_id: z.string().regex(/^[a-f0-9]{32}$/, 'upload_id 格式错误'),
  chunk_index: z.coerce.number().int().min(0, 'chunk_index 必须为非负整数'),
});

// Multer error wrapper
function _withMulter(req, res, next) {
  _upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, ERROR_CODE.VALIDATION_ERROR, '文件大小超过50MB限制');
      }
      return error(res, ERROR_CODE.INTERNAL_ERROR, err.message || '上传处理失败');
    }
    next();
  });
}

// POST /api/upload/simple — 小文件直接上传
router.post('/simple', _withMulter, (req, res) => {
  try {
    if (!req.file) return error(res, ERROR_CODE.VALIDATION_ERROR, '请选择文件');
    const result = uploadService.saveSimpleFile(req.file);
    return success(res, result, '上传成功');
  } catch (err) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message || '上传失败');
  }
});

// POST /api/upload/init — 初始化分片上传
router.post('/init', _validate(initUploadSchema), (req, res) => {
  try {
    const { file_name, file_size, file_type } = req.validated;
    const result = uploadService.initUpload({ fileName: file_name, fileSize: file_size, fileType: file_type });
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '初始化上传失败');
  }
});

const UPLOAD_ID_REGEX = /^[a-f0-9]{32}$/;

// POST /api/upload/chunk — 接收分片 (multipart: upload_id, chunk_index, chunk)
router.post('/chunk', _upload.fields([{ name: 'chunk', maxCount: 1 }]), validate(chunkSchema, 'body'), (req, res) => {
  try {
    const { upload_id, chunk_index } = req.body;
    if (!req.files?.chunk?.[0]) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, '缺少分片文件');
    }
    const result = uploadService.receiveChunk(upload_id, chunk_index, req.files.chunk[0].buffer);
    return success(res, result);
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '接收分片失败');
  }
});

// GET /api/upload/chunks/:uploadId — 获取已上传分片 (断点续传)
router.get('/chunks/:uploadId', (req, res) => {
  try {
    if (!UPLOAD_ID_REGEX.test(req.params.uploadId)) {
      return error(res, ERROR_CODE.VALIDATION_ERROR, 'uploadId 格式不正确');
    }
    const result = uploadService.getReceivedChunks(req.params.uploadId);
    return success(res, result);
  } catch (err) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message || '查询分片失败');
  }
});

// POST /api/upload/complete — 完成合并
router.post('/complete', _validate(completeUploadSchema), (req, res) => {
  try {
    const { upload_id } = req.validated;
    const result = uploadService.completeUpload(upload_id);
    return success(res, result, '上传完成');
  } catch (err) {
    return error(res, err.status || ERROR_CODE.INTERNAL_ERROR, err.message || '合并文件失败');
  }
});

export default router;
