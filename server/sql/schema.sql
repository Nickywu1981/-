-- ============================================
-- 电商 AI SaaS 数据库初始化脚本 v2.0
-- MySQL 8.0+, 全表逻辑删除, 下划线命名
-- ⚠️  此文件由迁移脚本自动生成，仅供快速参考
-- 所有表结构变更请通过 migrations/ 目录管理
-- 部署时按顺序执行 migrations/ 下的 SQL 文件
-- ============================================

CREATE DATABASE IF NOT EXISTS ai_saas DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_saas;

-- ----------------------------
-- 1. 用户表
-- ----------------------------
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

-- ----------------------------
-- 2. 用户 Token 黑名单（JWT 登出/刷新控制）
-- ----------------------------
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

-- ----------------------------
-- 3. 会员订阅表
-- ----------------------------
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
  KEY `idx_end_time` (`end_time`),
  KEY `idx_plan_status_del` (`plan_type`, `status`, `is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员订阅表';

-- ----------------------------
-- 4. 平台预设尺寸模板
-- ----------------------------
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

-- ----------------------------
-- 5. 用户自定义尺寸模板
-- ----------------------------
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

-- ----------------------------
-- 6. Brand Kit 品牌素材
-- ----------------------------
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

-- ----------------------------
-- 7. 消费记录
-- ----------------------------
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
  `request_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '幂等请求ID',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=正常 2=已回滚',
  `freeze_at` DATETIME DEFAULT NULL COMMENT '冻结时间',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`create_time`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_request_id` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消费记录表(仅追加)';

-- ----------------------------
-- 8. 异步任务表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `task` (
  `id` VARCHAR(36) NOT NULL COMMENT '任务UUID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `type` VARCHAR(30) NOT NULL COMMENT '任务类型: cutout/scene/video/detail_h5/model_tryon/action_transfer/batch',
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
  KEY `idx_create_time` (`create_time`),
  KEY `idx_status_priority_time` (`status`, `priority`, `create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异步任务表';

-- ----------------------------
-- 9. 生成图片记录
-- ----------------------------
CREATE TABLE IF NOT EXISTS `generated_image` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '图片ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `task_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '关联任务ID',
  `type` VARCHAR(30) NOT NULL COMMENT '类型: main_img/scene/detail_h5/hbanner/model_tryon/color_swap/ai_style',
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

-- ----------------------------
-- 10. 生成视频记录
-- ----------------------------
CREATE TABLE IF NOT EXISTS `generated_video` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '视频ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `task_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '关联任务ID',
  `type` VARCHAR(30) NOT NULL COMMENT '类型: img2video/multi2video/action_transfer/script_video/digital_human',
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

-- ----------------------------
-- 11. 操作日志
-- ----------------------------
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
  KEY `idx_create_time` (`create_time`),
  KEY `idx_ip` (`ip`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表(仅追加)';

-- ----------------------------
-- 12. 会员套餐配置（后台可调）
-- ----------------------------
CREATE TABLE IF NOT EXISTS `membership_plan` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '套餐ID',
  `plan_type` TINYINT NOT NULL COMMENT '套餐: 0=免费 1=月卡 2=季卡 3=年卡',
  `name` VARCHAR(50) NOT NULL COMMENT '套餐名称',
  `price` DECIMAL(10,2) NOT NULL COMMENT '价格(元)',
  `original_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '原价(划线价)',
  `credits` INT NOT NULL COMMENT '每月点数',
  `daily_credits` INT NOT NULL DEFAULT 0 COMMENT '每日赠送点数',
  `save_days` INT NOT NULL DEFAULT 7 COMMENT '作品保存天数',
  `watermark_free` TINYINT NOT NULL DEFAULT 0 COMMENT '去水印: 0=否 1=是',
  `hd_export` TINYINT NOT NULL DEFAULT 0 COMMENT '高清导出: 0=否 1=是',
  `brand_kit` TINYINT NOT NULL DEFAULT 0 COMMENT 'Brand Kit: 0=否 1=是',
  `batch_limit` INT NOT NULL DEFAULT 5 COMMENT '批量处理上限(张/次)',
  `priority_queue` TINYINT NOT NULL DEFAULT 0 COMMENT '优先队列: 0=否 1=是',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '启用: 0=禁用 1=启用',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_type` (`plan_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会员套餐配置';

-- ----------------------------
-- 13. 用户批量模板表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `user_batch_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `user_id` INT UNSIGNED NOT NULL COMMENT '用户ID',
  `name` VARCHAR(50) NOT NULL COMMENT '模板名称',
  `operation` VARCHAR(30) NOT NULL COMMENT '操作类型',
  `platform` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '目标平台',
  `style` VARCHAR(20) NOT NULL DEFAULT '' COMMENT '风格',
  `night_mode` TINYINT NOT NULL DEFAULT 0 COMMENT '夜间模式: 0=否 1=是',
  `image_count` INT NOT NULL DEFAULT 0 COMMENT '图片数量',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `is_deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_operation` (`operation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户批量模板';

-- ----------------------------
-- 14. 短信模板表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `sms_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `template_code` VARCHAR(50) NOT NULL COMMENT '模板编码(sms_register_code等)',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `content` VARCHAR(500) NOT NULL COMMENT '模板内容({code}占位)',
  `params_count` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '参数个数',
  `provider_template_id` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '服务商模板ID(接入后填写)',
  `provider` VARCHAR(30) NOT NULL DEFAULT 'mock' COMMENT '服务商: mock/aliyun/tencent',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '启用: 0=禁用 1=启用',
  `remark` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '备注/使用说明',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信模板';

-- ----------------------------
-- 15. 邮件模板表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `email_template` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '模板ID',
  `template_code` VARCHAR(50) NOT NULL COMMENT '模板编码(email_register_code等)',
  `name` VARCHAR(100) NOT NULL COMMENT '模板名称',
  `subject` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '邮件主题',
  `content` TEXT NOT NULL COMMENT 'HTML邮件内容({code}占位)',
  `provider_template_id` VARCHAR(100) NOT NULL DEFAULT '' COMMENT '服务商模板ID(接入后填写)',
  `provider` VARCHAR(30) NOT NULL DEFAULT 'mock' COMMENT '服务商: mock/smtp/sendgrid',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '启用: 0=禁用 1=启用',
  `remark` VARCHAR(200) NOT NULL DEFAULT '' COMMENT '备注/使用说明',
  `create_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邮件模板';

-- ----------------------------
-- 16. 短信发送日志表
-- ----------------------------
CREATE TABLE IF NOT EXISTS `sms_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '日志ID',
  `template_code` VARCHAR(50) NOT NULL COMMENT '模板编码',
  `phone` VARCHAR(20) NOT NULL COMMENT '手机号(脱敏建议存hash)',
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

-- ----------------------------
-- 17. 用户通知表
-- ----------------------------
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

-- ----------------------------
-- 18. 支付订单表
-- ----------------------------
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

-- ============================================
-- 预设数据: 短信模板
-- ============================================
INSERT INTO `sms_template` (`template_code`, `name`, `content`, `params_count`, `provider`, `remark`) VALUES
('sms_register_code',     '注册验证码',   '【AI电商工具箱】您的注册验证码是: {code}，5分钟内有效，请勿泄露。',                          1, 'mock', '注册页面使用'),
('sms_login_code',        '登录验证码',   '【AI电商工具箱】您的登录验证码是: {code}，5分钟内有效，请勿泄露。',                          1, 'mock', '短信登录页面使用'),
('sms_reset_password',    '找回密码验证码', '【AI电商工具箱】您正在重置密码，验证码: {code}，5分钟内有效。如非本人操作请忽略。',               1, 'mock', '找回密码页面使用'),
('sms_bind_code',         '绑定手机验证码', '【AI电商工具箱】您的手机绑定验证码是: {code}，5分钟内有效。',                            1, 'mock', '个人设置绑定手机使用'),
('sms_task_complete',     '任务完成通知',   '【AI电商工具箱】您的{task_type}任务已完成！共生成{count}个作品，快去素材库查看吧。',            2, 'mock', '任务完成自动通知'),
('sms_batch_complete',    '批量任务完成',   '【AI电商工具箱】您的批量处理已完成！共处理{total}张图片，成功{success}张。',                   2, 'mock', '批量任务完成通知'),
('sms_credit_low',        '算力不足提醒',   '【AI电商工具箱】您的剩余算力仅{credits}点，为避免影响使用，建议及时升级会员。',                 1, 'mock', '算力低于阈值时触发'),
('sms_membership_expire', '会员到期提醒',   '【AI电商工具箱】您的会员将于{days}天后到期，续费可享8折优惠！',                               1, 'mock', '会员到期前3天提醒');

INSERT INTO `email_template` (`template_code`, `name`, `subject`, `content`, `provider`, `remark`) VALUES
('email_register_code',   '注册验证码', '【AI电商工具箱】注册验证码',   '<h2>AI电商工具箱</h2><p>您的注册验证码为：<b>{code}</b>，5分钟内有效。</p>',                                                       'mock', '注册页面使用'),
('email_login_code',      '登录验证码', '【AI电商工具箱】登录验证码',   '<h2>AI电商工具箱</h2><p>您的登录验证码为：<b>{code}</b>，5分钟内有效。</p>',                                                       'mock', '邮箱登录页面使用'),
('email_reset_password',  '找回密码验证码', '【AI电商工具箱】密码重置', '<h2>AI电商工具箱</h2><p>您正在重置密码，验证码：<b>{code}</b>，5分钟内有效。如非本人操作请忽略。</p>',                                     'mock', '找回密码页面使用'),
('email_bind_code',       '绑定邮箱验证码', '【AI电商工具箱】邮箱绑定验证', '<h2>AI电商工具箱</h2><p>您的邮箱绑定验证码为：<b>{code}</b>，5分钟内有效。</p>',                                                   'mock', '个人设置绑定邮箱使用'),
('email_task_complete',   '任务完成通知', '【AI电商工具箱】任务完成通知', '<h2>AI电商工具箱</h2><p>您的{task_type}任务已完成！共生成{count}个作品，快去素材库查看吧。</p>',                                       'mock', '任务完成自动通知'),
('email_welcome',         '欢迎邮件',     '欢迎加入AI电商工具箱！',      '<h2>欢迎加入AI电商工具箱！</h2><p>免费体验AI抠图、场景生成、视频制作等功能。</p><p>开始您的AI电商创作之旅，提升商品视觉转化率。</p>',                'mock', '新用户注册后发送');

-- ============================================
-- 预设数据: 平台尺寸
-- ============================================
INSERT INTO `platform_size` (`platform`, `category`, `label`, `width`, `height`, `sort_order`) VALUES
-- ===== 淘宝 =====
('taobao',   '主图',   '淘宝主图 1:1 (800×800)',      800,  800,  1),
('taobao',   '主图',   '淘宝主图 3:4 (750×1000)',    750, 1000,  2),
('taobao',   '详情页', '淘宝详情页 (790宽)',          790,    0,  3),
('taobao',   '海报',   '淘宝店招 (1920×150)',       1920,  150,  4),
('taobao',   '视频',   '淘宝视频 1:1',              800,   800,  5),
('taobao',   '视频',   '淘宝视频 16:9',            1280,   720,  6),
-- ===== 拼多多 =====
('pdd',      '主图',   '拼多多主图 1:1 (800×800)',   800,  800,  1),
('pdd',      '主图',   '拼多多主图 (1000×1000)',    1000, 1000,  2),
('pdd',      '详情页', '拼多多详情页 (790宽)',        790,    0,  3),
('pdd',      '视频',   '拼多多视频 1:1',             800,  800,  4),
-- ===== 抖音 =====
('douyin',   '主图',   '抖音主图 1:1 (800×800)',     800,  800,  1),
('douyin',   '主图',   '抖音主图 3:4 (1080×1440)',  1080, 1440,  2),
('douyin',   '视频',   '抖音短视频 9:16',           1080, 1920,  3),
('douyin',   '视频',   '抖音横屏 16:9',             1920, 1080,  4),
-- ===== 小红书 =====
('xiaohongshu', '主图', '小红书 1:1 (1080×1080)',  1080, 1080,  1),
('xiaohongshu', '主图', '小红书 3:4 (1080×1440)',  1080, 1440,  2),
('xiaohongshu', '主图', '小红书 4:3 (1440×1080)',  1440, 1080,  3),
('xiaohongshu', '视频', '小红书视频 3:4',          1080, 1440,  4),
-- ===== 视频号 =====
('sph',      '主图',   '视频号商品图 1:1',          800,  800,  1),
('sph',      '视频',   '视频号 9:16',              1080, 1920,  2),
('sph',      '视频',   '视频号 16:9',              1920, 1080,  3),
-- ===== 亚马逊 =====
('amazon',   '主图',   '亚马逊主图 (2000×2000)',   2000, 2000,  1),
('amazon',   'A+',     '亚马逊A+ 横幅 (970×600)',    970,  600,  2),
('amazon',   'A+',     '亚马逊A+ 大图 (1464×600)',  1464,  600,  3),
('amazon',   '视频',   '亚马逊视频 16:9',           1920, 1080,  4),
-- ===== Temu =====
('temu',     '主图',   'Temu 主图 1:1 (1000×1000)', 1000, 1000,  1),
('temu',     '主图',   'Temu 主图 3:4 (1200×1600)', 1200, 1600,  2),
('temu',     '视频',   'Temu 视频 1:1',             1000, 1000,  3),
-- ===== Shein =====
('shein',    '主图',   'Shein 主图 1:1 (800×800)',   800,  800,  1),
('shein',    '主图',   'Shein 主图 3:4 (1200×1600)', 1200, 1600,  2),
('shein',    '视频',   'Shein 视频 9:16',           1080, 1920,  3),
-- ===== TikTok Shop =====
('tiktok',   '主图',   'TikTok 主图 1:1 (1080×1080)',1080, 1080, 1),
('tiktok',   '视频',   'TikTok 9:16',              1080, 1920,  2),
('tiktok',   '视频',   'TikTok 1:1',               1080, 1080,  3),
-- ===== 美客多 Mercado Libre =====
('mercado',  '主图',   '美客多 主图 (1600×1600)', 1600, 1600,  1),
('mercado',  '视频',   '美客多 视频 16:9',         1280,  720,  2),
-- ===== Ozon =====
('ozon',     '主图',   'Ozon 主图 (2000×2000)',    2000, 2000,  1),
('ozon',     '主图',   'Ozon 主图 3:4',            1200, 1600,  2),
-- ===== Shopee =====
('shopee',   '主图',   'Shopee 主图 (800×800)',      800,  800,  1),
('shopee',   '主图',   'Shopee 主图 3:4 (900×1200)', 900, 1200,  2),
('shopee',   '视频',   'Shopee 视频 1:1',           800,  800,  3),
-- ===== Lazada =====
('lazada',   '主图',   'Lazada 主图 (800×800)',      800,  800,  1),
('lazada',   '主图',   'Lazada 主图 3:4',          1080, 1440,  2),
('lazada',   '视频',   'Lazada 视频 16:9',         1280,  720,  3);

-- ============================================
-- 预设数据: 会员套餐
-- ============================================
INSERT INTO `membership_plan` (`plan_type`, `name`, `price`, `original_price`, `credits`, `daily_credits`, `save_days`, `watermark_free`, `hd_export`, `brand_kit`, `batch_limit`, `priority_queue`, `sort_order`) VALUES
(0, '免费版',    0.00,   0.00,    0,  5,   7, 0, 0, 0,  5, 0, 1),
(1, '月卡',     29.00,  39.00, 300,  0,  -1, 1, 1, 1, 50, 1, 2),
(2, '季卡',     69.00,  99.00, 1000, 0,  -1, 1, 1, 1, 80, 1, 3),
(3, '年卡',    199.00, 299.00, 5000, 0,  -1, 1, 1, 1, 100, 1, 4);

-- ============================================================
-- B8-B14 模块新增表
-- ============================================================

-- 租户表
CREATE TABLE IF NOT EXISTS `tenant` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT '租户名称',
  `code` varchar(50) NOT NULL COMMENT '租户编码',
  `logo` varchar(255) DEFAULT '',
  `domain` varchar(100) DEFAULT '',
  `plan_type` varchar(20) NOT NULL DEFAULT 'free',
  `review_status` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '审核状态: pending/approved/rejected',
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
  UNIQUE KEY `code` (`code`),
  KEY `idx_status` (`status`),
  KEY `idx_plan_type` (`plan_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户表';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='DIY页面';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='DIY组件库';

CREATE TABLE IF NOT EXISTS `diy_page_version` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `page_id` int unsigned NOT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `config_json` longtext NOT NULL,
  `remark` varchar(200) DEFAULT NULL,
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_page` (`page_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='DIY页面版本';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自定义表单';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='表单提交记录';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='API代理配置';

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
  UNIQUE KEY `order_no` (`order_no`),
  KEY `idx_user_tenant` (`user_id`, `tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值订单';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自动化平台账号';

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
  KEY `idx_user` (`user_id`),
  KEY `idx_user_tenant` (`user_id`, `tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自动化任务';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI提示词模板';

CREATE TABLE IF NOT EXISTS `prompt_group` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `name` varchar(64) NOT NULL,
  `sort_order` int DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词收藏分组';

CREATE TABLE IF NOT EXISTS `prompt_favorite` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `template_id` int NOT NULL,
  `group_id` int DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_template` (`user_id`,`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词模板收藏';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='敏感词库';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分请求幂等日志';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI调用日志';
