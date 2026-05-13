-- Migration: LTM 语义检索 + 情节/工作记忆支持
-- Purpose: embedding列 / memory_type扩展 / 语义召回基础设施
-- Date: 2026-05-16

-- UP

-- 1. LTM 新增 embedding 列
ALTER TABLE ltm_entries
  ADD COLUMN IF NOT EXISTS embedding JSON DEFAULT NULL COMMENT '文本嵌入向量(稀疏TF-IDF或dense array)',
  ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(64) DEFAULT NULL COMMENT '嵌入模型名';

-- 2. memory_type 扩展: 新增 episodic / working
ALTER TABLE ltm_entries
  MODIFY COLUMN memory_type ENUM('fact','preference','decision','pattern','rule','conversation','episodic','working') NOT NULL DEFAULT 'fact';

-- 3. embedding_model 索引 (用于统计和诊断)
ALTER TABLE ltm_entries
  ADD INDEX IF NOT EXISTS idx_embedding_model (embedding_model);

-- DOWN

ALTER TABLE ltm_entries DROP COLUMN IF EXISTS embedding;
ALTER TABLE ltm_entries DROP COLUMN IF EXISTS embedding_model;
ALTER TABLE ltm_entries DROP INDEX IF EXISTS idx_embedding_model;
ALTER TABLE ltm_entries
  MODIFY COLUMN memory_type ENUM('fact','preference','decision','pattern','rule','conversation') NOT NULL DEFAULT 'fact';
