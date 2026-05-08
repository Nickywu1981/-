import complianceService from '../services/complianceService.js';

export async function listTargets(_req, res) {
  res.json({ code: 200, msg: 'success', data: complianceService.listComplianceTargets() });
}

export async function check(req, res) {
  const { platform, region, category } = req.body;
  if (!platform) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数：platform', data: null });
  }
  const result = complianceService.checkCompliance({ platform, region, category });
  res.json({ code: 200, msg: 'success', data: result });
}

export async function getRules(req, res) {
  const { code } = req.params;
  const rules = complianceService.getPlatformCompliance(code) || complianceService.getRegionCompliance(code);
  if (!rules) return res.status(404).json({ code: 404, msg: '未找到合规规则', data: null });
  res.json({ code: 200, msg: 'success', data: rules });
}

export default { listTargets, check, getRules };
