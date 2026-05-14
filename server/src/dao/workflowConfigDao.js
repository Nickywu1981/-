/**
 * Workflow Config DAO — 工作流配置持久化
 *
 * 操作 workflow_config 表:
 *   读写用户/租户级的工作流自定义配置(步骤开关/模型绑定/参数)
 */
import { tenantPool } from './tenantPool.js';
import { als } from './context.js';
import pool from './db.js';

function _db() { return als.getStore()?.db || pool; }

export async function getWorkflowConfig(workflowId, userId) {
  const [rows] = await _db().query(
    'SELECT * FROM workflow_config WHERE workflow_id = ? AND user_id = ? LIMIT 1',
    [workflowId, userId],
  );
  return rows[0] || null;
}

export async function getGlobalWorkflowConfig(workflowId) {
  const [rows] = await _db().query(
    'SELECT * FROM workflow_config WHERE workflow_id = ? AND user_id IS NULL LIMIT 1',
    [workflowId],
  );
  return rows[0] || null;
}

export async function upsertWorkflowConfig(workflowId, userId, config) {
  const { mode, disabledSteps, modelBindings, extraSteps, deletedSteps, stepOrder, params, tenantId } = config || {};

  const [existing] = await _db().query(
    'SELECT id FROM workflow_config WHERE workflow_id = ? AND user_id = ? LIMIT 1',
    [workflowId, userId],
  );

  if (existing.length > 0) {
    const fields = [];
    const values = [];

    if (mode !== undefined) { fields.push('mode = ?'); values.push(mode); }
    if (disabledSteps !== undefined) { fields.push('disabled_steps = ?'); values.push(JSON.stringify(disabledSteps)); }
    if (modelBindings !== undefined) { fields.push('model_bindings = ?'); values.push(JSON.stringify(modelBindings)); }
    if (extraSteps !== undefined) { fields.push('extra_steps = ?'); values.push(JSON.stringify(extraSteps)); }
    if (deletedSteps !== undefined) { fields.push('deleted_steps = ?'); values.push(JSON.stringify(deletedSteps)); }
    if (stepOrder !== undefined) { fields.push('step_order = ?'); values.push(JSON.stringify(stepOrder)); }
    if (params !== undefined) { fields.push('params = ?'); values.push(JSON.stringify(params)); }

    if (fields.length === 0) return null;

    values.push(workflowId, userId);
    await _db().query(
      `UPDATE workflow_config SET ${fields.join(', ')} WHERE workflow_id = ? AND user_id = ?`,
      values,
    );
  } else {
    await _db().query(
      `INSERT INTO workflow_config (workflow_id, user_id, tenant_id, mode, disabled_steps, model_bindings, extra_steps, deleted_steps, step_order, params)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        workflowId,
        userId,
        tenantId || null,
        mode || 'auto',
        JSON.stringify(disabledSteps || []),
        JSON.stringify(modelBindings || {}),
        JSON.stringify(extraSteps || []),
        JSON.stringify(deletedSteps || []),
        JSON.stringify(stepOrder || []),
        JSON.stringify(params || {}),
      ],
    );
  }

  return getWorkflowConfig(workflowId, userId);
}

export async function deleteWorkflowConfig(workflowId, userId) {
  const [result] = await _db().query(
    'DELETE FROM workflow_config WHERE workflow_id = ? AND user_id = ?',
    [workflowId, userId],
  );
  return result.affectedRows > 0;
}

export async function listUserConfigs(userId) {
  const [rows] = await _db().query(
    'SELECT * FROM workflow_config WHERE user_id = ? ORDER BY updated_at DESC LIMIT 200',
    [userId],
  );
  return rows;
}
