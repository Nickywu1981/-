import multilingualService from '../services/multilingualService.js';

export async function getLanguages(_req, res) {
  try {
    res.json({ code: 200, msg: 'success', data: multilingualService.getLanguages() });
  } catch (err) { res.status(500).json({ code: 500, msg: err.message, data: null }); }
}

export async function getScriptTypes(_req, res) {
  try {
    res.json({ code: 200, msg: 'success', data: multilingualService.getScriptTypes() });
  } catch (err) { res.status(500).json({ code: 500, msg: err.message, data: null }); }
}

export async function buildPrompt(req, res) {
  try {
    const { product, language, scriptType, platform, tone } = req.body;
    if (!product || !language || !scriptType) {
      return res.status(400).json({ code: 400, msg: '缺少必要参数：product, language, scriptType', data: null });
    }
    const result = multilingualService.buildMultilingualPrompt({ product, language, scriptType, platform, tone });
    res.json({ code: 200, msg: 'success', data: result });
  } catch (err) { res.status(500).json({ code: 500, msg: err.message, data: null }); }
}

export default { getLanguages, getScriptTypes, buildPrompt };
