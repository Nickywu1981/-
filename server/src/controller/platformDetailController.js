import platformDetailService from '../services/platformDetailService.js';

export async function listAllPlatforms(_req, res) {
  try {
    const platforms = platformDetailService.listAllPlatforms();
    res.json({ code: 200, msg: 'success', data: platforms });
  } catch (err) { res.status(500).json({ code: 500, msg: err.message, data: null }); }
}

export async function getPlatformConfig(req, res) {
  try {
    const config = platformDetailService.getPlatformConfig(req.params.code);
    if (!config) return res.status(404).json({ code: 404, msg: '平台不存在', data: null });
    res.json({ code: 200, msg: 'success', data: config });
  } catch (err) { res.status(500).json({ code: 500, msg: err.message, data: null }); }
}

export async function getPlatformsByRegion(req, res) {
  try {
    const { region = 'cn' } = req.query;
    const platforms = platformDetailService.getPlatformsByRegion(region);
    res.json({ code: 200, msg: 'success', data: platforms });
  } catch (err) { res.status(500).json({ code: 500, msg: err.message, data: null }); }
}

export default { listAllPlatforms, getPlatformConfig, getPlatformsByRegion };
