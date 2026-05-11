-- ============================================
-- Phase 2: 财务核心 — 结算/提现/流水/收款账户
-- 日期: 2026-05-11
-- ============================================

-- UP ──────────────────────────────────────────────────────────

USE ai_saas;

-- ----------------------------
-- 1. 收款账户绑定
-- ----------------------------
CREATE TABLE IF NOT EXISTS `bank_account` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` INT UNSIGNED NOT NULL,
  `account_type` ENUM('bank','wechat','alipay') NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `account_no` VARCHAR(100) NOT NULL,
  `bank_name` VARCHAR(100) DEFAULT NULL,
  `bank_branch` VARCHAR(200) DEFAULT NULL,
  `is_default` TINYINT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收款账户绑定表';

-- ----------------------------
-- 2. 结算批次
-- ----------------------------
CREATE TABLE IF NOT EXISTS `settlement_batch` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_no` VARCHAR(32) NOT NULL,
  `cycle_start` DATE NOT NULL,
  `cycle_end` DATE NOT NULL,
  `tenant_type` ENUM('enterprise','agent') NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `total_commission` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status` ENUM('pending','processing','settled','failed') NOT NULL DEFAULT 'pending',
  `settled_at` DATETIME DEFAULT NULL,
  `remark` VARCHAR(500) DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_batch_no` (`batch_no`),
  KEY `idx_tenant_type` (`tenant_type`),
  KEY `idx_cycle` (`cycle_start`, `cycle_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='结算批次表';

-- ----------------------------
-- 3. 结算明细
-- ----------------------------
CREATE TABLE IF NOT EXISTS `settlement_detail` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_id` INT UNSIGNED NOT NULL,
  `tenant_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED DEFAULT NULL,
  `order_amount` DECIMAL(12,2) NOT NULL,
  `commission_rate` DECIMAL(5,2) DEFAULT NULL,
  `commission_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `status` ENUM('pending','settled') NOT NULL DEFAULT 'pending',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_batch` (`batch_id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='结算明细表';

-- ----------------------------
-- 4. 提现订单
-- ----------------------------
CREATE TABLE IF NOT EXISTS `withdrawal_order` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_no` VARCHAR(32) NOT NULL,
  `tenant_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `fee` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `actual_amount` DECIMAL(12,2) NOT NULL,
  `bank_account_id` INT UNSIGNED DEFAULT NULL,
  `status` ENUM('pending_review','approved','processing','completed','rejected','failed') NOT NULL DEFAULT 'pending_review',
  `reviewer_id` INT UNSIGNED DEFAULT NULL,
  `review_remark` VARCHAR(500) DEFAULT NULL,
  `review_at` DATETIME DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `fail_reason` VARCHAR(500) DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order_no` (`order_no`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提现订单表';

-- ----------------------------
-- 5. 账户流水
-- ----------------------------
CREATE TABLE IF NOT EXISTS `account_ledger` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` INT UNSIGNED NOT NULL,
  `ledger_type` ENUM('revenue','commission','withdrawal','refund','adjustment') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `balance_before` DECIMAL(12,2) NOT NULL,
  `balance_after` DECIMAL(12,2) NOT NULL,
  `business_type` VARCHAR(50) DEFAULT NULL,
  `business_id` VARCHAR(50) DEFAULT NULL,
  `remark` VARCHAR(500) DEFAULT NULL,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_time` (`tenant_id`, `create_time`),
  KEY `idx_type` (`ledger_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账户流水表';

-- ----------------------------
-- 6. 分润政策
-- ----------------------------
CREATE TABLE IF NOT EXISTS `commission_policy` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tenant_id` INT UNSIGNED NOT NULL,
  `policy_type` ENUM('default','custom') NOT NULL DEFAULT 'default',
  `level1_rate` DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  `level2_rate` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `min_withdrawal` DECIMAL(12,2) NOT NULL DEFAULT 100.00,
  `settlement_cycle` ENUM('daily','weekly','monthly') NOT NULL DEFAULT 'monthly',
  `status` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分润政策表';

-- DOWN ────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS `commission_policy`;
-- DROP TABLE IF EXISTS `account_ledger`;
-- DROP TABLE IF EXISTS `withdrawal_order`;
-- DROP TABLE IF EXISTS `settlement_detail`;
-- DROP TABLE IF EXISTS `settlement_batch`;
-- DROP TABLE IF EXISTS `bank_account`;
