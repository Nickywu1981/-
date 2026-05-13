-- A/B 实验框架：实验定义 + 事件埋点
-- 支持：多臂实验、统计显著性、指标追踪、全生命周期管理

-- 实验定义表
CREATE TABLE IF NOT EXISTS ab_experiments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(128)  NOT NULL COMMENT '实验名称',
  description VARCHAR(512)  DEFAULT NULL COMMENT '实验描述',
  status      ENUM('draft', 'running', 'paused', 'completed') NOT NULL DEFAULT 'draft' COMMENT '实验状态',
  variants    JSON          NOT NULL COMMENT '变体定义 [{variantId, modelKey, templateId, weight, description}]',
  metrics     JSON          NOT NULL COMMENT '指标定义 [{metricId, name, type, aggregation}]',
  target_type ENUM('model', 'template', 'prompt', 'full_workflow') NOT NULL DEFAULT 'model' COMMENT '实验目标类型',
  start_at    DATETIME      DEFAULT NULL COMMENT '开始时间',
  end_at      DATETIME      DEFAULT NULL COMMENT '结束时间',
  created_by  VARCHAR(64)   DEFAULT NULL COMMENT '创建者ID',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='A/B实验定义';

-- 实验事件埋点表
CREATE TABLE IF NOT EXISTS ab_event_log (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  experiment_id INT UNSIGNED  NOT NULL COMMENT '实验ID',
  variant_id    VARCHAR(64)   NOT NULL COMMENT '变体ID',
  metric_id     VARCHAR(64)   NOT NULL COMMENT '指标ID',
  value         DOUBLE        NOT NULL COMMENT '指标值',
  session_id    VARCHAR(64)   DEFAULT NULL COMMENT '会话ID (去重/关联)',
  user_id       VARCHAR(64)   DEFAULT NULL COMMENT '用户ID',
  metadata      JSON          DEFAULT NULL COMMENT '附加元数据',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_experiment_variant (experiment_id, variant_id),
  INDEX idx_experiment_metric  (experiment_id, metric_id),
  INDEX idx_created_at        (created_at),
  FOREIGN KEY (experiment_id) REFERENCES ab_experiments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='A/B实验事件日志';
