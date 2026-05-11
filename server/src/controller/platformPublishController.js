import platformPublishDao from '../dao/platformPublishDao.js';
import { success } from '../utils/response.js';
import { encrypt } from '../utils/crypto.js';
import { wrapController } from '../utils/wrapController.js';

export const getPlatforms = wrapController(async (_req, res) => {
  const configs = await platformPublishDao.getPlatformConfigs();
  return success(res, { platforms: configs });
});

export const bindPlatform = wrapController(async (req, res) => {
  const { platform, appKey, appSecret, accessToken, shopName } = req.validated;
  await platformPublishDao.saveCredential(req.userId, {
    platform,
    appKey: encrypt(appKey),
    appSecret: encrypt(appSecret),
    accessToken: encrypt(accessToken || ''),
    shopName,
  });
  return success(res, null, `${platform} 绑定成功`);
});

export const getMyBindings = wrapController(async (req, res) => {
  const rows = await platformPublishDao.getUserCredentials(req.userId);
  return success(res, { bindings: rows });
});

export const unbind = wrapController(async (req, res) => {
  await platformPublishDao.disconnectPlatform(req.userId, req.params.platform);
  return success(res, null, '解绑成功');
});

export const publish = wrapController(async (req, res) => {
  const { platform, itemId, title, description, images, price } = req.validated;
  const record = await platformPublishDao.createPublishRecord(req.userId, {
    platform, title, description, images, price, itemId,
  });
  // 异步执行发布到平台
  setImmediate(async () => {
    try {
      // TODO: 调用真实平台 API
      await platformPublishDao.updatePublishStatus(record.id, req.userId, 'success', `https://${platform}.com/item/${itemId || record.id}`);
    } catch (e) {
      await platformPublishDao.updatePublishStatus(record.id, req.userId, 'failed', null, '平台发布失败');
    }
  });
  return success(res, { id: record.id, status: 'pending' }, '发布任务已提交');
});

export const getPublishHistory = wrapController(async (req, res) => {
  const rows = await platformPublishDao.getPublishHistory(req.userId, {
    platform: req.query.platform || null,
    page: +req.query.page || 1,
    limit: +req.query.limit || 20,
  });
  return success(res, { list: rows });
});
