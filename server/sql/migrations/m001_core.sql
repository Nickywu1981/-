-- =====================================================
-- Movio AI v4.1  —  m001_core.sql
-- G6 数据库接口 | 2026-05-08
-- 核心表: 用户 / 角色 / 权限 / 配置 / 字典 / 模板
-- =====================================================

-- UP

-- --------------------------------
-- 1. users — 用户主表
-- --------------------------------
CREATE TABLE users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone           VARCHAR(32)  DEFAULT '' COMMENT '手机号 AES-256 加密',
  email           VARCHAR(128) DEFAULT '' COMMENT '邮箱 AES-256 加密',
  password_hash   VARCHAR(255) NOT NULL COMMENT 'bcrypt 加盐哈希',
  nickname        VARCHAR(64)  DEFAULT '' COMMENT '昵称',
  avatar_url      VARCHAR(512) DEFAULT '' COMMENT '头像CDN地址',
  role            ENUM('super_admin','admin','operator','member','free','distributor') NOT NULL DEFAULT 'free',
  status          ENUM('active','disabled','deleted') NOT NULL DEFAULT 'active',
  invite_code     VARCHAR(16)  DEFAULT '' COMMENT '本人的邀请码',
  invited_by      INT UNSIGNED DEFAULT NULL COMMENT '邀请人 user_id',
  points_balance  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '积分余额',
  free_trial_used TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否已使用免费试用额度',
  last_login_at   DATETIME     DEFAULT NULL,
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_phone (phone),
  UNIQUE KEY uk_email (email),
  UNIQUE KEY uk_invite_code (invite_code),
  INDEX idx_invited_by (invited_by),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户主表';

-- --------------------------------
-- 2. user_roles — 角色权限明细
-- --------------------------------
CREATE TABLE user_roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  role        ENUM('super_admin','admin','operator','member','free','distributor') NOT NULL,
  granted_by  INT UNSIGNED DEFAULT NULL,
  expired_at  DATETIME DEFAULT NULL COMMENT '角色过期时间,NULL=永久',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_role (user_id, role),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限明细表';

-- --------------------------------
-- 3. sys_config_group — 配置分组表
-- --------------------------------
CREATE TABLE sys_config_group (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_key    VARCHAR(64)  NOT NULL COMMENT '分组唯一标识 page.home.hero',
  group_name   VARCHAR(128) NOT NULL COMMENT '分组显示名 如"首页-Hero区域"',
  parent_key   VARCHAR(64)  DEFAULT '' COMMENT '父级分组key',
  sort_order   INT DEFAULT 0,
  is_enabled   TINYINT(1) DEFAULT 1,
  remark       VARCHAR(255) DEFAULT '',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_key (group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配置分组表';

-- --------------------------------
-- 4. sys_config_item — 配置项表
-- --------------------------------
CREATE TABLE sys_config_item (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_key    VARCHAR(64)  NOT NULL COMMENT '所属分组key',
  item_key     VARCHAR(128) NOT NULL COMMENT '配置项key 如 title/subtitle/btn_text',
  item_type    ENUM('text','textarea','number','boolean','json','image','color','url') DEFAULT 'text',
  item_value   TEXT COMMENT '当前配置值',
  default_val  TEXT COMMENT '默认值(降级用)',
  placeholder  VARCHAR(255) DEFAULT '' COMMENT '后台编辑占位提示',
  sort_order   INT DEFAULT 0,
  is_enabled   TINYINT(1) DEFAULT 1,
  remark       VARCHAR(255) DEFAULT '',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_item (group_key, item_key),
  INDEX idx_group (group_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配置项表';

-- --------------------------------
-- 5. sys_config_log — 配置变更日志 (v4.1 回滚用)
-- --------------------------------
CREATE TABLE sys_config_log (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_key  VARCHAR(64) NOT NULL,
  item_key   VARCHAR(128) NOT NULL,
  old_value  TEXT,
  new_value  TEXT,
  changed_by INT UNSIGNED DEFAULT NULL COMMENT '操作人 user_id',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_group_item (group_key, item_key),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配置变更日志表';

-- --------------------------------
-- 6. config_seed_version — 配置数据版本管理 (v4.1)
-- --------------------------------
CREATE TABLE config_seed_version (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seed_name   VARCHAR(64) NOT NULL COMMENT 'm005_seed / m006_biz_seed',
  version     INT UNSIGNED NOT NULL DEFAULT 1,
  applied_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_seed_name (seed_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='配置Seed版本管理表';

-- --------------------------------
-- 7. sys_dict_group — 业务字典组表
-- --------------------------------
CREATE TABLE sys_dict_group (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dict_key    VARCHAR(64)  NOT NULL COMMENT '字典唯一标识 video_duration / member_level',
  dict_name   VARCHAR(128) NOT NULL COMMENT '字典显示名',
  parent_key  VARCHAR(64)  DEFAULT '' COMMENT '父级字典key',
  sort_order  INT DEFAULT 0,
  is_enabled  TINYINT(1) DEFAULT 1,
  remark      VARCHAR(255) DEFAULT '',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dict_key (dict_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务字典组表';

-- --------------------------------
-- 8. sys_dict_item — 业务字典项表
-- --------------------------------
CREATE TABLE sys_dict_item (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dict_key     VARCHAR(64) NOT NULL COMMENT '所属字典key',
  item_key     VARCHAR(64) NOT NULL COMMENT '字典项key',
  item_value   VARCHAR(255) NOT NULL COMMENT '字典项显示值',
  item_extra   JSON DEFAULT NULL COMMENT '扩展字段 {icon,color,platform_size}',
  sort_order   INT DEFAULT 0,
  is_enabled   TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dict_item (dict_key, item_key),
  INDEX idx_dict (dict_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='业务字典项表';

-- --------------------------------
-- 9. sys_template — 模板表
-- --------------------------------
CREATE TABLE sys_template (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_key    VARCHAR(64) NOT NULL COMMENT '模板唯一标识',
  template_name   VARCHAR(128) NOT NULL COMMENT '模板显示名',
  template_type   ENUM('prompt','message','email','page','other') DEFAULT 'prompt',
  template_content TEXT NOT NULL COMMENT '模板内容(可含变量占位符 {{var}})',
  variables       JSON DEFAULT NULL COMMENT '变量定义 [{name,label,type,required}]',
  sort_order      INT DEFAULT 0,
  is_enabled      TINYINT(1) DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_template_key (template_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='模板表';

-- DOWN

DROP TABLE IF EXISTS sys_template;
DROP TABLE IF EXISTS sys_dict_item;
DROP TABLE IF EXISTS sys_dict_group;
DROP TABLE IF EXISTS config_seed_version;
DROP TABLE IF EXISTS sys_config_log;
DROP TABLE IF EXISTS sys_config_item;
DROP TABLE IF EXISTS sys_config_group;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS users;
