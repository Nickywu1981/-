import badgeService from '../services/badgeService.js';

export async function listBadges(req, res) {
  const { category } = req.query;
  const rows = await badgeService.listBadges({ category, status: 1 });
  res.json({ code: 200, msg: 'success', data: rows });
}

export async function getBadge(req, res) {
  const badge = await badgeService.getBadgeById(req.params.id);
  if (!badge) return res.status(404).json({ code: 404, msg: '标签不存在', data: null });
  res.json({ code: 200, msg: 'success', data: badge });
}

export async function listAllBadges(req, res) {
  const { category } = req.query;
  const rows = await badgeService.listBadges({ category, status: undefined });
  res.json({ code: 200, msg: 'success', data: rows });
}

export async function createBadge(req, res) {
  const id = await badgeService.createBadge(req.body);
  res.json({ code: 200, msg: '创建成功', data: { id } });
}

export async function updateBadge(req, res) {
  await badgeService.updateBadge(req.params.id, req.body);
  res.json({ code: 200, msg: '更新成功', data: null });
}

export async function deleteBadge(req, res) {
  await badgeService.deleteBadge(req.params.id);
  res.json({ code: 200, msg: '删除成功', data: null });
}

export default { listBadges, getBadge, listAllBadges, createBadge, updateBadge, deleteBadge };
