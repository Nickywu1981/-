import svc from '../services/platformSpecService.js';

export async function listPlatforms(req, res) {
  const data = await svc.listAll(req);
  res.json({ code: 200, msg: 'success', data });
}

export async function getSpec(req, res) {
  const data = await svc.getById(req.params.id, req);
  if (!data) return res.status(404).json({ code: 404, msg: '规格不存在', data: null });
  res.json({ code: 200, msg: 'success', data });
}

export async function getSpecsByPlatform(req, res) {
  const data = await svc.getByPlatformCode(req.params.code, req);
  res.json({ code: 200, msg: 'success', data });
}

export async function createSpec(req, res) {
  const id = await svc.create(req.body, req);
  res.status(201).json({ code: 201, msg: '创建成功', data: { id } });
}

export async function updateSpec(req, res) {
  const ok = await svc.update(req.params.id, req.body, req);
  if (!ok) return res.status(404).json({ code: 404, msg: '规格不存在', data: null });
  res.json({ code: 200, msg: '更新成功', data: null });
}

export async function deleteSpec(req, res) {
  const ok = await svc.remove(req.params.id, req);
  if (!ok) return res.status(404).json({ code: 404, msg: '规格不存在', data: null });
  res.json({ code: 200, msg: '删除成功', data: null });
}

export async function adaptImage(req, res) {
  try {
    const { inputPath, platformCode, outputDir } = req.body;
    const result = await svc.adaptImage(inputPath, platformCode, outputDir || './uploads/adapted');
    res.json({ code: 200, msg: '图片适配成功', data: result });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ code: status, msg: e.message, data: null });
  }
}

export default { listPlatforms, getSpec, getSpecsByPlatform, createSpec, updateSpec, deleteSpec, adaptImage };
