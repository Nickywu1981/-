-- ============================================================
-- 统一工作流引擎 + 模型池 数据库迁移
-- 版本: v5.0
-- ============================================================

-- 1. 扩展 ai_model_config 表（模型池新字段）
ALTER TABLE ai_model_config
  ADD COLUMN IF NOT EXISTS pool_enabled TINYINT(1) DEFAULT 1 COMMENT '模型池启用(0=不参与自动调度)',
  ADD COLUMN IF NOT EXISTS pool_weight INT DEFAULT 1 COMMENT '权重(1-100,越高越优先)',
  ADD COLUMN IF NOT EXISTS gray_percent INT DEFAULT 0 COMMENT '灰度百分比(0-100,0=不灰度)',
  ADD COLUMN IF NOT EXISTS quota_daily INT DEFAULT 0 COMMENT '每日配额(0=不限)',
  ADD COLUMN IF NOT EXISTS quota_tenant INT DEFAULT 0 COMMENT '每租户配额(0=不限)',
  ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT '' COMMENT '任务类型(white_bg/multi_angle/script/tts等)',
  ADD INDEX IF NOT EXISTS idx_pool_category (category, pool_enabled),
  ADD INDEX IF NOT EXISTS idx_task_type (task_type);

-- 2. 工作流配置表
CREATE TABLE IF NOT EXISTS workflow_config (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  workflow_id VARCHAR(50) NOT NULL COMMENT '工作流ID',
  user_id INT DEFAULT NULL COMMENT '用户ID(NULL=全局默认)',
  tenant_id INT DEFAULT NULL COMMENT '租户ID',
  mode ENUM('auto','custom') DEFAULT 'auto' COMMENT '运行模式',
  disabled_steps JSON COMMENT '禁用的步骤key列表',
  model_bindings JSON COMMENT '步骤→模型绑定 {"step_key":"model_key"}',
  extra_steps JSON COMMENT '额外插入步骤',
  params JSON COMMENT '自定义参数(风格/行业/数量/时长等)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_workflow_user (workflow_id, user_id, tenant_id),
  INDEX idx_workflow (workflow_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 工作流执行记录表
CREATE TABLE IF NOT EXISTS workflow_execution_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL COMMENT '作业ID',
  workflow_id VARCHAR(50) NOT NULL COMMENT '工作流ID',
  user_id INT NOT NULL,
  mode ENUM('auto','custom') DEFAULT 'auto',
  status ENUM('pending','running','completed','failed','paused','cancelled') DEFAULT 'pending',
  total_steps INT DEFAULT 0,
  completed_steps INT DEFAULT 0,
  progress INT DEFAULT 0 COMMENT '进度 0-100',
  input_data JSON COMMENT '输入数据',
  output_data JSON COMMENT '输出数据',
  step_results JSON COMMENT '每步结果[{step,status,model,output,error}]',
  error_message TEXT COMMENT '错误信息',
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_workflow (workflow_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 预设7条工作流默认配置
INSERT IGNORE INTO workflow_config (workflow_id, mode, disabled_steps, model_bindings, params) VALUES
('white_bg_full', 'auto', '["bgm_add"]', '{}', '{"videoDuration":30,"storyboardCount":6,"style":"professional"}'),
('batch_image_expand', 'auto', '["detail_shot_gen","storyboard_gen"]', '{}', '{"batchSize":3,"style":"ecommerce"}'),
('detail_page_full', 'auto', '[]', '{}', '{"modules":6,"style":"professional"}'),
('copywriting_script', 'auto', '[]', '{}', '{"count":5,"tone":"professional"}'),
('video_generation', 'auto', '["bgm_add"]', '{}', '{"videoDuration":30,"storyboardCount":6}'),
('viral_clone', 'auto', '[]', '{}', '{"videoDuration":30,"storyboardCount":6}'),
('voice_audio', 'auto', '["audio_mix"]', '{}', '{"voice":"zh-CN-XiaoxiaoNeural","speed":1.0}');
