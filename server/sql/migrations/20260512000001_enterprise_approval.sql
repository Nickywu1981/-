-- ============================================
-- Phase 2: 企业入驻审批状态机
-- 日期: 2026-05-12
-- 前置: 20260511000008_tenant_approval.sql (review_status ENUM 已添加)
-- ============================================

-- UP ──────────────────────────────────────────────────────────

USE ai_saas;

-- 1. tenant 表扩展 — 审批元数据 (review_status 已存在于 20260511000008)
ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `approved_at` DATETIME DEFAULT NULL COMMENT '审批通过时间' AFTER `review_remark`;

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `approved_by` INT UNSIGNED DEFAULT NULL COMMENT '审批人(admin user id)' AFTER `approved_at`;

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `reviewed_at` DATETIME DEFAULT NULL COMMENT '最近审核时间' AFTER `approved_by`;

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `qualification_docs` JSON COMMENT '资质文件: [{type, url, name}]' AFTER `reviewed_at`;

ALTER TABLE `tenant`
  ADD INDEX IF NOT EXISTS `idx_approved_by` (`approved_by`);

ALTER TABLE `tenant`
  ADD INDEX IF NOT EXISTS `idx_reviewed_at` (`reviewed_at`);

-- 2. 审批操作日志表
CREATE TABLE IF NOT EXISTS `enterprise_approval_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `tenant_id` INT UNSIGNED NOT NULL COMMENT '租户ID',
  `action` ENUM('submit','approve','reject','suspend','reinstate','update_docs') NOT NULL COMMENT '操作类型',
  `operator_id` INT UNSIGNED NOT NULL COMMENT '操作人(admin user id)',
  `old_status` VARCHAR(32) COMMENT '变更前状态',
  `new_status` VARCHAR(32) NOT NULL COMMENT '变更后状态',
  `reason` TEXT COMMENT '操作原因/备注',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_operator_id` (`operator_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业审批操作日志';

-- 3. 将存量 active 状态租户标记为 approved
UPDATE `tenant` SET `review_status` = 'approved' WHERE `status` = 1 AND `review_status` = 'pending' AND `create_time` < NOW();

-- DOWN ────────────────────────────────────────────────────────
-- ALTER TABLE `tenant` DROP COLUMN `approved_at`, DROP COLUMN `approved_by`, DROP COLUMN `reviewed_at`, DROP COLUMN `qualification_docs`;
-- ALTER TABLE `tenant` DROP INDEX `idx_approved_by`, DROP INDEX `idx_reviewed_at`;
-- DROP TABLE IF EXISTS `enterprise_approval_log`;
