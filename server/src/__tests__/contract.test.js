/**
 * API 契约测试 — 验证所有核心接口的请求/响应格式
 * 前置条件: 服务已在 3001 端口运行
 */

import { contract, assert, runContractTests } from '../utils/contractTest.js';

const api = contract();

// —— Auth 契约 ——

async function authContractTests() {
  const ts = Date.now();
  const email = `contract_${ts}@test.com`;
  const password = 'Test123456';
  let cookie = '';

  const { passed, failed } = await runContractTests('Auth 接口契约', [
    {
      label: 'POST /api/auth/register → 200, 返回 user (无 password)',
      fn: async () => {
        const { data, cookie: c } = await api.post('/api/auth/register', {
          email, password, nickname: 'tester',
        });
        assert(data && typeof data.id === 'number', '应返回 user 对象含 id');
        assert(!data.password, '不应返回 password');
        assert(data.role === 'free', '新用户 role 应为 free');
        cookie = c;
      },
    },
    {
      label: 'POST /api/auth/register → 409 重复注册',
      fn: async () => {
        await api.post('/api/auth/register', { email, password }, { expect: 409 });
      },
    },
    {
      label: 'POST /api/auth/login → 200, 返回 user',
      fn: async () => {
        const { data, cookie: c } = await api.post('/api/auth/login', { email, password });
        assert(data && data.id, '应返回 user');
        assert(!data.password, '不应返回 password');
        cookie = c;
      },
    },
    {
      label: 'POST /api/auth/login → 401 密码错误',
      fn: async () => {
        await api.post('/api/auth/login', { email, password: 'wrongpassword' }, { expect: 401 });
      },
    },
  ]);
  return { cookie, email, passed, failed };
}

// —— 会员/套餐契约 ——

async function plansContractTests(_cookie) {
  return await runContractTests('套餐接口契约', [
    {
      label: 'GET /api/payment/plans → 200, 返回 plans 列表含 name/price',
      fn: async () => {
        const { data } = await api.get('/api/payment/plans');
        assert(Array.isArray(data) || Array.isArray(data?.list), '应返回列表');
        const list = Array.isArray(data) ? data : data.list;
        if (list.length > 0) {
          const p = list[0];
          assert(typeof p.name === 'string', '需有 name');
          assert(typeof p.price === 'number' || typeof p.price === 'string', '需有 price');
        }
      },
    },
  ]);
}

// —— 支付契约 ——

async function paymentContractTests(cookie) {
  let reqsn = '';

  return await runContractTests('支付接口契约', [
    {
      label: 'POST /api/payment/create-order → 200, 返回 reqsn + payUrl',
      fn: async () => {
        const { data } = await api.post('/api/payment/create-order', {
          planType: 2,  // 季卡
        }, { cookie });
        assert(typeof data.reqsn === 'string' && data.reqsn.length > 0, '需有 reqsn');
        assert(typeof data.payUrl === 'string', '需有 payUrl');
        reqsn = data.reqsn;
      },
    },
    {
      label: 'POST /api/payment/sandbox-pay/:reqsn → 200, sandbox 支付成功',
      fn: async () => {
        const { data } = await api.post(`/api/payment/sandbox-pay/${reqsn}`, {}, { cookie });
        assert(data.status === 'paid', `sandbox 支付应返回 paid, 实际=${data.status}`);
      },
    },
    {
      label: 'GET /api/payment/result/:reqsn → 200, status=1 已支付',
      fn: async () => {
        const { data } = await api.get(`/api/payment/result/${reqsn}`, { cookie });
        assert(data.status === 1, `应已支付 status=1, 实际=${data.status}`);
      },
    },
  ]);
}

// —— 用户契约 ——

async function userContractTests(cookie) {
  return await runContractTests('用户接口契约', [
    {
      label: 'GET /api/user/profile → 200, 返回用户含 credit_balance',
      fn: async () => {
        const { data } = await api.get('/api/user/profile', { cookie });
        assert(data && typeof data.id === 'number', '需有 user id');
        assert(typeof data.credit_balance === 'number', '需有 credit_balance');
      },
    },
  ]);
}

// ========== 主入口 ==========

async function main() {
  console.log('🔬 Movio API 契约测试套件');
  console.log('前置: 确保服务在 http://localhost:3001 已启动\n');

  let totalPassed = 0;
  let totalFailed = 0;

  // 1. Auth
  const a = await authContractTests();
  totalPassed += a.passed;
  totalFailed += a.failed;

  // 2. Plans (public)
  const pl = await plansContractTests(a.cookie);
  totalPassed += pl.passed;
  totalFailed += pl.failed;

  // 3. Payment
  const p = await paymentContractTests(a.cookie);
  totalPassed += p.passed;
  totalFailed += p.failed;

  // 4. User
  const u = await userContractTests(a.cookie);
  totalPassed += u.passed;
  totalFailed += u.failed;

  console.log('='.repeat(50));
  console.log(`🏁 总计: ${totalPassed}/${totalPassed + totalFailed} 通过`);

  if (totalFailed > 0) {
    console.log('❌ 契约测试存在失败，请修复后重试');
    throw new Error('契约测试存在失败，请修复后重试');
  } else {
    console.log('✅ 全部契约测试通过');
  }
}

main().catch(err => {
  console.error('💥 测试套件异常:', err.message);
  throw err;
});
