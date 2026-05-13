-- Migration: workflow_config 扩展 — 支持节点删除与排序
-- Date: 2026-05-14
-- Adds: deleted_steps (JSON) — 删除的步骤key列表
--       step_order    (JSON) — 自定义步骤排序 [key数组]

USE ai_saas;

ALTER TABLE workflow_config
  ADD COLUMN IF NOT EXISTS `deleted_steps` JSON DEFAULT NULL COMMENT '删除的步骤key列表' AFTER `extra_steps`,
  ADD COLUMN IF NOT EXISTS `step_order` JSON DEFAULT NULL COMMENT '自定义步骤排序 [key数组]' AFTER `deleted_steps`;
