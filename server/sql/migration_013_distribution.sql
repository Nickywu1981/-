-- ============================================================
-- Migration 013: 分销系统表
-- ============================================================

CREATE TABLE IF NOT EXISTS distributor_relation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '被邀请人',
  parent_id INT DEFAULT NULL COMMENT '直推上级',
  grandparent_id INT DEFAULT NULL COMMENT '间推上级',
  level TINYINT NOT NULL DEFAULT 1 COMMENT '1=直推 2=间推',
  invite_code VARCHAR(32) DEFAULT NULL COMMENT '邀请码',
  bound_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user (user_id),
  INDEX idx_parent (parent_id),
  INDEX idx_grandparent (grandparent_id),
  INDEX idx_bound (bound_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分销关系';

CREATE TABLE IF NOT EXISTS distributor_commission (
  id INT AUTO_INCREMENT PRIMARY KEY,
  distributor_id INT NOT NULL COMMENT '分销员ID',
  consumer_id INT DEFAULT NULL COMMENT '消费用户ID',
  order_id VARCHAR(64) DEFAULT NULL,
  order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission_rate DECIMAL(5,2) NOT NULL COMMENT '佣金比例%',
  commission DECIMAL(10,2) NOT NULL COMMENT '佣金金额',
  level TINYINT NOT NULL DEFAULT 1 COMMENT '1=直推 2=间推',
  status VARCHAR(16) NOT NULL DEFAULT 'settled' COMMENT 'settled/withdrawn',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP NULL DEFAULT NULL,
  INDEX idx_distributor (distributor_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分销佣金';
