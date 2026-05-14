-- migration_014_template_reconcile.sql
-- 修复 diy_template 两个迁移文件之间的 schema 冲突 (migration_010 vs schema_alignment)
-- 问题：两个 CREATE TABLE IF NOT EXISTS 导致不确定的表结构
-- 解决：显式 ALTER 确保最终 schema 一致

-- 1. 确保 tenant_id 列存在（为未来用户分享模板预留）
SET @tenant_col = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diy_template' AND COLUMN_NAME = 'tenant_id');
SET @sql = IF(@tenant_col = 0, 'ALTER TABLE diy_template ADD COLUMN tenant_id INT UNSIGNED NOT NULL DEFAULT 0 AFTER id', 'SELECT "tenant_id already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 确保 idx_use_count 索引存在（DAO listTemplates ORDER BY use_count DESC 依赖）
SET @idx_use = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diy_template' AND INDEX_NAME = 'idx_use_count');
SET @sql = IF(@idx_use = 0, 'ALTER TABLE diy_template ADD INDEX idx_use_count (use_count DESC)', 'SELECT "idx_use_count already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 确保 idx_status 索引存在（schema_alignment 可能被 migration_010 跳过导致缺失）
SET @idx_status = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'diy_template' AND INDEX_NAME = 'idx_status');
SET @sql = IF(@idx_status = 0, 'ALTER TABLE diy_template ADD INDEX idx_status (status)', 'SELECT "idx_status already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
