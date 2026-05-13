-- migration_010_diy_templates.sql
-- DIY 模板库表 + 20 个行业模板种子数据

CREATE TABLE IF NOT EXISTS `diy_template` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `title` varchar(100) NOT NULL COMMENT '模板名称',
  `industry` varchar(50) NOT NULL COMMENT '行业标签',
  `page_type` enum('pc','mobile','h5') NOT NULL DEFAULT 'mobile',
  `thumbnail` varchar(300) DEFAULT NULL COMMENT '缩略图URL',
  `mobile_config` longtext NOT NULL COMMENT '移动端配置JSON',
  `pc_config` longtext COMMENT 'PC端配置JSON',
  `description` varchar(500) DEFAULT NULL COMMENT '模板描述',
  `tags` varchar(200) DEFAULT NULL COMMENT '标签(逗号分隔)',
  `use_count` int unsigned NOT NULL DEFAULT '0' COMMENT '使用次数',
  `is_official` tinyint NOT NULL DEFAULT '1' COMMENT '0=用户分享 1=官方',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '0=下架 1=上架',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_industry` (`industry`),
  INDEX `idx_status_tenant` (`status`, `tenant_id`),
  INDEX `idx_use_count` (`use_count` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='DIY页面模板库';
