import tierService from '../services/tierService.js';

export async function getMyTier(req, res) {
  const tier = await tierService.getUserTier(req.userId);
  const limits = tierService.getTierLimits(tier);
  res.json({ code: 200, msg: 'success', data: { tier, limits } });
}

export async function checkLimit(req, res) {
  const { type = 'image' } = req.query;
  const result = await tierService.checkDailyLimit(req.userId, type);
  res.json({ code: 200, msg: 'success', data: result });
}

export async function getExportPermission(req, res) {
  const [hd, noWatermark] = await Promise.all([
    tierService.canExportHd(req.userId),
    tierService.canExportWithoutWatermark(req.userId),
  ]);
  res.json({ code: 200, msg: 'success', data: { exportHd: hd, noWatermark } });
}

export default { getMyTier, checkLimit, getExportPermission };
