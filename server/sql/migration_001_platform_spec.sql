-- Migration 001: platform_image_spec — 13 电商平台图片/视频尺寸规范
-- Phase 3 Day 1-2: 平台尺寸配置化

CREATE TABLE IF NOT EXISTS platform_image_spec (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '租户ID',
  platform_code VARCHAR(20)  NOT NULL COMMENT '平台代码: taobao/jd/pdd/douyin/kuaishou/xiaohongshu/video号/1688/shopee/lazada/amazon/ebay/wish',
  spec_type     ENUM('mainImage','detailImage','video','carousel','skuImage','logo','banner') NOT NULL COMMENT '规格类型',
  label         VARCHAR(50)  NOT NULL COMMENT '规格标签(中文)',
  width         INT UNSIGNED NOT NULL COMMENT '宽度px',
  height        INT UNSIGNED NOT NULL COMMENT '高度px',
  format        ENUM('jpg','png','webp','mp4','mov') NOT NULL DEFAULT 'jpg' COMMENT '格式',
  max_size_kb   INT UNSIGNED DEFAULT NULL COMMENT '文件上限KB',
  bg_must_white TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否强制白底',
  notes         VARCHAR(500) DEFAULT NULL COMMENT '备注',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_platform_type (tenant_id, platform_code, spec_type),
  KEY idx_platform (platform_code),
  KEY idx_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台图片/视频尺寸规范';

-- Seed data: 13 大平台主图+视频规格
INSERT INTO platform_image_spec (platform_code, spec_type, label, width, height, format, max_size_kb, bg_must_white, notes) VALUES
-- 淘宝
('taobao', 'mainImage',  '淘宝主图',   800,  800,  'jpg', 5120, 1, '白底，无文字无Logo'),
('taobao', 'detailImage','淘宝详情图', 750,  0,    'jpg', 3072, 0, '宽度750，高度自适应'),
('taobao', 'video',      '淘宝主图视频',1080, 1080, 'mp4', 30720,0, '9:16或1:1，≤30秒'),
-- 京东
('jd',     'mainImage',  '京东主图',   800,  800,  'jpg', 5120, 1, '纯白底，首图为白色背景'),
('jd',     'detailImage','京东详情图', 750,  0,    'jpg', 3072, 0, 'PC端750宽'),
('jd',     'video',      '京东主图视频',1080, 1080, 'mp4', 51200,0, '1:1，≤60秒'),
-- 拼多多
('pdd',    'mainImage',  '拼多多主图',  800,  800,  'jpg', 3072, 0, '建议白底'),
('pdd',    'detailImage','拼多多详情图', 750, 0,    'jpg', 2048, 0, ''),
('pdd',    'video',      '拼多多视频',  1080, 1920, 'mp4', 51200,0, '9:16竖版'),
-- 抖音
('douyin', 'mainImage',  '抖音商品主图', 800,  800,  'jpg', 5120, 1, '白底'),
('douyin', 'detailImage','抖音详情图',  750,  0,    'jpg', 3072, 0, ''),
('douyin', 'video',      '抖音带货视频', 1080, 1920, 'mp4', 102400,0,'9:16竖版推荐'),
-- 快手
('kuaishou','mainImage', '快手商品主图', 800,  800,  'jpg', 3072, 0, ''),
('kuaishou','video',     '快手带货视频', 1080, 1920, 'mp4', 102400,0,'9:16竖版'),
-- 小红书
('xiaohongshu','mainImage',  '小红书主图',  800,  800,  'jpg', 5120, 0, ''),
('xiaohongshu','detailImage','小红书详情图', 1080, 0,    'jpg', 5120, 0, '宽度1080'),
('xiaohongshu','video',      '小红书视频',   1080, 1920, 'mp4', 102400,0,'9:16，≤5分钟'),
-- 视频号
('weixin',  'mainImage',  '视频号商品主图', 800,  800,  'jpg', 3072, 0, ''),
('weixin',  'video',      '视频号带货视频', 1080, 1920, 'mp4', 102400,0,'9:16'),
-- 1688
('1688',    'mainImage',  '1688主图',    750,  750,  'jpg', 5120, 0, ''),
('1688',    'detailImage','1688详情图',  750,  0,    'jpg', 3072, 0, ''),
-- Shopee
('shopee',  'mainImage',  'Shopee主图',  1024, 1024, 'jpg', 2048, 0, ''),
('shopee',  'detailImage','Shopee详情图', 1024, 0,    'jpg', 2048, 0, ''),
('shopee',  'video',      'Shopee视频',  1080, 1920, 'mp4', 102400,0,'9:16，≤60秒'),
-- Lazada
('lazada',  'mainImage',  'Lazada主图',  1000, 1000, 'jpg', 2048, 1, '白底'),
('lazada',  'detailImage','Lazada详情图', 1000, 0,    'jpg', 2048, 0, ''),
-- Amazon
('amazon',  'mainImage',  'Amazon主图',  2000, 2000, 'jpg', 10240,1, '纯白底(RGB255,255,255)，占画面≥85%'),
('amazon',  'detailImage','Amazon详情图', 2000, 0,    'jpg', 10240,0, ''),
('amazon',  'video',      'Amazon视频',  1920, 1080, 'mp4', 102400,0,'16:9推荐'),
-- eBay
('ebay',    'mainImage',  'eBay主图',    1600, 1600, 'jpg', 12288,0, ''),
('ebay',    'detailImage','eBay详情图',  1600, 0,    'jpg', 12288,0, ''),
-- Wish
('wish',    'mainImage',  'Wish主图',    800,  800,  'jpg', 3072, 0, ''),
('wish',    'detailImage','Wish详情图',  800,  0,    'jpg', 3072, 0, '');
