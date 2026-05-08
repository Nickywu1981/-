import * as userService from '../services/userService.js';
import { success as sendSuccess, error as sendError } from '../utils/response.js';
import { ERROR_CODE } from '../constants/errorCode.js';

export async function register(req, res, next) {
  try {
    const { username, password, nickname } = req.body;
    if (!username || !password) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, '用户名和密码不能为空');
    }
    if (password.length < 6) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, '密码长度不能少于6位');
    }
    const user = await userService.register({ username, password, nickname });
    return sendSuccess(res, user, '注册成功');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { username, account, email, password } = req.body;
    const loginId = username || account || email;
    if (!loginId || !password) {
      return sendError(res, ERROR_CODE.BAD_REQUEST, '用户名和密码不能为空');
    }
    const data = await userService.login({ username: loginId, password });
    return sendSuccess(res, data, '登录成功');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
}

export async function profile(req, res, next) {
  try {
    const data = await userService.getProfile(req.user.id);
    return sendSuccess(res, data);
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.statusCode, err.message);
    }
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { nickname, phone, email, avatar } = req.body;
    const data = await userService.updateProfile(req.user.id, { nickname, phone, email, avatar });
    return sendSuccess(res, data, '资料修改成功');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return sendError(res, ERROR_CODE.BAD_REQUEST, '旧密码和新密码不能为空');
    await userService.changePassword(req.user.id, { oldPassword, newPassword });
    return sendSuccess(res, {}, '密码修改成功');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { username } = req.body;
    if (!username) return sendError(res, ERROR_CODE.BAD_REQUEST, '请输入用户名');
    const data = await userService.forgotPassword(username);
    return sendSuccess(res, data);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return sendError(res, ERROR_CODE.BAD_REQUEST, '缺少必填参数');
    await userService.resetPassword(token, newPassword);
    return sendSuccess(res, {}, '密码重置成功');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

export async function getStats(req, res, next) {
  try {
    const stats = await userService.getUserStats(req.user.id, req.tenantId || 0);
    return sendSuccess(res, stats);
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

// ========================= JWT 双令牌 =========================

export async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, ERROR_CODE.BAD_REQUEST, '缺少 refreshToken');
    const tokens = await userService.refreshAccessToken(token);
    if (!tokens) return sendError(res, ERROR_CODE.UNAUTHORIZED, 'refreshToken 无效或已过期');
    return sendSuccess(res, tokens, '令牌刷新成功');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      await userService.revokeAccessToken(header.slice(7));
    }
    return sendSuccess(res, {}, '已退出登录');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}

export async function logoutAll(req, res, next) {
  try {
    await userService.revokeAllUserTokens(req.user.id);
    return sendSuccess(res, {}, '已退出所有设备');
  } catch (err) {
    if (err.statusCode) return sendError(res, err.statusCode, err.message);
    next(err);
  }
}
