-- ============================================================
-- 010 Hotfix: 对齐 diy_page / diy_page_version 表与 DAO 字段
-- ============================================================
ALTER TABLE diy_page
  ADD COLUMN IF NOT EXISTS owner_id INT UNSIGNED NOT NULL DEFAULT 0 AFTER tenant_id,
  ADD COLUMN IF NOT EXISTS access_type ENUM('public','private') NOT NULL DEFAULT 'public' AFTER page_type,
  ADD COLUMN IF NOT EXISTS mobile_config LONGTEXT NULL AFTER access_type,
  ADD COLUMN IF NOT EXISTS pc_config LONGTEXT NULL AFTER mobile_config,
  ADD COLUMN IF NOT EXISTS access_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER pc_config,
  ADD COLUMN IF NOT EXISTS latest_published_version INT UNSIGNED DEFAULT NULL AFTER access_count,
  ADD COLUMN IF NOT EXISTS offline_time DATETIME NULL AFTER publish_time;

-- 将现有 config_json 迁移到 mobile_config
UPDATE diy_page SET mobile_config = config_json WHERE mobile_config IS NULL AND config_json IS NOT NULL;

ALTER TABLE diy_page_version
  ADD COLUMN IF NOT EXISTS mobile_config LONGTEXT NULL AFTER version,
  ADD COLUMN IF NOT EXISTS pc_config LONGTEXT NULL AFTER mobile_config,
  ADD COLUMN IF NOT EXISTS auto_save TINYINT NOT NULL DEFAULT 0 AFTER pc_config,
  ADD COLUMN IF NOT EXISTS rollback_from INT UNSIGNED NULL AFTER auto_save;

-- 将现有 config_json 迁移到 mobile_config
UPDATE diy_page_version SET mobile_config = config_json WHERE mobile_config IS NULL AND config_json IS NOT NULL;

-- 确保 copywriting_history 表存在
CREATE TABLE IF NOT EXISTS copywriting_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('title','description','translate') NOT NULL DEFAULT 'title',
  inputs JSON NULL,
  outputs JSON NULL,
  model_id VARCHAR(50) NULL,
  token_used INT UNSIGNED DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success',
  error_msg TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
