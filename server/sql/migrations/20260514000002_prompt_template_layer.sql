-- Migration: 分层提示词模板库 — 用户私有模板加速索引
-- Purpose: 为 matchAndFill 3层解析链的 {intentId}_u_{userId} 查找模式添加索引
-- Date: 2026-05-14

-- UP
-- 加速用户私有模板查找: WHERE creator_id = ? AND template_code = ?
DELIMITER $$
CREATE PROCEDURE IF NOT EXISTS _prompt_layer_idx_up()
BEGIN
  IF NOT EXISTS (SELECT * FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prompt_template' AND INDEX_NAME = 'idx_creator_template') THEN
    ALTER TABLE prompt_template ADD INDEX idx_creator_template (creator_id, template_code);
  END IF;
END$$
DELIMITER ;
CALL _prompt_layer_idx_up();
DROP PROCEDURE IF EXISTS _prompt_layer_idx_up;

-- DOWN
ALTER TABLE prompt_template DROP INDEX IF EXISTS idx_creator_template;
