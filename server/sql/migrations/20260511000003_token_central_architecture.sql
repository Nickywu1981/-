-- ============================================
-- Phase 0-C: Token 集约化运营架构 — 数据模型
-- 日期: 2026-05-11
-- 说明: 统一 Token 计量、成本核算、聚合统计、配额预留
-- ============================================

-- UP ═══════════════════════════════════════════════════════════════

USE ai_saas;

-- ----------------------------
-- 1. ai_model_pricing — 模型 Token 定价表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ai_model_pricing` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `model_key` VARCHAR(64) NOT NULL COMMENT '模型标识(关联 ai_model_config.model_key)',
  `category` ENUM('text','image','video','audio') NOT NULL COMMENT '模型类别',
  `pricing_type` ENUM('token','image','second','request') NOT NULL DEFAULT 'token'
    COMMENT '计费类型: token=按Token, image=按张, second=按秒, request=按次',
  `price_per_unit_in` DECIMAL(10,8) NOT NULL DEFAULT 0.00000000
    COMMENT '输入单价(元/单位)',
  `price_per_unit_out` DECIMAL(10,8) NOT NULL DEFAULT 0.00000000
    COMMENT '输出单价(元/单位)',
  `currency` VARCHAR(8) NOT NULL DEFAULT 'CNY',
  `effective_from` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生效时间',
  `effective_to` DATETIME DEFAULT NULL COMMENT '失效时间(NULL=永久有效)',
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_active_from` (`model_key`, `is_active`, `effective_from`),
  KEY `idx_active` (`is_active`, `effective_from`, `effective_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI模型Token定价表';

-- ----------------------------
-- 2. ai_call_log 扩展 — 成本核算字段
-- ----------------------------
ALTER TABLE `ai_call_log`
  ADD COLUMN IF NOT EXISTS `cost_amount` DECIMAL(12,6) NOT NULL DEFAULT 0.000000
    COMMENT '实际消耗金额(元)' AFTER `tokens_out`;

ALTER TABLE `ai_call_log`
  ADD COLUMN IF NOT EXISTS `cost_currency` VARCHAR(8) NOT NULL DEFAULT 'CNY'
    COMMENT '币种' AFTER `cost_amount`;

ALTER TABLE `ai_call_log`
  ADD COLUMN IF NOT EXISTS `pricing_id` INT UNSIGNED DEFAULT NULL
    COMMENT '关联 ai_model_pricing.id' AFTER `cost_currency`;

ALTER TABLE `ai_call_log`
  ADD COLUMN IF NOT EXISTS `cost_details` JSON DEFAULT NULL
    COMMENT '费用明细: {price_in, price_out, calc_formula, tokens_in, tokens_out}' AFTER `pricing_id`;

ALTER TABLE `ai_call_log`
  ADD COLUMN IF NOT EXISTS `correlation_id` VARCHAR(36) DEFAULT NULL
    COMMENT '全链路追踪UUID' AFTER `cost_details`;

ALTER TABLE `ai_call_log`
  ADD COLUMN IF NOT EXISTS `source` ENUM('consumer','enterprise','agent','open_api','internal')
    NOT NULL DEFAULT 'consumer' COMMENT '调用来源端' AFTER `correlation_id`;

ALTER TABLE `ai_call_log`
  ADD INDEX IF NOT EXISTS `idx_cost_amount` (`cost_amount`);

ALTER TABLE `ai_call_log`
  ADD INDEX IF NOT EXISTS `idx_source` (`source`);

ALTER TABLE `ai_call_log`
  ADD INDEX IF NOT EXISTS `idx_correlation_id` (`correlation_id`);

ALTER TABLE `ai_call_log`
  ADD INDEX IF NOT EXISTS `idx_call_created` (`create_time`, `source`);

-- ----------------------------
-- 3. ai_token_aggregation — 实时聚合计数器
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ai_token_aggregation` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dimension` ENUM('user','tenant','model','task_type','source','hourly') NOT NULL
    COMMENT '聚合维度',
  `dimension_id` VARCHAR(128) NOT NULL COMMENT '维度标识(user_id / tenant_id / model_key / task_type / source / YYYYMMDDHH)',
  `period_key` VARCHAR(32) NOT NULL COMMENT '聚合周期: YYYYMMDD 或 YYYYMMDDHH',
  `call_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `tokens_in` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `tokens_out` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `total_tokens` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'tokens_in + tokens_out',
  `total_cost` DECIMAL(14,6) NOT NULL DEFAULT 0.000000 COMMENT '累计费用',
  `success_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `error_count` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `avg_latency_ms` DOUBLE NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dim_period` (`dimension`, `dimension_id`, `period_key`),
  KEY `idx_period` (`period_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token消耗聚合表(实时统计)';

-- ----------------------------
-- 4. ai_token_quota — Token 配额表 (Phase 2 扩展)
-- ----------------------------
CREATE TABLE IF NOT EXISTS `ai_token_quota` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `subject_type` ENUM('user','enterprise','agent') NOT NULL COMMENT '配额主体类型',
  `subject_id` INT UNSIGNED NOT NULL COMMENT 'user.id 或 tenant.id',
  `period_type` ENUM('daily','monthly','total') NOT NULL DEFAULT 'monthly' COMMENT '配额周期',
  `quota_tokens` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Token配额(0=无限制)',
  `used_tokens` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '周期内已使用Token',
  `quota_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '金额配额(0=无限制)',
  `used_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT '周期内已使用金额',
  `period_start` DATE NOT NULL COMMENT '周期起始日期',
  `period_end` DATE NOT NULL COMMENT '周期结束日期',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=禁用',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subject_period` (`subject_type`, `subject_id`, `period_type`, `period_start`),
  KEY `idx_subject` (`subject_type`, `subject_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI Token配额表(Phase 2扩展点)';

-- ----------------------------
-- 5. ai_model_config 扩展 — 默认定价引用
-- ----------------------------
ALTER TABLE `ai_model_config`
  ADD COLUMN IF NOT EXISTS `default_pricing_id` INT UNSIGNED DEFAULT NULL
    COMMENT '默认定价ID(关联 ai_model_pricing.id)' AFTER `avg_latency_ms`;

-- ----------------------------
-- 6. 种子数据 — 初始定价 (含全部已注册模型)
-- ----------------------------
INSERT INTO `ai_model_pricing` (model_key, category, pricing_type, price_per_unit_in, price_per_unit_out) VALUES
-- 文本大模型
('gpt-5.5',             'text',  'token',  0.000015, 0.000060),
('gpt-4o',              'text',  'token',  0.000010, 0.000040),
('gpt-4o-mini',         'text',  'token',  0.000001, 0.000004),
('claude-opus-4-7',     'text',  'token',  0.000015, 0.000075),
('claude-sonnet-4-6',   'text',  'token',  0.000015, 0.000075),
('claude-haiku-4-5',    'text',  'token',  0.000001, 0.000005),
('deepseek-v4-pro',     'text',  'token',  0.000002, 0.000008),
('deepseek-v4-flash',   'text',  'token',  0.000001, 0.000004),
-- 图片生成模型
('stable-diffusion-xl',       'image', 'image',  0.040000, 0.040000),
('stable-diffusion-img2img',  'image', 'image',  0.030000, 0.030000),
('dall-e-3',                  'image', 'image',  0.120000, 0.120000),
-- 音频模型
('edge-tts',                  'audio', 'second', 0.000000, 0.000000),
('elevenlabs-voice-clone',    'audio', 'second', 0.000050, 0.000050)
ON DUPLICATE KEY UPDATE price_per_unit_in=VALUES(price_per_unit_in), price_per_unit_out=VALUES(price_per_unit_out);

-- DOWN ═══════════════════════════════════════════════════════════════
-- DROP TABLE IF EXISTS `ai_model_pricing`;
-- ALTER TABLE `ai_call_log`
--   DROP COLUMN `cost_amount`, DROP COLUMN `cost_currency`, DROP COLUMN `pricing_id`,
--   DROP COLUMN `cost_details`, DROP COLUMN `correlation_id`, DROP COLUMN `source`;
-- DROP TABLE IF EXISTS `ai_token_aggregation`;
-- DROP TABLE IF EXISTS `ai_token_quota`;
-- ALTER TABLE `ai_model_config` DROP COLUMN `default_pricing_id`;
