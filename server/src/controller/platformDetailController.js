import platformDetailService from '../services/platformDetailService.js';
import { success, error } from '../utils/response.js';

export async function listAllPlatforms(_req, res) {
  try {
    const platforms = platformDetailService.listAllPlatforms();
    return success(res, platforms);
  } catch (err) { return error(res, 500, err.message); }
}

export async function getPlatformConfig(req, res) {
  try {
    const config = platformDetailService.getPlatformConfig(req.params.code);
    if (!config) return error(res, 404, '平台不存在');
    return success(res, config);
  } catch (err) { return error(res, 500, err.message); }
}

export async function getPlatformsByRegion(req, res) {
  try {
    const { region = 'cn' } = req.query;
    const platforms = platformDetailService.getPlatformsByRegion(region);
    return success(res, platforms);
  } catch (err) { return error(res, 500, err.message); }
}

export default { listAllPlatforms, getPlatformConfig, getPlatformsByRegion };
