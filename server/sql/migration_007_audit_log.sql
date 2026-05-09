-- 操作审计日志表
-- P0-3: 记录发布/下线/删除等关键操作
CREATE TABLE IF NOT EXISTS operation_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '操作人',
  action VARCHAR(64) NOT NULL COMMENT '操作类型: publish/unpublish/delete/rollback/clone/create',
  target_type VARCHAR(64) NOT NULL COMMENT '目标类型: diy_page/form/proxy_config/prompt_template/ai_model',
  target_id INT DEFAULT NULL COMMENT '目标ID',
  target_title VARCHAR(255) DEFAULT NULL COMMENT '目标标题(快照，便于查询)',
  details JSON DEFAULT NULL COMMENT '操作详情(变更前后对比等)',
  ip VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(512) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_target (target_type, target_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作审计日志';
