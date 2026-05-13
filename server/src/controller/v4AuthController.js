/**
 * Movio AI v4.1 — Auth Controller
 */
import jwt from 'jsonwebtoken';
import { wrapController } from '../utils/wrapController.js';
import { success } from '../utils/response.js';
import { BusinessError } from '../utils/businessError.js';
import { ERROR_CODE } from '../constants/errorCode.js';
import { generateRefreshToken } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import { revokeAccessToken, revokeRefreshToken } from '../utils/jwtToken.js';
import { cookieSecure } from '../utils/cookieHelper.js';
import logger from '../utils/logger.js';

import { findById } from '../dao/userDao.js';

function setTokenCookie(req, res, token) {
  const payload = jwt.decode(token);
  const maxAge = payload?.exp ? (payload.exp * 1000) - Date.now() : 7 * 24 * 60 * 60 * 1000;
  res.cookie('token', token, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: 'lax',
    maxAge,
  });
}

function setRefreshCookie(req, res, userId) {
  const refreshToken = generateRefreshToken({ userId });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: cookieSecure(req),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const register = wrapController(async (req, res) => {
  const { phone, email, password, nickname, invite_code } = req.validated;
  const result = await authService.register({
    phone, email, password, nickname, inviteCode: invite_code,
  });
  setTokenCookie(req, res, result.token);
  setRefreshCookie(req, res, result.user.id);
  return success(res, { ...result.user, token: result.token, token_expires_in: result.token_expires_in }, '注册成功');
});

export const login = wrapController(async (req, res) => {
  const { phone, email, username, account, password } = req.validated;
  const result = await authService.login({ phone, email, username: username || account, password });
  setTokenCookie(req, res, result.token);
  setRefreshCookie(req, res, result.user.id);
  return success(res, { ...result.user, token: result.token, token_expires_in: result.token_expires_in }, '登录成功');
});

export const loginByCode = wrapController(async (req, res) => {
  const { phone, email, username, code } = req.validated;
  if (!phone && !email && !username) {
    throw new BusinessError(ERROR_CODE.VALIDATION_ERROR);
  }
  const result = await authService.loginByCode({ phone, email, username, code });
  setTokenCookie(req, res, result.token);
  setRefreshCookie(req, res, result.user.id);
  return success(res, { ...result.user, token: result.token, token_expires_in: result.token_expires_in }, '登录成功');
});

export const resetPassword = wrapController(async (req, res) => {
  const { phone, email, new_password, code } = req.validated;
  const result = await authService.resetPassword({ phone, email, newPassword: new_password, code });
  return success(res, result, '密码重置成功');
});

export const logout = wrapController(async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { await revokeAccessToken(header.slice(7)); } catch (e) { logger.warn('[Auth] logout 撤销 accessToken 失败', { error: e.message }); }
  }
  const rt = req.cookies?.refreshToken;
  if (rt) {
    try { await revokeRefreshToken(rt); } catch (e) { logger.warn('[Auth] logout 撤销 refreshToken 失败', { error: e.message }); }
    res.clearCookie('refreshToken', { httpOnly: true, secure: cookieSecure(req), sameSite: 'lax', path: '/' });
  }
  res.clearCookie('token', { httpOnly: true, secure: cookieSecure(req), sameSite: 'lax', path: '/' });
  return success(res, {}, '已退出登录');
});

export const getMe = wrapController(async (req, res) => {
  const user = await findById(req.user.id);
  if (!user) throw new BusinessError(ERROR_CODE.UNAUTHORIZED);
  return success(res, {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    isAdmin: user.role === 'admin' || user.role === 'super_admin',
    tenantId: user.tenant_id,
    points: 0,
  });
});
