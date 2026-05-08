# Movio AI — API 错误码参考手册

> G1 Architect | 全系统错误码统一登记

## 错误码分段

| 段位 | 范围 | 类别 |
|:--|:--|------|
| 通用 HTTP | 200 / 400-500 | 标准状态码 |
| 用户模块 | 4001-4009 | 注册/登录/Token/刷新 |
| 资源模块 | 4101-4103 | 资源/配额 |
| 参数模块 | 4201-4202 | 参数校验 |
| 支付模块 | 4301-4306 | 订单/签名/回调 |

## 完整登记表

| 代码 | 常量名 | 中文说明 | HTTP |
|:--:|------|------|:--:|
| 200 | `SUCCESS` | 成功 | 200 |
| 400 | `BAD_REQUEST` | 请求参数错误 | 400 |
| 401 | `UNAUTHORIZED` | 未登录或登录已过期 | 401 |
| 403 | `FORBIDDEN` | 无访问权限 | 403 |
| 404 | `NOT_FOUND` | 资源不存在 | 404 |
| 409 | `CONFLICT` | 资源冲突 | 409 |
| 500 | `INTERNAL_ERROR` | 服务器内部异常 | 500 |
| 4001 | `USER_EXISTS` | 用户已存在 | 409 |
| 4002 | `USER_NOT_FOUND` | 用户不存在 | 404 |
| 4003 | `PASSWORD_WRONG` | 密码错误 | 401 |
| 4004 | `TOKEN_EXPIRED` | Token 已过期 | 401 |
| 4005 | `TOKEN_INVALID` | Token 无效 | 401 |
| 4006 | `ACCOUNT_DISABLED` | 账号已被禁用 | 403 |
| 4007 | `EC_AUTH_002` | Access Token 过期（前端自动刷新） | 401 |
| 4008 | `REFRESH_TOKEN_EXPIRED` | Refresh Token 过期 | 401 |
| 4009 | `REFRESH_TOKEN_INVALID` | Refresh Token 无效 | 401 |
| 4101 | `RESOURCE_NOT_FOUND` | 资源不存在 | 404 |
| 4102 | `RESOURCE_DUPLICATE` | 资源重复 | 409 |
| 4103 | `QUOTA_EXCEEDED` | 配额已用尽 | 429 |
| 4201 | `PARAM_MISSING` | 缺少必要参数 | 400 |
| 4202 | `PARAM_INVALID` | 参数格式错误 | 400 |
| 4301 | `PAY_ORDER_NOT_FOUND` | 支付订单不存在 | 404 |
| 4302 | `PAY_ORDER_EXPIRED` | 支付订单已过期 | 410 |
| 4303 | `PAY_SIGN_FAILED` | 签名验证失败 | 400 |
| 4304 | `PAY_CHANNEL_ERROR` | 支付渠道错误 | 500 |
| 4305 | `PAY_AMOUNT_MISMATCH` | 支付金额不匹配 | 400 |
| 4306 | `PAY_NOTIFY_FAILED` | 支付回调处理失败 | 500 |

## 响应格式

```json
{
  "code": 4001,
  "msg": "用户已存在",
  "data": null
}
```

| 来源 | 文件 |
|------|------|
| 常量定义 | `server/src/constants/errorCode.js` |
| 业务异常类 | `server/src/utils/businessError.js` |
| 全局兜底 | `server/src/constants/errorHandler.js` |
