module.exports = {
  apps: [
    {
      name: 'movio-api',
      script: 'src/index.js',
      watch: false,
      max_memory_restart: '512M',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      restart_delay: 2000,
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 3000,
    },
  ],
};
