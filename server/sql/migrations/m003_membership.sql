-- =====================================================
-- Movio AI v4.1  —  m003_membership.sql
-- G6 数据库接口 | 2026-05-08
-- 补充表: 会员订阅 / 消费记录
-- v4.1 代码依赖但这些表仅存在于旧版 schema
-- =====================================================

-- UP

-- --------------------------------
-- 1. user_membership — 会员订阅表
-- 从旧 schema.sql 迁移，与 v4_user.routes.js 对齐
-- --------------------------------
CREATE TABLE IF NOT EXISTS user_membership (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  plan_type       TINYINT NOT NULL COMMENT '套餐: 0=免费 1=月卡 2=季卡 3=年卡',
  status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 0=已取消 1=生效中 2=已到期',
  trial_quota     INT NOT NULL DEFAULT 0 COMMENT '试用总次数',
  trial_used      INT NOT NULL DEFAULT 0 COMMENT '已用试用次数',
  credit_balance  INT NOT NULL DEFAULT 0 COMMENT '算力点数余额',
  start_time      DATETIME NOT NULL COMMENT '开始时间',
  end_time        DATETIME DEFAULT NULL COMMENT '到期时间(NULL=永久/免费)',
  auto_renew      TINYINT NOT NULL DEFAULT 0 COMMENT '自动续费: 0=关闭 1=开启',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id),
  INDEX idx_status (status),
  INDEX idx_end_time (end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会员订阅表';

-- --------------------------------
-- 2. consumption_record — 消费记录表
-- 从旧 schema.sql 迁移，列名与 v4_user.routes.js 对齐
-- --------------------------------
CREATE TABLE IF NOT EXISTS consumption_record (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL COMMENT '用户ID',
  type            TINYINT NOT NULL COMMENT '类型: 1=试用 2=会员扣点 3=充值',
  action          VARCHAR(50) NOT NULL COMMENT '操作标识',
  credit_before   INT NOT NULL DEFAULT 0 COMMENT '操作前点数',
  credit_after    INT NOT NULL DEFAULT 0 COMMENT '操作后点数',
  consumed        INT NOT NULL DEFAULT 0 COMMENT '消耗点数',
  remark          VARCHAR(200) NOT NULL DEFAULT '' COMMENT '备注',
  task_id         VARCHAR(36) NOT NULL DEFAULT '' COMMENT '关联任务ID',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_task (task_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消费记录表(仅追加)';

-- DOWN

DROP TABLE IF EXISTS consumption_record;
DROP TABLE IF EXISTS user_membership;
