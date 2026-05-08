-- UP
-- ============================================
-- 电商 AI SaaS 核心表初始化 v2.0
-- MySQL 8.0+, 全表逻辑删除, 下划线命名
-- ============================================

CREATE DATABASE IF NOT EXISTS ai_saas DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_saas;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS `user` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(bcrypt)',
  `nickname` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '昵称',
  `phone` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '手机号',
  `email` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '邮箱',
  `role` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '角色: user/admin',
  `avatar` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '头像URL',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=正常 0=禁用',
  `last_login_time` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0=未删 1=已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  KEY `idx_phone` (`phone`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. Token 黑名单
CREATE TABLE IF NOT EXISTS `user_token_blacklist` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `token_hash` VARCHAR(64) NOT NULL COMMENT 'Token SHA256',
  `expire_time` DATETIME NOT NULL COMMENT '过期时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expire_time` (`expire_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单表';

-- 3. 会员订阅表
CREATE TABLE IF NOT EXISTS `user_membership` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '会员ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `plan_type` TINYINT NOT NULL COMMENT '套餐: 0=免费 1=月卡 2=季卡 3=年卡',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0=已取消 1=生效中 2=已到期',
  `trial_quota` INT NOT NULL DEFAULT 0 COMMENT '试用总次数',
  `trial_used` INT NOT NULL DEFAULT 0 COMMENT '已用试用次数',
  `credit_balance` INT NOT NULL DEFAULT 0 COMMENT '算力点数余额',
  `start_time` DATETIME NOT NULL COMMENT '开始时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '到期时间(NULL=永久/免费)',
  `auto_renew` TINYINT NOT NULL DEFAULT 0 COMMENT '自动续费: 0=关闭 1=开启',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_end_time` (`end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员订阅表';

-- 4. 平台预设尺寸模板
CREATE TABLE IF NOT EXISTS `platform_size` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `platform` VARCHAR(30) NOT NULL COMMENT '平台代码',
  `category` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '类目',
  `label` VARCHAR(80) NOT NULL COMMENT '尺寸名称',
  `width` INT UNSIGNED NOT NULL COMMENT '宽(px)',
  `height` INT UNSIGNED NOT NULL COMMENT '高(px)',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_platform` (`platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台预设尺寸模板';

-- 5. 用户自定义尺寸模板
CREATE TABLE IF NOT EXISTS `user_size_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `name` VARCHAR(80) NOT NULL COMMENT '模板名称',
  `width` INT UNSIGNED NOT NULL COMMENT '宽(px)',
  `height` INT UNSIGNED NOT NULL COMMENT '高(px)',
  `platform` VARCHAR(30) NOT NULL DEFAULT '' COMMENT '关联平台(可空)',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户自定义尺寸模板';

-- 6. Brand Kit 品牌素材
CREATE TABLE IF NOT EXISTS `user_brand` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '品牌ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `logo_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '品牌Logo URL',
  `brand_name` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '品牌名称',
  `primary_color` VARCHAR(7) NOT NULL DEFAULT '#FF4400' COMMENT '品牌主色',
  `watermark_enabled` TINYINT NOT NULL DEFAULT 1 COMMENT '水印开关: 0=关 1=开',
  `watermark_opacity` TINYINT NOT NULL DEFAULT 30 COMMENT '水印透明度(1-100)',
  `watermark_position` VARCHAR(20) NOT NULL DEFAULT 'br' COMMENT '水印位置: tl/tr/bl/br/center',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Brand Kit品牌素材表';

-- 7. 消费记录
CREATE TABLE IF NOT EXISTS `consumption_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `type` TINYINT NOT NULL COMMENT '类型: 1=试用 2=会员扣点 3=充值',
  `action` VARCHAR(50) NOT NULL COMMENT '操作标识',
  `credit_before` INT NOT NULL DEFAULT 0 COMMENT '操作前点数',
  `credit_after` INT NOT NULL DEFAULT 0 COMMENT '操作后点数',
  `consumed` INT NOT NULL DEFAULT 0 COMMENT '消耗点数',
  `remark` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '备注',
  `task_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '关联任务ID',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_task_id` (`task_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消费记录表(仅追加)';

-- 8. 异步任务表
CREATE TABLE IF NOT EXISTS `task` (
  `id` VARCHAR(36) NOT NULL COMMENT '任务UUID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `type` VARCHAR(30) NOT NULL COMMENT '任务类型',
  `title` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '任务名称',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0=排队 1=处理中 2=已完成 3=失败 4=已取消',
  `priority` TINYINT NOT NULL DEFAULT 1 COMMENT '优先级: 1=正常 2=优先(付费) 3=夜间批量',
  `input_params` JSON DEFAULT NULL COMMENT '输入参数',
  `output_result` JSON DEFAULT NULL COMMENT '输出结果',
  `progress` TINYINT NOT NULL DEFAULT 0 COMMENT '进度(0-100)',
  `progress_msg` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '进度说明',
  `error_msg` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '错误信息',
  `review_status` TINYINT NOT NULL DEFAULT 0 COMMENT '审核状态: 0=待审核 1=已通过 2=已拒绝',
  `retry_count` TINYINT NOT NULL DEFAULT 0 COMMENT '已重试次数',
  `worker_id` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '处理Worker标识',
  `start_time` DATETIME DEFAULT NULL COMMENT '开始处理时间',
  `end_time` DATETIME DEFAULT NULL COMMENT '完成时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_type` (`type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异步任务表';

-- 9. 生成图片记录
CREATE TABLE IF NOT EXISTS `generated_image` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '图片ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `task_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '关联任务ID',
  `type` VARCHAR(30) NOT NULL COMMENT '类型',
  `platform` VARCHAR(30) NOT NULL DEFAULT '' COMMENT '目标平台',
  `original_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '原图URL',
  `result_url` VARCHAR(500) NOT NULL COMMENT '生成图URL',
  `thumbnail_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '缩略图URL',
  `width` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '宽(px)',
  `height` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '高(px)',
  `file_size` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小(字节)',
  `format` VARCHAR(10) NOT NULL DEFAULT 'webp' COMMENT '格式: webp/jpg/png',
  `params_json` JSON DEFAULT NULL COMMENT '生成参数JSON',
  `is_favorite` TINYINT NOT NULL DEFAULT 0 COMMENT '是否收藏: 0=否 1=是',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_type` (`type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生成图片记录';

-- 10. 生成视频记录
CREATE TABLE IF NOT EXISTS `generated_video` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '视频ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `task_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '关联任务ID',
  `type` VARCHAR(30) NOT NULL COMMENT '类型',
  `platform` VARCHAR(30) NOT NULL DEFAULT '' COMMENT '目标平台',
  `original_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '素材URL',
  `result_url` VARCHAR(500) NOT NULL COMMENT '生成视频URL',
  `thumbnail_url` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '封面图URL',
  `duration` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '时长(秒)',
  `width` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '宽(px)',
  `height` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '高(px)',
  `file_size` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小(字节)',
  `has_bgm` TINYINT NOT NULL DEFAULT 0 COMMENT '是否含BGM',
  `has_subtitle` TINYINT NOT NULL DEFAULT 0 COMMENT '是否含字幕',
  `params_json` JSON DEFAULT NULL COMMENT '生成参数JSON',
  `is_favorite` TINYINT NOT NULL DEFAULT 0 COMMENT '是否收藏',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_type` (`type`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生成视频记录';

-- 11. 操作日志
CREATE TABLE IF NOT EXISTS `operation_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `user_id` INT UNSIGNED DEFAULT NULL COMMENT '用户ID',
  `action` VARCHAR(80) NOT NULL COMMENT '操作标识',
  `target_type` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '对象类型',
  `target_id` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '对象ID',
  `detail` JSON DEFAULT NULL COMMENT '详情',
  `ip` VARCHAR(50) NOT NULL DEFAULT '' COMMENT 'IP',
  `user_agent` VARCHAR(500) NOT NULL DEFAULT '' COMMENT 'UA',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表(仅追加)';

-- 12. 会员套餐配置
CREATE TABLE IF NOT EXISTS `membership_plan` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '套餐ID',
  `plan_type` TINYINT NOT NULL COMMENT '套餐: 0=免费 1=月卡 2=季卡 3=年卡',
  `name` VARCHAR(50) NOT NULL COMMENT '套餐名称',
  `price` DECIMAL(10,2) NOT NULL COMMENT '价格(元)',
  `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '原价(划线价)',
  `credits` INT NOT NULL COMMENT '每月点数',
  `daily_credits` INT NOT NULL DEFAULT 0 COMMENT '每日赠送点数',
  `save_days` INT NOT NULL DEFAULT 7 COMMENT '作品保存天数',
  `watermark_free` TINYINT NOT NULL DEFAULT 0 COMMENT '去水印',
  `hd_export` TINYINT NOT NULL DEFAULT 0 COMMENT '高清导出',
  `brand_kit` TINYINT NOT NULL DEFAULT 0 COMMENT 'Brand Kit',
  `batch_limit` INT NOT NULL DEFAULT 5 COMMENT '批量处理上限',
  `priority_queue` TINYINT NOT NULL DEFAULT 0 COMMENT '优先队列',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '启用: 0=禁用 1=启用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_type` (`plan_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员套餐配置';

-- 13. 用户批量模板
CREATE TABLE IF NOT EXISTS `user_batch_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `name` VARCHAR(50) NOT NULL COMMENT '模板名称',
  `operation` VARCHAR(30) NOT NULL COMMENT '操作类型',
  `platform` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '目标平台',
  `style` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '风格',
  `night_mode` TINYINT NOT NULL DEFAULT 0 COMMENT '夜间模式',
  `image_count` INT NOT NULL DEFAULT 0 COMMENT '图片数量',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_operation` (`operation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户批量模板';

-- 14. 短信模板表
CREATE TABLE IF NOT EXISTS `sms_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `template_code` VARCHAR(50) NOT NULL COMMENT '模板编码',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `content` VARCHAR(500) NOT NULL COMMENT '模板内容',
  `params_count` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '参数个数',
  `provider_template_id` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '服务商模板ID',
  `provider` VARCHAR(30) NOT NULL DEFAULT 'mock' COMMENT '服务商: mock/aliyun/tencent',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '启用: 0=禁用 1=启用',
  `remark` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '备注',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信模板';

-- 15. 短信发送日志
CREATE TABLE IF NOT EXISTS `sms_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `template_code` VARCHAR(50) NOT NULL COMMENT '模板编码',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号',
  `params` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '模板参数JSON',
  `content` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '实际发送内容',
  `result` TINYINT NOT NULL DEFAULT 0 COMMENT '结果: 0=失败 1=成功',
  `provider` VARCHAR(30) NOT NULL DEFAULT 'mock' COMMENT '服务商标识',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  PRIMARY KEY (`id`),
  KEY `idx_template_code` (`template_code`),
  KEY `idx_phone` (`phone`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_result` (`result`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信发送日志(仅追加)';

-- 16. 用户通知表
CREATE TABLE IF NOT EXISTS `user_notification` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '通知ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `type` VARCHAR(30) NOT NULL DEFAULT 'system' COMMENT '类型: system/task/promotion',
  `title` VARCHAR(200) NOT NULL COMMENT '通知标题',
  `content` TEXT NOT NULL COMMENT '通知内容',
  `is_read` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读: 0=未读 1=已读',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户通知表';

-- 17. 支付订单表
CREATE TABLE IF NOT EXISTS `payment_order` (
  `id` VARCHAR(50) NOT NULL COMMENT '订单ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `plan_type` TINYINT NOT NULL COMMENT '套餐类型: 1=月卡 2=季卡 3=年卡',
  `plan_name` VARCHAR(50) NOT NULL COMMENT '套餐名称',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '支付金额(元)',
  `paid` TINYINT NOT NULL DEFAULT 0 COMMENT '是否已支付: 0=未付 1=已付',
  `paid_at` DATETIME DEFAULT NULL COMMENT '支付时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付订单表';

-- DOWN
DROP TABLE IF EXISTS `payment_order`;
DROP TABLE IF EXISTS `user_notification`;
DROP TABLE IF EXISTS `sms_log`;
DROP TABLE IF EXISTS `sms_template`;
DROP TABLE IF EXISTS `user_batch_template`;
DROP TABLE IF EXISTS `membership_plan`;
DROP TABLE IF EXISTS `operation_log`;
DROP TABLE IF EXISTS `generated_video`;
DROP TABLE IF EXISTS `generated_image`;
DROP TABLE IF EXISTS `task`;
DROP TABLE IF EXISTS `consumption_record`;
DROP TABLE IF EXISTS `user_brand`;
DROP TABLE IF EXISTS `user_size_template`;
DROP TABLE IF EXISTS `platform_size`;
DROP TABLE IF EXISTS `user_membership`;
DROP TABLE IF EXISTS `user_token_blacklist`;
DROP TABLE IF EXISTS `user`;
