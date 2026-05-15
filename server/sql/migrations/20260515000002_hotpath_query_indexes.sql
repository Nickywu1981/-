-- Migration: Add missing hot-path indexes (Y2 round 3, R85 audit)
-- Date: 2026-05-15
-- Description: Indexes identified by cross-referencing DAO WHERE/ORDER BY
--   patterns against existing indexes on high-traffic tables.
--
-- 1. consumption_record(user_id, type, status, create_time)  [P0]
--    Hottest path: creditDao.getDailyUsedCredits + getMonthlyUsedCredits +
--    commerceDao.getBillingHistory + customerDao dashboard stats
--    Query: WHERE user_id=? AND status=1 AND type=2 AND DATE(create_time)=CURDATE()
--
-- 2. operation_log(action, ip, create_time)  [P1]
--    commerceDao.countIPRegister24h — rate limiting gate on every register/login
--    Query: WHERE action=? AND ip=? AND create_time > DATE_SUB(NOW(), INTERVAL 24 HOUR)
--
-- 3. operation_log(user_id, action, create_time)  [P2]
--    commerceDao.countUserAction1m — per-user action rate limiting
--    Query: WHERE user_id=? AND action=? AND create_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
--
-- 4. distributor_commission(distributor_id, status)  [P1]
--    distributionDao.getAvailableBalanceForUpdate + getPendingCommissions +
--    financeDao.listEarnings — every earnings/withdrawal query
--    Query: WHERE distributor_id=? AND status='settled'
--
-- 5. task(review_status)  [P1]
--    commerceDao.listAllTasks({reviewStatus}) + approveTask + rejectTask
--    Query: WHERE t.review_status=?

-- 1. 积分消费记录 — P0 最高优先级，每次 AI 调用都触发
CREATE INDEX IF NOT EXISTS `idx_user_type_status_time`
  ON `consumption_record` (`user_id`, `type`, `status`, `create_time`);

-- 2. 操作日志 — 注册/登录频控
CREATE INDEX IF NOT EXISTS `idx_action_ip_time`
  ON `operation_log` (`action`, `ip`, `create_time`);

-- 3. 操作日志 — 用户行为频控
CREATE INDEX IF NOT EXISTS `idx_user_action_time`
  ON `operation_log` (`user_id`, `action`, `create_time`);

-- 4. 分销佣金 — 收益/提现查询
CREATE INDEX IF NOT EXISTS `idx_distributor_status`
  ON `distributor_commission` (`distributor_id`, `status`);

-- 5. 任务审核 — 管理后台审核队列
CREATE INDEX IF NOT EXISTS `idx_review_status`
  ON `task` (`review_status`);

-- DOWN
-- DROP INDEX `idx_review_status` ON `task`;
-- DROP INDEX `idx_distributor_status` ON `distributor_commission`;
-- DROP INDEX `idx_user_action_time` ON `operation_log`;
-- DROP INDEX `idx_action_ip_time` ON `operation_log`;
-- DROP INDEX `idx_user_type_status_time` ON `consumption_record`;
