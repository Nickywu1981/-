-- ============================================================
-- Movio AI — Migration 011: P2 Database Column Fixes
-- 修复 ai_call_log 列不匹配 + 创建 job_queue 表
-- 2026-05-09
-- ============================================================

-- 1. ai_call_log: modelConfigDao.js 使用的列与 schema.sql 不匹配
ALTER TABLE `ai_call_log`
  ADD COLUMN IF NOT EXISTS `model_key` VARCHAR(64) NULL AFTER `model_name`,
  ADD COLUMN IF NOT EXISTS `task_type` VARCHAR(64) NULL AFTER `model_key`,
  ADD COLUMN IF NOT EXISTS `input_hash` VARCHAR(128) NULL AFTER `task_type`,
  ADD COLUMN IF NOT EXISTS `latency_ms` INT NULL DEFAULT 0 AFTER `input_hash`,
  ADD COLUMN IF NOT EXISTS `tokens_in` INT NULL DEFAULT 0 AFTER `latency_ms`,
  ADD COLUMN IF NOT EXISTS `tokens_out` INT NULL DEFAULT 0 AFTER `tokens_in`,
  ADD COLUMN IF NOT EXISTS `moderation_result` JSON NULL AFTER `tokens_out`,
  ADD COLUMN IF NOT EXISTS `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER `moderation_result`;

-- 2. job_queue: jobQueueDao.js 需要的表，实际MySQL中不存在
CREATE TABLE IF NOT EXISTS `job_queue` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `job_type` VARCHAR(64) NOT NULL,
  `priority` INT NOT NULL DEFAULT 0,
  `status` ENUM('pending','processing','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `input_data` JSON NULL,
  `progress` INT NULL DEFAULT 0,
  `retry_count` INT NOT NULL DEFAULT 0,
  `error_message` TEXT NULL,
  `result_data` JSON NULL,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_job_queue_user` (`user_id`),
  INDEX `idx_job_queue_status` (`status`),
  INDEX `idx_job_queue_type` (`job_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. site_config: DAO 使用但 schema.sql 未定义，实际操作存在，补充 DDL 注释
-- site_config 表已存在于 MySQL，包含 site_name, site_desc, site_logo, site_favicon,
-- home_config, theme_config, features_config, publish_status, published_at, created_at, updated_at

-- 4. marketing_badges: DAO 使用但 schema.sql 未定义，实际操作存在
-- marketing_badges 表已存在于 MySQL（badgeDao.js 使用）

-- 5. check_ins: DAO 使用但 schema.sql 未定义，实际操作存在
-- check_ins 表已存在于 MySQL（creditDao.js 签到功能使用）
