-- Migration: 长期记忆 + 上下文窗口管理层
-- Purpose: 补强超长上下文理解 + 关键信息长期记忆两大短板
-- Date: 2026-05-12

-- UP

-- ============================================================
-- 1. 长期记忆条目表 (Long-Term Memory Entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS ltm_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  namespace VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '命名空间: user/tenant/global/project',
  subject_id VARCHAR(64) NOT NULL COMMENT '主体ID (userId/tenantId)',
  memory_key VARCHAR(255) NOT NULL COMMENT '记忆唯一标识',
  content TEXT NOT NULL COMMENT '记忆内容',
  content_hash CHAR(64) NOT NULL COMMENT 'SHA-256 内容指纹，去重用',
  importance FLOAT NOT NULL DEFAULT 0.5 COMMENT '重要性评分 0-1',
  recency_score FLOAT NOT NULL DEFAULT 1.0 COMMENT '新鲜度评分 0-1',
  frequency INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '被召回次数',
  access_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总访问次数',
  last_accessed_at DATETIME COMMENT '最后访问时间',
  decay_rate FLOAT NOT NULL DEFAULT 0.01 COMMENT '衰减速率 (每天)',
  memory_type ENUM('fact','preference','decision','pattern','rule','conversation') NOT NULL DEFAULT 'fact',
  source VARCHAR(128) COMMENT '来源标识 (sessionId/taskId/system)',
  tags JSON COMMENT '标签数组',
  metadata JSON COMMENT '扩展元数据',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶保护',
  is_consolidated TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已合并到摘要',
  consolidated_to INT UNSIGNED COMMENT '合并目标条目ID',
  expires_at DATETIME COMMENT '过期时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_memory_key (namespace, subject_id, content_hash),
  INDEX idx_subject (namespace, subject_id),
  INDEX idx_importance (namespace, subject_id, importance DESC),
  INDEX idx_type (memory_type),
  INDEX idx_expires (expires_at),
  INDEX idx_tags ((CAST(tags AS CHAR(256) ARRAY)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='长期记忆条目表';

-- ============================================================
-- 2. 上下文窗口快照表 (Context Window Snapshots)
-- ============================================================
CREATE TABLE IF NOT EXISTS context_snapshots (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL COMMENT '会话ID',
  sequence INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '快照序号',
  total_tokens INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当前窗口总Token数',
  model_max_tokens INT UNSIGNED NOT NULL DEFAULT 8192 COMMENT '模型最大Token',
  utilization_pct DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT '窗口利用率%',
  chunk_count INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '分块数量',
  summary_tokens INT UNSIGNED DEFAULT 0 COMMENT '摘要Token数',
  pruned_tokens INT UNSIGNED DEFAULT 0 COMMENT '已裁剪Token数',
  message_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '窗口内消息数',
  oldest_msg_at DATETIME COMMENT '最早消息时间',
  newest_msg_at DATETIME COMMENT '最新消息时间',
  strategy VARCHAR(32) COMMENT '使用策略: sliding/compress/summarize/chunk',
  snapshot_json JSON COMMENT '窗口内容结构快照',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_session (session_id, sequence),
  INDEX idx_utilization (utilization_pct)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='上下文窗口快照表';

-- ============================================================
-- 3. Token 预算日志表 (Token Budget Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_budget_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL,
  call_id INT UNSIGNED COMMENT '关联 ai_call_log.id',
  budget_total INT UNSIGNED NOT NULL COMMENT '本次调用Token预算',
  system_prompt_tokens INT UNSIGNED DEFAULT 0 COMMENT '系统提示占用',
  history_tokens INT UNSIGNED DEFAULT 0 COMMENT '历史消息占用',
  rag_tokens INT UNSIGNED DEFAULT 0 COMMENT 'RAG检索内容占用',
  user_input_tokens INT UNSIGNED DEFAULT 0 COMMENT '用户输入占用',
  reserved_tokens INT UNSIGNED DEFAULT 0 COMMENT '预留输出空间',
  remaining_tokens INT UNSIGNED DEFAULT 0 COMMENT '剩余可用',
  overflow_truncated INT UNSIGNED DEFAULT 0 COMMENT '溢出被截断Token数',
  compression_ratio DECIMAL(5,4) COMMENT '压缩比',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_session (session_id),
  INDEX idx_call (call_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token预算日志表';

-- ============================================================
-- 4. 记忆合并日志表 (Memory Consolidation Log)
-- ============================================================
CREATE TABLE IF NOT EXISTS memory_consolidation_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  namespace VARCHAR(64) NOT NULL,
  subject_id VARCHAR(64) NOT NULL,
  source_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '合并源条目数',
  consolidated_content TEXT NOT NULL COMMENT '合并后摘要',
  source_ids JSON COMMENT '合并的源条目ID列表',
  trigger_type ENUM('auto','manual','threshold') NOT NULL DEFAULT 'auto',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_subject (namespace, subject_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='记忆合并日志表';

-- DOWN

DROP TABLE IF EXISTS memory_consolidation_log;
DROP TABLE IF EXISTS token_budget_log;
DROP TABLE IF EXISTS context_snapshots;
DROP TABLE IF EXISTS ltm_entries;
