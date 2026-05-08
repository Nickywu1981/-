-- Migration 008: 文案生成历史表 — 商品标题/卖点文案生成记录
-- 支持多租户、多平台、多语种

CREATE TABLE IF NOT EXISTS `copy_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int unsigned NOT NULL DEFAULT '0' COMMENT '租户ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `type` varchar(32) NOT NULL COMMENT '生成类型: title=标题 description=卖点文案',
  `platform` varchar(32) DEFAULT '' COMMENT '目标平台: taobao/jd/pdd/douyin/amazon/shopee/lazada/tiktok',
  `input` json DEFAULT NULL COMMENT '用户输入的参数快照',
  `output` json DEFAULT NULL COMMENT 'AI生成结果',
  `language` varchar(16) DEFAULT 'zh-CN' COMMENT '语种',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_type` (`user_id`, `type`),
  KEY `idx_tenant` (`tenant_id`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文案生成历史';
