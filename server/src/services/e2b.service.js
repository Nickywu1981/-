/**
 * Movio AI v4.1 — E2B Cloud Sandbox Service
 * 云端代码执行沙箱：创建/执行/销毁/配额管理
 */
import { Sandbox } from 'e2b';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { e2bConfig as config } from '../config/index.js';
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

export async function createSandbox(userId) {
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
