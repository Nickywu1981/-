USE ai_saas;

-- 用户（5人）
INSERT INTO user (id, username, password, nickname, phone, email, status, last_login_time, create_time) VALUES
(1, 'demo', '$2b$10$cT9sTfCsSDH7bdPBasKO/uN4tqRQQb0T/AFQZCOy1NVWsrpnfG16S', '电商达人小王', '13812345678', 'demo@example.com', 1, '2026-05-05 20:00:00', '2025-01-15 10:30:00'),
(2, 'seller_li', '$2b$10$yAcKe0YAE423bgaYGz/ZweV3J2rUCVYOclzBqo5EW2XXnFUGybeoe', '跨境卖家老李', '13987654321', 'li@example.com', 1, '2026-05-04 12:00:00', '2025-03-20 14:00:00'),
(3, 'studio_zhang', '$2b$10$4EHwPzjilqRd6N7.81OkV.BrNxIpp5kaJ9S7r.Cmkto5JaUY7rD7W', '美工张', '13611112222', 'zhang@studio.com', 1, '2026-05-05 16:00:00', '2025-04-01 09:15:00'),
(4, 'xiaomei_shop', '$2b$10$lbVzQvGmta6vu/nPerNfluxJ0/cIjRrG4k5jXMni0rdc1kVPyyPmK', '小美服饰旗舰店', '13733445566', 'xiaomei@shop.com', 1, '2026-05-03 10:00:00', '2025-04-10 16:20:00'),
(5, 'test_user', '$2b$10$rnO.rkHBsvi82cWHOAkGiOchqgFFAQZ1Yh91TPFNo9UMvihaFaflS', '测试新用户', '13500001111', '', 1, '2026-05-06 08:00:00', '2026-05-03 10:00:00');

-- 会员订阅
INSERT INTO user_membership (user_id, plan_type, status, credit_balance, start_time, end_time) VALUES
(1, 2, 1, 485, '2025-04-06 10:00:00', '2026-07-05 10:00:00'),
(2, 1, 1, 197, '2025-04-21 14:00:00', '2026-05-21 14:00:00'),
(3, 3, 1, 1975, '2025-04-29 09:00:00', '2026-04-29 09:00:00'),
(4, 1, 1, 85, '2025-04-22 16:00:00', '2026-05-22 16:00:00'),
(5, 0, 1, 20, '2026-05-03 10:00:00', NULL);

-- 品牌设置
INSERT INTO user_brand (user_id, logo_url, brand_name, primary_color, watermark_enabled, watermark_opacity, watermark_position) VALUES
(1, '', '小王的店', '#FF6B3D', 1, 30, 'br'),
(3, '', '运动达人旗舰店', '#007AFF', 1, 40, 'br');

-- 用户自定义尺寸模板
INSERT INTO user_size_template (user_id, name, width, height, platform, create_time) VALUES
(1, '我的淘宝主图', 800, 800, 'taobao', '2026-04-16 10:00:00'),
(1, '抖音竖版视频', 1080, 1920, 'douyin', '2026-04-18 10:00:00'),
(3, '亚马逊宽版', 2000, 2000, 'amazon', '2026-05-01 10:00:00');

-- 批量任务模板
INSERT INTO user_batch_template (user_id, name, operation, platform, style, image_count, create_time) VALUES
(1, '每日上新品', 'main_image', 'taobao', '简约白底', 0, '2026-04-26 10:00:00'),
(1, '每周视频', 'img2video', 'douyin', '', 0, '2026-04-28 10:00:00');

SELECT 'Data phase 1 OK' AS status;
