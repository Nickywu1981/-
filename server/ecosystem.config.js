/**
 * PM2 生产环境集群配置
 * 启动: pm2 start ecosystem.config.js --env production
 * 重载: pm2 reload movio-api
 */

module.exports = {
  apps: [
    {
      name: 'movio-api',
      script: 'src/index.js',
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',

      // 集群模式 — 利用多核 CPU
      instances: process.env.PM2_INSTANCES || 'max',
      exec_mode: 'cluster',
      instance_var: 'INSTANCE_ID',

      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // 零停机重载
      listen_timeout: 10000,
      kill_timeout: 15000,
      shutdown_with_message: true,

      // 内存限制 — 超过 512MB 自动重启
      max_memory_restart: '512M',

      // 自动重启策略
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 3000,

      // 日志
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,

      // 监听文件变更（仅开发环境）
      watch: process.env.NODE_ENV !== 'production' ? ['src'] : false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '.git'],
      watch_delay: 2000,

      // Node 参数
      node_args: '--max-old-space-size=512',

      // 自动重启条件
      autorestart: true,
      vizion: false,
    },
  ],

  // 部署配置（可选）
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/movio-ai.git',
      path: '/var/www/movio-api',
      'post-deploy': 'npm ci --omit=dev && pm2 reload ecosystem.config.js --env production',
    },
  },
};
