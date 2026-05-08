-- ============================================================
-- Schema Alignment Migration
-- 补齐 13 张缺失表，修复 DAO 与实际表名不一致问题
-- Date: 2026-05-09
-- ============================================================

-- 1. ai_model_config — AI 模型配置
CREATE TABLE IF NOT EXISTS ai_model_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_key VARCHAR(64) NOT NULL UNIQUE COMMENT '模型唯一标识',
  display_name VARCHAR(128) NOT NULL COMMENT '显示名称',
  vendor VARCHAR(64) NOT NULL COMMENT '厂商',
  category VARCHAR(64) NOT NULL DEFAULT 'text' COMMENT '类别 text/image/video',
  endpoint VARCHAR(512) DEFAULT NULL COMMENT 'API端点',
  api_key_enc VARCHAR(512) DEFAULT NULL COMMENT '加密API密钥',
  model_id VARCHAR(128) DEFAULT '' COMMENT '远程模型ID',
  max_tokens INT DEFAULT 4096,
  priority INT DEFAULT 0 COMMENT '优先级(越大越优先)',
  enabled TINYINT DEFAULT 1 COMMENT '启用状态',
  rate_limit_rpm INT DEFAULT 60 COMMENT '每分钟限流',
  rate_limit_rpd INT DEFAULT 1000 COMMENT '每天限流',
  concurrency_max INT DEFAULT 5 COMMENT '最大并发',
  breaker_threshold INT DEFAULT 5 COMMENT '熔断阈值',
  breaker_cooldown_s INT DEFAULT 60 COMMENT '熔断冷却秒数',
  moderation_enabled TINYINT DEFAULT 1 COMMENT '内容审核',
  moderation_action VARCHAR(32) DEFAULT 'block',
  blocked_words TEXT DEFAULT NULL,
  total_calls BIGINT DEFAULT 0 COMMENT '总调用次数',
  total_tokens BIGINT DEFAULT 0,
  total_errors BIGINT DEFAULT 0,
  avg_latency_ms DOUBLE DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. prompt_usage_history — 提示词使用历史
CREATE TABLE IF NOT EXISTS prompt_usage_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  template_id INT NOT NULL,
  filled_content TEXT COMMENT '填充后内容',
  model_type VARCHAR(32) DEFAULT 'text',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_template (template_id),
  INDEX idx_user_time (user_id, create_time DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. prompt_rating — 提示词评分
CREATE TABLE IF NOT EXISTS prompt_rating (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  template_id INT NOT NULL,
  score TINYINT NOT NULL COMMENT '评分1-5',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_template (user_id, template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. abuse_records — 滥用记录（限流/监控用）
CREATE TABLE IF NOT EXISTS abuse_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  api_path VARCHAR(256) DEFAULT NULL,
  ip VARCHAR(64) DEFAULT NULL,
  user_agent VARCHAR(512) DEFAULT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_ip (ip),
  INDEX idx_user_time (user_id, create_time),
  INDEX idx_ip_time (ip, create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. copywriting_history — 文案生成历史
CREATE TABLE IF NOT EXISTS copywriting_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(32) DEFAULT NULL COMMENT '文案类型',
  inputs JSON COMMENT '输入参数',
  outputs JSON COMMENT '输出结果',
  model_id VARCHAR(64) DEFAULT NULL,
  token_used INT DEFAULT 0,
  status VARCHAR(16) DEFAULT 'success',
  error_msg TEXT DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_user_type (user_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. email_template — 邮件模板
CREATE TABLE IF NOT EXISTS email_template (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_code VARCHAR(64) NOT NULL UNIQUE COMMENT '模板编码',
  name VARCHAR(128) NOT NULL,
  subject VARCHAR(256) DEFAULT '',
  content TEXT COMMENT '邮件内容(HTML)',
  provider_template_id VARCHAR(128) DEFAULT '' COMMENT '第三方模板ID',
  provider VARCHAR(32) DEFAULT 'mock',
  status TINYINT DEFAULT 1,
  remark VARCHAR(512) DEFAULT '',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. diy_template — DIY页面模板库
CREATE TABLE IF NOT EXISTS diy_template (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(128) NOT NULL,
  industry VARCHAR(64) DEFAULT NULL COMMENT '行业分类',
  page_type VARCHAR(32) DEFAULT 'mobile',
  thumbnail VARCHAR(512) DEFAULT NULL COMMENT '缩略图URL',
  description VARCHAR(512) DEFAULT NULL,
  tags VARCHAR(256) DEFAULT NULL COMMENT '标签,逗号分隔',
  mobile_config JSON COMMENT '移动端配置',
  pc_config JSON COMMENT 'PC端配置',
  use_count INT DEFAULT 0,
  is_official TINYINT DEFAULT 0 COMMENT '是否官方模板',
  status TINYINT DEFAULT 1,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_industry (industry),
  INDEX idx_page_type (page_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. diy_custom_field — 自定义表单字段
CREATE TABLE IF NOT EXISTS diy_custom_field (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 0,
  form_id INT NOT NULL,
  field_name VARCHAR(64) NOT NULL,
  field_label VARCHAR(128) DEFAULT NULL,
  field_type VARCHAR(32) NOT NULL DEFAULT 'text',
  sort_order INT DEFAULT 0,
  is_required TINYINT DEFAULT 0,
  is_visible TINYINT DEFAULT 1,
  default_value JSON DEFAULT NULL,
  placeholder VARCHAR(256) DEFAULT NULL,
  options_json JSON DEFAULT NULL,
  validation_rules JSON DEFAULT NULL,
  linkage_conditions JSON DEFAULT NULL,
  linkage_action VARCHAR(32) DEFAULT 'show',
  masking_rule VARCHAR(32) DEFAULT NULL,
  masking_pattern VARCHAR(128) DEFAULT NULL,
  pc_col_span INT DEFAULT 12,
  mobile_col_span INT DEFAULT 12,
  css_class VARCHAR(128) DEFAULT NULL,
  INDEX idx_form (form_id),
  INDEX idx_tenant_form (tenant_id, form_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. api_proxy_whitelist — API代理白名单
CREATE TABLE IF NOT EXISTS api_proxy_whitelist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 0,
  domain_pattern VARCHAR(256) NOT NULL COMMENT '域名模式(支持通配符*)',
  domain_type VARCHAR(32) DEFAULT 'domain' COMMENT 'domain/ip/cidr',
  description VARCHAR(512) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  status TINYINT DEFAULT 1,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_pattern (domain_pattern)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. sys_config_item — 系统配置项
CREATE TABLE IF NOT EXISTS sys_config_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_key VARCHAR(64) NOT NULL COMMENT '配置分组键',
  item_key VARCHAR(64) NOT NULL COMMENT '配置项键',
  item_value TEXT COMMENT '配置值',
  item_type VARCHAR(32) DEFAULT 'text' COMMENT '配置类型 text/number/boolean/json',
  default_val TEXT DEFAULT NULL COMMENT '默认值',
  sort_order INT DEFAULT 0,
  is_enabled TINYINT DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_item (group_key, item_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. sys_config_log — 系统配置变更日志
CREATE TABLE IF NOT EXISTS sys_config_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  group_key VARCHAR(64) NOT NULL,
  item_key VARCHAR(64) NOT NULL,
  old_value TEXT DEFAULT '',
  new_value TEXT DEFAULT '',
  changed_by INT DEFAULT NULL COMMENT '操作人 user.id',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_item (group_key, item_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. sys_dict_item — 系统字典项
CREATE TABLE IF NOT EXISTS sys_dict_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dict_key VARCHAR(64) NOT NULL COMMENT '字典键',
  item_key VARCHAR(64) NOT NULL COMMENT '条目键',
  item_value VARCHAR(256) DEFAULT NULL COMMENT '条目值',
  item_extra VARCHAR(512) DEFAULT NULL COMMENT '扩展信息',
  sort_order INT DEFAULT 0,
  is_enabled TINYINT DEFAULT 1,
  INDEX idx_dict (dict_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. user_plans — 用户套餐关联(与 membership_plan 表联动)
CREATE TABLE IF NOT EXISTS user_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL COMMENT '关联 membership_plan.id',
  status TINYINT DEFAULT 1 COMMENT '1=生效 0=过期',
  expire_time DATETIME DEFAULT NULL COMMENT '到期时间',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_expire (expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 插入初始配置数据（系统可用）
-- ============================================================

-- 字典数据示例
INSERT IGNORE INTO sys_dict_item (dict_key, item_key, item_value, item_extra, sort_order) VALUES
('task_category', 'text', '文案生成', '生成各类营销文案', 1),
('task_category', 'image', '图片生成', 'AI 图片创作', 2),
('task_category', 'video', '视频生成', 'AI 视频创作', 3),
('task_category', 'analysis', '数据分析', '数据洞察报告', 4);
