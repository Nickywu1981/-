-- Migration: Add missing indexes for DAO hot-path queries (Y2 round 2)
-- Date: 2026-05-15
-- Description: Follow-up to 20260513000003_critical_indexes.sql.
--   Targets tables confirmed to lack secondary indexes on frequently filtered columns.
--
-- 1. sensitive_word — called on every content safety check (text/image input)
--    DAO: WHERE tenant_id = ? — full table scan without this index
-- 2. help_faq — user-facing FAQ listing
--    DAO: WHERE tenant_id = ? AND status = 1 AND category = ? — zero secondary indexes
-- 3. prompt_template — hot-path listTemplates (AI创作模板广场)
--    DAO: WHERE category = ? AND status = ? ORDER BY sort_order DESC, usage_count DESC
--    Only has UNIQUE(template_code); category/status filter goes unindexed

-- 1. 敏感词库 — 每次内容安全检测必查 tenant_id
ALTER TABLE `sensitive_word` ADD INDEX `idx_tenant` (`tenant_id`);

-- 2. 帮助FAQ — 用户端FAQ列表查询
ALTER TABLE `help_faq` ADD INDEX `idx_tenant_status_category` (`tenant_id`, `status`, `category`);

-- 3. 提示词模板 — AI创作模板广场热路径
ALTER TABLE `prompt_template` ADD INDEX `idx_status_category` (`status`, `category`);

-- ============================================================
-- NOTE: The following tables are queried by columns that MAY
-- need indexes. Their CREATE TABLE definitions were not found
-- in the SQL migration directory. Run EXPLAIN on their DAO
-- queries before adding indexes:
--
--   copywriting_history  WHERE user_id = ? ORDER BY created_at DESC
--   digital_human_jobs   WHERE user_id = ? / WHERE tenant_id = ?
--   video_translate_jobs WHERE user_id = ?
--   sys_config_log       WHERE config_key = ?
--   abuse_records        WHERE user_id = ?
--   i18n_translation_log WHERE key_name = ?
--   user_works           WHERE user_id = ?
--   template_marketplace WHERE category = ?
--   ai_model_config      WHERE model_key = ?
--   ai_call_log          WHERE user_id = ?
-- ============================================================

-- DOWN
-- ALTER TABLE `prompt_template` DROP INDEX `idx_status_category`;
-- ALTER TABLE `help_faq` DROP INDEX `idx_tenant_status_category`;
-- ALTER TABLE `sensitive_word` DROP INDEX `idx_tenant`;
