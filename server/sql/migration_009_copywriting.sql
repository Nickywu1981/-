-- 文案生成历史表
CREATE TABLE IF NOT EXISTS copywriting_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT 'title|description|translate',
  inputs JSON COMMENT '用户输入参数',
  outputs JSON COMMENT 'AI 生成结果',
  model_id VARCHAR(50) COMMENT '使用的 AI 模型',
  token_used INT DEFAULT 0 COMMENT '消耗 Token',
  status VARCHAR(10) DEFAULT 'success' COMMENT 'success|failed',
  error_msg TEXT COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_type (user_id, type),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文案生成历史';
