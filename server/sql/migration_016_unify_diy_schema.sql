-- ============================================================
-- migration_016: DIY Schema 统一 — FK + 索引 + 组件种子数据
-- 解决 audit 发现的 10 项 P0/P1 数据库问题
-- ============================================================

-- ── 1. diy_page_version 添加唯一约束 + 复合索引 ──
ALTER TABLE diy_page_version
  ADD UNIQUE INDEX uk_page_version (page_id, version),
  ADD INDEX idx_page_auto (page_id, auto_save);

-- ── 2. diy_page 添加缺失索引 ──
ALTER TABLE diy_page
  ADD INDEX idx_page_type (page_type),
  ADD INDEX idx_owner_status (owner_id, status);

-- ── 3. diy_component 添加筛选索引 ──
ALTER TABLE diy_component
  ADD COLUMN IF NOT EXISTS update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER create_time,
  ADD INDEX idx_category (category),
  ADD INDEX idx_builtin_status (is_builtin, status);

-- ── 4. diy_template 添加 page_type 索引 ──
ALTER TABLE diy_template
  ADD INDEX idx_page_type (page_type);

-- ── 5. site_config 整改 ──
ALTER TABLE site_config
  ADD INDEX idx_config_type (config_type),
  MODIFY updated_by INT UNSIGNED DEFAULT NULL COMMENT '更新人用户ID';

-- ── 6. operation_audit_log 扩展 target_id 类型 ──
ALTER TABLE operation_audit_log
  MODIFY target_id VARCHAR(64) DEFAULT NULL COMMENT '目标ID(兼容INT/BIGINT/UUID)';

-- ── 7. 外键约束：diy_page_version.page_id → diy_page.id ──
ALTER TABLE diy_page_version
  ADD CONSTRAINT fk_version_page FOREIGN KEY (page_id) REFERENCES diy_page(id) ON DELETE CASCADE;

-- ── 8. 外键约束：diy_custom_module.page_id → diy_page.id ──
ALTER TABLE diy_custom_module
  ADD CONSTRAINT fk_module_page FOREIGN KEY (page_id) REFERENCES diy_page(id) ON DELETE CASCADE;

-- ── 9. 外键约束：diy_custom_action.module_id → diy_custom_module.id ──
ALTER TABLE diy_custom_action
  ADD CONSTRAINT fk_action_module FOREIGN KEY (module_id) REFERENCES diy_custom_module(id) ON DELETE CASCADE;

-- ── 10. 外键约束：diy_custom_action.page_id → diy_page.id ──
ALTER TABLE diy_custom_action
  ADD CONSTRAINT fk_action_page FOREIGN KEY (page_id) REFERENCES diy_page(id) ON DELETE CASCADE;

-- ── 11. diy_custom_module 添加唯一约束 ──
ALTER TABLE diy_custom_module
  ADD UNIQUE INDEX uk_module_code (page_id, module_code);

-- ============================================================
-- 12 个内置组件种子数据
-- ============================================================
INSERT IGNORE INTO diy_component (tenant_id, name, component_code, category, icon, default_config, is_builtin, status) VALUES
-- Banner
(0, '轮播横幅',   'banner_slider',  'banner',  '🎠', '{"slides":[{"img":""}],"autoplay":true,"interval":3000,"height":200,"radius":8}', 1, 1),
-- Text
(0, '标题栏',     'title_bar',      'text',    '📌', '{"title":"标题文本","subtitle":"","align":"center","color":"#333","fontSize":18,"bgColor":"#ffffff"}', 1, 1),
(0, '文本段落',   'text_block',     'text',    '📄', '{"content":"请输入文本内容","align":"left","color":"#666","fontSize":14,"lineHeight":1.6}', 1, 1),
-- Product/Marketing
(0, '商品列表',   'product_list',   'product', '🛍️', '{"columns":2,"showPrice":true,"showBadge":true,"gap":10,"radius":8}', 1, 1),
(0, '倒计时',     'countdown',      'product', '⏰', '{"endTime":"","title":"限时优惠","color":"#ff4444","bgColor":"#fff5f5","fontSize":24}', 1, 1),
(0, '优惠券',     'coupon_card',    'product', '🎫', '{"title":"优惠券","amount":"¥10","condition":"满100可用","color":"#ff6600","radius":8}', 1, 1),
(0, '按钮组',     'button_group',   'product', '🔘', '{"buttons":[{"text":"立即购买","link":"","color":"#ff4444"}],"direction":"row","gap":10,"radius":20}', 1, 1),
-- Gallery
(0, '图片展示',   'image_showcase', 'gallery', '🖼️', '{"images":[{"src":"","link":""}],"columns":2,"gap":8,"radius":8,"aspectRatio":"1:1"}', 1, 1),
(0, '视频播放器', 'video_player',   'gallery', '▶️', '{"src":"","poster":"","autoplay":false,"controls":true,"aspectRatio":"16:9","radius":8}', 1, 1),
(0, '热区图片',   'hotzone_image',  'gallery', '🎯', '{"src":"","zones":[{"x":0,"y":0,"w":100,"h":100,"link":""}],"radius":8}', 1, 1),
-- Form
(0, '表单容器',   'form_container', 'form',    '📋', '{"fields":[],"submitText":"提交","bgColor":"#ffffff","radius":8,"padding":16}', 1, 1),
-- Nav
(0, '导航栏',     'nav_bar',        'nav',     '🧭', '{"items":[{"text":"首页","link":"","icon":"🏠"}],"fixed":false,"bgColor":"#ffffff","textColor":"#333","activeColor":"#6366f1"}', 1, 1);

-- ============================================================
-- (可选) 如果 COPYWRITING_HISTORY 表不存在则创建
-- (之前 migration_010_hotfix 有 IF NOT EXISTS，此处确保幂等)
-- ============================================================
CREATE TABLE IF NOT EXISTS copywriting_history (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('title','description','translate') NOT NULL DEFAULT 'title',
  inputs JSON NULL,
  outputs JSON NULL,
  model_id VARCHAR(50) NULL,
  token_used INT UNSIGNED DEFAULT 0,
  status VARCHAR(20) DEFAULT 'success',
  error_msg TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
