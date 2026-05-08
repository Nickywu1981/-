import * as proxyService from '../services/proxyService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { BusinessError } from '../utils/businessError.js';

// ==================== 配置 CRUD ====================

export async function listConfigs(req, res) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const { status } = req.query;
    const rows = await proxyService.listConfigs(req.tenantId, { page, pageSize, status });
    success(res, rows);
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function getConfig(req, res) {
  try {
    const data = await proxyService.getConfig(req.params.id, req.tenantId);
    success(res, data);
  } catch (e) { error(res, e.statusCode || 500, e.message); }
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
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

// ==================== 代理转发调用 ====================

export async function callProxy(req, res) {
  try {
    const data = await proxyService.callProxy(req.params.code, req.tenantId, {
      method: req.method,
      body: req.body,
      userId: req.user?.id,
      clientIp: req.ip,
    });
    success(res, data);
  } catch (e) {
    error(res, e.statusCode || 500, e.message, e.errorCode);
  }
}

// ==================== 白名单管理 ====================

export async function addWhitelist(req, res) {
  try {
    const data = await proxyService.addWhitelist(req.tenantId, req.body);
    success(res, data, '白名单添加成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function listWhitelist(req, res) {
  try {
    const rows = await proxyService.listWhitelist(req.tenantId);
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

export async function updateWhitelist(req, res) {
  try {
    await proxyService.updateWhitelist(req.params.id, req.tenantId, req.body);
    success(res, null, '白名单更新成功');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function removeWhitelist(req, res) {
  try {
    await proxyService.removeWhitelist(req.params.id, req.tenantId);
    success(res, null, '白名单已删除');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

// ==================== 熔断管理 ====================

export async function resetCircuit(req, res) {
  try {
    const data = await proxyService.resetCircuit(req.params.id, req.tenantId);
    success(res, data, '熔断已重置');
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

export async function getCircuitStatus(req, res) {
  try {
    const data = await proxyService.getCircuitStatus(req.params.id, req.tenantId);
    success(res, data);
  } catch (e) { error(res, e.statusCode || 500, e.message); }
}

// ==================== 调用日志 ====================

export async function listLogs(req, res) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const { proxyId, status } = req.query;
    const rows = await proxyService.listLogs(req.tenantId, { page, pageSize, proxyId, status });
    success(res, rows);
  } catch (e) { error(res, 500, e.message); }
}

export async function cleanLogs(req, res) {
  try {
    const { days = 30 } = req.body;
    const data = await proxyService.cleanLogs(req.tenantId, days);
    success(res, data, `已清理 ${days} 天前的日志`);
  } catch (e) { error(res, 500, e.message); }
}
