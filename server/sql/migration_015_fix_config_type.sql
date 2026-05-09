-- Migration: site_config 补全 config_type 列
-- siteConfigDao.js upsert 使用 config_type 列，但 migration_014 DDL 不含此列

ALTER TABLE site_config
  ADD COLUMN config_type VARCHAR(20) NOT NULL DEFAULT 'json' AFTER config_value;
