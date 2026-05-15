-- ============================================
-- 预设数据 + 种子数据（完整版）
-- 执行方式: mysql -u $DB_USER -p$DB_PASSWORD --default-character-set=utf8mb4 < seed_all.sql
-- 或通过 npm run db:seed (推荐)
-- ============================================

USE ai_saas;

-- ==================== 短信模板（8条） ====================
INSERT INTO sms_template (template_code, name, content, params_count, provider, remark) VALUES
('sms_register_code', '注册验证码', '【AI电商工具箱】您的注册验证码是: {code}，5分钟内有效，请勿泄露。', 1, 'mock', '注册页面使用'),
('sms_login_code', '登录验证码', '【AI电商工具箱】您的登录验证码是: {code}，5分钟内有效，请勿泄露。', 1, 'mock', '短信登录页面使用'),
('sms_reset_password', '找回密码', '【AI电商工具箱】您正在重置密码，验证码: {code}，5分钟内有效。如非本人操作请忽略。', 1, 'mock', '找回密码页面使用'),
('sms_bind_code', '绑定手机', '【AI电商工具箱】您的手机绑定验证码是: {code}，5分钟内有效。', 1, 'mock', '个人设置绑定手机使用'),
('sms_task_complete', '任务完成通知', '【AI电商工具箱】您的任务已完成！共生成{count}个作品，快去素材库查看吧。', 2, 'mock', '任务完成自动通知'),
('sms_batch_complete', '批量完成通知', '【AI电商工具箱】您的批量处理已完成！共处理{total}张图片，成功{success}张。', 2, 'mock', '批量任务完成通知'),
('sms_credit_low', '算力不足提醒', '【AI电商工具箱】您的剩余算力仅{credits}点，为避免影响使用，建议及时升级会员。', 1, 'mock', '算力低于阈值时触发'),
('sms_membership_expire', '会员到期提醒', '【AI电商工具箱】您的会员将于{days}天后到期，续费可享8折优惠。', 1, 'mock', '会员到期前3天提醒');

-- ==================== 会员套餐（4条） ====================
INSERT INTO membership_plan (plan_type, name, price, original_price, credits, daily_credits, save_days, watermark_free, hd_export, brand_kit, batch_limit, priority_queue, sort_order) VALUES
(0, '免费版', 0.00, 0.00, 0, 5, 7, 0, 0, 0, 5, 0, 1),
(1, '月卡', 29.00, 39.00, 300, 0, -1, 1, 1, 1, 50, 1, 2),
(2, '季卡', 69.00, 99.00, 1000, 0, -1, 1, 1, 1, 80, 1, 3),
(3, '年卡', 199.00, 299.00, 5000, 0, -1, 1, 1, 1, 100, 1, 4);

-- ==================== 用户（5人） ====================
INSERT INTO user (id, username, password, nickname, phone, email, status, last_login_time, create_time) VALUES
(1, 'demo', '$2b$10$cT9sTfCsSDH7bdPBasKO/uN4tqRQQb0T/AFQZCOy1NVWsrpnfG16S', '电商达人小王', '13812345678', 'demo@example.com', 1, '2026-05-05 20:00:00', '2025-01-15 10:30:00'),
(2, 'seller_li', '$2b$10$yAcKe0YAE423bgaYGz/ZweV3J2rUCVYOclzBqo5EW2XXnFUGybeoe', '跨境卖家老李', '13987654321', 'li@example.com', 1, '2026-05-04 12:00:00', '2025-03-20 14:00:00'),
(3, 'studio_zhang', '$2b$10$4EHwPzjilqRd6N7.81OkV.BrNxIpp5kaJ9S7r.Cmkto5JaUY7rD7W', '美工张', '13611112222', 'zhang@studio.com', 1, '2026-05-05 16:00:00', '2025-04-01 09:15:00'),
(4, 'xiaomei_shop', '$2b$10$lbVzQvGmta6vu/nPerNfluxJ0/cIjRrG4k5jXMni0rdc1kVPyyPmK', '小美服饰旗舰店', '13733445566', 'xiaomei@shop.com', 1, '2026-05-03 10:00:00', '2025-04-10 16:20:00'),
(5, 'test_user', '$2b$10$rnO.rkHBsvi82cWHOAkGiOchqgFFAQZ1Yh91TPFNo9UMvihaFaflS', '测试新用户', '13500001111', '', 1, '2026-05-06 08:00:00', '2026-05-03 10:00:00');

-- ==================== 会员订阅 ====================
INSERT INTO user_membership (user_id, plan_type, status, credit_balance, start_time, end_time) VALUES
(1, 2, 1, 485, '2025-04-06 10:00:00', '2026-07-05 10:00:00'),
(2, 1, 1, 197, '2025-04-21 14:00:00', '2026-05-21 14:00:00'),
(3, 3, 1, 1975, '2025-04-29 09:00:00', '2026-04-29 09:00:00'),
(4, 1, 1, 85, '2025-04-22 16:00:00', '2026-05-22 16:00:00'),
(5, 0, 1, 20, '2026-05-03 10:00:00', NULL);

-- ==================== 品牌设置 ====================
INSERT INTO user_brand (user_id, logo_url, brand_name, primary_color, watermark_enabled, watermark_opacity, watermark_position) VALUES
(1, '', '小王的店', '#FF6B3D', 1, 30, 'br'),
(3, '', '运动达人旗舰店', '#007AFF', 1, 40, 'br');

-- ==================== 用户自定义尺寸模板 ====================
INSERT INTO user_size_template (user_id, name, width, height, platform, create_time) VALUES
(1, '我的淘宝主图', 800, 800, 'taobao', '2026-04-16 10:00:00'),
(1, '抖音竖版视频', 1080, 1920, 'douyin', '2026-04-18 10:00:00'),
(3, '亚马逊宽版', 2000, 2000, 'amazon', '2026-05-01 10:00:00');

-- ==================== 批量任务模板 ====================
INSERT INTO user_batch_template (user_id, name, operation, platform, style, image_count, create_time) VALUES
(1, '每日上新品', 'main_image', 'taobao', '简约白底', 0, '2026-04-26 10:00:00'),
(1, '每周视频', 'img2video', 'douyin', '', 0, '2026-04-28 10:00:00');

-- ==================== 异步任务（22条） ====================
INSERT INTO task (id, user_id, type, title, status, input_params, output_result, progress, review_status, create_time, update_time) VALUES
('t001', 1, 'main_image', '夏季连衣裙主图', 2, '{"platform":"taobao","style":"简约白底"}', '{"images":["/uploads/demo/main-1-1.jpg","/uploads/demo/main-1-2.jpg","/uploads/demo/main-1-3.jpg"]}', 100, 0, '2026-05-05 10:00:00', '2026-05-05 10:05:00'),
('t002', 1, 'scene', '咖啡馆场景图', 2, '{"scene":"cafe","count":5}', '{"images":["/uploads/demo/scene-1.jpg","/uploads/demo/scene-2.jpg","/uploads/demo/scene-3.jpg"]}', 100, 0, '2026-05-04 16:00:00', '2026-05-04 16:08:00'),
('t003', 1, 'img2video', '连衣裙带货视频', 2, '{"duration":15,"ratio":"9:16"}', '{"url":"/uploads/demo/video-1.mp4","duration":15,"cover":"/uploads/demo/cover-1.jpg"}', 100, 0, '2026-05-04 10:00:00', '2026-05-04 10:15:00'),
('t004', 2, 'main_image', '蓝牙耳机白底图', 2, '{"platform":"amazon","style":"简约白底"}', '{"images":["/uploads/demo/product-2.jpg"]}', 100, 0, '2026-05-05 14:00:00', '2026-05-05 14:03:00'),
('t005', 2, 'virtual_tryon', 'T恤虚拟模特上身', 1, '{"model":"asian_female","body":"medium","cloth":"T-shirt-01"}', '{}', 65, 0, '2026-05-06 08:00:00', '2026-05-06 08:05:00'),
('t006', 1, 'batch', '批量生成主图-20件', 2, '{"type":"main_image","count":20}', '{"images":["/uploads/demo/batch-1.jpg","/uploads/demo/batch-2.jpg"]}', 100, 0, '2026-05-03 10:00:00', '2026-05-03 10:20:00'),
('t007', 3, 'main_image', '运动鞋主图', 2, '{"platform":"douyin","style":"高级轻奢"}', '{"images":["/uploads/demo/shoe-1.jpg","/uploads/demo/shoe-2.jpg","/uploads/demo/shoe-3.jpg"]}', 100, 0, '2026-05-05 18:00:00', '2026-05-05 18:04:00'),
('t008', 3, 'scene', '户外运动场景-跑鞋', 2, '{"scene":"outdoor","count":5}', '{"images":["/uploads/demo/shoe-scene-1.jpg","/uploads/demo/shoe-scene-2.jpg"]}', 100, 0, '2026-05-05 15:00:00', '2026-05-05 15:06:00'),
('t009', 1, 'detail_h5', '连衣裙详情页', 2, '{"category":"women_dress","platform":"taobao","skus":3}', '{"images":["/uploads/demo/detail-1.jpg","/uploads/demo/detail-2.jpg","/uploads/demo/detail-3.jpg"]}', 100, 0, '2026-05-01 10:00:00', '2026-05-01 10:12:00'),
('t010', 1, 'color_swap', '连衣裙换色', 2, '{"original":"#ffffff","target":["#ff0000","#0000ff","#000000"]}', '{"images":["/uploads/demo/color-red.jpg","/uploads/demo/color-blue.jpg","/uploads/demo/color-black.jpg"]}', 100, 0, '2026-04-30 10:00:00', '2026-04-30 10:06:00'),
('t011', 4, 'main_image', '韩版衬衫主图', 2, '{"platform":"pdd","style":"活动促销"}', '{"images":["/uploads/demo/cloth-main-1.jpg","/uploads/demo/cloth-main-2.jpg"]}', 100, 0, '2026-05-04 20:00:00', '2026-05-04 20:04:00'),
('t012', 4, 'ghost_mannequin', '衬衫幽灵人台', 2, '{"cloth_type":"shirt"}', '{"images":["/uploads/demo/ghost-1.jpg"]}', 100, 0, '2026-05-04 18:00:00', '2026-05-04 18:03:00'),
('t013', 2, 'image_translate', '产品图英文翻译', 2, '{"from":"zh","to":"en"}', '{"images":["/uploads/demo/translate-1.jpg"]}', 100, 0, '2026-05-03 20:00:00', '2026-05-03 20:05:00'),
('t014', 3, 'video_compose', '多图合成带货视频', 2, '{"duration":30,"ratio":"9:16"}', '{"url":"/uploads/demo/compose-video.mp4","duration":30}', 100, 0, '2026-05-03 14:00:00', '2026-05-03 14:25:00'),
('t015', 4, 'style_transfer', '衬衫水彩风格', 2, '{"style":"watercolor"}', '{"images":["/uploads/demo/style-1.jpg"]}', 100, 0, '2026-05-05 08:00:00', '2026-05-05 08:06:00'),
('t016', 3, 'action_transfer', '模特跳舞动作迁移-5人', 2, '{"mode":"one_action_multi_person","count":5}', '{"videos":["/uploads/demo/action-1.mp4","/uploads/demo/action-2.mp4","/uploads/demo/action-3.mp4","/uploads/demo/action-4.mp4","/uploads/demo/action-5.mp4"]}', 100, 0, '2026-05-03 08:00:00', '2026-05-03 08:35:00'),
('t017', 1, 'script_gen', '连衣裙带货脚本', 2, '{"product":"夏季连衣裙","platform":"douyin"}', '{"script":"【5秒吸睛】这条裙子太仙了！【痛点】夏天穿什么？【产品展示】高腰A字版型+冰丝面料【行动号召】限时特惠，手慢无！"}', 100, 0, '2026-05-02 10:00:00', '2026-05-02 10:01:00'),
('t018', 2, 'person_replace', '人物替换-多动作', 2, '{"mode":"one_person_multi_action","count":3}', '{"videos":["/uploads/demo/replace-1.mp4","/uploads/demo/replace-2.mp4","/uploads/demo/replace-3.mp4"]}', 100, 0, '2026-05-03 12:00:00', '2026-05-03 12:20:00'),
('t019', 4, 'wrinkle_remove', '棉质衬衫去褶皱', 2, '{"fabric":"cotton"}', '{"images":["/uploads/demo/wrinkle-1.jpg"]}', 100, 0, '2026-05-04 22:00:00', '2026-05-04 22:03:00'),
('t020', 1, 'viral_clone', '爆款视频复刻-连衣裙', 2, '{"source_video_url":"/uploads/user-source-viral.mp4"}', '{"url":"/uploads/demo/viral-clone.mp4"}', 100, 0, '2026-04-29 10:00:00', '2026-04-29 10:18:00'),
('t021', 2, 'main_image', '新款充电宝主图', 0, '{}', '{}', 0, 0, '2026-05-06 07:00:00', '2026-05-06 07:00:00'),
('t022', 3, 'shot_plan', '运动鞋视频分镜', 2, '{"product":"运动跑鞋","style":"运动风"}', '{"shots":[{"no":1,"desc":"产品360度展示","camera":"推镜头","duration":3},{"no":2,"desc":"鞋底特写","camera":"微距特写","duration":2},{"no":3,"desc":"跑步动态","camera":"跟拍","duration":4},{"no":4,"desc":"对比展示","camera":"分屏","duration":3},{"no":5,"desc":"CTA购买引导","camera":"定镜","duration":3}]}', 100, 0, '2026-05-05 12:00:00', '2026-05-05 12:02:00');

-- ==================== 消费记录（13条） ====================
INSERT INTO consumption_record (user_id, type, action, credit_before, credit_after, consumed, remark, task_id, create_time) VALUES
(1, 3, 'purchase_plan_2', 0, 500, -500, '购买季卡 69元', '', '2026-04-06 10:00:00'),
(1, 2, 'task_main_image', 500, 497, 3, '做主图消耗', 't001', '2026-05-05 10:00:00'),
(1, 2, 'task_scene', 497, 492, 5, '做场景消耗', 't002', '2026-05-04 16:00:00'),
(1, 2, 'task_img2video', 492, 482, 10, '做视频消耗', 't003', '2026-05-04 10:00:00'),
(2, 3, 'purchase_plan_1', 0, 200, -200, '购买月卡 29元', '', '2026-04-21 14:00:00'),
(2, 2, 'task_main_image', 200, 197, 3, '做主图消耗', 't004', '2026-05-05 14:00:00'),
(3, 3, 'purchase_plan_3', 0, 2000, -2000, '购买年卡 199元', '', '2026-04-29 09:00:00'),
(3, 2, 'task_main_image', 2000, 1997, 3, '做主图消耗', 't007', '2026-05-05 18:00:00'),
(4, 3, 'purchase_plan_1', 0, 100, -100, '购买月卡 29元', '', '2026-04-22 16:00:00'),
(4, 2, 'task_main_image', 100, 97, 3, '做主图消耗', 't011', '2026-05-04 20:00:00'),
(1, 2, 'task_batch', 482, 457, 25, '批量生成消耗', 't006', '2026-05-03 10:00:00'),
(1, 2, 'task_action_transfer', 457, 427, 30, '动作迁移消耗', 't016', '2026-05-03 08:00:00'),
(5, 0, 'daily_free', 0, 20, -20, '新用户注册赠送', '', '2026-05-03 10:00:00');

-- ==================== 通知（7条） ====================
INSERT INTO operation_log (user_id, action, target_type, target_id, detail, ip, create_time) VALUES
(1, 'user_login', '', '', '', '127.0.0.1', '2026-05-05 20:00:00'),
(1, 'task_submit', 'task', 't001', '{"task_type":"main_image","title":"夏季连衣裙主图"}', '127.0.0.1', '2026-05-05 10:00:00'),
(2, 'user_register', '', '', '{"username":"seller_li"}', '192.168.1.100', '2026-04-21 14:00:00'),
(1, 'batch_submit', 'task', 't006', '{"count":20,"type":"main_image"}', '127.0.0.1', '2026-05-03 10:00:00'),
(3, 'plan_purchase', '', '', '{"plan":"年卡","price":199}', '10.0.0.5', '2026-04-29 09:00:00'),
(NULL, 'admin_login', '', '', '', '127.0.0.1', '2026-05-06 09:00:00');

-- ==================== 支付订单 ====================
INSERT INTO consumption_record (user_id, type, action, credit_before, credit_after, consumed, remark, create_time) VALUES
(1, 3, 'purchase_plan_3', 427, 427, 0, '待支付: 年卡 199元', '2026-05-05 22:00:00');

-- ==================== 短信日志 ====================
INSERT INTO sms_log (template_code, phone, params, content, result, provider, create_time) VALUES
('sms_register_code', '138****5678', '{"code":"482917"}', '【AI电商工具箱】您的注册验证码是: 482917，5分钟内有效，请勿泄露。', 1, 'mock', '2026-04-06 10:00:00'),
('sms_login_code', '139****4321', '{"code":"729103"}', '【AI电商工具箱】您的登录验证码是: 729103，5分钟内有效，请勿泄露。', 1, 'mock', '2026-04-21 14:00:00'),
('sms_task_complete', '138****5678', '{"count":3}', '【AI电商工具箱】您的任务已完成！共生成3个作品，快去素材库查看吧。', 1, 'mock', '2026-05-05 10:05:00');

SELECT 'Seed data loaded OK' AS status;
