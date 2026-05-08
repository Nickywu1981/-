-- migration_002_diy_enhance.sql
-- P0: 增强 DIY 页面 — 双端配置 + 完整状态机 + 自动版本 + Redis缓存

ALTER TABLE `diy_page`
  CHANGE `config_json` `mobile_config` longtext COMMENT '移动端配置JSON',
  ADD COLUMN `pc_config` longtext COMMENT 'PC端配置JSON' AFTER `mobile_config`,
  ADD COLUMN `owner_id` int unsigned NOT NULL DEFAULT '0' COMMENT '创建人ID' AFTER `tenant_id`,
  ADD COLUMN `access_type` varchar(10) NOT NULL DEFAULT 'public' COMMENT 'public=公共, private=私有' AFTER `page_type`,
  ADD COLUMN `offline_time` datetime DEFAULT NULL COMMENT '计划下线时间' AFTER `publish_time`,
  ADD COLUMN `access_count` int unsigned NOT NULL DEFAULT '0' COMMENT '访问次数' AFTER `offline_time`,
  ADD COLUMN `latest_published_version` int unsigned DEFAULT NULL COMMENT '最新已发布版本号' AFTER `access_count`,
  MODIFY `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=草稿 1=已发布 2=已下线 3=回收站',
  ADD INDEX `idx_owner` (`owner_id`),
  ADD INDEX `idx_status_tenant` (`status`, `tenant_id`);

ALTER TABLE `diy_page_version`
  ADD COLUMN `auto_save` tinyint NOT NULL DEFAULT '0' COMMENT '0=手动 1=自动保存' AFTER `remark`,
  ADD COLUMN `pc_config` longtext COMMENT 'PC端配置JSON' AFTER `mobile_config`,
  ADD COLUMN `rollback_from` int unsigned DEFAULT NULL COMMENT '回滚来源版本号' AFTER `auto_save`,
  CHANGE `config_json` `mobile_config` longtext NOT NULL COMMENT '移动端配置JSON';

-- 管理员手动清理自动版本（保留近30个）
-- DELETE FROM diy_page_version WHERE auto_save = 1 AND id NOT IN (SELECT id FROM (SELECT id FROM diy_page_version WHERE page_id = ? AND auto_save = 1 ORDER BY id DESC LIMIT 30) t);
