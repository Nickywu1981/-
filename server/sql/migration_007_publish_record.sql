-- ============================================================
-- Movio AI v4.1 — M007 publish_record (多平台内容分发记录)
-- ============================================================

CREATE TABLE IF NOT EXISTS `publish_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` VARCHAR(64) NOT NULL COMMENT '批次ID，同一批多平台共享',
  `user_id` BIGINT UNSIGNED NOT NULL,
  `asset_id` BIGINT UNSIGNED NOT NULL COMMENT '作品ID',
  `platform` VARCHAR(32) NOT NULL COMMENT '平台标识: taobao/tmall/jd/pdd/douyin/kuaishou/xhs/shipinhao/bilibili/shopee/lazada/amazon/tiktokshop',
  `platform_name` VARCHAR(32) NOT NULL COMMENT '平台中文名',
  `status` ENUM('pending','processing','success','failed','error','scheduled','cancelled') NOT NULL DEFAULT 'pending',
  `title` VARCHAR(200) DEFAULT '',
  `description` TEXT COMMENT '发布描述',
  `tags` JSON DEFAULT NULL COMMENT '标签',
  `content_url` VARCHAR(512) DEFAULT '' COMMENT '发布内容URL',
  `publish_url` VARCHAR(512) DEFAULT '' COMMENT '平台返回的发布链接',
  `error_msg` VARCHAR(500) DEFAULT NULL,
  `retry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `scheduled_at` DATETIME DEFAULT NULL COMMENT '定时发布时间',
  `published_at` DATETIME DEFAULT NULL COMMENT '实际发布时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_batch_id` (`batch_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_asset_id` (`asset_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_platform` (`platform`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='多平台内容分发记录';
