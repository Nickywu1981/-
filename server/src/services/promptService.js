import { BusinessError } from '../utils/businessError.js';
import { PROMPT_STATUS } from '../constants/domainStatus.js';
import * as promptDao from '../dao/promptDao.js';
import logger from '../utils/logger.js';

// ==================== 变量解析引擎 ====================

/** 提取模板中的 {{变量名}} */
export function extractVariables(content) {
  const re = /\{\{(\w+)\}\}/g;
  const names = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

/** 用变量值填充模板 */
export function fillTemplate(content, values = {}) {
  return content.replace(/\{\{(\w+)\}\}/g, (_, name) => (values[name] !== undefined ? values[name] : `{{${name}}}`));
}

/** 从模板元数据生成变量定义（如未预设 variables JSON） */
export function buildVariableDefs(content, existingVars = []) {
  const names = extractVariables(content);
  const existingNames = new Set(existingVars.map(v => v.name));
  const merged = [...existingVars];
  for (const name of names) {
    if (!existingNames.has(name)) {
      merged.push({ name, label: name, type: 'text', required: true, placeholder: `请输入${name}` });
    }
  }
  return merged;
}

// ==================== 模板业务 ====================

export async function listAvailable(userId, { category, keyword, page, pageSize }) {
  const r = await promptDao.listTemplates({ category, status: 2, keyword, isPublic: 1, page, pageSize });
  const favs = await promptDao.listFavorites(userId, {});
  const favSet = new Set(favs.list.map(f => f.id));
  return {
    ...r,
    list: r.list.map(t => ({ ...t, is_favorited: favSet.has(t.id) })),
  };
}

export async function listMyTemplates(userId, { category, keyword, page, pageSize }) {
  return promptDao.listTemplates({ creatorId: userId, category, keyword, page, pageSize });
}

export async function createTemplate(userId, data) {
  const code = `TPL_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  return promptDao.insertTemplate({
    templateCode: code,
    category: data.category,
    title: data.title,
    description: data.description,
    content: data.content,
    variables: data.variables || buildVariableDefs(data.content),
    modelType: data.modelType || 'text',
    icon: data.icon,
    sortOrder: data.sortOrder,
    isPublic: false, // 用户创建默认私有
    status: 0,       // 草稿
    creatorId: userId,
  });
}

export async function submitForReview(userId, id) {
  const t = await promptDao.getTemplateById(id);
  if (!t || t.creator_id !== userId) throw new BusinessError(404, '模板不存在');
  await promptDao.updateStatus(id, 1, null, '');  // 0→1 待审核
}

// ==================== 3层模板库 — 用户私有模板管理 ====================

/** 从 template_code 中提取基础 intentId（去除 TPL_ 前缀和 _u_xxx 后缀） */
function deriveIntentId(templateCode) {
  let base = templateCode;
  const userIdx = base.indexOf('_u_');
  if (userIdx !== -1) base = base.substring(0, userIdx);
  return base;
}

/** 一键复制官方模板为用户私有副本 */
export async function copyOfficialTemplate(userId, templateId) {
  const source = await promptDao.getTemplateById(templateId);
  if (!source) throw new BusinessError(404, '模板不存在');
  if (!source.is_public || source.status !== 2) {
    throw new BusinessError(400, '只能复制已上架的官方模板');
  }

  const intentId = deriveIntentId(source.template_code);
  const userCode = `${intentId}_u_${userId}`;

  const existing = await promptDao.getTemplateByCode(userCode);
  if (existing) {
    // 已有副本 → 更新为最新官方内容
    await promptDao.updateTemplate(existing.id, {
      title: source.title + ' (我的副本)',
      content: source.content,
      description: source.description,
      tags: source.tags,
      variables: source.variables,
      category: source.category,
    });
    const { invalidateTemplateCache } = await import('./templateEngine.js');
    invalidateTemplateCache(userCode);
    return { id: existing.id, templateCode: userCode, updated: true };
  }

  const id = await promptDao.insertTemplate({
    templateCode: userCode,
    category: source.category || 'text',
    title: source.title + ' (我的副本)',
    description: source.description || '',
    content: source.content,
    variables: source.variables || [],
    modelType: source.model_type || 'text',
    icon: source.icon || 'star',
    sortOrder: 0,
    isPublic: false,
    status: 0,  // 草稿
    creatorId: userId,
  });
  return { id, templateCode: userCode, created: true };
}

/** 编辑自己的私有模板 */
export async function updateMyTemplate(userId, templateId, data) {
  const t = await promptDao.getTemplateById(templateId);
  if (!t || t.creator_id !== userId || t.is_public) {
    throw new BusinessError(403, '只能编辑自己的私有模板');
  }
  const allowed = { title: data.title, content: data.content, description: data.description, tags: data.tags, variables: data.variables, category: data.category };
  const clean = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined));
  await promptDao.updateTemplate(templateId, clean);
  const { invalidateTemplateCache } = await import('./templateEngine.js');
  invalidateTemplateCache(t.template_code);
  return { id: templateId, updated: true };
}

/** 提交私有模板申请收录为官方模板 */
export async function submitToOfficial(userId, templateId) {
  const t = await promptDao.getTemplateById(templateId);
  if (!t || t.creator_id !== userId) throw new BusinessError(404, '模板不存在');
  await promptDao.updateStatus(templateId, 1, null, '');  // → 待审核
  logger.info('[Prompt] User submitted template for review', { id: templateId, userId, templateCode: t.template_code });
  return { submitted: true };
}

/** 批量标记模板（默认/热门/精选） */
export async function adminBatchMarkTemplates(ids, marking, action) {
  if (!['default', 'hot', 'featured'].includes(marking)) throw new BusinessError(400, '标记类型无效');

  for (const id of ids) {
    const t = await promptDao.getTemplateById(id);
    if (!t) continue;
    const tags = (t.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    const updated = action === 'add'
      ? [...new Set([...tags, marking])]
      : tags.filter(tag => tag !== marking);
    await promptDao.updateTemplate(id, { tags: updated.join(',') });
  }
  return { affected: ids.length };
}

/** 审核队列：列出 status=1 的待审模板 */
export async function adminReviewQueue({ page, pageSize, keyword } = {}) {
  return promptDao.listTemplates({ status: 1, keyword, page, pageSize });
}

// ==================== 模板使用 ====================

export async function useTemplate(userId, id) {
  await promptDao.incrUsageCount(id);
  return promptDao.getTemplateById(id);
}

export async function fillAndPreview(userId, templateId, values = {}) {
  const t = await useTemplate(userId, templateId);
  if (!t) throw new BusinessError(404, '模板不存在');
  let variables = t.variables;
  if (typeof variables === 'string') {
    try { variables = JSON.parse(variables); }
    catch { variables = []; }
  }
  variables = buildVariableDefs(t.content, variables);
  const filled = fillTemplate(t.content, values);
  return { ...t, variables, filled_content: filled };
}

// ==================== 收藏 ====================
export async function listFavorites(userId, { groupId, page, pageSize }) {
  return promptDao.listFavorites(userId, { groupId, page, pageSize });
}

export async function toggleFavorite(userId, templateId, groupId) {
  const favs = await promptDao.listFavorites(userId, {});
  const existing = favs.list.find(f => f.id === templateId);
  if (existing) {
    await promptDao.removeFavorite(userId, templateId);
    return { favorited: false };
  }
  await promptDao.addFavorite(userId, templateId, groupId);
  return { favorited: true };
}

// ==================== 分组 ====================
export async function listGroups(userId) {
  return promptDao.listGroups(userId);
}

export async function createGroup(userId, name) {
  return promptDao.insertGroup(userId, name);
}

export async function renameGroup(userId, groupId, name) {
  await promptDao.updateGroup(groupId, userId, { name });
}

export async function removeGroup(userId, groupId) {
  await promptDao.deleteGroup(groupId, userId);
}

// ==================== 管理后台 ====================

export async function adminListTemplates({ category, status, keyword, page, pageSize }) {
  return promptDao.listTemplates({ category, status, keyword, page, pageSize });
}

export async function adminSaveTemplate(body) {
  let templateCode;
  if (body.id) {
    await promptDao.updateTemplate(body.id, body);
    const t = await promptDao.getTemplateById(body.id);
    templateCode = t?.template_code;
  } else {
    templateCode = body.templateCode || `TPL_ADMIN_${Date.now()}`;
    await promptDao.insertTemplate({
      templateCode,
      category: body.category,
      title: body.title,
      description: body.description || '',
      content: body.content,
      variables: body.variables || [],
      modelType: body.modelType || 'text',
      icon: body.icon || 'star',
      sortOrder: body.sortOrder || 0,
      isPublic: body.isPublic ?? 1,
      status: body.status ?? 2,
      creatorId: null,
    });
  }
  // 刷新模板引擎缓存，使编辑立即对工作流生效
  if (templateCode) {
    const { invalidateTemplateCache } = await import('./templateEngine.js');
    invalidateTemplateCache(templateCode);
  }
  return { id: body.id };
}

export async function adminReviewTemplate(id, { status, reviewRemark }, reviewerId) {
  await promptDao.updateStatus(id, status, reviewerId, reviewRemark || '');

  if (status === PROMPT_STATUS.PUBLISHED) {
    const t = await promptDao.getTemplateById(id);
    // 用户提交的模板审核通过 → 收录为官方模板
    if (t && t.template_code && t.template_code.includes('_u_')) {
      const intentId = deriveIntentId(t.template_code);
      const existingOfficial = await promptDao.getTemplateByCode(intentId);
      if (existingOfficial) {
        // 覆盖已有官方模板
        await promptDao.updateTemplate(existingOfficial.id, {
          title: t.title,
          content: t.content,
          description: t.description || '',
          tags: t.tags || '',
          variables: t.variables,
        });
        invalidateTemplateCache(intentId);
      } else {
        // 新建官方模板入口
        await promptDao.updateTemplateCode(id, intentId);
        await promptDao.updateTemplate(id, { is_public: 1, creator_id: null });
        invalidateTemplateCache(intentId);
      }
      invalidateTemplateCache(t.template_code); // 清除旧的用户 code 缓存
      logger.info('[Prompt] User template promoted to official', { id, intentId, oldCode: t.template_code });
    }
    return '已上架';
  }
  return status === PROMPT_STATUS.REJECTED ? '已驳回' : '已更新';
}

export async function adminDeleteTemplate(id) {
  await promptDao.deleteTemplate(id);
}

// ==================== 使用历史 ====================

export async function recordUsage(userId, templateId, filledContent, modelType) {
  await promptDao.incrUsageCount(templateId);
  await promptDao.insertUsageHistory(userId, templateId, filledContent, modelType);
}

export async function listUsageHistory(userId, { page, pageSize }) {
  return promptDao.listUsageHistory(userId, { page, pageSize });
}

// ==================== 智能推荐引擎 ====================

/** 混合推荐：协同过滤 + 内容推荐 + 热门兜底 */
export async function getRecommendations(userId, { limit = 12 }) {
  const history = await promptDao.listUsageHistory(userId, { page: 1, pageSize: 50 });
  const usedIds = history.list.map(h => h.template_id);

  // 1. 协同过滤推荐
  if (history.list.length > 0) {
    const collab = await promptDao.recommendCollaborative(userId, { limit: Math.ceil(limit / 2) });
    if (collab.length >= 3) {
      const remaining = limit - collab.length;
      if (remaining <= 0) return collab.slice(0, limit);
      // 补充热门
      const excludeIds = [...usedIds, ...collab.map(c => c.id)];
      const hot = await promptDao.getHotTemplates({ excludeIds, limit: remaining });
      return [...collab, ...hot];
    }
  }

  // 2. 按用户偏好分类推荐
  const prefs = await promptDao.getCategoryPreference(userId);
  if (prefs.length > 0) {
    const cats = prefs.map(p => p.category);
    const byCat = await promptDao.recommendByCategory(cats, { excludeIds: usedIds, limit });
    if (byCat.length >= 3) return byCat;
  }

  // 3. 热门兜底
  return promptDao.getHotTemplates({ excludeIds: usedIds, limit });
}

// ==================== 评分 ====================

export async function rateTemplate(userId, templateId, score) {
  if (score < 1 || score > 5) throw new BusinessError(400, '评分需在1-5之间');
  await promptDao.upsertRating(userId, templateId, score);
  const rating = await promptDao.getAverageRating(templateId);
  return { score, avgScore: Math.round(rating.avg_score * 10) / 10, ratingCount: rating.rating_count };
}

export async function getRating(userId, templateId) {
  const avg = await promptDao.getAverageRating(templateId);
  const my = await promptDao.getUserRating(userId, templateId);
  return { avgScore: Math.round(avg.avg_score * 10) / 10, ratingCount: avg.rating_count, myScore: my };
}
