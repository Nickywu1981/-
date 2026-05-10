-- =====================================================
-- Movio AI v4.1 — migration_020_critical_schema_fixes.sql
-- P0 紧急修复 | 2026-05-10
-- 补全缺失表/列/索引，修正列名不匹配导致运行时 SQL 错误
-- =====================================================

-- UP

-- ======== P0-1: check_ins 表（creditDao 读写但无 DDL）========
CREATE TABLE IF NOT EXISTS check_ins (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  check_date  DATE NOT NULL,
  streak      INT UNSIGNED NOT NULL DEFAULT 0    COMMENT '连续签到天数',
  reward      INT UNSIGNED NOT NULL DEFAULT 0    COMMENT '本次奖励积分',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_date (user_id, check_date),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户签到记录';

-- ======== P0-2: marketing_badges 表（badgeDao 读写但无 DDL）========
CREATE TABLE IF NOT EXISTS marketing_badges (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(255) DEFAULT ''            COMMENT '徽章图标 URL',
  style_class VARCHAR(100) DEFAULT ''            COMMENT 'CSS 样式类名',
  category    VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '分类',
  sort_order  INT NOT NULL DEFAULT 0             COMMENT '排序',
  status      TINYINT NOT NULL DEFAULT 1         COMMENT '0=禁用 1=启用',
  is_deleted  TINYINT NOT NULL DEFAULT 0         COMMENT '软删除',
  create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='营销徽章/勋章表';

-- ======== P0-3: consumption_record 缺失列 ========
ALTER TABLE consumption_record
  ADD COLUMN IF NOT EXISTS tenant_id     INT UNSIGNED NOT NULL DEFAULT 0   COMMENT '租户ID' AFTER user_id,
  ADD COLUMN IF NOT EXISTS amount        DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '金额' AFTER type,
  ADD COLUMN IF NOT EXISTS balance_after INT NOT NULL DEFAULT 0            COMMENT '操作后余额' AFTER amount;

-- ======== P0-4: user_membership 缺失 tenant_id ========
ALTER TABLE user_membership
  ADD COLUMN IF NOT EXISTS tenant_id INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '租户ID' AFTER user_id;

-- ======== P0-5: points_transaction 列名对齐 DAO ========
-- DAO 使用 type/description/ref_id，但 DDL 使用 trans_type/remark/business_id
ALTER TABLE points_transaction
  CHANGE COLUMN IF EXISTS trans_type type VARCHAR(32) NOT NULL DEFAULT '' COMMENT '变更类型: earn/spend/refund/freeze/unfreeze/admin_adjust',
  ADD COLUMN IF NOT EXISTS description VARCHAR(255) DEFAULT '' COMMENT '变更描述' AFTER balance_after,
  ADD COLUMN IF NOT EXISTS ref_id VARCHAR(64) DEFAULT '' COMMENT '关联业务ID' AFTER description;
-- 保留 business_id/remark 列作为兼容（m002_business.sql 定义），两套列名共存
ALTER TABLE points_transaction
  ADD COLUMN IF NOT EXISTS business_id VARCHAR(64) DEFAULT '' COMMENT '业务ID(legacy)' AFTER amount,
  ADD COLUMN IF NOT EXISTS remark VARCHAR(255) DEFAULT '' COMMENT '备注(legacy)' AFTER business_id;

-- ======== P0-6: membership_plan 缺失列 ========
ALTER TABLE membership_plan
  ADD COLUMN IF NOT EXISTS duration_days INT NOT NULL DEFAULT 30     COMMENT '有效天数' AFTER credits,
  ADD COLUMN IF NOT EXISTS description  VARCHAR(500) DEFAULT ''     COMMENT '套餐描述' AFTER name,
  ADD COLUMN IF NOT EXISTS level        VARCHAR(20) DEFAULT 'free'  COMMENT '等级标识' AFTER plan_type;

-- ======== P1: 热点查询复合索引补全 ========
ALTER TABLE consumption_record
  ADD INDEX IF NOT EXISTS idx_user_time (user_id, create_time);
ALTER TABLE generated_image
  ADD INDEX IF NOT EXISTS idx_user_time (user_id, create_time);
ALTER TABLE generated_video
  ADD INDEX IF NOT EXISTS idx_user_time (user_id, create_time);
ALTER TABLE task
  ADD INDEX IF NOT EXISTS idx_user_time (user_id, create_time);
ALTER TABLE user_notification
  ADD INDEX IF NOT EXISTS idx_user_read_time (user_id, is_read, create_time);
ALTER TABLE operation_log
  ADD INDEX IF NOT EXISTS idx_user_time (user_id, create_time);
ALTER TABLE platform_size
  ADD INDEX IF NOT EXISTS idx_platform_category (platform, category);

-- ======== P2: CHECK 约束（MySQL 8.0.16+）========
-- 静默跳过不支持的 MySQL 版本，仅用于文档化约束意图
-- ALTER TABLE user ADD CONSTRAINT chk_user_status CHECK (status IN (0, 1));
-- ALTER TABLE task ADD CONSTRAINT chk_task_status CHECK (status IN (0, 1, 2, 3, 4));
-- ALTER TABLE user_membership ADD CONSTRAINT chk_membership_status CHECK (status IN (0, 1, 2));
-- ALTER TABLE diy_page ADD CONSTRAINT chk_page_status CHECK (status IN (0, 1, 2, 3));

-- DOWN

-- DROP TABLE IF EXISTS check_ins;
-- DROP TABLE IF EXISTS marketing_badges;
-- ALTER TABLE consumption_record DROP COLUMN IF EXISTS tenant_id, DROP COLUMN IF EXISTS amount, DROP COLUMN IF EXISTS balance_after;
-- ALTER TABLE user_membership DROP COLUMN IF EXISTS tenant_id;
-- ALTER TABLE points_transaction CHANGE COLUMN type trans_type VARCHAR(32);
-- ALTER TABLE points_transaction DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS ref_id;
-- ALTER TABLE membership_plan DROP COLUMN IF EXISTS duration_days, DROP COLUMN IF EXISTS description, DROP COLUMN IF EXISTS level;
