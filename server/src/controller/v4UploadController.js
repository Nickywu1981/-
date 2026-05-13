/**
 * Movio AI v4.1 — Upload Controller
 */
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import * as uploadService from '../utils/file-upload.js';

const MAGIC_BYTES = {
  'image/png':      [0x89, 0x50, 0x4E, 0x47],
  'image/jpeg':     [0xFF, 0xD8, 0xFF],
  'image/webp':     [0x52, 0x49, 0x46, 0x46],
  'image/gif':      [0x47, 0x49, 0x46, 0x38],
  'image/avif':     [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66],
  'video/mp4':      [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70],
  'video/quicktime': [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70],
};

function checkBufferMagic(buffer, mimeType) {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return true;
  if (buffer.length < expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] !== null && buffer[i] !== expected[i]) return false;
  }
  return true;
}

const UPLOAD_ID_REGEX = /^[a-f0-9]{32}$/;

export const saveSimpleFile = wrapController(async (req, res) => {
  if (!req.file) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR);
  if (!checkBufferMagic(req.file.buffer, req.file.mimetype)) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR);
  }
  const result = await uploadService.saveSimpleFile(req.file);
  return success(res, result, '上传成功');
});

export const initUpload = wrapController(async (req, res) => {
  const { file_name, file_size, file_type } = req.validated;
  const result = await uploadService.initUpload({ fileName: file_name, fileSize: file_size, fileType: file_type });
  return success(res, result);
});

export const receiveChunk = wrapController(async (req, res) => {
  const { upload_id, chunk_index } = req.body;
  const chunkFile = req.files?.chunk?.[0];
  if (!chunkFile) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR);
  }
  if (!checkBufferMagic(chunkFile.buffer, chunkFile.mimetype)) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR);
  }
  const result = await uploadService.receiveChunk(upload_id, chunk_index, chunkFile.buffer);
  return success(res, result);
});

export const getReceivedChunks = wrapController(async (req, res) => {
  if (!UPLOAD_ID_REGEX.test(req.params.uploadId)) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR);
  }
  const result = await uploadService.getReceivedChunks(req.params.uploadId);
  return success(res, result);
});

export const completeUpload = wrapController(async (req, res) => {
  const { upload_id } = req.validated;
  const result = await uploadService.completeUpload(upload_id);
  return success(res, result, '上传完成');
});
