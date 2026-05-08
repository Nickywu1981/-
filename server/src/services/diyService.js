/**
 * DIY 页面服务（增强版）
 * 完整状态机 / 双端配置 / 自动+手动版本 / Redis缓存 / 克隆 / 批量操作 / 发布校验
 */
import diyDao from '../dao/diyDao.js';

// 发布前校验规则
function validateBeforePublish(page) {
  const issues = [];
  const mobileConfig = page.mobile_config || {};
  const pcConfig = page.pc_config || {};
  const sections = mobileConfig.sections || [];
  const pcSections = pcConfig.sections || [];

  // 1. 标题非空
  if (!page.title || !page.title.trim()) issues.push('页面标题不能为空');
  // 2. 至少一端有内容
  if (sections.length === 0 && pcSections.length === 0) issues.push('页面至少需要添加一个组件区块');
  // 3. 检查图片链接有效性（非 empty string）
  for (const s of sections) {
    if (s.props?.images && s.props.images.some(img => !img)) issues.push(`"${s.type}"组件存在空图片链接`);
    if (s.props?.bgImage && !s.props.bgImage.trim()) issues.push(`"${s.type}"组件背景图为空`);
  }
  // 4. CTA按钮文案非空
  for (const s of sections) {
    if (s.type === 'ctaButton' && (!s.props?.text || !s.props.text.trim())) issues.push('CTA按钮文案不能为空');
    if (s.type === 'form' && (!s.props?.submitText || !s.props.submitText.trim())) issues.push('表单提交按钮文案不能为空');
  }
  // 5. 表单字段至少一个
  for (const s of sections) {
    if (s.type === 'form' && (!s.props?.fields || s.props.fields.length === 0)) issues.push('表单组件至少需要一个字段');
  }
  // 6. 倒计时组件需设置结束时间
  for (const s of sections) {
    if (s.type === 'countdownTimer' && !s.props?.endTime) issues.push('倒计时组件需设置结束时间');
  }
  return issues;
}

// 状态流转规则：哪些状态可以转到哪些状态
const STATE_MACHINE = {
  0: { // 草稿 → 发布、回收站
    allow: [1, 3],
    msg: { 1: '发布成功', 3: '已移入回收站' },
  },
  1: { // 已发布 → 下线
    allow: [2],
    msg: { 2: '已下线' },
  },
  2: { // 已下线 → 重新发布、草稿、回收站
    allow: [0, 1, 3],
    msg: { 0: '已退回草稿', 1: '重新发布成功', 3: '已移入回收站' },
  },
  3: { // 回收站 → 恢复（回到草稿状态）、彻底删除
    allow: [0],
    msg: { 0: '已恢复至草稿' },
  },
};

function checkStateTransition(currentStatus, targetStatus) {
  const rule = STATE_MACHINE[currentStatus];
  if (!rule || !rule.allow.includes(targetStatus)) {
    const statusNames = { 0: '草稿', 1: '已发布', 2: '已下线', 3: '回收站' };
    throw Object.assign(new Error(`页面状态为「${statusNames[currentStatus] || currentStatus}」，不允许此操作`), { statusCode: 400 });
  }
  return rule.msg[targetStatus];
}

export default {
  // ========== 基础 CRUD ==========

  async listPages(tenantId, query) { return diyDao.listPages(tenantId, query); },
  async getPageById(id, tenantId) { return diyDao.getPageById(id, tenantId); },
  async getPublishedPage(slug) {
    const page = await diyDao.getPublishedPage(slug);
    if (page) await diyDao.updateAccessCount(slug).catch(() => {});
    return page;
  },

  async createPage(tenantId, ownerId, { title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson }) {
    if (!title?.trim() || !slug?.trim()) throw Object.assign(new Error('标题和标识不能为空'), { statusCode: 400 });
    const id = await diyDao.createPage({ tenantId, ownerId, title, slug, pageType: pageType || 'mobile', accessType: accessType || 'public', mobileConfig, pcConfig, metaJson });
    await diyDao.saveVersion(id, mobileConfig || { sections: [] }, pcConfig || { sections: [] }, { remark: '初始版本', autoSave: false });
    return diyDao.getPageById(id, tenantId);
  },

  async updatePage(id, tenantId, fields) {
    const exist = await diyDao.getPageById(id, tenantId);
    if (!exist) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    await diyDao.updatePage(id, tenantId, fields);
    return diyDao.getPageById(id, tenantId);
  },

  // ========== 状态机操作 ==========

  async publishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    const msg = checkStateTransition(page.status, 1);
    // 发布前自动校验
    const issues = validateBeforePublish(page);
    if (issues.length) throw Object.assign(new Error(`发布校验未通过: ${issues.join('; ')}`), { statusCode: 400, issues });
    await diyDao.updatePage(id, tenantId, { status: 1, publish_time: new Date() });
    await diyDao.saveVersion(id, page.mobile_config, page.pc_config, { remark: '发布' });
    // 缓存已发布页面
    const published = await diyDao.getPageById(id, tenantId);
    await diyDao.cachePublishedPage(page.slug, {
      id: published.id, title: published.title, slug: published.slug, page_type: published.page_type,
      mobileConfig: published.mobile_config, pcConfig: published.pc_config, meta: published.meta_json,
      publishTime: published.publish_time, ownerId: published.owner_id,
    });
    return { page: published, msg };
  },

  async unpublishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    const msg = checkStateTransition(page.status, 2);
    await diyDao.unpublishPage(id, tenantId);
    await diyDao.clearPageCache(page.slug);
    return { msg };
  },

  async republishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    const msg = checkStateTransition(page.status, 1);
    await diyDao.republishPage(id, tenantId);
    const published = await diyDao.getPageById(id, tenantId);
    await diyDao.cachePublishedPage(page.slug, {
      id: published.id, title: published.title, slug: published.slug, page_type: published.page_type,
      mobileConfig: published.mobile_config, pcConfig: published.pc_config, meta: published.meta_json,
      publishTime: published.publish_time, ownerId: published.owner_id,
    });
    return { page: published, msg };
  },

  async softDeletePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    checkStateTransition(page.status, 3);
    if (page.status === 1) await diyDao.clearPageCache(page.slug);
    await diyDao.softDeletePage(id, tenantId);
    return { msg: '已移入回收站' };
  },

  async restorePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    if (page.status !== 3) throw Object.assign(new Error('仅回收站中的页面可恢复'), { statusCode: 400 });
    await diyDao.restorePage(id, tenantId);
    return { msg: '已恢复至草稿状态' };
  },

  async hardDeletePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    if (page.status !== 3) throw Object.assign(new Error('仅回收站中的页面可彻底删除'), { statusCode: 400 });
    if (page.status === 1) await diyDao.clearPageCache(page.slug);
    await diyDao.hardDeletePage(id, tenantId);
    return { msg: '页面已彻底删除，不可恢复' };
  },

  // ========== 克隆 ==========

  async clonePage(id, tenantId) {
    const src = await diyDao.getPageById(id, tenantId);
    if (!src) throw Object.assign(new Error('源页面不存在'), { statusCode: 404 });
    const slug = `${src.slug}-clone-${Date.now().toString(36)}`;
    const title = `${src.title}（克隆版）`;
    const newId = await diyDao.createPage({
      tenantId, ownerId: src.owner_id, title, slug,
      pageType: src.page_type, accessType: src.access_type,
      mobileConfig: src.mobile_config, pcConfig: src.pc_config, metaJson: src.meta_json,
    });
    await diyDao.saveVersion(newId, src.mobile_config, src.pc_config, { remark: `克隆自页面 #${id}` });
    return diyDao.getPageById(newId, tenantId);
  },

  // ========== 版本管理 ==========

  async saveVersion(pageId, tenantId, mobileConfig, pcConfig, remark, { autoSave = false } = {}) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    const v = await diyDao.saveVersion(pageId, mobileConfig, pcConfig, { remark: remark || (autoSave ? '自动保存' : '手动保存'), autoSave });
    return { version: v };
  },

  async listVersions(pageId, tenantId, { includeAuto = false } = {}) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    return diyDao.listVersions(pageId, { includeAuto });
  },

  async getVersion(pageId, version, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    return diyDao.getVersion(pageId, version);
  },

  async rollbackVersion(pageId, version, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    const src = await diyDao.getVersion(pageId, version);
    if (!src) throw Object.assign(new Error('版本不存在'), { statusCode: 404 });
    // 写入当前配置，保存回滚源
    const v = await diyDao.saveVersion(pageId, src.mobile_config, src.pc_config, { remark: `回滚自版本 v${version}`, autoSave: false, rollbackFrom: version });
    await diyDao.updatePage(pageId, tenantId, { mobile_config: src.mobile_config, pc_config: src.pc_config });
    return { version: v, msg: `已回滚至版本 v${version}` };
  },

  async getLatestAutoVersion(pageId, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw Object.assign(new Error('页面不存在'), { statusCode: 404 });
    return diyDao.getLatestAutoVersion(pageId);
  },

  // ========== 批量操作 ==========

  async batchPublish(ids, tenantId) {
    const results = [];
    for (const id of ids) {
      try { results.push({ id, success: true, ...(await this.publishPage(id, tenantId)) }); }
      catch (e) { results.push({ id, success: false, error: e.message }); }
    }
    return results;
  },

  async batchUnpublish(ids, tenantId) {
    await diyDao.batchUpdateStatus(ids.filter(Number), tenantId, 2);
    return { count: ids.length };
  },

  async batchDelete(ids, tenantId) {
    const pages = await Promise.all(ids.map(id => diyDao.getPageById(id, tenantId).catch(() => null)));
    for (const p of pages) {
      if (p && p.status === 1) await diyDao.clearPageCache(p.slug).catch(() => {});
    }
    await diyDao.batchUpdateStatus(ids.filter(Number), tenantId, 3);
    return { count: ids.length };
  },

  // ========== 组件库 ==========

  async listComponents(tenantId, category) { return diyDao.listComponents(tenantId, category); },
  async createComponent(tenantId, data) { return diyDao.createComponent({ ...data, tenantId }); },

  // ========== 模板库 ==========

  async listTemplates(params) { return diyDao.listTemplates(params); },
  async getTemplateById(id) { return diyDao.getTemplateById(id); },
  async incrementTemplateUse(id) { return diyDao.incrementTemplateUse(id); },
  async listTemplateIndustries() { return diyDao.listTemplateIndustries(); },
};
