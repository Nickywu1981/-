-- ============================================
-- 多模型统一调度 — ai_models 表
-- G1 Architect | Phase 1: 模型分类管理 + 调度配置
-- ============================================

CREATE TABLE IF NOT EXISTS `ai_models` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模型ID',
  `model_id` VARCHAR(64) NOT NULL COMMENT '模型标识 (gpt-4o/claude-sonnet-4-6/seedance-2.0)',
  `name` VARCHAR(128) NOT NULL COMMENT '模型名称',
  `category` ENUM('text','image','video') NOT NULL DEFAULT 'text' COMMENT '模型分类: text/image/video',
  `provider` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '提供商 (openai/anthropic/alibaba等)',
  `endpoint` VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'API 端点',
  `api_key_env` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '.env 中 API Key 变量名',
  `capability` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT '能力评分 0-100',
  `cost_score` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT '成本评分 0-100 (越高越便宜)',
  `latency_score` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT '延迟评分 0-100',
  `accuracy_score` TINYINT UNSIGNED NOT NULL DEFAULT 50 COMMENT '准确度评分 0-100',
  `supports_fallback` TINYINT NOT NULL DEFAULT 1 COMMENT '是否支持作为降级模型',
  `fallback_chain` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '降级链 (逗号分隔)',
  `is_active` TINYINT NOT NULL DEFAULT 1 COMMENT '是否启用: 1=启用 0=停用',
  `priority` INT NOT NULL DEFAULT 0 COMMENT '优先级 (越大越优先)',
  `max_concurrency` INT UNSIGNED NOT NULL DEFAULT 5 COMMENT '最大并发数',
  `rate_limit_per_min` INT UNSIGNED NOT NULL DEFAULT 10 COMMENT '每分钟限流',
  `config_json` JSON DEFAULT NULL COMMENT '扩展配置 (JSON)',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_id` (`model_id`),
  KEY `idx_category` (`category`),
  KEY `idx_active` (`is_active`),
  KEY `idx_category_active` (`category`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 模型配置表';

-- ============================================
-- 模型分类管理 — model_categories 元数据表
-- ============================================

CREATE TABLE IF NOT EXISTS `model_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` ENUM('text','image','video') NOT NULL UNIQUE,
  `label_zh` VARCHAR(32) NOT NULL COMMENT '中文名称',
  `label_en` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '英文名称',
  `description` VARCHAR(255) NOT NULL DEFAULT '',
  `sort_order` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型分类元数据';

INSERT INTO `model_categories` (category, label_zh, label_en, sort_order) VALUES
('text', '文本处理', 'Text', 1),
('image', '图片生成', 'Image', 2),
('video', '视频生成', 'Video', 3)
ON DUPLICATE KEY UPDATE label_zh=VALUES(label_zh);

-- ============================================
-- 种子数据 — 预置模型
-- ============================================

INSERT INTO `ai_models` (model_id, name, category, provider, endpoint, api_key_env, capability, cost_score, latency_score, accuracy_score, fallback_chain, is_active, priority) VALUES
-- 文本类
('gpt-4o', 'GPT-4o', 'text', 'openai', 'https://api.openai.com/v1/chat/completions', 'OPENAI_API_KEY', 90, 60, 70, 90, 'gpt-4o-mini,claude-sonnet-4-6', 1, 100),
('gpt-4o-mini', 'GPT-4o Mini', 'text', 'openai', 'https://api.openai.com/v1/chat/completions', 'OPENAI_API_KEY', 70, 90, 85, 75, 'claude-haiku-4-5', 1, 80),
('claude-sonnet-4-6', 'Claude Sonnet 4.6', 'text', 'anthropic', 'https://api.anthropic.com/v1/messages', 'CLAUDE_API_KEY', 88, 55, 65, 92, 'claude-haiku-4-5,gpt-4o-mini', 1, 90),
('claude-haiku-4-5', 'Claude Haiku 4.5', 'text', 'anthropic', 'https://api.anthropic.com/v1/messages', 'CLAUDE_API_KEY', 60, 85, 80, 68, 'gpt-4o-mini', 1, 70),
-- 图片类
('rmbg-2.0', 'Remove BG 2.0', 'image', 'movio', 'https://api.movio.ai/v1/images/rmbg', 'MOVIO_API_KEY', 75, 80, 90, 88, 'sam2-matting', 1, 100),
('iclight-v2', 'IC-Light V2', 'image', 'movio', 'https://api.movio.ai/v1/images/iclight', 'MOVIO_API_KEY', 78, 70, 75, 82, 'bg-postprocess', 1, 90),
-- 视频类
('seedance-2.0', 'Seedance 2.0', 'video', 'movio', 'https://api.movio.ai/v1/videos/seedance', 'MOVIO_API_KEY', 85, 50, 40, 85, 'pixeldance', 1, 100),
('pixeldance', 'PixelDance', 'video', 'movio', 'https://api.movio.ai/v1/videos/pixeldance', 'MOVIO_API_KEY', 80, 55, 45, 82, 'seedance-2.0', 1, 90)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================
-- 模型分类_任务类型映射表
-- ============================================

CREATE TABLE IF NOT EXISTS `model_task_mappings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_type` VARCHAR(64) NOT NULL COMMENT '任务类型 (cutout/img2video/script_gen等)',
  `category` ENUM('text','image','video') NOT NULL COMMENT '模型分类',
  `default_model_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '默认模型',
  `needs_multi_model` TINYINT NOT NULL DEFAULT 0 COMMENT '是否需要多模型协同',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_type` (`task_type`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务类型→模型映射';

INSERT INTO `model_task_mappings` (task_type, category, default_model_id, needs_multi_model) VALUES
('text_gen', 'text', 'gpt-4o', 0),
('script_gen', 'text', 'gpt-4o', 0),
('title_gen', 'text', 'gpt-4o-mini', 0),
('translate', 'text', 'gpt-4o-mini', 0),
('compliance_check', 'text', 'claude-sonnet-4-6', 1),
('cutout', 'image', 'rmbg-2.0', 0),
('cutout_hq', 'image', 'sam2-matting', 0),
('bg_white', 'image', 'bg-postprocess', 0),
('scene_gen', 'image', 'iclight-v2', 0),
('image_enhance', 'image', 'realesrgan', 0),
('img_expand', 'image', 'outpaint-sd', 0),
('poster_gen', 'image', 'poster-gen-v1', 1),
('virtual_tryon', 'image', 'virtual-tryon-v2', 0),
('img2video', 'video', 'seedance-2.0', 0),
('multi2video', 'video', 'pixeldance', 0),
('video_packaging', 'video', 'video-edit-v1', 1),
('action_transfer', 'video', 'seedance-2.0', 0),
('digital_human', 'video', 'seedance-2.0', 0)
ON DUPLICATE KEY UPDATE default_model_id=VALUES(default_model_id);

-- DOWN
DROP TABLE IF EXISTS `model_task_mappings`;
DROP TABLE IF EXISTS `model_categories`;
DROP TABLE IF EXISTS `ai_models`;
