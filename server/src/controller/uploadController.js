/**
 * 文件上传接口
 */
import { wrapController } from '../utils/wrapController.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const uploadFile = wrapController(async (req, res) => {
    if (!req.file) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请选择文件');
    }

    const url = `/uploads/images/${req.file.filename}`;
    return success(res, {
      url,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    }, '上传成功');
  } catch (err) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}

export const uploadMultipleFiles = wrapController(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return error(res, ERROR_CODE.PARAM_MISSING, '请选择文件');
    }

    const urls = req.files.map((f) => ({
      url: `/uploads/images/${f.filename}`,
      originalName: f.originalname,
      size: f.size,
    }));

    return success(res, { files: urls, count: urls.length }, '上传成功');
  } catch (err) {
    return error(res, ERROR_CODE.INTERNAL_ERROR, err.message);
  }
}
