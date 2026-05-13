-- ============================================================
-- Migration 014: 渠道管理 (Channel Management)
-- Phase 7 — 企业/代理端渠道管理模块
-- ============================================================

-- 渠道关系表（下级代理招募/审核/等级）
CREATE TABLE IF NOT EXISTS channel_relation (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id   INT UNSIGNED NOT NULL COMMENT '上级企业/代理ID',
  child_tenant_id INT UNSIGNED NOT NULL COMMENT '下级代理ID',
  level       TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '渠道层级 1=直营 2=二级',
  status      ENUM('pending','active','rejected','suspended') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  audit_remark VARCHAR(500) DEFAULT '' COMMENT '审核备注',
  applied_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  audited_at  DATETIME DEFAULT NULL COMMENT '审核时间',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_child (tenant_id, child_tenant_id),
  INDEX idx_status (status),
  INDEX idx_child (child_tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='渠道关系表';

-- 分润政策配置表
CREATE TABLE IF NOT EXISTS commission_policy (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED NOT NULL COMMENT '所属代理ID',
  name            VARCHAR(100) NOT NULL COMMENT '政策名称',
  target_level    TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '适用渠道层级',
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT '分润比例(%)',
  min_revenue     DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '最低业绩门槛',
  max_cap         DECIMAL(12,2) DEFAULT NULL COMMENT '佣金上限(NULL=无上限)',
  product_types   JSON DEFAULT NULL COMMENT '适用商品类型 ["text","image","video"]',
  settlement_cycle ENUM('realtime','daily','weekly','monthly') NOT NULL DEFAULT 'monthly' COMMENT '结算周期',
  status          TINYINT NOT NULL DEFAULT 1 COMMENT '1=启用 0=停用',
  effective_from  DATE NOT NULL COMMENT '生效日期',
  effective_to    DATE DEFAULT NULL COMMENT '失效日期(NULL=永久)',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant (tenant_id),
  INDEX idx_status_date (status, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分润政策配置表';

-- 渠道业绩数据表
CREATE TABLE IF NOT EXISTS channel_performance (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id       INT UNSIGNED NOT NULL COMMENT '代理ID',
  child_tenant_id INT UNSIGNED DEFAULT NULL COMMENT '下级代理ID(NULL=自身业绩)',
  stat_date       DATE NOT NULL COMMENT '统计日期',
  order_count     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '订单数',
  order_amount    DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '订单金额',
  commission      DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT '佣金金额',
  new_customers   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '新增客户',
  token_usage     BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Token消耗量',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_child_date (tenant_id, IFNULL(child_tenant_id, 0), stat_date),
  INDEX idx_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='渠道业绩表';

-- ALTER: 扩展 tenant 表，增加渠道相关字段
ALTER TABLE tenant
  ADD COLUMN parent_channel_id INT UNSIGNED DEFAULT NULL COMMENT '上级渠道ID',
  ADD COLUMN channel_level TINYINT UNSIGNED DEFAULT 0 COMMENT '渠道层级 0=无上级',
  ADD COLUMN agent_code VARCHAR(50) DEFAULT NULL COMMENT '代理邀请码',
  ADD UNIQUE KEY uk_agent_code (agent_code);

-- DOWN
DROP TABLE IF EXISTS `channel_performance`;
DROP TABLE IF EXISTS `commission_policy`;
DROP TABLE IF EXISTS `channel_relation`;
ALTER TABLE `tenant`
  DROP INDEX IF EXISTS uk_agent_code,
  DROP COLUMN IF EXISTS `agent_code`,
  DROP COLUMN IF EXISTS `channel_level`,
  DROP COLUMN IF EXISTS `parent_channel_id`;
