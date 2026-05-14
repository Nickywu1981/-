/**
 * 环境配置中心
 */
import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';

// 分层加载：.env 为基础，环境特定文件覆盖
dotenv.config(); // 不 override，优先使用已设置的 process.env
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  env: process.env.NODE_ENV || 'development',

  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_saas',
    connectionLimit: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  jwt: {
    secret: (() => {
      const s = process.env.JWT_SECRET;
      if (!s || s === 'dev-secret' || s.length < 16) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET 生产环境必须使用至少32字符的密钥');
        }
        console.warn('[config] JWT_SECRET 未设置或过短，开发环境使用临时密钥（生产环境启动将被 startupGuard 拦截）');
        return 'dev-temp-' + crypto.randomBytes(16).toString('hex');
      }
      if (s.length < 32 && process.env.NODE_ENV !== 'development') {
        throw new Error('JWT_SECRET 非开发环境必须 >= 32 字符');
      }
      if (s.length < 32) {
        console.warn('[config] JWT_SECRET 长度不足32字符，仅允许开发环境使用');
      }
      return s;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  ai: {
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY || '',
    replicateBaseUrl: process.env.REPLICATE_BASE_URL || 'https://api.replicate.com/v1',
  },

  mockEnabled: process.env.MOCK_ENABLED === 'true',

  sms: {
    provider: (() => {
      const p = process.env.SMS_PROVIDER || 'mock';
      if (p === 'mock' && process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须配置 SMS_PROVIDER，不允许使用 mock');
      }
      return p;
    })(),
    providers: {
      aliyun: {
        accessKeyId: process.env.SMS_ALI_ACCESS_KEY_ID || '',
        accessKeySecret: process.env.SMS_ALI_ACCESS_KEY_SECRET || '',
        signName: process.env.SMS_SIGN_NAME || 'AI电商工具箱',
      },
      tencent: {
        secretId: process.env.SMS_TENCENT_SECRET_ID || '',
        secretKey: process.env.SMS_TENCENT_SECRET_KEY || '',
        sdkAppId: process.env.SMS_TENCENT_APP_ID || '',
        signName: process.env.SMS_SIGN_NAME || 'AI电商工具箱',
      },
    },
  },

  email: {
    provider: (() => {
      const p = process.env.EMAIL_PROVIDER || 'mock';
      if (p === 'mock' && process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须配置 EMAIL_PROVIDER，不允许使用 mock');
      }
      return p;
    })(),
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || '',
      timeoutMs: parseInt(process.env.SMTP_TIMEOUT_MS, 10) || 30000,
    },
  },

  get isDev() {
    return this.env === 'development';
  },
  get isProd() {
    return this.env === 'production';
  },

  ws: {
    maxConnectionsPerIp: parseInt(process.env.WS_MAX_CONN_PER_IP, 10) || 5,
    heartbeatIntervalMs: parseInt(process.env.WS_HEARTBEAT_MS, 10) || 30000,
    heartbeatThresholdMs: parseInt(process.env.WS_HEARTBEAT_THRESHOLD_MS, 10) || 60000,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 10,
    codeMax: parseInt(process.env.RATE_LIMIT_CODE_MAX, 10) || 1,
    heavyMax: parseInt(process.env.RATE_LIMIT_HEAVY_MAX, 10) || 30,
    uploadMax: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX, 10) || 20,
    paymentMax: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX, 10) || 15,
    adminMax: parseInt(process.env.RATE_LIMIT_ADMIN_MAX, 10) || 60,
    concurrencyMax: parseInt(process.env.RATE_LIMIT_CONCURRENCY_MAX, 10) || 6,
    aiConcurrencyMax: parseInt(process.env.RATE_LIMIT_AI_CONCURRENCY_MAX, 10) || 3,
    verifyMax: parseInt(process.env.RATE_LIMIT_VERIFY_MAX, 10) || 5,
    e2bMax: parseInt(process.env.RATE_LIMIT_E2B_MAX, 10) || 5,
    e2bExecuteMax: parseInt(process.env.RATE_LIMIT_E2B_EXECUTE_MAX, 10) || 10,
    e2bReadMax: parseInt(process.env.RATE_LIMIT_E2B_READ_MAX, 10) || 30,
    e2bDeleteMax: parseInt(process.env.RATE_LIMIT_E2B_DELETE_MAX, 10) || 10,
  },

  jwtRefreshSecret: (() => {
    const s = process.env.JWT_REFRESH_SECRET;
    if (s) return s;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境必须设置 JWT_REFRESH_SECRET，禁止回退到 JWT_SECRET');
    }
    // 开发环境：从 JWT_SECRET 派生 refresh secret（与 auth.js / jwtToken.js 历史行为一致）
    const base = process.env.JWT_SECRET;
    if (!base || base === 'dev-secret') {
      throw new Error('JWT_REFRESH_SECRET 未设置且 JWT_SECRET 无效，无法生成 refresh token');
    }
    console.warn('[config] JWT_REFRESH_SECRET 未设置，开发环境从 JWT_SECRET 派生（生产环境将被 startupGuard 拦截）');
    return base + '_refresh_dev_only';
  })(),

  corsOrigin: process.env.CORS_ORIGIN || '',

  log: {
    level: process.env.LOG_LEVEL || 'info',
    sampleRate: parseFloat(process.env.LOG_SAMPLE_RATE || '1.0'),
    slowQueryMs: parseInt(process.env.SLOW_QUERY_MS, 10) || 1000,
  },

  // 请求超时
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 60000,

  get aiTimeoutMs() {
    return parseInt(process.env.AI_TIMEOUT_MS, 10) || 300000;
  },

  worker: {
    pollInterval: parseInt(process.env.WORKER_POLL_INTERVAL, 10) || 2000,
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE, 10) || 3,
    maxConcurrent: parseInt(process.env.WORKER_MAX_CONCURRENT, 10) || 5,
  },

  upload: {
    dailyLimitMb: parseInt(process.env.UPLOAD_DAILY_LIMIT_MB, 10) || 2048,
    allowedTypes: (process.env.ALLOWED_UPLOAD_TYPES || 'jpg,jpeg,png,webp,mp4,mov,avi,webm').split(','),
    cdnBaseUrl: process.env.CDN_BASE_URL || '',
  },

  // 云存储后端配置 (storageService)
  storage: {
    backend: process.env.STORAGE_BACKEND || 'local',
    cos: {
      secretId: process.env.COS_SECRET_ID || '',
      secretKey: process.env.COS_SECRET_KEY || '',
      bucket: process.env.COS_BUCKET || '',
      region: process.env.COS_REGION || 'ap-guangzhou',
    },
    oss: {
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: process.env.OSS_BUCKET || '',
      endpoint: process.env.OSS_ENDPOINT || '',
    },
    s3: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || '',
    },
    minio: {
      accessKey: process.env.MINIO_ACCESS_KEY || '',
      secretKey: process.env.MINIO_SECRET_KEY || '',
      bucket: process.env.MINIO_BUCKET || '',
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      useSSL: process.env.MINIO_USE_SSL === 'true',
    },
  },

  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    // 内容安全
    sanitizeInput: process.env.SECURITY_SANITIZE_INPUT !== 'false',
    aliyunGreenEnabled: process.env.SECURITY_ALIYUN_GREEN_ENABLED === 'true',
    aliyunAccessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    aliyunAccessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    aliyunGreenRegion: process.env.ALIYUN_GREEN_REGION || 'cn-shanghai',
    aliyunGreenTimeoutMs: parseInt(process.env.ALIYUN_GREEN_TIMEOUT_MS || '5000', 10),
    selfBuiltWordlistEnabled: process.env.SECURITY_SELF_BUILT_WORDLIST_ENABLED !== 'false',
    outputModerationLevel: parseInt(process.env.SECURITY_OUTPUT_MODERATION_LEVEL || '5', 10),
    outputSanitize: process.env.SECURITY_OUTPUT_SANITIZE === 'true',
    // 接口安全
    signatureRequired: process.env.SECURITY_SIGNATURE_REQUIRED === 'true',
    signatureTimeWindowMs: parseInt(process.env.SIGNATURE_TIME_WINDOW_MS || '300000', 10),
    signatureNonceTTL: parseInt(process.env.SIGNATURE_NONCE_TTL_S || '300', 10),
    apiAppCredentials: process.env.API_APP_CREDENTIALS || '{}',
    modelAclEnabled: process.env.SECURITY_MODEL_ACL_ENABLED === 'true',
    modelAclPolicies: process.env.MODEL_ACL_POLICIES,
    tokenLeakProtection: process.env.SECURITY_TOKEN_LEAK_PROTECTION === 'true',
    tokenBurstThreshold: parseInt(process.env.TOKEN_BURST_THRESHOLD || '100000', 10),
    tokenBurstWindowMs: parseInt(process.env.TOKEN_BURST_WINDOW_MS || '300000', 10),
    tokenMaxIpCount: parseInt(process.env.TOKEN_MAX_IP_COUNT || '3', 10),
    tokenIpCheckWindowMs: parseInt(process.env.TOKEN_IP_CHECK_WINDOW_MS || '3600000', 10),
  },

  // AI Gateway 性能配置
  aiGateway: {
    // 超时
    singleRequestTimeoutMs: parseInt(process.env.AI_SINGLE_REQUEST_TIMEOUT_MS || '120000', 10),
    totalTimeoutMs: parseInt(process.env.AI_TOTAL_TIMEOUT_MS || '300000', 10),
    streamingTimeoutMs: parseInt(process.env.AI_STREAMING_TIMEOUT_MS || '600000', 10),
    // 钩子注册中心
    useHookRegistry: process.env.AI_USE_HOOK_REGISTRY === 'true',
    // 输出
    outputFormat: process.env.AI_OUTPUT_FORMAT || 'raw',
    // 熔断
    circuitBreaker: {
      enabled: process.env.AI_CIRCUIT_BREAKER_ENABLED !== 'false',
      failureCount: parseInt(process.env.AI_BREAKER_FAILURE_COUNT || '5', 10),
      cooldownMs: parseInt(process.env.AI_BREAKER_COOLDOWN_MS || '60000', 10),
      errorRate: parseFloat(process.env.AI_BREAKER_ERROR_RATE || '0.5'),
      windowMs: parseInt(process.env.AI_BREAKER_WINDOW_MS || '120000', 10),
    },
    // 限流
    rateLimiter: {
      backend: process.env.AI_RATE_LIMITER_BACKEND || 'memory',
      userQPS: parseInt(process.env.AI_RATE_LIMIT_USER_QPS || '5', 10),
      userBurst: parseInt(process.env.AI_RATE_LIMIT_USER_BURST || '10', 10),
      ipQPS: parseInt(process.env.AI_RATE_LIMIT_IP_QPS || '20', 10),
      ipBurst: parseInt(process.env.AI_RATE_LIMIT_IP_BURST || '30', 10),
      appQPS: parseInt(process.env.AI_RATE_LIMIT_APP_QPS || '50', 10),
      appBurst: parseInt(process.env.AI_RATE_LIMIT_APP_BURST || '100', 10),
    },
    // 缓存
    cache: {
      backend: process.env.AI_CACHE_BACKEND || 'memory',
      ttlMs: parseInt(process.env.AI_CACHE_TTL_MS || '300000', 10),
      maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '1000', 10),
      semanticEnabled: process.env.AI_CACHE_SEMANTIC_ENABLED === 'true',
      semanticThreshold: parseInt(process.env.AI_CACHE_SIMHASH_THRESHOLD || '3', 10),
    },
    // 上下文
    contextCacheEnabled: process.env.CONTEXT_CACHE_ENABLED !== 'false',
    contextCacheTTL: parseInt(process.env.CONTEXT_CACHE_TTL_MS || '600000', 10),
    tenantTokenLimit: parseInt(process.env.AI_TENANT_TOKEN_LIMIT || '1000', 10),
  },

  // 电商内容智能中间层 — P0/P1 强制封装管线
  ecommercePipeline: {
    enabled: process.env.ECOMMERCE_PIPELINE_ENABLED !== 'false',
    forceWrap: process.env.ECOMMERCE_FORCE_WRAP !== 'false',
    autoClassifyIntent: process.env.ECOMMERCE_AUTO_INTENT !== 'false',
    complianceEnabled: process.env.ECOMMERCE_COMPLIANCE_ENABLED !== 'false',
    complianceStrict: process.env.ECOMMERCE_COMPLIANCE_STRICT === 'true',
    templateMandatory: process.env.ECOMMERCE_TEMPLATE_MANDATORY !== 'false',
    maxUserInputLength: parseInt(process.env.ECOMMERCE_MAX_INPUT_LENGTH || '2000', 10),
    defaultPlatform: process.env.ECOMMERCE_DEFAULT_PLATFORM || 'taobao',
  },

  e2b: {
    apiKey: process.env.E2B_API_KEY || '',
    template: process.env.E2B_TEMPLATE || 'code-interpreter-v2',
    defaultTimeoutMs: parseInt(process.env.E2B_TIMEOUT_MS || '300000', 10),
    maxSandboxesPerUser: parseInt(process.env.E2B_MAX_PER_USER || '3', 10),
    allowOutbound: process.env.E2B_ALLOW_OUTBOUND !== 'false',
    warmPoolSize: parseInt(process.env.E2B_WARM_POOL_SIZE || '0', 10),     // P3: 预热池大小
    codeMaxByLanguage: {                                                    // P3: 按语言分级最大字符数
      python: 50000,
      javascript: 30000,
      typescript: 30000,
      bash: 10000,
      r: 30000,
      ruby: 30000,
    },
    defaultCodeMax: parseInt(process.env.E2B_CODE_MAX || '50000', 10),
  },

  bull: {
    imageConcurrency: parseInt(process.env.BULL_IMAGE_CONCURRENCY || '3', 10),
    videoConcurrency: parseInt(process.env.BULL_VIDEO_CONCURRENCY || '2', 10),
    batchConcurrency: parseInt(process.env.BULL_BATCH_CONCURRENCY || '5', 10),
    notifyConcurrency: parseInt(process.env.BULL_NOTIFY_CONCURRENCY || '10', 10),
  },

  appUrl: process.env.APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''),

  geoIpApiUrl: process.env.GEOIP_API_URL || 'https://ip-api.com/json',

  allinpay: {
    env: process.env.ALLINPAY_ENV || (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'),
    cusid: process.env.ALLINPAY_CUSID || '',
    appid: process.env.ALLINPAY_APPID || '',
    privateKey: process.env.ALLINPAY_PRIVATE_KEY || null,
    publicKey: process.env.ALLINPAY_PUBLIC_KEY || null,
    privateKeyPath: process.env.ALLINPAY_PRIVATE_KEY_PATH || './certs/allinpay_private.pem',
    publicKeyPath: process.env.ALLINPAY_PUBLIC_KEY_PATH || './certs/allinpay_public.pem',
    notifyUrl: process.env.ALLINPAY_NOTIFY_URL || '',
    returnUrl: process.env.ALLINPAY_RETURN_URL || '',
    frontUrl: process.env.ALLINPAY_FRONT_URL || '',
    signType: process.env.ALLINPAY_SIGN_TYPE || 'RSA',
    get isSandbox() {
      return this.env === 'sandbox';
    },
    get baseUrl() {
      return this.env === 'production'
        ? 'https://syb.allinpay.com/apiweb/h5unionpay/onepay'
        : 'https://syb-test.allinpay.com/apiweb/h5unionpay/onepay';
    },
  },

  commerce: {
    planDurations: {
      1: parseInt(process.env.PLAN_DURATION_MONTHLY_DAYS, 10) || 30,
      2: parseInt(process.env.PLAN_DURATION_QUARTERLY_DAYS, 10) || 90,
      3: parseInt(process.env.PLAN_DURATION_ANNUAL_DAYS, 10) || 365,
    },
    dashboardLookbackDays: parseInt(process.env.COMMERCE_DASHBOARD_LOOKBACK_DAYS, 10) || 30,
  },

  csrf: {
    tokenTTLMs: parseInt(process.env.CSRF_TOKEN_TTL_MS, 10) || 30 * 60 * 1000,
  },

  tier: {
    free: {
      dailyImages: parseInt(process.env.TIER_FREE_DAILY_IMAGES, 10) || 5,
      dailyVideos: parseInt(process.env.TIER_FREE_DAILY_VIDEOS, 10) || 2,
      maxBatch: parseInt(process.env.TIER_FREE_MAX_BATCH, 10) || 10,
      watermark: process.env.TIER_FREE_WATERMARK !== 'false',
      exportHd: process.env.TIER_FREE_EXPORT_HD === 'true',
    },
    vip: {
      dailyImages: parseInt(process.env.TIER_VIP_DAILY_IMAGES, 10) || 100,
      dailyVideos: parseInt(process.env.TIER_VIP_DAILY_VIDEOS, 10) || 30,
      maxBatch: parseInt(process.env.TIER_VIP_MAX_BATCH, 10) || 50,
      watermark: process.env.TIER_VIP_WATERMARK === 'true',
      exportHd: process.env.TIER_VIP_EXPORT_HD !== 'false',
    },
    admin: {
      dailyImages: Infinity,
      dailyVideos: Infinity,
      maxBatch: parseInt(process.env.TIER_ADMIN_MAX_BATCH, 10) || 100,
      watermark: false,
      exportHd: true,
    },
  },

  adapters: {
    defaults: {
      textMaxTokens: parseInt(process.env.ADAPTER_TEXT_MAX_TOKENS, 10) || 2000,
      textTimeoutMs: parseInt(process.env.ADAPTER_TEXT_TIMEOUT_MS, 10) || 60000,
      textStreamTimeoutMs: parseInt(process.env.ADAPTER_TEXT_STREAM_TIMEOUT_MS, 10) || 300000,
      imageTimeoutMs: parseInt(process.env.ADAPTER_IMAGE_TIMEOUT_MS, 10) || 120000,
      healthTimeoutMs: parseInt(process.env.ADAPTER_HEALTH_TIMEOUT_MS, 10) || 5000,
      modelListTimeoutMs: parseInt(process.env.ADAPTER_MODEL_LIST_TIMEOUT_MS, 10) || 10000,
      pollIntervalMs: parseInt(process.env.ADAPTER_POLL_INTERVAL_MS, 10) || 2000,
    },
    pollIntervalMs: {
      video: parseInt(process.env.ADAPTER_VIDEO_POLL_MS, 10) || 3000,
      sd: parseInt(process.env.ADAPTER_SD_POLL_MS, 10) || 2000,
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
      baseUrl: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com/v1',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    },
    sd: {
      apiUrl: process.env.SD_API_URL || 'http://localhost:7860',
      replicateKey: process.env.REPLICATE_API_KEY || '',
    },
    stability: {
      apiKey: process.env.STABILITY_API_KEY || '',
      baseUrl: process.env.STABILITY_BASE_URL || 'https://api.stability.ai',
    },
    edgeTts: {
      wsUrl: process.env.EDGE_TTS_WS_URL || `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${process.env.EDGE_TTS_TRUSTED_TOKEN || ''}`,
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
      elevenLabsApiUrl: process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io',
      edgeTtsOrigin: process.env.EDGE_TTS_ORIGIN || 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    },
  },
};

export default config;

// 按模块解构导出，方便按需 import
export const { jwt: jwtConfig, mysql: db, redis: redisConfig, mockEnabled, port, env } = config;
export const isProduction = config.isProd;
export const isDevelopment = config.isDev;
export const jwtSecret = config.jwt.secret;
export const jwtExpiresIn = config.jwt.expiresIn;
export const jwtRefreshSecret = config.jwtRefreshSecret;
export const server = { port: config.port, env: config.env };
export const { rateLimit: rateLimitConfig } = config;
export const corsOrigin = config.corsOrigin;
export const { log: logConfig } = config;
export const aiTimeoutMs = config.aiTimeoutMs;
export const requestTimeoutMs = config.requestTimeoutMs;
export const { worker: workerConfig } = config;
export const { upload: uploadConfig } = config;
export const { storage: storageConfig } = config;
export const { security: securityConfig } = config;
export const { ecommercePipeline: ecommercePipelineConfig } = config;
export const { e2b: e2bConfig } = config;
export const { bull: bullConfig } = config;
export const appUrl = config.appUrl;
export const { ai: aiConfig } = config;
export const { aiGateway: aiGatewayConfig } = config;
export const { adapters: adapterConfig } = config;
export const { allinpay: allinpayConfig } = config;
export const { commerce: commerceConfig } = config;
export const { csrf: csrfConfig } = config;
export const { tier: tierConfig } = config;
