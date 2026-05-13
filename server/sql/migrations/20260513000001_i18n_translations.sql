-- Migration: i18n 动态翻译表
-- 支持后台 DIY 编辑全部前端文案

CREATE TABLE IF NOT EXISTS `i18n_translation` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `locale` VARCHAR(10) NOT NULL COMMENT '语言代码: zh, en, es',
  `namespace` VARCHAR(64) NOT NULL COMMENT '命名空间: common, nav, admin, work',
  `trans_key` VARCHAR(192) NOT NULL COMMENT '完整键: nav.home, admin.tasks',
  `trans_value` TEXT NOT NULL COMMENT '翻译文本',
  `description` VARCHAR(255) DEFAULT '' COMMENT '注释/上下文说明',
  `updated_by` INT UNSIGNED DEFAULT NULL COMMENT '修改人',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_locale_key` (`locale`, `trans_key`),
  KEY `idx_locale` (`locale`),
  KEY `idx_namespace` (`namespace`),
  KEY `idx_updated_at` (`updated_at`),
  FULLTEXT KEY `ft_key_value` (`trans_key`, `trans_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='i18n动态翻译表';

CREATE TABLE IF NOT EXISTS `i18n_translation_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `locale` VARCHAR(10) NOT NULL,
  `trans_key` VARCHAR(192) NOT NULL,
  `old_value` TEXT,
  `new_value` TEXT,
  `changed_by` INT UNSIGNED DEFAULT NULL,
  `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_locale_key` (`locale`, `trans_key`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='i18n变更日志';

-- DOWN
DROP TABLE IF EXISTS `i18n_translation_log`;
DROP TABLE IF EXISTS `i18n_translation`;
