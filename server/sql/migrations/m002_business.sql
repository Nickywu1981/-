-- =====================================================
-- Movio AI v4.1  —  m002_business.sql
-- G6 数据库接口 | 2026-05-08
-- 业务表: 任务队列 / 内容审核 / 平台Token / 积分 / 分销
-- =====================================================

-- UP

-- --------------------------------
-- 1. job_queue — 异步任务队列表 (v4.1 增强)
-- --------------------------------
CREATE TABLE job_queue (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  task_type       VARCHAR(32)  NOT NULL COMMENT 'video_gen/image_gen/action_migrate/digital_human/live_clip',
  task_params     JSON DEFAULT NULL COMMENT '任务参数',
  status          ENUM('queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'queued',
  progress        TINYINT UNSIGNED DEFAULT 0 COMMENT '进度 0-100',
  result_data     JSON DEFAULT NULL COMMENT '结果 {file_url,duration,preview,...}',
  error_message   VARCHAR(1024) DEFAULT '' COMMENT '失败原因',
  retry_count     INT UNSIGNED DEFAULT 0 COMMENT '已重试次数',
  max_retries     INT UNSIGNED DEFAULT 3 COMMENT '最大重试次数',
  scheduled_at    DATETIME DEFAULT NULL COMMENT '定时执行时间,NULL=立即',
  priority        TINYINT DEFAULT 5 COMMENT '优先级 1-10, 数字越小越优先',
  processing_node VARCHAR(64) DEFAULT '' COMMENT '处理节点标识',
  started_at      DATETIME DEFAULT NULL,
  completed_at    DATETIME DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status_created (status, created_at),
  INDEX idx_user_status (user_id, status),
  INDEX idx_type_status (task_type, status),
  INDEX idx_priority (priority, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='异步任务队列表';

-- --------------------------------
-- 2. content_audit_log — 内容审核日志 (v4.1 新增)
-- --------------------------------
CREATE TABLE content_audit_log (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  job_id       INT UNSIGNED DEFAULT NULL COMMENT '关联任务ID',
  audit_stage  ENUM('input','output','publish') NOT NULL COMMENT '审核阶段',
  content_type ENUM('text','image','video') NOT NULL,
  content_hash VARCHAR(64) DEFAULT '' COMMENT '内容SHA256',
  original_text TEXT COMMENT '原始内容(文本)/URL(图片视频)',
  risk_level   ENUM('safe','warning','blocked') NOT NULL DEFAULT 'safe',
  risk_tags    JSON DEFAULT NULL COMMENT '风险标签 ["porn","violence","politics"]',
  audit_detail JSON DEFAULT NULL COMMENT '审核返回原始结果',
  action       ENUM('pass','warn','block') NOT NULL DEFAULT 'pass',
  audit_by     VARCHAR(32) DEFAULT 'auto' COMMENT 'auto=机器审核, 否则为人审用户',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_job (job_id),
  INDEX idx_stage_action (audit_stage, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='内容审核日志表';

-- --------------------------------
-- 3. platform_token — 平台绑定Token表 (v4.1 新增)
-- --------------------------------
CREATE TABLE platform_token (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  platform      VARCHAR(32)  NOT NULL COMMENT 'douyin/taobao/kuaishou/tiktok/shopee/...',
  account_id    VARCHAR(128) DEFAULT '' COMMENT '平台账号ID',
  account_name  VARCHAR(128) DEFAULT '' COMMENT '平台账号昵称',
  access_token  VARBINARY(1024) NOT NULL COMMENT 'AES-256加密存储',
  refresh_token VARBINARY(1024) DEFAULT NULL COMMENT 'AES-256加密存储',
  token_expires_at DATETIME DEFAULT NULL,
  scope         JSON DEFAULT NULL COMMENT '授权范围',
  status        ENUM('active','expired','revoked') DEFAULT 'active',
  bound_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  refreshed_at  DATETIME DEFAULT NULL,
  INDEX idx_user_platform (user_id, platform),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台绑定Token表';

-- --------------------------------
-- 4. user_platform_bind — 用户平台绑定关系
-- --------------------------------
CREATE TABLE user_platform_bind (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED NOT NULL,
  bind_type    ENUM('shop','account') NOT NULL COMMENT '店铺绑定/账号绑定',
  platform     VARCHAR(32) NOT NULL COMMENT '平台标识',
  account_id   VARCHAR(128) DEFAULT '' COMMENT '平台账号ID',
  account_name VARCHAR(128) DEFAULT '' COMMENT '平台账号昵称',
  extra_info   JSON DEFAULT NULL COMMENT '扩展信息',
  is_active    TINYINT(1) DEFAULT 1,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_platform (user_id, bind_type, platform, account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户平台绑定关系表';

-- --------------------------------
-- 5. points_account — 积分账户表
-- --------------------------------
CREATE TABLE points_account (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED NOT NULL,
  balance       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当前积分余额',
  total_earned  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计获得',
  total_spent   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '累计消费',
  frozen        INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '冻结中积分',
  version       INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '乐观锁版本号',
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分账户表';

-- --------------------------------
-- 6. points_transaction — 积分流水表
-- --------------------------------
CREATE TABLE points_transaction (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  trans_type      ENUM('earn','spend','refund','freeze','unfreeze','admin_adjust') NOT NULL,
  amount          INT NOT NULL COMMENT '变动数量(正=增加,负=扣减)',
  balance_after   INT UNSIGNED NOT NULL COMMENT '变动后余额',
  business_type   VARCHAR(32) DEFAULT '' COMMENT '业务类型: image_gen/video_gen/member_gift/recharge',
  business_id     INT UNSIGNED DEFAULT NULL COMMENT '关联业务ID',
  remark          VARCHAR(255) DEFAULT '',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_type (trans_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积分流水表';

-- --------------------------------
-- 7. distributor_relation — 分销关系表
-- --------------------------------
CREATE TABLE distributor_relation (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL COMMENT '下级用户',
  parent_id       INT UNSIGNED NOT NULL COMMENT '上级推广员',
  grandparent_id  INT UNSIGNED DEFAULT NULL COMMENT '上上级推广员',
  level           TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1=直推 2=间推',
  invite_code     VARCHAR(16) DEFAULT '' COMMENT '绑定时的邀请码',
  bound_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_parent (user_id, parent_id),
  INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分销关系表';

-- --------------------------------
-- 8. distributor_commission — 推广佣金流水表
-- --------------------------------
CREATE TABLE distributor_commission (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  distributor_id  INT UNSIGNED NOT NULL COMMENT '推广员 user_id',
  consumer_id     INT UNSIGNED NOT NULL COMMENT '消费用户',
  order_id        INT UNSIGNED DEFAULT NULL COMMENT '关联消费订单/流水ID',
  order_amount    DECIMAL(10,2) NOT NULL COMMENT '消费金额',
  commission_rate DECIMAL(5,2) NOT NULL COMMENT '返利比例(%)',
  commission      DECIMAL(10,2) NOT NULL COMMENT '佣金金额',
  level           TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1级/2级返利',
  status          ENUM('pending','settled','withdrawn','cancelled') DEFAULT 'pending',
  remark          VARCHAR(255) DEFAULT '',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  settled_at      DATETIME DEFAULT NULL,
  INDEX idx_distributor (distributor_id, created_at),
  INDEX idx_consumer (consumer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推广佣金流水表';

-- DOWN

DROP TABLE IF EXISTS distributor_commission;
DROP TABLE IF EXISTS distributor_relation;
DROP TABLE IF EXISTS points_transaction;
DROP TABLE IF EXISTS points_account;
DROP TABLE IF EXISTS user_platform_bind;
DROP TABLE IF EXISTS platform_token;
DROP TABLE IF EXISTS content_audit_log;
DROP TABLE IF EXISTS job_queue;
