import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../utils/file-upload.js');
vi.mock('../../utils/logger.js', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import * as uploadService from '../../utils/file-upload.js';
import {
  saveSimpleFile, initUpload, receiveChunk, getReceivedChunks, completeUpload,
} from '../../controller/v4UploadController.js';

function mockRes() {
  let sent = false;
  return {
    json(d) { sent = true; return d; },
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    get headersSent() { return sent; },
  };
}

function pngChunkBuffer() {
  return Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
}

describe('v4UploadController', () => {
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    res = mockRes();
  });

  describe('saveSimpleFile', () => {
    it('上传 PNG 文件成功', async () => {
      uploadService.saveSimpleFile.mockResolvedValue({ url: 'https://cdn.example/img.png', key: 'u/1/img.png' });
      const req = { file: { buffer: pngChunkBuffer(), mimetype: 'image/png', originalname: 'test.png', size: 1000 } };
      const result = await saveSimpleFile(req, res);
      expect(result.code).toBe(200);
    });

    it('缺少文件返回错误', async () => {
      const result = await saveSimpleFile({ file: null }, res);
      expect(result.code).toBeGreaterThan(100);
    });

    it('MIME/文件内容不匹配返回错误', async () => {
      const req = { file: { buffer: Buffer.from('not-a-jpeg'), mimetype: 'image/jpeg' } };
      const result = await saveSimpleFile(req, res);
      expect(result.code).toBeGreaterThan(100);
    });
  });

  describe('initUpload', () => {
    it('初始化分片上传', async () => {
      uploadService.initUpload.mockResolvedValue({ uploadId: 'abc123' });
      const req = { validated: { file_name: 'video.mp4', file_size: 50 * 1024 * 1024, file_type: 'video/mp4' } };
      const result = await initUpload(req, res);
      expect(result.code).toBe(200);
    });
  });

  describe('receiveChunk', () => {
    it('接收分片成功', async () => {
      uploadService.receiveChunk.mockResolvedValue({ chunkIndex: 0, received: 5 * 1024 * 1024 });
      const chunk = { buffer: pngChunkBuffer(), mimetype: 'image/png' };
      const req = { body: { upload_id: 'abc123', chunk_index: 0 }, files: { chunk: [chunk] } };
      const result = await receiveChunk(req, res);
      expect(result.code).toBe(200);
    });

    it('缺少分片文件返回错误', async () => {
      const req = { body: { upload_id: 'abc123', chunk_index: 0 }, files: { chunk: [] } };
      const result = await receiveChunk(req, res);
      expect(result.code).toBeGreaterThan(100);
    });

    it('分片内容与类型不匹配返回错误', async () => {
      const chunk = { buffer: Buffer.from('invalid'), mimetype: 'image/jpeg' };
      const req = { body: { upload_id: 'abc123', chunk_index: 0 }, files: { chunk: [chunk] } };
      const result = await receiveChunk(req, res);
      expect(result.code).toBeGreaterThan(100);
    });
  });

  describe('getReceivedChunks', () => {
    it('获取已接收分片列表', async () => {
      uploadService.getReceivedChunks.mockResolvedValue({ chunkIndexes: [0, 1, 2] });
      const req = { params: { uploadId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' } };
      const result = await getReceivedChunks(req, res);
      expect(result.code).toBe(200);
    });

    it('非法 uploadId 返回错误', async () => {
      const req = { params: { uploadId: 'not-hex' } };
      const result = await getReceivedChunks(req, res);
      expect(result.code).toBeGreaterThan(100);
    });
  });

  describe('completeUpload', () => {
    it('完成合并上传', async () => {
      uploadService.completeUpload.mockResolvedValue({ url: 'https://cdn.example/video.mp4' });
      const result = await completeUpload({ validated: { upload_id: 'abc123' } }, res);
      expect(result.code).toBe(200);
    });
  });
});
