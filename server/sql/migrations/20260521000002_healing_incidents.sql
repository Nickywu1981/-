-- 自愈事件知识库 — 记录每次自愈操作的全生命周期数据
-- 用于事件学习引擎的模式提取、策略排名、进化优化

CREATE TABLE IF NOT EXISTS healing_incidents (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  incident_type   VARCHAR(64)   NOT NULL COMMENT '事件类型: breaker_open/model_down/quota_exhausted/latency_spike/connection_leak/predictive_action',
  severity        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  symptoms        JSON          NOT NULL COMMENT '触发症状快照 {metric,value,threshold,...}',
  affected_models JSON          DEFAULT NULL COMMENT '受影响模型列表',
  root_cause      VARCHAR(255)  DEFAULT NULL COMMENT '推断根因',
  action_taken    VARCHAR(128)  NOT NULL COMMENT '执行的自愈动作',
  action_result   ENUM('success','partial','failed') NOT NULL DEFAULT 'success' COMMENT '自愈结果',
  recovery_time_ms INT          DEFAULT 0 COMMENT '恢复耗时ms',
  action_detail   JSON          DEFAULT NULL COMMENT '动作详情 {before,after,retries,...}',
  context_snapshot JSON         DEFAULT NULL COMMENT '当时环境快照 {qps,memory,connections,...}',
  learned_pattern VARCHAR(255)  DEFAULT NULL COMMENT '关联的学习模式ID',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (incident_type),
  INDEX idx_result (action_result),
  INDEX idx_created (created_at),
  INDEX idx_pattern (learned_pattern)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自愈事件知识库';

-- 自愈策略进化跟踪
CREATE TABLE IF NOT EXISTS healing_strategies (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  strategy_id     VARCHAR(128)  NOT NULL UNIQUE COMMENT '策略唯一标识',
  strategy_level  ENUM('L1','L2','L3','L3+') NOT NULL DEFAULT 'L1',
  incident_type   VARCHAR(64)   NOT NULL,
  action_template JSON          NOT NULL COMMENT '动作模板 {type,params,preconditions}',
  success_count   INT UNSIGNED  DEFAULT 0,
  total_count     INT UNSIGNED  DEFAULT 0,
  success_rate    DECIMAL(5,4)  DEFAULT 0,
  activation_count INT UNSIGNED DEFAULT 0 COMMENT '触发升级条件累计',
  evolved_from    VARCHAR(128)  DEFAULT NULL COMMENT '从哪个策略进化而来',
  is_active       TINYINT(1)    DEFAULT 1,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_level (strategy_level),
  INDEX idx_type (incident_type),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自愈策略进化表';
