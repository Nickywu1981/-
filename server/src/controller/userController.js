import { wrapController } from '../utils/wrapController.js';
import * as userService from '../services/userService.js';
import { success as sendSuccess, error as sendError } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import logger from '../utils/logger.js';

export const register = wrapController(async (req, res, next) => {
    const { username, password, nickname } = req.body;
    if (!username || !password) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, '用户名和密码不能为空');
    }
    if (password.length < 6) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, '密码长度不能少于6位');
    }
    const user = await userService.register({ username, password, nickname });
    return sendSuccess(res, user, '注册成功');
  });

export const login = wrapController(async (req, res, next) => {
    const { username, account, email, password } = req.body;
    const loginId = username || account || email;
    if (!loginId || !password) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, '用户名和密码不能为空');
    }
    const data = await userService.login({ username: loginId, password });
    return sendSuccess(res, data, '登录成功');
  });

export const profile = wrapController(async (req, res, next) => {
    const data = await userService.getProfile(req.user.id);
    return sendSuccess(res, data);
  });

export const updateProfile = wrapController(async (req, res, next) => {
    const { nickname, phone, email, avatar } = req.body;
    const data = await userService.updateProfile(req.user.id, { nickname, phone, email, avatar });
    return sendSuccess(res, data, '资料修改成功');
  });

export const changePassword = wrapController(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return sendError(res, ERROR_CODE.BAD_REQUEST, '旧密码和新密码不能为空');
    await userService.changePassword(req.user.id, { oldPassword, newPassword });
    return sendSuccess(res, {}, '密码修改成功');
  });

export const forgotPassword = wrapController(async (req, res, next) => {
    const { username } = req.body;
    if (!username) return sendError(res, ERROR_CODE.BAD_REQUEST, '请输入用户名');
    const data = await userService.forgotPassword(username);
    return sendSuccess(res, data);
  });

export const resetPassword = wrapController(async (req, res, next) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return sendError(res, ERROR_CODE.BAD_REQUEST, '缺少必填参数');
    await userService.resetPassword(token, newPassword);
    return sendSuccess(res, {}, '密码重置成功');
  });

export const getStats = wrapController(async (req, res, next) => {
    const stats = await userService.getUserStats(req.user.id, req.tenantId || 0);
    return sendSuccess(res, stats);
  });

// ========================= JWT 双令牌 =========================

export const refreshToken = wrapController(async (req, res, next) => {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, ERROR_CODE.BAD_REQUEST, '缺少 refreshToken');
    const tokens = await userService.refreshAccessToken(token);
    if (!tokens) return sendError(res, ERROR_CODE.UNAUTHORIZED, 'refreshToken 无效或已过期');
    return sendSuccess(res, tokens, '令牌刷新成功');
  });

export const logout = wrapController(async (req, res, next) => {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      await userService.revokeAccessToken(header.slice(7));
    }
    const rt = req.cookies?.refreshToken;
    if (rt) {
      try { await userService.revokeRefreshToken(rt); } catch (e) { logger.warn('[Logout] RefreshToken 撤销失败', { message: e.message }); }
      res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
    }
    return sendSuccess(res, {}, '已退出登录');
  });

export const logoutAll = wrapController(async (req, res, next) => {
    await userService.revokeAllUserTokens(req.user.id);
    return sendSuccess(res, {}, '已退出所有设备');
  });
