import { BusinessError } from '../utils/businessError.js';
import { DIY_PAGE_STATUS, DIY_PAGE_STATUS_LABEL } from '../constants/domainStatus.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';
/**
 * DIY 页面服务（增强版）
 * 完整状态机 / 双端配置 / 自动+手动版本 / Redis缓存 / 克隆 / 批量操作 / 发布校验
 * v7: 事务保护 + N+1批量查询优化
 */
import diyDao from '../dao/diyDao.js';

// 发布前校验规则
function validateBeforePublish(page) {
  const issues = [];
  const mobileConfig = page.mobile_config || {};
  const pcConfig = page.pc_config || {};
  const sections = mobileConfig.sections || [];
  const pcSections = pcConfig.sections || [];

  if (!page.title || !page.title.trim()) issues.push('页面标题不能为空');
  if (sections.length === 0 && pcSections.length === 0) issues.push('页面至少需要添加一个组件区块');
  for (const s of sections) {
    if (s.props?.images && s.props.images.some(img => !img)) issues.push(`"${s.type}"组件存在空图片链接`);
    if (s.props?.bgImage && !s.props.bgImage.trim()) issues.push(`"${s.type}"组件背景图为空`);
  }
  for (const s of sections) {
    if (s.type === 'ctaButton' && (!s.props?.text || !s.props.text.trim())) issues.push('CTA按钮文案不能为空');
    if (s.type === 'form' && (!s.props?.submitText || !s.props.submitText.trim())) issues.push('表单提交按钮文案不能为空');
  }
  for (const s of sections) {
    if (s.type === 'form' && (!s.props?.fields || s.props.fields.length === 0)) issues.push('表单组件至少需要一个字段');
  }
  for (const s of sections) {
    if (s.type === 'countdownTimer' && !s.props?.endTime) issues.push('倒计时组件需设置结束时间');
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
    throw new BusinessError(ERROR_CODE.BAD_REQUEST, `页面状态为「${DIY_PAGE_STATUS_LABEL[currentStatus] || currentStatus}」，不允许此操作`);
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
  async getPublishedPage(slug) {
    const page = await diyDao.getPublishedPage(slug);
    if (page) await diyDao.updateAccessCount(slug).catch((e) => { logger.warn('更新访问计数失败:', e.message); });
    return page;
  },

  async createPage(tenantId, ownerId, { title, slug, pageType, accessType, mobileConfig, pcConfig, metaJson }) {
    if (!title?.trim() || !slug?.trim()) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '标题和标识不能为空');
    return diyDao.createPageWithVersion({ tenantId, ownerId: ownerId || 0, title, slug, pageType: pageType || 'mobile', accessType: accessType || 'public', mobileConfig: mobileConfig || { sections: [] }, pcConfig: pcConfig || { sections: [] }, metaJson });
  },

  async updatePage(id, tenantId, fields) {
    const exist = await diyDao.getPageById(id, tenantId);
    if (!exist) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    await diyDao.updatePage(id, tenantId, fields);
    return diyDao.getPageById(id, tenantId);
  },

  // ========== 状态机操作 ==========

  async publishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    const msg = checkStateTransition(page.status, 1);
    const issues = validateBeforePublish(page);
    if (issues.length) throw new BusinessError(ERROR_CODE.BAD_REQUEST, `发布校验未通过: ${issues.join('; ')}`);
    await diyDao.publishWithVersion(id, tenantId, page.mobile_config, page.pc_config, page.slug);
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
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    const msg = checkStateTransition(page.status, 2);
    await diyDao.unpublishPage(id, tenantId);
    await diyDao.clearPageCache(page.slug);
    return { msg };
  },

  async republishPage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
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
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    checkStateTransition(page.status, 3);
    if (page.status === DIY_PAGE_STATUS.PUBLISHED) await diyDao.clearPageCache(page.slug);
    await diyDao.softDeletePage(id, tenantId);
    return { msg: '已移入回收站' };
  },

  async restorePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    if (page.status !== DIY_PAGE_STATUS.TRASH) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '仅回收站中的页面可恢复');
    await diyDao.restorePage(id, tenantId);
    return { msg: '已恢复至草稿状态' };
  },

  async hardDeletePage(id, tenantId) {
    const page = await diyDao.getPageById(id, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    if (page.status !== DIY_PAGE_STATUS.TRASH) throw new BusinessError(ERROR_CODE.BAD_REQUEST, '仅回收站中的页面可彻底删除');
    if (page.status === 1) await diyDao.clearPageCache(page.slug);
    await diyDao.hardDeletePage(id, tenantId); // 内部已用 withTransaction 保护
    return { msg: '页面已彻底删除，不可恢复' };
  },

  // ========== 克隆 ==========

  async clonePage(id, tenantId) {
    const src = await diyDao.getPageById(id, tenantId);
    if (!src) throw new BusinessError(ERROR_CODE.NOT_FOUND, '源页面不存在');
    return diyDao.cloneWithVersion(src, tenantId);
  },

  // ========== 版本管理 ==========

  async saveVersion(pageId, tenantId, mobileConfig, pcConfig, remark, { autoSave = false } = {}) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    const v = await diyDao.saveVersion(pageId, mobileConfig, pcConfig, { remark: remark || (autoSave ? '自动保存' : '手动保存'), autoSave });
    return { version: v };
  },

  async listVersions(pageId, tenantId, { includeAuto = false } = {}) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    return diyDao.listVersions(pageId, { includeAuto });
  },

  async getVersion(pageId, version, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    return diyDao.getVersion(pageId, version);
  },

  async rollbackVersion(pageId, version, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    const src = await diyDao.getVersion(pageId, version);
    if (!src) throw new BusinessError(ERROR_CODE.NOT_FOUND, '版本不存在');
    return diyDao.rollbackWithVersion(pageId, tenantId, src);
  },

  async getLatestAutoVersion(pageId, tenantId) {
    const page = await diyDao.getPageById(pageId, tenantId);
    if (!page) throw new BusinessError(ERROR_CODE.NOT_FOUND, '页面不存在');
    return diyDao.getLatestAutoVersion(pageId);
  },

  // ========== 批量操作 ==========

  async batchPublish(ids, tenantId) {
    return diyDao.batchPublishWithVersions(ids, tenantId);
  },

  async batchUnpublish(ids, tenantId) {
    await diyDao.batchUpdateStatus(ids.filter(Number), tenantId, 2);
    return { count: ids.length };
  },

  async batchDelete(ids, tenantId) {
    // 批量查询替代 N+1 逐条查询
    const pages = await diyDao.getPagesByIds(ids, tenantId);
    for (const p of pages) {
      if (p && p.status === DIY_PAGE_STATUS.PUBLISHED) {
        await diyDao.clearPageCache(p.slug).catch((e) => { logger.warn('清除页面缓存失败:', e.message); });
      }
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
