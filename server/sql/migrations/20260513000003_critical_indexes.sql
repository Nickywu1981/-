-- Migration: Add critical missing indexes for query performance
-- Date: 2026-05-13
-- Description: Adds indexes identified by DB performance audit
--   - prompt_group: ZERO secondary indexes → full table scan on every user_id lookup
--   - task: missing composite for hot-path worker poll (status + priority + create_time)
--   - consumption_record: missing request_id index for idempotency checks
--   - operation_log: missing ip index for rate limiting queries
--   - recharge_order: missing user_id+tenant_id composite for user listing
--   - tenant: missing status + plan_type indexes for admin dashboard
--   - user_membership: missing composite for cron batch free-plan recharge
--   - automation_task: missing user_id+tenant_id composite for multi-tenant queries

-- prompt_group: had ZERO secondary indexes (every user_id lookup = full table scan)
ALTER TABLE `prompt_group` ADD INDEX `idx_user_id` (`user_id`);

-- task: hot-path worker poll does ORDER BY priority DESC, create_time ASC with WHERE status = 0
ALTER TABLE `task` ADD INDEX `idx_status_priority_time` (`status`, `priority`, `create_time`);

-- consumption_record: request_id used in idempotency checks on every API call
ALTER TABLE `consumption_record` ADD INDEX `idx_request_id` (`request_id`);

-- operation_log: ip used in rate limiting queries (registration/login throttling)
ALTER TABLE `operation_log` ADD INDEX `idx_ip` (`ip`);

-- recharge_order: user order listing filters on user_id + tenant_id
ALTER TABLE `recharge_order` ADD INDEX `idx_user_tenant` (`user_id`, `tenant_id`);

-- tenant: admin dashboard filters by status + plan_type
ALTER TABLE `tenant` ADD INDEX `idx_status` (`status`);
ALTER TABLE `tenant` ADD INDEX `idx_plan_type` (`plan_type`);

-- user_membership: cron batch free-plan credit recharge scans by plan_type+status+is_deleted
ALTER TABLE `user_membership` ADD INDEX `idx_plan_status_del` (`plan_type`, `status`, `is_deleted`);

-- automation_task: all queries filter on both user_id AND tenant_id
ALTER TABLE `automation_task` ADD INDEX `idx_user_tenant` (`user_id`, `tenant_id`);
