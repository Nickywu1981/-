-- ============================================================
-- 通联支付聚合收银台集成
-- ============================================================

-- UP ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `allinpay_order` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增ID',
  `reqsn` VARCHAR(32) NOT NULL COMMENT '商户订单号(唯一)',
  `trxid` VARCHAR(64) DEFAULT NULL COMMENT '通联平台交易流水号',
  `order_type` VARCHAR(20) NOT NULL COMMENT '订单类型: membership / recharge',
  `business_id` VARCHAR(50) NOT NULL COMMENT '业务订单ID(关联payment_order.id或recharge_order.order_no)',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '交易金额(元)',
  `trxamt` INT UNSIGNED NOT NULL COMMENT '交易金额(分)',
  `pay_channel` VARCHAR(20) NOT NULL COMMENT '支付渠道: wechat/alipay/unionpay',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0=待支付 1=支付成功 2=支付失败 3=已关闭',
  `pay_time` DATETIME DEFAULT NULL COMMENT '支付时间',
  `expire_time` DATETIME NOT NULL COMMENT '订单过期时间',
  `notify_raw` TEXT COMMENT '最后一次回调原始数据JSON',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reqsn` (`reqsn`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_business_id` (`business_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通联支付订单表';

CREATE TABLE IF NOT EXISTS `allinpay_notify_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `reqsn` VARCHAR(32) NOT NULL COMMENT '商户订单号',
  `trxid` VARCHAR(64) DEFAULT '' COMMENT '通联交易流水号',
  `notify_body` TEXT NOT NULL COMMENT '回调原始数据',
  `sign_verified` TINYINT NOT NULL DEFAULT 0 COMMENT '签名验证: 0=未验 1=通过 2=失败',
  `process_status` TINYINT NOT NULL DEFAULT 0 COMMENT '处理状态: 0=未处理 1=已处理 2=处理失败',
  `process_msg` VARCHAR(500) DEFAULT '' COMMENT '处理结果信息',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_reqsn` (`reqsn`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通联支付回调日志(仅追加)';

-- DOWN ────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS `allinpay_notify_log`;
-- DROP TABLE IF EXISTS `allinpay_order`;
