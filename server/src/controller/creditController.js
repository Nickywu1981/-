import * as creditService from '../services/creditService.js';
import { success, error } from '../utils/response.js';
import { parsePagination } from '../utils/pagination.js';

export async function getMembership(req, res) {
  try {
    const m = await creditService.getUserMembership(req.user.id);
    if (!m) return error(res, 404, '会员信息不存在');
    success(res, m);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function freezeCredit(req, res) {
  try {
    const { requestId, action, batchCount, isNight } = req.body;
    if (!requestId || !action) return error(res, 400, '缺少 requestId 或 action 参数');
    const result = await creditService.freezeCredit(req.user.id, requestId, action, batchCount || 1, isNight || false);
    success(res, result);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function confirmCredit(req, res) {
  try {
    const { requestId } = req.body;
    if (!requestId) return error(res, 400, '缺少 requestId');
    const result = await creditService.confirmCharge(requestId);
    success(res, result);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function rollbackCredit(req, res) {
  try {
    const { requestId, recordId, remark } = req.body;
    const rid = requestId || recordId;
    if (!rid) return error(res, 400, '缺少 requestId 或 recordId');
    const result = await creditService.rollbackCharge(rid, remark || '');
    success(res, result);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function listRecords(req, res) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const { type, userId } = req.query;
    const data = await creditService.listConsumptionRecords({ userId: userId ? +userId : req.user.id, type: type ? +type : undefined, page, pageSize });
    success(res, data);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function listAllRecords(req, res) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const { type, userId } = req.query;
    const data = await creditService.listConsumptionRecords({ userId: userId ? +userId : undefined, type: type ? +type : undefined, page, pageSize });
    success(res, data);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function adminRefund(req, res) {
  try {
    const { recordId, remark } = req.body;
    if (!recordId) return error(res, 400, '缺少 recordId');
    await creditService.adminRefundCredit(recordId, remark || '管理员退款');
    success(res, null, '退款成功');
  } catch (e) { error(res, e.status || 500, e.message); }
}

// ==================== 签到+奖励 ====================

export async function checkIn(req, res) {
  try {
    const data = await creditService.checkIn(req.user.id);
    success(res, data, `签到成功！+${data.reward}积分，连续${data.streak}天`);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function checkInStatus(req, res) {
  try {
    const data = await creditService.getCheckInStatus(req.user.id);
    success(res, data);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function shareReward(req, res) {
  try {
    const data = await creditService.shareReward(req.user.id);
    if (data.alreadyClaimed) return success(res, data, '今日已领取分享奖励');
    success(res, data, `分享奖励 +${data.reward} 积分`);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function creditHistory(req, res) {
  try {
    const { page, pageSize } = parsePagination(req.query);
    const data = await creditService.getCreditHistory(req.user.id, page, pageSize);
    success(res, data);
  } catch (e) { error(res, e.status || 500, e.message); }
}

export async function creditBalance(req, res) {
  try {
    const data = await creditService.getCreditBalance(req.user.id);
    success(res, data);
  } catch (e) { error(res, e.status || 500, e.message); }
}
