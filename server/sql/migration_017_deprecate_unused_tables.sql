-- ============================================
-- 迁移 017: 标记废弃表（非破坏性）
-- ============================================
-- diy_custom_module / diy_custom_action 两表无任何 server/src 代码引用，
-- 属于早期设计预留但从未实现。当前仅占存储，不影响功能。
-- FK 已配置 ON DELETE CASCADE，不会阻止 diy_page 删除操作。
-- 下一大版本（v5.0）可安全 DROP。
-- ============================================
ALTER TABLE diy_custom_module COMMENT = 'DEPRECATED: unused table, scheduled for removal in v5.0';
ALTER TABLE diy_custom_action COMMENT = 'DEPRECATED: unused table, scheduled for removal in v5.0';
