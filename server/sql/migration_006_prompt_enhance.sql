-- Migration 006: 提示词系统增强 — 使用历史 + 推荐缓存 + 模板评分
-- P5 Phase 3 新增功能

-- 1. 提示词使用历史（追踪用户使用行为供智能推荐）
CREATE TABLE IF NOT EXISTS `prompt_usage_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `template_id` int NOT NULL,
  `session_id` varchar(64) DEFAULT NULL COMMENT '同一次会话去重',
  `variables_used` json DEFAULT NULL COMMENT '本次使用的变量值快照',
  `result_satisfaction` tinyint DEFAULT NULL COMMENT '结果满意度 1-5星',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_time` (`user_id`, `create_time`),
  KEY `idx_template` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词使用历史';

-- 2. 智能推荐缓存表（预计算推荐结果，避免实时重算）
CREATE TABLE IF NOT EXISTS `prompt_recommendation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `tenant_id` int unsigned NOT NULL DEFAULT '0',
  `template_id` int NOT NULL,
  `score` decimal(5,2) NOT NULL DEFAULT '0.00' COMMENT '推荐分数',
  `reason` varchar(64) DEFAULT '' COMMENT '推荐理由标签',
  `rec_type` varchar(32) DEFAULT 'personal' COMMENT 'personal=个性化 global=热门 trending=趋势',
  `is_read` tinyint DEFAULT '0',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_template_type` (`user_id`, `template_id`, `rec_type`),
  KEY `idx_user_time` (`user_id`, `create_time` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词推荐结果';

-- 3. prompt_template 增强字段
ALTER TABLE `prompt_template`
  ADD COLUMN IF NOT EXISTS `tags` varchar(256) DEFAULT '' COMMENT '标签(逗号分隔)',
  ADD COLUMN IF NOT EXISTS `difficulty` tinyint DEFAULT '1' COMMENT '难度 1=新手 2=进阶 3=专家',
  ADD COLUMN IF NOT EXISTS `avg_rating` decimal(3,2) DEFAULT '0.00' COMMENT '平均评分',
  ADD COLUMN IF NOT EXISTS `rating_count` int DEFAULT '0' COMMENT '评分人数';

-- 4. 模板评分表
CREATE TABLE IF NOT EXISTS `prompt_rating` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `template_id` int NOT NULL,
  `rating` tinyint NOT NULL COMMENT '1-5星',
  `comment` varchar(256) DEFAULT '',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_template` (`user_id`, `template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='提示词模板评分';
