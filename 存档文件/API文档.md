# Movio AI — API 文档

Base URL: `http://localhost:3001`

## 认证

所有需认证的接口在 Header 中携带：
```
Authorization: Bearer <token>
```

## 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/payment/plans` | 套餐列表（缓存 10min） |
| GET | `/api/site-config/public` | 站点公开配置 |
| POST | `/api/user/register` | 用户注册 |
| POST | `/api/user/login` | 用户登录 |
| POST | `/api/user/forgot-password` | 忘记密码 |
| POST | `/api/user/reset-password` | 重置密码 |
| POST | `/api/sms/send-code` | 发送短信验证码 |
| POST | `/api/email/send-code` | 发送邮箱验证码 |
| POST | `/api/sms/verify-code` | 验证短信验证码 |
| POST | `/api/email/verify-code` | 验证邮箱验证码 |
| GET | `/api/prompts/templates` | 提示词模板列表 |
| GET | `/api/prompts/templates/:id` | 模板详情 |
| GET | `/api/collections` | 公开合集 |
| GET | `/api/help` | FAQ 列表 |
| GET | `/api/size-templates/platforms` | 平台尺寸模板 |
| GET | `/api/compliance/targets` | 合规检查目标 |
| GET | `/api/multilingual/languages` | 支持语种 |
| GET | `/api/platform-details` | 平台详情 |
| GET | `/api/form/public/:code` | 公开表单 |
| POST | `/api/form/public/:code` | 提交公开表单 |

## 用户接口（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 个人信息 |
| PUT | `/api/user/profile` | 更新个人信息 |
| PUT | `/api/user/password` | 修改密码 |
| GET | `/api/user/stats` | 个人统计 |

## 图片生成（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/image/main-image` | 生成商品主图 |
| POST | `/api/image/scene` | 生成场景图 |
| POST | `/api/image/detail-h5` | 生成详情页 |
| POST | `/api/image/batch` | 批量图片任务 |
| POST | `/api/image/retouch` | 图片精修 |
| POST | `/api/image/remove-bg` | 智能抠图 |
| POST | `/api/image/white-bg` | 白底图生成 |
| GET | `/api/image/tasks` | 任务列表 |
| GET | `/api/image/tasks/:taskId` | 任务详情 |

## 高级图片（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/advanced-image/virtual-tryon` | 虚拟试穿 |
| POST | `/api/advanced-image/color-swap` | 一键换色 |
| POST | `/api/advanced-image/style-transfer` | 风格迁移 |
| POST | `/api/advanced-image/wrinkle-remove` | 去褶皱 |
| POST | `/api/advanced-image/image-translate` | 图片翻译 |
| POST | `/api/advanced-image/outpaint` | 画面扩展 |
| POST | `/api/advanced-image/ghost-mannequin` | 幽灵模特 |
| POST | `/api/advanced-image/model-generate` | 模特生成 |
| POST | `/api/advanced-image/shot-panorama` | 全景拍摄 |
| POST | `/api/advanced-image/swap-face` | 换脸 |
| POST | `/api/advanced-image/text-effect` | 文字特效 |

## 视频生成（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/video/img2video` | 图片转视频 |
| POST | `/api/video/multi2video` | 多图合成视频 |
| POST | `/api/video/packaging` | 视频包装 |
| POST | `/api/video/action-transfer` | 动作迁移 |
| POST | `/api/video/person-replace` | 人物替换 |
| POST | `/api/video/digital-human` | 数字人视频 |

## 高级视频（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/advanced-video/script-gen` | 脚本生成 |
| POST | `/api/advanced-video/shot-plan` | 分镜计划 |
| POST | `/api/advanced-video/viral-clone` | 爆款克隆 |
| POST | `/api/advanced-video/viral-analyze` | 爆款分析 |
| POST | `/api/advanced-video/viral-replicate` | 爆款复刻 |
| POST | `/api/advanced-video/action-batch` | 批量动作 |
| POST | `/api/advanced-video/beautify` | 视频美化 |
| POST | `/api/advanced-video/voice-gen` | 语音生成 |
| POST | `/api/advanced-video/voice-clone` | 声音克隆 |
| POST | `/api/advanced-video/video-edit` | 视频编辑 |

## 积分与签到（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/credits/membership` | 会员信息 |
| GET | `/api/credits/balance` | 积分余额 |
| GET | `/api/credits/history` | 积分流水 |
| GET | `/api/credits/records` | 消费记录 |
| POST | `/api/credits/checkin` | 每日签到 |
| GET | `/api/credits/checkin/status` | 签到状态 |
| POST | `/api/credits/share-reward` | 分享奖励 |
| POST | `/api/credits/freeze` | 预扣积分 |
| POST | `/api/credits/confirm` | 确认消费 |
| POST | `/api/credits/rollback` | 回滚消费 |

## 支付（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/payment/plans` | 套餐列表 |
| POST | `/api/payment/create-order` | 创建订单 |
| GET | `/api/payment/order/:orderId` | 订单状态 |
| POST | `/api/payment/sandbox-pay/:orderId` | 沙箱支付 |
| GET | `/api/payment/billing` | 账单历史 |
| POST | `/api/payment/callback` | 支付回调（公开） |

## 上传（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload/image` | 单文件上传 |
| POST | `/api/upload/images` | 多文件上传（最多 50 个） |

## 管理后台（需管理员权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 仪表盘统计 |
| GET/PUT | `/api/admin/users` | 用户管理 |
| GET | `/api/admin/tasks` | 任务管理 |
| PUT/GET/DELETE | `/api/admin/plans` | 套餐管理 |
| GET | `/api/admin/orders` | 订单管理 |
| GET | `/api/admin/logs` | 操作日志 |
| GET | `/api/admin/prompts` | 提示词管理 |
| GET/POST | `/api/admin/credits` | 积分管理 |
| GET | `/api/admin/ai-logs` | AI 调用日志 |
| GET/POST/DELETE | `/api/admin/notifications` | 通知管理 |
| GET/POST/DELETE | `/api/admin/sensitive-words` | 敏感词管理 |
| POST | `/api/admin/check-content` | 内容审核 |

## 批量处理（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/batch/submit` | 提交批量任务 |
| POST | `/api/batch/redo` | 重做批量任务 |
| GET | `/api/batch/history` | 批量历史 |
| GET | `/api/batch/tasks/:taskId` | 任务详情 |
| GET | `/api/batch/:taskId/download` | 下载 ZIP |

## WebSocket

连接地址：`ws://localhost:3001/ws`

用于实时推送批量任务进度（需在连接参数中携带 `?token=<jwt>`）

---

**总计**：32 条路由、150+ 端点、20 个控制器模块
