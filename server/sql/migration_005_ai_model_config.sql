-- ============================================================
-- Movio AI v4.1  Migration 005 — AI 模型可视化配置
-- P4: 7厂商注册 + 限流 + 敏感词 + 用量统计
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_model_config (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  model_key   VARCHAR(50)  NOT NULL UNIQUE COMMENT '模型标识符',
  display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
  vendor      VARCHAR(50)  NOT NULL COMMENT '厂商: openai/anthropic/google/alibaba/stable-diffusion',
  category    ENUM('text','image','video') NOT NULL COMMENT '模型类别',
  endpoint    VARCHAR(500) NOT NULL COMMENT 'API端点',
  api_key_enc VARCHAR(500) NOT NULL COMMENT 'AES-256-GCM 加密后的 API Key',
  model_id    VARCHAR(100) DEFAULT '' COMMENT '模型ID (如 gpt-4o, claude-sonnet-4-6)',
  max_tokens  INT DEFAULT 4096 COMMENT '最大输出Token',
  priority    INT DEFAULT 0 COMMENT '优先级(越高越优先)',
  enabled     TINYINT(1) DEFAULT 1 COMMENT '启用/禁用',

  -- 限流配置
  rate_limit_rpm     INT DEFAULT 60 COMMENT '每分钟最大请求数',
  rate_limit_rpd     INT DEFAULT 1000 COMMENT '每日最大请求数',
  concurrency_max    INT DEFAULT 5 COMMENT '最大并发数',

  -- 熔断配置
  breaker_threshold  INT DEFAULT 5 COMMENT '熔断器失败阈值',
  breaker_cooldown_s INT DEFAULT 60 COMMENT '熔断冷却秒数',

  -- 敏感词配置
  moderation_enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用敏感词审核',
  moderation_action  ENUM('block','warn','log') DEFAULT 'block' COMMENT '敏感词处理策略',
  blocked_words      TEXT COMMENT '自定义敏感词, JSON 数组',

  -- 用量统计
  total_calls    BIGINT DEFAULT 0 COMMENT '累计调用次数',
  total_tokens   BIGINT DEFAULT 0 COMMENT '累计Token消耗',
  total_errors   BIGINT DEFAULT 0 COMMENT '累计错误次数',
  avg_latency_ms INT DEFAULT 0 COMMENT '平均延迟(ms)',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 模型配置表';

-- ============================================================
-- 预置 7 个 AI 厂商模型
-- ============================================================
INSERT INTO ai_model_config (model_key, display_name, vendor, category, endpoint, api_key_enc, model_id, max_tokens, priority, rate_limit_rpm, concurrency_max) VALUES

-- 文本类 (3)
('gpt-4o',          'GPT-4o (OpenAI)',      'openai',    'text',  'https://api.openai.com/v1/chat/completions',    'PLACEHOLDER_AES_OPENAI',    'gpt-4o',           16384, 100, 500,  10),
('claude-sonnet',   'Claude Sonnet 4.6',     'anthropic', 'text',  'https://api.anthropic.com/v1/messages',          'PLACEHOLDER_AES_ANTHROPIC', 'claude-sonnet-4-6', 8192,  90,  500,  10),
('gemini-pro',      'Gemini Pro (Google)',    'google',    'text',  'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', 'PLACEHOLDER_AES_GOOGLE', 'gemini-pro', 8192, 85, 500, 10),

-- 图片类 (2)
('dalle-3',         'DALL-E 3 (OpenAI)',     'openai',    'image', 'https://api.openai.com/v1/images/generations',    'PLACEHOLDER_AES_OPENAI',    'dall-e-3',         0,    95,  100,  3),
('sd-xl',           'Stable Diffusion XL',   'stable-diffusion', 'image', 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', 'PLACEHOLDER_AES_SD', 'stable-diffusion-xl-1024-v1-0', 0, 80, 100, 3),

-- 视频类 (2)
('seedance',        'Seedance 2.0',          'alibaba',   'video', 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis', 'PLACEHOLDER_AES_ALIBABA', 'seedance-2.0', 0, 90, 50, 2),
('runway-gen3',     'Runway Gen-3',          'runway',    'video', 'https://api.runwayml.com/v1/generate',             'PLACEHOLDER_AES_RUNWAY',   'gen3',            0,    85,  50,   2),

-- 文本(通义千问-补充)
('qwen-turbo',      '通义千问 Turbo',         'alibaba',   'text',  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', 'PLACEHOLDER_AES_ALIBABA', 'qwen-turbo', 8192, 88, 500, 10),

-- 图片(通义万象-补充)
('wanxiang',        '通义万象',               'alibaba',   'image', 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image-generation/image-synthesis', 'PLACEHOLDER_AES_ALIBABA', 'wanx-v1', 0, 82, 100, 3);

-- ============================================================
-- AI 调用日志表（运维监控）
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_call_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT DEFAULT NULL,
  tenant_id   INT DEFAULT NULL,
  model_key   VARCHAR(50)  NOT NULL,
  task_type   VARCHAR(50)  NOT NULL COMMENT '任务类型',
  input_hash  VARCHAR(64)  DEFAULT '' COMMENT '输入SHA256(去重/缓存)',
  status      ENUM('success','error','blocked','timeout') NOT NULL DEFAULT 'success',
  latency_ms  INT DEFAULT 0,
  tokens_in   INT DEFAULT 0,
  tokens_out  INT DEFAULT 0,
  error_msg   VARCHAR(500) DEFAULT '',
  moderation_result JSON DEFAULT NULL COMMENT '审核结果',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_model (model_key),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 调用日志';
