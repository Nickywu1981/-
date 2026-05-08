# KB_SNAPSHOT — 自动快照

> **生成时间**: 2026-05-08 04:38:26
> **自动更新**: PostToolUse Hook 触发 | 零人工介入

---

## 前端页面: 126 个

| 分类 | 数量 |
|------|:--:|
| work | 43 |
| admin | 37 |
| my | 8 |
| root | 12 |

---

## 后端: 48 路由 · 38 控制器 · 58 服务 · 29 DAO

### 路由 (48 条)
- `abuseRoutes` (18行)
- `adminRoutes` (85行)
- `advancedImageRoutes` (53行)
- `advancedVideoRoutes` (61行)
- `aiLogRoutes` (19行)
- `allinpayRoutes` (12行)
- `analyticsRoutes` (25行)
- `automationRoutes` (32行)
- `badgeRoutes` (30行)
- `batchRoutes` (41行)
- `brandRoutes` (19行)
- `collectionRoutes` (25行)
- `complianceRoutes` (22行)
- `creditRoutes` (38行)
- `diyRoutes` (44行)
- `emailRoutes` (27行)
- `formRoutes` (37行)
- `helpRoutes` (23行)
- `imageRoutes` (56行)
- `multilingualRoutes` (27行)
- `notificationRoutes` (25行)
- `openApiRoutes` (75行)
- `paymentRoutes` (27行)
- `platformDetailRoutes` (25行)
- `promptRoutes` (46行)
- `proxyRoutes` (25行)
- `rechargeRoutes` (27行)
- `siteConfigRoutes` (25行)
- `sizeTemplateRoutes` (34行)
- `smsRoutes` (36行)
- `taskRoutes` (17行)
- `tenantRoutes` (23行)
- `tierRoutes` (20行)
- `uploadRoutes` (20行)
- `userRoutes` (64行)
- `v4_admin_models.routes` (35行)
- `v4_assets.routes` (70行)
- `v4_auth.routes` (108行)
- `v4_config.routes` (115行)
- `v4_distribution.routes` (75行)
- `v4_image.routes` (100行)
- `v4_job.routes` (45行)
- `v4_platform_bind.routes` (86行)
- `v4_points.routes` (67行)
- `v4_upload.routes` (93行)
- `v4_user.routes` (142行)
- `v4_video.routes` (203行)
- `videoRoutes` (50行)

### 控制器 (38 个)
- `abuseController` (18行)
- `adminController` (293行)
- `adminPromptController` (38行)
- `advancedImageController` (147行)
- `advancedVideoController` (143行)
- `aiLogController` (20行)
- `allinpayNotifyController` (21行)
- `analyticsController` (41行)
- `automationController` (60行)
- `badgeController` (36行)
- `baseController` (15行)
- `batchController` (98行)
- `brandController` (21行)
- `collectionController` (28行)
- `complianceController` (23行)
- `creditController` (105行)
- `diyController` (99行)
- `emailController` (55行)
- `formController` (65行)
- `healthController` (25行)
- `helpController` (51行)
- `imageController` (159行)
- `multilingualController` (20行)
- `notificationController` (57行)
- `paymentController` (73行)
- `platformDetailController` (20行)
- `promptController` (89行)
- `proxyController` (37行)
- `rechargeController` (51行)
- `siteConfigController` (48行)
- `sizeTemplateController` (109行)
- `smsController` (84行)
- `taskController` (11行)
- `tenantController` (45行)
- `tierController` (23行)
- `uploadController` (41行)
- `userController` (155行)
- `videoController` (109行)

### 服务 (58 个)
- `abuseService` (21行)
- `action-migrate.service` (78行)
- `advancedImageService` (393行)
- `advancedVideoService` (478行)
- `aiEngine` (290行)
- `aiLogService` (21行)
- `allinpayService` (227行)
- `analyticsService` (121行)
- `auth.service` (256行)
- `automationService` (67行)
- `badgeService` (27行)
- `batchService` (285行)
- `brandService` (27行)
- `collectionService` (7行)
- `commerceService` (431行)
- `complianceService` (145行)
- `config-version.service` (48行)
- `config.service` (218行)
- `creditService` (320行)
- `detail-image.service` (65行)
- `digital-human.service` (25行)
- `distribution.service` (217行)
- `diyService` (50行)
- `emailService` (193行)
- `formService` (68行)
- `helpService` (24行)
- `image.service` (127行)
- `imageService` (330行)
- `job-queue.service` (158行)
- `live-clip.service` (61行)
- `logService` (92行)
- `model-router.service` (138行)
- `moderation.service` (87行)
- `multilingualService` (67行)
- `notificationService` (46行)
- `paymentService` (116行)
- `platformDetailService` (143行)
- `points.service` (217行)
- `prompt-enhance.service` (78行)
- `promptService` (158行)
- `proxyService` (51行)
- `queueManager` (214行)
- `rechargeService` (54行)
- `sensitiveWordService` (17行)
- `siteConfigService` (22行)
- `sizeTemplateService` (77行)
- `smsService` (210行)
- `storageService` (176行)
- `taskNotifier` (56行)
- `taskService` (31行)
- `tenantService` (42行)
- `tierService` (37行)
- `userService` (179行)
- `video.service` (168行)
- `videoService` (300行)
- `viral-video.service` (46行)
- `workerBootstrap` (78行)
- `wsManager` (147行)

### DAO (29 个)
- `abuseDao` (43行)
- `allinpayDao` (56行)
- `automationDao` (64行)
- `badgeDao` (51行)
- `batchTemplateDao` (33行)
- `brandDao` (29行)
- `collectionDao` (37行)
- `creditDao` (131行)
- `db` (191行)
- `diyDao` (100行)
- `emailTemplateDao` (42行)
- `formDao` (80行)
- `helpDao` (56行)
- `migrate` (162行)
- `notificationDao` (85行)
- `promptDao` (127行)
- `proxyDao` (53行)
- `rechargeDao` (59行)
- `redis` (79行)
- `sensitiveWordDao` (29行)
- `siteConfigDao` (34行)
- `sizeTemplateDao` (80行)
- `smsLogDao` (46行)
- `smsTemplateDao` (42行)
- `taskDao` (109行)
- `tenantDao` (61行)
- `tenantPool` (143行)
- `tierDao` (19行)
- `userDao` (77行)

### 中间件 (18 个)
- `asyncHandler` (11行)
- `audit-log.middleware` (35行)
- `auth` (164行)
- `auth.middleware` (72行)
- `cache` (57行)
- `content-moderation.middleware` (39行)
- `csp` (37行)
- `csrf` (90行)
- `metrics` (106行)
- `openApi` (127行)
- `paramFilter` (73行)
- `rate-limit.middleware` (36行)
- `rateLimiter` (49行)
- `rbac` (198行)
- `role.middleware` (35行)
- `tenantContext` (14行)
- `tierGuard` (29行)
- `upload` (34行)

---

## 覆盖率

| 维度 | 覆盖 |
|------|:--:|
| Zod 入参校验 | 34/48 |
| AsyncHandler | 35/48 |
| SQL 表 | 34 |
| 服务端测试 | 23文件 ?/?通过 |
| 客户端测试 | 0文件 |

---

## 依赖与配置

| 检查项 | 状态 |
|------|:--:|
| Docker Compose | ✅ |
| Nginx 配置 | ✅ |
| PM2 配置 | ✅ |
| Settings Hook | ✅ |
| 后端核心依赖 | bullmq express jsonwebtoken mysql2 redis ws zod |
| 前端核心依赖 | element-plus nuxt pinia |

---

> 此文件由 `server/scripts/kb-snapshot.js` 自动生成
> 手动编辑会被下次扫描覆盖 | 改代码即自动更新
