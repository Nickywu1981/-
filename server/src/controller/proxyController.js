import { wrapController } from '../utils/wrapController.js';
import * as proxyService from '../services/proxyService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

// ==================== 配置 CRUD ====================

export const listConfigs = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const { status } = req.query;
    const rows = await proxyService.listConfigs(req.tenantId, { page, pageSize, status });
    success(res, rows);
})

export const getConfig = wrapController(async (req, res) => {
    const data = await proxyService.getConfig(req.params.id, req.tenantId);
    success(res, data);
})

export const createConfig = wrapController(async (req, res) => {
    const data = await proxyService.createConfig(req.tenantId, req.body);
    success(res, data, '代理配置创建成功');
})

export const updateConfig = wrapController(async (req, res) => {
    const data = await proxyService.updateConfig(req.params.id, req.tenantId, req.body);
    success(res, data, '更新成功');
})

export const deleteConfig = wrapController(async (req, res) => {
    await proxyService.deleteConfig(req.params.id, req.tenantId);
    success(res, null, '删除成功');
})

// ==================== 代理转发调用 ====================

export const callProxy = wrapController(async (req, res) => {
    const data = await proxyService.callProxy(req.params.code, req.tenantId, {
      method: req.method,
      body: req.body,
      userId: req.user?.id,
      clientIp: req.ip,
    });
    success(res, data);
  })

// ==================== 白名单管理 ====================

export const addWhitelist = wrapController(async (req, res) => {
    const data = await proxyService.addWhitelist(req.tenantId, req.body);
    success(res, data, '白名单添加成功');
})

export const listWhitelist = wrapController(async (req, res) => {
    const rows = await proxyService.listWhitelist(req.tenantId);
    success(res, rows);
})

export const updateWhitelist = wrapController(async (req, res) => {
    await proxyService.updateWhitelist(req.params.id, req.tenantId, req.body);
    success(res, null, '白名单更新成功');
})

export const removeWhitelist = wrapController(async (req, res) => {
    await proxyService.removeWhitelist(req.params.id, req.tenantId);
    success(res, null, '白名单已删除');
})

// ==================== 熔断管理 ====================

export const resetCircuit = wrapController(async (req, res) => {
    const data = await proxyService.resetCircuit(req.params.id, req.tenantId);
    success(res, data, '熔断已重置');
})

export const getCircuitStatus = wrapController(async (req, res) => {
    const data = await proxyService.getCircuitStatus(req.params.id, req.tenantId);
    success(res, data);
})

// ==================== 调用日志 ====================

export const listLogs = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const { proxyId, status } = req.query;
    const rows = await proxyService.listLogs(req.tenantId, { page, pageSize, proxyId, status });
    success(res, rows);
})

export const cleanLogs = wrapController(async (req, res) => {
    const { days = 30 } = req.body;
    const data = await proxyService.cleanLogs(req.tenantId, days);
    success(res, data, `已清理 ${days} 天前的日志`);
})
