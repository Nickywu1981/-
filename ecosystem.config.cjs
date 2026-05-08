/**
 * Movio AI v4.1 — PM2 进程守护配置
 *
 * 用法:
 *   pm2 start ecosystem.config.cjs
 *   pm2 start ecosystem.config.cjs --only movio-server
 *   pm2 restart all
 *   pm2 logs
 *   pm2 save && pm2 startup   # 开机自启
 */
module.exports = {
  apps: [
    {
      name: 'movio-server',
      script: 'src/index.js',
      cwd: './server',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      kill_timeout: 10000,
      listen_timeout: 5000,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MOCK_ENABLED: 'false',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001,
        MOCK_ENABLED: 'true',
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'movio-worker',
      script: 'src/workers/worker.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '384M',
      kill_timeout: 15000,
      restart_delay: 5000,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        MOCK_ENABLED: 'false',
      },
      env_development: {
        NODE_ENV: 'development',
        MOCK_ENABLED: 'true',
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'movio-client',
      script: 'node_modules/.bin/nuxt',
      args: 'start',
      cwd: './client',
      instances: 2,
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      kill_timeout: 8000,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: './logs/client-error.log',
      out_file: './logs/client-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
