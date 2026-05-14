-- ============================================================
-- Movio AI — Migration 011: P2 Database Column Fixes
-- 修复 ai_call_log 列不匹配 + 创建 job_queue 表
-- 2026-05-09 | Updated 2026-05-14: job_queue DDL 与 m002 对齐
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

-- 2. job_queue: 异步任务队列表（DDL 与 m002_business.sql 保持一致）
-- 若 m002 已先行创建，此 CREATE 为 no-op
CREATE TABLE IF NOT EXISTS `job_queue` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `task_type` VARCHAR(32) NOT NULL COMMENT 'video_gen/image_gen/action_migrate/digital_human/live_clip',
  `task_params` JSON DEFAULT NULL COMMENT '任务参数',
  `status` ENUM('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  `progress` TINYINT UNSIGNED DEFAULT 0 COMMENT '进度 0-100',
  `result_data` JSON DEFAULT NULL COMMENT '结果 {file_url,duration,preview,...}',
  `error_message` VARCHAR(1024) DEFAULT '' COMMENT '失败原因',
  `retry_count` INT UNSIGNED DEFAULT 0 COMMENT '已重试次数',
  `max_retries` INT UNSIGNED DEFAULT 3 COMMENT '最大重试次数',
  `scheduled_at` DATETIME DEFAULT NULL COMMENT '定时执行时间,NULL=立即',
  `priority` TINYINT DEFAULT 5 COMMENT '优先级 1-10, 数字越小越优先',
  `processing_node` VARCHAR(64) DEFAULT '' COMMENT '处理节点标识',
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status_created` (`status`, `created_at`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_type_status` (`task_type`, `status`),
  INDEX `idx_priority` (`priority`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='异步任务队列表';

-- 3. site_config: DAO 使用但 schema.sql 未定义，实际操作存在，补充 DDL 注释
-- site_config 表已存在于 MySQL，包含 site_name, site_desc, site_logo, site_favicon,
-- home_config, theme_config, features_config, publish_status, published_at, created_at, updated_at

-- 4. marketing_badges: DAO 使用但 schema.sql 未定义，实际操作存在
-- marketing_badges 表已存在于 MySQL（badgeDao.js 使用）

-- 5. check_ins: DAO 使用但 schema.sql 未定义，实际操作存在
-- check_ins 表已存在于 MySQL（creditDao.js 签到功能使用）
