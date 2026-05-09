-- ============================================================
-- Movio AI v4.1 — M007_video_translate 视频翻译全链路
-- ============================================================

-- 视频翻译任务表
CREATE TABLE IF NOT EXISTS `video_translate_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  `type` ENUM('voice','subtitles','face') NOT NULL COMMENT '翻译类型：语音翻译/字幕翻译/面容翻译',
  `source_lang` VARCHAR(10) NOT NULL DEFAULT 'zh' COMMENT '源语言代码',
  `target_lang` VARCHAR(10) NOT NULL COMMENT '目标语言代码',
  `input_url` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '输入视频URL',
  `output_url` VARCHAR(1024) NOT NULL DEFAULT '' COMMENT '输出结果URL',
  `status` ENUM('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued' COMMENT '任务状态',
  `priority` TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '优先级 1-10 数字越小优先级越高',
  `extra_params` JSON DEFAULT NULL COMMENT '附加参数(voiceType/subtitleStyle/avatarStyle等)',
  `progress` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '进度 0-100',
  `error_msg` VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
  `job_queue_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '关联job_queue任务ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_type` (`type`),
  INDEX `idx_status` (`status`),
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  INDEX `idx_job_queue_id` (`job_queue_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频翻译任务记录';

-- 视频翻译配置表
CREATE TABLE IF NOT EXISTS `video_translate_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(64) NOT NULL COMMENT '配置键',
  `config_value` TEXT NOT NULL COMMENT '配置值',
  `description` VARCHAR(255) DEFAULT '' COMMENT '配置描述',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频翻译系统配置';

-- ============================================================
-- 种子数据：11 种语言配置
-- ============================================================

-- 语言列表 JSON 配置
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('supported_languages', '[
  {"code":"zh","label":"中文","flag":"🇨🇳"},
  {"code":"en","label":"English","flag":"🇺🇸"},
  {"code":"ja","label":"日本語","flag":"🇯🇵"},
  {"code":"ko","label":"한국어","flag":"🇰🇷"},
  {"code":"es","label":"Español","flag":"🇪🇸"},
  {"code":"fr","label":"Français","flag":"🇫🇷"},
  {"code":"de","label":"Deutsch","flag":"🇩🇪"},
  {"code":"pt","label":"Português","flag":"🇧🇷"},
  {"code":"ar","label":"العربية","flag":"🇸🇦"},
  {"code":"th","label":"ไทย","flag":"🇹🇭"},
  {"code":"vi","label":"Tiếng Việt","flag":"🇻🇳"},
  {"code":"id","label":"Bahasa Indonesia","flag":"🇮🇩"}
]', '支持的语言列表(12种)');

-- 语音翻译配置
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('voice_types', '[
  {"value":"natural","label":"自然音色","description":"日常对话风格"},
  {"value":"professional","label":"专业播音","description":"新闻播报风格"},
  {"value":"casual","label":"休闲风格","description":"轻松随意风格"},
  {"value":"formal","label":"正式风格","description":"商务正式风格"}
]', '配音音色选项');

-- 字幕样式配置
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('subtitle_styles', '[
  {"value":"default","label":"默认样式","description":"标准白色字幕"},
  {"value":"minimal","label":"极简白字","description":"简洁无边框"},
  {"value":"colorful","label":"彩色字幕","description":"区分说话人颜色"},
  {"value":"stroke","label":"描边字幕","description":"带黑色描边"}
]', '字幕样式选项');

-- 面容翻译数字人风格配置
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('avatar_styles', '[
  {"value":"original","label":"保留原貌","description":"保持人物原貌仅声音替换"},
  {"value":"cartoon","label":"卡通风格","description":"卡通化渲染人物"},
  {"value":"realistic","label":"写实风格","description":"超写实数字人"},
  {"value":"anime","label":"动漫风格","description":"二次元动漫风格"}
]', '数字人/面容风格选项');

-- 默认源语言
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('default_source_lang', '{"code":"zh","label":"中文"}', '默认源语言');

-- 默认目标语言
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('default_target_lang', '{"code":"en","label":"English"}', '默认目标语言');

-- 最大视频大小 (MB)
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('max_video_size_mb', '{"value":500}', '最大上传视频大小(MB)');

-- 支持视频格式
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('supported_video_formats', '{"formats":["mp4","mov","avi","webm","mkv","flv"]}', '支持的视频文件格式');

-- 翻译费用（点数）
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('translate_cost_points', '{"voice":10,"subtitles":5,"face":15,"per_minute":2}', '翻译消耗积分配置');

-- Mock AI管线超时（秒）
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('mock_pipeline_timeout_seconds', '{"value":5}', 'Mock模式AI管线超时秒数');

-- AI管线状态
INSERT IGNORE INTO `video_translate_config` (`config_key`, `config_value`, `description`) VALUES
('ai_pipeline_mode', '{"mode":"mock","description":"当前使用Mock模式，接入真实AI API后切换为production"}', 'AI管线运行模式');
