-- Migration: feedback 记忆类型扩展
-- Purpose: 为 ltm_entries.memory_type ENUM 新增 'feedback' 值
-- Date: 2026-05-14

-- UP
ALTER TABLE ltm_entries
  MODIFY COLUMN memory_type ENUM('fact','preference','decision','pattern','rule','conversation','episodic','working','feedback') NOT NULL DEFAULT 'fact';

-- DOWN
UPDATE ltm_entries SET memory_type = 'fact' WHERE memory_type = 'feedback';
ALTER TABLE ltm_entries
  MODIFY COLUMN memory_type ENUM('fact','preference','decision','pattern','rule','conversation','episodic','working') NOT NULL DEFAULT 'fact';
