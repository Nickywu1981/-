/**
 * Movio AI v4.3 — E2B Cloud Sandbox Service
 * 云端代码执行沙箱：创建/执行/销毁/配额管理
 * v4.2: 归属校验 + 危险代码检测 + stderr脱敏 + Redis防孤儿化
 * v4.3: 网络隔离 + 审计持久化 + BusinessError标准化 + 告警对接
 */
import { Sandbox } from 'e2b';
import crypto from 'crypto';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { e2bConfig as config, isProduction } from '../config/index.js';
import { getRedis } from '../dao/redis.js';
import pool from '../dao/db.js';
import logger from '../utils/logger.js';
import { checkAlerts } from './alertService.js';
import { getDashboardSummary } from './monitorService.js';

const SANDBOX_STORE = new Map();       // sandboxId → { sandbox, userId, createdAt }
const IDLE_CLEANUP_MS = 10 * 60 * 1000; // 10 分钟空闲清理
const MAX_IDLE_MS = 30 * 60 * 1000;     // 30 分钟强制过期

function _cleanupEntry(sandboxId, reason = 'idle') {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) return;
  SANDBOX_STORE.delete(sandboxId);
  _removeSandboxMeta(sandboxId);
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
    // P3: 预热池中超过 30min 未被使用的沙箱自动销毁
    for (const sandbox of WARM_POOL) {
      // 预热池沙箱无 createAt，由外部 metric 跟踪
      // 简化处理：每轮清理只保留 _warmPoolTarget 个
      if (WARM_POOL.size > _warmPoolTarget) {
        const toRemove = WARM_POOL.values().next().value;
        WARM_POOL.delete(toRemove);
        toRemove.kill().catch(err => logger.warn('[E2B] 预热池沙箱清理失败', { sandboxId: toRemove.sandboxId, error: err.message }));
        logger.info('[E2B] 预热池沙箱已清理（超出目标）', { sandboxId: toRemove.sandboxId, poolSize: WARM_POOL.size });
      }
    }
  } catch { /* Map/Set 迭代安全 */ }
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

// ─────────────────── P0 #1 归属校验 ───────────────────
function _checkOwnership(entry, userId) {
  if (!userId) throw new BusinessError(ERROR_CODE.UNAUTHORIZED, '请先登录');
  if (entry.userId !== String(userId)) {
    throw new BusinessError(ERROR_CODE.FORBIDDEN, '无权操作此沙箱');
  }
}

// ─────────────────── P1 #4 stderr 脱敏 ───────────────────
const MAX_STDERR_LENGTH = 2000;

function _sanitizeStderr(stderr) {
  let sanitized = (stderr || '').slice(0, MAX_STDERR_LENGTH);
  if (isProduction) {
    sanitized = sanitized
      .replace(/\/[^\s:]+/g, '[path]')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');
  }
  return sanitized;
}

// ─────────────────── P3 #14 沙箱预热池 ───────────────────

const WARM_POOL = new Set();
let _warmPoolTarget = 0;

async function _fillWarmPool(count) {
  if (count <= 0) return;
  const apiKey = _getApiKey();
  for (let i = 0; i < count; i++) {
    try {
      const sandbox = await Sandbox.create({
        apiKey,
        template: config.template,
        timeoutMs: config.defaultTimeoutMs,
        allowOutbound: config.allowOutbound ?? false,
      });
      WARM_POOL.add(sandbox);
      logger.info('[E2B] 预热池沙箱就绪', { sandboxId: sandbox.sandboxId, poolSize: WARM_POOL.size });
    } catch (err) {
      logger.warn('[E2B] 预热池创建失败', { error: err.message, remaining: count - i - 1 });
      break; // 连续失败则停止预热
    }
  }
}

export async function _initWarmPool() {
  _warmPoolTarget = config.warmPoolSize;
  if (_warmPoolTarget <= 0) return;
  logger.info('[E2B] 初始化预热池', { target: _warmPoolTarget });
  _fillWarmPool(_warmPoolTarget);
}

function _popWarmSandbox() {
  if (WARM_POOL.size === 0) return null;
  const sandbox = WARM_POOL.values().next().value;
  WARM_POOL.delete(sandbox);
  // 异步补池
  if (WARM_POOL.size < _warmPoolTarget) {
    setImmediate(() => _fillWarmPool(1));
  }
  return sandbox;
}

// ─────────────────── P3 #17 代码长度按语言分级 ───────────────────

function _checkCodeLength(code, language) {
  const lang = (language || 'python').toLowerCase();
  const maxLen = config.codeMaxByLanguage[lang] || config.defaultCodeMax;
  if (code.length > maxLen) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `代码过长: ${lang} 上限 ${maxLen} 字符，当前 ${code.length} 字符`);
  }
}

// ─────────────────── P2 #9 执行审计持久化 ───────────────────

async function _logExecution({ sandboxId, userId, language, code, stdout, stderr, exitCode, elapsedMs, status, errorMsg }) {
  try {
    const codeHash = crypto.createHash('sha256').update(code || '').digest('hex').slice(0, 16);
    await pool.query(
      'INSERT INTO e2b_execution_log (sandbox_id, user_id, language, code_hash, stdout_len, stderr_len, exit_code, elapsed_ms, status, error_msg, create_time) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())',
      [sandboxId, userId, language || 'python', codeHash, (stdout || '').length, (stderr || '').length, exitCode ?? null, elapsedMs || 0, status, errorMsg || null],
    );
  } catch (err) {
    logger.warn('[E2B] 审计日志写入失败', { sandboxId, error: err.message });
  }
}

// ─────────────────── P2 #11 错误标准化 ───────────────────

function _normalizeE2bError(err, sandboxId) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('timeout')) {
    return new BusinessError(ERROR_CODE.INTERNAL_ERROR, '代码执行超时，请简化代码或增加超时时间');
  }
  if (msg.includes('quota') || msg.includes('rate limit')) {
    return new BusinessError(ERROR_CODE.QUOTA_EXCEEDED, 'E2B 沙箱配额已用尽，请稍后重试');
  }
  if (msg.includes('not found') || msg.includes('not running')) {
    return new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, `沙箱 ${sandboxId} 不存在或已停止`);
  }
  if (msg.includes('api key') || msg.includes('unauthorized')) {
    return new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'E2B 服务配置异常，请联系管理员');
  }
  return new BusinessError(ERROR_CODE.INTERNAL_ERROR, '沙箱执行异常，请稍后重试');
}

// ─────────────────── P2 #12 告警 ───────────────────

let _lastAlertCheck = 0;
const ALERT_CHECK_INTERVAL_MS = 60_000;

function _maybeCheckAlerts() {
  const now = Date.now();
  if (now - _lastAlertCheck < ALERT_CHECK_INTERVAL_MS) return;
  _lastAlertCheck = now;
  setImmediate(() => {
    try { checkAlerts(getDashboardSummary()); } catch { /* 告警非关键路径 */ }
  });
}

// ═══════════════════ 核心 API ═══════════════════

export async function createSandbox(userId) {
  const uid = String(userId);
  if (_countUserSandboxes(uid) >= config.maxSandboxesPerUser) {
    throw new BusinessError(ERROR_CODE.QUOTA_EXCEEDED, `沙箱数量已达上限 (${config.maxSandboxesPerUser})`);
  }

  // P3 #14: 预热池优先
  let sandbox = _popWarmSandbox();
  if (sandbox) {
    SANDBOX_STORE.set(sandbox.sandboxId, { sandbox, userId: uid, createdAt: Date.now() });
    _persistSandboxMeta(sandbox.sandboxId, uid);
    logger.info('[E2B] 沙箱已分配（来自预热池）', { sandboxId: sandbox.sandboxId, userId: uid, poolRemaining: WARM_POOL.size });
    return { sandboxId: sandbox.sandboxId };
  }

  const apiKey = _getApiKey();
  let sandbox;
  try {
    sandbox = await Sandbox.create({
      apiKey,
      template: config.template,
      timeoutMs: config.defaultTimeoutMs,
      allowOutbound: config.allowOutbound ?? false, // P2 #6: 网络隔离
    });
  } catch (err) {
    logger.error('[E2B] 沙箱创建失败', { userId: uid, template: config.template, error: err.message });
    // P2 #12: 告警 — 创建失败可能表示 E2B 服务异常
    _maybeCheckAlerts();
    throw _normalizeE2bError(err, null); // P2 #11: 标准化错误
  }

  SANDBOX_STORE.set(sandbox.sandboxId, {
    sandbox,
    userId: uid,
    createdAt: Date.now(),
  });

  _persistSandboxMeta(sandbox.sandboxId, uid);

  logger.info('[E2B] 沙箱已创建', { sandboxId: sandbox.sandboxId, userId: uid });
  return { sandboxId: sandbox.sandboxId };
}

export async function executeCode(sandboxId, userId, code, language, timeoutMs) {
  // P0: 归属校验
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱不存在或已过期');
  _checkOwnership(entry, userId);

  // P1 #2: 危险代码检测
  _auditCode(code);

  // P3 #17: 按语言分级长度校验
  _checkCodeLength(code, language);

  // P2 #10: 崩溃沙箱检测
  let running;
  try {
    running = await entry.sandbox.isRunning();
  } catch {
    _cleanupEntry(sandboxId, 'crashed');
    throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱已崩溃，请重新创建');
  }
  if (!running) {
    _cleanupEntry(sandboxId, 'stopped');
    throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱已停止，请重新创建');
  }

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
  let result;
  try {
    result = await entry.sandbox.commands.run(fullCmd, {
      timeoutMs: timeoutMs || config.defaultTimeoutMs,
    });
  } catch (err) {
    logger.error('[E2B] 代码执行失败', { sandboxId, userId: String(userId), language: lang, codeLength: code.length, error: err.message });
    _logExecution({ sandboxId, userId: String(userId), language: lang, code, stderr: err.message, exitCode: null, elapsedMs: Date.now() - t0, status: 0, errorMsg: err.message }).catch(() => {});
    _maybeCheckAlerts(); // P2 #12
    throw _normalizeE2bError(err, sandboxId); // P2 #11
  }

  const elapsed = Date.now() - t0;
  logger.info('[E2B] 代码执行完成', { sandboxId, userId: String(userId), language: lang, elapsedMs: elapsed, exitCode: result.exitCode });

  // P2 #9: 审计日志（成功）
  _logExecution({ sandboxId, userId: String(userId), language: lang, code, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, elapsedMs: elapsed, status: 1 }).catch(() => {});

  return {
    stdout: (result.stdout || '').slice(0, 100000),
    stderr: _sanitizeStderr(result.stderr),
    exitCode: result.exitCode,
    elapsedMs: elapsed,
    sandboxId,
  };
}

export async function getSandbox(sandboxId, userId) {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱不存在或已过期');
  _checkOwnership(entry, userId);
  let running;
  try {
    running = await entry.sandbox.isRunning();
  } catch {
    running = false;
  }
  return {
    sandboxId,
    running,
    createdAt: new Date(entry.createdAt).toISOString(),
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

export async function destroySandbox(sandboxId, userId) {
  const entry = SANDBOX_STORE.get(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, '沙箱不存在或已过期');
  _checkOwnership(entry, userId);
  _cleanupEntry(sandboxId, 'user_request');
  return { sandboxId };
}
