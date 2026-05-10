-- Migration 018: 为 credit_request_log.request_id 添加 UNIQUE 索引
-- 防止 freezeCredit 竞态条件导致重复扣费
-- P0: creditService 幂等性守卫依赖此索引

ALTER TABLE credit_request_log ADD UNIQUE INDEX idx_request_id_unique (request_id);
