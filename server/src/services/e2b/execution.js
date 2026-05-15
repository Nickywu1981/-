/**
 * E2B 代码执行 + 安全校验
 * 提取自 e2b.service.js
 */
import crypto from 'crypto';
import { BusinessError } from '../../utils/businessError.js';
import { ERROR_CODE } from '../../constants/errorCode.js';
import { e2bConfig as config, isProduction } from '../../config/index.js';
import * as e2bDao from '../../dao/e2bDao.js';
import logger from '../../utils/logger.js';
import { getSandboxEntry, cleanupEntry } from './sandbox.js';

// ─── 危险代码检测 ───
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
    if (pattern.test(code)) throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `Code security blocked: ${msg}`);
  }
}

// ─── stderr 脱敏 ───
const MAX_STDERR_LENGTH = 2000;

function _sanitizeStderr(stderr) {
  let sanitized = (stderr || '').slice(0, MAX_STDERR_LENGTH);
  if (isProduction) {
    sanitized = sanitized.replace(/\/[^\s:]+/g, '[path]').replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]');
  }
  return sanitized;
}

// ─── 代码长度按语言分级 ───
function _checkCodeLength(code, language) {
  const lang = (language || 'python').toLowerCase();
  const maxLen = config.codeMaxByLanguage[lang] || config.defaultCodeMax;
  if (code.length > maxLen) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR, `Code too long: ${lang} max ${maxLen} chars, current ${code.length} chars`);
  }
}

// ─── 审计持久化 ───
async function _logExecution({ sandboxId, userId, language, code, stdout, stderr, exitCode, elapsedMs, status, errorMsg }) {
  try {
    const codeHash = crypto.createHash('sha256').update(code || '').digest('hex').slice(0, 16);
    await e2bDao.insertExecutionLog({
      sandboxId, userId: String(userId), language: language || 'python', codeHash,
      stdoutLen: (stdout || '').length, stderrLen: (stderr || '').length,
      exitCode: exitCode ?? null, elapsedMs: elapsedMs || 0, status, errorMsg: errorMsg || null,
    });
  } catch (err) { logger.warn('[E2B] 审计日志写入失败', { sandboxId, error: err.message }); }
}

// ─── 错误标准化 ───
function _normalizeError(err, sandboxId) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('timeout')) return new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'Code execution timeout');
  if (msg.includes('quota') || msg.includes('rate limit')) return new BusinessError(ERROR_CODE.QUOTA_EXCEEDED, 'E2B sandbox quota exhausted');
  if (msg.includes('not found') || msg.includes('not running')) return new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND, `Sandbox ${sandboxId} not found or stopped`);
  if (msg.includes('api key') || msg.includes('unauthorized')) return new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'E2B service configuration error');
  return new BusinessError(ERROR_CODE.INTERNAL_ERROR, 'Sandbox execution error');
}

// ─── 核心执行 API ───
export async function executeCode(sandboxId, userId, code, language, timeoutMs) {
  const entry = getSandboxEntry(sandboxId);
  if (!entry) throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND);
  if (entry.userId !== String(userId)) throw new BusinessError(ERROR_CODE.FORBIDDEN);

  _auditCode(code);
  _checkCodeLength(code, language);

  let running;
  try { running = await entry.sandbox.isRunning(); } catch { cleanupEntry(sandboxId, 'crashed'); throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND); }
  if (!running) { cleanupEntry(sandboxId, 'stopped'); throw new BusinessError(ERROR_CODE.RESOURCE_NOT_FOUND); }

  const lang = (language || 'python').toLowerCase();
  const extMap = { python: 'py', javascript: 'js', typescript: 'ts', bash: 'sh', r: 'r', ruby: 'rb' };
  const ext = extMap[lang] || lang;
  const escaped = code.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
  const runCmd = lang === 'python' ? 'python3 /tmp/script.py'
    : lang === 'javascript' ? 'node /tmp/script.js'
    : lang === 'typescript' ? 'npx ts-node /tmp/script.ts'
    : lang === 'bash' ? 'bash /tmp/script.sh'
    : lang === 'r' ? 'Rscript /tmp/script.r'
    : lang === 'ruby' ? 'ruby /tmp/script.rb'
    : `${lang} /tmp/script.${ext}`;

  const fullCmd = `cat > /tmp/script.${ext} << 'SCRIPT_EOF'\n${code}\nSCRIPT_EOF\n${runCmd}`;
  const t0 = Date.now();

  let result;
  try {
    result = await entry.sandbox.commands.run(fullCmd, { timeoutMs: timeoutMs || config.defaultTimeoutMs });
  } catch (err) {
    logger.error('[E2B] 代码执行失败', { sandboxId, userId: String(userId), language: lang, codeLength: code.length, error: err.message });
    _logExecution({ sandboxId, userId: String(userId), language: lang, code, stderr: err.message, exitCode: null, elapsedMs: Date.now() - t0, status: 0, errorMsg: err.message }).catch(e => logger.error('[E2B] 审计日志写入失败', e.message));
    throw _normalizeError(err, sandboxId);
  }

  const elapsed = Date.now() - t0;
  logger.info('[E2B] 代码执行完成', { sandboxId, userId: String(userId), language: lang, elapsedMs: elapsed, exitCode: result.exitCode });
  _logExecution({ sandboxId, userId: String(userId), language: lang, code, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, elapsedMs: elapsed, status: 1 }).catch(e => logger.error('[E2B] 审计日志写入失败', e.message));

  return {
    stdout: (result.stdout || '').slice(0, 100000),
    stderr: _sanitizeStderr(result.stderr),
    exitCode: result.exitCode,
    elapsedMs: elapsed,
    sandboxId,
  };
}
