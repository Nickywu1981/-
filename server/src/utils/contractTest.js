/**
 * API 契约测试工具 — 验证接口请求/响应与类型定义一致
 */

/** 解析 Set-Cookie 为 name=value 格式（仅提取键值，丢弃属性） */
function parseSetCookie(setCookieStr) {
  if (!setCookieStr) return '';
  return setCookieStr
    .split(',')
    .map(h => h.trim())
    .filter(Boolean)
    .map(c => c.split(';')[0]) // name=value only
    .join('; ');
}

/** 从 Cookie 字符串中提取 token */
function extractCookieValue(cookieStr, name) {
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : '';
}

/** 合并新旧 Cookie */
function mergeCookies(oldCookies, newSetCookie) {
  const parsed = parseSetCookie(newSetCookie);
  if (!parsed) return oldCookies;
  if (!oldCookies) return parsed;

  // 提取新的 cookie 名
  const newPairs = parsed.split('; ').map(p => p.split('=')[0]);
  // 从旧 cookie 中移除同名的
  const oldPairs = oldCookies.split('; ').filter(p => !newPairs.includes(p.split('=')[0]));
  const all = [...oldPairs, ...parsed.split('; ')].filter(Boolean);
  return all.join('; ');
}

/** 超轻量契约测试 */
export function contract() {
  const req = async (method, path, body, opts = {}) => {
    const { cookie, expect: expectedCode = 200 } = opts;

    const headers = { 'Content-Type': 'application/json' };
    if (cookie) {
      headers['Cookie'] = cookie;
      // 自动从 Cookie 提取 CSRF token 并放入 header
      const csrf = extractCookieValue(cookie, 'csrf_token');
      if (csrf) headers['x-csrf-token'] = csrf;
    }

    const url = new URL(path, 'http://127.0.0.1:3001');
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual',
    });

    const text = await res.text();
    const newCookies = res.headers.get('set-cookie') || '';

    // 尝试 JSON 解析，失败则用原始文本
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { code: res.status, msg: text, data: text };
    }

    // 断言
    const ok = json.code === expectedCode;
    if (!ok) {
      throw new Error(`[CONTRACT FAIL] ${method} ${path} → expected code=${expectedCode}, got code=${json.code} msg="${json.msg}"`);
    }

    // 合并 cookie
    const mergedCookie = mergeCookies(cookie, newCookies);

    return { status: res.status, code: json.code, msg: json.msg, data: json.data, cookie: mergedCookie };
  };

  return {
    get: (path, opts) => req('GET', path, null, opts),
    post: (path, body, opts) => req('POST', path, body, opts),
    put: (path, body, opts) => req('PUT', path, body, opts),
    delete: (path, opts) => req('DELETE', path, null, opts),
  };
}

/** 断言工具 */
export function assert(condition, msg) {
  if (!condition) throw new Error(`[CONTRACT ASSERT] ${msg}`);
}

/** 批量运行契约测试 */
export async function runContractTests(name, tests) {
  const results = [];
  let passed = 0;
  let failed = 0;

  console.log(`\n=== ${name} (${tests.length} tests) ===`);

  for (const { label, fn } of tests) {
    try {
      await fn();
      results.push({ label, status: 'PASS' });
      passed++;
      console.log(`  ✅ ${label}`);
    } catch (err) {
      results.push({ label, status: 'FAIL', error: err.message });
      failed++;
      console.log(`  ❌ ${label}: ${err.message}`);
    }
  }

  console.log(`\n${passed}/${passed + failed} passed\n`);
  return { passed, failed, results };
}
