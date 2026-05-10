-- =====================================================
-- Movio AI v4.1 — migration_021_constraints_and_indexes.sql
-- P1 约束补全 + P2 复合索引 | 2026-05-11
-- Round 22: UNIQUE 约束防重复数据, 复合索引优化热点查询
-- =====================================================

-- UP

-- ======== P1-1: user.email UNIQUE 约束（防重复注册）========
-- 先清理可能的重复数据：保留最早创建的记录
DELETE u1 FROM user u1
  INNER JOIN user u2
  ON u1.email = u2.email AND u1.email != '' AND u1.id > u2.id;
ALTER TABLE user ADD UNIQUE INDEX uk_email (email);

-- ======== P1-2: user.phone UNIQUE 约束（防重复注册）========
DELETE u1 FROM user u1
  INNER JOIN user u2
  ON u1.phone = u2.phone AND u1.phone != '' AND u1.id > u2.id;
ALTER TABLE user DROP INDEX IF EXISTS idx_phone;
ALTER TABLE user ADD UNIQUE INDEX uk_phone (phone);

-- ======== P1-3: user_membership.user_id UNIQUE 约束（ON DUPLICATE KEY UPDATE 依赖）========
-- 清理可能因无唯一约束而产生的重复行
DELETE um1 FROM user_membership um1
  INNER JOIN user_membership um2
  ON um1.user_id = um2.user_id AND um1.id < um2.id;
ALTER TABLE user_membership DROP INDEX IF EXISTS idx_user_id;
ALTER TABLE user_membership ADD UNIQUE INDEX uk_user_id (user_id);

-- ======== P1-4: consumption_record.request_id UNIQUE 约束（幂等守卫）========
-- idx_request_id 已在 migration_019 创建，升级为 UNIQUE
ALTER TABLE consumption_record DROP INDEX IF EXISTS idx_request_id;
ALTER TABLE consumption_record ADD UNIQUE INDEX uk_request_id (request_id);

-- ======== P2-1: sms_log 复合索引 (phone, create_time) — 发送频率查询 ========
ALTER TABLE sms_log ADD INDEX IF NOT EXISTS idx_phone_time (phone, create_time);

-- ======== P2-2: operation_log 复合索引 (action, ip, create_time) — 注册刷量检测 ========
ALTER TABLE operation_log ADD INDEX IF NOT EXISTS idx_action_ip_time (action, ip, create_time);

-- ======== P2-3: operation_log 复合索引 (user_id, action, create_time) — 用户操作频率 ========
ALTER TABLE operation_log ADD INDEX IF NOT EXISTS idx_user_action_time (user_id, action, create_time);

-- ======== P2-4: task 复合索引 (status, priority, create_time) — 队列轮询 ========
ALTER TABLE task ADD INDEX IF NOT EXISTS idx_status_priority_time (status, priority, create_time);

-- ======== P2-5: job_queue 复合索引 (status, job_type, priority, created_at) — 作业认领 ========
ALTER TABLE job_queue ADD INDEX IF NOT EXISTS idx_status_type_priority (status, job_type, priority);

-- DOWN

-- ALTER TABLE user DROP INDEX IF EXISTS uk_email;
-- ALTER TABLE user DROP INDEX IF EXISTS uk_phone;
-- ALTER TABLE user ADD INDEX idx_phone (phone);
-- ALTER TABLE user_membership DROP INDEX IF EXISTS uk_user_id;
-- ALTER TABLE user_membership ADD INDEX idx_user_id (user_id);
-- ALTER TABLE consumption_record DROP INDEX IF EXISTS uk_request_id;
-- ALTER TABLE consumption_record ADD INDEX idx_request_id (request_id);
-- ALTER TABLE sms_log DROP INDEX IF EXISTS idx_phone_time;
-- ALTER TABLE operation_log DROP INDEX IF EXISTS idx_action_ip_time;
-- ALTER TABLE operation_log DROP INDEX IF EXISTS idx_user_action_time;
-- ALTER TABLE task DROP INDEX IF EXISTS idx_status_priority_time;
-- ALTER TABLE job_queue DROP INDEX IF EXISTS idx_status_type_priority;
