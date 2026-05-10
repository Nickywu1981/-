-- =====================================================
-- Movio AI v4.1  —  migration_019_missing_columns_and_indexes.sql
-- P0/P1 审计修复 | 2026-05-10
-- 补全消费记录表缺失列 + 会员套餐缺失列 + 回调幂等唯一索引 + user_membership 缺失列
-- =====================================================

-- UP

-- 1. consumption_record: 补全 DAO 写入但 schema 中缺失的 6 列
ALTER TABLE consumption_record
  ADD COLUMN IF NOT EXISTS request_id  VARCHAR(64)  NOT NULL DEFAULT ''  COMMENT '幂等请求ID'        AFTER task_id,
  ADD COLUMN IF NOT EXISTS status      TINYINT      NOT NULL DEFAULT 1   COMMENT '状态: 0=冻结 1=已确认 2=已退款' AFTER request_id,
  ADD COLUMN IF NOT EXISTS freeze_at   DATETIME     DEFAULT NULL         COMMENT '冻结时间'           AFTER status,
  ADD COLUMN IF NOT EXISTS confirm_at  DATETIME     DEFAULT NULL         COMMENT '确认时间'           AFTER freeze_at,
  ADD COLUMN IF NOT EXISTS refund_at   DATETIME     DEFAULT NULL         COMMENT '退款时间'           AFTER confirm_at,
  ADD COLUMN IF NOT EXISTS refund_remark VARCHAR(200) NOT NULL DEFAULT '' COMMENT '退款备注'          AFTER refund_at;

-- 2. consumption_record: 新增幂等查询索引
ALTER TABLE consumption_record
  ADD INDEX IF NOT EXISTS idx_request_id (request_id);

-- 3. membership_plan: 补全 DAO 读写但 schema 中缺失的 daily_limit/monthly_limit
ALTER TABLE membership_plan
  ADD COLUMN IF NOT EXISTS daily_limit   INT NOT NULL DEFAULT 50   COMMENT '每日使用上限(次)' AFTER daily_credits,
  ADD COLUMN IF NOT EXISTS monthly_limit INT NOT NULL DEFAULT 1000 COMMENT '每月使用上限(次)' AFTER daily_limit;

-- 4. membership_plan: 种子数据同步更新默认值（仅 SET 不 INSERT 避免冲突）
UPDATE membership_plan SET daily_limit = 50, monthly_limit = 1000 WHERE plan_type = 0 AND daily_limit = 0;
UPDATE membership_plan SET daily_limit = 100, monthly_limit = 3000 WHERE plan_type = 1 AND daily_limit = 0;
UPDATE membership_plan SET daily_limit = 200, monthly_limit = 6000 WHERE plan_type = 2 AND daily_limit = 0;
UPDATE membership_plan SET daily_limit = 500, monthly_limit = 15000 WHERE plan_type = 3 AND daily_limit = 0;

-- 5. allinpay_notify_log: 回调幂等唯一复合索引（防重复回调双倍积分）
ALTER TABLE allinpay_notify_log
  ADD UNIQUE INDEX IF NOT EXISTS uk_reqsn_trxid (reqsn, trxid);

-- 6. user_membership: 补全 m003 缺失的 is_deleted 列（DAO 查询条件依赖）
ALTER TABLE user_membership
  ADD COLUMN IF NOT EXISTS is_deleted TINYINT NOT NULL DEFAULT 0 COMMENT '软删除: 0=正常 1=已删除' AFTER auto_renew;

-- 7. recharge_order: 用户查询性能索引
ALTER TABLE recharge_order
  ADD INDEX IF NOT EXISTS idx_user_status (user_id, pay_status),
  ADD INDEX IF NOT EXISTS idx_create_time (create_time);

-- DOWN

-- ALTER TABLE consumption_record DROP COLUMN IF EXISTS request_id, DROP COLUMN IF EXISTS status, DROP COLUMN IF EXISTS freeze_at, DROP COLUMN IF EXISTS confirm_at, DROP COLUMN IF EXISTS refund_at, DROP COLUMN IF EXISTS refund_remark;
-- ALTER TABLE membership_plan DROP COLUMN IF EXISTS daily_limit, DROP COLUMN IF EXISTS monthly_limit;
-- ALTER TABLE allinpay_notify_log DROP INDEX IF EXISTS uk_reqsn_trxid;
-- ALTER TABLE user_membership DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE recharge_order DROP INDEX IF EXISTS idx_user_status, DROP INDEX IF EXISTS idx_create_time;
