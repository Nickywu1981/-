-- ============================================
-- P2: 自定义表单系统增强
-- 字段校验规则 + 联动条件 + 脱敏 + 双端适配
-- ============================================

-- 增强 custom_form 表（双端配置 + 权限 + 版本）
ALTER TABLE `custom_form`
  ADD COLUMN `pc_config` JSON NULL COMMENT 'PC端配置（布局/样式/宽度限制）' AFTER `fields_json`,
  ADD COLUMN `mobile_config` JSON NULL COMMENT '移动端配置（布局/样式/响应式）' AFTER `pc_config`,
  ADD COLUMN `owner_id` int unsigned NULL COMMENT '创建人ID' AFTER `status`,
  ADD COLUMN `access_type` tinyint NOT NULL DEFAULT '1' COMMENT '访问权限: 1=公开 2=登录可见 3=私有' AFTER `owner_id`,
  ADD COLUMN `max_submissions_per_user` int unsigned DEFAULT '0' COMMENT '每用户提交上限(0=不限)' AFTER `submit_count`,
  ADD COLUMN `redirect_url` varchar(500) DEFAULT NULL COMMENT '提交后跳转URL' AFTER `success_msg`,
  ADD COLUMN `data_retention_days` int unsigned DEFAULT '0' COMMENT '数据保留天数(0=永久)' AFTER `redirect_url`,
  ADD COLUMN `notify_email` varchar(200) DEFAULT NULL COMMENT '新提交通知邮箱' AFTER `data_retention_days`,
  ADD INDEX `idx_owner` (`owner_id`),
  ADD INDEX `idx_access` (`access_type`);

-- 自定义字段配置表（规范化字段定义，含校验/联动/脱敏）
CREATE TABLE IF NOT EXISTS `diy_custom_field` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `form_id` int unsigned NOT NULL COMMENT '关联表单ID',
  `field_name` varchar(50) NOT NULL COMMENT '字段名(key)',
  `field_label` varchar(100) NOT NULL COMMENT '字段标签',
  `field_type` varchar(20) NOT NULL COMMENT '类型: text/textarea/select/radio/checkbox/date/file/email/phone/number/cascade',
  `sort_order` int unsigned DEFAULT '0' COMMENT '排序权重',
  `is_required` tinyint NOT NULL DEFAULT '0' COMMENT '是否必填',
  `is_visible` tinyint NOT NULL DEFAULT '1' COMMENT '是否显示',
  `default_value` varchar(500) DEFAULT NULL COMMENT '默认值(JSON)',
  `placeholder` varchar(200) DEFAULT NULL COMMENT '占位提示',
  `options_json` json NULL COMMENT '选项列表(select/radio/checkbox)',
  # 校验规则
  `validation_rules` json NULL COMMENT '校验规则集: [{rule:"regex",value:"...",message:"..."},{rule:"min",value:1},{rule:"max",value:100}]',
  # 联动条件
  `linkage_conditions` json NULL COMMENT '联动条件: [{targetField:"xxx",operator:"eq|neq|gt|lt|in|contains",value:"..."}] → 满足才显示/启用',
  `linkage_action` varchar(20) DEFAULT 'show' COMMENT '联动动作: show=显示 hide=隐藏 enable=启用 disable=禁用',
  # 脱敏规则
  `masking_rule` varchar(30) DEFAULT NULL COMMENT '脱敏规则: phone=手机脱敏 email=邮箱脱敏 idcard=身份证脱敏 name=姓名脱敏 custom=自定义',
  `masking_pattern` varchar(100) DEFAULT NULL COMMENT '自定义脱敏正则(配合masking_rule=custom)',
  # 元数据
  `pc_col_span` tinyint unsigned DEFAULT '12' COMMENT 'PC端列宽(12栅格)',
  `mobile_col_span` tinyint unsigned DEFAULT '12' COMMENT '移动端列宽(12栅格)',
  `css_class` varchar(100) DEFAULT NULL COMMENT '自定义CSS类名',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_form` (`form_id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_sort` (`form_id`,`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='自定义表单字段配置';

-- 自定义模块表（编辑器组件模块定义）
CREATE TABLE IF NOT EXISTS `diy_custom_module` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `page_id` int unsigned DEFAULT NULL COMMENT '关联DIY页面ID(可空=全局模块)',
  `module_code` varchar(50) NOT NULL COMMENT '模块编码: form/image/text/banner/video/ai_component',
  `module_name` varchar(100) NOT NULL COMMENT '模块名称',
  `module_icon` varchar(50) DEFAULT NULL COMMENT '模块图标',
  `pc_config` json NULL COMMENT 'PC端配置(位置/尺寸/样式)',
  `mobile_config` json NULL COMMENT '移动端配置',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态: 1=启用 0=禁用',
  `sort_weight` int unsigned DEFAULT '100' COMMENT '排序权重',
  `version` varchar(20) DEFAULT '1.0.0' COMMENT '模块版本',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_page` (`page_id`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_code` (`module_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='DIY自定义功能模块';

-- 自定义事件/动作表
CREATE TABLE IF NOT EXISTS `diy_custom_action` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `module_id` int unsigned DEFAULT NULL COMMENT '关联模块ID',
  `page_id` int unsigned DEFAULT NULL COMMENT '关联页面ID',
  `trigger_type` varchar(30) NOT NULL COMMENT '触发类型: click/change/submit/load/hover/timer',
  `action_type` varchar(30) NOT NULL COMMENT '执行动作: show/hide/enable/disable/submit/redirect/call_api/validate',
  `condition_rules` json NULL COMMENT '条件判断规则(JSON)',
  `action_config` json NULL COMMENT '动作配置(URL/方法/参数等)',
  `sort_order` int unsigned DEFAULT '0',
  `is_enabled` tinyint NOT NULL DEFAULT '1' COMMENT '是否启用',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module_id`),
  KEY `idx_page` (`page_id`),
  KEY `idx_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='DIY自定义事件配置';

-- 表单提交记录增强
ALTER TABLE `custom_form_submission`
  ADD COLUMN `data_status` tinyint NOT NULL DEFAULT '0' COMMENT '数据状态: 0=正常 1=异常 2=已脱敏' AFTER `status`,
  ADD COLUMN `device_type` varchar(30) DEFAULT NULL COMMENT '提交设备' AFTER `user_agent`,
  ADD COLUMN `user_ip_long` bigint unsigned DEFAULT NULL COMMENT 'IP转整数(便于查询)' AFTER `ip`;
