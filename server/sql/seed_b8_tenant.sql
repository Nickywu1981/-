-- B8 多租户种子数据
INSERT INTO tenant (id, name, code, plan_type, status, contact_name, contact_phone, contact_email, max_users, quota_images, quota_video, expire_time) VALUES
(1, '默认租户', 'default', 'enterprise', 1, '电商达人小王', '13800138000', 'wang@example.com', 20, 10000, 1000, '2027-12-31 23:59:59'),
(2, '星辰服饰', 'xingchen', 'pro', 1, '李明', '13900139001', 'liming@xingchen.com', 10, 3000, 300, '2027-06-30 23:59:59'),
(3, '速卖优品', 'sumai', 'basic', 1, '张伟', '13700137002', 'zhangwei@sumai.com', 5, 500, 50, '2026-12-31 23:59:59'),
(4, '蓝海跨境', 'lanhai', 'free', 0, '赵芳', '13600136003', 'zhaofang@lanhai.com', 5, 100, 10, '2026-06-30 23:59:59'),
(5, '精品优选工作室', 'jingpin', 'pro', 1, '王磊', '13500135004', 'wanglei@jingpin.com', 8, 2000, 200, '2027-03-31 23:59:59');

-- 将所有已有数据的 tenant_id 设为 1（默认租户）
UPDATE user SET tenant_id = 1;
UPDATE user_membership SET tenant_id = 1;
UPDATE task SET tenant_id = 1;
UPDATE generated_image SET tenant_id = 1 WHERE id > 0;
UPDATE generated_video SET tenant_id = 1 WHERE id > 0;
UPDATE consumption_record SET tenant_id = 1;
UPDATE credit_request_log SET tenant_id = 1 WHERE id > 0;
UPDATE ai_call_log SET tenant_id = 1 WHERE id > 0;
UPDATE operation_log SET tenant_id = 1;
UPDATE payment_order SET tenant_id = 1 WHERE id > 0;
UPDATE sms_log SET tenant_id = 1;
UPDATE sms_template SET tenant_id = 1;
UPDATE user_notification SET tenant_id = 1;
UPDATE user_brand SET tenant_id = 1;
UPDATE user_size_template SET tenant_id = 1;
UPDATE user_batch_template SET tenant_id = 1;
UPDATE prompt_template SET tenant_id = 1;
UPDATE prompt_favorite SET tenant_id = 1 WHERE id > 0;
UPDATE prompt_group SET tenant_id = 1 WHERE id > 0;
UPDATE sensitive_word SET tenant_id = 1;
UPDATE platform_size SET tenant_id = 1;
UPDATE membership_plan SET tenant_id = 1;
UPDATE user_token_blacklist SET tenant_id = 1 WHERE id > 0;
