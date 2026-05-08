-- UP
-- ============================================
-- 预设数据: 短信模板 + 平台尺寸 + 会员套餐
-- ============================================

-- 短信模板 (8条)
INSERT INTO `sms_template` (`template_code`, `name`, `content`, `params_count`, `provider`, `remark`) VALUES
('sms_register_code',     '注册验证码',   '【AI电商工具箱】您的注册验证码是: {code}，5分钟内有效，请勿泄露。',                          1, 'mock', '注册页面使用'),
('sms_login_code',        '登录验证码',   '【AI电商工具箱】您的登录验证码是: {code}，5分钟内有效，请勿泄露。',                          1, 'mock', '短信登录页面使用'),
('sms_reset_password',    '找回密码验证码', '【AI电商工具箱】您正在重置密码，验证码: {code}，5分钟内有效。如非本人操作请忽略。',               1, 'mock', '找回密码页面使用'),
('sms_bind_code',         '绑定手机验证码', '【AI电商工具箱】您的手机绑定验证码是: {code}，5分钟内有效。',                            1, 'mock', '个人设置绑定手机使用'),
('sms_task_complete',     '任务完成通知',   '【AI电商工具箱】您的{task_type}任务已完成！共生成{count}个作品，快去素材库查看吧。',            2, 'mock', '任务完成自动通知'),
('sms_batch_complete',    '批量任务完成',   '【AI电商工具箱】您的批量处理已完成！共处理{total}张图片，成功{success}张。',                   2, 'mock', '批量任务完成通知'),
('sms_credit_low',        '算力不足提醒',   '【AI电商工具箱】您的剩余算力仅{credits}点，为避免影响使用，建议及时升级会员。',                 1, 'mock', '算力低于阈值时触发'),
('sms_membership_expire', '会员到期提醒',   '【AI电商工具箱】您的会员将于{days}天后到期，续费可享8折优惠！',                               1, 'mock', '会员到期前3天提醒');

-- 会员套餐 (4条)
INSERT INTO `membership_plan` (`plan_type`, `name`, `price`, `original_price`, `credits`, `daily_credits`, `save_days`, `watermark_free`, `hd_export`, `brand_kit`, `batch_limit`, `priority_queue`, `sort_order`) VALUES
(0, '免费版',    0.00,   0.00,    0,  5,   7, 0, 0, 0,  5, 0, 1),
(1, '月卡',     29.00,  39.00, 300,  0,  -1, 1, 1, 1, 50, 1, 2),
(2, '季卡',     69.00,  99.00, 1000, 0,  -1, 1, 1, 1, 80, 1, 3),
(3, '年卡',    199.00, 299.00, 5000, 0,  -1, 1, 1, 1, 100, 1, 4);

-- 平台尺寸 (12个平台, 46条)
INSERT INTO `platform_size` (`platform`, `category`, `label`, `width`, `height`, `sort_order`) VALUES
-- 淘宝
('taobao',   '主图',   '淘宝主图 1:1 (800×800)',      800,  800,  1),
('taobao',   '主图',   '淘宝主图 3:4 (750×1000)',    750, 1000,  2),
('taobao',   '详情页', '淘宝详情页 (790宽)',          790,    0,  3),
('taobao',   '海报',   '淘宝店招 (1920×150)',       1920,  150,  4),
('taobao',   '视频',   '淘宝视频 1:1',              800,   800,  5),
('taobao',   '视频',   '淘宝视频 16:9',            1280,   720,  6),
-- 拼多多
('pdd',      '主图',   '拼多多主图 1:1 (800×800)',   800,  800,  1),
('pdd',      '主图',   '拼多多主图 (1000×1000)',    1000, 1000,  2),
('pdd',      '详情页', '拼多多详情页 (790宽)',        790,    0,  3),
('pdd',      '视频',   '拼多多视频 1:1',             800,  800,  4),
-- 抖音
('douyin',   '主图',   '抖音主图 1:1 (800×800)',     800,  800,  1),
('douyin',   '主图',   '抖音主图 3:4 (1080×1440)',  1080, 1440,  2),
('douyin',   '视频',   '抖音短视频 9:16',           1080, 1920,  3),
('douyin',   '视频',   '抖音横屏 16:9',             1920, 1080,  4),
-- 小红书
('xiaohongshu', '主图', '小红书 1:1 (1080×1080)',  1080, 1080,  1),
('xiaohongshu', '主图', '小红书 3:4 (1080×1440)',  1080, 1440,  2),
('xiaohongshu', '主图', '小红书 4:3 (1440×1080)',  1440, 1080,  3),
('xiaohongshu', '视频', '小红书视频 3:4',          1080, 1440,  4),
-- 视频号
('sph',      '主图',   '视频号商品图 1:1',          800,  800,  1),
('sph',      '视频',   '视频号 9:16',              1080, 1920,  2),
('sph',      '视频',   '视频号 16:9',              1920, 1080,  3),
-- 亚马逊
('amazon',   '主图',   '亚马逊主图 (2000×2000)',   2000, 2000,  1),
('amazon',   'A+',     '亚马逊A+ 横幅 (970×600)',    970,  600,  2),
('amazon',   'A+',     '亚马逊A+ 大图 (1464×600)',  1464,  600,  3),
('amazon',   '视频',   '亚马逊视频 16:9',           1920, 1080,  4),
-- Temu
('temu',     '主图',   'Temu 主图 1:1 (1000×1000)', 1000, 1000,  1),
('temu',     '主图',   'Temu 主图 3:4 (1200×1600)', 1200, 1600,  2),
('temu',     '视频',   'Temu 视频 1:1',             1000, 1000,  3),
-- Shein
('shein',    '主图',   'Shein 主图 1:1 (800×800)',   800,  800,  1),
('shein',    '主图',   'Shein 主图 3:4 (1200×1600)', 1200, 1600,  2),
('shein',    '视频',   'Shein 视频 9:16',           1080, 1920,  3),
-- TikTok Shop
('tiktok',   '主图',   'TikTok 主图 1:1 (1080×1080)',1080, 1080, 1),
('tiktok',   '视频',   'TikTok 9:16',              1080, 1920,  2),
('tiktok',   '视频',   'TikTok 1:1',               1080, 1080,  3),
-- 美客多 Mercado Libre
('mercado',  '主图',   '美客多 主图 (1600×1600)', 1600, 1600,  1),
('mercado',  '视频',   '美客多 视频 16:9',         1280,  720,  2),
-- Ozon
('ozon',     '主图',   'Ozon 主图 (2000×2000)',    2000, 2000,  1),
('ozon',     '主图',   'Ozon 主图 3:4',            1200, 1600,  2),
-- Shopee
('shopee',   '主图',   'Shopee 主图 (800×800)',      800,  800,  1),
('shopee',   '主图',   'Shopee 主图 3:4 (900×1200)', 900, 1200,  2),
('shopee',   '视频',   'Shopee 视频 1:1',           800,  800,  3),
-- Lazada
('lazada',   '主图',   'Lazada 主图 (800×800)',      800,  800,  1),
('lazada',   '主图',   'Lazada 主图 3:4',          1080, 1440,  2),
('lazada',   '视频',   'Lazada 视频 16:9',         1280,  720,  3);

-- DOWN
DELETE FROM `platform_size` WHERE platform IN ('taobao','pdd','douyin','xiaohongshu','sph','amazon','temu','shein','tiktok','mercado','ozon','shopee','lazada');
DELETE FROM `membership_plan` WHERE plan_type IN (0,1,2,3);
DELETE FROM `sms_template` WHERE template_code IN ('sms_register_code','sms_login_code','sms_reset_password','sms_bind_code','sms_task_complete','sms_batch_complete','sms_credit_low','sms_membership_expire');
