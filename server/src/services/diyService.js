import { BusinessError } from '../utils/businessError.js';
import { DIY_PAGE_STATUS, DIY_PAGE_STATUS_LABEL } from '../constants/domainStatus.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';
/**
 * DIY 页面服务（增强版）
 * 完整状态机 / 双端配置 / 自动+手动版本 / Redis缓存 / 克隆 / 批量操作 / 发布校验
 * v7: 事务保护 + N+1批量查询优化
 */
import * as diyDao from '../dao/diyDao.js';

// 发布前校验规则
function validateBeforePublish(page) {
  const issues = [];
  const mobileCfg = page.mobile_config || {};
  const pcCfg = page.pc_config || {};
  const allSections = [...(mobileCfg.sections || []), ...(pcCfg.sections || [])];

  if (!page.title || !page.title.trim()) issues.push('页面标题不能为空');
  if (!allSections.length) issues.push('页面至少需要添加一个组件区块');

  for (const s of allSections) {
    const type = s.type || s.component;
    const cfg = s.config || s.props || {};
    if (cfg.images && Array.isArray(cfg.images) && cfg.images.some((img) => !img)) issues.push(`"${type}"组件存在空图片链接`);
    if (cfg.bgImage && !cfg.bgImage.trim()) issues.push(`"${type}"组件背景图为空`);
    if (type === 'ctaButton' && (!cfg.text || !cfg.text.trim())) issues.push('CTA按钮文案不能为空');
    if (type === 'form_container' && (!cfg.submitText || !cfg.submitText.trim())) issues.push('表单提交按钮文案不能为空');
    if (type === 'form_container' && (!cfg.fields || cfg.fields.length === 0)) issues.push('表单组件至少需要一个字段');
    if (type === 'countdown' && !cfg.endTime) issues.push('倒计时组件需设置结束时间');
  }
  return issues;
}

const STATE_MACHINE = {
  0: { allow: [1, 3], msg: { 1: '发布成功', 3: '已移入回收站' } },
  1: { allow: [2], msg: { 2: '已下线' } },
  2: { allow: [0, 1, 3], msg: { 0: '已退回草稿', 1: '重新发布成功', 3: '已移入回收站' } },
  3: { allow: [0], msg: { 0: '已恢复至草稿' } },
};

function checkStateTransition(currentStatus, targetStatus) {
  const rule = STATE_MACHINE[currentStatus];
  if (!rule || !rule.allow.includes(targetStatus)) {
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Page status is "${DIY_PAGE_STATUS_LABEL[currentStatus] || currentStatus}", operation not allowed`);
  }
  return rule.msg[targetStatus];
}

export function compareConfigs(a, b) {
  if (!a && !b) return [];
  if (!a) return [{ path: 'root', type: 'added', b: JSON.stringify(b) }];
  if (!b) return [{ path: 'root', type: 'removed', a: JSON.stringify(a) }];
  const diffs = [];
  const aSections = a?.sections || [];
  const bSections = b?.sections || [];
  const max = Math.max(aSections.length, bSections.length);
  for (let i = 0; i < max; i++) {
    if (!aSections[i]) { diffs.push({ path: `sections[${i}]`, type: 'added', b: bSections[i]?.type }); }
    else if (!bSections[i]) { diffs.push({ path: `sections[${i}]`, type: 'removed', a: aSections[i]?.type }); }
    else if (JSON.stringify(aSections[i]) !== JSON.stringify(bSections[i])) {
      diffs.push({ path: `sections[${i}]`, type: 'modified', aType: aSections[i]?.type, bType: bSections[i]?.type });
    }
  }
  return diffs;
}

export default {
  // ========== 基础 CRUD ==========

  async listPages(tenantId, query) { return diyDao.listPages(tenantId, query); },
  async getPageById(id, tenantId) { return diyDao.getPageById(id, tenantId); },
  async getPublishedPage(slug, tenantId) {
    const page = await diyDao.getPublishedPage(slug, tenantId);
    if (page) await diyDao.updateAccessCount(slug, tenantId).catch((e) => { logger.warn('更新访问计数失败:', e.message); });
    return page;
  },

  async createPage(tenantId, ownerId, { title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson }) {
    const sanitizedTitle = title?.replace(/<[^>]*>/g, '') || '';
    if (!sanitizedTitle.trim() || !slug?.trim()) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    const exists = await diyDao.getPageBySlug(slug, tenantId);
    if (exists) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Page slug "${slug}" already in use`);
    return diyDao.createPageWithVersion({ tenantId, ownerId: ownerId || 0, title: sanitizedTitle, slug, pageType: pageType || 'mobile', accessType: accessType || 'public', mobileConfig: mobileConfig || { sections: [] }, pcConfig: pcConfig || { sections: [] }, metaJson });
  },

  async updatePage(id, tenantId, fields) {
    const exist = await diyDao.getPageById(id, tenantId);
    if (!exist) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    if (fields.title !== undefined) fields.title = fields.title.replace(/<[^>]*>/g, '');
    const slugChanged = fields.slug && fields.slug !== exist.slug;
    if (slugChanged) {
      const collision = await diyDao.getPageBySlug(fields.slug, tenantId);
      if (collision) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Page slug "${fields.slug}" already in use`);
    }
    await diyDao.updatePage(id, tenantId, fields);
    if (slugChanged && exist.status === 1) await diyDao.clearPageCache(exist.slug, tenantId);
    return diyDao.getPageById(id, tenantId);
  },

  // ========== 状态机操作 ==========

  async publishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    const msg = checkStateTransition(page.status, 1);
    const issues = validateBeforePublish(page);
    if (issues.length) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Publish validation failed: ${issues.join("; ")}`);
    await diyDao.publishWithVersion(id, tenantId, page.mobile_config, page.pc_config, page.slug);
    page.status = 1;
    page.publish_time = new Date().toISOString();
    await diyDao.cachePublishedPage(page.slug, {
      id: page.id, title: page.title, slug: page.slug, page_type: page.page_type,
      mobileConfig: page.mobile_config, pcConfig: page.pc_config, meta: page.meta_json,
      publishTime: page.publish_time, ownerId: page.owner_id,
    }, tenantId);
    return { page, msg };
  },

  async unpublishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    const msg = checkStateTransition(page.status, 2);
    await diyDao.unpublishPage(id, tenantId);
    await diyDao.clearPageCache(page.slug, tenantId);
    return { msg };
  },

  async republishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    const msg = checkStateTransition(page.status, 1);
    const issues = validateBeforePublish(page);
    if (issues.length) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `Publish validation failed: ${issues.join("; ")}`);
    await diyDao.republishPage(id, tenantId);
    page.status = 1;
    page.publish_time = new Date().toISOString();
    await diyDao.cachePublishedPage(page.slug, {
      id: page.id, title: page.title, slug: page.slug, page_type: page.page_type,
      mobileConfig: page.mobile_config, pcConfig: page.pc_config, meta: page.meta_json,
      publishTime: page.publish_time, ownerId: page.owner_id,
    }, tenantId);
    return { page, msg };
  },

  async softDeletePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    checkStateTransition(page.status, 3);
    if (page.status === DIY_PAGE_STATUS.PUBLISHED) await diyDao.clearPageCache(page.slug);
    await diyDao.softDeletePage(id, tenantId);
    return { code: ERROR_CODE.DIYPAGE_TRASHED, msg: 'Page moved to trash' };
  },

  async restorePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    if (page.status !== DIY_PAGE_STATUS.TRASH) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    await diyDao.restorePage(id, tenantId);
    return { code: ERROR_CODE.DIYPAGE_RESTORED, msg: 'Page restored to draft' };
  },

  async hardDeletePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    if (page.status !== DIY_PAGE_STATUS.TRASH) throw new BusinessError(ERROR_CODE.BAD_REQUEST);
    if (page.status === 1) await diyDao.clearPageCache(page.slug);
    await diyDao.hardDeletePage(id, tenantId); // 内部已用 withTransaction 保护
    return { code: ERROR_CODE.DIYPAGE_DELETED, msg: 'Page permanently deleted' };
  },

  // ========== 克隆 ==========

  async clonePage(id, tenantId) {
    const src = await diyDao.getPageById(id, tenantId);
    if (!src) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return diyDao.cloneWithVersion(src, tenantId);
  },

  // ========== 版本管理 ==========

  async saveVersion(pageId, tenantId, mobileConfig, pcConfig, remark, { autoSave = false } = {}) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    const v = await diyDao.saveVersion(pageId, mobileConfig, pcConfig, { remark: remark || (autoSave ? '自动保存' : '手动保存'), autoSave });
    return { version: v };
  },

  async listVersions(pageId, tenantId, { includeAuto = false } = {}) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return diyDao.listVersions(pageId, { includeAuto });
  },

  async getVersion(pageId, version, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return diyDao.getVersion(pageId, version);
  },

  async rollbackVersion(pageId, version, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    const src = await diyDao.getVersion(pageId, version);
    if (!src) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    const result = await diyDao.rollbackWithVersion(pageId, tenantId, src);
    if (page.status === 1) await diyDao.clearPageCache(page.slug, tenantId).catch((e) => { logger.warn('回滚缓存清理失败:', e.message); });
    return result;
  },

  async getLatestAutoVersion(pageId, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND);
    return diyDao.getLatestAutoVersion(pageId);
  },

  // ========== 批量操作 ==========

  async batchPublish(ids, tenantId) {
    const pages = await diyDao.getPagesByIds(ids, tenantId);
    const errors = [];
    const validIds = [];
    for (const p of pages) {
      if (!p) { errors.push({ id: null, success: false, error: '页面不存在' }); continue; }
      if (p.status !== 0 && p.status !== 2) { errors.push({ id: p.id, success: false, error: `页面状态不允许发布（当前状态: ${DIY_PAGE_STATUS_LABEL[p.status] || p.status}）` }); continue; }
      const issues = validateBeforePublish(p);
      if (issues.length) { errors.push({ id: p.id, success: false, error: issues.join('; ') }); continue; }
      validIds.push(p.id);
    }
    if (!validIds.length) return errors;
    const results = await diyDao.batchPublishWithVersions(validIds, tenantId);
    // 预热已发布页面的缓存
    for (const p of pages) {
      if (validIds.includes(p.id)) {
        await diyDao.cachePublishedPage(p.slug, {
          id: p.id, title: p.title, slug: p.slug, page_type: p.page_type,
          mobileConfig: p.mobile_config, pcConfig: p.pc_config, meta: p.meta_json,
          publishTime: new Date().toISOString(), ownerId: p.owner_id,
        }, tenantId).catch((e) => { logger.warn('批量发布缓存写入失败:', e.message); });
      }
    }
    return [...results, ...errors];
  },

  async batchUnpublish(ids, tenantId) {
    const pages = await diyDao.getPagesByIds(ids, tenantId);
    const pageMap = new Map(pages.filter(Boolean).map(p => [p.id, p]));
    const errors = [];
    const validIds = [];
    for (const id of ids) {
      const numId = Number(id);
      if (!pageMap.has(numId)) { errors.push({ id: numId, success: false, error: '页面不存在或不属于当前租户' }); continue; }
      const p = pageMap.get(numId);
      if (p.status !== DIY_PAGE_STATUS.PUBLISHED) { errors.push({ id: numId, success: false, error: `页面状态不允许下线（当前状态: ${DIY_PAGE_STATUS_LABEL[p.status] || p.status}）` }); continue; }
      validIds.push(numId);
    }
    if (!validIds.length) return errors;
    for (const id of validIds) {
      const p = pageMap.get(id);
      await diyDao.clearPageCache(p.slug, tenantId).catch((e) => { logger.warn('清除页面缓存失败:', e.message); });
    }
    await diyDao.batchUpdateStatus(validIds, tenantId, DIY_PAGE_STATUS.OFFLINE);
    const successResults = validIds.map(id => ({ id, success: true, msg: '下线成功' }));
    return [...successResults, ...errors];
  },

  async batchDelete(ids, tenantId) {
    const pages = await diyDao.getPagesByIds(ids, tenantId);
    const pageMap = new Map(pages.filter(Boolean).map(p => [p.id, p]));
    const errors = [];
    const validIds = [];
    for (const id of ids) {
      const numId = Number(id);
      if (!pageMap.has(numId)) { errors.push({ id: numId, success: false, error: '页面不存在或不属于当前租户' }); continue; }
      const p = pageMap.get(numId);
      try { checkStateTransition(p.status, 3); } catch (e) { errors.push({ id: numId, success: false, error: e.message }); continue; }
      if (p.status === DIY_PAGE_STATUS.PUBLISHED) {
        await diyDao.clearPageCache(p.slug, tenantId).catch((e) => { logger.warn('清除页面缓存失败:', e.message); });
      }
      validIds.push(numId);
    }
    if (!validIds.length) return errors;
    await diyDao.batchUpdateStatus(validIds, tenantId, 3);
    const successResults = validIds.map(id => ({ id, success: true, msg: '已移入回收站' }));
    return [...successResults, ...errors];
  },

  // ========== 组件库 ==========

  async listComponents(tenantId, category) { return diyDao.listComponents(tenantId, category); },
  async createComponent(tenantId, data) { return diyDao.createComponent({ ...data, tenantId }); },

  // ========== 模板库 ==========

  async listTemplates(params) { return diyDao.listTemplates(params); },
  async getTemplateById(id) { return diyDao.getTemplateById(id); },
  async incrementTemplateUse(id) { return diyDao.incrementTemplateUse(id); },
  async listTemplateIndustries() { return diyDao.listTemplateIndustries(); },

  async useTemplate(id, tenantId, ownerId) {
    const tpl = await diyDao.getTemplateById(id);
    if (!tpl) throw new BusinessError(ERROR_CODE.NOT_FOUND, '模板不存在');
    if (!tpl.mobile_config && !tpl.pc_config) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '模板配置数据为空');
    const baseSlug = tpl.title ? tpl.title.replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) : 'template-page';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const page = await diyDao.createPageWithVersion({
      tenantId, ownerId: ownerId || 0,
      title: tpl.title + '（从模板创建）',
      slug,
      pageType: tpl.page_type || 'mobile',
      accessType: 'private',
      mobileConfig: tpl.mobile_config || { sections: [] },
      pcConfig: tpl.pc_config || { sections: [] },
      metaJson: { templateId: id, templateTitle: tpl.title },
    });
    await diyDao.incrementTemplateUse(id).catch((e) => { logger.warn('模板使用计数更新失败:', e.message); });
    return page;
  },
};
