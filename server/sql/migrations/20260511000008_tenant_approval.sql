-- ============================================
-- Round 89: 企业入驻审核流
-- 日期: 2026-05-11
-- ============================================

USE ai_saas;

-- 1. tenant 表增加审核状态字段（MySQL 5.7 兼容写法）
DROP PROCEDURE IF EXISTS add_tenant_review_columns;

DELIMITER //
CREATE PROCEDURE add_tenant_review_columns()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai_saas' AND table_name = 'tenant' AND column_name = 'review_status') THEN
    ALTER TABLE `tenant` ADD COLUMN `review_status` ENUM('pending','under_review','approved','rejected') NOT NULL DEFAULT 'approved' COMMENT '审核状态' AFTER `status`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai_saas' AND table_name = 'tenant' AND column_name = 'review_remark') THEN
    ALTER TABLE `tenant` ADD COLUMN `review_remark` VARCHAR(500) DEFAULT NULL COMMENT '审核备注/驳回原因' AFTER `review_status`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai_saas' AND table_name = 'tenant' AND column_name = 'reviewed_by') THEN
    ALTER TABLE `tenant` ADD COLUMN `reviewed_by` INT UNSIGNED DEFAULT NULL COMMENT '审核人ID' AFTER `review_remark`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai_saas' AND table_name = 'tenant' AND column_name = 'reviewed_at') THEN
    ALTER TABLE `tenant` ADD COLUMN `reviewed_at` DATETIME DEFAULT NULL COMMENT '审核时间' AFTER `reviewed_by`;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics WHERE table_schema = 'ai_saas' AND table_name = 'tenant' AND index_name = 'idx_review_status') THEN
    ALTER TABLE `tenant` ADD INDEX `idx_review_status` (`review_status`);
  END IF;
END //
DELIMITER ;

CALL add_tenant_review_columns();
DROP PROCEDURE IF EXISTS add_tenant_review_columns;

-- 为已存在的启用租户设 approved（历史数据兼容）
UPDATE `tenant` SET `review_status` = 'approved' WHERE `status` = 'active' AND `review_status` = 'pending';
