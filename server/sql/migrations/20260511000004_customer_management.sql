-- ============================================
-- Phase 7: 客户管理模块 — 数据模型
-- 日期: 2026-05-11
-- ============================================

-- UP ──────────────────────────────────────────────────────────

USE ai_saas;

-- ----------------------------
-- 1. customer_tag 表 — 客户标签分组
-- ----------------------------
CREATE TABLE IF NOT EXISTS `customer_tag` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `tenant_id` INT UNSIGNED NOT NULL COMMENT '租户ID(企业/代理)',
  `name` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `color` VARCHAR(7) NOT NULL DEFAULT '#3B82F6' COMMENT '标签颜色(hex)',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序权重',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0=未删 1=已删',
  PRIMARY KEY (`id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户标签分组表';

-- ----------------------------
-- 2. customer_tag_rel 表 — 用户-标签关联
-- ----------------------------
CREATE TABLE IF NOT EXISTS `customer_tag_rel` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `tag_id` INT UNSIGNED NOT NULL COMMENT '标签ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID(C端)',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '打标时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_user` (`tag_id`, `user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='客户-标签关联表';

-- ----------------------------
-- 3. consumption_record 扩展 — 订单来源企业
-- ----------------------------
ALTER TABLE `consumption_record`
  ADD COLUMN IF NOT EXISTS `source_tenant_id` INT UNSIGNED DEFAULT NULL COMMENT '订单来源企业/代理ID' AFTER `user_id`;

ALTER TABLE `consumption_record`
  ADD INDEX IF NOT EXISTS `idx_source_tenant_id` (`source_tenant_id`);

-- DOWN ────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS `customer_tag_rel`;
-- DROP TABLE IF EXISTS `customer_tag`;
-- ALTER TABLE `consumption_record` DROP COLUMN `source_tenant_id`, DROP INDEX `idx_source_tenant_id`;
