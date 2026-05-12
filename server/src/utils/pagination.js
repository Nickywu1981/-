/**
 * 通用分页工具 — 纯函数、零依赖、跨项目可复用
 * 仅依赖 Express 原生 req.query，不绑定任何框架
 */

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 200;
const DEFAULT_SORT_ORDER = 'DESC';

const ALLOWED_SORT_ORDER = ['ASC', 'DESC'];

/**
 * @param {object} query - Express req.query 或普通 { page?, pageSize?, sort?, order? } 对象
 * @param {object} [opts] - 可选覆盖默认值
 * @param {number} [opts.defaultPageSize=20]
 * @param {number} [opts.maxPageSize=200]
 * @param {string} [opts.defaultSort='id']
 * @param {string} [opts.defaultOrder='DESC']
 * @param {string[]} [opts.allowedSortFields] - 限定可排序字段白名单
 * @returns {{ page: number, pageSize: number, offset: number, sort: string, order: string }}
 */
export function parsePagination(query = {}, opts = {}) {
  const {
    defaultPageSize = DEFAULT_PAGE_SIZE,
    maxPageSize = MAX_PAGE_SIZE,
    defaultSort = 'id',
    defaultOrder = DEFAULT_SORT_ORDER,
    allowedSortFields = null,
  } = opts;

  const rawPage = parseInt(query.page, 10);
  const page = rawPage > 0 ? rawPage : DEFAULT_PAGE;

  const rawPageSize = parseInt(query.pageSize, 10);
  const pageSize =
    rawPageSize > 0 && rawPageSize <= maxPageSize ? rawPageSize : defaultPageSize;

  let sort = query.sort?.trim() || defaultSort;
  if (allowedSortFields && !allowedSortFields.includes(sort)) {
    sort = defaultSort;
  }

  const rawOrder = (query.order || '').toUpperCase();
  const order = ALLOWED_SORT_ORDER.includes(rawOrder) ? rawOrder : defaultOrder;

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
    sort,
    order,
  };
}

/**
 * 包装分页查询全流程：解析参数 → 查总数 → 查列表 → 统一响应
 * @param {{ query: object, opts?: object }} paginationParams
 * @param {() => Promise<number>} countFn - 查总数回调
 * @param {() => Promise<Array>} listFn - 查列表回调
 * @returns {Promise<{list: Array, total: number, page: number, pageSize: number}>}
 */
export async function paginatedQuery({ query, opts }, countFn, listFn) {
  const pager = parsePagination(query, opts);

  const [total, list] = await Promise.all([countFn(), listFn(pager)]);

  return {
    list,
    total,
    page: pager.page,
    pageSize: pager.pageSize,
  };
}

/**
 * 为 Dao 层生成标准分页 SQL 后缀
 * @param {object} pager - parsePagination 返回值
 * @returns {string} SQL ORDER BY ... LIMIT ... OFFSET ...
 */
export function paginationSQL(pager, allowedSortFields = null) {
  let sort = pager.sort;
  if (!allowedSortFields || !allowedSortFields.includes(sort)) {
    sort = 'id';
  }
  return {
    sql: `ORDER BY ${sort} ${pager.order} LIMIT ? OFFSET ?`,
    params: [pager.pageSize, pager.offset],
  };
}
