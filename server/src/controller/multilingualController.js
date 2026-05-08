import multilingualService from '../services/multilingualService.js';

export async function getLanguages(_req, res) {
  res.json({ code: 200, msg: 'success', data: multilingualService.getLanguages() });
}

export async function getScriptTypes(_req, res) {
  res.json({ code: 200, msg: 'success', data: multilingualService.getScriptTypes() });
}

export async function buildPrompt(req, res) {
  const { product, language, scriptType, platform, tone } = req.body;
  if (!product || !language || !scriptType) {
    return res.status(400).json({ code: 400, msg: '缺少必要参数：product, language, scriptType', data: null });
  }
  const result = multilingualService.buildMultilingualPrompt({ product, language, scriptType, platform, tone });
  res.json({ code: 200, msg: 'success', data: result });
}

export default { getLanguages, getScriptTypes, buildPrompt };
