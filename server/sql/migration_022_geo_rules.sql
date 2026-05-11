-- Migration 022: GEO 规则引擎 + 输出约束表
-- 目的: 支持按国家/地区/平台配置模型限制、输出审核级别、输出约束

CREATE TABLE IF NOT EXISTS geo_rules (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  rule_name       VARCHAR(100) NOT NULL COMMENT '规则名称',
  country_codes   JSON NOT NULL COMMENT '适用国家代码数组 ["CN","US"]',
  platform_codes  JSON DEFAULT NULL COMMENT '适用平台代码数组 ["amazon","temu"]',
  locale          VARCHAR(10) DEFAULT NULL COMMENT '强制语言 zh/en/es',
  blocked_models  JSON DEFAULT NULL COMMENT '禁用的模型列表 ["dalle-3"]',
  review_level    TINYINT DEFAULT 0 COMMENT '内容审核级别 0-5 (0=无,5=最严)',
  output_constraints JSON DEFAULT NULL COMMENT '输出约束 {maxTokens, forbiddenTerms}',
  priority        INT DEFAULT 0 COMMENT '优先级 (越高越优先匹配)',
  enabled         TINYINT(1) DEFAULT 1,
  description     VARCHAR(500) DEFAULT '',
  create_time     DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled_priority (enabled, priority DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='GEO 规则表';

-- 种子数据: 中国区默认规则 (无限制，仅记录)
INSERT INTO geo_rules (rule_name, country_codes, platform_codes, locale, blocked_models, review_level, priority, description)
VALUES ('中国区默认', '["CN","TW","HK","MO"]', NULL, 'zh', NULL, 1, 0, '中国区默认规则：中文输出，基础审核');

CREATE TABLE IF NOT EXISTS output_constraints (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  constraint_name   VARCHAR(100) NOT NULL,
  model_keys        JSON DEFAULT NULL COMMENT '适用模型列表 ["gpt-4o","gpt-4o-mini"]',
  max_output_tokens INT DEFAULT NULL COMMENT '最大输出 token 数',
  blocked_terms     JSON DEFAULT NULL COMMENT '禁止词列表 ["违禁词1","违禁词2"]',
  required_patterns JSON DEFAULT NULL COMMENT '必须包含的模式 {"mustStartWith":"...","mustNotContain":["..."]}',
  review_level      TINYINT DEFAULT 0 COMMENT '审核级别 0-5',
  action            ENUM('block','warn','log') DEFAULT 'log' COMMENT '违规动作',
  enabled           TINYINT(1) DEFAULT 1,
  description       VARCHAR(500) DEFAULT '',
  create_time       DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='输出约束配置表';
