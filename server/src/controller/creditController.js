import { wrapController } from '../utils/wrapController.js';
import * as creditService from '../services/creditService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export const getMembership = wrapController(async (req, res) => {
    const m = await creditService.getUserMembership(req.user.id);
    if (!m) return error(res, ERROR_CODE.NOT_FOUND, '会员信息不存在');
    success(res, m);
});

export const freezeCredit = wrapController(async (req, res) => {
    const { requestId, action, batchCount, isNight } = req.body;
    if (!requestId || !action) return error(res, ERROR_CODE.BAD_REQUEST, '缺少 requestId 或 action 参数');
    const result = await creditService.freezeCredit(req.user.id, requestId, action, batchCount || 1, isNight || false);
    success(res, result);
});

export const confirmCredit = wrapController(async (req, res) => {
    const { requestId } = req.body;
    if (!requestId) return error(res, ERROR_CODE.BAD_REQUEST, '缺少 requestId');
    const result = await creditService.confirmCharge(requestId);
    success(res, result);
});

export const rollbackCredit = wrapController(async (req, res) => {
    const { requestId, recordId, remark } = req.body;
    const rid = requestId || recordId;
    if (!rid) return error(res, ERROR_CODE.BAD_REQUEST, '缺少 requestId 或 recordId');
    const result = await creditService.rollbackCharge(rid, remark || '');
    success(res, result);
});

export const listRecords = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const { type, userId } = req.query;
    const data = await creditService.listConsumptionRecords({ userId: userId ? +userId : req.user.id, type: type ? +type : undefined, page, pageSize });
    success(res, data);
});

export const listAllRecords = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const { type, userId } = req.query;
    const data = await creditService.listConsumptionRecords({ userId: userId ? +userId : undefined, type: type ? +type : undefined, page, pageSize });
    success(res, data);
});

export const adminRefund = wrapController(async (req, res) => {
    const { recordId, remark } = req.body;
    if (!recordId) return error(res, ERROR_CODE.BAD_REQUEST, '缺少 recordId');
    await creditService.adminRefundCredit(recordId, remark || '管理员退款');
    success(res, null, '退款成功');
});

// ==================== 签到+奖励 ====================

export const checkIn = wrapController(async (req, res) => {
    const data = await creditService.checkIn(req.user.id);
    success(res, data, `签到成功！+${data.reward}积分，连续${data.streak}天`);
});

export const checkInStatus = wrapController(async (req, res) => {
    const data = await creditService.getCheckInStatus(req.user.id);
    success(res, data);
});

export const shareReward = wrapController(async (req, res) => {
    const data = await creditService.shareReward(req.user.id);
    if (data.alreadyClaimed) return success(res, data, '今日已领取分享奖励');
    success(res, data, `分享奖励 +${data.reward} 积分`);
});

export const creditHistory = wrapController(async (req, res) => {
    const { page, pageSize } = parsePagination(req.query);
    const data = await creditService.getCreditHistory(req.user.id, page, pageSize);
    success(res, data);
});

export const creditBalance = wrapController(async (req, res) => {
    const data = await creditService.getCreditBalance(req.user.id);
    success(res, data);
});
