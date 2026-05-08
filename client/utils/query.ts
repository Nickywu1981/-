/** 客户端工具模块统一导出 — qs + js-cookie 封装 */

import qs from 'qs';
import Cookies from 'js-cookie';

/** URL 查询字符串解析（支持嵌套对象） */
export function parseQuery(str: string) {
  return qs.parse(str, { ignoreQueryPrefix: true, allowDots: true });
}

/** 对象转查询字符串 */
export function stringifyQuery(obj: Record<string, unknown>) {
  return qs.stringify(obj, { addQueryPrefix: true, allowDots: true, encode: true });
}

/** Cookie 操作快捷方法 */
export const cookie = {
  get: (key: string) => Cookies.get(key),
  set: (key: string, value: string, opts?: Record<string, unknown>) =>
    Cookies.set(key, value, { expires: 7, path: '/', ...opts } as Record<string, unknown>),
  remove: (key: string, _opts?: Record<string, unknown>) =>
    Cookies.remove(key),
} as const;

export default { parseQuery, stringifyQuery, cookie };
