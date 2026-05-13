/**
 * 环境配置中心
 */
import dotenv from 'dotenv';
import crypto from 'crypto';

// 按 NODE_ENV 分层加载：.env 为基，环境特定文件覆盖
dotenv.config();
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: envFile, override: true });

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
  },

  jwtRefreshSecret: (() => {
    const s = process.env.JWT_REFRESH_SECRET;
    if (!s) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('生产环境必须设置 JWT_REFRESH_SECRET，禁止回退到 JWT_SECRET');
      }
      console.warn('[config] JWT_REFRESH_SECRET 未设置，开发环境回退到 JWT_SECRET（生产环境将被 startupGuard 拦截）');
      return process.env.JWT_SECRET || 'dev-temp-refresh-fallback';
    }
    return s;
  })(),

  corsOrigin: process.env.CORS_ORIGIN || '',

  log: {
    level: process.env.LOG_LEVEL || 'info',
    sampleRate: parseFloat(process.env.LOG_SAMPLE_RATE || '1.0'),
    slowQueryMs: parseInt(process.env.SLOW_QUERY_MS, 10) || 1000,
  },

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

  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    // 内容安全
    sanitizeInput: process.env.SECURITY_SANITIZE_INPUT !== 'false',
    aliyunGreenEnabled: process.env.SECURITY_ALIYUN_GREEN_ENABLED === 'true',
    selfBuiltWordlistEnabled: process.env.SECURITY_SELF_BUILT_WORDLIST_ENABLED !== 'false',
    outputModerationLevel: parseInt(process.env.SECURITY_OUTPUT_MODERATION_LEVEL || '5', 10),
    // 接口安全
    signatureRequired: process.env.SECURITY_SIGNATURE_REQUIRED === 'true',
    modelAclEnabled: process.env.SECURITY_MODEL_ACL_ENABLED === 'true',
    tokenLeakProtection: process.env.SECURITY_TOKEN_LEAK_PROTECTION === 'true',
  },

  // AI Gateway 性能配置
  aiGateway: {
    // 超时
    singleRequestTimeoutMs: parseInt(process.env.AI_SINGLE_REQUEST_TIMEOUT_MS || '120000', 10),
    totalTimeoutMs: parseInt(process.env.AI_TOTAL_TIMEOUT_MS || '300000', 10),
    streamingTimeoutMs: parseInt(process.env.AI_STREAMING_TIMEOUT_MS || '600000', 10),
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
      ipQPS: parseInt(process.env.AI_RATE_LIMIT_IP_QPS || '20', 10),
      appQPS: parseInt(process.env.AI_RATE_LIMIT_APP_QPS || '50', 10),
    },
    // 缓存
    cache: {
      backend: process.env.AI_CACHE_BACKEND || 'memory',
      ttlMs: parseInt(process.env.AI_CACHE_TTL_MS || '300000', 10),
      semanticEnabled: process.env.AI_CACHE_SEMANTIC_ENABLED === 'true',
      semanticThreshold: parseInt(process.env.AI_CACHE_SIMHASH_THRESHOLD || '3', 10),
    },
    // 上下文
    contextCacheEnabled: process.env.CONTEXT_CACHE_ENABLED !== 'false',
  },

  e2b: {
    apiKey: process.env.E2B_API_KEY || '',
    template: process.env.E2B_TEMPLATE || 'code-interpreter-v2',
    defaultTimeoutMs: parseInt(process.env.E2B_TIMEOUT_MS || '300000', 10),
    maxSandboxesPerUser: parseInt(process.env.E2B_MAX_PER_USER || '3', 10),
  },

  bull: {
    imageConcurrency: parseInt(process.env.BULL_IMAGE_CONCURRENCY || '3', 10),
    videoConcurrency: parseInt(process.env.BULL_VIDEO_CONCURRENCY || '2', 10),
    batchConcurrency: parseInt(process.env.BULL_BATCH_CONCURRENCY || '5', 10),
    notifyConcurrency: parseInt(process.env.BULL_NOTIFY_CONCURRENCY || '10', 10),
  },

  appUrl: process.env.APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : ''),

  geoIpApiUrl: process.env.GEOIP_API_URL || 'https://ip-api.com/json',

  adapters: {
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
export const { worker: workerConfig } = config;
export const { upload: uploadConfig } = config;
export const { security: securityConfig } = config;
export const { e2b: e2bConfig } = config;
export const { bull: bullConfig } = config;
export const appUrl = config.appUrl;
export const { ai: aiConfig } = config;
export const { adapters: adapterConfig } = config;
