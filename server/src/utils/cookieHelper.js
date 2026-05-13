/**
 * Cookie 安全选项辅助 — 根据请求动态判断 secure 标志
 * 处理反向代理 HTTPS 终止场景（Nginx/Cloudflare 等）
 */
import { isProduction } from '../config/index.js';

export function cookieSecure(req) {
  if (isProduction) return true;
  if (req?.secure) return true;
  if (req?.headers?.['x-forwarded-proto'] === 'https') return true;
  return false;
}
