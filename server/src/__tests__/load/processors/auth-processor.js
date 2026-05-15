// Artillery 处理器: 动态生成登录 payload
// 用法: artillery run --processor processors/auth-processor.js ...

const crypto = require('crypto')

// 预注册测试账号池（实际运行前通过 before 脚本注入）
const testAccounts = []

/**
 * 生成随机用户名
 */
function generateTestUser() {
  const ts = Date.now()
  const rand = Math.random().toString(36).substring(2, 8)
  return `loadtest_${ts}_${rand}`
}

/**
 * Artillery 要求在 CommonJS 模块中导出函数。
 * 此处理器用于为每个虚拟用户生成独立登录凭据。
 *
 * @param {object} req - Artillery request context
 * @param {object} ctx - Virtual user context
 * @param {object} ee - EventEmitter
 * @param {function} next - Callback
 */
function authPayloadGenerator(req, ctx, ee, next) {
  // 为每个 VU 生成独立的测试凭据
  if (!ctx.vars.username) {
    ctx.vars.username = generateTestUser()
    ctx.vars.password = 'TestPass123!'
  }
  if (!ctx.vars.email) {
    ctx.vars.email = `${ctx.vars.username}@test-load.local`
  }
  return next()
}

module.exports = {
  authPayloadGenerator,
  generateTestUser,
}
