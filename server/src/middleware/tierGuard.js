import tierService from '../services/tierService.js';
import logger from '../utils/logger.js';
import { error } from '../utils/response.js';

/**
 * 会员等级限制中间件
 * 在 AI 操作路由上使用，检查用户今日限额
 * 用法：router.post('/generate', tierGuard('image'), handler)
 */
export function tierGuard(type = 'image') {
  return async (req, res, next) => {
    try {
      const result = await tierService.checkDailyLimit(req.userId || req.user?.id, type);
      if (!result.allowed) {
        return error(res, 429, `今日${type === 'video' ? '视频' : '图片'}生成次数已用完（${result.current}/${result.max}），请升级套餐或明日再试`, result);
      }
      req.tierLimit = result;
      next();
    } catch (err) {
      // 限额检查失败时拒绝请求，防止 DB 故障绕过限制
      logger.warn('[TierGuard] check failed, request denied:', err.message);
      return error(res, 503, '用量检查服务暂不可用，请稍后重试');
    }
  };
}

export default { tierGuard };
