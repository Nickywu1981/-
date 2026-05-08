-- UP
-- ============================================
-- B8-B14 模块扩展表
-- 租户/DIY/表单/API代理/充值/自动化/提示词/敏感词/积分/日志
-- ============================================

-- 租户表
CREATE TABLE IF NOT EXISTS `tenant` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '租户名称',
  `code` varchar(50) NOT NULL COMMENT '租户编码',
  `logo` varchar(255) DEFAULT '',
  `domain` varchar(100) DEFAULT '',
  `plan_type` varchar(20) NOT NULL DEFAULT 'free',
  `status` tinyint NOT NULL DEFAULT '1',
  `contact_name` varchar(50) DEFAULT '',
  `contact_phone` varchar(20) DEFAULT '',
  `contact_email` varchar(100) DEFAULT '',
  `address` varchar(255) DEFAULT '',
  `max_users` int unsigned NOT NULL DEFAULT '5',
  `quota_images` int unsigned NOT NULL DEFAULT '100',
  `quota_video` int unsigned NOT NULL DEFAULT '10',
  `expire_time` datetime DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='租户表';

-- DIY页面
CREATE TABLE IF NOT EXISTS `diy_page` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `title` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `page_type` enum('pc','mobile','h5') NOT NULL DEFAULT 'mobile',
  `config_json` longtext NOT NULL,
  `meta_json` text,
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '0=草稿 1=已发布',
  `publish_time` datetime DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug_tenant` (`slug`,`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='DIY页面';

CREATE TABLE IF NOT EXISTS `diy_component` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `name` varchar(50) NOT NULL,
  `component_code` varchar(50) NOT NULL,
  `category` varchar(30) NOT NULL,
  `icon` varchar(100) DEFAULT NULL,
  `default_config` text NOT NULL,
  `is_builtin` tinyint NOT NULL DEFAULT '0',
  `status` tinyint NOT NULL DEFAULT '1',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`component_code`,`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='DIY组件库';

CREATE TABLE IF NOT EXISTS `diy_page_version` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `page_id` int unsigned NOT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `config_json` longtext NOT NULL,
  `remark` varchar(200) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_page` (`page_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='DIY页面版本';

-- 自定义表单
CREATE TABLE IF NOT EXISTS `custom_form` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `title` varchar(100) NOT NULL,
  `form_code` varchar(50) NOT NULL,
  `description` text,
  `fields_json` longtext NOT NULL,
  `submit_limit` int unsigned DEFAULT '0',
  `submit_count` int unsigned DEFAULT '0',
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `success_msg` varchar(200) DEFAULT '提交成功',
  `status` tinyint NOT NULL DEFAULT '1',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`form_code`,`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='自定义表单';

CREATE TABLE IF NOT EXISTS `custom_form_submission` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `form_id` int unsigned NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `user_id` int unsigned DEFAULT NULL,
  `data_json` longtext NOT NULL,
  `ip` varchar(45) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `status` tinyint DEFAULT '0' COMMENT '0=待处理 1=已查看 2=已处理',
  `remark` varchar(500) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_form` (`form_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='表单提交记录';

-- API代理
CREATE TABLE IF NOT EXISTS `api_proxy_config` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `name` varchar(50) NOT NULL,
  `proxy_code` varchar(50) NOT NULL,
  `upstream_url` varchar(500) NOT NULL,
  `method` varchar(10) DEFAULT 'GET',
  `auth_type` varchar(20) DEFAULT 'none',
  `auth_config` text,
  `headers_json` text,
  `timeout_ms` int unsigned DEFAULT '10000',
  `retry_count` tinyint unsigned DEFAULT '0',
  `cache_ttl` int unsigned DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_code` (`proxy_code`,`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='API代理配置';

-- 充值订单
CREATE TABLE IF NOT EXISTS `recharge_order` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '1',
  `user_id` int unsigned NOT NULL,
  `order_no` varchar(32) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `coin_amount` int unsigned NOT NULL,
  `pay_channel` varchar(20) NOT NULL,
  `pay_status` tinyint NOT NULL DEFAULT '0' COMMENT '0=待支付 1=支付成功 2=支付失败 3=已退款',
  `pay_time` datetime DEFAULT NULL,
  `trade_no` varchar(64) DEFAULT NULL,
  `client_ip` varchar(45) DEFAULT NULL,
  `expire_time` datetime NOT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_no` (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='充值订单';

-- 浏览器自动化
CREATE TABLE IF NOT EXISTS `automation_account` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '1',
  `user_id` int unsigned NOT NULL,
  `platform` varchar(30) NOT NULL,
  `store_name` varchar(100) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `encrypted_password` text,
  `cookies_json` longtext,
  `status` tinyint DEFAULT '1' COMMENT '0=失效 1=有效',
  `last_login` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='自动化平台账号';

CREATE TABLE IF NOT EXISTS `automation_task` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '1',
  `user_id` int unsigned NOT NULL,
  `account_id` int unsigned DEFAULT NULL,
  `task_type` varchar(30) NOT NULL,
  `task_config` json DEFAULT NULL,
  `status` tinyint DEFAULT '0' COMMENT '0=排队 1=执行中 2=成功 3=失败 4=已取消',
  `result_json` text,
  `screenshot_url` varchar(500) DEFAULT NULL,
  `error_msg` varchar(500) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='自动化任务';

-- 提示词模板
CREATE TABLE IF NOT EXISTS `prompt_template` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `template_code` varchar(64) NOT NULL,
  `category` varchar(32) NOT NULL,
  `title` varchar(128) NOT NULL,
  `description` varchar(512) DEFAULT '',
  `content` text NOT NULL,
  `variables` json DEFAULT NULL,
  `model_type` varchar(32) DEFAULT 'text',
  `icon` varchar(32) DEFAULT 'star',
  `sort_order` int DEFAULT '0',
  `is_public` tinyint DEFAULT '0',
  `status` tinyint DEFAULT '0' COMMENT '0=草稿 1=待审核 2=已上架 3=已下架',
  `usage_count` int DEFAULT '0',
  `creator_id` int DEFAULT NULL,
  `reviewer_id` int DEFAULT NULL,
  `review_remark` varchar(256) DEFAULT '',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI提示词模板';

CREATE TABLE IF NOT EXISTS `prompt_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `name` varchar(64) NOT NULL,
  `sort_order` int DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提示词收藏分组';

CREATE TABLE IF NOT EXISTS `prompt_favorite` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `template_id` int NOT NULL,
  `group_id` int DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_template` (`user_id`,`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='提示词模板收藏';

-- 敏感词
CREATE TABLE IF NOT EXISTS `sensitive_word` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `word` varchar(128) NOT NULL,
  `category` varchar(32) DEFAULT 'illegal',
  `level` tinyint DEFAULT '1',
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_word` (`word`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='敏感词库';

-- 积分幂等日志
CREATE TABLE IF NOT EXISTS `credit_request_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` varchar(64) NOT NULL,
  `user_id` int NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `action` varchar(32) NOT NULL,
  `credit_amount` int NOT NULL,
  `remark` varchar(512) DEFAULT '',
  `request_body` text,
  `response_body` text,
  `status` tinyint DEFAULT '1',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='积分请求幂等日志';

-- AI调用日志
CREATE TABLE IF NOT EXISTS `ai_call_log` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int unsigned NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `model_id` varchar(64) NOT NULL,
  `model_name` varchar(128) DEFAULT '',
  `prompt` text,
  `prompt_tokens` int DEFAULT '0',
  `response_tokens` int DEFAULT '0',
  `total_tokens` int DEFAULT '0',
  `duration_ms` int DEFAULT '0',
  `status` tinyint DEFAULT '1',
  `error_msg` varchar(1024) DEFAULT '',
  `result_type` varchar(32) DEFAULT '',
  `result_preview` varchar(1024) DEFAULT '',
  `task_id` varchar(36) DEFAULT '',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_model` (`model_id`),
  KEY `idx_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='AI调用日志';

-- DOWN
DROP TABLE IF EXISTS `ai_call_log`;
DROP TABLE IF EXISTS `credit_request_log`;
DROP TABLE IF EXISTS `sensitive_word`;
DROP TABLE IF EXISTS `prompt_favorite`;
DROP TABLE IF EXISTS `prompt_group`;
DROP TABLE IF EXISTS `prompt_template`;
DROP TABLE IF EXISTS `automation_task`;
DROP TABLE IF EXISTS `automation_account`;
DROP TABLE IF EXISTS `recharge_order`;
DROP TABLE IF EXISTS `api_proxy_config`;
DROP TABLE IF EXISTS `custom_form_submission`;
DROP TABLE IF EXISTS `custom_form`;
DROP TABLE IF EXISTS `diy_page_version`;
DROP TABLE IF EXISTS `diy_component`;
DROP TABLE IF EXISTS `diy_page`;
DROP TABLE IF EXISTS `tenant`;
