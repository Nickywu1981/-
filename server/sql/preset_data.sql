-- ============================================
-- 预设数据（来自 schema.sql 预设部分）
-- ============================================

USE ai_saas;

-- 短信模板
INSERT INTO sms_template (template_code, name, content, params_count, provider, remark) VALUES
('sms_register_code', '注册验证码', '【AI电商工具箱】您的注册验证码是: {code}，5分钟内有效，请勿泄露。', 1, 'mock', '注册页面使用'),
('sms_login_code', '登录验证码', '【AI电商工具箱】您的登录验证码是: {code}，5分钟内有效，请勿泄露。', 1, 'mock', '短信登录页面使用'),
('sms_reset_password', '找回密码', '【AI电商工具箱】您正在重置密码，验证码: {code}，5分钟内有效。如非本人操作请忽略。', 1, 'mock', '找回密码页面使用'),
('sms_bind_code', '绑定手机', '【AI电商工具箱】您的手机绑定验证码是: {code}，5分钟内有效。', 1, 'mock', '个人设置绑定手机使用'),
('sms_task_complete', '任务完成通知', '【AI电商工具箱】您的任务已完成！共生成{count}个作品，快去素材库查看吧。', 2, 'mock', '任务完成自动通知'),
('sms_batch_complete', '批量完成通知', '【AI电商工具箱】您的批量处理已完成！共处理{total}张图片，成功{success}张。', 2, 'mock', '批量任务完成通知'),
('sms_credit_low', '算力不足提醒', '【AI电商工具箱】您的剩余算力仅{credits}点，为避免影响使用，建议及时升级会员。', 1, 'mock', '算力低于阈值时触发'),
('sms_membership_expire', '会员到期提醒', '【AI电商工具箱】您的会员将于{days}天后到期，续费可享8折优惠。', 1, 'mock', '会员到期前3天提醒');

-- 会员套餐
INSERT INTO membership_plan (plan_type, name, price, original_price, credits, daily_credits, save_days, watermark_free, hd_export, brand_kit, batch_limit, priority_queue, sort_order) VALUES
(0, '免费版', 0.00, 0.00, 0, 5, 7, 0, 0, 0, 5, 0, 1),
(1, '月卡', 29.00, 39.00, 300, 0, -1, 1, 1, 1, 50, 1, 2),
(2, '季卡', 69.00, 99.00, 1000, 0, -1, 1, 1, 1, 80, 1, 3),
(3, '年卡', 199.00, 299.00, 5000, 0, -1, 1, 1, 1, 100, 1, 4);
