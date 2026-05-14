import pool from './db.js';

export async function insertContextSnapshot({ sessionId, totalTokens, modelMaxTokens, utilizationPct, chunkCount, summaryTokens, prunedTokens, messageCount, strategy }) {
  await pool.query(
    `INSERT INTO context_snapshots (session_id, total_tokens, model_max_tokens, utilization_pct, chunk_count, summary_tokens, pruned_tokens, message_count, strategy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, totalTokens, modelMaxTokens, utilizationPct, chunkCount, summaryTokens, prunedTokens, messageCount, strategy],
  );
}

export async function insertTokenBudgetLog({ sessionId, callId, budgetTotal, systemPromptTokens, historyTokens, ragTokens, userInputTokens, reservedTokens, remainingTokens, overflowTruncated, compressionRatio }) {
  await pool.query(
    `INSERT INTO token_budget_log (session_id, call_id, budget_total, system_prompt_tokens, history_tokens, rag_tokens, user_input_tokens, reserved_tokens, remaining_tokens, overflow_truncated, compression_ratio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionId, callId, budgetTotal, systemPromptTokens, historyTokens, ragTokens, userInputTokens, reservedTokens, remainingTokens, overflowTruncated, compressionRatio],
  );
}
