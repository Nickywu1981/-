-- ============================================
-- Round 132: 工作流引擎
-- 日期: 2026-05-12
-- ============================================

USE ai_saas;

CREATE TABLE IF NOT EXISTS `workflow_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '模板描述',
  `steps` JSON NOT NULL COMMENT '步骤定义 [{type,label,inputs,outputs}]',
  `status` ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' COMMENT '状态',
  `created_by` INT UNSIGNED DEFAULT NULL COMMENT '创建人',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流模板';

CREATE TABLE IF NOT EXISTS `workflow_job` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `template_id` INT UNSIGNED DEFAULT NULL COMMENT '模板ID',
  `template_name` VARCHAR(100) DEFAULT NULL COMMENT '模板名称快照',
  `user_id` INT UNSIGNED NOT NULL COMMENT '触发人',
  `status` ENUM('pending','running','completed','failed','cancelled') NOT NULL DEFAULT 'pending' COMMENT '执行状态',
  `input_data` JSON DEFAULT NULL COMMENT '输入参数',
  `output_data` JSON DEFAULT NULL COMMENT '最终产出',
  `step_results` JSON DEFAULT NULL COMMENT '各步骤执行记录 [{step,status,startedAt,completedAt,output,error}]',
  `progress` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '进度 0-100',
  `error_message` VARCHAR(1000) DEFAULT NULL COMMENT '错误信息',
  `started_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='工作流执行记录';

-- 预置模板：电商商品主图批量生成
INSERT INTO `workflow_template` (`name`, `description`, `steps`, `status`) VALUES
('电商主图批量生成', '输入商品信息 → AI文案 → 主图生成 → 批量输出', '[
  {"type":"generate_text","label":"AI生成商品文案","inputs":["product_name","keywords","tone"],"outputs":["copy_text"]},
  {"type":"generate_image","label":"AI生成商品主图","inputs":["copy_text","image_style","size"],"outputs":["image_urls"]},
  {"type":"export","label":"批量导出结果","inputs":["image_urls","copy_text"],"outputs":["download_url"]}
]', 'published');

INSERT INTO `workflow_template` (`name`, `description`, `steps`, `status`) VALUES
('短视频营销全流程', '文案→配音→视频生成→字幕合成', '[
  {"type":"generate_text","label":"AI生成口播文案","inputs":["topic","duration","tone"],"outputs":["script"]},
  {"type":"generate_voice","label":"AI语音合成","inputs":["script","voice_gender","speed"],"outputs":["audio_url"]},
  {"type":"generate_video","label":"AI视频生成","inputs":["script","audio_url","visual_style"],"outputs":["video_url"]}
]', 'published');

-- DOWN
DELETE FROM `workflow_template` WHERE `name` IN ('电商主图批量生成', '短视频营销全流程');
DROP TABLE IF EXISTS `workflow_job`;
DROP TABLE IF EXISTS `workflow_template`;
