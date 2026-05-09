import platformPublishDao from '../dao/platformPublishDao.js';
import { success, error } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export default {
  async getPlatforms(_req, res) {
    try {
      const configs = await platformPublishDao.getPlatformConfigs();
      return success(res, { platforms: configs });
    } catch (_) {
      return error(res, ERROR_CODE.INTERNAL_ERROR, '获取平台列表失败');
    }
  },

  async bindPlatform(req, res) {
    try {
      const { platform, appKey, appSecret, accessToken, shopName } = req.validated;
      await platformPublishDao.saveCredential(req.userId, {
        platform,
        appKey: encrypt(appKey),
        appSecret: encrypt(appSecret),
        accessToken: encrypt(accessToken || ''),
        shopName,
      });
      return success(res, null, `${platform} 绑定成功`);
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },

  async getMyBindings(req, res) {
    try {
      const rows = await platformPublishDao.getUserCredentials(req.userId);
      return success(res, { bindings: rows });
    } catch (_) {
      return error(res, ERROR_CODE.INTERNAL_ERROR, '获取绑定列表失败');
    }
  },

  async unbind(req, res) {
    try {
      await platformPublishDao.disconnectPlatform(req.userId, req.params.platform);
      return success(res, null, '解绑成功');
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },

  async publish(req, res) {
    try {
      const { platform, itemId, title, description, images, price } = req.validated;
      const record = await platformPublishDao.createPublishRecord(req.userId, {
        platform, title, description, images, price, itemId,
      });
      // 异步执行发布到平台
      setImmediate(async () => {
        try {
          // TODO: 调用真实平台 API
          await platformPublishDao.updatePublishStatus(record.id, 'success', `https://${platform}.com/item/${itemId || record.id}`);
        } catch (e) {
          await platformPublishDao.updatePublishStatus(record.id, 'failed', null, e.message);
        }
      });
      return success(res, { id: record.id, status: 'pending' }, '发布任务已提交');
    } catch (e) {
      return error(res, e.status || ERROR_CODE.INTERNAL_ERROR, e.message);
    }
  },

  async getPublishHistory(req, res) {
    try {
      const rows = await platformPublishDao.getPublishHistory(req.userId, {
        platform: req.query.platform || null,
        page: +req.query.page || 1,
        limit: +req.query.limit || 20,
      });
      return success(res, { list: rows });
    } catch (_) {
      return error(res, ERROR_CODE.INTERNAL_ERROR, '获取发布历史失败');
    }
  },
};
