-- Migration: ai_model_config A/B 测试字段
-- Date: 2026-05-15
-- Adds: ab_group   — A/B实验分组标识
--       ab_percent — A/B流量占比 0-100

USE ai_saas;

ALTER TABLE ai_model_config
  ADD COLUMN IF NOT EXISTS `ab_group` VARCHAR(32) DEFAULT NULL COMMENT 'A/B实验分组标识 (e.g. baseline/variant_b)' AFTER `gray_percent`,
  ADD COLUMN IF NOT EXISTS `ab_percent` INT DEFAULT 0 COMMENT 'A/B流量占比 0-100 (同组模型合计应为100)' AFTER `ab_group`;
