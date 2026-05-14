/**
 * E2B Sandbox DAO — 云端代码沙箱审计数据访问层
 * G6 Backend-B | 2026-05-14
 */
import pool from './db.js';

export async function insertExecutionLog({
  sandboxId, userId, language, codeHash,
  stdoutLen, stderrLen, exitCode, elapsedMs, status, errorMsg,
}) {
  await pool.query(
    `INSERT INTO e2b_execution_log
      (sandbox_id, user_id, language, code_hash, stdout_len, stderr_len, exit_code, elapsed_ms, status, error_msg, create_time)
     VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,
    [sandboxId, userId, language, codeHash, stdoutLen, stderrLen, exitCode ?? null, elapsedMs, status, errorMsg || null],
  );
}
