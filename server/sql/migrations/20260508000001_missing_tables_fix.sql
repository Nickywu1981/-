-- ============================================
-- G6 缺失表补充 Migration v1.0
-- 修复审计发现的 6 个 schema 缺失项
-- 日期: 2026-05-08
-- ============================================

USE ai_saas;

-- ----------------------------
-- 1. user 表追加 tenant_id 列
-- userDao 查询此列但 schema.sql 未定义
-- ----------------------------
ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `tenant_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '租户ID, 0=默认租户' AFTER `role`;

-- ----------------------------
-- 2. 用户收藏夹表
-- collectionDao.js 依赖
-- ----------------------------
CREATE TABLE IF NOT EXISTS `user_collections` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '收藏夹ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `name` VARCHAR(100) NOT NULL COMMENT '收藏夹名称',
  `description` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '描述',
  `cover_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '封面图URL',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开: 0=私密 1=公开',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏夹';

-- ----------------------------
-- 3. API 代理调用日志表
-- proxyDao.js.logCall() 依赖
-- ----------------------------
CREATE TABLE IF NOT EXISTS `api_proxy_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `proxy_id` INT UNSIGNED NOT NULL COMMENT '代理配置ID',
  `tenant_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '租户ID',
  `request_url` VARCHAR(500) NOT NULL COMMENT '请求URL',
  `response_status` SMALLINT NOT NULL DEFAULT 0 COMMENT '响应状态码',
  `response_body` TEXT COMMENT '响应体(截断2000字符)',
  `duration_ms` INT NOT NULL DEFAULT 0 COMMENT '耗时(毫秒)',
  `error_msg` VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_proxy_id` (`proxy_id`),
  KEY `idx_tenant_id` (`tenant_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API代理调用日志';

-- ----------------------------
-- 4. 充值回调通知日志表
-- rechargeDao.js.logNotify() 依赖
-- ----------------------------
CREATE TABLE IF NOT EXISTS `recharge_notify_log` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `order_no` VARCHAR(64) NOT NULL COMMENT '订单号',
  `notify_raw` JSON COMMENT '回调原始数据',
  `notify_type` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '通知类型(alipay/wechat/allinpay)',
  `verified` TINYINT NOT NULL DEFAULT 0 COMMENT '签名验证: 0=未验证 1=已验证',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_order_no` (`order_no`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值回调通知日志';

-- ----------------------------
-- 5. Open API 密钥表
-- openApi.js 中间件直接查询此表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `open_api_key` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '密钥ID',
  `api_key` VARCHAR(64) NOT NULL COMMENT 'API Key (movio_前缀)',
  `api_secret` VARCHAR(255) NOT NULL COMMENT 'API Secret (HMAC签名用)',
  `tenant_id` INT UNSIGNED NOT NULL COMMENT '租户ID',
  `description` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '密钥描述',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=禁用',
  `rate_limit` INT NOT NULL DEFAULT 100 COMMENT '每分钟请求上限',
  `daily_limit` INT NOT NULL DEFAULT 10000 COMMENT '每日请求上限',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0=未删 1=已删',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_api_key` (`api_key`),
  KEY `idx_tenant_id` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Open API密钥表';

-- ----------------------------
-- 6. 帮助FAQ表（从 helpDao.ensureTable() 迁移）
-- ----------------------------
CREATE TABLE IF NOT EXISTS `help_faq` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'FAQ ID',
  `question` TEXT NOT NULL COMMENT '问题',
  `answer` TEXT NOT NULL COMMENT '答案',
  `category` VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '分类',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=启用 0=禁用',
  `tenant_id` INT NOT NULL DEFAULT 1 COMMENT '租户ID',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='帮助FAQ';

-- DOWN
DROP TABLE IF EXISTS `help_faq`;
DROP TABLE IF EXISTS `open_api_key`;
DROP TABLE IF EXISTS `recharge_notify_log`;
DROP TABLE IF EXISTS `api_proxy_log`;
DROP TABLE IF EXISTS `user_collections`;
ALTER TABLE `user` DROP COLUMN IF EXISTS `tenant_id`;
