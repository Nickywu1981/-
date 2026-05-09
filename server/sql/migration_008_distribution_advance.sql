-- ============================================================
-- Movio AI v4.1 — M008 distribution_advance (分销进阶)
-- 等级体系 / 团队业绩 / 推广素材 / 提现 / 裂变活动
-- ============================================================

-- --------------------------------
-- 1. distributor_relation — 分销关系绑定表
-- --------------------------------
CREATE TABLE IF NOT EXISTS `distributor_relation` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '被邀请用户ID',
  `parent_id` BIGINT UNSIGNED NOT NULL COMMENT '一级邀请人ID',
  `grandparent_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '二级邀请人ID',
  `level` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '分销层级: 1=直推, 2=间推',
  `bound_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_parent_id` (`parent_id`),
  INDEX `idx_grandparent_id` (`grandparent_id`),
  INDEX `idx_level` (`level`),
  INDEX `idx_bound_at` (`bound_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分销关系绑定表';

-- --------------------------------
-- 2. distributor_commission — 分销佣金记录表
-- --------------------------------
CREATE TABLE IF NOT EXISTS `distributor_commission` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `distributor_id` BIGINT UNSIGNED NOT NULL COMMENT '推广人ID',
  `consumer_id` BIGINT UNSIGNED NOT NULL COMMENT '消费用户ID',
  `order_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '关联订单号',
  `order_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '订单金额',
  `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '佣金比例(%)',
  `commission` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '佣金金额',
  `level` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '佣金层级: 1=直推, 2=间推',
  `status` ENUM('pending','settled','withdrawn','cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `settled_at` DATETIME DEFAULT NULL COMMENT '结算/提现时间',
  PRIMARY KEY (`id`),
  INDEX `idx_distributor_id` (`distributor_id`),
  INDEX `idx_consumer_id` (`consumer_id`),
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_distributor_status` (`distributor_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分销佣金记录表';

-- --------------------------------
-- 3. distributor_withdrawal — 提现记录表
-- --------------------------------
CREATE TABLE IF NOT EXISTS `distributor_withdrawal` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '申请人ID',
  `amount` DECIMAL(12,2) NOT NULL COMMENT '提现金额',
  `status` ENUM('pending','processing','completed','rejected') NOT NULL DEFAULT 'pending' COMMENT '状态',
  `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `processed_at` DATETIME DEFAULT NULL COMMENT '处理时间',
  `reject_reason` VARCHAR(500) DEFAULT NULL COMMENT '驳回原因',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_requested_at` (`requested_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分销提现记录表';

-- --------------------------------
-- 4. distributor_campaign — 裂变活动定义表
-- --------------------------------
CREATE TABLE IF NOT EXISTS `distributor_campaign` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_id` VARCHAR(64) NOT NULL COMMENT '活动唯一标识',
  `title` VARCHAR(200) NOT NULL COMMENT '活动标题',
  `description` TEXT COMMENT '活动描述',
  `bonus_rate` DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT '佣金翻倍系数',
  `target_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '目标邀请人数',
  `reward` VARCHAR(200) DEFAULT '' COMMENT '奖励描述',
  `active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
  `start_at` DATETIME DEFAULT NULL COMMENT '开始时间',
  `end_at` DATETIME DEFAULT NULL COMMENT '结束时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_campaign_id` (`campaign_id`),
  INDEX `idx_active` (`active`),
  INDEX `idx_start_end` (`start_at`, `end_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='裂变活动定义表';

-- --------------------------------
-- 5. distributor_campaign_progress — 用户活动进度表
-- --------------------------------
CREATE TABLE IF NOT EXISTS `distributor_campaign_progress` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `campaign_id` VARCHAR(64) NOT NULL COMMENT '活动ID',
  `progress` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当前进度(邀请人数)',
  `target` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '目标值',
  `completed_at` DATETIME DEFAULT NULL COMMENT '完成时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_campaign` (`user_id`, `campaign_id`),
  INDEX `idx_campaign_id` (`campaign_id`),
  INDEX `idx_completed_at` (`completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户活动进度表';

-- ============================================================
-- 种子数据
-- ============================================================

-- 等级定义（存储于配置或硬编码，此处仅插入活动数据）
-- 铜牌推广 / 银牌推广 / 金牌推广 / 钻石合伙人 由 Service 层常量定义

-- 裂变活动种子数据
INSERT IGNORE INTO `distributor_campaign` (`campaign_id`, `title`, `description`, `bonus_rate`, `target_count`, `reward`, `active`, `start_at`, `end_at`) VALUES
('double_commission', '双倍佣金周', '活动期间直推佣金翻倍至30%，邀请越多赚越多！', 2.00, 0, '双倍佣金', 1, '2026-05-01 00:00:00', '2026-06-30 23:59:59'),
('invite_3_reward', '拉3送VIP', '成功邀请3位有效用户注册并消费，赠送1个月高级会员', 1.00, 3, '1month_vip', 1, '2026-05-01 00:00:00', '2026-12-31 23:59:59'),
('invite_10_bonus', '十人斩奖励', '累计邀请10位有效用户，额外奖励现金红包100元', 1.50, 10, 'cash_100', 1, '2026-05-01 00:00:00', '2026-12-31 23:59:59');
