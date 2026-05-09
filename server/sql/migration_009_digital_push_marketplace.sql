-- ============================================================
-- Migration 009: 数字人带货 + 平台直推 + 场景模板市场
-- 三合一全链路建表 + 种子数据
-- ============================================================

-- 1. 数字人任务表
CREATE TABLE IF NOT EXISTS digital_human_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  text TEXT DEFAULT NULL COMMENT '口播文本',
  audio_url VARCHAR(512) DEFAULT NULL COMMENT '上传音频URL',
  avatar_style VARCHAR(32) NOT NULL DEFAULT 'realistic' COMMENT '数字人风格: realistic/cartoon/business',
  background VARCHAR(32) NOT NULL DEFAULT 'studio' COMMENT '背景: studio/white/custom',
  output_url VARCHAR(512) DEFAULT NULL COMMENT '输出视频URL',
  status VARCHAR(32) NOT NULL DEFAULT 'queued' COMMENT '状态: queued/processing/completed/failed',
  priority INT NOT NULL DEFAULT 5 COMMENT '优先级 1-10, 数字越大越优先',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数字人口播任务';

-- 2. 平台凭证表
CREATE TABLE IF NOT EXISTS platform_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  platform VARCHAR(32) NOT NULL COMMENT '平台: taobao/jd/pdd/douyin/kuaishou/shopee',
  app_key VARCHAR(256) DEFAULT NULL COMMENT 'App Key',
  app_secret VARCHAR(512) DEFAULT NULL COMMENT 'App Secret (加密存储)',
  access_token VARCHAR(1024) DEFAULT NULL COMMENT 'Access Token',
  refresh_token VARCHAR(1024) DEFAULT NULL COMMENT 'Refresh Token',
  token_expires_at DATETIME DEFAULT NULL COMMENT 'Token过期时间',
  shop_name VARCHAR(128) DEFAULT NULL COMMENT '店铺名称',
  status VARCHAR(16) NOT NULL DEFAULT 'connected' COMMENT '状态: connected/disconnected',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_platform (user_id, platform),
  INDEX idx_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台直推凭证';

-- 3. 平台发布历史表
CREATE TABLE IF NOT EXISTS platform_publish_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  platform VARCHAR(32) NOT NULL COMMENT '平台',
  item_id VARCHAR(128) DEFAULT NULL COMMENT '平台商品ID',
  title VARCHAR(256) NOT NULL COMMENT '商品标题',
  description TEXT DEFAULT NULL COMMENT '商品描述',
  images JSON DEFAULT NULL COMMENT '商品图片列表',
  price DECIMAL(10,2) DEFAULT NULL COMMENT '价格',
  status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/publishing/success/failed',
  result_url VARCHAR(512) DEFAULT NULL COMMENT '发布结果链接',
  error_msg VARCHAR(1024) DEFAULT NULL COMMENT '错误信息',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_platform (platform),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台发布历史';

-- 4. 平台配置表
CREATE TABLE IF NOT EXISTS platform_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform VARCHAR(32) NOT NULL UNIQUE COMMENT '平台标识',
  name VARCHAR(64) NOT NULL COMMENT '平台名称',
  icon VARCHAR(256) DEFAULT NULL COMMENT '平台图标URL',
  api_endpoint VARCHAR(512) DEFAULT NULL COMMENT 'API端点',
  doc_url VARCHAR(512) DEFAULT NULL COMMENT '对接文档URL',
  status VARCHAR(16) NOT NULL DEFAULT 'active' COMMENT '状态: active/inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_platform (platform)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台接入配置';

-- 5. 模板市场表
CREATE TABLE IF NOT EXISTS template_marketplace (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '发布者ID',
  title VARCHAR(256) NOT NULL COMMENT '模板标题',
  description TEXT DEFAULT NULL COMMENT '模板描述',
  category VARCHAR(64) NOT NULL DEFAULT 'ecommerce' COMMENT '分类: ecommerce/social/brand/event',
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '价格 (0=免费)',
  preview_images JSON DEFAULT NULL COMMENT '预览图列表',
  download_count INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  rating DECIMAL(3,2) NOT NULL DEFAULT 0.00 COMMENT '平均评分',
  status VARCHAR(16) NOT NULL DEFAULT 'published' COMMENT '状态: draft/published/removed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_status (status),
  INDEX idx_user (user_id),
  INDEX idx_download (download_count),
  FULLTEXT INDEX ft_title_desc (title, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场景模板市场';

-- 6. 模板购买记录表
CREATE TABLE IF NOT EXISTS template_market_purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '购买者ID',
  template_id INT NOT NULL COMMENT '模板ID',
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '购买价格',
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '购买时间',
  INDEX idx_user (user_id),
  INDEX idx_template (template_id),
  UNIQUE KEY uk_user_template (user_id, template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模板购买记录';

-- ============================================================
-- 种子数据：6个平台配置
-- ============================================================
INSERT IGNORE INTO platform_config (platform, name, icon, api_endpoint, doc_url, status) VALUES
('taobao',  '淘宝',  '/icons/platforms/taobao.svg',  'https://open.taobao.com/api',  'https://open.taobao.com/doc',  'active'),
('jd',      '京东',  '/icons/platforms/jd.svg',      'https://open.jd.com/api',      'https://open.jd.com/doc',      'active'),
('pdd',     '拼多多','/icons/platforms/pdd.svg',     'https://open.pinduoduo.com/api','https://open.pinduoduo.com/doc','active'),
('douyin',  '抖音',  '/icons/platforms/douyin.svg',  'https://open.douyin.com/api',  'https://open.douyin.com/doc',  'active'),
('kuaishou','快手',  '/icons/platforms/kuaishou.svg','https://open.kuaishou.com/api','https://open.kuaishou.com/doc','active'),
('shopee',  'Shopee','/icons/platforms/shopee.svg',  'https://open.shopee.com/api',  'https://open.shopee.com/doc',  'active');
