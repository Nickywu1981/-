import * as proxyService from '../services/proxyService.js';
import { success, error } from '../utils/response.js';

export async function listConfigs(req, res) {
  try {
    const rows = await proxyService.listConfigs(req.tenantId);
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

export async function createConfig(req, res) {
  try {
    const data = await proxyService.createConfig(req.tenantId, req.body);
    success(res, data, '代理配置创建成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function updateConfig(req, res) {
  try {
    const data = await proxyService.updateConfig(req.params.id, req.tenantId, req.body);
    success(res, data, '更新成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function deleteConfig(req, res) {
  try {
    await proxyService.deleteConfig(req.params.id, req.tenantId);
    success(res, null, '删除成功');
  } catch (e) { error(res, 500, e.message); }
}

export async function callProxy(req, res) {
  try {
    const data = await proxyService.callProxy(req.params.code, req.tenantId);
    success(res, data);
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}
