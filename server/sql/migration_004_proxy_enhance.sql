-- ============================================================
-- Movio AI 迁移 004: API 统一代理系统增强
-- 新增: 白名单表 + 加密凭证字段 + 限流熔断 + 调用日志表
-- ============================================================

-- 1. api_proxy_config 增强: AES加密存储 + 限流 + 熔断 + 请求体透传
ALTER TABLE api_proxy_config
  ADD COLUMN encrypt_auth TINYINT NOT NULL DEFAULT 1 COMMENT '1=AES加密存储 0=明文(旧数据兼容)',
  ADD COLUMN rate_limit_rpm INT UNSIGNED NOT NULL DEFAULT 60 COMMENT '每分钟限流次数(0=不限)',
  ADD COLUMN circuit_break_count INT UNSIGNED NOT NULL DEFAULT 5 COMMENT '连续失败N次熔断',
  ADD COLUMN circuit_break_window INT UNSIGNED NOT NULL DEFAULT 60 COMMENT '熔断恢复等待秒数',
  ADD COLUMN circuit_status TINYINT NOT NULL DEFAULT 0 COMMENT '0=正常 1=熔断中',
  ADD COLUMN circuit_last_fail DATETIME DEFAULT NULL COMMENT '最近失败时间',
  ADD COLUMN circuit_fail_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '连续失败计数',
  ADD COLUMN pass_body TINYINT NOT NULL DEFAULT 0 COMMENT '1=透传请求体到上游',
  ADD COLUMN body_max_bytes INT UNSIGNED NOT NULL DEFAULT 1048576 COMMENT '请求体上限(默认1MB)',
  ADD COLUMN update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 2. API 白名单表（域名/IP 级准入）
CREATE TABLE IF NOT EXISTS api_proxy_whitelist (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id INT UNSIGNED NOT NULL DEFAULT 0,
  domain_pattern VARCHAR(200) NOT NULL COMMENT '域名匹配模式(支持通配符*example.com)',
  domain_type VARCHAR(20) NOT NULL DEFAULT 'third_party' COMMENT 'third_party|ai_image|ai_video|ai_text',
  description VARCHAR(200) DEFAULT NULL,
  status TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=禁用',
  created_by INT UNSIGNED DEFAULT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tenant (tenant_id),
  KEY idx_type (domain_type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API代理白名单';

-- 3. API 调用日志表增强（如已存在则新增字段）
CREATE TABLE IF NOT EXISTS api_proxy_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  proxy_id INT UNSIGNED NOT NULL,
  tenant_id INT UNSIGNED NOT NULL DEFAULT 0,
  user_id INT UNSIGNED DEFAULT NULL,
  request_url VARCHAR(500) NOT NULL,
  request_method VARCHAR(10) DEFAULT 'GET',
  request_body TEXT COMMENT '请求体(截断2KB)',
  response_status SMALLINT DEFAULT NULL,
  response_body TEXT COMMENT '响应体(截断2KB)',
  duration_ms INT UNSIGNED DEFAULT 0,
  retry_used TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '实际重试次数',
  error_msg VARCHAR(500) DEFAULT NULL,
  client_ip VARCHAR(45) DEFAULT NULL,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_proxy (proxy_id, create_time),
  KEY idx_tenant (tenant_id, create_time),
  KEY idx_time (create_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API代理调用日志';

-- 4. 预填常用 AI/电商 API 白名单
INSERT IGNORE INTO api_proxy_whitelist (tenant_id, domain_pattern, domain_type, description) VALUES
(0, '*.anthropic.com', 'ai_text', 'Anthropic Claude API'),
(0, '*.openai.com', 'ai_text', 'OpenAI GPT/DALL-E API'),
(0, '*.googleapis.com', 'ai_text', 'Google Gemini API'),
(0, '*.stability.ai', 'ai_image', 'Stable Diffusion API'),
(0, '*.replicate.com', 'ai_image', 'Replicate 模型托管'),
(0, '*.runwayml.com', 'ai_video', 'Runway 视频生成'),
(0, '*.deepseek.com', 'ai_text', 'DeepSeek API'),
(0, '*.qwen.aliyuncs.com', 'ai_text', '通义千问 API'),
(0, '*taobao.com', 'third_party', '淘宝平台'),
(0, '*shopee.*', 'third_party', 'Shopee平台'),
(0, '*myshopify.com', 'third_party', 'Shopify店铺'),
(0, '*tiktok.com', 'third_party', 'TikTok平台');
