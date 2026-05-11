-- Phase 8: 渠道管理模块 — 数据模型
USE ai_saas;

CREATE TABLE IF NOT EXISTS `channel_relation` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_tenant_id` INT UNSIGNED NOT NULL,
  `child_tenant_id` INT UNSIGNED NOT NULL,
  `level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `status` ENUM('pending','active','rejected','suspended') NOT NULL DEFAULT 'pending',
  `apply_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approve_time` DATETIME DEFAULT NULL,
  `reject_reason` VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parent_child` (`parent_tenant_id`, `child_tenant_id`),
  KEY `idx_child` (`child_tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `channel_commission_policy` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `level` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `commission_type` ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  `min_order_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `channel_performance` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_tenant_id` INT UNSIGNED NOT NULL,
  `child_tenant_id` INT UNSIGNED NOT NULL,
  `period_type` ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'monthly',
  `period_value` VARCHAR(20) NOT NULL,
  `order_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `order_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `commission_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `customer_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_period` (`parent_tenant_id`, `child_tenant_id`, `period_type`, `period_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
