/**
 * Gateway — 统一路由注册表
 *
 * 将 app.js 中分散的 78 个路由挂载点集中管理。
 * 提供：
 * - 路由地图 JSON 生成（供文档和调试）
 * - 版本化路由前缀（/api/v1/*  legacy, /api/v4/*  current）
 * - 路由→限流器→权限 三维元数据
 */

// ==================== 路由元数据定义 ====================

/**
 * @typedef {Object} RouteEntry
 * @property {string} prefix    - 路由前缀，如 '/api/auth'
 * @property {string} version   - API 版本，'v1' | 'v4' | 'none'
 * @property {string} audience  - 目标用户端: 'consumer' | 'enterprise' | 'admin' | 'ops' | 'public'
 * @property {string|null} limiter    - 关联限流器名（对应 RATE_LIMITER_REGISTRY key）
 * @property {string|null} role       - 所需最低角色
 * @property {string} description
 * @property {boolean} [zod]          - 是否有 Zod 校验
 */

/** @type {RouteEntry[]} */
export const ROUTE_REGISTRY = [
  // ===== Auth (v4) =====
  { prefix: '/api/auth',            version: 'v4',  audience: 'public',    limiter: 'authLimiter',  role: null,              description: '用户认证(登录/注册/刷新/注销)' },

  // ===== Config (v4) =====
  { prefix: '/api/config',          version: 'v4',  audience: 'public',    limiter: 'apiLimiter',   role: null,              description: '公开配置(站点/功能开关)' },
  { prefix: '/api/admin/config',    version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: '管理端配置(CRUD/回滚/审计)' },

  // ===== Image (v4) =====
  { prefix: '/api/images',          version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'AI图片生成(v4)' },
  { prefix: '/api/ai',              version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'AI增强Prompt(仅 /enhance-prompt)' },

  // ===== Detail (v4) =====
  { prefix: '/api/detail',          version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '商品详情图生成' },

  // ===== Video (v4) =====
  { prefix: '/api/videos',          version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'AI视频生成(v4)' },

  // ===== Jobs (v4) =====
  { prefix: '/api/jobs',            version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '异步任务查询' },
  { prefix: '/api/job',             version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '异步任务查询(别名)' },

  // ===== Points (v4) =====
  { prefix: '/api/points',          version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '积分系统' },

  // ===== Distribution (v4) =====
  { prefix: '/api/distribution',    version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '分销/佣金/团队' },

  // ===== Assets (v4) =====
  { prefix: '/api/assets',          version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '资产库管理' },

  // ===== Compliance (v4) =====
  { prefix: '/api/compliance',      version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '跨境合规检查' },

  // ===== Platforms (v4) =====
  { prefix: '/api/platforms',       version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '平台绑定+详情' },

  // ===== Publish (v4) =====
  { prefix: '/api/publish',         version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '内容发布' },

  // ===== User =====
  { prefix: '/api/users',           version: 'v1',  audience: 'consumer',  limiter: null,           role: null,              description: '用户管理(legacy v1)' },
  { prefix: '/api/user',            version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '用户管理(v4.1)' },

  // ===== Upload =====
  { prefix: '/api/upload',          version: 'v4',  audience: 'consumer',  limiter: 'uploadLimiter',role: null,              description: '文件上传' },

  // ===== OpenAPI =====
  { prefix: '/api/open',            version: 'v4',  audience: 'public',    limiter: null,           role: null,              description: '公开API(API Key鉴权)' },
  { prefix: '/api/open/keys',       version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: 'API Key管理' },

  // ===== Copywriting =====
  { prefix: '/api/copywriting',     version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: 'AI文案生成(13平台)' },

  // ===== Templates =====
  { prefix: '/api/templates',       version: 'v1',  audience: 'consumer',  limiter: null,           role: null,              description: '尺寸模板' },

  // ===== Brand =====
  { prefix: '/api/brand',           version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '品牌管理' },

  // ===== DEPRECATED v1 (向后兼容) =====
  { prefix: '/api/images',          version: 'v1',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'AI图片生成(legacy, deprecated)' },
  { prefix: '/api/videos',          version: 'v1',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'AI视频生成(legacy, deprecated)' },
  { prefix: '/api/batch',           version: 'v1',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '批量处理(legacy)' },
  { prefix: '/api/advanced',        version: 'v1',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '高级图片处理(legacy)' },
  { prefix: '/api/adv-video',       version: 'v1',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '高级视频处理(legacy)' },

  // ===== Payment =====
  { prefix: '/api/payment',         version: 'v4',  audience: 'consumer',  limiter: 'paymentLimiter', role: null,            description: '支付订单' },
  { prefix: '/api/plans',           version: 'v4',  audience: 'public',    limiter: null,           role: null,              description: '套餐列表(公开)' },

  // ===== Admin =====
  { prefix: '/api/admin',           version: 'v4',  audience: 'admin',     limiter: 'adminLimiter', role: 'admin',           description: '管理后台(仪表盘/用户/套餐/订单/风控)' },
  { prefix: '/api/admin/models',    version: 'v4',  audience: 'admin',     limiter: 'adminLimiter', role: 'admin',           description: 'AI模型管理' },

  // ===== Test Workbench =====
  { prefix: '/api/test',            version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: '测试工作台' },

  // ===== Poster (v4) =====
  { prefix: '/api/posters',         version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'AI海报生成' },

  // ===== Video Translate (v4) =====
  { prefix: '/api/video-translate', version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '视频翻译' },

  // ===== Cut Ecosystem (v4) =====
  { prefix: '/api/cut-ecosystem',   version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '剪映生态集成' },

  // ===== Model Generate (v4) =====
  { prefix: '/api/model',           version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '模型生成' },

  // ===== Render (v4) =====
  { prefix: '/api/render',          version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '渲染' },

  // ===== Voice (v4) =====
  { prefix: '/api/voice',           version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '语音(TTS/克隆)' },

  // ===== 3D (v4) =====
  { prefix: '/api/3d',              version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '3D模型' },

  // ===== Notifications =====
  { prefix: '/api/notifications',   version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '站内通知' },

  // ===== SMS =====
  { prefix: '/api/sms',             version: 'v4',  audience: 'public',    limiter: 'codeLimiter',  role: null,              description: '短信验证码' },

  // ===== Email =====
  { prefix: '/api/email',           version: 'v4',  audience: 'public',    limiter: null,           role: null,              description: '邮件验证码' },

  // ===== Prompts =====
  { prefix: '/api/prompts',         version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: 'Prompt模板' },

  // ===== Credits =====
  { prefix: '/api/credits',         version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '点数消费记录' },

  // ===== Tenants =====
  { prefix: '/api/tenants',         version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: '多租户管理' },

  // ===== DIY =====
  { prefix: '/api/diy',             version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: 'DIY模板编辑器' },

  // ===== Forms =====
  { prefix: '/api/forms',           version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '自定义表单' },

  // ===== Proxy =====
  { prefix: '/api/proxy',           version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: 'API代理管理' },

  // ===== Recharge =====
  { prefix: '/api/recharge',        version: 'v4',  audience: 'consumer',  limiter: 'paymentLimiter',role: null,             description: '点数充值' },

  // ===== Allinpay =====
  { prefix: '/api/allinpay',        version: 'v4',  audience: 'public',    limiter: null,           role: null,              description: '通联支付回调' },

  // ===== Automation =====
  { prefix: '/api/automation',      version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '自动化任务' },

  // ===== AI Logs =====
  { prefix: '/api/admin/ai-logs',   version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: 'AI调用日志' },

  // ===== Audit Logs =====
  { prefix: '/api/admin/audit-logs',version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: '审计日志' },

  // ===== Tasks =====
  { prefix: '/api/tasks',           version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '任务管理' },

  // ===== Help =====
  { prefix: '/api/help',            version: 'v4',  audience: 'public',    limiter: null,           role: null,              description: '帮助中心' },

  // ===== Collections =====
  { prefix: '/api/collections',     version: 'v4',  audience: 'consumer',  limiter: null,           role: null,              description: '作品集' },

  // ===== Site Config =====
  { prefix: '/api/admin/site-config', version: 'v4', audience: 'admin',    limiter: null,           role: 'admin',           description: '站点配置管理' },
  { prefix: '/api/admin/workspace-diy', version: 'v4', audience: 'admin',  limiter: 'adminLimiter', role: 'admin',           description: '工作台DIY管理' },
  { prefix: '/api/site-config/public', version: 'v4', audience: 'public',  limiter: null,           role: null,              description: '站点公开配置' },

  // ===== Badges =====
  { prefix: '/api/badges',          version: 'v4',  audience: 'admin',     limiter: 'adminLimiter', role: 'admin',           description: '徽章管理' },

  // ===== Tier =====
  { prefix: '/api/tier',            version: 'v4',  audience: 'consumer',  limiter: 'apiLimiter',   role: null,              description: '会员等级' },

  // ===== Abuse =====
  { prefix: '/api/admin/abuse',     version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: '滥用监控' },

  // ===== Multilingual =====
  { prefix: '/api/multilingual',    version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: '多语言管理' },

  // ===== Analytics =====
  { prefix: '/api/analytics',       version: 'v4',  audience: 'admin',     limiter: null,           role: 'admin',           description: '数据分析' },

  // ===== Platform Specs =====
  { prefix: '/api/platform-specs',  version: 'v4',  audience: 'public',    limiter: null,           role: null,              description: '平台规格查询' },

  // ===== AI Dispatch =====
  { prefix: '/api/ai-dispatch',     version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'AI统一调度(并发控制)' },

  // ===== Compare =====
  { prefix: '/api/compare',         version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '对比工具' },

  // ===== SEO Keywords =====
  { prefix: '/api/seo-keywords',    version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'SEO关键词' },

  // ===== FAB =====
  { prefix: '/api/fab',             version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'FAB内容模板' },

  // ===== Memory =====
  { prefix: '/api/memory',          version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '记忆嵌入' },

  // ===== Digital Human =====
  { prefix: '/api/digital-human',   version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: '数字人' },

  // ===== Platform Publish =====
  { prefix: '/api/platform-publish',version: 'v4',  audience: 'consumer',  limiter: 'apiLimiter',   role: null,              description: '平台发布' },

  // ===== Template Market =====
  { prefix: '/api/template-market', version: 'v4',  audience: 'consumer',  limiter: 'apiLimiter',   role: null,              description: '模板市场' },

  // ===== SDK =====
  { prefix: '/api/sdk',             version: 'v4',  audience: 'consumer',  limiter: 'heavyLimiter', role: null,              description: 'MemFocus SDK' },

  // ===== ADK =====
  { prefix: '/api/adk',             version: 'v4',  audience: 'public',    limiter: 'heavyLimiter', role: null,              description: 'Agent开发工具包' },

  // ===== Geo =====
  { prefix: '/api/geo',             version: 'v4',  audience: 'public',    limiter: null,           role: null,              description: '地理位置服务' },
];

// ==================== 路由地图查询 ====================

/**
 * 按 audience 筛选路由
 * @param {'consumer'|'enterprise'|'admin'|'ops'|'public'} audience
 * @returns {RouteEntry[]}
 */
export function getRoutesByAudience(audience) {
  return ROUTE_REGISTRY.filter(r => r.audience === audience);
}

/**
 * 按版本筛选路由
 * @param {'v1'|'v4'|'none'} version
 * @returns {RouteEntry[]}
 */
export function getRoutesByVersion(version) {
  return ROUTE_REGISTRY.filter(r => r.version === version);
}

/**
 * 生成完整路由地图 JSON
 * @returns {Object} 路由地图
 */
export function generateRouteMap() {
  const map = {
    total: ROUTE_REGISTRY.length,
    generatedAt: new Date().toISOString(),
    byAudience: {},
    byVersion: {},
    routes: ROUTE_REGISTRY,
  };

  for (const audience of ['consumer', 'enterprise', 'admin', 'ops', 'public']) {
    map.byAudience[audience] = getRoutesByAudience(audience).length;
  }
  for (const version of ['v1', 'v4']) {
    map.byVersion[version] = getRoutesByVersion(version).length;
  }

  return map;
}
