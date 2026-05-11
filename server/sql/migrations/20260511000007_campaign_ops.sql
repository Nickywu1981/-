-- ============================================
-- 运营活动管理模块
-- 总后台+运营端：营销活动、优惠券、公告管理
-- ============================================

CREATE TABLE IF NOT EXISTS `campaign` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '活动标题',
  `type` ENUM('promotion','coupon','event','announcement') NOT NULL DEFAULT 'promotion' COMMENT '活动类型',
  `description` TEXT COMMENT '活动描述',
  `cover_url` VARCHAR(500) DEFAULT '' COMMENT '封面图',
  `rules` JSON COMMENT '活动规则/banner配置',
  `reward_type` VARCHAR(50) DEFAULT '' COMMENT '奖励类型: credits/coupon/points',
  `reward_value` INT DEFAULT 0 COMMENT '奖励数值',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '结束时间',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=草稿 1=进行中 2=已结束 3=已下线',
  `target_audience` VARCHAR(50) DEFAULT 'all' COMMENT '目标用户: all/new_user/vip/enterprise',
  `tenant_id` INT DEFAULT NULL COMMENT '0=全局活动, >0=指定租户',
  `sort_order` INT DEFAULT 0 COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_type_status` (`type`, `status`),
  INDEX `idx_tenant` (`tenant_id`),
  INDEX `idx_time` (`start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='运营活动';

CREATE TABLE IF NOT EXISTS `coupon` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL COMMENT '优惠券编码',
  `name` VARCHAR(100) NOT NULL COMMENT '优惠券名称',
  `type` ENUM('fixed','percent') NOT NULL DEFAULT 'fixed' COMMENT 'fixed=固定金额, percent=百分比折扣',
  `value` DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT '优惠值',
  `min_order_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '最低订单金额',
  `max_discount` DECIMAL(10,2) DEFAULT NULL COMMENT '最大折扣上限(百分比券用)',
  `total_quantity` INT DEFAULT 0 COMMENT '总发放量(0=不限)',
  `used_quantity` INT DEFAULT 0 COMMENT '已使用量',
  `per_user_limit` INT DEFAULT 1 COMMENT '每人限领',
  `start_time` DATETIME DEFAULT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '0=停用 1=启用',
  `campaign_id` INT DEFAULT NULL COMMENT '关联活动',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_code` (`code`),
  INDEX `idx_campaign` (`campaign_id`),
  INDEX `idx_status_time` (`status`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='优惠券';

CREATE TABLE IF NOT EXISTS `user_coupon` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL COMMENT '用户ID',
  `coupon_id` INT NOT NULL COMMENT '优惠券ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '1=未使用 2=已使用 3=已过期',
  `used_order_id` INT DEFAULT NULL COMMENT '使用的订单ID',
  `obtain_time` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
  `use_time` DATETIME DEFAULT NULL COMMENT '使用时间',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_status` (`user_id`, `status`),
  INDEX `idx_coupon` (`coupon_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户优惠券';

CREATE TABLE IF NOT EXISTS `announcement` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL COMMENT '公告标题',
  `content` TEXT NOT NULL COMMENT '公告内容(HTML)',
  `type` ENUM('system','activity','maintenance','notice') NOT NULL DEFAULT 'notice' COMMENT '公告类型',
  `level` TINYINT NOT NULL DEFAULT 1 COMMENT '1=普通 2=重要 3=紧急',
  `is_pinned` TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶',
  `target_audience` VARCHAR(50) DEFAULT 'all' COMMENT '目标用户',
  `publish_time` DATETIME DEFAULT NULL COMMENT '发布时间',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '0=草稿 1=已发布 2=已下线',
  `create_by` INT DEFAULT NULL COMMENT '创建人',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_type_status` (`type`, `status`),
  INDEX `idx_publish` (`publish_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统公告';
