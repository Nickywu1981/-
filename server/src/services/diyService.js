import diyDao from '../dao/diyDao.js';

export default {
  async listPages(tenantId, query) { return diyDao.listPages(tenantId, query); },
  async getPageById(id, tenantId) { return diyDao.getPageById(id, tenantId); },
  async getPageBySlug(slug, tenantId) { return diyDao.getPageBySlug(slug, tenantId); },

  async createPage(tenantId, { title, slug, pageType, configJson, metaJson }) {
    const id = await diyDao.createPage({ tenantId, title, slug, pageType, configJson: JSON.stringify(configJson), metaJson });
    if (configJson) await diyDao.saveVersion(id, JSON.stringify(configJson), '初始版本');
    return diyDao.getPageById(id, tenantId);
  },

  async updatePage(id, tenantId, fields) {
    const exist = await diyDao.getPageById(id, tenantId);
    if (!exist) throw new Error('页面不存在');
    await diyDao.updatePage(id, tenantId, fields);
    return diyDao.getPageById(id, tenantId);
  },

  async publishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new Error('页面不存在');
    await diyDao.updatePage(id, tenantId, { status: 1 });
    await diyDao.saveVersion(id, page.config_json, '发布');
    return diyDao.getPageById(id, tenantId);
  },

  async deletePage(id, tenantId) { return diyDao.deletePage(id, tenantId); },

  async saveVersion(pageId, configJson, remark) {
    return diyDao.saveVersion(pageId, JSON.stringify(configJson), remark);
  },
  async listVersions(pageId, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new Error('页面不存在');
    return diyDao.listVersions(pageId);
  },
  async getVersion(pageId, version, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new Error('页面不存在');
    return diyDao.getVersion(pageId, version);
  },

  async listComponents(tenantId, category) { return diyDao.listComponents(tenantId, category); },
  async createComponent(tenantId, data) { return diyDao.createComponent({ ...data, tenantId }); },

  /** 公开获取已发布页面（不限租户） */
  async getPublishedPage(slug) { return diyDao.getPublishedPage(slug); },
};
