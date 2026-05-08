import dao from '../dao/platformSpecDao.js';

export async function listAll(req) {
  return dao.listAll(req);
}

export async function getById(id, req) {
  return dao.getById(id, req);
}

export async function getByPlatformCode(code, req) {
  return dao.listByPlatform(code, req);
}

export async function create(data, req) {
  return dao.create(data, req);
}

export async function update(id, data, req) {
  return dao.update(id, data, req);
}

export async function remove(id, req) {
  return dao.remove(id, req);
}

/**
 * 一键适配：返回某平台全部规格字典
 * 供 imageService 调用
 */
export async function getAdaptSpec(platformCode, req) {
  const rows = await dao.getAdaptSpec(platformCode, req);
  if (!rows || rows.length === 0) return null;
  const spec = {};
  for (const r of rows) {
    spec[r.spec_type] = {
      specType: r.spec_type,
      label: r.label,
      width: r.width,
      height: r.height,
      format: r.format,
      maxSizeKB: r.max_size_kb,
      bgMustWhite: Boolean(r.bg_must_white),
    };
  }
  return { platformCode, specs: spec };
}

export default { listAll, getById, getByPlatformCode, create, update, remove, getAdaptSpec };
