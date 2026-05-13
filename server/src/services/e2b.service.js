/**
 * Movio AI v4.1 — E2B Cloud Sandbox Service
 * 云端代码执行沙箱：创建/执行/销毁/配额管理
 */
import { Sandbox } from 'e2b';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { e2bConfig as config, isProduction } from '../config/index.js';
import { getRedis } from '../dao/redis.js';
import logger from '../utils/logger.js';

const SANDBOX_STORE = new Map();       // sandboxId → { sandbox, userId, createdAt, refCount }
const IDLE_CLEANUP_MS = 10 * 60 * 1000; // 10 分钟空闲清理
const MAX_IDLE_MS = 30 * 60 * 1000;     // 30 分钟强制过期

function _cleanupEntry(sandboxId, reason = 'idle') {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) return;
  SANDBOX_STORE.delete(sandboxId);
  entry.sandbox.kill().catch(err => {
    logger.warn('[E2B] 沙箱清理失败', { sandboxId, error: err.message });
  });
  logger.info('[E2B] 沙箱已销毁', { sandboxId, reason, age: Date.now() - entry.createdAt });
}

export const _cleanupTimer = setInterval(() => {
  try {
    const now = Date.now();
    for (const [id, entry] of SANDBOX_STORE) {
      if (now - entry.createdAt > MAX_IDLE_MS) {
        _cleanupEntry(id, 'expired');
      }
    }
  } catch { /* Map 迭代安全 */ }
}, IDLE_CLEANUP_MS).unref();

function _getApiKey() {
  const key = config.apiKey;
  if (!key) throw new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'E2B 服务未配置 API Key');
  return key;
}

function _countUserSandboxes(userId) {
  const key = String(userId);
  let count = 0;
  for (const [, entry] of SANDBOX_STORE) {
    if (entry.userId === key) count++;
  }
  return count;
}

// ─────────────────── P1 #2 危险代码检测 ───────────────────
const DANGEROUS_PATTERNS = [
  { pattern: /\brm\s+-rf\s+\//, msg: '禁止递归删除根目录' },
  { pattern: /\brm\s+-rf\s+\*\s*\/|rm\s+-rf\s+\/\*/, msg: '禁止危险删除操作' },
  { pattern: /while\s*\(\s*true\s*\)|while\s*:\s*;|for\s*\(\s*;\s*;\s*\)/, msg: '检测到无限循环模式' },
  { pattern: /\bfork\b\(\s*\)|os\.fork|subprocess\.Popen|child_process/, msg: '禁止创建子进程' },
  { pattern: /cryptonight|stratum\+tcp|mining|mine\s*\(/, msg: '禁止挖矿脚本' },
  { pattern: /\/dev\/tcp|nc\s+-[lL]|ncat\s+-[lL]|socat\s+/, msg: '禁止反向Shell/网络扫描' },
  { pattern: /requests\.get\(['"]http|urllib.*urlopen|curl\s+-o/, msg: '禁止外部网络请求' },
  { pattern: /shutil\.rmtree\s*\(\s*['"]\/|os\.remove\s*\(\s*['"]\//, msg: '禁止删除系统文件' },
];

function _auditCode(code) {
  for (const { pattern, msg } of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `代码安全拦截: ${msg}`);
  }
}

// ─────────────────── P1 #5 Redis 持久化 ───────────────────
const REDIS_E2B_SET = 'e2b:active_sandboxes';
const REDIS_E2B_PREFIX = 'e2b:sandbox:';
const REDIS_E2B_TTL = 1800; // 30min match MAX_IDLE_MS

async function _persistSandboxMeta(sandboxId, userId) {
  try {
    const r = await getRedis();
    if (!r) return;
    await r.sAdd(REDIS_E2B_SET, sandboxId);
    await r.hSet(`${REDIS_E2B_PREFIX}${sandboxId}`, { userId: String(userId), createdAt: String(Date.now()) });
    await r.expire(`${REDIS_E2B_PREFIX}${sandboxId}`, REDIS_E2B_TTL);
  } catch (err) {
    logger.warn('[E2B] Redis 持久化失败', { sandboxId, error: err.message });
  }
}

async function _removeSandboxMeta(sandboxId) {
  try {
    const r = await getRedis();
    if (!r) return;
    await r.sRem(REDIS_E2B_SET, sandboxId);
    await r.del(`${REDIS_E2B_PREFIX}${sandboxId}`);
  } catch { /* Redis 不可用则跳过 */ }
}

export async function _startupOrphanCheck() {
  try {
    const r = await getRedis();
    if (!r) return;
    const ids = await r.sMembers(REDIS_E2B_SET);
    if (ids.length > 0) {
      logger.warn('[E2B] 检测到可能孤儿沙箱，进程重启前残留', { count: ids.length, ids });
      // 清理孤儿记录，实际沙箱会在 E2B 端超时自动回收
      for (const id of ids) {
        await r.sRem(REDIS_E2B_SET, id);
        await r.del(`${REDIS_E2B_PREFIX}${id}`);
      }
    }
  } catch { /* Redis 不可用则跳过 */ }
}

// ─────────────────── 核心 API ───────────────────
  const uid = String(userId);
  if (_countUserSandboxes(uid) >= config.maxSandboxesPerUser) {
    throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED, `沙箱数量已达上限 (${config.maxSandboxesPerUser})`);
  }

  const apiKey = _getApiKey();
  const sandbox = await Sandbox.create({
    apiKey,
    template: config.template,
    timeoutMs: config.defaultTimeoutMs,
  });

  SANDBOX_STORE.set(sandbox.sandboxId, {
    sandbox,
    userId: uid,
    createdAt: Date.now(),
    refCount: 1,
  });

  logger.info('[E2B] 沙箱已创建', { sandboxId: sandbox.sandboxId, userId: uid });
  return { sandboxId: sandbox.sandboxId };
}

export async function executeCode(sandboxId, code, language, timeoutMs) {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱不存在或已过期');

  const lang = (language || 'python').toLowerCase();
  const extMap = { python: 'py', javascript: 'js', typescript: 'ts', bash: 'sh', r: 'r', ruby: 'rb' };
  const ext = extMap[lang] || lang;

  const escaped = code.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
  const cmd = `cat > /tmp/script.${ext} << 'SCRIPT_EOF'\n${code}\nSCRIPT_EOF\n`;
  const runCmd = lang === 'python' ? 'python3 /tmp/script.py'
    : lang === 'javascript' ? 'node /tmp/script.js'
    : lang === 'typescript' ? 'npx ts-node /tmp/script.ts'
    : lang === 'bash' ? 'bash /tmp/script.sh'
    : lang === 'r' ? 'Rscript /tmp/script.r'
    : lang === 'ruby' ? 'ruby /tmp/script.rb'
    : `${lang} /tmp/script.${ext}`;

  const fullCmd = `${cmd}${runCmd}`;

  const t0 = Date.now();
  const result = await entry.sandbox.commands.run(fullCmd, {
    timeoutMs: timeoutMs || config.defaultTimeoutMs,
  });

  const elapsed = Date.now() - t0;
  logger.info('[E2B] 代码执行完成', { sandboxId, language: lang, elapsedMs: elapsed, exitCode: result.exitCode });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.exitCode,
    elapsedMs: elapsed,
    sandboxId,
  };
}

export async function getSandbox(sandboxId) {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱不存在或已过期');
  const running = await entry.sandbox.isRunning();
  return {
    sandboxId,
    running,
    createdAt: new Date(entry.createdAt).toISOString(),
    refCount: entry.refCount,
  };
}

export async function listUserSandboxes(userId) {
  const uid = String(userId);
  const list = [];
  for (const [id, entry] of SANDBOX_STORE) {
    if (entry.userId !== uid) continue;
    try {
      const running = await entry.sandbox.isRunning();
      list.push({ sandboxId: id, running, createdAt: new Date(entry.createdAt).toISOString() });
    } catch {
      list.push({ sandboxId: id, running: false, createdAt: new Date(entry.createdAt).toISOString() });
    }
  }
  return list;
}

export async function destroySandbox(sandboxId) {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱不存在或已过期');
  _cleanupEntry(sandboxId, 'user_request');
  return { sandboxId };
}

export function getSandboxOwner(sandboxId) {
  const entry = SANDBOX_STORE.get(sandboxId);
  return entry ? entry.userId : null;
}
