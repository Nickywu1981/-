-- Migration: LTM 语义检索 + 情节/工作记忆支持
-- Purpose: embedding列 / memory_type扩展 / 语义召回基础设施
-- Date: 2026-05-16

-- UP

-- 1. LTM 新增 embedding 列 (MySQL 8.0 compatible: no IF NOT EXISTS on ADD COLUMN)
--    先用存储过程安全添加，避免重复执行报错
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS _ltm_embedding_migrate_up()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ltm_entries' AND COLUMN_NAME = 'embedding') THEN
    ALTER TABLE ltm_entries ADD COLUMN embedding JSON DEFAULT NULL COMMENT '文本嵌入向量(稀疏TF-IDF或dense array)';
  END IF;
  IF NOT EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ltm_entries' AND COLUMN_NAME = 'embedding_model') THEN
    ALTER TABLE ltm_entries ADD COLUMN embedding_model VARCHAR(64) DEFAULT NULL COMMENT '嵌入模型名';
  END IF;
END$$
DELIMITER ;
CALL _ltm_embedding_migrate_up();
DROP PROCEDURE IF EXISTS _ltm_embedding_migrate_up;

-- 2. memory_type 扩展: 新增 episodic / working (先清理可能冲突的数据再改ENUM)
ALTER TABLE ltm_entries
  MODIFY COLUMN memory_type ENUM('fact','preference','decision','pattern','rule','conversation','episodic','working') NOT NULL DEFAULT 'fact';

-- 3. embedding_model 索引 (用于统计和诊断)
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS _ltm_embedding_idx_up()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ltm_entries' AND INDEX_NAME = 'idx_embedding_model') THEN
    ALTER TABLE ltm_entries ADD INDEX idx_embedding_model (embedding_model);
  END IF;
END$$
DELIMITER ;
CALL _ltm_embedding_idx_up();
DROP PROCEDURE IF EXISTS _ltm_embedding_idx_up;

-- DOWN

-- 先清理 expanded ENUM 值，避免 MODIFY COLUMN 失败
UPDATE ltm_entries SET memory_type = 'fact' WHERE memory_type IN ('episodic', 'working');

DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS _ltm_embedding_migrate_down()
BEGIN
  IF EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ltm_entries' AND INDEX_NAME = 'idx_embedding_model') THEN
    DROP INDEX idx_embedding_model ON ltm_entries;
  END IF;
  IF EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ltm_entries' AND COLUMN_NAME = 'embedding') THEN
    ALTER TABLE ltm_entries DROP COLUMN embedding;
  END IF;
  IF EXISTS (SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ltm_entries' AND COLUMN_NAME = 'embedding_model') THEN
    ALTER TABLE ltm_entries DROP COLUMN embedding_model;
  END IF;
END$$
DELIMITER ;
CALL _ltm_embedding_migrate_down();
DROP PROCEDURE IF EXISTS _ltm_embedding_migrate_down;

ALTER TABLE ltm_entries
  MODIFY COLUMN memory_type ENUM('fact','preference','decision','pattern','rule','conversation') NOT NULL DEFAULT 'fact';
