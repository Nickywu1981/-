import tierService from '../services/tierService.js';

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
        return res.status(429).json({
          code: 429,
          msg: `今日${type === 'video' ? '视频' : '图片'}生成次数已用完（${result.current}/${result.max}），请升级套餐或明日再试`,
          data: result,
        });
      }
      req.tierLimit = result;
      next();
    } catch (err) {
      // 限额检查失败不影响主流程，放行
      console.error('[TierGuard]', err);
      next();
    }
  };
}

export default { tierGuard };
