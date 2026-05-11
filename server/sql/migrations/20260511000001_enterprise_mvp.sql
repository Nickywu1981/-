-- ============================================
-- Phase 1: 企业/代理端 MVP — 数据模型扩展
-- 日期: 2026-05-11
-- ============================================

-- UP ──────────────────────────────────────────────────────────

USE ai_saas;

-- ----------------------------
-- 1. tenant 表扩展 — 企业/代理能力
-- ----------------------------
ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `type` ENUM('enterprise','agent','partner') NOT NULL DEFAULT 'enterprise' COMMENT '租户类型: enterprise=企业 agent=代理商 partner=合作伙伴' AFTER `code`;

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `parent_tenant_id` INT UNSIGNED DEFAULT NULL COMMENT '上级代理/企业ID(代理层级)' AFTER `type`;

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `white_label` JSON COMMENT '白标配置: {logo, primary_color, domain, site_name}' AFTER `domain`;

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `balance` DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '企业账户余额(元)' AFTER `quota_video`;

ALTER TABLE `tenant`
  ADD COLUMN IF NOT EXISTS `commission_rate` DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT '分佣比例(%)' AFTER `balance`;

-- 为 type 和 parent_tenant_id 添加索引
ALTER TABLE `tenant`
  ADD INDEX IF NOT EXISTS `idx_type` (`type`);

ALTER TABLE `tenant`
  ADD INDEX IF NOT EXISTS `idx_parent_tenant_id` (`parent_tenant_id`);

-- ----------------------------
-- 2. 企业子账号表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `enterprise_user` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `tenant_id` INT UNSIGNED NOT NULL COMMENT '租户ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `role` ENUM('enterprise_admin','enterprise_operator','enterprise_viewer') NOT NULL DEFAULT 'enterprise_operator' COMMENT '企业内角色',
  `permissions` JSON COMMENT '自定义权限点(覆盖默认角色权限)',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=禁用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0=未删 1=已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tenant_user` (`tenant_id`, `user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业子账号表';

-- ----------------------------
-- 3. open_api_key 表扩展 — key_type 分类
-- ----------------------------
ALTER TABLE `open_api_key`
  ADD COLUMN IF NOT EXISTS `key_type` ENUM('personal','enterprise') NOT NULL DEFAULT 'personal' COMMENT '密钥类型: personal=个人 enterprise=企业' AFTER `daily_limit`;

-- ----------------------------
-- 4. operation_log 表扩展 — source 字段区分各端操作
-- ----------------------------
ALTER TABLE `operation_log`
  ADD COLUMN IF NOT EXISTS `source` ENUM('consumer','enterprise','admin','ops','internal') NOT NULL DEFAULT 'consumer' COMMENT '操作来源端' AFTER `user_id`;

-- DOWN ────────────────────────────────────────────────────────
-- ALTER TABLE `tenant` DROP COLUMN `type`, DROP COLUMN `parent_tenant_id`, DROP COLUMN `white_label`, DROP COLUMN `balance`, DROP COLUMN `commission_rate`;
-- ALTER TABLE `tenant` DROP INDEX `idx_type`, DROP INDEX `idx_parent_tenant_id`;
-- DROP TABLE IF EXISTS `enterprise_user`;
-- ALTER TABLE `open_api_key` DROP COLUMN `key_type`;
-- ALTER TABLE `operation_log` DROP COLUMN `source`;
