-- ============================================================
-- Migration 012: 视频翻译任务表
-- ============================================================

CREATE TABLE IF NOT EXISTS video_translate_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  task_type VARCHAR(32) NOT NULL COMMENT 'voice/subtitles/face',
  video_url VARCHAR(512) NOT NULL,
  source_lang VARCHAR(8) NOT NULL DEFAULT 'zh',
  target_lang VARCHAR(8) NOT NULL,
  extra_config JSON DEFAULT NULL COMMENT 'voiceType/subtitleStyle/avatarStyle',
  output_url VARCHAR(512) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued' COMMENT 'queued/processing/completed/failed',
  progress INT NOT NULL DEFAULT 0 COMMENT '进度 0-100',
  error_msg VARCHAR(1024) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_type (user_id, task_type),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='视频翻译任务';
